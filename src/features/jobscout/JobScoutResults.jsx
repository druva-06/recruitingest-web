import React, { useState, useEffect, useRef } from 'react';
import { fetchJobScoutRun, createCrmJob } from '../../services/api';

// Safely parse a field that may be a JSON string array or already an array
function parseSkills(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Clean and normalize LinkedIn job URLs to: https://www.linkedin.com/jobs/view/<slug-or-id>/
function cleanLinkedInJobUrl(rawUrl) {
  if (!rawUrl) return '';
  try {
    const u = new URL(rawUrl.trim());
    u.hostname = 'www.linkedin.com';
    u.search = '';
    u.hash = '';
    if (!u.pathname.endsWith('/')) {
      u.pathname += '/';
    }
    return u.toString();
  } catch {
    return rawUrl;
  }
}

function ScoreBadge({ score }) {
  if (score == null) return <span style={{ color: 'var(--muted)', fontSize: '13px' }}>—</span>;
  const color = score >= 75 ? '#176b4a' : score >= 50 ? '#b8860b' : '#a04138';
  const bg = score >= 75 ? '#e8f5ef' : score >= 50 ? '#fdf6e3' : '#fdf0ef';
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: '12px',
      fontWeight: 'bold',
      fontSize: '14px',
      color,
      background: bg,
      border: `1px solid ${color}33`,
      whiteSpace: 'nowrap',
    }}>
      {score}%
    </span>
  );
}

function StatusBadge({ status }) {
  const map = {
    completed: { color: '#176b4a', bg: '#e8f5ef', label: 'COMPLETED' },
    scoring:   { color: '#3a6bba', bg: '#eef3fd', label: 'SCORING…' },
    scraping:  { color: '#3a6bba', bg: '#eef3fd', label: 'SCRAPING…' },
    pending:   { color: '#888',    bg: '#f5f5f5', label: 'PENDING' },
    failed:    { color: '#a04138', bg: '#fdf0ef', label: 'FAILED' },
  };
  const s = map[status] || { color: '#888', bg: '#f5f5f5', label: (status || '').toUpperCase() };
  return (
    <span style={{
      padding: '3px 10px', borderRadius: '10px',
      fontSize: '12px', fontWeight: 'bold',
      color: s.color, background: s.bg,
      border: `1px solid ${s.color}44`,
    }}>
      {s.label}
    </span>
  );
}

