import React, { useCallback, useEffect, useRef, useState } from 'react'
import { icons } from '../../components/icons'
import { Brand } from '../../components/Brand'
import { StatusBadge } from '../../components/StatusBadge'
import { JobProgress } from './JobProgress'
import { RecruiterDirectory } from '../directory/RecruiterDirectory'
import { ManualRecruiterForm } from '../directory/ManualRecruiterForm'
import { SettingsForm } from '../settings/SettingsForm'
import {
  saveSecureApiKey,
  loadSecureApiKey,
  saveModelName,
  loadModelName,
  saveRateLimitSettings,
  loadRateLimitSettings
} from '../../utils/secureStorage'
import { formatBytes, formatTime } from '../../utils/formatters'
import { validateFile } from '../../utils/validation'
import { uploadDocument, fetchJob } from '../../services/api'

const TERMINAL_STATUSES = new Set(['completed', 'failed'])
const STORAGE_KEY = 'recruitingest-recent-jobs'

export function AppShell({ user, logout }) {
  const inputRef = useRef(null)
  const pollTimer = useRef(null)
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [job, setJob] = useState(null)
  const [activeView, setActiveView] = useState('ingest')
  const [apiKey, setApiKey] = useState('')
  const [modelName, setModelName] = useState('gemini-3.5-flash')
  const [rateLimitEnabled, setRateLimitEnabled] = useState(false)
  const [rateLimitRequests, setRateLimitRequests] = useState(10)
  const [rateLimitInterval, setRateLimitInterval] = useState(60)
  const [directoryRefresh, setDirectoryRefresh] = useState(0)
  const [recentJobs, setRecentJobs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
    } catch {
      return []
    }
  })

  useEffect(() => {
    async function loadSettings() {
      try {
        const savedKey = await loadSecureApiKey()
        const savedModel = loadModelName()
        if (savedKey) setApiKey(savedKey)
        if (savedModel) setModelName(savedModel)
        
        const rateLimit = loadRateLimitSettings()
        setRateLimitEnabled(rateLimit.enabled)
        setRateLimitRequests(rateLimit.requests)
        setRateLimitInterval(rateLimit.interval)
      } catch (e) {
        console.error('Failed to load settings:', e)
      }
    }
    loadSettings()
  }, [])

  const saveRecentJob = useCallback((nextJob, nextFileName) => {
    setRecentJobs((current) => {
      const entry = { ...nextJob, file_name: nextFileName || 'Recruiter document' }
      const next = [entry, ...current.filter((item) => item.job_id !== nextJob.job_id)].slice(0, 4)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const pollJob = useCallback(async (jobId, fileName) => {
    try {
      const nextJob = await fetchJob(jobId)
      setJob(nextJob)
      saveRecentJob(nextJob, fileName)
      if (!TERMINAL_STATUSES.has(nextJob.status)) {
        pollTimer.current = window.setTimeout(() => pollJob(jobId, fileName), 1800)
      }
    } catch (pollError) {
      setError(pollError.message)
      pollTimer.current = window.setTimeout(() => pollJob(jobId, fileName), 4000)
    }
  }, [saveRecentJob])

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

    if (!apiKey) {
      setError('Gemini API key is required. Please set it in Settings.')
      return
    }

    setError('')
    setUploading(true)
    setUploadProgress(0)
    try {
      const response = await uploadDocument(file, apiKey, modelName, rateLimitEnabled, rateLimitRequests, rateLimitInterval, setUploadProgress)
      const initialJob = { job_id: response.job_id, status: response.status, total_chunks: 0, processed_chunks: 0 }
      setJob(initialJob)
      saveRecentJob(initialJob, file.name)
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

  return (
    <div className="app-shell">
      <header className="topbar">
        <Brand />
        <nav className="main-nav" aria-label="Main navigation">
          <button className={activeView === 'ingest' ? 'is-active' : ''} type="button" onClick={() => setActiveView('ingest')}>{icons.upload} Ingest</button>
          <button className={activeView === 'directory' ? 'is-active' : ''} type="button" onClick={() => setActiveView('directory')}>{icons.search} Recruiters</button>
          <button className={activeView === 'manual' ? 'is-active' : ''} type="button" onClick={() => setActiveView('manual')}>{icons.plus} Add</button>
          <button className={activeView === 'settings' ? 'is-active' : ''} type="button" onClick={() => setActiveView('settings')}>{icons.settings} Settings</button>
        </nav>
        <div className="user-chip" aria-label="Signed-in user">
          {user.picture
            ? <img className="user-avatar" src={user.picture} alt={user.name} referrerPolicy="no-referrer" />
            : <div className="user-avatar-fallback" aria-hidden="true">{user.name?.charAt(0).toUpperCase()}</div>
          }
          <button className="logout-btn" type="button" onClick={logout} aria-label="Sign out">
            Sign out
          </button>
        </div>
      </header>

      <main>
        {activeView === 'directory' && <RecruiterDirectory refreshKey={directoryRefresh} onAddRecruiter={() => setActiveView('manual')} />}
        {activeView === 'manual' && <ManualRecruiterForm onCreated={() => setDirectoryRefresh((value) => value + 1)} onCancel={() => setActiveView('directory')} />}
        {activeView === 'settings' && (
          <SettingsForm
            apiKey={apiKey}
            modelName={modelName}
            rateLimitEnabled={rateLimitEnabled}
            rateLimitRequests={rateLimitRequests}
            rateLimitInterval={rateLimitInterval}
            onSave={async (newKey, newModel, enabled, requests, interval) => {
              await saveSecureApiKey(newKey)
              saveModelName(newModel)
              saveRateLimitSettings(enabled, requests, interval)
              setApiKey(newKey)
              setModelName(newModel)
              setRateLimitEnabled(enabled)
              setRateLimitRequests(requests)
              setRateLimitInterval(interval)
            }}
            onCancel={() => setActiveView('ingest')}
          />
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
                  <div className="recent-head"><div><p className="eyebrow">This device</p><h3>Recent jobs</h3></div>{icons.refresh}</div>
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

      <footer><Brand /><p>Built for fast, reliable recruiter data ingestion.</p><span>© 2026 RecruitIngest</span></footer>
    </div>
  )
}
