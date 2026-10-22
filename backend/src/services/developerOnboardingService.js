const path = require('path');
const fs = require('fs');

class DeveloperOnboardingService {
  /**
   * Generates or fetches onboarding checklist tasks for a given repository
   */
  static getOnboardingChecklist(db, repoId) {
    const repo = db.prepare('SELECT * FROM repositories WHERE id = ?').get(repoId);
    if (!repo) return [];

    let tasks = db.prepare('SELECT * FROM developer_onboarding_tasks WHERE project_id = ? ORDER BY sort_order ASC, id ASC').all(repoId);

    // If no tasks exist yet, seed default standard ramp-up tasks tailored to the repo's tech stack
    if (tasks.length === 0) {
      DeveloperOnboardingService.seedDefaultTasks(db, repo);
      tasks = db.prepare('SELECT * FROM developer_onboarding_tasks WHERE project_id = ? ORDER BY sort_order ASC, id ASC').all(repoId);
    }

    return tasks;
  }

  /**
   * Seeds intelligent checklist items based on repository service type / framework
   */
  static seedDefaultTasks(db, repo) {
    const isFrontend = (repo.service_type || '').toLowerCase().includes('react') || (repo.service_type || '').toLowerCase().includes('ui');
    const isPython = (repo.service_type || '').toLowerCase().includes('python') || repo.name.startsWith('py-');

    const defaultTasks = [
      {
        task_key: 'ENV_SETUP',
        title: 'Clone Repository & Configure Local Environment',
        category: 'SETUP',
        description: `Clone ${repo.full_name || repo.name} from version control and create local configuration variables.`,
        code_snippet: `git clone ${repo.url || `https://github.com/organization/${repo.name}.git`}\ncd ${repo.name}\ncp .env.example .env`,
        file_path: '.env.example',
        status: 'PENDING',
        sort_order: 1
      },
      {
        task_key: 'INSTALL_DEPS',
        title: 'Install Project Dependencies & Lockfile Check',
        category: 'SETUP',
        description: isPython 
          ? 'Create virtual environment and install pip requirements.' 
          : 'Install exact deterministic packages using npm ci or yarn install.',
        code_snippet: isPython ? 'python -m venv venv\nsource venv/bin/activate\npip install -r requirements.txt' : 'npm install\n# or\nnpm ci',
        file_path: isPython ? 'requirements.txt' : 'package.json',
        status: 'PENDING',
        sort_order: 2
      },
      {
        task_key: 'RUN_TEST_SUITE',
        title: 'Execute Local Test Suite & Verify Green Baseline',
        category: 'QUALITY',
        description: 'Run all unit and integration test fixtures to ensure your machine matches production CI expectations.',
        code_snippet: isPython ? 'pytest -v --cov=src' : 'npm test',
        file_path: isPython ? 'tests/' : 'package.json',
        status: 'PENDING',
        sort_order: 3
      },
      {
        task_key: 'QUALITY_GATES',
        title: 'Inspect SonarQube & Security Quality Gates',
        category: 'QUALITY',
        description: 'Familiarize yourself with project quality rules (e.g., minimum 80% test coverage, 0 critical security vulnerabilities).',
        code_snippet: '# SonarQube Quality Gate Status check\ncurl -s http://localhost:9000/api/qualitygates/project_status?projectKey=' + repo.name,
        file_path: 'sonar-project.properties',
        status: 'PENDING',
        sort_order: 4
      },
      {
        task_key: 'EXPLORE_ENTRYPOINT',
        title: 'Review Core Application Entrypoint & Middleware Architecture',
        category: 'ARCHITECTURE',
        description: isFrontend
          ? 'Understand state flow, root router, navigation shell, and theme providers in main entry.'
          : 'Review routing table, database connection pool, authentication middleware, and health endpoints.',
        code_snippet: isFrontend ? '// Examine src/App.jsx or src/index.jsx' : '// Examine src/server.js or src/main.py',
        file_path: isFrontend ? 'src/App.jsx' : (isPython ? 'main.py' : 'src/server.js'),
        status: 'PENDING',
        sort_order: 5
      },
      {
        task_key: 'FIRST_PR_CONVENTION',
        title: 'Create Your First Branch & Learn PR Traceability Rules',
        category: 'WORKFLOW',
        description: 'Project 360 enforces deterministic PR Risk analysis and Jira ticket linkage. Format branches as feat/JIRA-XXX-short-title.',
        code_snippet: `git checkout -b feat/PROJ-101-rampup-welcome\n# Ensure commit messages follow Conventional Commits:\n# git commit -m "feat(core): setup local dev environment"`,
        file_path: 'CONTRIBUTING.md',
        status: 'PENDING',
        sort_order: 6
      }
    ];

    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO developer_onboarding_tasks 
      (project_id, task_key, title, category, description, code_snippet, file_path, status, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const t of defaultTasks) {
      insertStmt.run(repo.id, t.task_key, t.title, t.category, t.description, t.code_snippet, t.file_path, t.status, t.sort_order);
    }
  }

