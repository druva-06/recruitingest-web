import React, { useState, useEffect, useCallback } from 'react'
import {
  fetchReminderDrafts,
  generateReminderDrafts,
  sendReminderDrafts,
  updateReminderDraft,
  rejectReminderDraft,
  getJobStatus
} from '../../services/api'

function ReminderNumberBadge({ number }) {
  const colors = {
    1: { bg: '#fef9c3', color: '#854d0e', border: '#fde047' },
    2: { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
  }
  const c = colors[number] || colors[1]
  return (
    <span style={{
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      borderRadius: '6px', padding: '2px 10px', fontSize: '11px', fontWeight: 700,
      letterSpacing: '0.04em', whiteSpace: 'nowrap'
    }}>
      Follow-up #{number}
    </span>
  )
}

function DraftCard({ draft, isSelected, onSelect, onSendSingle, onReject, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [editSubject, setEditSubject] = useState(draft.subject)
  const [editBody, setEditBody] = useState(draft.body)
  const [saving, setSaving] = useState(false)

  const saveEdit = async () => {
    setSaving(true)
    try {
      await onUpdate(draft.id, editSubject, editBody)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      background: 'white',
      border: `2px solid ${isSelected ? 'var(--green)' : 'var(--line)'}`,
      borderRadius: '14px',
      overflow: 'hidden',
      transition: 'border-color 0.2s, box-shadow 0.2s',
      boxShadow: isSelected ? '0 0 0 3px rgba(22,163,74,0.1)' : 'none',
      animation: 'fadeSlideIn 0.3s ease both',
    }}>
      {/* Card header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--line)',
        display: 'flex', alignItems: 'center', gap: '12px',
        background: isSelected ? 'rgba(22,163,74,0.03)' : 'var(--surface)',
      }}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(draft.id)}
          style={{ width: '18px', height: '18px', accentColor: 'var(--green)', cursor: 'pointer', flexShrink: 0 }}
        />
        <ReminderNumberBadge number={draft.reminder_number} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ fontSize: '15px', color: 'var(--ink)', display: 'block', lineHeight: 1.3 }}>
            {draft.recruiter_name || 'Recruiter'}
          </strong>
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
            {draft.company_name && <>{draft.company_name} · </>}
            <span style={{ fontFamily: 'monospace' }}>{draft.recruiter_email}</span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button
            onClick={() => setEditing(!editing)}
            style={{
              padding: '5px 12px', borderRadius: '6px',
              border: '1px solid var(--line)', background: editing ? 'var(--green-pale)' : 'white',
              color: editing ? 'var(--green)' : 'var(--ink)', cursor: 'pointer',
              fontSize: '12px', fontWeight: 600, transition: 'all 0.2s'
            }}
          >
            {editing ? 'Cancel Edit' : '✏️ Edit'}
          </button>
          <button
            onClick={() => onReject(draft.id)}
            style={{
              padding: '5px 12px', borderRadius: '6px',
              border: '1px solid #fecaca', background: '#fff5f5',
              color: '#dc2626', cursor: 'pointer',
              fontSize: '12px', fontWeight: 600, transition: 'all 0.2s'
            }}
          >
            ✕ Reject
          </button>
          <button
            onClick={() => onSendSingle(draft.id)}
            style={{
              padding: '5px 14px', borderRadius: '6px',
              border: 'none', background: 'var(--green)',
              color: 'white', cursor: 'pointer',
              fontSize: '12px', fontWeight: 700, transition: 'all 0.15s'
            }}
          >
            Send ↗
          </button>
        </div>
      </div>

      {/* Subject + body area */}
      <div style={{ padding: '16px 20px' }}>
        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '4px' }}>Subject</label>
              <input
                value={editSubject}
                onChange={e => setEditSubject(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--line)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '4px' }}>Body (HTML)</label>
              <textarea
                value={editBody}
                onChange={e => setEditBody(e.target.value)}
                rows={8}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--line)', fontSize: '13px', fontFamily: 'monospace', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={saveEdit}
                disabled={saving}
                style={{
                  padding: '8px 20px', borderRadius: '6px', border: 'none',
                  background: 'var(--green)', color: 'white', cursor: 'pointer',
                  fontWeight: 700, fontSize: '13px'
                }}
              >
                {saving ? 'Saving…' : '✓ Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Subject: </span>
              <span style={{ fontSize: '14px', color: 'var(--ink)', fontWeight: 600 }}>{draft.subject}</span>
            </div>
            <div
              dangerouslySetInnerHTML={{ __html: draft.body }}
              style={{
                fontSize: '13px', lineHeight: '1.7', color: 'var(--ink)',
                maxHeight: '160px', overflow: 'hidden',
                maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)'
              }}
            />
          </>
        )}
      </div>
    </div>
  )
}

