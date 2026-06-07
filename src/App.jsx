import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import { saveSecureApiKey, loadSecureApiKey, saveModelName, loadModelName, saveRateLimitSettings, loadRateLimitSettings } from './utils/secureStorage'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'
const MAX_FILE_SIZE = 20 * 1024 * 1024
const TERMINAL_STATUSES = new Set(['completed', 'failed'])
const STORAGE_KEY = 'recruitingest-recent-jobs'

const icons = {
  settings: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
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
  search: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  mail: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  ),
  building: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 21V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v16M8 7h5M8 11h5M8 15h5M2 21h20" />
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

function uploadDocument(file, apiKey, modelName, rateLimitEnabled, rateLimitRequests, rateLimitInterval, onProgress) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    const formData = new FormData()
    formData.append('file', file)

    request.open('POST', `${API_BASE_URL}/upload`)
    if (apiKey) {
      request.setRequestHeader('X-Gemini-API-Key', apiKey)
    }
    if (modelName) {
      request.setRequestHeader('X-Gemini-Model', modelName)
    }
    if (rateLimitEnabled) {
      request.setRequestHeader('X-Rate-Limit-Requests', String(rateLimitRequests))
      request.setRequestHeader('X-Rate-Limit-Interval', String(rateLimitInterval))
    }
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

async function searchRecruiters(filters = {}, page = 1, limit = 20) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => value?.trim() && params.set(key, value.trim()))
  params.set('page', page)
  params.set('limit', limit)
  const response = await fetch(`${API_BASE_URL}/recruiters?${params}`)
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'Could not search recruiters.')
  return payload
}