  /**
   * Updates task status (PENDING / COMPLETED)
   */
  static updateTaskStatus(db, taskId, status) {
    const isCompleted = status === 'COMPLETED';
    const completedAt = isCompleted ? new Date().toISOString() : null;
    
    db.prepare(`
      UPDATE developer_onboarding_tasks 
      SET status = ?, completed_at = ?
      WHERE id = ?
    `).run(status, completedAt, taskId);

    return db.prepare('SELECT * FROM developer_onboarding_tasks WHERE id = ?').get(taskId);
  }

  /**
   * Gathers full comprehensive Developer Onboarding dossier for a repository
   */
  static getOnboardingGuide(db, repoId) {
    const repo = db.prepare('SELECT * FROM repositories WHERE id = ?').get(repoId);
    if (!repo) return null;

    // 1. Checklist
    const tasks = DeveloperOnboardingService.getOnboardingChecklist(db, repoId);
    const completedCount = tasks.filter(t => t.status === 'COMPLETED').length;
    const progressPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

    // 2. PR Activity & Key Contributors (Code Owners)
    const prs = db.prepare('SELECT * FROM pull_requests WHERE repo_id = ? ORDER BY created_at DESC').all(repoId);
    const authorCounts = {};
    for (const pr of prs) {
      authorCounts[pr.author] = (authorCounts[pr.author] || 0) + 1;
    }
    const topContributors = Object.entries(authorCounts)
      .map(([author, count]) => ({ author, pr_count: count }))
      .sort((a, b) => b.pr_count - a.pr_count)
      .slice(0, 5);

    // 3. Sonar Quality Gate baseline
    const sonar = db.prepare('SELECT * FROM sonar_analyses WHERE repo_id = ?').get(repoId);

    // 4. Starter Issues / Linked Jira Tasks
    const jiraIssues = db.prepare(`
      SELECT DISTINCT j.* FROM jira_issues j
      JOIN pr_jira_links pjl ON pjl.jira_id = j.id
      JOIN pull_requests pr ON pr.id = pjl.pr_id
      WHERE pr.repo_id = ?
      LIMIT 6
    `).all(repoId);

    // 5. Codebase Hotspots & Sensitive Files to watch out for
    const sensitiveAreas = [
      {
        path: 'src/db/ or migrations/',
        reason: 'Database schema and persistent storage models. Requires schema migration safety checks.',
        risk: 'HIGH'
      },
      {
        path: 'src/services/ or auth/',
        reason: 'Core business logic & authentication token validation. High regression impact.',
        risk: 'CRITICAL'
      },
      {
        path: 'api/ or routes/',
        reason: 'Public external REST API contracts. Breaking changes break mobile and web clients.',
        risk: 'MEDIUM'
      }
    ];

    // 6. Architecture Blueprint & System Topology
    const isFrontend = (repo.service_type || '').toLowerCase().includes('react');
    const architecture = {
      service_type: repo.service_type || 'Web Service',
      tier: repo.tier || 'Tier 2 (Secondary)',
      default_branch: repo.default_branch || 'main',
      stack: isFrontend ? ['React 19', 'Vite', 'Lucide Icons', 'Vanilla CSS Design System'] : ['Node.js Express', 'SQLite (WAL)', 'Gemini AI API', 'REST API'],
      entrypoint: isFrontend ? 'src/App.jsx / src/main.jsx' : 'src/server.js',
      key_directories: [
        { path: 'src/', purpose: 'Main application source code containing business domains' },
        { path: isFrontend ? 'src/components/' : 'src/services/', purpose: isFrontend ? 'Reusable UI components and views' : 'Domain service layer & integration engines' },
        { path: isFrontend ? 'src/assets/' : 'src/db/', purpose: isFrontend ? 'Static icons and images' : 'SQLite schema definitions and migrations' }
      ]
    };

    return {
      repository: repo,
      progress: {
        total_tasks: tasks.length,
        completed_tasks: completedCount,
        progress_pct: progressPct
      },
      checklist: tasks,
      architecture,
      top_contributors: topContributors,
      quality_gate: sonar ? {
        status: sonar.quality_gate_status,
        coverage_pct: sonar.coverage_pct,
        bugs: sonar.bugs_count,
        vulnerabilities: sonar.vulnerabilities_count,
        code_smells: sonar.code_smells_count
      } : null,
      starter_jira_tickets: jiraIssues,
      sensitive_areas: sensitiveAreas,
      setup_quickstart: [
        { step: 1, title: 'Clone Repository', cmd: `git clone ${repo.url || `https://github.com/organization/${repo.name}.git`}` },
        { step: 2, title: 'Install Dependencies', cmd: isFrontend ? 'npm install' : 'npm install' },
        { step: 3, title: 'Start Local Server', cmd: 'npm run dev' },
        { step: 4, title: 'Run Unit Tests', cmd: 'npm test' }
      ]
    };
  }
}

module.exports = DeveloperOnboardingService;
