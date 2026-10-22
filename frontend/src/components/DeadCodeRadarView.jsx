import React, { useState, useEffect } from 'react';
import {
  Trash2, RefreshCw, AlertTriangle, CheckCircle2, ShieldCheck,
  FileCode, Sparkles, Copy, Check, Terminal, ExternalLink,
  Flame, Filter, ArrowRight, Zap, FolderGit2, Info, Eye
} from 'lucide-react';

const API_BASE = "http://127.0.0.1:8080/api/v1";

export default function DeadCodeRadarView({ selectedRepo, onSwitchRepo }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [filterType, setFilterType] = useState('ALL');
  const [copiedScript, setCopiedScript] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const fetchDeadCodeReport = async () => {
    setLoading(true);
    try {
      const q = selectedRepo ? `?project_id=${encodeURIComponent(selectedRepo)}` : '';
      const res = await fetch(`${API_BASE}/dead-code${q}`);
      const json = await res.json();
      if (json.status === 'success' && json.report) {
        setData(json.report);
      }
    } catch (err) {
      console.error('Failed to load dead code report:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerScan = async () => {
    setScanning(true);
    try {
      const res = await fetch(`${API_BASE}/dead-code/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: selectedRepo })
      });
      const json = await res.json();
      if (json.status === 'success' && json.report) {
        setData(json.report);
      }
    } catch (err) {
      console.error('Dead code scan failed:', err);
    } finally {
      setScanning(false);
    }
  };

  const handleUpdateStatus = async (findingId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/dead-code/${findingId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const json = await res.json();
      if (json.status === 'success') {
        setData(prev => {
          if (!prev) return prev;
          const updated = prev.findings.map(f => f.id === findingId ? { ...f, status: newStatus } : f);
          return { ...prev, findings: updated };
        });
      }
    } catch (err) {
      console.error('Status update failed:', err);
    }
  };

  useEffect(() => {
    fetchDeadCodeReport();
  }, [selectedRepo]);

  const copyScript = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2200);
  };

  if (loading && !data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px' }}>
        <RefreshCw size={36} className="animate-spin" color="var(--cyan)" />
        <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Analyzing AST call graphs & dormant files for {selectedRepo}...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <Trash2 size={48} color="var(--text-dim)" style={{ marginBottom: '16px' }} />
        <h3>No Codebase Selected</h3>
        <p style={{ marginTop: '8px' }}>Please select a repository to run dead code & zombie file detection.</p>
      </div>
    );
  }

  const { metrics, findings, cleanup_script, repository } = data;

  const filteredFindings = findings.filter(f => {
    if (filterType === 'ALL') return true;
    return f.item_type === filterType;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      
      {/* 1. Header Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #10b981, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Dead Code & Zombie Files Radar
            </h1>
            <span className="badge badge-low" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              HYGIENE: {metrics.hygiene_score}/100
            </span>
          </div>
          <div style={{ fontSize: '0.84rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Identifies dormant zombie files, unreferenced orphan modules, and dead API surface area across <strong>{repository.name}</strong>.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            className="btn-primary"
            onClick={handleTriggerScan}
            disabled={scanning}
            style={{
              background: 'linear-gradient(135deg, #059669, #0284c7)',
              boxShadow: '0 0 16px rgba(16, 185, 129, 0.3)'
            }}
          >
            <RefreshCw size={15} className={scanning ? 'animate-spin' : ''} />
            <span>{scanning ? 'Scanning AST & Git History...' : 'Re-Run Dead Code Scan'}</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {/* Total Dead Items */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Dead Items Detected</span>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, marginTop: '4px', color: metrics.total_dead_items > 0 ? '#fb7185' : 'var(--success)' }}>
                {metrics.total_dead_items}
              </div>
            </div>
            <div style={{ background: 'rgba(244, 63, 94, 0.12)', padding: '10px', borderRadius: '10px' }}>
              <Trash2 size={22} color="#fb7185" />
            </div>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            {metrics.zombie_files_count} Zombies • {metrics.orphan_modules_count} Orphans • {metrics.dead_endpoints_count} Routes
          </div>
        </div>

        {/* Wasted Lines */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Wasted Lines of Code</span>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, marginTop: '4px', color: '#f59e0b' }}>
                {metrics.total_wasted_lines.toLocaleString()}
              </div>
            </div>
            <div style={{ background: 'rgba(245, 158, 11, 0.12)', padding: '10px', borderRadius: '10px' }}>
              <FileCode size={22} color="#f59e0b" />
            </div>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            ~{metrics.total_wasted_kb} KB dead maintenance overhead
          </div>
        </div>

        {/* Codebase Hygiene Score */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Code Hygiene Score</span>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, marginTop: '4px', color: 'var(--cyan)' }}>
                {metrics.hygiene_score}<span style={{ fontSize: '1rem', color: 'var(--text-dim)' }}>/100</span>
              </div>
            </div>
            <div style={{ background: 'rgba(6, 182, 212, 0.12)', padding: '10px', borderRadius: '10px' }}>
              <ShieldCheck size={22} color="var(--cyan)" />
            </div>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            Deterministic score based on AST call references
          </div>
        </div>

        {/* Est. Cleanup Time */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Pruning Effort</span>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, marginTop: '4px', color: '#a5b4fc' }}>
                ~{metrics.estimated_cleanup_time_mins} <span style={{ fontSize: '1rem', color: 'var(--text-dim)' }}>mins</span>
              </div>
            </div>
            <div style={{ background: 'rgba(99, 102, 241, 0.12)', padding: '10px', borderRadius: '10px' }}>
              <Zap size={22} color="#a5b4fc" />
            </div>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            1-click safe cleanup script generated
          </div>
        </div>
      </div>

      {/* 3. 1-Click Clean-Up Script Bar */}
      <div className="glass-panel" style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(20, 30, 55, 0.9))',
        border: '1px solid rgba(16, 185, 129, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '8px', borderRadius: '8px' }}>
            <Terminal size={18} color="#34d399" />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>
              Automated Git Pruning Script
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
              Clean {metrics.total_dead_items} dead files safely in your terminal ({metrics.total_wasted_lines} lines cut)
            </div>
          </div>
        </div>

        <button
          onClick={() => copyScript(cleanup_script)}
          style={{
            background: copiedScript ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.06)',
            border: `1px solid ${copiedScript ? '#34d399' : 'var(--border-subtle)'}`,
            color: copiedScript ? '#34d399' : '#fff',
            padding: '7px 16px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 600,
            transition: 'all 0.15s ease'
          }}
        >
          {copiedScript ? <Check size={14} /> : <Copy size={14} />}
          <span>{copiedScript ? 'Copied to Clipboard!' : 'Copy Git Cleanup Commands'}</span>
        </button>
      </div>

      {/* 4. Filter Bar */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginRight: '6px' }}>Filter By Type:</span>
        {[
          { key: 'ALL', label: `All (${findings.length})` },
          { key: 'ZOMBIE_FILE', label: `Zombie Files (${metrics.zombie_files_count})` },
          { key: 'ORPHAN_MODULE', label: `Orphan Modules (${metrics.orphan_modules_count})` },
          { key: 'DEAD_ENDPOINT', label: `Dead Routes (${metrics.dead_endpoints_count})` }
        ].map(btn => (
          <button
            key={btn.key}
            onClick={() => setFilterType(btn.key)}
            style={{
              background: filterType === btn.key ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.03)',
              border: `1px solid ${filterType === btn.key ? '#34d399' : 'var(--border-subtle)'}`,
              color: filterType === btn.key ? '#34d399' : 'var(--text-dim)',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.78rem',
              fontWeight: filterType === btn.key ? 700 : 400,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* 5. Findings Table */}
      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '14px 18px', color: 'var(--text-dim)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase' }}>Type</th>
                <th style={{ padding: '14px 18px', color: 'var(--text-dim)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase' }}>File Path</th>
                <th style={{ padding: '14px 18px', color: 'var(--text-dim)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase' }}>Waste (Lines)</th>
                <th style={{ padding: '14px 18px', color: 'var(--text-dim)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase' }}>Inactivity</th>
                <th style={{ padding: '14px 18px', color: 'var(--text-dim)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase' }}>Confidence</th>
                <th style={{ padding: '14px 18px', color: 'var(--text-dim)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '14px 18px', color: 'var(--text-dim)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFindings.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
                    No dead code findings match your filter.
                  </td>
                </tr>
              ) : (
                filteredFindings.map((item) => (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      background: item.status === 'CLEANED' ? 'rgba(16, 185, 129, 0.04)' : 'transparent',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    {/* Item Type Badge */}
                    <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: item.item_type === 'ZOMBIE_FILE' ? 'rgba(244, 63, 94, 0.15)' : (item.item_type === 'ORPHAN_MODULE' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(99, 102, 241, 0.15)'),
                        color: item.item_type === 'ZOMBIE_FILE' ? '#fb7185' : (item.item_type === 'ORPHAN_MODULE' ? '#fbbf24' : '#a5b4fc'),
                        border: `1px solid ${item.item_type === 'ZOMBIE_FILE' ? 'rgba(244, 63, 94, 0.3)' : (item.item_type === 'ORPHAN_MODULE' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(99, 102, 241, 0.3)')}`
                      }}>
                        {item.item_type.replace('_', ' ')}
                      </span>
                    </td>

                    {/* File Path & Reason */}
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#fff', fontSize: '0.85rem' }}>
                        {item.file_path}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '3px', lineHeight: 1.4 }}>
                        {item.reason}
                      </div>
                    </td>

                    {/* Wasted Lines */}
                    <td style={{ padding: '14px 18px', whiteSpace: 'nowrap', fontWeight: 700, color: '#f59e0b' }}>
                      +{item.waste_lines} lines
                    </td>

                    {/* Inactivity */}
                    <td style={{ padding: '14px 18px', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                      {item.days_inactive > 0 ? `${item.days_inactive} days ago` : 'Static scan'}
                    </td>

                    {/* Confidence */}
                    <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                      <span className={`badge ${item.confidence === 'HIGH' ? 'badge-low' : 'badge-medium'}`}>
                        {item.confidence} CONFIDENCE
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: item.status === 'CLEANED' ? '#34d399' : (item.status === 'IGNORED' ? 'var(--text-dim)' : '#fb7185')
                      }}>
                        {item.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 18px', whiteSpace: 'nowrap', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => setSelectedItem(item)}
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--cyan)',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            fontSize: '0.75rem'
                          }}
                          title="View Evidence Snippet"
                        >
                          <Eye size={13} />
                        </button>
                        {item.status === 'OPEN' ? (
                          <button
                            onClick={() => handleUpdateStatus(item.id, 'CLEANED')}
                            style={{
                              background: 'rgba(16, 185, 129, 0.15)',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              color: '#34d399',
                              borderRadius: '6px',
                              padding: '4px 10px',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: 600
                            }}
                          >
                            Mark Pruned
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateStatus(item.id, 'OPEN')}
                            style={{
                              background: 'rgba(255, 255, 255, 0.04)',
                              border: '1px solid var(--border-subtle)',
                              color: 'var(--text-dim)',
                              borderRadius: '6px',
                              padding: '4px 10px',
                              cursor: 'pointer',
                              fontSize: '0.75rem'
                            }}
                          >
                            Reopen
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Code Snippet Modal */}
      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="radar-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileCode size={18} color="var(--cyan)" />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  {selectedItem.file_path}
                </h3>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '1.1rem' }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              {selectedItem.reason}
            </div>

            <div style={{ background: '#070b14', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '14px', marginBottom: '18px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Code Excerpt
              </div>
              <pre style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: '#c7d2fe', overflowX: 'auto', whiteSpace: 'pre-wrap', margin: 0 }}>
                {selectedItem.snippet || '// No snippet preview available.'}
              </pre>
            </div>

            <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: '8px', padding: '12px 14px', marginBottom: '18px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--cyan)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                Recommended Clean-up Command:
              </div>
              <code style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: '#fff' }}>
                {selectedItem.remediation_command || `git rm ${selectedItem.file_path}`}
              </code>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                className="btn-secondary"
                onClick={() => setSelectedItem(null)}
              >
                Close
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  handleUpdateStatus(selectedItem.id, 'CLEANED');
                  setSelectedItem(null);
                }}
              >
                Mark as Pruned
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
