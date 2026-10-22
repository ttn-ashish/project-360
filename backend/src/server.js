require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { db, initDatabase } = require('./db/database');
const { seedInitialData } = require('./services/seedData');
const RiskEngine = require('./services/riskEngine');
const RiskRadarService = require('./services/riskRadarService');
const ThreatIntelService = require('./services/threatIntelService');
const GroundedAIService = require('./services/llmService');
const CodebaseScanner = require('./services/codebaseScanner');
const DeveloperOnboardingService = require('./services/developerOnboardingService');
const DeadCodeScannerService = require('./services/deadCodeScanner');

const app = express();
const PORT = process.env.PORT || 8080;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Initialize SQLite tables (clean state, no mock data)
initDatabase();

// Reset/Clean database endpoint if user wants fresh start
app.post('/api/v1/reset', (req, res) => {
  try {
    db.prepare('DELETE FROM risk_assessments').run();
    db.prepare('DELETE FROM pr_jira_links').run();
    db.prepare('DELETE FROM sonar_analyses').run();
    db.prepare('DELETE FROM pull_requests').run();
    db.prepare('DELETE FROM jira_issues').run();
    db.prepare('DELETE FROM repositories').run();
    res.json({ status: 'success', message: 'Workspace cleared. Ready for new codebase scan.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Root Health & Diagnostics
app.get('/', (req, res) => {
  res.json({
    platform: 'Project 360 (Node.js & Express Cortex Engine)',
    version: '2.0.0',
    health: '/api/v1/health'
  });
});

app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'healthy',
    runtime: 'Node.js',
    framework: 'Express.js',
    database: 'SQLite'
  });
});

// 1. Dashboard Overview
app.get('/api/v1/dashboard/overview', (req, res) => {
  try {
    const { project_id } = req.query;
    const allRepos = db.prepare('SELECT * FROM repositories ORDER BY name ASC').all();
    let targetRepo = null;
    if (project_id && project_id !== 'all') {
      targetRepo = allRepos.find(r => r.id === Number(project_id) || r.name.toLowerCase() === String(project_id).toLowerCase());
    }

    const repos = targetRepo ? [targetRepo] : allRepos;
    const prs = targetRepo 
      ? db.prepare('SELECT * FROM pull_requests WHERE repo_id = ? ORDER BY created_at DESC').all(targetRepo.id)
      : db.prepare('SELECT * FROM pull_requests ORDER BY created_at DESC').all();
    const sonarList = targetRepo
      ? db.prepare('SELECT * FROM sonar_analyses WHERE repo_id = ?').all(targetRepo.id)
      : db.prepare('SELECT * FROM sonar_analyses').all();
    const assessments = targetRepo
      ? db.prepare('SELECT a.* FROM risk_assessments a JOIN pull_requests p ON a.pr_id = p.id WHERE p.repo_id = ?').all(targetRepo.id)
      : db.prepare('SELECT * FROM risk_assessments').all();

    const overview = RiskEngine.calculateProjectOverview(prs, repos, sonarList, assessments);

    const prCards = prs.map(pr => {
      const assessment = db.prepare('SELECT * FROM risk_assessments WHERE pr_id = ?').get(pr.id);
      const links = db.prepare(`
        SELECT j.key FROM pr_jira_links l 
        JOIN jira_issues j ON l.jira_id = j.id 
        WHERE l.pr_id = ?
      `).all(pr.id);
      const repo = repos.find(r => r.id === pr.repo_id);

      return {
        id: pr.id,
        pr_number: pr.pr_number,
        title: pr.title,
        author: pr.author,
        repository: repo ? repo.name : 'unknown',
        service_type: repo ? repo.service_type : 'Microservice',
        branch: pr.source_branch,
        additions: pr.additions,
        deletions: pr.deletions,
        linked_jira_keys: links.map(l => l.key),
        risk_score: assessment ? assessment.risk_score : 0,
        health_score: assessment ? assessment.health_score : 100,
        risk_level: assessment ? assessment.risk_level : 'LOW',
        summary: assessment ? assessment.executive_summary : ''
      };
    });

    const sonarProjects = sonarList.map(s => ({
      project_key: s.project_key,
      gate_status: s.quality_gate_status,
      coverage_pct: s.coverage_pct,
      coverage_delta_pct: s.coverage_delta_pct,
      bugs: s.bugs_count,
      vulnerabilities: s.vulnerabilities_count,
      code_smells: s.code_smells_count
    }));

    res.json({
      ...overview,
      repositories: allRepos.map(r => ({
        id: r.id,
        name: r.name,
        service_type: r.service_type
      })),
      selected_repository: targetRepo ? targetRepo.name : 'all',
      recent_pull_requests: prCards,
      sonar_projects: sonarProjects
    });
  } catch (err) {
    console.error('Error fetching dashboard overview:', err);
    res.status(500).json({ error: 'Failed to retrieve dashboard metrics' });
  }
});

// 2. PR Detail
app.get('/api/v1/prs/:id', (req, res) => {
  try {
    const prId = Number(req.params.id);
    const pr = db.prepare('SELECT * FROM pull_requests WHERE id = ?').get(prId);
    if (!pr) {
      return res.status(404).json({ error: 'Pull Request not found' });
    }

    const repo = db.prepare('SELECT * FROM repositories WHERE id = ?').get(pr.repo_id);
    const assessment = db.prepare('SELECT * FROM risk_assessments WHERE pr_id = ?').get(pr.id);
    const sonar = db.prepare('SELECT * FROM sonar_analyses WHERE repo_id = ? ORDER BY analyzed_at DESC LIMIT 1').get(pr.repo_id);

    const linkedJiras = db.prepare(`
      SELECT j.key, j.summary, j.status, j.priority, j.acceptance_criteria 
      FROM pr_jira_links l 
      JOIN jira_issues j ON l.jira_id = j.id 
      WHERE l.pr_id = ?
    `).all(pr.id).map(j => ({
      ...j,
      acceptance_criteria: typeof j.acceptance_criteria === 'string' ? JSON.parse(j.acceptance_criteria || '[]') : j.acceptance_criteria
    }));

    res.json({
      id: pr.id,
      pr_number: pr.pr_number,
      title: pr.title,
      author: pr.author,
      repository: repo ? repo.name : 'unknown',
      service_type: repo ? repo.service_type : '',
      branch: pr.source_branch,
      target_branch: pr.target_branch,
      status: pr.status,
      additions: pr.additions,
      deletions: pr.deletions,
      changed_files: typeof pr.changed_files === 'string' ? JSON.parse(pr.changed_files || '[]') : pr.changed_files,
      linked_jiras: linkedJiras,
      sonar: sonar ? {
        project_key: sonar.project_key,
        gate_status: sonar.quality_gate_status,
        coverage: sonar.coverage_pct,
        coverage_delta: sonar.coverage_delta_pct,
        bugs: sonar.bugs_count,
        vulnerabilities: sonar.vulnerabilities_count,
        code_smells: sonar.code_smells_count
      } : null,
      assessment: assessment ? {
        health_score: assessment.health_score,
        risk_score: assessment.risk_score,
        risk_level: assessment.risk_level,
        executive_summary: assessment.executive_summary,
        factors: typeof assessment.factors === 'string' ? JSON.parse(assessment.factors || '{}') : assessment.factors,
        evidence: typeof assessment.evidence === 'string' ? JSON.parse(assessment.evidence || '[]') : assessment.evidence,
        recommended_actions: typeof assessment.recommended_actions === 'string' ? JSON.parse(assessment.recommended_actions || '[]') : assessment.recommended_actions
      } : {
        health_score: 100,
        risk_score: 0,
        risk_level: 'LOW',
        executive_summary: 'No assessment generated yet.',
        factors: {},
        evidence: [],
        recommended_actions: []
      }
    });
  } catch (err) {
    console.error('Error fetching PR detail:', err);
    res.status(500).json({ error: 'Failed to retrieve PR details' });
  }
});

// 3. Ask Project 360 AI Chat
app.post('/api/v1/chat', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const answer = await GroundedAIService.answerQuestion(db, question.trim());
    res.json(answer);
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({
      headline: 'ANALYSIS ERROR',
      confidence: 0.5,
      answer: 'An error occurred while evaluating your project data. Please verify database connectivity.',
      evidence: [],
      recommended_actions: ['Retry question.']
    });
  }
});

