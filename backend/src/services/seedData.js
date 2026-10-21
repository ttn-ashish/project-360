const RiskEngine = require('./riskEngine');

function seedInitialData(db) {
  const existing = db.prepare('SELECT COUNT(*) as count FROM repositories').get();
  if (existing.count > 0) return;

  // 1. Repositories (clean names without tier)
  const repos = [
    { name: 'core-payment-service', full_name: 'enterprise-org/core-payment-service', url: 'https://github.com/enterprise-org/core-payment-service', service_type: 'Backend Microservice' },
    { name: 'checkout-web-portal', full_name: 'enterprise-org/checkout-web-portal', url: 'https://github.com/enterprise-org/checkout-web-portal', service_type: 'Frontend Web App' },
    { name: 'auth-identity-service', full_name: 'enterprise-org/auth-identity-service', url: 'https://github.com/enterprise-org/auth-identity-service', service_type: 'Security & IAM' },
    { name: 'notification-worker', full_name: 'enterprise-org/notification-worker', url: 'https://github.com/enterprise-org/notification-worker', service_type: 'Async Worker' }
  ];

  const repoMap = {};
  for (const r of repos) {
    const res = db.prepare(`
      INSERT INTO repositories (name, full_name, url, default_branch, service_type)
      VALUES (?, ?, ?, 'main', ?)
    `).run(r.name, r.full_name, r.url, r.service_type);
    repoMap[r.name] = res.lastInsertRowid;
  }

  // 2. Jira Issues
  const jiras = [
    {
      key: 'PAY-402',
      summary: 'Implement SEPA Direct Debit Mandate & Settlement',
      description: 'Enable instant SEPA direct debit bank settlement for European business accounts.',
      status: 'In Review',
      priority: 'High',
      assignee: 'alex.dev@company.com',
      criteria: [
        { text: 'Persist signed SEPA mandate in MandateDAO with cryptographic timestamp', verified: false },
        { text: "Emit settlement transaction event to Kafka topic 'payments.sepa.v1'", verified: true },
        { text: 'Reject non-SEPA IBANs with explicit error code ERR_INVALID_SEPA_PREFIX', verified: false }
      ]
    },
    {
      key: 'CHK-118',
      summary: 'Dynamic VAT Calculation for EU Cross-Border Carts',
      description: 'Calculate destination-based VAT for EU customers during cart checkout step 2.',
      status: 'In Progress',
      priority: 'Medium',
      assignee: 'sarah.lead@company.com',
      criteria: [
        { text: 'Query TaxService API with country code and tax registration ID', verified: true },
        { text: 'Display breakdown of net price + VAT in CheckoutSummary table', verified: true }
      ]
    },
    {
      key: 'AUTH-305',
      summary: 'Rotate OAuth 2.0 Signing Certificates & Invalidate Revoked JWTs',
      description: 'Zero-downtime certificate rotation for auth tokens with immediate Redis revocation list syncing.',
      status: 'In Review',
      priority: 'Highest',
      assignee: 'marcus.sec@company.com',
      criteria: [
        { text: 'Verify dual key verification during the 48h rotation window', verified: true },
        { text: 'Reject blacklisted JTI tokens within 50ms of revocation', verified: true }
      ]
    },
    {
      key: 'NOTIF-77',
      summary: 'Exponential Backoff Retry for Failed Webhook Notifications',
      description: 'Mitigate partner endpoint outages by implementing 5-stage exponential backoff.',
      status: 'In Progress',
      priority: 'Low',
      assignee: 'elena.eng@company.com',
      criteria: [
        { text: 'Retry attempts at 1m, 5m, 15m, 1h, 6h', verified: true }
      ]
    }
  ];

  const jiraMap = {};
  for (const j of jiras) {
    const res = db.prepare(`
      INSERT INTO jira_issues (key, summary, description, status, priority, assignee, acceptance_criteria)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(j.key, j.summary, j.description, j.status, j.priority, j.assignee, JSON.stringify(j.criteria));
    jiraMap[j.key] = res.lastInsertRowid;
  }

  // 3. SonarQube Analyses
  const sonars = [
    {
      repo_id: repoMap['core-payment-service'],
      project_key: 'core-payment-service',
      quality_gate_status: 'FAILED',
      coverage_pct: 71.2,
      coverage_delta_pct: -13.2,
      bugs_count: 2,
      vulnerabilities_count: 1,
      code_smells_count: 14
    },
    {
      repo_id: repoMap['checkout-web-portal'],
      project_key: 'checkout-web-portal',
      quality_gate_status: 'PASSED',
      coverage_pct: 84.5,
      coverage_delta_pct: 1.1,
      bugs_count: 0,
      vulnerabilities_count: 0,
      code_smells_count: 3
    },
    {
      repo_id: repoMap['auth-identity-service'],
      project_key: 'auth-identity-service',
      quality_gate_status: 'PASSED',
      coverage_pct: 91.0,
      coverage_delta_pct: 0.5,
      bugs_count: 0,
      vulnerabilities_count: 0,
      code_smells_count: 1
    },
    {
      repo_id: repoMap['notification-worker'],
      project_key: 'notification-worker',
      quality_gate_status: 'PASSED',
      coverage_pct: 88.0,
      coverage_delta_pct: 2.3,
      bugs_count: 0,
      vulnerabilities_count: 0,
      code_smells_count: 2
    }
  ];

  for (const s of sonars) {
    db.prepare(`
      INSERT INTO sonar_analyses (repo_id, project_key, quality_gate_status, coverage_pct, coverage_delta_pct, bugs_count, vulnerabilities_count, code_smells_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(s.repo_id, s.project_key, s.quality_gate_status, s.coverage_pct, s.coverage_delta_pct, s.bugs_count, s.vulnerabilities_count, s.code_smells_count);
  }

  // 4. Pull Requests
  const prs = [
    {
      repo: 'core-payment-service',
      pr_number: 4521,
      title: 'PAY-402: Add SEPA direct debit mandate handling & settlement flow',
      author: 'alex.dev',
      source_branch: 'feature/PAY-402-sepa-mandate',
      additions: 420,
      deletions: 110,
      changed_files: ['V42__sepa_mandates.sql', 'PaymentService.java', 'MandateDAO.java', 'DirectDebitController.java'],
      jiraKey: 'PAY-402'
    },
    {
      repo: 'checkout-web-portal',
      pr_number: 1042,
      title: 'CHK-118: Cart step 2 dynamic VAT recalculation hook',
      author: 'sarah.lead',
      source_branch: 'feature/CHK-118-eu-vat',
      additions: 125,
      deletions: 34,
      changed_files: ['useVatCalculation.ts', 'CartSummary.tsx', 'taxApi.ts'],
      jiraKey: 'CHK-118'
    },
    {
      repo: 'auth-identity-service',
      pr_number: 890,
      title: 'AUTH-305: Hotfix redis token revocation blacklist key pattern',
      author: 'marcus.sec',
      source_branch: 'bugfix/AUTH-305-jwt-revocation',
      additions: 45,
      deletions: 12,
      changed_files: ['TokenService.java', 'RedisRevocationStore.java'],
      jiraKey: 'AUTH-305'
    },
    {
      repo: 'notification-worker',
      pr_number: 302,
      title: 'NOTIF-77: Implement jitter and backoff in webhook dispatcher',
      author: 'elena.eng',
      source_branch: 'feature/NOTIF-77-retry-jitter',
      additions: 88,
      deletions: 19,
      changed_files: ['dispatcher.go', 'retry_strategy.go'],
      jiraKey: 'NOTIF-77'
    }
  ];

  for (const pr of prs) {
    const repoId = repoMap[pr.repo];
    const res = db.prepare(`
      INSERT INTO pull_requests (repo_id, pr_number, title, author, source_branch, additions, deletions, changed_files)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(repoId, pr.pr_number, pr.title, pr.author, pr.source_branch, pr.additions, pr.deletions, JSON.stringify(pr.changed_files));
    const prId = res.lastInsertRowid;

    if (pr.jiraKey && jiraMap[pr.jiraKey]) {
      db.prepare(`
        INSERT INTO pr_jira_links (pr_id, jira_id)
        VALUES (?, ?)
      `).run(prId, jiraMap[pr.jiraKey]);
    }

    const repoObj = db.prepare('SELECT * FROM repositories WHERE id = ?').get(repoId);
    const sonarObj = db.prepare('SELECT * FROM sonar_analyses WHERE repo_id = ?').get(repoId);
    const linkedJiras = pr.jiraKey ? [db.prepare('SELECT * FROM jira_issues WHERE id = ?').get(jiraMap[pr.jiraKey])] : [];

    const assessment = RiskEngine.assessPrRisk(
      { ...pr, id: prId },
      repoObj,
      linkedJiras,
      sonarObj
    );

    db.prepare(`
      INSERT INTO risk_assessments (pr_id, health_score, risk_score, risk_level, executive_summary, factors, evidence, recommended_actions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      prId,
      assessment.health_score,
      assessment.risk_score,
      assessment.risk_level,
      assessment.executive_summary,
      JSON.stringify(assessment.factors),
      JSON.stringify(assessment.evidence),
      JSON.stringify(assessment.recommended_actions)
    );
  }
}

module.exports = { seedInitialData };
