/**
 * Deterministic Risk Radar and Health Scoring Engine.
 * Pure arithmetic and verifiable rule evaluation without hallucination.
 * Removed tier dependency: analyzes blast radius, coverage drops, quality gates, and Jira alignment.
 */

class RiskEngine {
  static assessPrRisk(pr, repo, linkedIssues = [], sonar = null) {
    let riskScore = 10; // Ambient base risk
    const factors = {};
    const evidence = [];
    const actions = [];

    // Factor 1: SonarQube Quality Gate & Security Analysis
    if (sonar) {
      if (sonar.quality_gate_status === 'FAILED') {
        const gatePenalty = 35;
        riskScore += gatePenalty;
        factors.quality_gate = { score: gatePenalty, status: 'FAILED' };
        evidence.push({
          category: 'Quality Gate',
          status: 'VIOLATION',
          detail: `SonarQube Quality Gate FAILED (${sonar.vulnerabilities_count || 0} vulnerabilities, ${sonar.bugs_count || 0} bugs, ${sonar.code_smells_count || 0} code smells).`,
          source: `SonarQube: ${sonar.project_key}`,
          weight: gatePenalty
        });
        actions.push('Block PR merge until SonarQube Quality Gate passes.');
      } else {
        factors.quality_gate = { score: 0, status: 'PASSED' };
        evidence.push({
          category: 'Quality Gate',
          status: 'PASSED',
          detail: 'SonarQube Quality Gate PASSED with 0 blocking issues.',
          source: `SonarQube: ${sonar.project_key}`,
          weight: 0
        });
      }

      // Coverage regression delta
      const delta = Number(sonar.coverage_delta_pct) || 0;
      const coverage = Number(sonar.coverage_pct) || 0;
      if (delta < -5.0) {
        const covPenalty = 25;
        riskScore += covPenalty;
        factors.coverage_regression = { score: covPenalty, delta };
        evidence.push({
          category: 'Test Coverage',
          status: 'REGRESSION',
          detail: `Code coverage decreased by ${Math.abs(delta).toFixed(1)}% (Current: ${coverage.toFixed(1)}%).`,
          source: 'Coverage Reporter',
          weight: covPenalty
        });
        actions.push(`Add regression unit tests to restore coverage to > ${(coverage + Math.abs(delta)).toFixed(1)}%.`);
      } else if (coverage < 75.0) {
        const covPenalty = 12;
        riskScore += covPenalty;
        factors.coverage_low = { score: covPenalty, coverage };
        evidence.push({
          category: 'Test Coverage',
          status: 'WARNING',
          detail: `Test coverage (${coverage.toFixed(1)}%) is below organization threshold of 75%.`,
          source: 'Coverage Reporter',
          weight: covPenalty
        });
      }
    } else {
      riskScore += 15;
      factors.sonar_missing = { score: 15 };
      evidence.push({
        category: 'Quality Gate',
        status: 'UNKNOWN',
        detail: 'No SonarQube analysis found for this repository branch.',
        source: 'SonarQube Integration',
        weight: 15
      });
      actions.push('Trigger automated SonarQube static scan on this PR branch.');
    }

    // Factor 2: Blast Radius (Code Churn & Changed Files)
    const totalChurn = (pr.additions || 0) + (pr.deletions || 0);
    const changedFiles = Array.isArray(pr.changed_files) 
      ? pr.changed_files 
      : JSON.parse(pr.changed_files || '[]');

    if (totalChurn > 600 || changedFiles.length > 15) {
      const churnPenalty = 20;
      riskScore += churnPenalty;
      factors.diff_churn = { score: churnPenalty, lines: totalChurn, files: changedFiles.length };
      evidence.push({
        category: 'Code Churn',
        status: 'WARNING',
        detail: `Large blast radius: +${pr.additions}/-${pr.deletions} lines across ${changedFiles.length} files.`,
        source: `Git PR #${pr.pr_number}`,
        weight: churnPenalty
      });
      actions.push('Recommend splitting PR into smaller, atomic feature branches to ease review.');
    }

    // Factor 3: Requirements Alignment & Jira Traceability
    if (linkedIssues && linkedIssues.length > 0) {
      let unverifiedCriteriaCount = 0;
      for (const issue of linkedIssues) {
        const criteria = Array.isArray(issue.acceptance_criteria)
          ? issue.acceptance_criteria
          : JSON.parse(issue.acceptance_criteria || '[]');
        for (const crit of criteria) {
          if (!crit.verified) {
            unverifiedCriteriaCount++;
          }
        }
      }

      if (unverifiedCriteriaCount > 0) {
        const critPenalty = Math.min(20, unverifiedCriteriaCount * 8);
        riskScore += critPenalty;
        factors.unverified_criteria = { score: critPenalty, count: unverifiedCriteriaCount };
        evidence.push({
          category: 'Requirements Alignment',
          status: 'PENDING_VERIFICATION',
          detail: `${unverifiedCriteriaCount} Jira acceptance criteria lack automated test verification in this PR.`,
          source: `Jira: ${linkedIssues.map(i => i.key).join(', ')}`,
          weight: critPenalty
        });
        actions.push(`Complete verification for ${unverifiedCriteriaCount} open Jira acceptance criteria.`);
      } else {
        factors.unverified_criteria = { score: 0, status: 'VERIFIED' };
        evidence.push({
          category: 'Requirements Alignment',
          status: 'VERIFIED',
          detail: 'All criteria in linked Jira issue(s) are addressed.',
          source: `Jira: ${linkedIssues.map(i => i.key).join(', ')}`,
          weight: 0
        });
      }
    } else {
      const jiraPenalty = 20;
      riskScore += jiraPenalty;
      factors.missing_jira = { score: jiraPenalty };
      evidence.push({
        category: 'Requirements Alignment',
        status: 'ORPHANED_PR',
        detail: 'PR is not linked to any active Jira ticket. No traceable business requirements found.',
        source: 'Git Traceability',
        weight: jiraPenalty
      });
      actions.push('Link PR to an active Jira issue key in branch name or PR title.');
    }

    // Clamp score between 0 and 100
    const finalRisk = Math.max(0, Math.min(100, riskScore));
    const healthScore = Math.max(0, 100 - finalRisk);

    let riskLevel = 'LOW';
    if (finalRisk > 80) riskLevel = 'CRITICAL';
    else if (finalRisk > 60) riskLevel = 'HIGH';
    else if (finalRisk > 30) riskLevel = 'MEDIUM';

    let summary = `Release Risk for PR #${pr.pr_number} on ${repo.name} is ${riskLevel} (Score: ${finalRisk}/100, Health: ${healthScore}/100). `;
    if (['HIGH', 'CRITICAL'].includes(riskLevel)) {
      summary += `Release is flagged due to ${actions.length} gating issues including ` +
        (sonar ? `SonarQube Quality Gate ${sonar.quality_gate_status}` : 'missing quality scan metrics') +
        ` on ${repo.name}.`;
    } else {
      summary += 'Quality gates and requirement criteria meet deployment standards with low operational risk.';
    }

    if (actions.length === 0) {
      actions.push('Approved for standard canary deployment.');
    }

    return {
      health_score: healthScore,
      risk_score: finalRisk,
      risk_level: riskLevel,
      factors,
      evidence,
      executive_summary: summary,
      recommended_actions: actions
    };
  }

