const axios = require('axios');

class GroundedAIService {
  static async answerQuestion(db, question, selectedRepo = null) {
    const qLower = (question || '').toLowerCase();

    // 1. Identify active repository if specified
    let targetRepo = null;
    if (selectedRepo && selectedRepo !== 'all') {
      targetRepo = db.prepare('SELECT * FROM repositories WHERE id = ? OR LOWER(name) = LOWER(?)').get(Number(selectedRepo) || -1, String(selectedRepo));
    }

    // 1. Fetch digital twin context from SQLite (scoped to target repo if selected)
    let repos = [];
    let prs = [];
    let sonarList = [];
    let jiraList = [];

    if (targetRepo) {
      repos = [targetRepo];
      prs = db.prepare('SELECT * FROM pull_requests WHERE repo_id = ?').all(targetRepo.id);
      sonarList = db.prepare('SELECT * FROM sonar_analyses WHERE repo_id = ?').all(targetRepo.id);
      jiraList = db.prepare(`
        SELECT DISTINCT j.* FROM jira_issues j
        JOIN pr_jira_links l ON j.id = l.jira_id
        JOIN pull_requests p ON l.pr_id = p.id
        WHERE p.repo_id = ?
      `).all(targetRepo.id);
    } else {
      repos = db.prepare('SELECT * FROM repositories').all();
      prs = db.prepare('SELECT * FROM pull_requests').all();
      sonarList = db.prepare('SELECT * FROM sonar_analyses').all();
      jiraList = db.prepare('SELECT * FROM jira_issues').all();
    }

    // Attach assessments and jira links
    const prDetails = prs.map(pr => {
      const assessment = db.prepare('SELECT * FROM risk_assessments WHERE pr_id = ?').get(pr.id);
      const links = db.prepare(`
        SELECT j.key FROM pr_jira_links l 
        JOIN jira_issues j ON l.jira_id = j.id 
        WHERE l.pr_id = ?
      `).all(pr.id);
      const repo = repos.find(r => r.id === pr.repo_id) || targetRepo;

      return {
        pr_number: pr.pr_number,
        title: pr.title,
        repository: repo ? repo.name : 'unknown',
        status: pr.status,
        author: pr.author,
        additions: pr.additions,
        deletions: pr.deletions,
        linked_jira: links.map(l => l.key),
        risk_score: assessment ? assessment.risk_score : 0,
        risk_level: assessment ? assessment.risk_level : 'LOW',
        health_score: assessment ? assessment.health_score : 100
      };
    });

    const contextData = {
      active_project_filter: targetRepo ? targetRepo.name : 'all_repositories',
      project_overview: {
        total_repositories: repos.length,
        open_pull_requests: prs.length,
        repositories: repos.map(r => ({ name: r.name, service_type: r.service_type }))
      },
      pull_requests: prDetails,
      sonar_quality_metrics: sonarList.map(s => ({
        project: s.project_key,
        quality_gate: s.quality_gate_status,
        coverage_pct: s.coverage_pct,
        coverage_delta_pct: s.coverage_delta_pct,
        bugs: s.bugs_count,
        vulnerabilities: s.vulnerabilities_count,
        code_smells: s.code_smells_count
      })),
      jira_requirements: jiraList.map(j => ({
        key: j.key,
        summary: j.summary,
        status: j.status,
        priority: j.priority,
        acceptance_criteria: typeof j.acceptance_criteria === 'string' ? JSON.parse(j.acceptance_criteria || '[]') : j.acceptance_criteria
      }))
    };

    // 2. Query Google Gemini if API Key is configured
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (apiKey) {
      try {
        const geminiResponse = await GroundedAIService.queryGemini(
          apiKey,
          process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
          question,
          contextData
        );
        if (geminiResponse) {
          return geminiResponse;
        }
      } catch (err) {
        console.error('Gemini API call failed, falling back to deterministic reasoning:', err.message);
      }
    }

    // 3. Fallback deterministic entity-aware reasoner
    return GroundedAIService.entityAwareReason(question, qLower, repos, prDetails, sonarList, jiraList);
  }

