import React, { useState } from 'react'
import { icons } from '../../components/icons'
import { apiFetch } from '../../services/api'

export function SendPitch({ onGoToResume }) {
  const [step, setStep] = useState('form') // 'form', 'select_recruiter', 'success'
  const [jobDescription, setJobDescription] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [recruiterEmail, setRecruiterEmail] = useState('')
  const [recruiterName, setRecruiterName] = useState('')
  const [recruiterTitle, setRecruiterTitle] = useState('')

  // Search results step
  const [matchingRecruiters, setMatchingRecruiters] = useState([])
  const [customRecruiterMode, setCustomRecruiterMode] = useState(false)
  const [customEmail, setCustomEmail] = useState('')
  const [customName, setCustomName] = useState('')
  const [customTitle, setCustomTitle] = useState('')

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successData, setSuccessData] = useState(null)

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (recruiterEmail.trim()) {
        // Direct sending
        await executeSend(recruiterEmail.trim(), recruiterName.trim(), recruiterTitle.trim())
      } else {
        // Company search
        const response = await apiFetch('/outreach/search-recruiters', {
          method: 'POST',
          body: { company_name: companyName.trim() },
        })
        setMatchingRecruiters(response.recruiters || [])
        if (response.recruiters && response.recruiters.length > 0) {
          setStep('select_recruiter')
          setCustomRecruiterMode(false)
        } else {
          // No recruiters found, prompt manual input immediately
          setStep('select_recruiter')
          setCustomRecruiterMode(true)
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to search recruiters')
    } finally {
      setLoading(false)
    }
  }

  const executeSend = async (email, name, title) => {
    setLoading(true)
    setError('')
    try {
      const response = await apiFetch('/outreach/send-pitch', {
        method: 'POST',
        body: {
          job_description: jobDescription,
          company_name: companyName,
          recruiter_email: email,
          recruiter_name: name,
          recruiter_title: title,
        },
      })
      setSuccessData(response)
      setStep('success')
    } catch (err) {
      setError(err.message || 'Failed to send outreach email')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectRecruiter = (recruiter) => {
    executeSend(recruiter.recruiter_email, recruiter.recruiter_name, recruiter.recruiter_title)
  }

  const handleSendCustom = (e) => {
    e.preventDefault()
    if (!customEmail.trim()) {
      setError('Please provide a valid recruiter email')
      return
    }
    executeSend(customEmail.trim(), customName.trim(), customTitle.trim())
  }

  const reset = () => {
    setStep('form')
    setJobDescription('')
    setCompanyName('')
    setRecruiterEmail('')
    setRecruiterName('')
    setRecruiterTitle('')
    setMatchingRecruiters([])
    setCustomRecruiterMode(false)
    setCustomEmail('')
    setCustomName('')
    setCustomTitle('')
    setSuccessData(null)
    setError('')
  }

  if (step === 'success') {
    return (
      <section className="manual-page">
        <div className="page-intro">
          <div>
            <p className="kicker"><span>🎉</span> Success</p>
            <h1>Outreach <em>Sent</em></h1>
            <p>Your cold email has been generated and sent to the recruiter successfully via Gmail API.</p>
          </div>
        </div>

        <div className="manual-layout" style={{ gridTemplateColumns: '1fr' }}>
          <div className="manual-form">
            <div style={{ background: '#e4f4e6', borderLeft: '4px solid var(--green)', padding: '20px', borderRadius: '4px', marginBottom: '24px' }}>
              <h3 style={{ color: 'var(--green)', margin: '0 0 8px 0' }}>✅ Email Dispatched Successfully</h3>
              <p style={{ margin: 0, fontSize: '14px', color: '#105c3d' }}>
                Gemini generated a customized pitch and sent it from your Gmail address with your resume link and/or PDF attachment.
              </p>
            </div>

            <div className="form-grid" style={{ gridTemplateColumns: '1fr', gap: '20px' }}>
              <label>
                <span>Subject line</span>
                <input type="text" readOnly value={successData?.subject || ''} />
              </label>
              <label>
                <span>Email Preview</span>
                <div 
                  className="email-preview" 
                  style={{ 
                    background: 'white', 
                    border: '1px solid var(--line)', 
                    borderRadius: '6px', 
                    padding: '24px', 
                    minHeight: '200px',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                  }}
                >
                  <div 
                    dangerouslySetInnerHTML={{ __html: successData?.body || '' }} 
                    style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--ink)' }}
                  />
                </div>
              </label>
            </div>

            <div className="form-actions" style={{ marginTop: '24px' }}>
              <button className="compact-primary" onClick={reset}>
                Send another pitch {icons.arrow}
              </button>
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (step === 'select_recruiter') {
    return (
      <section className="manual-page">
        <div className="page-intro">
          <div>
            <p className="kicker"><span>02</span> Select Contact</p>
            <h1>Recruiter <em>Selection</em></h1>
            <p>We found the following recruiters matching **{companyName}** in your database.</p>
          </div>
        </div>

        <div className="manual-layout">
          <div className="manual-form">
            {!customRecruiterMode ? (
              <>
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Matching contacts</p>
                    <h2>Select a Recruiter</h2>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
                  {matchingRecruiters.map((recruiter) => (
                    <div
                      key={recruiter.id}
                      style={{
                        padding: '16px',
                        border: '1px solid var(--line)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'white',
                      }}
                    >
                      <div>
                        <strong style={{ display: 'block', fontSize: '15px' }}>{recruiter.recruiter_name || 'Unnamed Recruiter'}</strong>
                        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                          {recruiter.recruiter_title && `${recruiter.recruiter_title} · `}{recruiter.company_name}
                        </span>
                        <span style={{ display: 'block', fontSize: '12px', fontFamily: 'monospace', marginTop: '4px' }}>
                          {recruiter.recruiter_email}
                        </span>
                      </div>
                      <button
                        className="compact-primary"
                        style={{ minHeight: '38px', padding: '0 12px' }}
                        disabled={loading}
                        onClick={() => handleSelectRecruiter(recruiter)}
                      >
                        {loading ? 'Sending...' : 'Select & Send'}
                      </button>
                    </div>
                  ))}
                </div>

                <div style={{ borderTop: '1px solid var(--line)', paddingTop: '20px', textAlign: 'center' }}>
                  <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '12px' }}>
                    Can't find the right recruiter?
                  </p>
                  <button className="secondary-button" style={{ maxWidth: '240px', margin: '0 auto' }} onClick={() => setCustomRecruiterMode(true)}>
                    Enter email manually
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={handleSendCustom}>
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Outreach details</p>
                    <h2>Enter Recruiter Manually</h2>
                  </div>
                </div>

                <div className="form-grid">
                  <label>
                    <span>Recruiter Email *</span>
                    <input
                      required
                      type="email"
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                      placeholder="recruiter@company.com"
                    />
                  </label>
                  <label>
                    <span>Recruiter Name (Optional)</span>
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="e.g. John Doe"
                    />
                  </label>
                  <label>
                    <span>Job Title (Optional)</span>
                    <input
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="e.g. Tech Recruiter"
                    />
                  </label>
                </div>

                {error && <div className="error-message" role="alert">{error}</div>}

                <div className="form-actions" style={{ marginTop: '24px' }}>
                  {matchingRecruiters.length > 0 && (
                    <button className="clear-button" type="button" onClick={() => setCustomRecruiterMode(false)}>
                      Back to list
                    </button>
                  )}
                  <button className="compact-primary" disabled={loading} type="submit">
                    {loading ? 'Sending...' : 'Generate & Send Pitch'} {icons.arrow}
                  </button>
                </div>
              </form>
            )}

            {error && !customRecruiterMode && <div className="error-message" role="alert">{error}</div>}
            
            <div className="form-actions" style={{ marginTop: '20px', justifyContent: 'flex-start' }}>
              <button className="clear-button" onClick={() => setStep('form')} disabled={loading}>
                Back to form
              </button>
            </div>
          </div>

          <aside className="manual-note">
            <div style={{ background: 'var(--green)', color: 'white', display: 'grid', placeItems: 'center', fontSize: '20px' }}>🔍</div>
            <p className="eyebrow">Database Search</p>
            <h3>Matching Company</h3>
            <p>
              We searched your contacts for recruiters working at **{companyName}**. Choosing an existing recruiter ensures your database remains tidy and prevents sending to incorrect addresses.
            </p>
          </aside>
        </div>
      </section>
    )
  }

  return (
    <section className="manual-page">
      <div className="page-intro">
        <div>
          <p className="kicker"><span>02</span> Recruiter Outreach</p>
          <h1>Send <em>Pitch</em></h1>
          <p>Generate a customized cold email pitch using Gemini and send it directly to a recruiter.</p>
        </div>
      </div>

      <div className="manual-layout">
        <form className="manual-form" onSubmit={handleFormSubmit}>
          <div className="section-heading">
            <div>
              <p className="eyebrow">Details</p>
              <h2>Pitch details</h2>
            </div>
          </div>

          <div className="form-grid">
            <label>
              <span>Company Name *</span>
              <input
                required
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Google"
              />
            </label>

            <label>
              <span>Recruiter Email (Optional)</span>
              <input
                type="email"
                value={recruiterEmail}
                onChange={(e) => setRecruiterEmail(e.target.value)}
                placeholder="e.g. john@google.com"
              />
              <small style={{ color: 'var(--muted)', display: 'block', marginTop: '4px' }}>
                Leave blank to search contacts for this company.
              </small>
            </label>

            <label>
              <span>Recruiter Name (Optional)</span>
              <input
                type="text"
                value={recruiterName}
                onChange={(e) => setRecruiterName(e.target.value)}
                placeholder="e.g. John Doe"
              />
            </label>

            <label>
              <span>Job Title (Optional)</span>
              <input
                type="text"
                value={recruiterTitle}
                onChange={(e) => setRecruiterTitle(e.target.value)}
                placeholder="e.g. Tech Recruiter"
              />
            </label>

            <label style={{ gridColumn: 'span 2' }}>
              <span>Job Description / Role Details *</span>
              <textarea
                required
                rows={8}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the job posting description here..."
              />
            </label>
          </div>

          {error && (
            <div className="error-message" role="alert">
              {error}
              {error.includes('Resume') && (
                <button
                  type="button"
                  style={{
                    display: 'block',
                    marginTop: '8px',
                    background: 'none',
                    border: 'none',
                    color: 'inherit',
                    textDecoration: 'underline',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    padding: 0
                  }}
                  onClick={onGoToResume}
                >
                  Configure Resume Now
                </button>
              )}
            </div>
          )}

          <div className="form-actions">
            <button className="compact-primary" disabled={loading} type="submit">
              {loading ? 'Processing...' : recruiterEmail ? 'Generate & Send Pitch' : 'Check Contacts & Continue'} {icons.arrow}
            </button>
          </div>
        </form>

        <aside className="manual-note">
          <div style={{ background: 'var(--green)', color: 'white', display: 'grid', placeItems: 'center', fontSize: '20px' }}>⚡</div>
          <p className="eyebrow">Smart Search</p>
          <h3>Direct or Search</h3>
          <p>
            If you provide a **Recruiter Email**, the pitch is generated and sent immediately. 
            If you leave it blank, the system scans your database for any contacts working at **{companyName || 'the specified company'}** first, letting you select the best target recruiter.
          </p>
        </aside>
      </div>
    </section>
  )
}