  static calculateProjectOverview(prs, repos, sonarList, assessments) {
    let avgHealth = 85;
    let avgRisk = 25;

    if (assessments && assessments.length > 0) {
      avgHealth = Math.round(assessments.reduce((acc, a) => acc + a.health_score, 0) / assessments.length);
      avgRisk = Math.round(assessments.reduce((acc, a) => acc + a.risk_score, 0) / assessments.length);
    }

    const failedGates = sonarList.filter(s => s.quality_gate_status === 'FAILED').length;
    const totalVulnerabilities = sonarList.reduce((acc, s) => acc + (s.vulnerabilities_count || 0), 0);
    const totalBugs = sonarList.reduce((acc, s) => acc + (s.bugs_count || 0), 0);
    const avgCoverage = sonarList.length > 0
      ? Number((sonarList.reduce((acc, s) => acc + (s.coverage_pct || 0), 0) / sonarList.length).toFixed(1))
      : 80.0;

    const highRiskPrs = assessments.filter(a => ['HIGH', 'CRITICAL'].includes(a.risk_level)).length;

    let overallReleaseRisk = 'LOW';
    if (avgRisk > 60) overallReleaseRisk = 'HIGH';
    else if (avgRisk > 30) overallReleaseRisk = 'MEDIUM';

    return {
      overall_health_score: avgHealth,
      overall_release_risk: overallReleaseRisk,
      risk_score: avgRisk,
      metrics: {
        active_repositories: repos.length,
        open_pull_requests: prs.length,
        high_risk_pull_requests: highRiskPrs,
        failed_quality_gates: failedGates,
        total_vulnerabilities: totalVulnerabilities,
        total_bugs: totalBugs,
        average_test_coverage_pct: avgCoverage
      }
    };
  }
}

module.exports = RiskEngine;