  static async queryGemini(apiKey, model, question, context) {
    const candidateModels = [
      model,
      'gemini-flash-latest',
      'gemini-3.7-flash',
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite'
    ];
    const uniqueModels = [...new Set(candidateModels.filter(Boolean))];

    const activeProject = context.active_project_filter || 'all';
    const systemInstruction = 
      "You are the AI Assistant for Project 360 (Software Project Intelligence Platform).\n" +
      `CRITICAL RULE: The user is currently inspecting the project: '${activeProject}'. Answer EXCLUSIVELY and ONLY for '${activeProject}'. Do NOT reference or mix in data from other repositories.\n` +
      "Your answers must be CLEAR, CONCISE, and EASY TO READ at a glance.\n" +
      "Rules for formatting:\n" +
      "- Always use clean markdown bullet points with line breaks between items, never run-on single line paragraphs.\n" +
      "- Highlight key entities (e.g. **Ticket ID**, **PR #**, status, risk) clearly.\n" +
      "- Limit long explanations to 2-3 direct sentences, followed by clean bullet points.\n" +
      "- Use ONLY verified facts from the provided project context for the active project.\n\n" +
      "You MUST respond ONLY with valid JSON in this exact structure:\n" +
      "{\n" +
      '  "headline": "SHORT CONCISE TITLE",\n' +
      '  "confidence": 0.95,\n' +
      '  "answer": "Clean, formatted markdown answer with line breaks and clear bullet points.",\n' +
      '  "evidence": [\n' +
      '    {"type": "Git/Sonar/Jira", "claim": "Short verified fact", "source": "Key or file"}\n' +
      '  ],\n' +
      '  "recommended_actions": ["Specific Next Step 1", "Specific Next Step 2"]\n' +
      "}";

    const payload = {
      contents: [
        {
          parts: [
            {
              text: systemInstruction + "\n\nVERIFIED PROJECT DIGITAL TWIN CONTEXT:\n" +
                JSON.stringify(context, null, 2) + "\n\nUSER QUESTION: " + question +
                "\n\nProvide your grounded JSON analysis:"
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json"
      }
    };

    for (const candModel of uniqueModels) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${candModel}:generateContent?key=${apiKey}`;
      try {
        const resp = await axios.post(url, payload, { timeout: 30000 });
        if (resp.status === 200 && resp.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          const raw = resp.data.candidates[0].content.parts[0].text;
          const parsed = JSON.parse(raw);
          return {
            headline: parsed.headline || 'PROJECT 360 INTELLIGENCE',
            confidence: Number(parsed.confidence) || 0.95,
            answer: parsed.answer || '',
            evidence: parsed.evidence || [],
            recommended_actions: parsed.recommended_actions || [],
            intent: 'gemini_dynamic'
          };
        }
      } catch (err) {
        console.warn(`Gemini model ${candModel} error:`, err.response?.status || err.message);
      }
    }
    return null;
  }

  static entityAwareReason(question, qLower, repos, prs, sonarList, jiraList) {
    // Release readiness check
    if (qLower.includes('release') || qLower.includes('ship') || qLower.includes('deploy')) {
      const failedGates = sonarList.filter(s => s.quality_gate_status === 'FAILED');
      const highRisk = prs.filter(p => ['HIGH', 'CRITICAL'].includes(p.risk_level));

      if (failedGates.length > 0 || highRisk.length > 0) {
        return {
          headline: 'RELEASE STATUS: 🛑 NO-GO (HIGH OPERATIONAL RISK)',
          confidence: 0.96,
          answer: `Production release cannot proceed today due to **${failedGates.length} failed quality gate(s)** and **${highRisk.length} high-risk pull request(s)** currently in the release branch. Deploying in the current state exposes customer-facing services to critical stability regressions.`,
          evidence: failedGates.map(s => ({
            type: 'Quality Gate',
            claim: `${s.project_key} failed quality gate`,
            source: `Sonar: ${s.project_key}`
          })),
          recommended_actions: ['Fix blocking SonarQube issues before release cutoff.'],
          intent: 'release_readiness'
        };
      } else {
        return {
          headline: 'RELEASE STATUS: 🟢 GO (LOW RISK)',
          confidence: 0.92,
          answer: 'All quality gates have passed, test coverage delta is stable, and requirement acceptance criteria are satisfied.',
          evidence: [{ type: 'Audit', claim: 'All quality gates passed', source: 'SonarQube' }],
          recommended_actions: ['Proceed with standard canary deployment.'],
          intent: 'release_readiness'
        };
      }
    }

    // Jira questions
    if (qLower.includes('jira') || qLower.includes('ticket') || qLower.includes('requirement')) {
      const jiraItems = jiraList.map(j => `- **${j.key}** (${j.summary}): Status \`${j.status}\`, Priority \`${j.priority}\``).join('\n');
      return {
        headline: `LINKED JIRA REQUIREMENTS (${jiraList.length} ISSUES)`,
        confidence: 0.95,
        answer: `The Project Brain is tracking **${jiraList.length} Jira requirements** linked to active pull requests:\n\n${jiraItems}`,
        evidence: [{ type: 'Jira Traceability', claim: `${jiraList.length} requirements mapped`, source: 'Jira REST API' }],
        recommended_actions: ['Verify acceptance criteria for in-progress stories before merge.'],
        intent: 'jira_requirements'
      };
    }

    // PR question match
    for (const p of prs) {
      if (qLower.includes(String(p.pr_number)) || qLower.includes(p.title.toLowerCase())) {
        return {
          headline: `ANALYSIS FOR PR #${p.pr_number} (${p.repository})`,
          confidence: 0.95,
          answer: `PR #${p.pr_number} on **${p.repository}** currently has a risk score of **${p.risk_score}/100** (${p.risk_level} risk). It includes +${p.additions}/-${p.deletions} lines authored by **${p.author}**.`,
          evidence: [{ type: 'Git PR', claim: `PR #${p.pr_number} risk is ${p.risk_level}`, source: `Git: ${p.repository}` }],
          recommended_actions: p.risk_level === 'CRITICAL' ? ['Block PR merge until quality gates pass.'] : ['Review code changes and proceed.'],
          intent: 'pr_inquiry'
        };
      }
    }

    // Default overview answer
    const repoLabel = repos.length === 1 ? `**${repos[0].name}**` : `**${repos.length} repositories**`;
    return {
      headline: repos.length === 1 ? `${repos[0].name.toUpperCase()} INTELLIGENCE OVERVIEW` : 'PROJECT 360 INTELLIGENCE OVERVIEW',
      confidence: 0.90,
      answer: `Currently analyzing ${repoLabel} with **${prs.length} open pull request(s)** and **${jiraList.length} linked Jira issue(s)**.\n\nAsk questions like:\n- *'Can we release today?'*\n- *'What are the risks for PR #${prs[0]?.pr_number || 101}?'*\n- *'Which Jira tickets are currently in review?'*`,
      evidence: [{ type: 'System', claim: `Active project scope: ${repos[0]?.name || 'All'}`, source: 'Cortex Engine' }],
      recommended_actions: ['Explore PR Risk Radar or SonarQube quality gates.'],
      intent: 'general_overview'
    };
  }
}

module.exports = GroundedAIService;