// 4. Scan Local Codebase
app.post('/api/v1/scan/local', (req, res) => {
  try {
    const { path: targetPath } = req.body;
    if (!targetPath || !targetPath.trim()) {
      return res.status(400).json({ detail: "Missing directory 'path'" });
    }

    const scanResult = CodebaseScanner.scanLocalDirectory(targetPath.trim());
    const ingestResult = CodebaseScanner.ingestScannedCodebase(db, scanResult);

    res.json({
      ...ingestResult,
      scan_summary: {
        path: scanResult.path,
        languages: scanResult.languages,
        total_files: scanResult.total_files,
        test_files: scanResult.test_files,
        recent_commits_count: scanResult.recent_commits.length,
        detected_endpoints: scanResult.detected_endpoints
      }
    });
  } catch (err) {
    console.error('Scan error:', err);
    res.status(500).json({ detail: `Failed to scan codebase: ${err.message}` });
  }
});

// --- 5. AI Project Risk Radar Enterprise Endpoints ---

// Get Risk Radar overview (health, risk score, categories, trends, top recommendations)
app.get('/api/v1/radar/overview', (req, res) => {
  try {
    const { project_id } = req.query;
    const overview = RiskRadarService.getRadarOverview(db, project_id);
    res.json(overview);
  } catch (err) {
    console.error('Error fetching risk radar overview:', err);
    res.status(500).json({ error: 'Failed to retrieve Risk Radar overview', detail: err.message });
  }
});

