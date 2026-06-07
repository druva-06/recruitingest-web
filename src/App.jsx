import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'
const MAX_FILE_SIZE = 20 * 1024 * 1024
const TERMINAL_STATUSES = new Set(['completed', 'failed'])
const STORAGE_KEY = 'recruitingest-recent-jobs'

const icons = {
  upload: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
    </svg>
  ),
  file: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12 4 4L19 6" />
    </svg>
  ),
  arrow: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  ),
  refresh: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 12a8 8 0 1 1-2.34-5.66L20 8M20 4v4h-4" />
    </svg>
  ),
}

function formatBytes(bytes) {
  if (!bytes) return '0 KB'
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatTime(value) {
  if (!value) return 'Just now'
  const normalized = value.includes('T') ? value : value.replace(' ', 'T')
  const date = new Date(normalized)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(date)
}

function validateFile(file) {
  if (!file) return 'Choose a PDF file to continue.'
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    return 'Only PDF documents are supported.'
  }
  if (file.size > MAX_FILE_SIZE) return 'This file is larger than the 20 MB limit.'
  return ''
}

function uploadDocument(file, onProgress) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    const formData = new FormData()
    formData.append('file', file)

    request.open('POST', `${API_BASE_URL}/upload`)
    request.responseType = 'json'
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100))
    }
    request.onload = () => {
      const response = request.response || {}
      if (request.status >= 200 && request.status < 300) resolve(response)
      else reject(new Error(response.error || 'The upload could not be started.'))
    }
    request.onerror = () => reject(new Error('Could not connect to the ingestion service.'))
    request.send(formData)
  })
}

async function fetchJob(jobId) {
  const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`)
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'Could not refresh job progress.')
  return payload
}

function Brand() {
  return (
    <a className="brand" href="/" aria-label="RecruitIngest home">
      <span className="brand-mark">
        <span />
        <span />
        <span />
      </span>
      <span>Recruit<span>Ingest</span></span>
    </a>
  )
}

function StatusBadge({ status = 'pending' }) {
  return (
    <span className={`status-badge status-${status}`}>
      <span className="status-dot" />
      {status}
    </span>
  )
}

function JobProgress({ job, fileName, onReset }) {
  const total = job?.total_chunks || 0
  const processed = job?.processed_chunks || 0
  const percent = job?.status === 'completed' ? 100 : total ? Math.round((processed / total) * 100) : 8
  const isDone = job?.status === 'completed'
  const isFailed = job?.status === 'failed'

  return (
    <section className={`progress-card ${isDone ? 'is-complete' : ''} ${isFailed ? 'is-failed' : ''}`} aria-live="polite">
      <div className="progress-card-head">
        <div className="file-icon">{isDone ? icons.check : icons.file}</div>
        <div>
          <p className="eyebrow">{isDone ? 'Ingestion complete' : isFailed ? 'Ingestion stopped' : 'Processing document'}</p>
          <h2>{fileName || 'Recruiter document'}</h2>
        </div>
        <StatusBadge status={job?.status} />
      </div>

      <div className="progress-visual">
        <div className="progress-meta">
          <span>{isDone ? 'Ready in your database' : isFailed ? 'Review the service logs and try again' : 'Extracting recruiter contacts'}</span>
          <strong>{percent}%</strong>
        </div>
        <div className="progress-track">
          <span style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div className="progress-stats">
        <div><span>Chunks processed</span><strong>{processed}<small> / {total || '—'}</small></strong></div>
        <div><span>Job started</span><strong>{formatTime(job?.created_at)}</strong></div>
        <div><span>Job reference</span><strong className="job-reference">{job?.job_id?.slice(0, 8) || 'Creating'}</strong></div>
      </div>

      <button className="secondary-button" type="button" onClick={onReset}>
        {icons.upload} Upload another document
      </button>
    </section>
  )
}

function App() {
  const inputRef = useRef(null)
  const pollTimer = useRef(null)
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [job, setJob] = useState(null)
  const [recentJobs, setRecentJobs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
    } catch {
      return []
    }
  })

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

    setError('')
    setUploading(true)
    setUploadProgress(0)
    try {
      const response = await uploadDocument(file, setUploadProgress)
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
    if (!TERMINAL_STATUSES.has(recentJob.status)) pollJob(recentJob.job_id, recentJob.file_name)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Brand />
        <div className="topbar-actions">
          <span className="service-status"><span /> Ingestion service ready</span>
          <a href="https://github.com/druva-06/recruitingest-web" target="_blank" rel="noreferrer">GitHub</a>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="kicker"><span>01</span> Document ingestion workspace</p>
            <h1>Turn recruiter PDFs into <em>structured data.</em></h1>
            <p>Upload a document and let RecruitIngest extract, organize, and safely deduplicate every recruiter contact.</p>
            <div className="trust-row">
              <span>{icons.check} Secure PDF processing</span>
              <span>{icons.check} Live job progress</span>
              <span>{icons.check} Automatic deduplication</span>
            </div>
          </div>
          <div className="hero-number" aria-hidden="true">RI<span>01</span></div>
        </section>

        <section className="workspace-grid">
          <div className="primary-column">
            {!job ? (
              <section className="upload-card">
                <div className="section-heading">
                  <div><p className="eyebrow">New ingestion</p><h2>Upload your document</h2></div>
                  <span className="step-count">Step 1 of 1</span>
                </div>

                <div
                  className={`dropzone ${dragging ? 'is-dragging' : ''} ${file ? 'has-file' : ''}`}
                  onDragEnter={(event) => { event.preventDefault(); setDragging(true) }}
                  onDragOver={(event) => event.preventDefault()}
                  onDragLeave={(event) => { event.preventDefault(); setDragging(false) }}
                  onDrop={(event) => {
                    event.preventDefault()
                    setDragging(false)
                    chooseFile(event.dataTransfer.files[0])
                  }}
                  onClick={() => !file && inputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => event.key === 'Enter' && inputRef.current?.click()}
                >
                  <input ref={inputRef} type="file" accept=".pdf,application/pdf" onChange={(event) => chooseFile(event.target.files[0])} />
                  {file ? (
                    <div className="selected-file">
                      <div className="file-icon">{icons.file}</div>
                      <div><strong>{file.name}</strong><span>{formatBytes(file.size)} · PDF document</span></div>
                      <button type="button" aria-label="Remove selected file" onClick={(event) => { event.stopPropagation(); setFile(null); setError('') }}>{icons.close}</button>
                    </div>
                  ) : (
                    <>
                      <div className="upload-icon">{icons.upload}<span /></div>
                      <h3>Drop your recruiter PDF here</h3>
                      <p>or <button type="button" onClick={(event) => { event.stopPropagation(); inputRef.current?.click() }}>browse your files</button></p>
                      <span className="file-limit">PDF only · Maximum 20 MB</span>
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
      </main>

      <footer><Brand /><p>Built for fast, reliable recruiter data ingestion.</p><span>© 2026 RecruitIngest</span></footer>
    </div>
  )
}

export default App
