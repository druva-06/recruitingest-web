import React, { useState, useEffect, useCallback } from 'react'
import { apiFetch, updateEmailStatus, updateEmailDelays } from '../../services/api'

const STATUS_CONFIG = {
  awaiting_reply: { label: 'Awaiting Reply', color: '#854d0e', bg: '#fef9c3', icon: '⏳' },
  replied: { label: 'Replied ✅', color: '#166534', bg: '#dcfce7', icon: '✅' },
  reminder_1_sent: { label: 'Follow-up #1 Sent', color: '#1d4ed8', bg: '#dbeafe', icon: '📨' },
  reminder_2_sent: { label: 'Follow-up #2 Sent', color: '#7c3aed', bg: '#ede9fe', icon: '📨' },
  ghosted: { label: 'Ghosted 👻', color: '#6b7280', bg: '#f3f4f6', icon: '👻' },
  closed: { label: 'Closed', color: '#374151', bg: '#f9fafb', icon: '🔒' },
}

function StatusBadge({ status }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.awaiting_reply
  return (
    <span style={{
      background: c.bg, color: c.color,
      borderRadius: '6px', padding: '3px 10px',
      fontSize: '11px', fontWeight: 700,
      letterSpacing: '0.04em', whiteSpace: 'nowrap'
    }}>
      {c.label}
    </span>
  )
}

function ReminderCountdown({ email }) {
  const now = new Date()
  const sentAt = email.sent_at ? new Date(email.sent_at) : null
  if (!sentAt) return null

  const daysSinceSent = Math.floor((now - sentAt) / (1000 * 60 * 60 * 24))

  if (email.status === 'awaiting_reply') {
    const daysUntilR1 = email.reminder1_delay_days - daysSinceSent
    if (daysUntilR1 > 0) {
      return <span style={{ fontSize: '11px', color: 'var(--muted)' }}>⏱ Reminder 1 in {daysUntilR1}d</span>
    } else {
      return <span style={{ fontSize: '11px', color: '#d97706', fontWeight: 600 }}>⚡ Reminder 1 overdue</span>
    }
  }

  if (email.status === 'reminder_1_sent' && email.reminder1_sent_at) {
    const r1SentAt = new Date(email.reminder1_sent_at)
    const daysSinceR1 = Math.floor((now - r1SentAt) / (1000 * 60 * 60 * 24))
    const daysUntilR2 = email.reminder2_delay_days - daysSinceR1
    if (daysUntilR2 > 0) {
      return <span style={{ fontSize: '11px', color: 'var(--muted)' }}>⏱ Reminder 2 in {daysUntilR2}d</span>
    } else {
      return <span style={{ fontSize: '11px', color: '#d97706', fontWeight: 600 }}>⚡ Reminder 2 overdue</span>
    }
  }

  return null
}