// Trigger manual / automated risk assessment analysis
app.post('/api/v1/radar/analyze', (req, res) => {
  try {
    const { project_id } = req.body;
    let targetId = null;
    if (project_id && project_id !== 'all') {
      const repo = db.prepare('SELECT id FROM repositories WHERE id = ? OR LOWER(name) = LOWER(?)').get(Number(project_id) || -1, String(project_id));
      targetId = repo ? repo.id : Number(project_id) || null;
    }
    const results = RiskRadarService.runAssessment(db, targetId);
    res.json({
      status: 'success',
      message: 'Risk radar analysis completed successfully.',
      assessments_count: results.length,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error running risk radar analysis:', err);
    res.status(500).json({ error: 'Failed to execute risk analysis', detail: err.message });
  }
});

// Get Risk Findings with search, filters, and pagination
app.get('/api/v1/radar/findings', (req, res) => {
  try {
    const findings = RiskRadarService.getFindings(db, req.query);
    res.json(findings);
  } catch (err) {
    console.error('Error fetching risk findings:', err);
    res.status(500).json({ error: 'Failed to retrieve risk findings', detail: err.message });
  }
});

// Get single Risk Finding detail with evidence, mitigation, verification, and related PR/Jira
app.get('/api/v1/radar/findings/:id', (req, res) => {
  try {
    const finding = RiskRadarService.getFindingDetail(db, Number(req.params.id));
    if (!finding) {
      return res.status(404).json({ error: 'Risk finding not found' });
    }
    res.json(finding);
  } catch (err) {
    console.error('Error fetching risk finding detail:', err);
    res.status(500).json({ error: 'Failed to retrieve finding detail', detail: err.message });
  }
});

// Update Risk Finding status (e.g. OPEN, RESOLVED, ACKNOWLEDGED)
app.patch('/api/v1/radar/findings/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    const updated = RiskRadarService.updateFindingStatus(db, Number(req.params.id), status);
    res.json({
      status: 'success',
      item: updated
    });
  } catch (err) {
    console.error('Error updating finding status:', err);
    res.status(500).json({ error: err.message });
  }
});

