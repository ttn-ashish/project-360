import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert, ShieldCheck, GitPullRequest, AlertTriangle,
  CheckCircle2, XCircle, Search, MessageSquare, Terminal,
  ExternalLink, Layers, RefreshCw, Zap, ArrowUpRight,
  FileCode, CheckSquare, Sparkles, Send, Bug, Flame, FolderGit2,
  LayoutDashboard, Server, Shield, CheckCircle, ChevronRight, Activity,
  FolderOpen, PlusCircle, ArrowRight, Compass, Radio, AlertOctagon
} from 'lucide-react';
import RiskRadarView from './components/RiskRadarView';
import CyberThreatRadarView from './components/CyberThreatRadarView';

const API_BASE = "http://127.0.0.1:8080/api/v1";

// Helper to render clean structured markdown text
function FormattedChatText({ text }) {
  if (!text) return null;
  const lines = text.split('\n').filter(l => l.trim().length > 0);

  return (
    <div className="chat-answer">
      {lines.map((line, idx) => {
        const formatted = line.split(/(\*\*.*?\*\*)/g).map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={pIdx}>{part.slice(2, -2)}</strong>;
          }
          return part;
        });

        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
          return (
            <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--cyan)', marginTop: '4px' }}>•</span>
              <span style={{ flex: 1 }}>{formatted}</span>
            </div>
          );
        } else if (/^\d+\.\s/.test(line.trim())) {
          return (
            <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'flex-start' }}>
              <span style={{ color: '#a5b4fc', fontWeight: 700, minWidth: '18px' }}>{line.trim().match(/^\d+\./)[0]}</span>
              <span style={{ flex: 1 }}>{formatted}</span>
            </div>
          );
        }
        return <p key={idx} style={{ marginBottom: '8px' }}>{formatted}</p>;
      })}
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPr, setSelectedPr] = useState(null);
  const [activeTab, setActiveTab] = useState('radar'); // 'radar', 'prs', 'sonar', 'chat'
  const [selectedRepo, setSelectedRepo] = useState('all');

  // Scan Codebase Modal / Setup state
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanPath, setScanPath] = useState('d:/Projects/ticket-management-system');
  const [scanLoading, setScanLoading] = useState(false);
  const [scanFeedback, setScanFeedback] = useState(null);

  // Chat state
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState([
    {
      sender: 'bot',
      headline: 'PROJECT 360 AI ENGINE READY',
      answer: "I am connected to your live Git repositories, Jira board, and SonarQube instances. Ask me anything like: 'Can we release today?' or 'What are the risks for PR #4521?'",
      evidence: [],
      actions: []
    }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (activeTab === 'chat') {
      scrollToBottom();
    }
  }, [chatHistory, chatLoading, activeTab]);

  // Fetch overview
  const fetchData = async (repo = selectedRepo) => {
    setLoading(true);
    try {
      const q = repo && repo !== 'all' ? `?project_id=${encodeURIComponent(repo)}` : '';
      const res = await fetch(`${API_BASE}/dashboard/overview${q}`);
      const json = await res.json();
      setData(json);
      if (json.recent_pull_requests && json.recent_pull_requests.length > 0) {
        loadPrDetail(json.recent_pull_requests[0].id);
      } else {
        setSelectedPr(null);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadPrDetail = async (prId) => {
    try {
      const res = await fetch(`${API_BASE}/prs/${prId}`);
      const json = await res.json();
      setSelectedPr(json);
    } catch (err) {
      console.error("Failed to load PR detail:", err);
    }
  };

  const handleSendChat = async (questionText) => {
    const q = questionText || chatQuestion;
    if (!q.trim()) return;

    setChatHistory(prev => [...prev, { sender: 'user', text: q }]);
    setChatQuestion('');
    setChatLoading(true);

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q })
      });
      const responseJson = await res.json();
      setChatHistory(prev => [...prev, {
        sender: 'bot',
        headline: responseJson.headline,
        confidence: responseJson.confidence,
        answer: responseJson.answer,
        evidence: responseJson.evidence || [],
        actions: responseJson.recommended_actions || []
      }]);
    } catch (err) {
      setChatHistory(prev => [...prev, {
        sender: 'bot',
        headline: 'CONNECTION ERROR',
        answer: 'Failed to contact Project 360 Backend API. Ensure backend is running on http://127.0.0.1:8080.',
        evidence: [],
        actions: []
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleRunScan = async (pathToScan) => {
    const target = pathToScan || scanPath;
    if (!target.trim()) return;

    setScanLoading(true);
    setScanFeedback(null);
    try {
      const res = await fetch(`${API_BASE}/scan/local`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: target.trim() })
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.detail || "Scan failed");
      }

      await fetchData();
      if (json.repo_name) {
        setSelectedRepo(json.repo_name);
      }
      setScanModalOpen(false);
      setScanFeedback(null);
      setActiveTab('prs');
    } catch (err) {
      setScanFeedback({ type: 'error', msg: err.message });
    } finally {
      setScanLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedRepo);
  }, [selectedRepo]);

  const hasRepositories = data && data.repositories && data.repositories.length > 0;

  // Filter items based on selected repository
  const filteredPrs = data?.recent_pull_requests?.filter(
    pr => selectedRepo === 'all' || pr.repository.toLowerCase() === selectedRepo.toLowerCase()
  ) || [];

  const filteredSonar = data?.sonar_projects?.filter(
    s => selectedRepo === 'all' || s.project_key.toLowerCase() === selectedRepo.toLowerCase()
  ) || [];

  return (
    <div className="app-shell">
      {/* 1. LEFT SIDEBAR */}
      <aside className="app-sidebar">
        {/* Brand Header */}
        <div className="sidebar-header">
          <div style={{
            background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
            padding: '8px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px rgba(99,102,241,0.5)'
          }}>
            <Zap size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              PROJECT <span style={{ color: 'var(--cyan)' }}>360</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '3px' }}>
              Project Intelligence
            </div>
          </div>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="sidebar-nav">
          <div className="nav-section-title">Core Features</div>

          {/* Feature 0A: Cyber Threat Horizon (Zero-Day & Real-time Exploit Radar) */}
          <button
            className={`nav-item ${activeTab === 'threats' ? 'active' : ''}`}
            onClick={() => setActiveTab('threats')}
          >
            <AlertOctagon size={17} color={activeTab === 'threats' ? '#f43f5e' : 'var(--text-muted)'} />
            <span>Cyber Threat Horizon</span>
            <span className="nav-item-badge" style={{ color: '#fb7185', background: 'rgba(244,63,94,0.15)', borderColor: 'rgba(244,63,94,0.3)' }}>
              ZERO-DAY
            </span>
          </button>

          {/* Feature 0B: AI Project Risk Radar (Main Enterprise Dashboard) */}
          <button
            className={`nav-item ${activeTab === 'radar' ? 'active' : ''}`}
            onClick={() => setActiveTab('radar')}
          >
            <Radio size={17} color={activeTab === 'radar' ? 'var(--cyan)' : 'var(--text-muted)'} />
            <span>AI Risk Radar</span>
            <span className="nav-item-badge" style={{ color: 'var(--cyan)', borderColor: 'rgba(6,182,212,0.4)' }}>
              LIVE
            </span>
          </button>

          {/* Feature 1: PR Risk Radar */}
          <button
            className={`nav-item ${activeTab === 'prs' ? 'active' : ''}`}
            onClick={() => setActiveTab('prs')}
          >
            <GitPullRequest size={17} color={activeTab === 'prs' ? 'var(--cyan)' : 'var(--text-muted)'} />
            <span>PR Risk Ledger</span>
            {hasRepositories && <span className="nav-item-badge">{filteredPrs.length}</span>}
          </button>

          {/* Feature 2: SonarQube Quality Gates */}
          <button
            className={`nav-item ${activeTab === 'sonar' ? 'active' : ''}`}
            onClick={() => setActiveTab('sonar')}
          >
            <Shield size={17} color={activeTab === 'sonar' ? 'var(--primary)' : 'var(--text-muted)'} />
            <span>Quality Gates</span>
            {hasRepositories && <span className="nav-item-badge">{filteredSonar.length}</span>}
          </button>

          {/* Feature 3: Ask Project 360 */}
          <button
            className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            <MessageSquare size={17} color={activeTab === 'chat' ? '#38bdf8' : 'var(--text-muted)'} />
            <span>Ask Project 360</span>
            <span className="nav-item-badge" style={{ color: '#38bdf8' }}>AI</span>
          </button>

          <div className="nav-section-title" style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Active Repositories</span>
            <button
              onClick={() => setScanModalOpen(true)}
              style={{ background: 'none', border: 'none', color: 'var(--cyan)', cursor: 'pointer', padding: 0 }}
              title="Add Repository"
            >
              <PlusCircle size={14} />
            </button>
          </div>

          <div style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {!hasRepositories ? (
              <div style={{ padding: '12px 10px', fontSize: '0.78rem', color: 'var(--text-dim)', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                No repositories scanned yet. Select a codebase to start.
              </div>
            ) : (
              <>
                <div
                  onClick={() => setSelectedRepo('all')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    background: selectedRepo === 'all' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                    color: selectedRepo === 'all' ? '#fff' : 'var(--text-muted)',
                    fontWeight: selectedRepo === 'all' ? 600 : 400
                  }}
                >
                  <Activity size={14} color="var(--cyan)" />
                  <span>All Repositories</span>
                </div>

                {data?.repositories?.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRepo(r.name)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      background: selectedRepo === r.name ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                      color: selectedRepo === r.name ? '#a5b4fc' : 'var(--text-dim)',
                      fontWeight: selectedRepo === r.name ? 600 : 400
                    }}
                  >
                    <FolderGit2 size={13} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.name}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <span className="pulse-dot" style={{ color: hasRepositories ? '#10b981' : '#f59e0b' }}></span>
            <span>{hasRepositories ? 'Digital Twin Active' : 'Awaiting Codebase Scan'}</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            GitHub ⇄ Jira ⇄ SonarQube
          </div>
        </div>
      </aside>

      {/* 2. MAIN APPLICATION CONTENT */}
      <div className="app-main-content">
        {/* Top Navbar */}
        <header className="top-navbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
              {activeTab === 'prs' && 'PR Risk Radar & Jira Traceability'}
              {activeTab === 'sonar' && 'SonarQube Code Quality & Security'}
              {activeTab === 'chat' && 'Ask Project 360 (Grounded Cognitive Brain)'}
            </h2>

            {hasRepositories && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '4px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <FolderGit2 size={15} color="var(--cyan)" />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>Scope:</span>
                <select
                  value={selectedRepo}
                  onChange={(e) => setSelectedRepo(e.target.value)}
                  className="custom-select"
                  style={{ minWidth: '170px', padding: '4px 8px', fontSize: '0.8rem' }}
                >
                  <option value="all">⚡ All Projects ({data?.repositories?.length})</option>
                  {data?.repositories?.map((repo) => (
                    <option key={repo.id} value={repo.name}>
                      {repo.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button className="btn-primary" onClick={() => setScanModalOpen(true)}>
              <FolderOpen size={15} />
              <span>{hasRepositories ? 'Scan Another Repo' : 'Select & Scan Codebase'}</span>
            </button>
            {hasRepositories && (
              <button className="btn-secondary" onClick={fetchData}>
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                <span>Sync</span>
              </button>
            )}
          </div>
        </header>

        {/* Content Body */}
        <main className="app-content-body">
          {/* INITIAL STATE: When no repository has been scanned yet */}
          {!hasRepositories ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '70vh',
              textAlign: 'center',
              padding: '40px 20px'
            }}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(6, 182, 212, 0.15))',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                padding: '24px',
                borderRadius: '24px',
                marginBottom: '28px',
                boxShadow: '0 0 50px rgba(99, 102, 241, 0.25)'
              }}>
                <Compass size={56} color="var(--cyan)" />
              </div>

              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '12px' }}>
                Welcome to Project <span style={{ color: 'var(--cyan)' }}>360</span>
              </h1>
              <p style={{ maxWidth: '620px', color: 'var(--text-muted)', fontSize: '1rem', lineHeight: '1.6', marginBottom: '32px' }}>
                A continuously updated digital twin of your software project that connects code, people, requirements, quality, incidents, and releases to identify risks and predict customer impact.
              </p>

              {/* Action Box */}
              <div className="glass-panel" style={{ width: '100%', maxWidth: '580px', padding: '30px', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <FolderGit2 size={20} color="var(--primary)" />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Select Local Codebase or Git Repository</h3>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '18px' }}>
                  Provide the local folder path on your computer. Project 360 will inspect the Git commit history, detect frameworks, discover API routes, and initialize your project's digital twin.
                </p>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                  <input
                    type="text"
                    value={scanPath}
                    onChange={(e) => setScanPath(e.target.value)}
                    placeholder="e.g. d:/Projects/ticket-management-system"
                    style={{
                      flex: 1,
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      color: 'var(--text-main)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  />
                  <button
                    className="btn-primary"
                    onClick={() => handleRunScan()}
                    disabled={scanLoading}
                    style={{ padding: '0 24px' }}
                  >
                    {scanLoading ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Scanning...</span>
                      </>
                    ) : (
                      <>
                        <Zap size={16} />
                        <span>Start Scan</span>
                      </>
                    )}
                  </button>
                </div>

                {scanFeedback && (
                  <div style={{
                    background: scanFeedback.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
                    border: `1px solid ${scanFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
                    color: scanFeedback.type === 'success' ? '#34d399' : '#fb7185',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    marginBottom: '16px'
                  }}>
                    {scanFeedback.msg}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Suggested local path:</span>
                  <button
                    onClick={() => setScanPath('d:/Projects/ticket-management-system')}
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid var(--border-subtle)',
                      color: '#a5b4fc',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '0.78rem',
                      fontFamily: 'var(--font-mono)',
                      cursor: 'pointer'
                    }}
                  >
                    d:/Projects/ticket-management-system
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Executive Metrics Overview Bar */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {/* Health Score */}
                <div className="glass-panel" style={{ padding: '18px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>Project Health</span>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: data.overall_health_score > 70 ? 'var(--success)' : (data.overall_health_score > 50 ? 'var(--warning)' : 'var(--danger)') }}>
                          {data.overall_health_score}
                        </span>
                        <span style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>/ 100</span>
                      </div>
                    </div>
                    <div style={{ background: data.overall_health_score > 70 ? 'var(--success-bg)' : 'var(--warning-bg)', padding: '8px', borderRadius: '10px' }}>
                      <ShieldAlert size={20} color={data.overall_health_score > 70 ? 'var(--success)' : 'var(--warning)'} />
                    </div>
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Deterministic score based on Quality Gates, Test Coverage & Jira.
                  </div>
                </div>

                {/* Release Risk Radar */}
                <div className="glass-panel" style={{ padding: '18px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>Release Risk Radar</span>
                      <div style={{ marginTop: '6px' }}>
                        <span className={`badge badge-${data.overall_release_risk.toLowerCase()}`}>
                          <span className="pulse-dot"></span>
                          {data.overall_release_risk} RISK ({data.risk_score}/100)
                        </span>
                      </div>
                    </div>
                    <div style={{ background: 'rgba(244, 63, 94, 0.12)', padding: '8px', borderRadius: '10px' }}>
                      <Flame size={20} color="var(--danger)" />
                    </div>
                  </div>
                  <div style={{ marginTop: '12px', display: 'flex', gap: '14px', fontSize: '0.78rem' }}>
                    <div>
                      <strong style={{ color: 'var(--danger)' }}>{data.metrics.high_risk_pull_requests}</strong> <span style={{ color: 'var(--text-dim)' }}>High-Risk PRs</span>
                    </div>
                    <div>
                      <strong style={{ color: 'var(--warning)' }}>{data.metrics.failed_quality_gates}</strong> <span style={{ color: 'var(--text-dim)' }}>Gate Violations</span>
                    </div>
                  </div>
                </div>

                {/* Codebase Quality Gates */}
                <div className="glass-panel" style={{ padding: '18px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>Quality & Coverage</span>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', fontWeight: 700 }}>
                          {data.metrics.average_test_coverage_pct}%
                        </span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Avg Coverage</span>
                      </div>
                    </div>
                    <div style={{ background: 'rgba(6, 182, 212, 0.12)', padding: '8px', borderRadius: '10px' }}>
                      <Bug size={20} color="var(--cyan)" />
                    </div>
                  </div>
                  <div style={{ marginTop: '12px', display: 'flex', gap: '12px', fontSize: '0.78rem' }}>
                    <span style={{ color: 'var(--danger)' }}>{data.metrics.total_vulnerabilities} Vulnerabilities</span>
                    <span>•</span>
                    <span style={{ color: 'var(--warning)' }}>{data.metrics.total_bugs} Bugs</span>
                  </div>
                </div>
              </div>

              {/* VIEW 0A: CYBER THREAT HORIZON (Zero-Day Exploits & Live Intelligence) */}
              {activeTab === 'threats' && (
                <CyberThreatRadarView
                  selectedRepo={selectedRepo}
                />
              )}

              {/* VIEW 0B: AI PROJECT RISK RADAR (Premier Enterprise Feature) */}
              {activeTab === 'radar' && (
                <RiskRadarView
                  selectedRepo={selectedRepo}
                  onSelectRepo={setSelectedRepo}
                />
              )}

              {/* VIEW 1: PRs & Risk Ledger */}
              {activeTab === 'prs' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.3fr', gap: '22px' }}>
                  {/* PR Table / List */}
                  <div className="glass-panel" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <GitPullRequest size={17} color="var(--primary)" />
                        <span>Evaluated Pull Requests</span>
                      </h3>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        Showing {filteredPrs.length} PRs
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {filteredPrs.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                          No pull requests found for {selectedRepo}.
                        </div>
                      ) : (
                        filteredPrs.map((pr) => {
                          const isSelected = selectedPr && selectedPr.pr_number === pr.pr_number;
                          return (
                            <div
                              key={pr.id}
                              onClick={() => loadPrDetail(pr.id)}
                              style={{
                                background: isSelected ? 'var(--bg-surface-elevated)' : 'rgba(255, 255, 255, 0.02)',
                                border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                                padding: '16px',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--cyan)', fontWeight: 600 }}>
                                    PR #{pr.pr_number}
                                  </span>
                                  <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>on {pr.repository}</span>
                                </div>
                                <span className={`badge badge-${pr.risk_level.toLowerCase()}`}>
                                  {pr.risk_level} RISK
                                </span>
                              </div>

                              <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-main)' }}>
                                {pr.title}
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                  <span>Linked Jira:</span>
                                  {pr.linked_jira_keys.length > 0 ? (
                                    pr.linked_jira_keys.map(k => (
                                      <span key={k} style={{
                                        background: 'rgba(99, 102, 241, 0.15)',
                                        color: '#a5b4fc',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        fontFamily: 'var(--font-mono)',
                                        fontWeight: 600
                                      }}>
                                        {k}
                                      </span>
                                    ))
                                  ) : (
                                    <span style={{ color: 'var(--danger)' }}>None (Orphaned)</span>
                                  )}
                                </div>
                                <div>
                                  +{pr.additions} / -{pr.deletions} lines
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Granular PR Detail & Auditable Evidence */}
                  <div className="glass-panel" style={{ padding: '22px' }}>
                    {selectedPr ? (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px', marginBottom: '20px' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', color: 'var(--cyan)', fontWeight: 700 }}>
                                PR #{selectedPr.pr_number}
                              </span>
                              <span className={`badge badge-${selectedPr.assessment.risk_level.toLowerCase()}`}>
                                {selectedPr.assessment.risk_level} RISK ({selectedPr.assessment.risk_score}/100)
                              </span>
                            </div>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{selectedPr.title}</h2>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                              Repository: <strong>{selectedPr.repository}</strong> • Author: {selectedPr.author}
                            </div>
                          </div>
                        </div>

                        {/* Executive Verdict Box */}
                        <div style={{
                          background: selectedPr.assessment.risk_level === 'CRITICAL' ? 'rgba(244, 63, 94, 0.08)' : 'rgba(99, 102, 241, 0.08)',
                          borderLeft: `4px solid ${selectedPr.assessment.risk_level === 'CRITICAL' ? 'var(--danger)' : 'var(--primary)'}`,
                          padding: '14px 16px',
                          borderRadius: '6px',
                          marginBottom: '20px'
                        }}>
                          <div style={{ fontWeight: 700, fontSize: '0.82rem', textTransform: 'uppercase', color: selectedPr.assessment.risk_level === 'CRITICAL' ? 'var(--danger)' : 'var(--primary)', marginBottom: '4px' }}>
                            Executive Risk Verdict
                          </div>
                          <div style={{ fontSize: '0.85rem', lineHeight: '1.5', color: 'var(--text-main)' }}>
                            {selectedPr.assessment.executive_summary}
                          </div>
                        </div>

                        {/* Auditable Evidence Ledger */}
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '12px' }}>
                          Traceable Evidence & Citations
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '22px' }}>
                          {selectedPr.assessment.evidence.map((ev, idx) => (
                            <div
                              key={idx}
                              style={{
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '8px',
                                padding: '12px 14px'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--cyan)' }}>
                                  [{ev.category}]
                                </span>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                                  Source: {ev.source}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>
                                {ev.detail}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Recommended Actions */}
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '12px' }}>
                          Required Remediation Before Merge
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {selectedPr.assessment.recommended_actions.map((act, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.85rem' }}>
                              <CheckSquare size={16} color="var(--primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
                              <span>{act}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-dim)' }}>
                        Select a Pull Request to view its causal risk decomposition.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* VIEW 2: SonarQube Quality Gates */}
              {activeTab === 'sonar' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                  {filteredSonar.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', color: 'var(--text-dim)' }}>
                      No SonarQube analyses found for {selectedRepo}.
                    </div>
                  ) : (
                    filteredSonar.map((s, idx) => (
                      <div key={idx} className="glass-panel" style={{ padding: '22px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                          <h3 style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{s.project_key}</h3>
                          <span className={`badge ${s.gate_status === 'PASSED' ? 'badge-low' : 'badge-critical'}`}>
                            {s.gate_status}
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Test Coverage</div>
                            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: s.coverage_pct >= 80 ? 'var(--success)' : 'var(--warning)' }}>
                              {s.coverage_pct}%
                            </div>
                            <div style={{ fontSize: '0.75rem', color: s.coverage_delta_pct < 0 ? 'var(--danger)' : 'var(--success)' }}>
                              {s.coverage_delta_pct > 0 ? `+${s.coverage_delta_pct}%` : `${s.coverage_delta_pct}%`} vs main
                            </div>
                          </div>

                          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Security Hotspots</div>
                            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: s.vulnerabilities > 0 ? 'var(--danger)' : 'var(--text-main)' }}>
                              {s.vulnerabilities}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                              {s.bugs} bugs detected
                            </div>
                          </div>
                        </div>

                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Code Smells: <strong>{s.code_smells}</strong>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* VIEW 3: Ask Project 360 AI Chat */}
              {activeTab === 'chat' && (
                <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 230px)' }}>
                  {/* Preset Prompts */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', alignSelf: 'center', marginRight: '4px' }}>Quick Prompts:</span>
                    {[
                      "Can we release today?",
                      "What are the risks for PR #4521?",
                      "What can go wrong?",
                      "Which Jira requirements are affected?"
                    ].map((p, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendChat(p)}
                        style={{
                          background: 'rgba(99, 102, 241, 0.1)',
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                          color: '#c7d2fe',
                          borderRadius: '20px',
                          padding: '4px 12px',
                          fontSize: '0.78rem',
                          cursor: 'pointer'
                        }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  {/* Chat Message Stream */}
                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '6px' }}>
                    {chatHistory.map((msg, idx) => (
                      <div
                        key={idx}
                        style={{
                          alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                          maxWidth: '85%',
                          background: msg.sender === 'user' ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : 'rgba(255, 255, 255, 0.04)',
                          border: msg.sender === 'user' ? 'none' : '1px solid var(--border-subtle)',
                          borderRadius: '12px',
                          padding: '16px'
                        }}
                      >
                        {msg.sender === 'user' ? (
                          <div style={{ fontSize: '0.92rem', color: '#fff' }}>{msg.text}</div>
                        ) : (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontWeight: 800, fontSize: '0.82rem', letterSpacing: '0.04em', color: msg.headline.includes('NO-GO') || msg.headline.includes('Blocked') ? 'var(--danger)' : 'var(--cyan)' }}>
                                {msg.headline}
                              </span>
                              {msg.confidence && (
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                                  Confidence: {(msg.confidence * 100).toFixed(0)}%
                                </span>
                              )}
                            </div>

                            <div style={{ marginBottom: '14px' }}>
                              <FormattedChatText text={msg.answer} />
                            </div>

                            {/* Evidence Tags */}
                            {msg.evidence && msg.evidence.length > 0 && (
                              <div style={{ marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                                <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700, marginBottom: '6px' }}>
                                  Verified Evidence:
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {msg.evidence.map((ev, eIdx) => (
                                    <div key={eIdx} style={{ fontSize: '0.78rem', background: 'rgba(0,0,0,0.25)', padding: '6px 10px', borderRadius: '6px' }}>
                                      <span style={{ color: 'var(--cyan)', fontWeight: 600 }}>[{ev.type}]</span> {ev.claim}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Action Items */}
                            {msg.actions && msg.actions.length > 0 && (
                              <div style={{ marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                                <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--warning)', fontWeight: 700, marginBottom: '6px' }}>
                                  Required Actions:
                                </div>
                                <ul style={{ paddingLeft: '18px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                  {msg.actions.map((act, aIdx) => (
                                    <li key={aIdx}>{act}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {chatLoading && (
                      <div style={{ alignSelf: 'flex-start', color: 'var(--text-dim)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sparkles size={16} className="animate-spin" />
                        <span>Consulting Project Brain (Git + Jira + SonarQube)...</span>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Chat Input Bar */}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                    <input
                      type="text"
                      placeholder="Ask anything about release readiness, PR risks, or Jira acceptance criteria..."
                      value={chatQuestion}
                      onChange={(e) => setChatQuestion(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                      style={{
                        flex: 1,
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        color: 'var(--text-main)',
                        fontSize: '0.9rem',
                        outline: 'none'
                      }}
                    />
                    <button className="btn-primary" onClick={() => handleSendChat()}>
                      <Send size={16} />
                      <span>Ask</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Codebase Scan Modal (used when adding another repo) */}
      {scanModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(5, 8, 16, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            background: 'var(--bg-surface)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '540px',
            padding: '28px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FolderOpen size={20} color="var(--cyan)" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Scan Local Codebase</h3>
              </div>
              <button
                onClick={() => { setScanModalOpen(false); setScanFeedback(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '18px' }}>
              Enter a local repository path on your machine. Project 360 will inspect Git commits, framework patterns, test coverage, and API routes to update its Digital Twin.
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '6px' }}>
                LOCAL PROJECT DIRECTORY PATH
              </label>
              <input
                type="text"
                value={scanPath}
                onChange={(e) => setScanPath(e.target.value)}
                placeholder="e.g. d:/Projects/ticket-management-system"
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: 'var(--text-main)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
              <div style={{ marginTop: '10px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '6px' }}>
                  Quick select available projects:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {[
                    { name: 'payment-gateway-service', path: 'd:/Projects/payment-gateway-service', tag: 'FinTech / Express' },
                    { name: 'auth-identity-service', path: 'd:/Projects/auth-identity-service', tag: 'IAM / OAuth2' },
                    { name: 'cloud-inventory-api', path: 'd:/Projects/cloud-inventory-api', tag: 'Cloud / AWS' },
                    { name: 'ticket-management-system', path: 'd:/Projects/ticket-management-system', tag: 'Fullstack' }
                  ].map(proj => (
                    <button
                      key={proj.name}
                      type="button"
                      onClick={() => setScanPath(proj.path)}
                      style={{
                        background: scanPath === proj.path ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                        border: `1px solid ${scanPath === proj.path ? 'var(--indigo)' : 'var(--border-subtle)'}`,
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '0.75rem',
                        color: scanPath === proj.path ? '#818cf8' : 'var(--text-dim)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s'
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{proj.name}</span>
                      <span style={{ fontSize: '0.68rem', opacity: 0.65 }}>({proj.tag})</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {scanFeedback && (
              <div style={{
                background: scanFeedback.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
                border: `1px solid ${scanFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
                color: scanFeedback.type === 'success' ? '#34d399' : '#fb7185',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                marginBottom: '18px'
              }}>
                {scanFeedback.msg}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                className="btn-secondary"
                onClick={() => { setScanModalOpen(false); setScanFeedback(null); }}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={() => handleRunScan()}
                disabled={scanLoading}
              >
                {scanLoading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Scanning Codebase...</span>
                  </>
                ) : (
                  <>
                    <Zap size={14} />
                    <span>Start Analysis & Ingest</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
