import React, { useState, useEffect } from 'react';
import {
  BookOpen, CheckCircle2, Circle, ArrowRight, Terminal, Copy,
  Check, ExternalLink, ShieldAlert, ShieldCheck, Flame, GitPullRequest,
  Code2, Users, Layers, Sparkles, RefreshCw, AlertTriangle, Compass,
  FolderGit2, FileText, Cpu, ChevronRight, PlayCircle
} from 'lucide-react';

const API_BASE = "http://127.0.0.1:8080/api/v1";

export default function DeveloperOnboardingView({ selectedRepo, onSwitchRepo, onOpenChat }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);

  const fetchOnboardingData = async () => {
    setLoading(true);
    try {
      const q = selectedRepo && selectedRepo !== 'all' ? `?project_id=${encodeURIComponent(selectedRepo)}` : '';
      const res = await fetch(`${API_BASE}/onboarding${q}`);
      const json = await res.json();
      if (json.status === 'success' && json.onboarding) {
        setData(json.onboarding);
        if (json.onboarding.checklist && json.onboarding.checklist.length > 0) {
          setSelectedTask(json.onboarding.checklist[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load onboarding data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOnboardingData();
  }, [selectedRepo]);

  const handleToggleTask = async (task) => {
    const nextStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    setUpdatingTaskId(task.id);
    try {
      const res = await fetch(`${API_BASE}/onboarding/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      const json = await res.json();
      if (json.status === 'success') {
        setData(prev => {
          if (!prev) return prev;
          const updatedChecklist = prev.checklist.map(t => t.id === task.id ? json.task : t);
          const completedCount = updatedChecklist.filter(t => t.status === 'COMPLETED').length;
          const progressPct = Math.round((completedCount / updatedChecklist.length) * 100);
          return {
            ...prev,
            checklist: updatedChecklist,
            progress: {
              ...prev.progress,
              completed_tasks: completedCount,
              progress_pct: progressPct
            }
          };
        });
        if (selectedTask && selectedTask.id === task.id) {
          setSelectedTask(json.task);
        }
      }
    } catch (err) {
      console.error('Failed to update task status:', err);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleResetChecklist = async () => {
    if (!data?.repository?.id) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/onboarding/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: data.repository.id })
      });
      const json = await res.json();
      if (json.status === 'success' && json.onboarding) {
        setData(json.onboarding);
        if (json.onboarding.checklist?.length > 0) {
          setSelectedTask(json.onboarding.checklist[0]);
        }
      }
    } catch (err) {
      console.error('Failed to reset checklist:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleAskProject360 = (presetQuestion) => {
    if (onOpenChat) {
      onOpenChat(presetQuestion);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px' }}>
        <RefreshCw size={32} className="spin" color="var(--cyan)" />
        <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Synthesizing Developer Onboarding Intelligence...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <BookOpen size={48} color="var(--text-dim)" style={{ marginBottom: '16px' }} />
        <h3>No Repository Onboarding Data</h3>
        <p style={{ marginTop: '8px' }}>Please scan or select a repository from the left sidebar to generate the onboarding roadmap.</p>
      </div>
    );
  }

  const { repository, progress, checklist, architecture, top_contributors, quality_gate, starter_jira_tickets, sensitive_areas, setup_quickstart } = data;

  return (
    <div className="onboarding-container" style={{ padding: '0 8px 48px 8px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. HERO HEADER BANNER */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9))',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '24px 28px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '18px', zIndex: 1 }}>
          <div style={{
            background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
            padding: '14px',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(99,102,241,0.4)'
          }}>
            <Compass size={28} color="#fff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#fff' }}>
                Developer Ramp-Up & Onboarding Copilot
              </h2>
              <span style={{
                background: 'rgba(6, 182, 212, 0.15)',
                color: 'var(--cyan)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600
              }}>
                {repository.name}
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
              Automated ramp-up checklist, architecture maps, critical code paths, and AI companion to get new engineers shipping PRs safely.
            </p>
          </div>
        </div>

        {/* Progress Metric Dial */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          background: 'rgba(0,0,0,0.3)',
          padding: '12px 20px',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.06)',
          zIndex: 1
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Ramp-Up Readiness
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: progress.progress_pct === 100 ? 'var(--success)' : 'var(--cyan)' }}>
              {progress.progress_pct}%
            </div>
          </div>
          <div style={{ width: '120px' }}>
            <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${progress.progress_pct}%`,
                background: progress.progress_pct === 100 ? 'var(--success)' : 'linear-gradient(90deg, #6366f1, #06b6d4)',
                borderRadius: '4px',
                transition: 'width 0.4s ease'
              }} />
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '4px', textAlign: 'right' }}>
              {progress.completed_tasks} of {progress.total_tasks} complete
            </div>
          </div>
          <button
            onClick={handleResetChecklist}
            title="Reset Checklist"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--text-dim)',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '0.72rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <RefreshCw size={12} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN 2-COLUMN SECTION: Checklist & Detail Inspector */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: '20px' }}>
        
        {/* Left Column: Interactive Ramp-Up Checklist */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '14px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PlayCircle size={18} color="var(--cyan)" />
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Interactive Ramp-Up Checklist</h3>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              Click tasks to view code snippets & instructions
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {checklist.map((task) => {
              const isSelected = selectedTask && selectedTask.id === task.id;
              const isCompleted = task.status === 'COMPLETED';

              return (
                <div
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: `1px solid ${isSelected ? 'var(--cyan)' : 'rgba(255,255,255,0.06)'}`,
                    background: isSelected ? 'rgba(6, 182, 212, 0.08)' : 'rgba(255,255,255,0.02)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleTask(task);
                      }}
                      disabled={updatingTaskId === task.id}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        color: isCompleted ? 'var(--success)' : 'var(--text-dim)',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      {isCompleted ? <CheckCircle2 size={20} color="var(--success)" /> : <Circle size={20} />}
                    </button>

                    <div>
                      <div style={{
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: isCompleted ? 'var(--text-muted)' : '#fff',
                        textDecoration: isCompleted ? 'line-through' : 'none'
                      }}>
                        {task.title}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                        <span style={{
                          fontSize: '0.68rem',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: 'rgba(255,255,255,0.05)',
                          color: 'var(--text-dim)',
                          fontWeight: 500
                        }}>
                          {task.category}
                        </span>
                        {task.file_path && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>
                            {task.file_path}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <ChevronRight size={16} color={isSelected ? 'var(--cyan)' : 'var(--text-dim)'} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Task Guided Walkthrough */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '14px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {selectedTask ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: 'var(--cyan)',
                    background: 'rgba(6, 182, 212, 0.12)',
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}>
                    STEP {selectedTask.sort_order}: {selectedTask.category}
                  </span>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: '6px', color: '#fff' }}>
                    {selectedTask.title}
                  </h4>
                </div>
                <button
                  onClick={() => handleToggleTask(selectedTask)}
                  style={{
                    background: selectedTask.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                    border: `1px solid ${selectedTask.status === 'COMPLETED' ? 'var(--success)' : 'var(--primary)'}`,
                    color: selectedTask.status === 'COMPLETED' ? 'var(--success)' : '#a5b4fc',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {selectedTask.status === 'COMPLETED' ? <Check size={14} /> : <PlayCircle size={14} />}
                  <span>{selectedTask.status === 'COMPLETED' ? 'Mark Incomplete' : 'Complete Step'}</span>
                </button>
              </div>

              <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {selectedTask.description}
              </div>

              {selectedTask.code_snippet && (
                <div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#070b14',
                    padding: '6px 12px',
                    borderTopLeftRadius: '8px',
                    borderTopRightRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderBottom: 'none'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Terminal size={13} color="var(--cyan)" />
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>Terminal Execution</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(selectedTask.code_snippet, 'snippet')}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: copiedIndex === 'snippet' ? 'var(--success)' : 'var(--text-dim)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.7rem'
                      }}
                    >
                      {copiedIndex === 'snippet' ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedIndex === 'snippet' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre style={{
                    background: '#0b1120',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderBottomLeftRadius: '8px',
                    borderBottomRightRadius: '8px',
                    padding: '12px',
                    fontSize: '0.8rem',
                    fontFamily: 'var(--font-mono)',
                    color: '#e2e8f0',
                    overflowX: 'auto',
                    whiteSpace: 'pre-wrap',
                    margin: 0
                  }}>
                    {selectedTask.code_snippet}
                  </pre>
                </div>
              )}

              {/* Setup Quick-Run Checklist */}
              <div style={{
                marginTop: 'auto',
                background: 'rgba(255,255,255,0.02)',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Quick Start Reference Sequence
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {setup_quickstart.map((qs) => (
                    <div key={qs.step} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.76rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{qs.step}. {qs.title}</span>
                      <code style={{ background: '#000', padding: '2px 6px', borderRadius: '4px', color: '#38bdf8', fontSize: '0.7rem' }}>
                        {qs.cmd}
                      </code>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '40px 0' }}>
              Select a task from the left to view instructions.
            </div>
          )}
        </div>
      </div>

      {/* 3. ARCHITECTURE BLUEPRINT & SYSTEM TOPOLOGY */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '14px',
        padding: '22px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Layers size={18} color="var(--primary)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Architecture Blueprint & System Topology</h3>
          </div>
          <span style={{
            fontSize: '0.75rem',
            background: 'rgba(99, 102, 241, 0.12)',
            color: '#a5b4fc',
            padding: '3px 10px',
            borderRadius: '6px',
            border: '1px solid rgba(99, 102, 241, 0.25)'
          }}>
            {architecture.service_type} • {architecture.tier}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
          
          {/* Tech Stack Cards */}
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '6px' }}>
              Technology Stack
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {architecture.stack.map((tech, idx) => (
                <span key={idx} style={{
                  background: 'rgba(6, 182, 212, 0.1)',
                  color: 'var(--cyan)',
                  border: '1px solid rgba(6, 182, 212, 0.2)',
                  padding: '3px 8px',
                  borderRadius: '5px',
                  fontSize: '0.74rem',
                  fontWeight: 500
                }}>
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* Core Entrypoint */}
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '6px' }}>
              Primary App Entrypoint
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: '#e2e8f0', background: '#000', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
              {architecture.entrypoint}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '6px' }}>
              Default Branch: <strong style={{ color: '#fff' }}>{architecture.default_branch}</strong>
            </div>
          </div>

          {/* Quality Gate Guardrail */}
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '6px' }}>
              Quality Gate Baseline
            </div>
            {quality_gate ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: quality_gate.status === 'PASSED' ? 'var(--success)' : 'var(--danger)',
                  background: quality_gate.status === 'PASSED' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
                  padding: '3px 8px',
                  borderRadius: '4px'
                }}>
                  {quality_gate.status}
                </span>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  Coverage: <strong>{quality_gate.coverage_pct}%</strong>
                </span>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  Bugs: <strong>{quality_gate.bugs}</strong>
                </span>
              </div>
            ) : (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>No Sonar metrics configured yet</div>
            )}
          </div>
        </div>

        {/* Directory Structure Blueprint */}
        <div style={{ marginTop: '6px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Domain Organization & Directory Guide
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '8px' }}>
            {architecture.key_directories.map((dir, idx) => (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: 'rgba(255,255,255,0.02)',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.04)'
              }}>
                <code style={{ color: 'var(--cyan)', fontSize: '0.76rem', fontWeight: 600 }}>{dir.path}</code>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>— {dir.purpose}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. SENSITIVE CODE HOTSPOTS & KEY PEERS (CODE OWNERS) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '20px' }}>
        
        {/* Sensitive Code Hotspots */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '14px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} color="var(--warning)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Codebase Hotspots (Be Cautious)</h3>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            High-blast-radius areas where regressions frequently trigger system risks or production incidents:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sensitive_areas.map((area, idx) => (
              <div key={idx} style={{
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.05)',
                border: '1px solid rgba(245, 158, 11, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#fbbf24', fontWeight: 600 }}>
                    {area.path}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {area.reason}
                  </div>
                </div>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: area.risk === 'CRITICAL' ? 'var(--danger)' : 'var(--warning)',
                  background: 'rgba(0,0,0,0.3)',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}>
                  {area.risk}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Code Owners / Frequent Reviewers */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '14px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} color="var(--cyan)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Key Peers & Code Reviewers</h3>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            Subject matter experts who have authored and reviewed PRs in this repository:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {top_contributors.length > 0 ? (
              top_contributors.map((c, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: '#fff'
                    }}>
                      {c.author.slice(0, 1).toUpperCase()}
                    </div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 500, color: '#e2e8f0' }}>{c.author}</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--cyan)', background: 'rgba(6, 182, 212, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                    {c.pr_count} PRs authored
                  </span>
                </div>
              ))
            ) : (
              <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)' }}>No recent PR authors recorded.</div>
            )}
          </div>
        </div>
      </div>

      {/* 5. ONBOARDING AI ASSISTANT LAUNCHER */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(19, 28, 51, 0.95))',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        borderRadius: '16px',
        padding: '24px 28px',
        boxShadow: '0 8px 30px rgba(99, 102, 241, 0.15)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px'
      }}>
        <div style={{ maxWidth: '640px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Sparkles size={20} color="var(--cyan)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
              Have questions about {repository.name}?
            </h3>
            <span style={{ fontSize: '0.72rem', background: 'rgba(6, 182, 212, 0.15)', color: 'var(--cyan)', padding: '2px 8px', borderRadius: '4px' }}>
              Gemini Powered
            </span>
          </div>

          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '14px' }}>
            Ask anything about architecture, dependencies, running test suites, or recent PR risks. Our unified Project 360 AI is grounded with live repository context.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {[
              `How do I run tests for ${repository.name}?`,
              `What are the critical risks in open PRs right now?`,
              `How is database access and state managed in this repo?`
            ].map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleAskProject360(prompt)}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#c7d2fe',
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '0.74rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {prompt} →
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => handleAskProject360(`How do I start contributing to ${repository.name}?`)}
          style={{
            background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
            border: 'none',
            borderRadius: '10px',
            color: '#fff',
            padding: '12px 24px',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 0 20px rgba(99, 102, 241, 0.35)',
            whiteSpace: 'nowrap'
          }}
        >
          <Sparkles size={16} />
          <span>Ask Project 360 AI</span>
          <ArrowRight size={16} />
        </button>
      </div>

    </div>
  );
}