function DelayEditor({ email, onSave, onClose }) {
  const [r1, setR1] = useState(email.reminder1_delay_days || 5)
  const [r2, setR2] = useState(email.reminder2_delay_days || 10)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      await onSave(email.id, r1, r2)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px',
      padding: '14px 16px', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap'
    }}>
      <span style={{ fontSize: '12px', fontWeight: 700, color: '#166534' }}>Edit Reminder Delays:</span>
      <label style={{ fontSize: '12px', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '6px' }}>
        Follow-up #1 after
        <input
          type="number" min={1} max={60} value={r1}
          onChange={e => setR1(Number(e.target.value))}
          style={{ width: '60px', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--line)', fontSize: '13px' }}
        />
        days
      </label>
      <label style={{ fontSize: '12px', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '6px' }}>
        Follow-up #2 after
        <input
          type="number" min={1} max={120} value={r2}
          onChange={e => setR2(Number(e.target.value))}
          style={{ width: '60px', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--line)', fontSize: '13px' }}
        />
        days from original
      </label>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={save} disabled={saving} style={{ padding: '5px 14px', borderRadius: '6px', border: 'none', background: 'var(--green)', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '12px' }}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={onClose} style={{ padding: '5px 14px', borderRadius: '6px', border: '1px solid var(--line)', background: 'white', color: 'var(--muted)', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
      </div>
    </div>
  )
}

function EmailPreviewModal({ email, onClose }) {
  if (!email) return null
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'white', borderRadius: '16px', maxWidth: '720px', width: '100%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.28)', animation: 'modalIn 0.2s ease' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, background: 'white', zIndex: 1, borderRadius: '16px 16px 0 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--green)', margin: '0 0 6px' }}>Email Preview</p>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--ink)', lineHeight: 1.3 }}>{email.subject || '(No subject)'}</h2>
            </div>
            <button onClick={onClose} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '8px', width: '36px', height: '36px', cursor: 'pointer', fontSize: '18px', display: 'grid', placeItems: 'center', flexShrink: 0, color: 'var(--muted)' }}>✕</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '14px' }}>
            <span style={{ fontSize: '13px' }}><strong>To:</strong> <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{email.recruiter_email}</span></span>
            {email.recruiter_name && <span style={{ fontSize: '13px' }}><strong>Name:</strong> {email.recruiter_name}</span>}
            {email.company_name && <span style={{ fontSize: '13px' }}><strong>Company:</strong> {email.company_name}</span>}
            <span style={{ fontSize: '13px' }}><strong>Status:</strong> <StatusBadge status={email.status || 'awaiting_reply'} /></span>
          </div>
        </div>
        <div style={{ padding: '28px' }}>
          <div dangerouslySetInnerHTML={{ __html: email.body || '<p style="color:#999">No body content.</p>' }} style={{ fontSize: '14px', lineHeight: '1.75', color: 'var(--ink)', fontFamily: 'Georgia, serif' }} />
        </div>
      </div>
    </div>
  )
}