async function createRecruiter(recruiter) {
  const response = await fetch(`${API_BASE_URL}/recruiters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(recruiter),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'Could not add recruiter.')
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

function RecruiterDirectory({ refreshKey, onAddRecruiter }) {
  const [filters, setFilters] = useState({ q: '', company: '', email: '' })
  const [recruiters, setRecruiters] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const LIMIT = 20

  const runSearch = useCallback(async (nextFilters = filters, nextPage = 1) => {
    setLoading(true)
    setError('')
    try {
      const payload = await searchRecruiters(nextFilters, nextPage, LIMIT)
      setRecruiters(payload.recruiters || [])
      setTotal(payload.total || 0)
      setPage(payload.page || 1)
    } catch (searchError) {
      setError(searchError.message)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    runSearch({ q: '', company: '', email: '' }, 1)
  }, [refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateFilter = (field, value) => setFilters((current) => ({ ...current, [field]: value }))
  const clearFilters = () => {
    const empty = { q: '', company: '', email: '' }
    setFilters(empty)
    runSearch(empty, 1)
  }

  const totalPages = Math.ceil(total / LIMIT) || 1

  const handlePrevPage = () => {
    if (page > 1) {
      runSearch(filters, page - 1)
    }
  }

  const handleNextPage = () => {
    if (page < totalPages) {
      runSearch(filters, page + 1)
    }
  }

  return (
    <section className="directory-page">
      <div className="page-intro">
        <div>
          <p className="kicker"><span>02</span> Recruiter intelligence</p>
          <h1>Find the right <em>contact.</em></h1>
          <p>Search every recruiter collected from documents or added manually.</p>
        </div>
        <button className="compact-primary" type="button" onClick={onAddRecruiter}>{icons.plus} Add recruiter</button>
      </div>

      <form className="search-panel" onSubmit={(event) => { event.preventDefault(); runSearch(filters, 1) }}>
        <label className="main-search">
          {icons.search}
          <input value={filters.q} onChange={(event) => updateFilter('q', event.target.value)} placeholder="Search name, title, company, email, or gmail.com…" />
        </label>
        <div className="filter-row">
          <label>{icons.building}<input value={filters.company} onChange={(event) => updateFilter('company', event.target.value)} placeholder="Filter by company" /></label>
          <label>{icons.mail}<input value={filters.email} onChange={(event) => updateFilter('email', event.target.value)} placeholder="Filter by email or domain" /></label>
          <button className="search-button" type="submit">{icons.search} Search</button>
          <button className="clear-button" type="button" onClick={clearFilters}>Clear</button>
        </div>
      </form>

      <div className="results-head">
        <div><p className="eyebrow">Contact database</p><h2>{loading ? 'Searching…' : `${total} recruiter${total === 1 ? '' : 's'} found`}</h2></div>
        <span>Page {page} of {totalPages}</span>
      </div>
      {error && <div className="error-message" role="alert">{error}</div>}
      {!loading && !error && (
        recruiters.length ? (
          <>
            <div className="recruiter-grid">
              {recruiters.map((recruiter) => (
                <article className="recruiter-card" key={recruiter.id}>
                  <div className="avatar">{recruiter.recruiter_name?.split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase()}</div>
                  <div className="recruiter-main">
                    <div className="recruiter-name"><div><h3>{recruiter.recruiter_name}</h3><p>{recruiter.recruiter_title || 'Recruiter'}</p></div><span>{recruiter.source_file === 'manual-entry' ? 'Manual' : 'Ingested'}</span></div>
                    <div className="contact-lines">
                      <a href={`mailto:${recruiter.recruiter_email}`}>{icons.mail}{recruiter.recruiter_email}</a>
                      <p>{icons.building}{recruiter.company_name || 'Company not provided'}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="pagination-bar">
                <button 
                  type="button" 
                  disabled={page === 1} 
                  onClick={handlePrevPage}
                  className="pagination-btn"
                >
                  &larr; Previous
                </button>
                <span className="pagination-info">
                  Page <strong>{page}</strong> of <strong>{totalPages}</strong> <small>({total} total recruiters)</small>
                </span>
                <button 
                  type="button" 
                  disabled={page === totalPages} 
                  onClick={handleNextPage}
                  className="pagination-btn"
                >
                  Next &rarr;
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="empty-directory">{icons.search}<h3>No recruiters matched your search</h3><p>Try a company, email domain, name, or add a new recruiter manually.</p><button type="button" onClick={onAddRecruiter}>Add recruiter</button></div>
        )
      )}
    </section>
  )
}

function ManualRecruiterForm({ onCreated, onCancel }) {
  const emptyForm = { recruiter_name: '', recruiter_title: '', recruiter_email: '', company_name: '' }
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }))
  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const created = await createRecruiter(form)
      setSuccess(`${created.recruiter_name} was added to your recruiter directory.`)
      setForm(emptyForm)
      onCreated()
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="manual-page">
      <div className="page-intro">
        <div><p className="kicker"><span>03</span> Manual entry</p><h1>Add a recruiter <em>directly.</em></h1><p>Capture an individual contact without uploading a document.</p></div>
      </div>
      <div className="manual-layout">
        <form className="manual-form" onSubmit={submit}>
          <div className="section-heading"><div><p className="eyebrow">Contact details</p><h2>New recruiter</h2></div><span className="step-count">Required fields *</span></div>
          <div className="form-grid">
            <label><span>Recruiter name *</span><input required value={form.recruiter_name} onChange={(event) => updateField('recruiter_name', event.target.value)} placeholder="e.g. Maya Patel" /></label>
            <label><span>Job title</span><input value={form.recruiter_title} onChange={(event) => updateField('recruiter_title', event.target.value)} placeholder="e.g. Senior Technical Recruiter" /></label>
            <label><span>Email address *</span><input required type="email" value={form.recruiter_email} onChange={(event) => updateField('recruiter_email', event.target.value)} placeholder="maya@company.com" /></label>
            <label><span>Company</span><input value={form.company_name} onChange={(event) => updateField('company_name', event.target.value)} placeholder="e.g. Acme Labs" /></label>
          </div>
          {error && <div className="error-message" role="alert">{error}</div>}
          {success && <div className="success-message" role="status">{icons.check}{success}</div>}
          <div className="form-actions"><button className="clear-button" type="button" onClick={onCancel}>View directory</button><button className="compact-primary" disabled={saving} type="submit">{saving ? 'Saving…' : 'Add recruiter'} {icons.arrow}</button></div>
        </form>
        <aside className="manual-note"><div>{icons.user}</div><p className="eyebrow">Clean data by default</p><h3>Email addresses stay unique.</h3><p>If the recruiter already exists, RecruitIngest will let you know instead of creating a duplicate.</p></aside>
      </div>
    </section>
  )
}

function SettingsForm({ apiKey, modelName, rateLimitEnabled, rateLimitRequests, rateLimitInterval, onSave, onCancel }) {
  const [formKey, setFormKey] = useState(apiKey)
  const [formModel, setFormModel] = useState(modelName)
  const [customModel, setCustomModel] = useState('')
  const [limitEnabled, setLimitEnabled] = useState(rateLimitEnabled)
  const [limitRequests, setLimitRequests] = useState(rateLimitRequests)
  const [limitInterval, setLimitInterval] = useState(rateLimitInterval)
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const isCustomModel = !['gemini-3.5-flash', 'gemini-3.5-pro', 'gemini-3.5-flash-medium', 'gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-2.0-pro'].includes(formModel)

  const handleModelChange = (value) => {
    if (value === 'custom') {
      setFormModel('custom-model-placeholder')
      setCustomModel('')
    } else {
      setFormModel(value)
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setSuccess('')
    setError('')
    try {
      const finalModel = formModel === 'custom-model-placeholder' ? customModel.trim() : formModel
      if (formModel === 'custom-model-placeholder' && !customModel.trim()) {
        throw new Error('Please specify a custom model name.')
      }
      await onSave(formKey.trim(), finalModel, limitEnabled, limitRequests, limitInterval)
      setSuccess('Settings saved successfully and API key encrypted in secure storage.')
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="manual-page">
      <div className="page-intro">
        <div>
          <p className="kicker"><span>04</span> Configuration</p>
          <h1>Settings &amp; <em>Security</em></h1>
          <p>Configure your Google Gemini API Key and Model Name. The API Key is encrypted locally in your browser using AES-GCM 256.</p>
        </div>
      </div>
      <div className="manual-layout">
        <form className="manual-form" onSubmit={submit}>
          <div className="section-heading">
            <div>
              <p className="eyebrow">Credentials</p>
              <h2>Gemini API Configuration</h2>
            </div>
          </div>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
            <label>
              <span>Gemini API Key *</span>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  required
                  type={showKey ? 'text' : 'password'}
                  value={formKey}
                  onChange={(event) => setFormKey(event.target.value)}
                  placeholder="Enter your Gemini API key"
                  style={{ paddingRight: '48px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    border: '0',
                    background: 'none',
                    cursor: 'pointer',
                    fontSize: '12px',
                    color: 'var(--green)',
                    fontWeight: 'bold'
                  }}
                >
                  {showKey ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>

            <label>
              <span>Model Selection</span>
              <select
                value={['gemini-3.5-flash', 'gemini-3.5-pro', 'gemini-3.5-flash-medium', 'gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-2.0-pro'].includes(formModel) ? formModel : 'custom'}
                onChange={(event) => handleModelChange(event.target.value)}
              >
                <option value="gemini-3.5-flash">Gemini 3.5 Flash (Default)</option>
                <option value="gemini-3.5-pro">Gemini 3.5 Pro</option>
                <option value="gemini-3.5-flash-medium">Gemini 3.5 Flash (Medium)</option>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                <option value="gemini-2.0-pro">Gemini 2.0 Pro</option>
                <option value="custom">Custom Model...</option>
              </select>
            </label>

            {(formModel === 'custom-model-placeholder' || isCustomModel) && (
              <label>
                <span>Custom Model Identifier *</span>
                <input
                  required
                  value={formModel === 'custom-model-placeholder' ? customModel : formModel}
                  onChange={(event) => {
                    if (formModel === 'custom-model-placeholder') {
                      setCustomModel(event.target.value)
                    } else {
                      setFormModel(event.target.value)
                    }
                  }}
                  placeholder="e.g. gemini-1.5-ultra"
                />
              </label>
            )}

            <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px', cursor: 'pointer', marginTop: '10px' }}>
              <input
                type="checkbox"
                checked={limitEnabled}
                onChange={(event) => setLimitEnabled(event.target.checked)}
                style={{ width: '18px', height: '18px', minHeight: 'auto', accentColor: 'var(--green)', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--ink)', textTransform: 'none', letterSpacing: '0' }}>
                Enable Rate Limiting for Gemini API calls
              </span>
            </label>

            {limitEnabled && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '10px' }}>
                <label>
                  <span>Max Requests *</span>
                  <input
                    required
                    type="number"
                    min="1"
                    value={limitRequests}
                    onChange={(event) => setLimitRequests(Number(event.target.value))}
                    placeholder="e.g. 10"
                  />
                </label>
                <label>
                  <span>Time Interval</span>
                  <select
                    value={limitInterval}
                    onChange={(event) => setLimitInterval(Number(event.target.value))}
                  >
                    <option value="1">per second</option>
                    <option value="10">per 10 seconds</option>
                    <option value="60">per minute</option>
                  </select>
                </label>
              </div>
            )}
          </div>
          {error && <div className="error-message" role="alert">{error}</div>}
          {success && <div className="success-message" role="status">{icons.check}{success}</div>}
          <div className="form-actions">
            <button className="clear-button" type="button" onClick={onCancel}>Cancel</button>
            <button className="compact-primary" disabled={saving} type="submit">
              {saving ? 'Saving…' : 'Save configuration'} {icons.arrow}
            </button>
          </div>
        </form>
        <aside className="manual-note">
          <div style={{ background: 'var(--green)', color: 'white', display: 'grid', placeItems: 'center', fontSize: '20px' }}>🔑</div>
          <p className="eyebrow">Local Encryption</p>
          <h3>Your keys stay yours.</h3>
          <p>We use the standard Web Crypto API (AES-GCM 256) to store your keys. The decryption key is generated on this machine, stored in a non-extractable IndexedDB database, and never sent to any server except the ingestion endpoint when processing documents.</p>
        </aside>
      </div>
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
  const [activeView, setActiveView] = useState('ingest')
  const [apiKey, setApiKey] = useState('')
  const [modelName, setModelName] = useState('gemini-3.5-flash')
  const [rateLimitEnabled, setRateLimitEnabled] = useState(false)
  const [rateLimitRequests, setRateLimitRequests] = useState(10)
  const [rateLimitInterval, setRateLimitInterval] = useState(60)

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
  const [directoryRefresh, setDirectoryRefresh] = useState(0)
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
    if (!TERMINAL_STATUSES.has(recentJob.status)) pollJob(recentJob.job_id, recentJob.file_name)
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
        <div className="topbar-spacer" />
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
        {activeView === 'ingest' && <>
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
        </>}
      </main>

      <footer><Brand /><p>Built for fast, reliable recruiter data ingestion.</p><span>© 2026 RecruitIngest</span></footer>
    </div>
  )
}

export default App
