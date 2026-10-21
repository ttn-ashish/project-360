/**
 * Enterprise Risk Radar Evaluator
 * Fully deterministic, ground-truth based analysis engine.
 * Computes:
 * - 8 Category Risk Scores (0-100)
 * - Overall Project Risk (0-100) & Health (0-100)
 * - Release Readiness (READY, BLOCKED, NEEDS_REVIEW)
 * - Grounded Risk Findings with Evidence, Calculation Breakdown, Mitigations, and Next Actions.
 * - Prioritized Advisory Recommendations.
 */

class RiskRadarEvaluator {
  /**
   * Evaluates project health and risk across all 8 dimensions
   * @param {Object} project - repository entity
   * @param {Array} prs - list of pull requests
   * @param {Array} sonars - sonar analysis records
   * @param {Array} jiras - jira issue records
   * @param {Array} rules - active risk rules
   * @param {Object} extraContext - e.g. dependency scan or commit history
   */
  static evaluateProject(project, prs = [], sonars = [], jiras = [], rules = [], extraContext = {}) {
    const findings = [];
    const recommendations = [];
    const categoryScores = {
      CODE_QUALITY: { score: 10, status: 'ASSESSED', severity: 'LOW', findings_count: 0, reason: 'No code quality issues detected.' },
      TEST_COVERAGE: { score: 10, status: 'ASSESSED', severity: 'LOW', findings_count: 0, reason: 'Test coverage meets minimum threshold.' },
      DEPENDENCY: { score: 10, status: 'ASSESSED', severity: 'LOW', findings_count: 0, reason: 'Dependencies checked with no critical CVEs.' },
      SECURITY: { score: 5, status: 'ASSESSED', severity: 'LOW', findings_count: 0, reason: 'Zero active security vulnerabilities.' },
      ARCHITECTURE: { score: 10, status: 'ASSESSED', severity: 'LOW', findings_count: 0, reason: 'Code churn and architecture within bounds.' },
      DELIVERY: { score: 10, status: 'ASSESSED', severity: 'LOW', findings_count: 0, reason: 'Requirements tracked and aligned.' },
      RELEASE: { score: 10, status: 'ASSESSED', severity: 'LOW', findings_count: 0, reason: 'No active release blockers.' },
      CUSTOMER_IMPACT: { score: 10, status: 'ASSESSED', severity: 'LOW', findings_count: 0, reason: 'Standard operational service impact.' }
    };

    const latestSonar = sonars.length > 0 ? sonars[0] : null;
    let blockingCount = 0;

    // --- 1. CODE QUALITY RISK ---
    if (latestSonar) {
      if (latestSonar.quality_gate_status === 'FAILED') {
        const score = 85;
        blockingCount++;
        categoryScores.CODE_QUALITY = {
          score,
          status: 'ASSESSED',
          severity: 'CRITICAL',
          findings_count: 1,
          reason: `Quality Gate failed with ${latestSonar.bugs_count || 0} bugs and ${latestSonar.code_smells_count || 0} code smells.`
        };

        findings.push({
          stable_key: `CQ_GATE_${project.id}`,
          category: 'CODE_QUALITY',
          title: `SonarQube Quality Gate Failed for ${project.name}`,
          description: `Static analysis quality gate status is FAILED. SonarQube reported ${latestSonar.bugs_count || 0} bugs and ${latestSonar.code_smells_count || 0} code smells requiring resolution before deployment.`,
          severity: 'CRITICAL',
          risk_score: score,
          status: 'OPEN',
          source_system: 'SonarQube',
          source_record_id: latestSonar.project_key,
          affected_component: project.name,
          recommended_action: 'Resolve blocking bugs and smells to restore SonarQube Quality Gate to PASSED.',
          mitigation_steps: [
            'Inspect failing SonarQube rules on the project branch.',
            'Fix null-dereference and boundary logic bugs reported in static analysis.',
            'Trigger SonarQube re-scan to verify gate state.'
          ],
          verification_steps: [
            'Quality gate status returns PASSED in SonarQube dashboard.',
            'Zero new critical bugs introduced.'
          ],
          calculation_breakdown: {
            base_rule: 'RULE_CQ_GATE_FAILED',
            gate_status: 'FAILED',
            bugs: latestSonar.bugs_count || 0,
            vulnerabilities: latestSonar.vulnerabilities_count || 0,
            smells: latestSonar.code_smells_count || 0,
            penalty: 75
          },
          rule_id: 'RULE_CQ_GATE_FAILED',
          evidence: [
            {
              type: 'QUALITY_GATE',
              claim: `Quality Gate status is FAILED on project ${latestSonar.project_key}`,
              source: `SonarQube:${latestSonar.project_key}`,
              payload: { gate: 'FAILED', bugs: latestSonar.bugs_count, smells: latestSonar.code_smells_count }
            }
          ]
        });
      } else {
        categoryScores.CODE_QUALITY = {
          score: Math.min(25, 5 + (latestSonar.bugs_count || 0) * 10),
          status: 'ASSESSED',
          severity: 'LOW',
          findings_count: 0,
          reason: `Quality Gate PASSED with ${latestSonar.bugs_count || 0} bugs.`
        };
      }
    } else {
      categoryScores.CODE_QUALITY = {
        score: 50,
        status: 'INSUFFICIENT_DATA',
        severity: 'MEDIUM',
        findings_count: 0,
        reason: 'No SonarQube analysis reported for this project repository.'
      };
    }

    // --- 2. TEST COVERAGE RISK ---
    if (latestSonar && latestSonar.coverage_pct != null) {
      const cov = Number(latestSonar.coverage_pct);
      const delta = Number(latestSonar.coverage_delta_pct || 0);

      let covRisk = 15;
      let covSeverity = 'LOW';
      let covFinding = null;

      if (delta < -5.0) {
        covRisk = 80;
        covSeverity = 'HIGH';
        blockingCount++;
        covFinding = {
          stable_key: `TC_REGRESSION_${project.id}`,
          category: 'TEST_COVERAGE',
          title: `Significant Test Coverage Regression (${delta.toFixed(1)}%)`,
          description: `Project test coverage declined by ${Math.abs(delta).toFixed(1)}% to ${cov.toFixed(1)}%, violating coverage stability threshold (-5.0%).`,
          severity: 'HIGH',
          risk_score: covRisk,
          status: 'OPEN',
          source_system: 'Coverage Reporter',
          source_record_id: `cov-${project.name}`,
          affected_component: project.name,
          recommended_action: `Add regression test coverage to restore overall coverage above ${(cov + Math.abs(delta)).toFixed(1)}%.`,
          mitigation_steps: [
            'Identify files with the highest uncovered branch delta in recent commits.',
            'Write integration or unit test suites covering the uncovered logic branches.',
            'Re-run CI test coverage pipeline.'
          ],
          verification_steps: [
            `Coverage delta recovers to >= 0.0% in subsequent test execution run.`,
            `Overall coverage is verified >= 75%.`
          ],
          calculation_breakdown: {
            current_coverage: cov,
            delta_percentage: delta,
            threshold_drop: -5.0,
            penalty: 65
          },
          rule_id: 'RULE_TC_COVERAGE_DROP',
          evidence: [
            {
              type: 'TEST_METRIC',
              claim: `Line coverage dropped by ${Math.abs(delta).toFixed(1)}% to ${cov.toFixed(1)}%`,
              source: 'Coverage Reporter',
              payload: { current_pct: cov, delta_pct: delta }
            }
          ]
        };
      } else if (cov < 75.0) {
        covRisk = 55;
        covSeverity = 'MEDIUM';
        covFinding = {
          stable_key: `TC_BELOW_MIN_${project.id}`,
          category: 'TEST_COVERAGE',
          title: `Test Coverage (${cov.toFixed(1)}%) Below Minimum 75% Baseline`,
          description: `Current verified line coverage for ${project.name} is ${cov.toFixed(1)}%, below the 75% quality target.`,
          severity: 'MEDIUM',
          risk_score: covRisk,
          status: 'OPEN',
          source_system: 'Coverage Reporter',
          source_record_id: `cov-base-${project.name}`,
          affected_component: project.name,
          recommended_action: 'Increase test coverage for modified application modules to >= 75%.',
          mitigation_steps: [
            'Add unit test specs for untested endpoints and core functions.'
          ],
          verification_steps: [
            'Test runner confirms >= 75% coverage achieved.'
          ],
          calculation_breakdown: {
            current_coverage: cov,
            required_threshold: 75.0,
            gap: 75.0 - cov
          },
          rule_id: 'RULE_TC_BELOW_MINIMUM',
          evidence: [
            {
              type: 'TEST_METRIC',
              claim: `Verified coverage is ${cov.toFixed(1)}% (Threshold: 75.0%)`,
              source: 'Coverage Reporter',
              payload: { current_pct: cov, required_pct: 75.0 }
            }
          ]
        };
      }

      if (covFinding) {
        findings.push(covFinding);
        categoryScores.TEST_COVERAGE = {
          score: covRisk,
          status: 'ASSESSED',
          severity: covSeverity,
          findings_count: 1,
          reason: covFinding.description
        };
      } else {
        categoryScores.TEST_COVERAGE = {
          score: 15,
          status: 'ASSESSED',
          severity: 'LOW',
          findings_count: 0,
          reason: `Coverage is healthy at ${cov.toFixed(1)}% with non-negative delta (${delta.toFixed(1)}%).`
        };
      }
    } else {
      categoryScores.TEST_COVERAGE = {
        score: 40,
        status: 'INSUFFICIENT_DATA',
        severity: 'MEDIUM',
        findings_count: 0,
        reason: 'Coverage metrics not published for this project.'
      };
    }

    // --- 3. DEPENDENCY RISK ---
    const depIssues = extraContext.dependencies || [];
    if (depIssues.length > 0) {
      categoryScores.DEPENDENCY = {
        score: 70,
        status: 'ASSESSED',
        severity: 'HIGH',
        findings_count: depIssues.length,
        reason: `${depIssues.length} dependency alerts flagged.`
      };
      findings.push({
        stable_key: `DEP_VULN_${project.id}`,
        category: 'DEPENDENCY',
        title: `Vulnerable Dependency Detected in ${project.name}`,
        description: `Dependency lockfile analysis detected ${depIssues.length} flagged package(s).`,
        severity: 'HIGH',
        risk_score: 70,
        status: 'OPEN',
        source_system: 'Package Auditor',
        source_record_id: 'pkg-audit',
        affected_component: project.name,
        recommended_action: 'Upgrade vulnerable packages to secure patched versions.',
        mitigation_steps: ['Run package manager audit fix or upgrade specified dependency.'],
        verification_steps: ['Package audit reports 0 high/critical vulnerabilities.'],
        calculation_breakdown: { vulnerable_count: depIssues.length },
        rule_id: 'RULE_DEP_VULNERABLE',
        evidence: depIssues.map(d => ({
          type: 'DEPENDENCY_ALERT',
          claim: `Package ${d.package || 'dep'} has security alert`,
          source: 'package.json',
          payload: d
        }))
      });
    } else {
      categoryScores.DEPENDENCY = {
        score: 15,
        status: 'ASSESSED',
        severity: 'LOW',
        findings_count: 0,
        reason: 'No vulnerable dependencies detected in manifest.'
      };
    }

    // --- 4. SECURITY RISK ---
    const vulnCount = latestSonar ? (latestSonar.vulnerabilities_count || 0) : 0;
    if (vulnCount > 0) {
      const secScore = 90;
      blockingCount++;
      categoryScores.SECURITY = {
        score: secScore,
        status: 'ASSESSED',
        severity: 'CRITICAL',
        findings_count: vulnCount,
        reason: `${vulnCount} confirmed security vulnerability findings remain unresolved.`
      };
      findings.push({
        stable_key: `SEC_VULN_${project.id}`,
        category: 'SECURITY',
        title: `${vulnCount} Unresolved Security Vulnerability Finding(s)`,
        description: `SonarQube security audit identified ${vulnCount} open vulnerability in ${project.name}. This is an active deployment blocker.`,
        severity: 'CRITICAL',
        risk_score: secScore,
        status: 'OPEN',
        source_system: 'SonarQube Security Engine',
        source_record_id: `sec-${project.id}`,
        affected_component: project.name,
        recommended_action: 'Resolve critical security vulnerability immediately before merge/deployment.',
        mitigation_steps: [
          'Locate security finding in SonarQube / SAST scanner.',
          'Apply sanitization or patch insecure call site.',
          'Verify with security regression test.'
        ],
        verification_steps: [
          'SonarQube vulnerability count is 0 on main branch.'
        ],
        calculation_breakdown: {
          vulnerability_count: vulnCount,
          severity: 'CRITICAL',
          is_blocking: true
        },
        rule_id: 'RULE_SEC_CRITICAL_VULN',
        evidence: [
          {
            type: 'SECURITY_SCAN',
            claim: `Security scanner reported ${vulnCount} active vulnerabilities`,
            source: `SonarQube:${latestSonar.project_key}`,
            payload: { count: vulnCount }
          }
        ]
      });
    } else {
      categoryScores.SECURITY = {
        score: 10,
        status: 'ASSESSED',
        severity: 'LOW',
        findings_count: 0,
        reason: 'Zero active security vulnerabilities detected.'
      };
    }

    // --- 5. ARCHITECTURE RISK ---
    let totalChurn = 0;
    let highChurnPr = null;
    prs.forEach(pr => {
      const churn = (pr.additions || 0) + (pr.deletions || 0);
      totalChurn += churn;
      if (churn > 500) highChurnPr = pr;
    });

    if (highChurnPr) {
      const archScore = 60;
      categoryScores.ARCHITECTURE = {
        score: archScore,
        status: 'ASSESSED',
        severity: 'MEDIUM',
        findings_count: 1,
        reason: `PR #${highChurnPr.pr_number} has large churn (+${highChurnPr.additions}/-${highChurnPr.deletions}) impacting system architecture.`
      };
      findings.push({
        stable_key: `ARCH_CHURN_PR_${highChurnPr.id}`,
        category: 'ARCHITECTURE',
        title: `High Blast Radius in PR #${highChurnPr.pr_number} (${highChurnPr.title})`,
        description: `Pull request changes +${highChurnPr.additions}/-${highChurnPr.deletions} lines. High blast radius creates architectural review overhead and regression risk.`,
        severity: 'MEDIUM',
        risk_score: archScore,
        status: 'OPEN',
        source_system: 'Git',
        source_record_id: `PR-${highChurnPr.pr_number}`,
        affected_component: project.name,
        recommended_action: 'Perform architectural review or split into smaller PRs.',
        mitigation_steps: [
          'Review affected interfaces for breaking changes.',
          'Ensure component boundaries remain modular.'
        ],
        verification_steps: [
          'Two senior engineers approve architecture changes.'
        ],
        calculation_breakdown: {
          additions: highChurnPr.additions,
          deletions: highChurnPr.deletions,
          total_churn: (highChurnPr.additions + highChurnPr.deletions)
        },
        rule_id: 'RULE_ARCH_HIGH_CHURN',
        evidence: [
          {
            type: 'GIT_METRIC',
            claim: `PR #${highChurnPr.pr_number} modified ${highChurnPr.additions + highChurnPr.deletions} lines`,
            source: `Git:PR#${highChurnPr.pr_number}`,
            payload: { additions: highChurnPr.additions, deletions: highChurnPr.deletions }
          }
        ]
      });
    } else {
      categoryScores.ARCHITECTURE = {
        score: 15,
        status: 'ASSESSED',
        severity: 'LOW',
        findings_count: 0,
        reason: 'Code churn and change size within standard architectural limits.'
      };
    }

    // --- 6. DELIVERY RISK ---
    let unverifiedCriteriaCount = 0;
    const unverifiedIssues = [];
    jiras.forEach(j => {
      const criteria = Array.isArray(j.acceptance_criteria)
        ? j.acceptance_criteria
        : (typeof j.acceptance_criteria === 'string' ? JSON.parse(j.acceptance_criteria || '[]') : []);
      const unverified = criteria.filter(c => !c.verified);
      if (unverified.length > 0) {
        unverifiedCriteriaCount += unverified.length;
        unverifiedIssues.push(j.key);
      }
    });

    if (unverifiedCriteriaCount > 0) {
      const delivScore = Math.min(85, 30 + unverifiedCriteriaCount * 15);
      categoryScores.DELIVERY = {
        score: delivScore,
        status: 'ASSESSED',
        severity: 'HIGH',
        findings_count: unverifiedCriteriaCount,
        reason: `${unverifiedCriteriaCount} Jira acceptance criteria lack automated test verification across (${unverifiedIssues.join(', ')}).`
      };
      findings.push({
        stable_key: `DELIV_UNVERIFIED_JIRA_${project.id}`,
        category: 'DELIVERY',
        title: `${unverifiedCriteriaCount} Jira Acceptance Criteria Unverified`,
        description: `Work items in Jira (${unverifiedIssues.join(', ')}) contain acceptance criteria that have not been validated by automated tests in this project release cycle.`,
        severity: 'HIGH',
        risk_score: delivScore,
        status: 'OPEN',
        source_system: 'Jira Integration',
        source_record_id: unverifiedIssues.join(','),
        affected_component: project.name,
        recommended_action: 'Implement test verification for outstanding Jira acceptance criteria.',
        mitigation_steps: [
          'Review unverified criteria in linked Jira tickets.',
          'Add targeted E2E/integration tests verifying each criterion.'
        ],
        verification_steps: [
          'All acceptance criteria flags set to verified in Jira link metadata.'
        ],
        calculation_breakdown: {
          unverified_criteria: unverifiedCriteriaCount,
          linked_tickets: unverifiedIssues
        },
        rule_id: 'RULE_DEL_UNVERIFIED_REQ',
        evidence: [
          {
            type: 'JIRA_CRITERIA',
            claim: `${unverifiedCriteriaCount} unverified criteria on ${unverifiedIssues.join(', ')}`,
            source: `Jira:${unverifiedIssues.join(', ')}`,
            payload: { unverified_count: unverifiedCriteriaCount, issues: unverifiedIssues }
          }
        ]
      });
    } else if (jiras.length === 0 && prs.length > 0) {
      categoryScores.DELIVERY = {
        score: 45,
        status: 'ASSESSED',
        severity: 'MEDIUM',
        findings_count: 1,
        reason: 'PRs are not linked to any active Jira ticket. Traceability is missing.'
      };
      findings.push({
        stable_key: `DELIV_NO_JIRA_${project.id}`,
        category: 'DELIVERY',
        title: `Orphaned PRs Without Jira Requirement Link`,
        description: `Active pull requests for ${project.name} do not trace back to business requirements or Jira user stories.`,
        severity: 'MEDIUM',
        risk_score: 45,
        status: 'OPEN',
        source_system: 'Git Traceability',
        source_record_id: 'orphan-pr',
        affected_component: project.name,
        recommended_action: 'Link active pull requests to tracking Jira tickets.',
        mitigation_steps: ['Update PR branch name or description with ticket key.'],
        verification_steps: ['PR displays linked Jira ticket.'],
        calculation_breakdown: { orphan_prs: prs.length },
        rule_id: 'RULE_DEL_ORPHANED_CHANGES',
        evidence: [
          {
            type: 'TRACEABILITY',
            claim: 'No Jira issue keys detected in PR commits or branches',
            source: 'Git & Jira Integrations',
            payload: { pr_count: prs.length }
          }
        ]
      });
    } else {
      categoryScores.DELIVERY = {
        score: 15,
        status: 'ASSESSED',
        severity: 'LOW',
        findings_count: 0,
        reason: 'All linked Jira requirements and acceptance criteria are verified.'
      };
    }

    // --- 7. RELEASE RISK ---
    if (blockingCount > 0) {
      const relScore = 90;
      categoryScores.RELEASE = {
        score: relScore,
        status: 'ASSESSED',
        severity: 'CRITICAL',
        findings_count: blockingCount,
        reason: `${blockingCount} mandatory release blocker(s) are active.`
      };
      findings.push({
        stable_key: `REL_BLOCKERS_${project.id}`,
        category: 'RELEASE',
        title: `Release Blocked: ${blockingCount} Mandatory Gating Policy Violation(s)`,
        description: `Deployment to production is blocked by deterministic gating policy. Unresolved blockers: Sonar Quality Gate failure, security findings, or severe test regression.`,
        severity: 'CRITICAL',
        risk_score: relScore,
        status: 'OPEN',
        source_system: 'Release Policy Engine',
        source_record_id: `rel-gate-${project.name}`,
        affected_component: project.name,
        recommended_action: 'Resolve all blocking findings to pass release gating policy.',
        mitigation_steps: [
          'Address critical security vulnerabilities.',
          'Restore SonarQube quality gate.',
          'Re-verify release criteria.'
        ],
        verification_steps: [
          'Release readiness status transitions to READY.'
        ],
        calculation_breakdown: {
          blocking_violations: blockingCount,
          policy: 'STRICT_ZERO_CRITICAL'
        },
        rule_id: 'RULE_REL_BLOCKING_FINDINGS',
        evidence: [
          {
            type: 'RELEASE_GATE',
            claim: `${blockingCount} gating violations active`,
            source: 'Project 360 Release Policy',
            payload: { blockers: blockingCount }
          }
        ]
      });
    } else {
      categoryScores.RELEASE = {
        score: 15,
        status: 'ASSESSED',
        severity: 'LOW',
        findings_count: 0,
        reason: 'Zero active mandatory release blockers.'
      };
    }

    // --- 8. CUSTOMER IMPACT RISK ---
    const isCoreService = project.name.includes('payment') || 
                          project.name.includes('auth') || 
                          project.service_type?.includes('Security') || 
                          project.name.includes('checkout');
    if (isCoreService) {
      const impactScore = blockingCount > 0 ? 80 : 35;
      categoryScores.CUSTOMER_IMPACT = {
        score: impactScore,
        status: 'ASSESSED',
        severity: blockingCount > 0 ? 'HIGH' : 'MEDIUM',
        findings_count: blockingCount > 0 ? 1 : 0,
        reason: `${project.name} is a mission-critical service affecting billing, auth, or customer checkout flows.`
      };
      if (blockingCount > 0) {
        findings.push({
          stable_key: `CUST_IMPACT_CORE_${project.id}`,
          category: 'CUSTOMER_IMPACT',
          title: `High Customer Impact Blast Radius on Critical Flow`,
          description: `${project.name} is identified as a critical payment/auth service. Releasing with open findings risks customer checkout or authorization outages.`,
          severity: 'HIGH',
          risk_score: impactScore,
          status: 'OPEN',
          source_system: 'Service Catalog',
          source_record_id: project.service_type || 'Core',
          affected_component: project.name,
          recommended_action: 'Perform regression testing on payment/auth end-user flows.',
          mitigation_steps: [
            'Execute end-to-end synthetic user transaction test.',
            'Confirm payment gateway webhooks respond within SLA.'
          ],
          verification_steps: [
            'All payment/auth smoke test cases pass in staging.'
          ],
          calculation_breakdown: {
            service_criticality: 'TIER_1_CORE',
            active_blockers: blockingCount
          },
          rule_id: 'RULE_CUST_PAYMENT_CORE_RISK',
          evidence: [
            {
              type: 'SERVICE_CATALOG',
              claim: `${project.name} handles mission-critical customer transactions`,
              source: 'Service Catalog',
              payload: { service: project.name, type: project.service_type }
            }
          ]
        });
      }
    } else {
      categoryScores.CUSTOMER_IMPACT = {
        score: 15,
        status: 'ASSESSED',
        severity: 'LOW',
        findings_count: 0,
        reason: 'Standard internal microservice with limited direct customer blast radius.'
      };
    }

    // --- COMPUTE AGGREGATE RISK AND HEALTH ---
    // Weighted average across assessed categories:
    const weights = {
      CODE_QUALITY: 0.15,
      TEST_COVERAGE: 0.15,
      DEPENDENCY: 0.10,
      SECURITY: 0.20,
      ARCHITECTURE: 0.10,
      DELIVERY: 0.10,
      RELEASE: 0.10,
      CUSTOMER_IMPACT: 0.10
    };

    let weightedSum = 0;
    let totalWeight = 0;
    for (const [cat, data] of Object.entries(categoryScores)) {
      if (data.status === 'ASSESSED') {
        const w = weights[cat] || 0.1;
        weightedSum += data.score * w;
        totalWeight += w;
      }
    }

    let calculatedRisk = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 20;

    // Strict release blocker override: if any critical blocker exists, overall risk cannot be LOW
    if (blockingCount > 0 && calculatedRisk < 65) {
      calculatedRisk = 65 + Math.min(30, blockingCount * 10);
    }

    const finalRiskScore = Math.max(0, Math.min(100, calculatedRisk));
    const finalHealthScore = Math.max(0, Math.min(100, 100 - finalRiskScore));

    let overallRiskLevel = 'LOW';
    if (finalRiskScore >= 70) overallRiskLevel = 'CRITICAL';
    else if (finalRiskScore >= 45) overallRiskLevel = 'HIGH';
    else if (finalRiskScore >= 20) overallRiskLevel = 'MEDIUM';

    let releaseReadiness = 'READY';
    if (blockingCount > 0 || overallRiskLevel === 'CRITICAL') {
      releaseReadiness = 'BLOCKED';
    } else if (overallRiskLevel === 'HIGH' || unverifiedCriteriaCount > 0) {
      releaseReadiness = 'NEEDS_REVIEW';
    }

    // --- GENERATE RANKED ADVISORY RECOMMENDATIONS ---
    // 1. Resolve blocking security vulnerabilities
    if (vulnCount > 0) {
      recommendations.push({
        title: 'Resolve Unresolved Critical Security Finding',
        reason: `${vulnCount} security vulnerability finding(s) detected in static analysis.`,
        urgency: 'CRITICAL',
        expected_benefit: 'Prevents security vulnerabilities from entering production and unblocks release gate.',
        suggested_owner: 'Security & Lead Developer',
        action_type: 'ADVISORY',
        verification_criteria: 'Zero vulnerabilities reported in SonarQube scan.',
        related_finding_keys: [`SEC_VULN_${project.id}`],
        priority_rank: 1
      });
    }

    // 2. Resolve SonarQube quality gate
    if (latestSonar && latestSonar.quality_gate_status === 'FAILED') {
      recommendations.push({
        title: 'Fix Code Quality Violations and Pass Quality Gate',
        reason: `Quality Gate status is FAILED with ${latestSonar.bugs_count || 0} bugs and ${latestSonar.code_smells_count || 0} code smells.`,
        urgency: 'HIGH',
        expected_benefit: 'Restores code maintainability and prevents runtime bugs in production.',
        suggested_owner: 'Core Engineering Team',
        action_type: 'ADVISORY',
        verification_criteria: 'SonarQube Quality Gate status reports PASSED.',
        related_finding_keys: [`CQ_GATE_${project.id}`],
        priority_rank: 2
      });
    }

    // 3. Address test coverage drops
    const covDelta = latestSonar ? Number(latestSonar.coverage_delta_pct || 0) : 0;
    if (covDelta < -5.0 || (latestSonar && Number(latestSonar.coverage_pct) < 75)) {
      recommendations.push({
        title: 'Add Regression Unit & Integration Tests',
        reason: `Coverage dropped by ${Math.abs(covDelta).toFixed(1)}% or remains below the 75% target.`,
        urgency: 'HIGH',
        expected_benefit: 'Protects critical paths from regression and restores delivery confidence.',
        suggested_owner: 'QA / Feature Engineers',
        action_type: 'ADVISORY',
        verification_criteria: 'Coverage delta restored to >= 0% and line coverage exceeds 75%.',
        related_finding_keys: [`TC_REGRESSION_${project.id}`, `TC_BELOW_MIN_${project.id}`].filter(k => findings.some(f => f.stable_key === k)),
        priority_rank: 3
      });
    }

    // 4. Address unverified Jira criteria
    if (unverifiedCriteriaCount > 0) {
      recommendations.push({
        title: 'Verify Outstanding Acceptance Criteria in Jira',
        reason: `${unverifiedCriteriaCount} Jira criteria lack automated verification in this change set.`,
        urgency: 'MEDIUM',
        expected_benefit: 'Ensures business requirements are fully fulfilled prior to production rollout.',
        suggested_owner: 'Product Lead / QA Engineer',
        action_type: 'ADVISORY',
        verification_criteria: 'All acceptance criteria marked verified by automated test assertions.',
        related_finding_keys: [`DELIV_UNVERIFIED_JIRA_${project.id}`],
        priority_rank: 4
      });
    }

    // Fallback advisory recommendation if everything is clean
    if (recommendations.length === 0) {
      recommendations.push({
        title: 'Approved for Standard Canary Deployment',
        reason: 'All 8 risk categories meet healthy production standards with zero blocking findings.',
        urgency: 'LOW',
        expected_benefit: 'Safe phased rollout to canary traffic.',
        suggested_owner: 'Release Manager',
        action_type: 'ADVISORY',
        verification_criteria: 'Monitor canary telemetry for 30 minutes with zero 5xx error spikes.',
        related_finding_keys: [],
        priority_rank: 1
      });
    }

    // --- GROUNDED EXECUTIVE SUMMARY (Deterministic Baseline) ---
    const keyReasons = [];
    if (vulnCount > 0) keyReasons.push(`${vulnCount} critical security vulnerability finding(s) remain unresolved.`);
    if (latestSonar && latestSonar.quality_gate_status === 'FAILED') keyReasons.push('SonarQube Quality Gate is in FAILED state.');
    if (covDelta < -5.0) keyReasons.push(`Test coverage decreased significantly by ${Math.abs(covDelta).toFixed(1)}%.`);
    if (unverifiedCriteriaCount > 0) keyReasons.push(`${unverifiedCriteriaCount} Jira acceptance criteria lack test verification.`);
    if (isCoreService && blockingCount > 0) keyReasons.push(`${project.name} is a mission-critical core service.`);

    let deterministicSummary = `Overall Project Risk: ${overallRiskLevel} (Score: ${finalRiskScore}/100, Health: ${finalHealthScore}/100, Release Readiness: ${releaseReadiness}).\n`;
    if (keyReasons.length > 0) {
      deterministicSummary += `Key Risk Drivers:\n` + keyReasons.map(r => `• ${r}`).join('\n') + `\n\nRecommended Next Step: ${recommendations[0]?.title || 'Proceed with monitoring'}.`;
    } else {
      deterministicSummary += 'All engineering signals indicate healthy quality gates, verified coverage, and low delivery risk.';
    }

    return {
      project_id: project.id,
      project_name: project.name,
      health_score: finalHealthScore,
      risk_score: finalRiskScore,
      risk_level: overallRiskLevel,
      release_readiness: releaseReadiness,
      category_scores: categoryScores,
      findings,
      recommendations,
      executive_summary: deterministicSummary,
      summary_basis: {
        total_findings: findings.length,
        critical_findings: findings.filter(f => f.severity === 'CRITICAL').length,
        high_findings: findings.filter(f => f.severity === 'HIGH').length,
        blocking_violations: blockingCount,
        unverified_criteria: unverifiedCriteriaCount
      },
      data_freshness: {
        analyzed_at: new Date().toISOString(),
        sonar_status: latestSonar ? 'FRESH' : 'MISSING',
        jira_status: jiras.length > 0 ? 'SYNCED' : 'UNLINKED',
        git_status: prs.length > 0 ? 'SYNCED' : 'NO_PRS'
      }
    };
  }
}

module.exports = RiskRadarEvaluator;