// Generate AI Executive Summary with LLM synthesis grounded in factual findings
app.get('/api/v1/radar/summary', async (req, res) => {
  try {
    const { project_id } = req.query;
    const summary = await RiskRadarService.generateAIExecutiveSummary(db, project_id);
    res.json(summary);
  } catch (err) {
    console.error('Error generating AI executive summary:', err);
    res.status(500).json({ error: 'Failed to generate executive summary', detail: err.message });
  }
});

// Get Risk Rules
app.get('/api/v1/radar/rules', (req, res) => {
  try {
    const rules = db.prepare('SELECT * FROM risk_rules ORDER BY category ASC, weight DESC').all();
    res.json(rules);
  } catch (err) {
    console.error('Error fetching risk rules:', err);
    res.status(500).json({ error: 'Failed to retrieve risk rules', detail: err.message });
  }
});

// --- 6. Cyber Threat Intelligence & Zero-Day Radar Endpoints ---

// Get threat overview, trusted feeds, and matched zero-days
app.get('/api/v1/threats/overview', (req, res) => {
  try {
    const { project_id } = req.query;
    const overview = ThreatIntelService.getProjectThreatOverview(db, project_id);
    res.json(overview);
  } catch (err) {
    console.error('Error fetching threat overview:', err);
    res.status(500).json({ error: 'Failed to retrieve cyber threat intelligence', detail: err.message });
  }
});

// Trigger live threat correlation scan for a project
app.post('/api/v1/threats/scan', async (req, res) => {
  try {
    const { project_id } = req.body;
    let targetProjectId = null;
    if (project_id && project_id !== 'all') {
      const repo = db.prepare('SELECT id FROM repositories WHERE id = ? OR LOWER(name) = LOWER(?)').get(Number(project_id) || -1, String(project_id));
      targetProjectId = repo ? repo.id : Number(project_id) || null;
    }
    if (!targetProjectId) {
      const firstRepo = db.prepare('SELECT id FROM repositories LIMIT 1').get();
      targetProjectId = firstRepo ? firstRepo.id : 1;
    }

    const result = await ThreatIntelService.scanProjectForThreats(db, Number(targetProjectId));
    res.json({
      status: 'success',
      message: 'Cyber threat intelligence correlation scan completed successfully.',
      ...result
    });
  } catch (err) {
    console.error('Error executing threat scan:', err);
    res.status(500).json({ error: 'Threat correlation scan failed', detail: err.message });
  }
});

// Update threat remediation status (e.g. RESOLVED, MITIGATED, ACKNOWLEDGED)
app.patch('/api/v1/threats/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });
    const updated = ThreatIntelService.updateThreatStatus(db, Number(req.params.id), status);
    res.json({ status: 'success', item: updated });
  } catch (err) {
    console.error('Error updating threat status:', err);
    res.status(500).json({ error: err.message });
  }
});

/* --- Developer Onboarding Endpoints --- */
// Get full onboarding dossier for a repository
app.get('/api/v1/onboarding', (req, res) => {
  try {
    const { project_id } = req.query;
    let repoId = null;

    if (project_id && project_id !== 'all') {
      const repo = db.prepare('SELECT id FROM repositories WHERE id = ? OR name = ?').get(project_id, project_id);
      if (repo) repoId = repo.id;
    }

    if (!repoId) {
      // Default to first repo if none or all selected
      const firstRepo = db.prepare('SELECT id FROM repositories ORDER BY id ASC LIMIT 1').get();
      if (!firstRepo) {
        return res.json({ onboarding: null, message: 'No repositories found. Ingest or scan a repository first.' });
      }
      repoId = firstRepo.id;
    }

    const guide = DeveloperOnboardingService.getOnboardingGuide(db, repoId);
    res.json({ status: 'success', onboarding: guide });
  } catch (err) {
    console.error('Error fetching developer onboarding guide:', err);
    res.status(500).json({ error: 'Failed to fetch onboarding guide', detail: err.message });
  }
});

