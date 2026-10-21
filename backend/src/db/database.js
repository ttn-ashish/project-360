const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../project360.db');
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for high performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS repositories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      url TEXT DEFAULT '',
      default_branch TEXT DEFAULT 'main',
      service_type TEXT DEFAULT 'Microservice',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS pull_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repo_id INTEGER NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
      pr_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      source_branch TEXT NOT NULL,
      target_branch TEXT DEFAULT 'main',
      status TEXT DEFAULT 'open',
      diff_summary TEXT DEFAULT '',
      additions INTEGER DEFAULT 0,
      deletions INTEGER DEFAULT 0,
      changed_files TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS jira_issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      summary TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'To Do',
      issue_type TEXT DEFAULT 'Story',
      priority TEXT DEFAULT 'Medium',
      assignee TEXT DEFAULT 'unassigned',
      acceptance_criteria TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS pr_jira_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pr_id INTEGER NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
      jira_id INTEGER NOT NULL REFERENCES jira_issues(id) ON DELETE CASCADE,
      linked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(pr_id, jira_id)
    );

    CREATE TABLE IF NOT EXISTS sonar_analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repo_id INTEGER NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
      project_key TEXT NOT NULL,
      branch TEXT DEFAULT 'main',
      quality_gate_status TEXT DEFAULT 'PASSED',
      coverage_pct REAL DEFAULT 80.0,
      coverage_delta_pct REAL DEFAULT 0.0,
      bugs_count INTEGER DEFAULT 0,
      vulnerabilities_count INTEGER DEFAULT 0,
      code_smells_count INTEGER DEFAULT 0,
      tech_debt_minutes INTEGER DEFAULT 0,
      critical_issues_detail TEXT DEFAULT '[]',
      analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS risk_assessments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pr_id INTEGER NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
      health_score INTEGER NOT NULL,
      risk_score INTEGER NOT NULL,
      risk_level TEXT NOT NULL,
      executive_summary TEXT NOT NULL,
      factors TEXT DEFAULT '{}',
      evidence TEXT DEFAULT '[]',
      recommended_actions TEXT DEFAULT '[]',
      assessed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    /* --- AI Project Risk Radar Enterprise Entities --- */
    CREATE TABLE IF NOT EXISTS risk_radar_assessments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
      health_score INTEGER NOT NULL,
      risk_score INTEGER NOT NULL,
      risk_level TEXT NOT NULL,
      release_readiness TEXT NOT NULL DEFAULT 'NEEDS_REVIEW',
      category_scores TEXT NOT NULL DEFAULT '{}',
      executive_summary TEXT NOT NULL DEFAULT '',
      summary_basis TEXT DEFAULT '{}',
      data_freshness TEXT DEFAULT '{}',
      assessed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS risk_findings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assessment_id INTEGER REFERENCES risk_radar_assessments(id) ON DELETE SET NULL,
      project_id INTEGER NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
      stable_key TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      severity TEXT NOT NULL,
      risk_score INTEGER NOT NULL DEFAULT 50,
      status TEXT NOT NULL DEFAULT 'OPEN',
      source_system TEXT NOT NULL,
      source_record_id TEXT DEFAULT '',
      affected_component TEXT DEFAULT '',
      first_detected DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_observed DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME,
      owner TEXT DEFAULT 'Engineering Team',
      recommended_action TEXT DEFAULT '',
      mitigation_steps TEXT DEFAULT '[]',
      verification_steps TEXT DEFAULT '[]',
      calculation_breakdown TEXT DEFAULT '{}',
      rule_id TEXT DEFAULT '',
      UNIQUE(project_id, stable_key)
    );

    CREATE TABLE IF NOT EXISTS risk_evidence (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      finding_id INTEGER NOT NULL REFERENCES risk_findings(id) ON DELETE CASCADE,
      evidence_type TEXT NOT NULL,
      claim TEXT NOT NULL,
      source_reference TEXT NOT NULL,
      source_url TEXT DEFAULT '',
      payload TEXT DEFAULT '{}',
      observed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS risk_recommendations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assessment_id INTEGER NOT NULL REFERENCES risk_radar_assessments(id) ON DELETE CASCADE,
      project_id INTEGER NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      reason TEXT NOT NULL,
      urgency TEXT NOT NULL DEFAULT 'HIGH',
      expected_benefit TEXT NOT NULL,
      suggested_owner TEXT DEFAULT 'Tech Lead',
      action_type TEXT NOT NULL DEFAULT 'ADVISORY',
      verification_criteria TEXT NOT NULL,
      related_finding_keys TEXT DEFAULT '[]',
      priority_rank INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS risk_rules (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      weight INTEGER NOT NULL DEFAULT 20,
      severity TEXT NOT NULL DEFAULT 'HIGH',
      is_blocking BOOLEAN DEFAULT 0,
      enabled BOOLEAN DEFAULT 1,
      config TEXT DEFAULT '{}'
    );

    /* --- Cyber Threat Intelligence & Vulnerability Radar Entities --- */
    CREATE TABLE IF NOT EXISTS security_threat_feeds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      source_url TEXT NOT NULL,
      feed_url TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Cybersecurity News',
      reliability_score INTEGER DEFAULT 95,
      is_active BOOLEAN DEFAULT 1,
      last_synced DATETIME
    );

    CREATE TABLE IF NOT EXISTS project_threat_matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
      source_name TEXT NOT NULL,
      article_title TEXT NOT NULL,
      article_url TEXT NOT NULL,
      published_at DATETIME,
      matched_keyword TEXT NOT NULL,
      matched_package TEXT DEFAULT '',
      matched_file TEXT DEFAULT '',
      severity TEXT NOT NULL DEFAULT 'HIGH',
      summary TEXT NOT NULL DEFAULT '',
      cve_id TEXT DEFAULT '',
      impact_score INTEGER DEFAULT 75,
      status TEXT NOT NULL DEFAULT 'DETECTED',
      mitigation_guidance TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(project_id, article_url, matched_keyword)
    );
  `);
}

module.exports = {
  db,
  initDatabase
};
