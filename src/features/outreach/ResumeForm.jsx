import React, { useState, useEffect, useRef } from 'react'
import { icons } from '../../components/icons'
import { apiFetch, getJobStatus } from '../../services/api'

export function ResumeForm() {
  const fileInputRef = useRef(null)
  const [resume, setResume] = useState(null)
  const [driveLink, setDriveLink] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [parsing, setParsing] = useState(false)

  useEffect(() => {
    async function loadResume() {
      try {
        const data = await apiFetch('/resume')
        setResume(data)
        setDriveLink(data.drive_link || '')
      } catch (err) {
        console.error('Failed to load resume:', err)
      } finally {
        setLoading(false)
      }
    }
    loadResume()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const formData = new FormData()
      if (file) {
        formData.append('file', file)
      }
      formData.append('drive_link', driveLink)

      const data = await apiFetch('/resume', {
        method: 'POST',
        body: formData,
      })

      if (data.job_id) {
        setParsing(true)
        pollParsingJob(data.job_id)
      } else {
        setResume(data)
        setFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
        setSuccess('Resume configuration saved successfully!')
        setSaving(false)
      }
    } catch (err) {
      setError(err.message || 'Failed to save resume')
      setSaving(false)
    }
  }

  const pollParsingJob = async (jobId) => {
    try {
      const job = await getJobStatus(jobId)
      if (job.status === 'completed') {
        setResume(job.result?.json || {})
        setFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
        setSuccess('Resume parsed and saved successfully!')
        setParsing(false)
        setSaving(false)
      } else if (job.status === 'failed') {
        setError(job.error_message || 'Failed to parse resume')
        setParsing(false)
        setSaving(false)
      } else {
        setTimeout(() => pollParsingJob(jobId), 3000)
      }
    } catch (err) {
      setError(err.message || 'Failed to check parsing status')
      setParsing(false)
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '300px' }}>
        <div className="app-loading-spinner" />
      </div>
    )
  }

  return (
    <section className="manual-page">
      <div className="page-intro">
        <div>
          <p className="kicker"><span>05</span> Profile Setup</p>
          <h1>My <em>Resume</em></h1>
          <p>Provide your resume PDF and Google Drive link so they can be included in recruiter outreaches.</p>
        </div>
      </div>

      <div className="manual-layout">
        <form className="manual-form" onSubmit={handleSubmit}>
          <div className="section-heading">
            <div>
              <p className="eyebrow">Resume details</p>
              <h2>Google Drive &amp; PDF Upload</h2>
            </div>
          </div>

          <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
            <label>
              <span>Resume Google Drive Link *</span>
              <input
                required
                type="url"
                value={driveLink}
                onChange={(e) => setDriveLink(e.target.value)}
                placeholder="https://drive.google.com/file/d/..."
              />
              <small style={{ color: 'var(--muted)', marginTop: '4px', display: 'block' }}>
                Make sure the link sharing is set to "Anyone with the link can view".
              </small>
            </label>

            <label>
              <span>Resume PDF File (Optional)</span>
              <div 
                className="dropzone" 
                style={{ minHeight: '130px', cursor: 'pointer' }}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  style={{ display: 'none' }}
                  onChange={(e) => setFile(e.target.files[0])}
                />
                {file ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '24px' }}>📄</span>
                    <div style={{ textAlign: 'left' }}>
                      <strong>{file.name}</strong>
                      <span style={{ display: 'block', fontSize: '12px', color: 'var(--muted)' }}>
                        Ready to upload
                      </span>
                    </div>
                  </div>
                ) : resume?.has_pdf ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '24px', color: 'var(--green)' }}>✅</span>
                    <div style={{ textAlign: 'left' }}>
                      <strong>{resume.resume_filename}</strong>
                      <span style={{ display: 'block', fontSize: '12px', color: 'var(--muted)' }}>
                        Currently stored on server (Click to change)
                      </span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>📤</span>
                    <span>Click to select PDF resume</span>
                  </div>
                )}
              </div>
            </label>
          </div>

          {error && <div className="error-message" role="alert">{error}</div>}
          {success && <div className="success-message" role="status">{icons.check} {success}</div>}

          <div className="form-actions">
            <button className="compact-primary" disabled={saving || parsing} type="submit">
              {parsing ? '⏳ Parsing in background...' : saving ? 'Saving…' : 'Save Resume'} {(!parsing && !saving) && icons.arrow}
            </button>
          </div>
        </form>

        <aside className="manual-note">
          <div style={{ background: 'var(--green)', color: 'white', display: 'grid', placeItems: 'center', fontSize: '20px' }}>📄</div>
          <p className="eyebrow">Outreach Attachment</p>
          <h3>How it is used</h3>
          <p>
            When you initiate a recruiter pitch, the system will use the Gemini AI to draft a personalized email body that naturally includes your **Google Drive link**. If a **PDF file** is uploaded here, it will also be attached directly to the email as a file attachment, maximizing response rates.
          </p>
        </aside>
      </div>
    </section>
  )
}