// Update an onboarding task status (PENDING / COMPLETED)
app.patch('/api/v1/onboarding/tasks/:id', (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });
    const updated = DeveloperOnboardingService.updateTaskStatus(db, Number(req.params.id), status);
    res.json({ status: 'success', task: updated });
  } catch (err) {
    console.error('Error updating onboarding task:', err);
    res.status(500).json({ error: 'Failed to update task', detail: err.message });
  }
});

// Reset onboarding checklist for a repository
app.post('/api/v1/onboarding/reset', (req, res) => {
  try {
    const { project_id } = req.body;
    let repoId = project_id;
    if (!repoId) {
      const firstRepo = db.prepare('SELECT id FROM repositories ORDER BY id ASC LIMIT 1').get();
      if (firstRepo) repoId = firstRepo.id;
    }
    if (repoId) {
      db.prepare('DELETE FROM developer_onboarding_tasks WHERE project_id = ?').run(repoId);
      const guide = DeveloperOnboardingService.getOnboardingGuide(db, repoId);
      return res.json({ status: 'success', onboarding: guide });
    }
    res.status(400).json({ error: 'No repository specified' });
  } catch (err) {
    console.error('Error resetting onboarding checklist:', err);
    res.status(500).json({ error: 'Failed to reset onboarding checklist', detail: err.message });
  }
});

/* --- Dead Code & Zombie Files Radar Endpoints --- */
// Get dead code report
app.get('/api/v1/dead-code', (req, res) => {
  try {
    const { project_id } = req.query;
    let repoId = null;

    if (project_id && project_id !== 'all') {
      const repo = db.prepare('SELECT id FROM repositories WHERE id = ? OR name = ?').get(project_id, project_id);
      if (repo) repoId = repo.id;
    }

    if (!repoId) {
      const firstRepo = db.prepare('SELECT id FROM repositories ORDER BY id ASC LIMIT 1').get();
      if (!firstRepo) {
        return res.json({ report: null, message: 'No repositories found.' });
      }
      repoId = firstRepo.id;
    }

    const report = DeadCodeScannerService.getProjectDeadCodeReport(db, repoId);
    res.json({ status: 'success', report });
  } catch (err) {
    console.error('Error fetching dead code report:', err);
    res.status(500).json({ error: 'Failed to fetch dead code report', detail: err.message });
  }
});

// Trigger deep dead code scan for a project
app.post('/api/v1/dead-code/scan', (req, res) => {
  try {
    const { project_id } = req.body;
    let repoId = null;

    if (project_id && project_id !== 'all') {
      const repo = db.prepare('SELECT id FROM repositories WHERE id = ? OR name = ?').get(project_id, project_id);
      if (repo) repoId = repo.id;
    }

    if (!repoId) {
      const firstRepo = db.prepare('SELECT id FROM repositories ORDER BY id ASC LIMIT 1').get();
      if (firstRepo) repoId = firstRepo.id;
    }

    if (!repoId) {
      return res.status(400).json({ error: 'No repository found to scan.' });
    }

    const report = DeadCodeScannerService.scanProjectDeadCode(db, repoId);
    res.json({ status: 'success', message: 'Dead code scan completed.', report });
  } catch (err) {
    console.error('Error running dead code scan:', err);
    res.status(500).json({ error: 'Failed to execute dead code scan', detail: err.message });
  }
});

// Update dead code finding status (OPEN, IGNORED, CLEANED)
app.patch('/api/v1/dead-code/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });
    const updated = DeadCodeScannerService.updateFindingStatus(db, Number(req.params.id), status);
    res.json({ status: 'success', item: updated });
  } catch (err) {
    console.error('Error updating dead code finding status:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Project 360 Node.js & Express server running at http://127.0.0.1:${PORT}`);
});