export function JobScoutResults({ runId, onBack }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [expanded, setExpanded] = useState({});
  const [appliedMap, setAppliedMap] = useState({});

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize]       = useState(10); // 10, 25, 50, 100, or 'all'

  const pollTimer = useRef(null);

  const handleApply = async (e, job) => {
    e.stopPropagation();
    if (appliedMap[job.id] === 'saving') return;

    const cleanUrl = cleanLinkedInJobUrl(job.linkedin_url);

    setAppliedMap(prev => ({ ...prev, [job.id]: 'saving' }));
    try {
      await createCrmJob({
        company_name: job.company || 'Unknown Company',
        role_title:   job.title || 'Target Role',
        job_url:      cleanUrl,
      });
      setAppliedMap(prev => ({ ...prev, [job.id]: 'saved' }));
    } catch (err) {
      console.error('Failed to create job in CRM:', err);
      setAppliedMap(prev => ({ ...prev, [job.id]: 'saved' }));
    }

    if (cleanUrl) {
      window.open(cleanUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const loadData = async () => {
    try {
      const res = await fetchJobScoutRun(runId);
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load results.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const poll = async () => {
      await loadData();
      pollTimer.current = window.setTimeout(poll, 5000);
    };
    pollTimer.current = window.setTimeout(poll, 5000);
    return () => window.clearTimeout(pollTimer.current);
  }, [runId]);

  useEffect(() => {
    if (data?.run?.status === 'completed' || data?.run?.status === 'failed') {
      window.clearTimeout(pollTimer.current);
    }
  }, [data]);

  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  if (loading) return <div style={{ padding: '30px', color: 'var(--muted)' }}>Loading results…</div>;
  if (error)   return <div className="error-message">{error}</div>;
  if (!data || !data.run) return <div style={{ padding: '30px', color: 'var(--muted)' }}>No data found.</div>;

  const { run, progress, top_jobs } = data;
  const jobs = Array.isArray(top_jobs) ? top_jobs : [];

  // Calculate pagination
  const isAll = pageSize === 'all';
  const sizeNum = isAll ? jobs.length : Number(pageSize);
  const totalPages = isAll || jobs.length === 0 ? 1 : Math.ceil(jobs.length / sizeNum);
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = isAll ? 0 : (validCurrentPage - 1) * sizeNum;
  const endIndex   = isAll ? jobs.length : Math.min(startIndex + sizeNum, jobs.length);
  const paginatedJobs = jobs.slice(startIndex, endIndex);

  const handlePageSizeChange = (e) => {
    const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
    setPageSize(val);
    setCurrentPage(1);
  };

  return (
    <div>
      {/* Back button */}
      <button
        onClick={onBack}
        className="secondary-button"
        style={{ width: 'auto', minHeight: '30px', padding: '0 12px', marginBottom: '20px', fontSize: '13px' }}
      >
        ← Back to Runs
      </button>

      {/* Header card */}
      <div className="manual-form" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ margin: '0 0 6px', fontSize: '20px' }}>Run #{run.id} — Results</h2>
            <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' }}>
              🔗{' '}
              <a
                href={run.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--blue)', textDecoration: 'none', wordBreak: 'break-word' }}
                title={run.linkedin_url}
              >
                LinkedIn Search URL ↗
              </a>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
              {run.total_scraped} scraped &nbsp;•&nbsp; {run.total_scored} scored &nbsp;•&nbsp; limit: {run.scrape_limit}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <StatusBadge status={run.status} />
            {run.error_message && (
              <div style={{ marginTop: '6px', fontSize: '12px', color: '#a04138', maxWidth: '300px' }}>
                ⚠️ {run.error_message}
              </div>
            )}
          </div>
        </div>

        {/* Progress bar — show while not done */}
        {(run.status === 'scoring' || run.status === 'scraping') && (
          <div style={{ marginTop: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>
              <span>Scoring progress</span>
              <span>{progress?.scored ?? run.total_scored} / {progress?.total ?? run.total_scraped}</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'var(--line)', borderRadius: '4px' }}>
              <div style={{
                width: `${progress?.percent || 0}%`,
                height: '100%', background: 'var(--green)', borderRadius: '4px',
                transition: 'width 0.4s',
              }} />
            </div>
          </div>
        )}
      </div>

      {/* Results table & pagination */}
      <div className="manual-form">
        {/* Top Control Bar: Title + Page Size & Pagination controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '15px' }}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>
            Job Matches {jobs.length > 0 && <span style={{ fontWeight: 'normal', color: 'var(--muted)', fontSize: '13px' }}>({jobs.length} total)</span>}
          </h3>

          {jobs.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', fontSize: '13px' }}>
              {/* Rows Per Page Selector */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                <span style={{ color: 'var(--muted)' }}>Show:</span>
                <select
                  value={pageSize}
                  onChange={handlePageSizeChange}
                  style={{ padding: '3px 8px', fontSize: '13px', borderRadius: '4px', border: '1px solid var(--line)', background: 'var(--paper)' }}
                >
                  <option value={10}>10 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                  <option value="all">Show All ({jobs.length})</option>
                </select>
              </label>

              {/* Showing range indicator */}
              <span style={{ color: 'var(--muted)' }}>
                {jobs.length === 0 ? '0' : `${startIndex + 1}–${endIndex}`} of {jobs.length}
              </span>
            </div>
          )}
        </div>

        {jobs.length === 0 ? (
          <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '30px' }}>
            {run.status === 'completed'
              ? 'No jobs found in this run.'
              : 'Scoring in progress — results will appear here automatically.'}
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--paper)', borderBottom: '2px solid var(--line)', textAlign: 'left' }}>
                    <th style={th}>#</th>
                    <th style={th}>Job Title</th>
                    <th style={th}>Company</th>
                    <th style={th}>Location</th>
                    <th style={th}>Score</th>
                    <th style={th}>Status</th>
                    <th style={th}>Apply & Track</th>
                    <th style={th}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedJobs.map((job, idx) => {
                    const matchingSkills = parseSkills(job.matching_skills);
                    const missingSkills  = parseSkills(job.missing_skills);
                    const isOpen = !!expanded[job.id];
                    const globalRank = job.rank ?? (startIndex + idx + 1);

                    return (
                      <React.Fragment key={job.id}>
                        <tr
                          style={{
                            borderBottom: isOpen ? 'none' : '1px solid var(--line)',
                            background: idx % 2 === 0 ? 'transparent' : 'var(--paper)',
                            cursor: 'pointer',
                          }}
                          onClick={() => toggleExpand(job.id)}
                        >
                          <td style={td}>{globalRank}</td>
                          <td style={td}>
                            {job.linkedin_url
                              ? <a href={job.linkedin_url} target="_blank" rel="noopener noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  style={{ color: 'var(--blue)', textDecoration: 'none', fontWeight: '500' }}>
                                  {job.title || '—'}
                                </a>
                              : (job.title || '—')
                            }
                          </td>
                          <td style={td}>{job.company || '—'}</td>
                          <td style={td}>{job.location || '—'}</td>
                          <td style={td}>
                            {job.score_status === 'failed'
                              ? <span style={{ color: '#a04138', fontSize: '12px' }}>Failed</span>
                              : job.score_status === 'pending' || job.score_status === 'scoring'
                              ? <span style={{ color: 'var(--muted)', fontSize: '12px' }}>Pending…</span>
                              : <ScoreBadge score={job.fit_score} />
                            }
                          </td>
                          <td style={td}><StatusBadge status={job.score_status} /></td>
                          <td style={td}>
                            {job.linkedin_url ? (
                              <button
                                onClick={(e) => handleApply(e, job)}
                                disabled={appliedMap[job.id] === 'saving'}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '4px 12px',
                                  background: appliedMap[job.id] === 'saved' ? '#176b4a' : '#0a66c2',
                                  color: '#fff',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  border: 'none',
                                  cursor: appliedMap[job.id] === 'saving' ? 'wait' : 'pointer',
                                  whiteSpace: 'nowrap',
                                  transition: 'all 0.2s',
                                }}
                                title="Add job to LinkedIn CRM Dashboard & open job post"
                              >
                                {appliedMap[job.id] === 'saving'
                                  ? 'Saving…'
                                  : appliedMap[job.id] === 'saved'
                                  ? '✓ Added to CRM ↗'
                                  : '🚀 Apply & Track ↗'}
                              </button>
                            ) : (
                              <span style={{ color: 'var(--muted)', fontSize: '12px' }}>—</span>
                            )}
                          </td>
                          <td style={td}>
                            <span style={{ color: 'var(--blue)', fontSize: '12px' }}>{isOpen ? '▲ Hide' : '▼ Show'}</span>
                          </td>
                        </tr>

                        {/* Expanded row */}
                        {isOpen && (
                          <tr style={{ borderBottom: '1px solid var(--line)' }}>
                            <td colSpan={8} style={{ padding: '15px 20px', background: '#f8faf9' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '12px', fontSize: '13px' }}>
                                {job.salary && <div>💰 <strong>Salary:</strong> {job.salary}</div>}
                                {job.job_type && <div>🗂 <strong>Type:</strong> {job.job_type}</div>}
                                {job.experience_level && <div>📊 <strong>Level:</strong> {job.experience_level}</div>}
                                {job.applicant_count && <div>👥 <strong>Applicants:</strong> {job.applicant_count}</div>}
                                {job.posted_at && <div>🕒 <strong>Posted:</strong> {job.posted_at}</div>}
                              </div>

                              {job.fit_reasoning && (
                                <div style={{ marginBottom: '12px', fontSize: '13px' }}>
                                  <strong>Match Analysis:</strong>
                                  <div style={{ marginTop: '4px', color: 'var(--ink)', lineHeight: '1.5' }}>
                                    {job.fit_reasoning}
                                  </div>
                                </div>
                              )}

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                                {matchingSkills.length > 0 && (
                                  <div>
                                    <strong style={{ color: '#176b4a' }}>✅ Matching Skills:</strong>
                                    <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                      {matchingSkills.map(s => (
                                        <span key={s} style={{ padding: '2px 8px', background: '#e8f5ef', color: '#176b4a', borderRadius: '10px', fontSize: '12px' }}>{s}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {missingSkills.length > 0 && (
                                  <div>
                                    <strong style={{ color: '#a04138' }}>❌ Missing Skills:</strong>
                                    <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                      {missingSkills.map(s => (
                                        <span key={s} style={{ padding: '2px 8px', background: '#fdf0ef', color: '#a04138', borderRadius: '10px', fontSize: '12px' }}>{s}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Pagination Controls */}
            {!isAll && totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '15px', borderTop: '1px solid var(--line)' }}>
                <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                  Page {validCurrentPage} of {totalPages} ({jobs.length} jobs total)
                </div>

                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button
                    className="secondary-button"
                    style={{ padding: '4px 10px', fontSize: '12px', minHeight: 'auto', marginTop: 0 }}
                    disabled={validCurrentPage === 1}
                    onClick={() => setCurrentPage(1)}
                  >
                    « First
                  </button>
                  <button
                    className="secondary-button"
                    style={{ padding: '4px 12px', fontSize: '12px', minHeight: 'auto', marginTop: 0 }}
                    disabled={validCurrentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  >
                    ‹ Prev
                  </button>

                  {/* Page number buttons */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - validCurrentPage) <= 1)
                    .map((p, idx, arr) => (
                      <React.Fragment key={p}>
                        {idx > 0 && p - arr[idx - 1] > 1 && (
                          <span style={{ color: 'var(--muted)', fontSize: '12px', padding: '0 2px' }}>…</span>
                        )}
                        <button
                          className="secondary-button"
                          style={{
                            padding: '4px 10px',
                            fontSize: '12px',
                            minHeight: 'auto',
                            marginTop: 0,
                            background: p === validCurrentPage ? 'var(--blue)' : undefined,
                            color: p === validCurrentPage ? '#fff' : undefined,
                            borderColor: p === validCurrentPage ? 'var(--blue)' : undefined,
                          }}
                          onClick={() => setCurrentPage(p)}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    ))}

                  <button
                    className="secondary-button"
                    style={{ padding: '4px 12px', fontSize: '12px', minHeight: 'auto', marginTop: 0 }}
                    disabled={validCurrentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  >
                    Next ›
                  </button>
                  <button
                    className="secondary-button"
                    style={{ padding: '4px 10px', fontSize: '12px', minHeight: 'auto', marginTop: 0 }}
                    disabled={validCurrentPage === totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                  >
                    Last »
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const th = {
  padding: '10px 14px',
  fontSize: '12px',
  fontWeight: '600',
  color: 'var(--muted)',
  whiteSpace: 'nowrap',
};

const td = {
  padding: '10px 14px',
  verticalAlign: 'middle',
};
