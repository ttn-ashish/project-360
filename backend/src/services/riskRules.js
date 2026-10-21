/**
 * Configurable, Deterministic Risk Rules for AI Project Risk Radar.
 * Covers the 8 enterprise risk categories:
 * 1. CODE_QUALITY
 * 2. TEST_COVERAGE
 * 3. DEPENDENCY
 * 4. SECURITY
 * 5. ARCHITECTURE
 * 6. DELIVERY
 * 7. RELEASE
 * 8. CUSTOMER_IMPACT
 */

const DEFAULT_RISK_RULES = [
  // 1. CODE_QUALITY
  {
    id: 'RULE_CQ_GATE_FAILED',
    category: 'CODE_QUALITY',
    title: 'SonarQube Quality Gate Failed',
    description: 'The automated quality gate status is FAILED, indicating blocking bugs, vulnerabilities, or tech debt thresholds exceeded.',
    severity: 'CRITICAL',
    weight: 35,
    is_blocking: 1,
    enabled: 1
  },
  {
    id: 'RULE_CQ_HIGH_TECH_DEBT',
    category: 'CODE_QUALITY',
    title: 'High Code Smell or Technical Debt Accumulation',
    description: 'Code smell count or technical debt exceeds the threshold (>10 smells or >120m tech debt).',
    severity: 'MEDIUM',
    weight: 15,
    is_blocking: 0,
    enabled: 1
  },

  // 2. TEST_COVERAGE
  {
    id: 'RULE_TC_COVERAGE_DROP',
    category: 'TEST_COVERAGE',
    title: 'Significant Test Coverage Drop',
    description: 'Recent test coverage decreased by more than 5% compared to baseline.',
    severity: 'HIGH',
    weight: 30,
    is_blocking: 1,
    enabled: 1
  },
  {
    id: 'RULE_TC_BELOW_MINIMUM',
    category: 'TEST_COVERAGE',
    title: 'Test Coverage Below 75% Standard Threshold',
    description: 'Current verified line/branch coverage is below the enterprise target of 75%.',
    severity: 'MEDIUM',
    weight: 20,
    is_blocking: 0,
    enabled: 1
  },
  {
    id: 'RULE_TC_NO_TEST_EVIDENCE',
    category: 'TEST_COVERAGE',
    title: 'Missing Regression Tests in Changed Components',
    description: 'Critical changed components lack regression test suites or test ratio is zero.',
    severity: 'HIGH',
    weight: 25,
    is_blocking: 0,
    enabled: 1
  },

  // 3. DEPENDENCY
  {
    id: 'RULE_DEP_VULNERABLE',
    category: 'DEPENDENCY',
    title: 'Known Vulnerable Dependencies in Manifest',
    description: 'Direct or transitive packages match known CVEs in the dependency tree.',
    severity: 'HIGH',
    weight: 28,
    is_blocking: 1,
    enabled: 1
  },
  {
    id: 'RULE_DEP_OUTDATED_CORE',
    category: 'DEPENDENCY',
    title: 'Critical Outdated or End-of-Life Framework Version',
    description: 'Core runtime or framework dependencies are multiple major versions behind latest stable.',
    severity: 'LOW',
    weight: 10,
    is_blocking: 0,
    enabled: 1
  },

  // 4. SECURITY
  {
    id: 'RULE_SEC_CRITICAL_VULN',
    category: 'SECURITY',
    title: 'Unresolved Critical Security Vulnerabilities',
    description: 'Static analysis or security audit identified unresolved high/critical security findings.',
    severity: 'CRITICAL',
    weight: 40,
    is_blocking: 1,
    enabled: 1
  },
  {
    id: 'RULE_SEC_SECRET_EXPOSURE',
    category: 'SECURITY',
    title: 'Potential Credential or Secret Pattern in Commits',
    description: 'Git commits or config files contain patterns resembling unredacted API tokens or private keys.',
    severity: 'CRITICAL',
    weight: 35,
    is_blocking: 1,
    enabled: 1
  },

  // 5. ARCHITECTURE
  {
    id: 'RULE_ARCH_HIGH_CHURN',
    category: 'ARCHITECTURE',
    title: 'High Code Churn & Architectural Blast Radius',
    description: 'PR changes exceed 600 churn lines across >12 files or touches shared cross-cutting components.',
    severity: 'MEDIUM',
    weight: 20,
    is_blocking: 0,
    enabled: 1
  },
  {
    id: 'RULE_ARCH_CIRCULAR_DEP',
    category: 'ARCHITECTURE',
    title: 'Tightly Coupled Service or Missing Boundary',
    description: 'Component introduces cross-domain dependencies without API boundary contracts.',
    severity: 'LOW',
    weight: 12,
    is_blocking: 0,
    enabled: 1
  },

  // 6. DELIVERY
  {
    id: 'RULE_DEL_UNVERIFIED_REQ',
    category: 'DELIVERY',
    title: 'Jira Acceptance Criteria Lack Automated Test Verification',
    description: 'Linked Jira user stories contain acceptance criteria that remain unverified by tests.',
    severity: 'HIGH',
    weight: 25,
    is_blocking: 0,
    enabled: 1
  },
  {
    id: 'RULE_DEL_ORPHANED_CHANGES',
    category: 'DELIVERY',
    title: 'Orphaned Code Changes (No Linked Jira/Requirement Ticket)',
    description: 'Pull requests or major commits lack traceable Jira or ticket references.',
    severity: 'MEDIUM',
    weight: 15,
    is_blocking: 0,
    enabled: 1
  },

  // 7. RELEASE
  {
    id: 'RULE_REL_BLOCKING_FINDINGS',
    category: 'RELEASE',
    title: 'Mandatory Release Blockers Active',
    description: 'At least one mandatory deterministic release blocker (critical security or failed quality gate) is active.',
    severity: 'CRITICAL',
    weight: 40,
    is_blocking: 1,
    enabled: 1
  },

  // 8. CUSTOMER_IMPACT
  {
    id: 'RULE_CUST_PAYMENT_CORE_RISK',
    category: 'CUSTOMER_IMPACT',
    title: 'Modifications to Mission-Critical Core / Payment Flows',
    description: 'Changes touch payment, billing, or authentication services with direct end-user customer impact.',
    severity: 'HIGH',
    weight: 25,
    is_blocking: 0,
    enabled: 1
  }
];

function seedRiskRules(db) {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO risk_rules (id, category, title, description, weight, severity, is_blocking, enabled, config)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, '{}')
  `);

  for (const rule of DEFAULT_RISK_RULES) {
    stmt.run(
      rule.id,
      rule.category,
      rule.title,
      rule.description,
      rule.weight,
      rule.severity,
      rule.is_blocking,
      rule.enabled
    );
  }
}

module.exports = {
  DEFAULT_RISK_RULES,
  seedRiskRules
};