export function RemindersInbox({ onBadgeUpdate }) {
  const [drafts, setDrafts] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [selected, setSelected] = useState(new Set())

  const loadDrafts = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchReminderDrafts()
      setDrafts(data.drafts || [])
      if (onBadgeUpdate) onBadgeUpdate(data.count || 0)
    } catch (err) {
      setError(err.message || 'Failed to load reminder drafts')
    } finally {
      setLoading(false)
    }
  }, [onBadgeUpdate])

  useEffect(() => { loadDrafts() }, [loadDrafts])

  const handleGenerate = async () => {
    setGenerating(true)
    setError('')
    setSuccessMsg('')
    try {
      const res = await generateReminderDrafts()
      if (res.job_id) {
        pollGenerateJob(res.job_id)
      } else {
        setSuccessMsg(`${res.generated || 0} reminder draft(s) generated by AI.`)
        await loadDrafts()
        setGenerating(false)
      }
    } catch (err) {
      setError(err.message || 'Failed to generate reminders')
      setGenerating(false)
    }
  }

  const pollGenerateJob = async (jobId) => {
    try {
      const job = await getJobStatus(jobId)
      if (job.status === 'completed') {
        setSuccessMsg(`${job.result?.generated || 0} reminder draft(s) generated by AI.`)
        await loadDrafts()
        setGenerating(false)
      } else if (job.status === 'failed') {
        setError(job.error_message || 'Failed to generate reminders')
        setGenerating(false)
      } else {
        setTimeout(() => pollGenerateJob(jobId), 3000)
      }
    } catch (err) {
      setError(err.message || 'Failed to check generation status')
      setGenerating(false)
    }
  }

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === drafts.length) setSelected(new Set())
    else setSelected(new Set(drafts.map(d => d.id)))
  }

  const sendDrafts = async (ids) => {
    setSending(true)
    setError('')
    try {
      const res = await sendReminderDrafts(ids)
      const sentCount = (res.sent || []).length
      const failCount = (res.failed || []).length
      setSuccessMsg(
        failCount === 0
          ? `${sentCount} reminder(s) sent successfully! 🎉`
          : `${sentCount} sent, ${failCount} failed.`
      )
      setSelected(new Set())
      await loadDrafts()
    } catch (err) {
      setError(err.message || 'Failed to send reminders')
    } finally {
      setSending(false)
    }
  }

  const handleSendSelected = () => sendDrafts([...selected])
  const handleSendSingle = (id) => sendDrafts([id])

  const handleReject = async (id) => {
    try {
      await rejectReminderDraft(id)
      setDrafts(prev => prev.filter(d => d.id !== id))
      setSelected(prev => { const next = new Set(prev); next.delete(id); return next })
      if (onBadgeUpdate) onBadgeUpdate(drafts.length - 1)
    } catch (err) {
      setError(err.message || 'Failed to reject draft')
    }
  }

  const handleUpdate = async (id, subject, body) => {
    await updateReminderDraft(id, subject, body)
    setDrafts(prev => prev.map(d => d.id === id ? { ...d, subject, body } : d))
  }

  const reminder1Count = drafts.filter(d => d.reminder_number === 1).length
  const reminder2Count = drafts.filter(d => d.reminder_number === 2).length

  return (
    <section className="manual-page">
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="page-intro">
        <div>
          <p className="kicker"><span>🔔</span> Follow-up Queue</p>
          <h1>Reminder <em>Inbox</em></h1>
          <p>AI-generated follow-up emails ready to review and send. Select multiple and bulk-send or edit individually.</p>
        </div>
      </div>

      <div className="manual-layout" style={{ gridTemplateColumns: '1fr auto' }}>
        <div style={{ minWidth: 0 }}>
          {/* Action bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            marginBottom: '24px', flexWrap: 'wrap'
          }}>
            <button
              onClick={handleGenerate}
              disabled={generating}
              style={{
                padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--line)',
                background: 'white', color: 'var(--ink)', cursor: 'pointer',
                fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--green)'; e.currentTarget.style.color = 'var(--green)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.color = 'var(--ink)' }}
            >
              {generating ? (
                <span style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid var(--line)', borderTopColor: 'var(--green)', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
              ) : '✨'}
              {generating ? 'Generating…' : 'Generate Reminders'}
            </button>

            {drafts.length > 0 && (
              <>
                <button
                  onClick={toggleSelectAll}
                  style={{
                    padding: '10px 16px', borderRadius: '8px',
                    border: '1px solid var(--line)', background: 'white',
                    color: 'var(--muted)', cursor: 'pointer', fontSize: '13px', fontWeight: 600
                  }}
                >
                  {selected.size === drafts.length ? 'Deselect All' : 'Select All'}
                </button>

                {selected.size > 0 && (
                  <button
                    onClick={handleSendSelected}
                    disabled={sending}
                    style={{
                      padding: '10px 24px', borderRadius: '8px',
                      border: 'none', background: 'var(--green)',
                      color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 700,
                      display: 'flex', alignItems: 'center', gap: '8px', transition: 'opacity 0.2s'
                    }}
                  >
                    {sending ? 'Sending…' : `📬 Send Selected (${selected.size})`}
                  </button>
                )}
              </>
            )}

            <button
              onClick={loadDrafts}
              style={{
                padding: '10px', borderRadius: '8px', border: '1px solid var(--line)',
                background: 'white', cursor: 'pointer', color: 'var(--muted)',
                fontSize: '16px', lineHeight: 1, transition: 'all 0.2s'
              }}
              title="Refresh"
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--green)'; e.currentTarget.style.borderColor = 'var(--green)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--line)' }}
            >
              ↺
            </button>
          </div>

          {successMsg && (
            <div style={{
              background: '#dcfce7', border: '1px solid #86efac', borderRadius: '10px',
              padding: '12px 16px', marginBottom: '16px', color: '#166534', fontWeight: 600, fontSize: '14px'
            }}>
              ✅ {successMsg}
            </div>
          )}

          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px',
              padding: '12px 16px', marginBottom: '16px', color: '#dc2626', fontWeight: 600, fontSize: '14px'
            }}>
              ⚠ {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '60px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                border: '3px solid var(--line)', borderTopColor: 'var(--green)',
                animation: 'spin 0.8s linear infinite', margin: '0 auto 16px'
              }} />
              <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Checking for pending reminders…</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </div>
          )}

          {/* Empty state */}
          {!loading && drafts.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '60px 20px',
              background: 'white', border: '1px solid var(--line)', borderRadius: '16px'
            }}>
              <div style={{ fontSize: '56px', marginBottom: '16px' }}>✅</div>
              <h3 style={{ margin: '0 0 8px', color: 'var(--ink)', fontSize: '20px' }}>All caught up!</h3>
              <p style={{ color: 'var(--muted)', fontSize: '14px', margin: '0 0 20px' }}>
                No pending reminder drafts. Click <strong>Generate Reminders</strong> to check if any follow-ups are due.
              </p>
              <button
                onClick={handleGenerate}
                disabled={generating}
                style={{
                  padding: '10px 24px', borderRadius: '8px', border: 'none',
                  background: 'var(--green)', color: 'white', cursor: 'pointer',
                  fontWeight: 700, fontSize: '14px'
                }}
              >
                {generating ? 'Generating…' : '✨ Generate Reminders'}
              </button>
            </div>
          )}

          {/* Draft cards */}
          {!loading && drafts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {drafts.map((draft, idx) => (
                <div key={draft.id} style={{ animationDelay: `${idx * 0.05}s` }}>
                  <DraftCard
                    draft={draft}
                    isSelected={selected.has(draft.id)}
                    onSelect={toggleSelect}
                    onSendSingle={handleSendSingle}
                    onReject={handleReject}
                    onUpdate={handleUpdate}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="manual-note" style={{ minWidth: '220px', maxWidth: '260px' }}>
          <div style={{ background: 'var(--green)', color: 'white', display: 'grid', placeItems: 'center', fontSize: '20px' }}>🔔</div>
          <p className="eyebrow">Reminder Queue</p>
          <h3>How it works</h3>
          <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
            Gemini auto-generates follow-up emails for recruiters who haven't replied. Review, edit, then send.
          </p>

          {(reminder1Count > 0 || reminder2Count > 0) && (
            <div style={{ marginTop: '16px', borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: '16px' }}>
              {reminder1Count > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--ink)' }}>Follow-up #1</span>
                  <span style={{ background: '#fef9c3', color: '#854d0e', borderRadius: '999px', padding: '1px 10px', fontWeight: 700, fontSize: '12px' }}>{reminder1Count}</span>
                </div>
              )}
              {reminder2Count > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', color: 'var(--ink)' }}>Follow-up #2</span>
                  <span style={{ background: '#fee2e2', color: '#991b1b', borderRadius: '999px', padding: '1px 10px', fontWeight: 700, fontSize: '12px' }}>{reminder2Count}</span>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </section>
  )
}
