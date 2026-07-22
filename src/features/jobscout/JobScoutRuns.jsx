import React, { useState, useEffect, useRef } from 'react';
import { fetchJobScoutRuns, deleteJobScoutRun, rescoreJobScoutRun, startJobScout } from '../../services/api';
import { JobScoutResults } from './JobScoutResults';
import { FuturisticModal } from '../../components/FuturisticModal';

// Futuristic Action Dropdown Component
function ActionDropdown({ run, onViewResults, onRescore, onRescan, onDelete }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={menuRef} style={{ position: 'relative', display: 'inline-block' }} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          padding: '7px 14px',
          borderRadius: '10px',
          border: '1px solid var(--line)',
          background: open ? '#f1f5f9' : 'var(--paper)',
          color: 'var(--ink)',
          fontSize: '13px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'all 0.15s ease',
          boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--blue)';
          e.currentTarget.style.color = 'var(--blue)';
        }}
        onMouseLeave={(e) => {
          if (!open) {
            e.currentTarget.style.borderColor = 'var(--line)';
            e.currentTarget.style.color = 'var(--ink)';
          }
        }}
      >
        <span>⚡ Actions</span>
        <span style={{ fontSize: '10px', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0)' }}>
          ▼
        </span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 6px)',
            zIndex: 999,
            minWidth: '180px',
            background: 'rgba(255, 255, 255, 0.96)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: '14px',
            padding: '6px',
            boxShadow: '0 15px 35px -5px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.08)',
            animation: 'dropdownFadeIn 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <button
            onClick={() => { setOpen(false); onViewResults(); }}
            style={menuItemStyle}
            onMouseEnter={(e) => highlightItem(e, '#eff6ff', '#2563eb')}
            onMouseLeave={(e) => resetItem(e)}
          >
            <span style={{ fontSize: '15px' }}>📊</span>
            <span>View Results</span>
          </button>

          <button
            onClick={() => { setOpen(false); onRescan(); }}
            style={menuItemStyle}
            onMouseEnter={(e) => highlightItem(e, '#ecfdf5', '#059669')}
            onMouseLeave={(e) => resetItem(e)}
          >
            <span style={{ fontSize: '15px' }}>🔁</span>
            <span>Re-scan Job Search</span>
          </button>

          <button
            onClick={() => { setOpen(false); onRescore(); }}
            style={menuItemStyle}
            onMouseEnter={(e) => highlightItem(e, '#f0f9ff', '#0284c7')}
            onMouseLeave={(e) => resetItem(e)}
          >
            <span style={{ fontSize: '15px' }}>🔄</span>
            <span>Re-score Match Scores</span>
          </button>

          <div style={{ height: '1px', background: 'rgba(0,0,0,0.06)', margin: '4px 6px' }} />

          <button
            onClick={() => { setOpen(false); onDelete(); }}
            style={{ ...menuItemStyle, color: '#dc2626' }}
            onMouseEnter={(e) => highlightItem(e, '#fef2f2', '#dc2626')}
            onMouseLeave={(e) => resetItem(e, '#dc2626')}
          >
            <span style={{ fontSize: '15px' }}>🗑️</span>
            <span>Delete Scan Run</span>
          </button>
        </div>
      )}

      <style>{`
        @keyframes dropdownFadeIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

const menuItemStyle = {
  width: '100%',
  textAlign: 'left',
  padding: '8px 12px',
  borderRadius: '8px',
  border: 'none',
  background: 'transparent',
  color: '#334155',
  fontSize: '13px',
  fontWeight: '500',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  transition: 'background 0.12s ease, color 0.12s ease',
};

function highlightItem(e, bg, color) {
  e.currentTarget.style.background = bg;
  e.currentTarget.style.color = color;
}

function resetItem(e, defaultColor = '#334155') {
  e.currentTarget.style.background = 'transparent';
  e.currentTarget.style.color = defaultColor;
}

export function JobScoutRuns() {
  const [runs, setRuns]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [selectedRunId, setSelectedRunId] = useState(null);

  // Futuristic Modal State
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    type: 'danger',
    loading: false,
    onConfirm: null,
  });

  const pollTimer = useRef(null);

  const loadRuns = async () => {
    try {
      const data = await fetchJobScoutRuns();
      if (data && data.runs) {
        setRuns(data.runs);
      }
    } catch (err) {
      setError(err.message || 'Failed to load runs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRuns();

    const poll = async () => {
      await loadRuns();
      pollTimer.current = window.setTimeout(poll, 5000);
    };

    pollTimer.current = window.setTimeout(poll, 5000);
    return () => window.clearTimeout(pollTimer.current);
  }, []);

  const handleDeleteClick = (run) => {
    setModalConfig({
      isOpen: true,
      title: `Delete Run #${run.id}?`,
      message: `Are you sure you want to delete this scan and all its scraped job results?\nThis action cannot be undone.`,
      confirmText: 'Delete Run',
      cancelText: 'Keep Run',
      type: 'danger',
      loading: false,
      onConfirm: async () => {
        setModalConfig(prev => ({ ...prev, loading: true }));
        try {
          await deleteJobScoutRun(run.id);
          if (selectedRunId === run.id) setSelectedRunId(null);
          await loadRuns();
        } catch (err) {
          setError('Failed to delete run: ' + err.message);
        } finally {
          setModalConfig(prev => ({ ...prev, isOpen: false, loading: false }));
        }
      },
    });
  };

  const handleRescoreClick = (run) => {
    setModalConfig({
      isOpen: true,
      title: `Rescore Run #${run.id}?`,
      message: `This will reset all job match scores for this scan back to pending and trigger AI matching again with your latest settings.`,
      confirmText: 'Rescore Jobs',
      cancelText: 'Cancel',
      type: 'info',
      loading: false,
      onConfirm: async () => {
        setModalConfig(prev => ({ ...prev, loading: true }));
        try {
          await rescoreJobScoutRun(run.id);
          await loadRuns();
        } catch (err) {
          setError('Failed to rescore run: ' + err.message);
        } finally {
          setModalConfig(prev => ({ ...prev, isOpen: false, loading: false }));
        }
      },
    });
  };

  const handleRescanClick = (run) => {
    setModalConfig({
      isOpen: true,
      title: `Start New Scan for Run #${run.id}?`,
      message: `This will trigger a fresh LinkedIn job scrape using:\n• Search URL: ${run.linkedin_url}\n• Job Limit: ${run.scrape_limit}`,
      confirmText: '🚀 Start Re-scan',
      cancelText: 'Cancel',
      type: 'success',
      loading: false,
      onConfirm: async () => {
        setModalConfig(prev => ({ ...prev, loading: true }));
        try {
          await startJobScout({
            linkedin_url: run.linkedin_url,
            scrape_limit: run.scrape_limit,
          });
          await loadRuns();
        } catch (err) {
          setError('Failed to start re-scan: ' + err.message);
        } finally {
          setModalConfig(prev => ({ ...prev, isOpen: false, loading: false }));
        }
      },
    });
  };

  const closeModal = () => setModalConfig(prev => ({ ...prev, isOpen: false }));

  if (selectedRunId) {
    return <JobScoutResults runId={selectedRunId} onBack={() => setSelectedRunId(null)} />;
  }

  if (loading) return <div style={{ padding: '30px', color: 'var(--muted)' }}>Loading history...</div>;

  return (
    <div className="manual-form">
      <h2 style={{ marginBottom: '20px', fontSize: '20px' }}>Scan History</h2>
      {error && <div className="error-message" style={{ marginBottom: '20px' }}>{error}</div>}

      {!runs.length ? (
        <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '30px' }}>
          No job scans found. Start one to see results.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '15px' }}>
          {runs.map(run => {
            const isCompleted = run.status === 'completed';
            const progress = run.total_scraped > 0
              ? Math.round((run.total_scored / run.total_scraped) * 100)
              : 0;

            return (
              <div
                key={run.id}
                style={{
                  border: '1px solid var(--line)',
                  borderRadius: '14px',
                  padding: '20px',
                  background: 'var(--paper)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                }}
                onClick={() => setSelectedRunId(run.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: '600' }}>Run #{run.id} — Job Scan</h3>
                    <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '6px' }}>
                      Status: <strong style={{ color: isCompleted ? 'var(--green)' : 'var(--ink)' }}>{run.status.toUpperCase()}</strong> ({run.total_scored}/{run.total_scraped})
                    </div>
                    {!isCompleted && run.total_scraped > 0 && (
                      <div style={{ width: '100%', height: '8px', background: 'var(--line)', borderRadius: '4px', marginBottom: '10px' }}>
                        <div style={{ width: `${progress}%`, height: '100%', background: 'var(--green)', borderRadius: '4px' }} />
                      </div>
                    )}
                    <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                      Started: {new Date(run.started_at || run.created_at).toLocaleString()}
                    </div>
                  </div>

                  {/* Futuristic Actions Dropdown Menu */}
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <ActionDropdown
                      run={run}
                      onViewResults={() => setSelectedRunId(run.id)}
                      onRescore={() => handleRescoreClick(run)}
                      onRescan={() => handleRescanClick(run)}
                      onDelete={() => handleDeleteClick(run)}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Futuristic Modal Dialog */}
      <FuturisticModal
        isOpen={modalConfig.isOpen}
        onClose={closeModal}
        onConfirm={modalConfig.onConfirm}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        cancelText={modalConfig.cancelText}
        type={modalConfig.type}
        loading={modalConfig.loading}
      />
    </div>
  );
}
