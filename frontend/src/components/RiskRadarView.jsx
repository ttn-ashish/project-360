import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, ShieldCheck, AlertTriangle, CheckCircle2, XCircle,
  RefreshCw, TrendingUp, Sparkles, Filter, ChevronRight, Info,
  ExternalLink, Layers, ArrowUpRight, ArrowDownRight, Clock,
  FileText, CheckSquare, Search, Award, Activity, GitPullRequest, Shield, Bug
} from 'lucide-react';

const API_BASE = "http://127.0.0.1:8080/api/v1";

export default function RiskRadarView({
  selectedRepo,
  onSelectRepo,
  pullRequests = [],
  sonarProjects = [],
  selectedPr = null,
  onSelectPr = () => {}
}) {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('overview'); // 'overview', 'findings', 'prs', 'sonar', 'actions', 'trends'

  // Category filter from cards
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Findings pagination
  const [findingsData, setFindingsData] = useState({ items: [], total: 0, page: 1, total_pages: 1 });
  const [findingsLoading, setFindingsLoading] = useState(false);

  // Detail Modal
  const [selectedFindingId, setSelectedFindingId] = useState(null);
  const [findingDetail, setFindingDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // AI Summary
  const [aiSummary, setAiSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Fetch Overview
  const fetchOverview = async () => {
    setLoading(true);
    try {
      const q = selectedRepo && selectedRepo !== 'all' ? `?project_id=${selectedRepo}` : '';
      const res = await fetch(`${API_BASE}/radar/overview${q}`);
      const json = await res.json();
      setOverview(json);
    } catch (err) {
      console.error('Failed to load risk radar overview:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Findings
  const fetchFindings = async (page = 1) => {
    setFindingsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
        category: selectedCategory,
        severity: selectedSeverity,
        search: searchQuery
      });
      if (selectedRepo && selectedRepo !== 'all') {
        params.append('project_id', selectedRepo);
      }
      const res = await fetch(`${API_BASE}/radar/findings?${params.toString()}`);
      const json = await res.json();
      setFindingsData(json);
    } catch (err) {
      console.error('Failed to load findings:', err);
    } finally {
      setFindingsLoading(false);
    }
  };

  // Trigger Analysis
  const handleTriggerAnalysis = async () => {
    setAnalyzing(true);
    try {
      await fetch(`${API_BASE}/radar/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: selectedRepo !== 'all' ? selectedRepo : null })
      });
      await fetchOverview();
      await fetchFindings(1);
    } catch (err) {
      console.error('Analysis trigger failed:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  // Load Finding Detail
  const handleOpenDetail = async (findingId) => {
    setSelectedFindingId(findingId);
    setDetailLoading(true);
    try {
      const res = await fetch(`${API_BASE}/radar/findings/${findingId}`);
      const json = await res.json();
      setFindingDetail(json);
    } catch (err) {
      console.error('Failed to load finding detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  // Update Finding Status
  const handleUpdateStatus = async (findingId, newStatus) => {
    try {
      await fetch(`${API_BASE}/radar/findings/${findingId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (findingDetail && findingDetail.id === findingId) {
        setFindingDetail({ ...findingDetail, status: newStatus });
      }
      fetchOverview();
      fetchFindings(findingsData.page);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Fetch Dynamic AI Executive Summary
  const handleGenerateSummary = async () => {
    setSummaryLoading(true);
    try {
      const q = selectedRepo && selectedRepo !== 'all' ? `?project_id=${selectedRepo}` : '';
      const res = await fetch(`${API_BASE}/radar/summary${q}`);
      const json = await res.json();
      setAiSummary(json);
    } catch (err) {
      console.error('Failed to generate summary:', err);
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [selectedRepo]);

  useEffect(() => {
    fetchFindings(1);
  }, [selectedCategory, selectedSeverity, searchQuery, selectedRepo]);

  if (loading && !overview) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px' }}>
        <RefreshCw size={36} className="spin" color="var(--cyan)" />
        <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Analyzing project digital twin & risk radar telemetry...</div>
      </div>
    );
  }

  const getSeverityBadgeClass = (severity) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL': return 'badge-critical';
      case 'HIGH': return 'badge-high';
      case 'MEDIUM': return 'badge-medium';
      case 'LOW': return 'badge-low';
      default: return 'badge-low';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Header Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
              AI Project Risk Radar
            </h1>
            <span className={`badge ${overview?.overall_risk_score >= 70 ? 'badge-critical' : overview?.overall_risk_score >= 45 ? 'badge-high' : 'badge-low'}`}>
              <span className="pulse-dot"></span>
              {overview?.overall_risk_level || 'LOW'} RISK
            </span>
            <span className={`badge ${overview?.release_readiness === 'READY' ? 'badge-low' : overview?.release_readiness === 'BLOCKED' ? 'badge-critical' : 'badge-medium'}`}>
              RELEASE {overview?.release_readiness || 'READY'}
            </span>
          </div>
          <div style={{ fontSize: '0.84rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Continuous multi-dimensional engineering evaluation: code quality, test coverage, vulnerabilities, Jira alignment, and blast radius.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            className="btn-secondary"
            onClick={handleGenerateSummary}
            disabled={summaryLoading}
            title="Generate AI Executive Briefing"
          >
            <Sparkles size={16} color="#38bdf8" />
            <span>{summaryLoading ? 'Synthesizing...' : 'AI Executive Summary'}</span>
          </button>
          <button
            className="btn-primary"
            onClick={handleTriggerAnalysis}
            disabled={analyzing}
          >
            <RefreshCw size={16} className={analyzing ? 'spin' : ''} />
            <span>{analyzing ? 'Evaluating...' : 'Re-Run Risk Assessment'}</span>
          </button>
        </div>
      </div>

      {/* Sub Navigation Bar */}
      <div className="sub-tabs-bar">
        <button
          className={`sub-tab-btn ${activeSubTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('overview')}
        >
          <Activity size={16} />
          <span>Health Overview & Cards</span>
        </button>
        <button
          className={`sub-tab-btn ${activeSubTab === 'findings' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('findings')}
        >
          <ShieldAlert size={16} />
          <span>Risk Findings Table ({overview?.total_findings || 0})</span>
        </button>
        <button
          className={`sub-tab-btn ${activeSubTab === 'prs' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('prs')}
        >
          <GitPullRequest size={16} />
          <span>PR Risk Ledger ({pullRequests.length})</span>
        </button>
        <button
          className={`sub-tab-btn ${activeSubTab === 'sonar' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('sonar')}
        >
          <Shield size={16} />
          <span>Quality Gates ({sonarProjects.length})</span>
        </button>
        <button
          className={`sub-tab-btn ${activeSubTab === 'actions' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('actions')}
        >
          <CheckSquare size={16} />
          <span>Recommended Next Actions ({overview?.recommendations?.length || 0})</span>
        </button>
        <button
          className={`sub-tab-btn ${activeSubTab === 'trends' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('trends')}
        >
          <TrendingUp size={16} />
          <span>Risk Trend & History</span>
        </button>
      </div>

      {/* Dynamic AI Executive Summary Panel */}
      {(aiSummary || summaryLoading) && (
        <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid #38bdf8', background: 'rgba(14, 21, 38, 0.9)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={20} color="#38bdf8" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#38bdf8' }}>AI Executive Risk Synthesis</h3>
              <span style={{ fontSize: '0.72rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '2px 8px', borderRadius: '4px' }}>
                {aiSummary?.is_llm_generated ? 'Grounded Gemini 3.5' : 'Deterministic Grounded'}
              </span>
            </div>
            <button
              onClick={() => setAiSummary(null)}
              style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>

          {summaryLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              <RefreshCw size={16} className="spin" />
              Correlating evidence across git commits, coverage delta, sonar issues, and Jira criteria...
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '0.94rem', lineHeight: 1.6, color: 'var(--text-main)', marginBottom: '14px' }}>
                {aiSummary.executive_summary}
              </p>

              {aiSummary.key_drivers && aiSummary.key_drivers.length > 0 && (
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '6px' }}>
                    Key Evidence Drivers:
                  </div>
                  <ul style={{ paddingLeft: '20px', fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {aiSummary.key_drivers.map((d, i) => <li key={i}>{d}</li>)}
                  </ul>
                </div>
              )}

              {aiSummary.recommended_next_steps && (
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '6px' }}>
                    Immediate Next Steps:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {aiSummary.recommended_next_steps.map((step, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.86rem', color: '#a5b4fc' }}>
                        <span style={{ fontWeight: 700 }}>{idx + 1}.</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. TAB 1: OVERVIEW & CATEGORY CARDS */}
      {activeSubTab === 'overview' && (
        <>
          {/* Top Hero Stat Cards */}
          <div className="radar-hero-grid">
            {/* Health Score */}
            <div className="glass-panel radar-stat-card" style={{ '--accent-glow': 'rgba(16, 185, 129, 0.2)' }}>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Project Health
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
                  <span style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: overview.overall_health_score >= 70 ? '#34d399' : overview.overall_health_score >= 45 ? '#fbbf24' : '#fb7185' }}>
                    {overview.overall_health_score}
                  </span>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>/ 100</span>
                </div>
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', marginTop: '8px' }}>
                Higher is better. Computed from quality & coverage.
              </div>
              <div className="score-progress-bar">
                <div
                  className="score-progress-fill"
                  style={{
                    width: `${overview.overall_health_score}%`,
                    background: overview.overall_health_score >= 70 ? '#10b981' : overview.overall_health_score >= 45 ? '#f59e0b' : '#f43f5e'
                  }}
                />
              </div>
            </div>

            {/* Risk Score */}
            <div className="glass-panel radar-stat-card" style={{ '--accent-glow': 'rgba(244, 63, 94, 0.2)' }}>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Overall Risk Score
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
                  <span style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: overview.overall_risk_score >= 70 ? '#fb7185' : overview.overall_risk_score >= 45 ? '#fbbf24' : '#34d399' }}>
                    {overview.overall_risk_score}
                  </span>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>/ 100</span>
                </div>
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', marginTop: '8px' }}>
                Higher means greater release & delivery risk.
              </div>
              <div className="score-progress-bar">
                <div
                  className="score-progress-fill"
                  style={{
                    width: `${overview.overall_risk_score}%`,
                    background: overview.overall_risk_score >= 70 ? '#f43f5e' : overview.overall_risk_score >= 45 ? '#f59e0b' : '#10b981'
                  }}
                />
              </div>
            </div>

            {/* Critical Risks */}
            <div className="glass-panel radar-stat-card">
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Open Critical Risks
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: overview.open_critical_risks > 0 ? '#fb7185' : '#34d399', marginTop: '6px' }}>
                  {overview.open_critical_risks}
                </div>
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', marginTop: '8px' }}>
                Active release blockers requiring immediate resolution.
              </div>
            </div>

            {/* Release Readiness */}
            <div className="glass-panel radar-stat-card">
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Release Readiness
                </div>
                <div style={{ fontSize: '1.45rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: overview.release_readiness === 'READY' ? '#34d399' : overview.release_readiness === 'BLOCKED' ? '#fb7185' : '#fbbf24', marginTop: '10px' }}>
                  {overview.release_readiness}
                </div>
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', marginTop: '8px' }}>
                Deterministic gating policy verification.
              </div>
            </div>
          </div>

          {/* Section: 8 Risk Categories Cards */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                  Evaluated Risk Dimensions (8 Categories)
                </h2>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                  Click any card to isolate and inspect its contributing findings in the findings table.
                </div>
              </div>
              {selectedCategory !== 'ALL' && (
                <button
                  className="btn-secondary"
                  onClick={() => setSelectedCategory('ALL')}
                  style={{ fontSize: '0.76rem', padding: '4px 10px' }}
                >
                  Clear Filter ({selectedCategory})
                </button>
              )}
            </div>

            <div className="category-cards-grid">
              {overview.category_cards.map(card => {
                const isSelected = selectedCategory === card.category;
                return (
                  <div
                    key={card.category}
                    className={`category-card ${isSelected ? 'active-filter' : ''}`}
                    onClick={() => {
                      setSelectedCategory(isSelected ? 'ALL' : card.category);
                      setActiveSubTab('findings');
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)' }}>
                          {card.title}
                        </span>
                        <span className={`badge ${getSeverityBadgeClass(card.severity)}`}>
                          {card.severity}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: card.score >= 70 ? '#fb7185' : card.score >= 45 ? '#fbbf24' : '#34d399' }}>
                          {card.score}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>risk / 100</span>
                      </div>

                      <div className="score-progress-bar" style={{ marginBottom: '12px' }}>
                        <div
                          className="score-progress-fill"
                          style={{
                            width: `${card.score}%`,
                            background: card.score >= 70 ? '#f43f5e' : card.score >= 45 ? '#f59e0b' : '#10b981'
                          }}
                        />
                      </div>

                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.45, minHeight: '36px' }}>
                        {card.explanation}
                      </p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.76rem', color: 'var(--cyan)' }}>
                      <span>{card.findings_count} Contributing Finding{card.findings_count === 1 ? '' : 's'}</span>
                      <ChevronRight size={14} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* 3. TAB 2: RISK FINDINGS TABLE */}
      {activeSubTab === 'findings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Table Filters Bar */}
          <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '260px' }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
                <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '10px' }} />
                <input
                  type="text"
                  placeholder="Search findings, components, or IDs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'rgba(0,0,0,0.25)',
                    color: '#fff',
                    fontSize: '0.85rem'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* Category Dropdown */}
              <select
                className="custom-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="ALL">All Categories</option>
                <option value="CODE_QUALITY">Code Quality</option>
                <option value="TEST_COVERAGE">Test Coverage</option>
                <option value="DEPENDENCY">Dependency</option>
                <option value="SECURITY">Security</option>
                <option value="ARCHITECTURE">Architecture</option>
                <option value="DELIVERY">Delivery</option>
                <option value="RELEASE">Release</option>
                <option value="CUSTOMER_IMPACT">Customer Impact</option>
              </select>

              {/* Severity Dropdown */}
              <select
                className="custom-select"
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>

          {/* Findings Table */}
          <div className="findings-table-container">
            {findingsLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <RefreshCw size={24} className="spin" style={{ marginBottom: '8px' }} />
                <div>Loading grounded risk findings...</div>
              </div>
            ) : findingsData.items.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <CheckCircle2 size={32} color="#10b981" style={{ marginBottom: '8px' }} />
                <div style={{ fontSize: '1rem', fontWeight: 600 }}>No risk findings match active filters</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                  All signals in this category meet production health thresholds.
                </div>
              </div>
            ) : (
              <table className="findings-table">
                <thead>
                  <tr>
                    <th>Severity</th>
                    <th>Risk Title & Problem</th>
                    <th>Category</th>
                    <th>Risk Score</th>
                    <th>Component</th>
                    <th>Source System</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {findingsData.items.map(finding => (
                    <tr key={finding.id} onClick={() => handleOpenDetail(finding.id)}>
                      <td>
                        <span className={`badge ${getSeverityBadgeClass(finding.severity)}`}>
                          {finding.severity}
                        </span>
                      </td>
                      <td style={{ maxWidth: '320px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.88rem', marginBottom: '2px' }}>
                          {finding.title}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {finding.description}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.78rem', background: 'rgba(255,255,255,0.06)', padding: '2px 7px', borderRadius: '4px', color: '#c7d2fe' }}>
                          {finding.category.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: finding.risk_score >= 70 ? '#fb7185' : '#fbbf24' }}>
                          {finding.risk_score}/100
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--cyan)' }}>
                        {finding.affected_component}
                      </td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {finding.source_system}
                      </td>
                      <td>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: finding.status === 'RESOLVED' ? '#34d399' : '#f59e0b',
                          background: finding.status === 'RESOLVED' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                          padding: '3px 8px',
                          borderRadius: '4px'
                        }}>
                          {finding.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn-secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetail(finding.id);
                          }}
                          style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                        >
                          View Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* 4. TAB 3: RECOMMENDED ACTIONS */}
      {activeSubTab === 'actions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
              Prioritized Remediation Roadmap
            </h2>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
              Advisory next steps ordered by urgency to safely reduce project delivery risk.
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {overview.recommendations.map((rec, idx) => (
              <div
                key={rec.id || idx}
                className="glass-panel"
                style={{
                  padding: '20px 24px',
                  borderLeft: `4px solid ${rec.urgency === 'CRITICAL' ? '#f43f5e' : rec.urgency === 'HIGH' ? '#f59e0b' : '#38bdf8'}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '20px',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ flex: 1, minWidth: '280px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#a5b4fc', fontFamily: 'var(--font-mono)' }}>
                      #{idx + 1}
                    </span>
                    <h3 style={{ fontSize: '1.02rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {rec.title}
                    </h3>
                    <span className={`badge ${getSeverityBadgeClass(rec.urgency)}`}>
                      {rec.urgency}
                    </span>
                    <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px', color: 'var(--text-dim)' }}>
                      {rec.action_type}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '10px' }}>
                    {rec.reason}
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', fontSize: '0.8rem', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
                    <div>
                      <strong style={{ color: 'var(--text-dim)' }}>Expected Benefit:</strong>
                      <div style={{ color: '#34d399', marginTop: '2px' }}>{rec.expected_benefit}</div>
                    </div>
                    <div>
                      <strong style={{ color: 'var(--text-dim)' }}>Suggested Owner:</strong>
                      <div style={{ color: 'var(--text-main)', marginTop: '2px' }}>{rec.suggested_owner}</div>
                    </div>
                    <div>
                      <strong style={{ color: 'var(--text-dim)' }}>Verification Criteria:</strong>
                      <div style={{ color: '#c7d2fe', marginTop: '2px' }}>{rec.verification_criteria}</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '140px' }}>
                  <button
                    className="btn-primary"
                    onClick={() => {
                      if (rec.related_finding_keys && rec.related_finding_keys.length > 0) {
                        setSearchQuery(rec.related_finding_keys[0]);
                        setActiveSubTab('findings');
                      }
                    }}
                    style={{ fontSize: '0.78rem', justifyContent: 'center' }}
                  >
                    View Evidence
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. TAB 4: RISK TREND */}
      {activeSubTab === 'trends' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                Historical Risk & Health Progression
              </h2>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                Persistent assessment points demonstrating project trajectory over time.
              </div>
            </div>
          </div>

          {/* Simple Clean Responsive SVG Trend Visualization */}
          <div style={{ height: '220px', width: '100%', position: 'relative', marginTop: '20px', marginBottom: '24px' }}>
            <svg style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              <defs>
                <linearGradient id="riskGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="healthGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Reference Lines */}
              <line x1="0" y1="20" x2="100%" y2="20" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
              <line x1="0" y1="100" x2="100%" y2="100" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
              <line x1="0" y1="180" x2="100%" y2="180" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />

              {/* Points for Risk */}
              {overview.trends.map((t, idx) => {
                const total = overview.trends.length;
                const x = `${(idx / (total - 1)) * 96 + 2}%`;
                const yRisk = 200 - (t.risk_score * 1.8);
                const yHealth = 200 - (t.health_score * 1.8);
                return (
                  <g key={idx}>
                    <circle cx={x} cy={yRisk} r="5" fill="#f43f5e" stroke="#fff" strokeWidth="1.5" />
                    <circle cx={x} cy={yHealth} r="5" fill="#10b981" stroke="#fff" strokeWidth="1.5" />
                    <text x={x} y="215" fill="var(--text-dim)" fontSize="10" textAnchor="middle">{t.date.slice(5)}</text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', fontSize: '0.82rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f43f5e' }}></span>
              <span style={{ color: 'var(--text-muted)' }}>Project Risk Score (0-100)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }}></span>
              <span style={{ color: 'var(--text-muted)' }}>Health Score (0-100)</span>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW: PULL REQUEST RISK LEDGER */}
      {activeSubTab === 'prs' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.3fr', gap: '22px' }}>
          {/* PR Table / List */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GitPullRequest size={17} color="var(--primary)" />
                <span>Evaluated Pull Requests</span>
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                Showing {pullRequests.length} PRs
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pullRequests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                  No pull requests found for {selectedRepo}.
                </div>
              ) : (
                pullRequests.map((pr) => {
                  const isSelected = selectedPr && selectedPr.pr_number === pr.pr_number;
                  return (
                    <div
                      key={pr.id}
                      onClick={() => onSelectPr(pr.id)}
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
                          {pr.linked_jira_keys && pr.linked_jira_keys.length > 0 ? (
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

      {/* SUB-VIEW: SONARQUBE QUALITY GATES */}
      {activeSubTab === 'sonar' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {sonarProjects.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', color: 'var(--text-dim)' }}>
              No SonarQube analyses found for {selectedRepo}.
            </div>
          ) : (
            sonarProjects.map((s, idx) => (
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

      {/* 6. RISK FINDING DETAIL MODAL */}
      {selectedFindingId && (
        <div className="modal-overlay" onClick={() => setSelectedFindingId(null)}>
          <div className="radar-modal-content" onClick={(e) => e.stopPropagation()}>
            {detailLoading || !findingDetail ? (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <RefreshCw size={28} className="spin" />
                <div style={{ marginTop: '12px' }}>Loading grounded risk evidence...</div>
              </div>
            ) : (
              <div>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px', marginBottom: '20px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span className={`badge ${getSeverityBadgeClass(findingDetail.severity)}`}>
                        {findingDetail.severity}
                      </span>
                      <span style={{ fontSize: '0.78rem', background: 'rgba(255,255,255,0.06)', color: 'var(--cyan)', padding: '2px 8px', borderRadius: '4px' }}>
                        {findingDetail.category}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                        Source: {findingDetail.source_system} ({findingDetail.source_record_id})
                      </span>
                    </div>
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-display)' }}>
                      {findingDetail.title}
                    </h2>
                  </div>
                  <button
                    onClick={() => setSelectedFindingId(null)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '1.2rem', cursor: 'pointer', padding: '4px 8px' }}
                  >
                    ✕
                  </button>
                </div>

                {/* Problem Statement & Description */}
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Problem Statement & Significance
                  </h4>
                  <p style={{ fontSize: '0.92rem', lineHeight: 1.6, color: 'var(--text-main)' }}>
                    {findingDetail.description}
                  </p>
                </div>

                {/* Grounding Evidence Breakdown */}
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Verified Grounding Evidence
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {findingDetail.evidence && findingDetail.evidence.length > 0 ? (
                      findingDetail.evidence.map(ev => (
                        <div key={ev.id} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', padding: '12px 16px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '0.88rem', color: 'var(--text-main)', fontWeight: 600 }}>{ev.claim}</div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', marginTop: '2px' }}>Type: {ev.type} | Ref: {ev.source}</div>
                          </div>
                          <span className="badge badge-low" style={{ fontSize: '0.68rem' }}>VERIFIED</span>
                        </div>
                      ))
                    ) : (
                      <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Direct telemetry metric grounded.</div>
                    )}
                  </div>
                </div>

                {/* Calculation Breakdown */}
                {findingDetail.calculation_breakdown && (
                  <div style={{ marginBottom: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '14px 18px' }}>
                    <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Deterministic Calculation Breakdown
                    </h4>
                    <pre style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: '#c7d2fe', overflowX: 'auto' }}>
                      {JSON.stringify(findingDetail.calculation_breakdown, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Mitigations & Verification Steps */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ background: 'rgba(6, 182, 212, 0.05)', border: '1px solid rgba(6, 182, 212, 0.2)', padding: '14px', borderRadius: '8px' }}>
                    <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--cyan)', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Recommended Mitigation Steps
                    </h4>
                    <ul style={{ paddingLeft: '18px', fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      {(findingDetail.mitigation_steps || []).map((step, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>{step}</li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '14px', borderRadius: '8px' }}>
                    <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Verification Criteria
                    </h4>
                    <ul style={{ paddingLeft: '18px', fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      {(findingDetail.verification_steps || []).map((step, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>{step}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Modal Footer & Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                    Current Status: <strong style={{ color: findingDetail.status === 'RESOLVED' ? '#34d399' : '#fbbf24' }}>{findingDetail.status}</strong>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {findingDetail.status !== 'RESOLVED' ? (
                      <button
                        className="btn-primary"
                        onClick={() => handleUpdateStatus(findingDetail.id, 'RESOLVED')}
                        style={{ background: '#10b981' }}
                      >
                        <CheckCircle2 size={16} />
                        <span>Mark as Resolved</span>
                      </button>
                    ) : (
                      <button
                        className="btn-secondary"
                        onClick={() => handleUpdateStatus(findingDetail.id, 'OPEN')}
                      >
                        Reopen Finding
                      </button>
                    )}
                    <button
                      className="btn-secondary"
                      onClick={() => setSelectedFindingId(null)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
