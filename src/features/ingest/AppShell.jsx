import React, { useCallback, useEffect, useRef, useState } from 'react'
import { icons } from '../../components/icons'
import { Brand } from '../../components/Brand'
import { StatusBadge } from '../../components/StatusBadge'
import { JobProgress } from './JobProgress'
import { RecruiterDirectory } from '../directory/RecruiterDirectory'
import { ManualRecruiterForm } from '../directory/ManualRecruiterForm'
import { SettingsForm } from '../settings/SettingsForm'
import { SendPitch } from '../outreach/SendPitch'
import { ResumeForm } from '../outreach/ResumeForm'
import { PromptForm } from '../outreach/PromptForm'
import { SentEmails } from '../outreach/SentEmails'
import { RemindersInbox } from '../outreach/RemindersInbox'
import { LinkedInCRM } from '../outreach/LinkedInCRM'
import { LinkedInPeopleTracker } from '../outreach/LinkedInPeopleTracker'
import { JobScout } from '../jobscout/JobScout'
import { loadProspeoApiKey } from '../../utils/secureStorage'
import { formatBytes, formatTime } from '../../utils/formatters'
import { validateFile } from '../../utils/validation'
import { uploadDocument, fetchJob, fetchRecentJobs } from '../../services/api'

const TERMINAL_STATUSES = new Set(['completed', 'failed'])

