import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, ShieldCheck, AlertOctagon, Terminal, RefreshCw,
  ExternalLink, Globe, Cpu, Radio, Zap, Bug, FileCode, CheckCircle2,
  Clock, ArrowUpRight, Search, Filter, Sparkles, AlertTriangle
} from 'lucide-react';

const API_BASE = "http://127.0.0.1:8080/api/v1";

export default function CyberThreatRadarView({ selectedRepo }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [selectedThreat, setSelectedThreat] = useState(null);
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Scanning simulation steps
  const SCAN_STEPS = [
    { title: 'CONNECTING THREAT SATELLITE', detail: 'Handshaking with The Hacker News, CISA, and CVE Feed real-time telemetry...' },
    { title: 'EXTRACTION & FINGERPRINTING', detail: 'Mapping dependencies, frameworks (Express, React, Mongoose), and AST routes...' },
    { title: 'CVE ZERO-DAY CORRELATION', detail: 'Running heuristic deep-match for active remote exploits against project files...' },
    { title: 'SYNTHESIZING REMEDIATION', detail: 'Calculating DEFCON threat index and generating defense mitigations...' }
  ];

  const fetchThreatData = async () => {
    setLoading(true);
    try {
      const q = selectedRepo && selectedRepo !== 'all' ? `?project_id=${selectedRepo}` : '';
      const res = await fetch(`${API_BASE}/threats/overview${q}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Failed to fetch threat intel:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartScan = async () => {
    setScanning(true);
    setScanStep(0);

    // Step-by-step futuristic HUD progress
    const timer1 = setTimeout(() => setScanStep(1), 700);
    const timer2 = setTimeout(() => setScanStep(2), 1500);
    const timer3 = setTimeout(() => setScanStep(3), 2300);

    try {
      const res = await fetch(`${API_BASE}/threats/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: selectedRepo !== 'all' ? selectedRepo : null })
      });
      const result = await res.json();
      setTimeout(() => {
        setData(result);
        setScanning(false);
      }, 3000);
    } catch (err) {
      console.error('Scan error:', err);
      setScanning(false);
    }
  };

  const handleUpdateStatus = async (threatId, newStatus) => {
    try {
      await fetch(`${API_BASE}/threats/${threatId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      fetchThreatData();
      if (selectedThreat && selectedThreat.id === threatId) {
        setSelectedThreat({ ...selectedThreat, status: newStatus });
      }
    } catch (err) {
      console.error('Status update failed:', err);
    }
  };

  useEffect(() => {
    fetchThreatData();
  }, [selectedRepo]);

  if (loading && !data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px' }}>
        <RefreshCw size={36} className="spin" color="var(--cyan)" />
        <div style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>Establishing quantum link to global Cyber Threat Feeds...</div>
      </div>
    );
  }

  const filteredThreats = (data?.threats || []).filter(t => {
    const matchSev = filterSeverity === 'ALL' || t.severity === filterSeverity;
    const matchSearch = !searchQuery.trim() ||
      t.article_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.matched_package.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.cve_id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSev && matchSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Header & Live DEFCON Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #06b6d4, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Cyber Threat Radar: Zero-Day Horizon
            </h1>
            <span className={`defcon-badge ${data?.threat_index >= 75 ? 'defcon-1' : data?.threat_index >= 45 ? 'defcon-2' : 'defcon-safe'}`}>
              <Radio size={15} className="spin" />
              {data?.threat_level || 'DEFCON 1 (CRITICAL)'}
            </span>
          </div>
          <div style={{ fontSize: '0.84rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Continuous zero-day threat correlation matching live intelligence from <strong>The Hacker News</strong>, <strong>CISA</strong>, and <strong>CVE Feed</strong> against your active codebase.
          </div>
        </div>

        <button
          className="btn-primary"
          onClick={handleStartScan}
          disabled={scanning}
          style={{
            background: 'linear-gradient(135deg, #06b6d4 0%, #4f46e5 100%)',
            boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)',
            padding: '10px 22px',
            fontSize: '0.9rem'
          }}
        >
          <Zap size={17} className={scanning ? 'spin' : ''} />
          <span>{scanning ? 'SCANNING THREAT HORIZON...' : 'SCAN FOR ZERO-DAY THREATS'}</span>
        </button>
      </div>

      {/* 2. FUTURISTIC SCANNING HUD MODAL / OVERLAY */}
      {scanning && (
        <div className="cyber-scanner-container holo-grid-bg" style={{ padding: '36px 30px', margin: '6px 0', border: '1px solid rgba(6, 182, 212, 0.5)' }}>
          <div className="scanline-laser"></div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '32px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {/* Holographic Radar Disc */}
            <div className="radar-sweep-disc">
              <div className="radar-beam"></div>
              <Cpu size={36} color="var(--cyan)" style={{ position: 'relative', zIndex: 10 }} />
            </div>

            {/* Diagnostic Terminal Stream */}
            <div style={{ flex: 1, minWidth: '280px', maxWidth: '640px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--cyan)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', marginBottom: '8px' }}>
                <Terminal size={14} />
                <span>CYBER_DEFENSE_PROBE // THREAT_ENGINE_V2</span>
              </div>

              <div style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#fff', marginBottom: '4px' }}>
                {SCAN_STEPS[scanStep].title}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '16px' }}>
                {SCAN_STEPS[scanStep].detail}
              </div>

              {/* Progress Tracker */}
              <div style={{ display: 'flex', gap: '6px', height: '6px', width: '100%', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${((scanStep + 1) / 4) * 100}%`, background: 'linear-gradient(90deg, #06b6d4, #a855f7)', transition: 'width 0.4s ease' }}></div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
                <span>SOURCES: THEHACKERNEWS.COM • CISA • CVEFEED.IO</span>
                <span>MATCHING: DEPENDENCIES & AST</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Trusted Security Feeds Bar */}
      <div className="glass-panel" style={{ padding: '16px 20px', background: 'rgba(11, 17, 32, 0.7)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Globe size={16} color="var(--cyan)" />
            <span style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Connected Threat Intelligence Sources (Verified)
            </span>
          </div>
          <span style={{ fontSize: '0.74rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span className="pulse-dot"></span> LIVE SYNC ACTIVE
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
          {(data?.trusted_feeds || []).map(feed => (
            <div
              key={feed.id}
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                padding: '10px 14px',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <a
                  href={feed.source_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: '0.86rem', fontWeight: 600, color: '#38bdf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <span>{feed.name}</span>
                  <ExternalLink size={12} />
                </a>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  {feed.category}
                </div>
              </div>
              <span style={{ fontSize: '0.72rem', background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', padding: '2px 6px', borderRadius: '4px', fontFamily: 'var(--font-mono)' }}>
                {feed.reliability_score}% REL
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Filter & Search Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '260px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
            <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '10px' }} />
            <input
              type="text"
              placeholder="Search threat title, CVE-ID, or package..."
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select
            className="custom-select"
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
          >
            <option value="ALL">All Threat Severities</option>
            <option value="CRITICAL">Critical Zero-Days</option>
            <option value="HIGH">High Severity</option>
            <option value="MEDIUM">Medium Severity</option>
          </select>
        </div>
      </div>

      {/* 5. Threat Cards Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredThreats.length === 0 ? (
          <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <CheckCircle2 size={40} color="#10b981" style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>No Active Zero-Day Threat Matches</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', maxWidth: '480px', margin: '6px auto 0' }}>
              None of your inspected project dependencies or files match currently broadcasting vulnerabilities from The Hacker News or CISA advisories.
            </p>
          </div>
        ) : (
          filteredThreats.map(threat => (
            <div
              key={threat.id}
              className={`threat-card ${threat.severity.toLowerCase()}`}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '10px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span className={`badge ${threat.severity === 'CRITICAL' ? 'badge-critical' : 'badge-high'}`}>
                      {threat.severity}
                    </span>
                    <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.06)', color: 'var(--cyan)', padding: '2px 8px', borderRadius: '4px' }}>
                      {threat.cve_id}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                      Source: <strong>{threat.source_name}</strong>
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
                    {threat.article_title}
                  </h3>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <a
                    href={threat.article_url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '5px 12px' }}
                  >
                    <span>Read Advisory</span>
                    <ExternalLink size={13} />
                  </a>
                  <button
                    className="btn-primary"
                    onClick={() => setSelectedThreat(threat)}
                    style={{ fontSize: '0.78rem', padding: '5px 14px' }}
                  >
                    Investigate & Mitigate
                  </button>
                </div>
              </div>

              {/* Description & Impact */}
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '14px' }}>
                {threat.summary}
              </p>

              {/* Matched Footprint Box */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.05)', padding: '12px 16px', borderRadius: '8px', fontSize: '0.8rem' }}>
                <div>
                  <span style={{ color: 'var(--text-dim)' }}>Affected Package in Project:</span>
                  <div style={{ color: '#fb7185', fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                    {threat.matched_package}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)' }}>Detected In File:</span>
                  <div style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                    {threat.matched_file}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)' }}>Remediation Status:</span>
                  <div style={{ color: threat.status === 'RESOLVED' ? '#34d399' : '#fbbf24', fontWeight: 700, marginTop: '2px' }}>
                    {threat.status}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 6. Threat Remediation Modal */}
      {selectedThreat && (
        <div className="modal-overlay" onClick={() => setSelectedThreat(null)}>
          <div className="radar-modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span className={`badge ${selectedThreat.severity === 'CRITICAL' ? 'badge-critical' : 'badge-high'}`}>
                    {selectedThreat.severity} THREAT
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--cyan)' }}>
                    {selectedThreat.cve_id}
                  </span>
                </div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-display)' }}>
                  {selectedThreat.article_title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedThreat(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '1.2rem', cursor: 'pointer', padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Intelligence Bulletin & Threat Mechanics
              </h4>
              <p style={{ fontSize: '0.92rem', lineHeight: 1.6, color: 'var(--text-main)' }}>
                {selectedThreat.summary}
              </p>
            </div>

            <div style={{ background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.25)', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fb7185', fontWeight: 700, fontSize: '0.86rem', marginBottom: '6px' }}>
                <AlertTriangle size={16} />
                <span>Immediate Threat Vector in Your Project</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Your project references <strong>{selectedThreat.matched_package}</strong> located at <code>{selectedThreat.matched_file}</code>. If untrusted inputs enter this module without sanitization, this exploit chain can be triggered.
              </div>
            </div>

            <div style={{ background: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.25)', borderRadius: '10px', padding: '16px', marginBottom: '24px' }}>
              <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--cyan)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Recommended Cyber Defense Guidance
              </h4>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                {selectedThreat.mitigation_guidance}
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
              <a
                href={selectedThreat.article_url}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '0.82rem', color: '#38bdf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <span>Read Full Disclosure on {selectedThreat.source_name}</span>
                <ExternalLink size={13} />
              </a>

              <div style={{ display: 'flex', gap: '10px' }}>
                {selectedThreat.status !== 'RESOLVED' ? (
                  <button
                    className="btn-primary"
                    onClick={() => handleUpdateStatus(selectedThreat.id, 'RESOLVED')}
                    style={{ background: '#10b981' }}
                  >
                    <CheckCircle2 size={16} />
                    <span>Mark Threat as Mitigated</span>
                  </button>
                ) : (
                  <button
                    className="btn-secondary"
                    onClick={() => handleUpdateStatus(selectedThreat.id, 'DETECTED')}
                  >
                    Reopen Threat
                  </button>
                )}
                <button
                  className="btn-secondary"
                  onClick={() => setSelectedThreat(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