function formatRelativeTime(isoString) {
  if (!isoString) return 'Unknown'
  const date = new Date(isoString)
  if (isNaN(date.getTime())) return isoString
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export function SentEmails({ user }) {
  const [emails, setEmails] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [previewEmail, setPreviewEmail] = useState(null)
  const [filterText, setFilterText] = useState('')
  const [filterCompany, setFilterCompany] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [editingDelaysFor, setEditingDelaysFor] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const loadEmails = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await apiFetch('/outreach/sent-emails')
      setEmails(data.emails || [])
    } catch (err) {
      setError(err.message || 'Failed to load sent emails')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadEmails() }, [loadEmails])

  const handleStatusUpdate = async (id, status) => {
    try {
      await updateEmailStatus(id, status)
      setEmails(prev => prev.map(e => e.id === id ? { ...e, status } : e))
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelayUpdate = async (id, r1, r2) => {
    await updateEmailDelays(id, r1, r2)
    setEmails(prev => prev.map(e => e.id === id ? { ...e, reminder1_delay_days: r1, reminder2_delay_days: r2 } : e))
  }

  const filtered = emails.filter(e => {
    const text = filterText.toLowerCase()
    const company = filterCompany.toLowerCase()
    const matchText = !text || (e.recruiter_name || '').toLowerCase().includes(text) || (e.recruiter_email || '').toLowerCase().includes(text) || (e.subject || '').toLowerCase().includes(text)
    const matchCompany = !company || (e.company_name || '').toLowerCase().includes(company)
    const matchStatus = !filterStatus || e.status === filterStatus
    return matchText && matchCompany && matchStatus
  })

  // Reset to page 1 if filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filterText, filterCompany, filterStatus])

  const paginatedEmails = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  const totalPages = Math.ceil(filtered.length / itemsPerPage)

  const awaitingCount = emails.filter(e => e.status === 'awaiting_reply' || e.status === 'reminder_1_sent' || e.status === 'reminder_2_sent').length
  const repliedCount = emails.filter(e => e.status === 'replied').length
  const ghostedCount = emails.filter(e => e.status === 'ghosted').length

  return (
    <section className="manual-page">
      <style>{`
        @keyframes modalIn { from { opacity:0; transform:translateY(16px) scale(0.97) } to { opacity:1; transform:translateY(0) scale(1) } }
        @keyframes fadeSlideIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        .email-card { animation: fadeSlideIn 0.3s ease both; transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s; }
        .email-card:hover { border-color: var(--green) !important; box-shadow: 0 4px 20px rgba(0,0,0,0.07) !important; }
        .company-pill:hover { background: var(--green) !important; color: white !important; cursor: pointer; }
      `}</style>

      <div className="page-intro">
        <div>
          <p className="kicker"><span>📬</span> Outreach History</p>
          <h1>Sent <em>Emails</em></h1>
          <p>All outreach emails from <strong style={{ fontFamily: 'monospace', fontSize: '13px', background: 'var(--green-pale)', padding: '2px 6px', borderRadius: '4px' }}>{user?.email}</strong>. Track replies and manage follow-up timing.</p>
        </div>
      </div>

      <div className="manual-layout" style={{ gridTemplateColumns: '1fr' }}>
        <div className="manual-form" style={{ padding: 0, border: 'none', background: 'transparent' }}>

          {/* Stats */}
          {!loading && emails.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
              {[
                { label: 'Total Sent', value: emails.length, icon: '📨' },
                { label: 'Awaiting Reply', value: awaitingCount, icon: '⏳' },
                { label: 'Replied', value: repliedCount, icon: '✅' },
                { label: 'Ghosted', value: ghostedCount, icon: '👻' },
              ].map(stat => (
                <div key={stat.label} style={{ background: 'white', border: '1px solid var(--line)', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '22px' }}>{stat.icon}</span>
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--ink)', lineHeight: 1 }}>{stat.value}</div>
                    <div style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '2px' }}>{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Filters */}
          {emails.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <input type="text" placeholder="Search by name, email, subject..." value={filterText} onChange={e => setFilterText(e.target.value)}
                style={{ flex: 2, minWidth: '180px', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '13px' }} />
              <input type="text" placeholder="Filter company..." value={filterCompany} onChange={e => setFilterCompany(e.target.value)}
                style={{ flex: 1, minWidth: '120px', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '13px' }} />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '13px', background: 'white', cursor: 'pointer' }}>
                <option value="">All Statuses</option>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <button onClick={loadEmails} style={{ padding: '9px 14px', borderRadius: '8px', border: '1px solid var(--line)', background: 'white', cursor: 'pointer', fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='var(--green)'; e.currentTarget.style.color='var(--green)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='var(--line)'; e.currentTarget.style.color='var(--muted)' }}>
                ↺ Refresh
              </button>
            </div>
          )}

          {loading && (
            <div style={{ textAlign: 'center', padding: '60px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid var(--line)', borderTopColor: 'var(--green)', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
              <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Loading your sent emails...</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </div>
          )}

          {!loading && error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '20px', textAlign: 'center' }}>
              <p style={{ color: '#dc2626', margin: 0, fontWeight: 600 }}>⚠ {error}</p>
              <button onClick={loadEmails} style={{ marginTop: '12px', padding: '8px 20px', borderRadius: '6px', background: 'var(--green)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Try Again</button>
            </div>
          )}

          {!loading && !error && emails.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', border: '1px solid var(--line)', borderRadius: '16px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
              <h3 style={{ margin: '0 0 8px', color: 'var(--ink)' }}>No sent emails yet</h3>
              <p style={{ color: 'var(--muted)', fontSize: '14px', margin: 0 }}>Emails you send via <strong>Send Pitch</strong> will appear here.</p>
            </div>
          )}

          {!loading && !error && emails.length > 0 && filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', background: 'white', border: '1px solid var(--line)', borderRadius: '12px' }}>
              <p style={{ color: 'var(--muted)', margin: 0 }}>No emails match your filters.</p>
            </div>
          )}

          {/* Email cards */}
          {!loading && !error && filtered.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {paginatedEmails.map((email, idx) => (
                <div key={email.id || idx} className="email-card" style={{ background: 'white', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden', animationDelay: `${idx * 0.04}s` }}>
                  {/* Main row */}
                  <div style={{ padding: '14px 18px', display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '12px', alignItems: 'start' }}>
                    {/* Avatar */}
                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: `hsl(${(email.recruiter_name || email.recruiter_email || '').charCodeAt(0) * 17 % 360}, 60%, 88%)`, display: 'grid', placeItems: 'center', fontSize: '13px', fontWeight: 700, color: `hsl(${(email.recruiter_name || email.recruiter_email || '').charCodeAt(0) * 17 % 360}, 50%, 30%)`, flexShrink: 0 }}>
                      {getInitials(email.recruiter_name || email.recruiter_email)}
                    </div>

                    {/* Info */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '2px' }}>
                        <strong style={{ fontSize: '14px', color: 'var(--ink)' }}>{email.recruiter_name || 'Unknown Recruiter'}</strong>
                        {email.company_name && <span style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '999px', background: 'var(--green-pale)', color: 'var(--green)', fontWeight: 600 }}>{email.company_name}</span>}
                        <StatusBadge status={email.status || 'awaiting_reply'} />
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'monospace', marginBottom: '4px' }}>{email.recruiter_email}</div>
                      <div style={{ fontSize: '12px', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span style={{ color: 'var(--muted)', marginRight: '4px' }}>Subject:</span>{email.subject}
                      </div>
                      <div style={{ marginTop: '4px' }}><ReminderCountdown email={email} /></div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{formatRelativeTime(email.sent_at)}</span>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <button onClick={() => setPreviewEmail(email)}
                          style={{ padding: '4px 10px', borderRadius: '5px', border: '1px solid var(--line)', background: 'var(--surface)', cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: 'var(--ink)' }}>
                          View
                        </button>
                        {(email.status === 'awaiting_reply' || email.status === 'reminder_1_sent' || email.status === 'reminder_2_sent') && (
                          <button onClick={() => handleStatusUpdate(email.id, 'replied')}
                            style={{ padding: '4px 10px', borderRadius: '5px', border: '1px solid #86efac', background: '#f0fdf4', cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: '#166534' }}>
                            ✓ Replied
                          </button>
                        )}
                        {email.status !== 'closed' && email.status !== 'ghosted' && email.status !== 'replied' && (
                          <button onClick={() => setEditingDelaysFor(editingDelaysFor === email.id ? null : email.id)}
                            style={{ padding: '4px 10px', borderRadius: '5px', border: '1px solid var(--line)', background: 'white', cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: 'var(--muted)' }}>
                            ⏱ Delays
                          </button>
                        )}
                        {email.status !== 'closed' && (
                          <button onClick={() => handleStatusUpdate(email.id, 'closed')}
                            style={{ padding: '4px 10px', borderRadius: '5px', border: '1px solid #e5e7eb', background: '#f9fafb', cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: '#6b7280' }}>
                            Close
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Delay editor inline */}
                  {editingDelaysFor === email.id && (
                    <div style={{ borderTop: '1px solid var(--line)', padding: '0 18px 14px' }}>
                      <DelayEditor
                        email={email}
                        onSave={handleDelayUpdate}
                        onClose={() => setEditingDelaysFor(null)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {!loading && filtered.length > 0 && totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '24px' }}>
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--line)', background: 'white',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1,
                  fontWeight: 600, fontSize: '13px', color: 'var(--ink)'
                }}
              >
                ← Prev
              </button>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted)' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--line)', background: 'white',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1,
                  fontWeight: 600, fontSize: '13px', color: 'var(--ink)'
                }}
              >
                Next →
              </button>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--muted)', marginTop: '16px' }}>
              Showing {paginatedEmails.length} of {filtered.length} sent email{filtered.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

      </div>

      {/* Email Preview Modal */}
      <EmailPreviewModal email={previewEmail} onClose={() => setPreviewEmail(null)} />
    </section>
  )
}