export function AppShell({ user, logout }) {
  const inputRef = useRef(null)
  const pollTimer = useRef(null)
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [job, setJob] = useState(null)
  const [activeView, setActiveView] = useState(() => {
    const hash = window.location.hash.replace('#', '')
    return hash || 'ingest'
  })

  // Sync state from URL hash
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '')
      if (hash && hash !== activeView) {
        setActiveView(hash)
      }
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [activeView])

  // Sync URL hash from state
  useEffect(() => {
    if (window.location.hash.replace('#', '') !== activeView) {
      window.location.hash = activeView
    }
  }, [activeView])

  const [directoryRefresh, setDirectoryRefresh] = useState(0)
  const [recentJobs, setRecentJobs] = useState([])

  const loadRecentJobs = useCallback(async () => {
    try {
      const data = await fetchRecentJobs()
      setRecentJobs(data || [])
    } catch (err) {
      console.error('Failed to load recent jobs:', err)
    }
  }, [])

  useEffect(() => {
    if (activeView === 'ingest') {
      loadRecentJobs()
    }
  }, [activeView, loadRecentJobs])



  const pollJob = useCallback(async (jobId, fileName) => {
    try {
      const nextJob = await fetchJob(jobId)
      setJob(nextJob)
      loadRecentJobs()
      if (!TERMINAL_STATUSES.has(nextJob.status)) {
        pollTimer.current = window.setTimeout(() => pollJob(jobId, fileName), 1800)
      }
    } catch (pollError) {
      setError(pollError.message)
      pollTimer.current = window.setTimeout(() => pollJob(jobId, fileName), 4000)
    }
  }, [loadRecentJobs])

  useEffect(() => () => window.clearTimeout(pollTimer.current), [])

  const chooseFile = (nextFile) => {
    const validationError = validateFile(nextFile)
    setError(validationError)
    if (!validationError) setFile(nextFile)
  }

  const startUpload = async () => {
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setError('')
    setUploading(true)
    setUploadProgress(0)
    try {
      const response = await uploadDocument(file, setUploadProgress)
      const initialJob = { job_id: response.job_id, status: response.status, total_chunks: 0, processed_chunks: 0 }
      setJob(initialJob)
      loadRecentJobs()
      pollJob(response.job_id, file.name)
    } catch (uploadError) {
      setError(uploadError.message)
    } finally {
      setUploading(false)
    }
  }

  const reset = () => {
    window.clearTimeout(pollTimer.current)
    setFile(null)
    setJob(null)
    setError('')
    setUploadProgress(0)
  }

  const reopenJob = (recentJob) => {
    window.clearTimeout(pollTimer.current)
    setFile({ name: recentJob.file_name, size: 0, type: 'application/pdf' })
    setJob(recentJob)
    setError('')
    if (!TERMINAL_STATUSES.has(recentJob.status)) {
      pollJob(recentJob.job_id, recentJob.file_name)
    }
  }

  const [menuOpen, setMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('ri_sidebar_collapsed') === 'true'
  })

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('ri_sidebar_collapsed', String(next))
      return next
    })
  }

  const groupedNavigation = [
    {
      group: 'Data & Workspace',
      items: [
        { id: 'ingest', label: 'Ingest PDF', icon: icons.upload },
        { id: 'directory', label: 'Recruiter Contacts', icon: icons.search },
        { id: 'manual', label: 'Add Contact', icon: icons.plus },
      ]
    },
    {
      group: 'Outreach',
      items: [
        { id: 'outreach', label: 'Send Pitch', icon: icons.mail },
        { id: 'sent', label: 'Sent Emails', icon: icons.check },
        { id: 'reminders', label: 'Reminders', icon: icons.bell },
      ]
    },
    {
      group: 'LinkedIn',
      items: [
        { id: 'linkedin_crm', label: 'CRM Dashboard', icon: icons.user },
        { id: 'linkedin_people', label: 'Network Tracker', icon: icons.users },
      ]
    },
    {
      group: 'Configuration',
      items: [
        { id: 'prompt', label: 'Outreach Prompt', icon: icons.prompt },
        { id: 'resume', label: 'My Resume', icon: icons.file },
        { id: 'settings', label: 'Settings', icon: icons.settings },
      ]
    },
    {
      group: 'Intelligence',
      items: [
        { id: 'job_scout', label: 'Job Scout', icon: icons.search },
      ]
    }
  ]

  const [expandedGroups, setExpandedGroups] = useState(() => {
    const activeGroup = groupedNavigation.find(g => g.items.some(i => i.id === activeView))
    return { [activeGroup ? activeGroup.group : 'Data & Workspace']: true }
  })

  useEffect(() => {
    const activeGroup = groupedNavigation.find(g => g.items.some(i => i.id === activeView))
    if (activeGroup && !expandedGroups[activeGroup.group]) {
      setExpandedGroups(prev => ({ ...prev, [activeGroup.group]: true }))
    }
  }, [activeView])

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }))
  }

  return (
    <div className={`app-container ${menuOpen ? 'sidebar-open' : ''} ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Mobile Topbar Header */}
      <header className="mobile-header">
        <Brand />
        <button 
          className="menu-toggle" 
          onClick={() => setMenuOpen(!menuOpen)} 
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          {menuOpen ? icons.close : icons.menu}
        </button>
      </header>

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${menuOpen ? 'is-open' : ''}`}>
        <div className="sidebar-brand">
          <Brand />
          <button 
            className="collapse-toggle" 
            onClick={toggleSidebar} 
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {icons.arrow}
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Sidebar navigation">
          {groupedNavigation.map((group) => {
            const isExpanded = expandedGroups[group.group]
            return (
              <div key={group.group} className="nav-group">
                <button 
                  className="nav-group-toggle" 
                  onClick={() => toggleGroup(group.group)}
                  aria-expanded={isExpanded}
                >
                  <span>{group.group}</span>
                  <div className={`nav-group-chevron ${isExpanded ? 'expanded' : ''}`}>
                    {icons.arrow}
                  </div>
                </button>
                <div className="nav-group-items" style={{ display: isExpanded ? 'flex' : 'none' }}>
                  {group.items.map((item) => (
                    <button 
                      key={item.id}
                      className={`nav-item ${activeView === item.id ? 'is-active' : ''}`} 
                      type="button" 
                      onClick={() => { 
                        setActiveView(item.id)
                        setMenuOpen(false)
                      }}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </nav>
        
        <div className="sidebar-footer">
          <div className="user-profile">
            {user.picture ? (
              <img className="user-avatar" src={user.picture} alt={user.name} referrerPolicy="no-referrer" />
            ) : (
              <div className="user-avatar-fallback" aria-hidden="true">
                {user.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="user-details">
              <span className="user-name">{user.name}</span>
              <span className="user-email">{user.email}</span>
            </div>
            <button className="logout-btn" type="button" onClick={logout} aria-label="Sign out">
              {icons.logout}
            </button>
          </div>
        </div>
      </aside>

      {/* Sidebar Backdrop Overlay on Mobile */}
      {menuOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setMenuOpen(false)} 
          role="presentation"
        />
      )}

      {/* Main Content Area */}
      <div className="content-container">
        <main>
          {activeView === 'directory' && <RecruiterDirectory refreshKey={directoryRefresh} onAddRecruiter={() => setActiveView('manual')} />}
          {activeView === 'manual' && <ManualRecruiterForm onCreated={() => setDirectoryRefresh((value) => value + 1)} onCancel={() => setActiveView('directory')} />}
          {activeView === 'outreach' && <SendPitch onGoToResume={() => setActiveView('resume')} onGoToSentEmails={() => setActiveView('sent')} />}
          {activeView === 'sent' && <SentEmails user={user} />}
          {activeView === 'reminders' && <RemindersInbox />}
          {activeView === 'linkedin_crm' && <LinkedInCRM /> }
          {activeView === 'linkedin_people' && <LinkedInPeopleTracker /> }
          {activeView === 'resume' && <ResumeForm />}
          {activeView === 'prompt' && <PromptForm />}
          {activeView === 'job_scout' && <JobScout user={user} />}
          {activeView === 'settings' && (
            <SettingsForm onCancel={() => setActiveView('ingest')} />
          )}
          {activeView === 'ingest' && (
            <>
              <section className="hero">
                <div className="hero-copy">
                  <p className="kicker"><span>01</span> Document ingestion workspace</p>
                  <h1>Turn recruiter PDFs into <em>structured data.</em></h1>
                  <p>Upload a document and let RecruitIngest extract, organize, and safely deduplicate every recruiter contact.</p>
                  <div className="trust-row">
                    <span>{icons.check} Gemini-powered extraction</span>
                    <span>{icons.check} Deduplication by email</span>
                    <span>{icons.check} Up to 20 MB</span>
                  </div>
                </div>
                <p className="hero-number" aria-hidden="true">Re<span>cr</span></p>
              </section>

              <section className="workspace-grid">
                <div>
                  {!job ? (
                    <section className="upload-card">
                      <div className="section-heading">
                        <div>
                          <p className="eyebrow">Step one</p>
                          <h2>Upload your document</h2>
                        </div>
                        <span className="step-count">PDF only · Max 20 MB</span>
                      </div>

                      <div
                        role="button"
                        tabIndex={0}
                        aria-label="Drop zone for PDF upload"
                        className={`dropzone ${dragging ? 'is-dragging' : ''} ${file ? 'has-file' : ''}`}
                        onClick={() => !file && inputRef.current?.click()}
                        onKeyDown={(event) => event.key === 'Enter' && !file && inputRef.current?.click()}
                        onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={(event) => {
                          event.preventDefault()
                          setDragging(false)
                          chooseFile(event.dataTransfer.files[0])
                        }}
                      >
                        <input
                          ref={inputRef}
                          type="file"
                          accept=".pdf,application/pdf"
                          aria-label="Select PDF file"
                          onChange={(event) => chooseFile(event.target.files[0])}
                          style={{ display: 'none' }}
                        />
                        {file ? (
                          <div className="selected-file">
                            <div className="file-icon">{icons.file}</div>
                            <div>
                              <strong>{file.name}</strong>
                              <span>{formatBytes(file.size)}</span>
                            </div>
                            <button
                              type="button"
                              aria-label="Remove selected file"
                              onClick={(event) => { event.stopPropagation(); setFile(null); setError('') }}
                            >
                              {icons.close}
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="upload-icon" aria-hidden="true">{icons.upload}<span /></div>
                            <h3>Drag a PDF here</h3>
                            <p>or <button type="button">browse your files</button></p>
                            <span className="file-limit">PDF · MAX 20 MB</span>
                          </>
                        )}
                      </div>

                      {error && <div className="error-message" role="alert">{error}</div>}

                      {uploading && (
                        <div className="uploading-row">
                          <span>Uploading securely</span>
                          <div><i style={{ width: `${uploadProgress}%` }} /></div>
                          <strong>{uploadProgress}%</strong>
                        </div>
                      )}

                      <button className="primary-button" type="button" disabled={!file || uploading} onClick={startUpload}>
                        <span>{uploading ? 'Sending document…' : 'Start ingestion'}</span>{icons.arrow}
                      </button>
                    </section>
                  ) : (
                    <JobProgress job={job} fileName={file?.name} onReset={reset} />
                  )}
                </div>

                <aside className="side-column">
                  <section className="process-card">
                    <p className="eyebrow">What happens next</p>
                    <ol>
                      <li><span>01</span><div><strong>Extract</strong><p>Read every page and prepare clean text.</p></div></li>
                      <li><span>02</span><div><strong>Structure</strong><p>Identify recruiter names, roles, emails, and companies.</p></div></li>
                      <li><span>03</span><div><strong>Store</strong><p>Save new contacts and skip duplicates safely.</p></div></li>
                    </ol>
                  </section>

                  <section className="recent-card">
                    <div className="recent-head">
                      <div>
                        <p className="eyebrow">Your account</p>
                        <h3>Recent jobs</h3>
                      </div>
                      <button 
                        type="button" 
                        onClick={loadRecentJobs} 
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          padding: '6px', 
                          cursor: 'pointer', 
                          display: 'grid', 
                          placeItems: 'center',
                          color: 'var(--muted)',
                          borderRadius: '4px',
                          transition: 'background 0.2s, color 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--green-pale)'; e.currentTarget.style.color = 'var(--green)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--muted)' }}
                        aria-label="Refresh jobs list"
                      >
                        {icons.refresh}
                      </button>
                    </div>
                    {recentJobs.length ? (
                      <div className="recent-list">
                        {recentJobs.map((recentJob) => (
                          <button type="button" key={recentJob.job_id} onClick={() => reopenJob(recentJob)}>
                            <span className="mini-file">{icons.file}</span>
                            <span><strong>{recentJob.file_name}</strong><small>{formatTime(recentJob.updated_at || recentJob.created_at)}</small></span>
                            <StatusBadge status={recentJob.status} />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-recent"><span>{icons.file}</span><p>Your latest ingestion jobs will appear here.</p></div>
                    )}
                  </section>
                </aside>
              </section>
            </>
          )}
        </main>

        <footer>
          <Brand />
          <p>Built for fast, reliable recruiter data ingestion.</p>
          <span>© 2026 RecruitIngest</span>
        </footer>
      </div>
    </div>
  )
}
