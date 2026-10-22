import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert, ShieldCheck, GitPullRequest, AlertTriangle,
  CheckCircle2, XCircle, Search, MessageSquare, Terminal,
  ExternalLink, Layers, RefreshCw, Zap, ArrowUpRight,
  FileCode, CheckSquare, Sparkles, Send, Bug, Flame, FolderGit2,
  LayoutDashboard, Server, Shield, CheckCircle, ChevronRight, Activity,
  FolderOpen, PlusCircle, ArrowRight, Compass, Radio, AlertOctagon, BookOpen, Trash2
} from 'lucide-react';
import RiskRadarView from './components/RiskRadarView';
import CyberThreatRadarView from './components/CyberThreatRadarView';
import DeveloperOnboardingView from './components/DeveloperOnboardingView';
import DeadCodeRadarView from './components/DeadCodeRadarView';

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
  const [loading, setLoading] = useState(false);
  const [repositories, setRepositories] = useState([]);
  const [selectedPr, setSelectedPr] = useState(null);
  const [activeTab, setActiveTab] = useState('radar'); // 'radar', 'prs', 'sonar', 'chat'
  const [selectedRepo, setSelectedRepo] = useState(null); // Initially no project selected

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

  // Fetch project list initially so user can choose from available scanned projects
  const fetchProjectList = async () => {
    try {
      const res = await fetch(`${API_BASE}/dashboard/overview`);
      const json = await res.json();
      if (json.repositories) {
        setRepositories(json.repositories);
      }
    } catch (err) {
      console.error("Failed to fetch project list:", err);
    }
  };

  useEffect(() => {
    fetchProjectList();
  }, []);

  // Fetch overview only when a repo is selected
  const fetchData = async (repo = selectedRepo) => {
    if (!repo) {
      setData(null);
      return;
    }
    setLoading(true);
    try {
      const q = `?project_id=${encodeURIComponent(repo)}`;
      const res = await fetch(`${API_BASE}/dashboard/overview${q}`);
      const json = await res.json();
      setData(json);
      if (json.repositories) {
        setRepositories(json.repositories);
      }
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
        body: JSON.stringify({ question: q, project_id: selectedRepo })
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

  const hasRepositories = repositories && repositories.length > 0;

  // Filter items based on selected repository
  const filteredPrs = data?.recent_pull_requests || [];
  const filteredSonar = data?.sonar_projects || [];

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

          {/* Feature 1: AI Project Risk Radar (Main Enterprise Dashboard Hub) */}
          <button
            className={`nav-item ${activeTab === 'radar' ? 'active' : ''}`}
            onClick={() => setActiveTab('radar')}
          >
            <Radio size={17} color={activeTab === 'radar' ? 'var(--cyan)' : 'var(--text-muted)'} />
            <span>AI Risk Radar</span>
            <span className="nav-item-badge" style={{ color: 'var(--cyan)', borderColor: 'rgba(6,182,212,0.4)' }}>
              HUB
            </span>
          </button>

          {/* Feature 2: Cyber Threat Horizon (Zero-Day & Real-time Exploit Radar) */}
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

          {/* Feature 3: Developer Onboarding */}
          <button
            className={`nav-item ${activeTab === 'onboarding' ? 'active' : ''}`}
            onClick={() => setActiveTab('onboarding')}
          >
            <BookOpen size={17} color={activeTab === 'onboarding' ? 'var(--cyan)' : 'var(--text-muted)'} />
            <span>Developer Onboarding</span>
            <span className="nav-item-badge" style={{ color: 'var(--cyan)', borderColor: 'rgba(6,182,212,0.4)' }}>DOSSIER</span>
          </button>

          {/* Feature 4: Dead Code & Zombie Files Radar */}
          <button
            className={`nav-item ${activeTab === 'deadcode' ? 'active' : ''}`}
            onClick={() => setActiveTab('deadcode')}
          >
            <Trash2 size={17} color={activeTab === 'deadcode' ? '#10b981' : 'var(--text-muted)'} />
            <span>Dead Code Radar</span>
            <span className="nav-item-badge" style={{ color: '#34d399', background: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.3)' }}>
              CLEAN
            </span>
          </button>

          {/* Feature 5: Ask Project 360 (Unified AI Assistant) */}
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
                {repositories.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRepo(r.name)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      background: selectedRepo === r.name ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                      border: selectedRepo === r.name ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
                      color: selectedRepo === r.name ? '#a5b4fc' : 'var(--text-dim)',
                      fontWeight: selectedRepo === r.name ? 600 : 400,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <FolderGit2 size={14} color={selectedRepo === r.name ? 'var(--cyan)' : 'var(--text-dim)'} />
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
            <span className="pulse-dot" style={{ color: selectedRepo ? '#10b981' : '#f59e0b' }}></span>
            <span>{selectedRepo ? `Active: ${selectedRepo}` : 'Select a Project'}</span>
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
              {activeTab === 'radar' && 'AI Project Risk Radar & Engineering Ledger'}
              {activeTab === 'threats' && 'Cyber Threat Horizon & Zero-Day Radar'}
              {activeTab === 'onboarding' && 'Developer Onboarding Dossier & Quickstart'}
              {activeTab === 'deadcode' && 'Dead Code & Zombie Files Radar (Zero Waste Hygiene)'}
              {activeTab === 'chat' && 'Ask Project 360 (Grounded Cognitive Brain)'}
            </h2>

            {hasRepositories && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '4px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <FolderGit2 size={15} color="var(--cyan)" />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>Project:</span>
                <select
                  value={selectedRepo || ''}
                  onChange={(e) => setSelectedRepo(e.target.value || null)}
                  className="custom-select"
                  style={{ minWidth: '170px', padding: '4px 8px', fontSize: '0.8rem' }}
                >
                  <option value="" disabled>-- Select a Project --</option>
                  {repositories.map((repo) => (
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
          {/* STATE 1: When no repository has been scanned yet */}
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
          ) : !selectedRepo ? (
            /* STATE 2: Repositories exist, but no project selected yet */
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '65vh',
              textAlign: 'center',
              padding: '40px 20px'
            }}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(6, 182, 212, 0.12))',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                padding: '24px',
                borderRadius: '24px',
                marginBottom: '24px',
                boxShadow: '0 0 40px rgba(99, 102, 241, 0.2)'
              }}>
                <FolderGit2 size={48} color="var(--cyan)" />
              </div>

              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.9rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '10px' }}>
                Select a Project to Inspect
              </h2>
              <p style={{ maxWidth: '540px', color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '28px' }}>
                Please select a project from below or the sidebar to view live risk scores, quality gates, PR ledger, and cyber threat telemetry.
              </p>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '16px',
                width: '100%',
                maxWidth: '720px'
              }}>
                {repositories.map(r => (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRepo(r.name)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '12px',
                      padding: '20px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--cyan)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-subtle)';
                      e.currentTarget.style.transform = 'none';
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FolderGit2 size={18} color="var(--cyan)" />
                          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>{r.name}</span>
                        </div>
                        <span style={{
                          fontSize: '0.7rem',
                          background: 'rgba(99, 102, 241, 0.15)',
                          color: '#a5b4fc',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          border: '1px solid rgba(99, 102, 241, 0.3)'
                        }}>
                          {r.service_type || 'Service'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '14px' }}>
                        Connected codebase digital twin
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--cyan)', fontWeight: 600 }}>
                      <span>Open Project Analytics</span>
                      <ChevronRight size={15} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : !data || loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px' }}>
              <RefreshCw size={36} className="animate-spin" color="var(--cyan)" />
              <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Loading project intelligence for {selectedRepo}...</div>
            </div>
          ) : (
            <>
              {/* VIEW 1: AI PROJECT RISK RADAR (Main Enterprise Hub with Integrated Findings, PR Risk Ledger & Quality Gates) */}
              {activeTab === 'radar' && (
                <RiskRadarView
                  selectedRepo={selectedRepo}
                  onSelectRepo={setSelectedRepo}
                  pullRequests={filteredPrs}
                  sonarProjects={filteredSonar}
                  selectedPr={selectedPr}
                  onSelectPr={loadPrDetail}
                />
              )}

              {/* VIEW 2: CYBER THREAT HORIZON (Zero-Day Exploits & Live Intelligence) */}
              {activeTab === 'threats' && (
                <CyberThreatRadarView
                  selectedRepo={selectedRepo}
                  onSelectRepo={setSelectedRepo}
                />
              )}

              {/* VIEW 3: DEVELOPER ONBOARDING DOSSIER */}
              {activeTab === 'onboarding' && (
                <DeveloperOnboardingView
                  selectedRepo={selectedRepo}
                  onSwitchRepo={setSelectedRepo}
                  onOpenChat={(presetPrompt) => {
                    setActiveTab('chat');
                    if (presetPrompt) {
                      handleSendChat(presetPrompt);
                    }
                  }}
                />
              )}

              {/* VIEW 4: DEAD CODE & ZOMBIE FILES RADAR */}
              {activeTab === 'deadcode' && (
                <DeadCodeRadarView
                  selectedRepo={selectedRepo}
                  onSwitchRepo={setSelectedRepo}
                />
              )}

              {/* VIEW 5: Ask Project 360 AI Chat */}
              {activeTab === 'chat' && (
                <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 230px)' }}>
                  {/* Context Indicator */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>Active Project Context:</span>
                      <span style={{
                        background: 'rgba(56, 189, 248, 0.12)',
                        border: '1px solid rgba(56, 189, 248, 0.35)',
                        color: '#38bdf8',
                        padding: '2px 10px',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        fontWeight: 700
                      }}>
                        {selectedRepo || 'None Selected'}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                      AI responses are scoped exclusively to this project
                    </span>
                  </div>

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
                      <div className="futuristic-ai-loader" style={{ alignSelf: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div className="neural-orb-container">
                            <div className="neural-ring-outer" />
                            <div className="neural-ring-inner" />
                            <div className="neural-core" />
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.06em', color: '#38bdf8' }}>
                                COGNITIVE CORTEX PROCESSING
                              </span>
                              <span className="nav-item-badge" style={{ color: '#818cf8', borderColor: 'rgba(129, 140, 248, 0.4)', fontSize: '0.68rem', padding: '1px 6px' }}>
                                GEMINI AI
                              </span>
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                              Synthesizing live Digital Twin: <strong style={{ color: '#cbd5e1' }}>{selectedRepo || 'Repository'}</strong>
                            </div>
                          </div>
                        </div>

                        {/* Animated pipeline stages */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                          <div className="neural-pipeline-step">
                            <span className="step-indicator-dot" />
                            <span>1. Inspecting Git branch diffs, SonarQube gates & Jira links...</span>
                          </div>
                          <div className="neural-pipeline-step" style={{ opacity: 0.85 }}>
                            <span className="step-indicator-dot" style={{ background: '#a78bfa', boxShadow: '0 0 8px #a78bfa' }} />
                            <span>2. Calculating deterministic blast-radius & regression risk...</span>
                          </div>
                          <div className="neural-pipeline-step" style={{ opacity: 0.7 }}>
                            <span className="step-indicator-dot" style={{ background: '#34d399', boxShadow: '0 0 8px #34d399' }} />
                            <span>3. Generating grounded intelligence report with actionable advice...</span>
                          </div>
                        </div>
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
                    { name: 'ticket-management-system', path: 'd:/Projects/ticket-management-system', tag: 'Fullstack' },
                    { name: 'php-starter-app', path: 'd:/Projects/php-starter-app', tag: 'PHP / Native' }
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
