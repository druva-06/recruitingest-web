import React, { useState } from 'react'
import { icons } from '../../components/icons'
import { apiFetch, getJobStatus } from '../../services/api'

export function SendPitch({ onGoToResume, onGoToSentEmails }) {
  const [step, setStep] = useState('form') // 'form', 'select_recruiter', 'review_draft', 'success'
  const [jobDescription, setJobDescription] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [location, setLocation] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [recruiterEmail, setRecruiterEmail] = useState('')
  const [recruiterName, setRecruiterName] = useState('')
  const [recruiterTitle, setRecruiterTitle] = useState('')
  const [pitchType, setPitchType] = useState('outreach')

  // Search results step
  const [matchingRecruiters, setMatchingRecruiters] = useState([])
  const [listFilter, setListFilter] = useState('')
  const [customRecruiterMode, setCustomRecruiterMode] = useState(false)
  const [prospeoMode, setProspeoMode] = useState(false)

  // Manual/Apollo mode inputs
  const [customEmail, setCustomEmail] = useState('')
  const [customName, setCustomName] = useState('')
  const [customTitle, setCustomTitle] = useState('')
  const [customLocation, setCustomLocation] = useState('')
  const [customLinkedinUrl, setCustomLinkedinUrl] = useState('')

  // UI state
  const [loading, setLoading] = useState(false)
  const [draftingPitch, setDraftingPitch] = useState(false)
  const [error, setError] = useState('')
  const [successData, setSuccessData] = useState(null)
  const [draftData, setDraftData] = useState({ subject: '', body: '', email: '', recruiterName: '', companyName: '' })
  const [previewMode, setPreviewMode] = useState(true)
  
  // AI Enhance state
  const [enhancing, setEnhancing] = useState(false)
  const [enhanceInstruction, setEnhanceInstruction] = useState('')

  const handleEnhance = async () => {
    if (!enhanceInstruction.trim()) return
    setEnhancing(true)
    setError('')
    try {
      const res = await apiFetch('/outreach/enhance-pitch', {
        method: 'POST',
        body: {
          subject: draftData.subject,
          body: draftData.body,
          instruction: enhanceInstruction
        }
      })
      setDraftData(prev => ({...prev, subject: res.subject, body: res.body}))
      setEnhanceInstruction('')
    } catch (err) {
      setError(err.message || 'Failed to enhance pitch')
    } finally {
      setEnhancing(false)
    }
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Scenario 1: Initial DB search only
      const localResponse = await apiFetch('/outreach/search-recruiters', {
        method: 'POST',
        body: { company_name: companyName.trim() },
      }).catch(() => ({ recruiters: [] }))
      
      let combinedRecruiters = (localResponse.recruiters || []).map(r => ({ ...r, source: 'local' }))

      // Sort: newest first
      setMatchingRecruiters(combinedRecruiters)
      
      setStep('select_recruiter')
      setCustomRecruiterMode(false)
      setProspeoMode(false)
      
      if (combinedRecruiters.length === 0) {
        // If empty, user can choose manual or apollo
      }
    } catch (err) {
      setError(err.message || 'Failed to search recruiters')
    } finally {
      setLoading(false)
    }
  }

  const generatePitch = async (email, name, title, loc = '', linkedin = '') => {
    setLoading(true)
    setDraftingPitch(email)
    setError('')
    try {
      const response = await apiFetch('/outreach/generate-pitch', {
        method: 'POST',
        body: {
          job_description: jobDescription,
          company_name: companyName,
          recruiter_email: email,
          recruiter_name: name,
          recruiter_title: title,
          location: loc,
          linkedin_url: linkedin,
          pitch_type: pitchType
        },
      })
      if (response.job_id) {
        pollPitchJob(response.job_id, email, name, companyName)
      } else {
        setDraftData({ subject: response.subject, body: response.body, email, recruiterName: name, companyName: companyName })
        setStep('review_draft')
        setLoading(false)
        setDraftingPitch(false)
      }
    } catch (err) {
      setError(err.message || 'Failed to generate outreach email draft')
      setLoading(false)
      setDraftingPitch(false)
    }
  }

  const pollPitchJob = async (jobId, email, name, companyName) => {
    try {
      const job = await getJobStatus(jobId)
      if (job.status === 'completed') {
        setDraftData({ 
          subject: job.result?.subject || '', 
          body: job.result?.body || '', 
          email, 
          recruiterName: name, 
          companyName: companyName 
        })
        setStep('review_draft')
        setLoading(false)
        setDraftingPitch(false)
      } else if (job.status === 'failed') {
        setError(job.error_message || 'Failed to generate pitch')
        setLoading(false)
        setDraftingPitch(false)
      } else {
        setTimeout(() => pollPitchJob(jobId, email, name, companyName), 3000)
      }
    } catch (err) {
      setError(err.message || 'Failed to check pitch status')
      setLoading(false)
      setDraftingPitch(false)
    }
  }

  const confirmAndSend = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await apiFetch('/outreach/confirm-pitch', {
        method: 'POST',
        body: {
          recruiter_email: draftData.email,
          recruiter_name: draftData.recruiterName,
          company_name: draftData.companyName,
          subject: draftData.subject,
          body: draftData.body
        }
      })
      setSuccessData({ subject: draftData.subject, body: draftData.body })
      setStep('success')
    } catch (err) {
      setError(err.message || 'Failed to send email')
    } finally {
      setLoading(false)
    }
  }

  const handleFetchProspeo = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (!customLinkedinUrl.trim() && !customName.trim()) {
        throw new Error('Please provide either a Recruiter Name or LinkedIn URL.')
      }
      
      const enrichResponse = await apiFetch('/outreach/prospeo-enrich', {
        method: 'POST',
        body: {
          first_name: customName.trim().split(' ')[0] || '',
          last_name: customName.trim().split(' ').slice(1).join(' ') || '',
          full_name: customName.trim() || '',
          company_name: companyName.trim(),
          linkedin_url: customLinkedinUrl.trim()
        }
      })
      const email = enrichResponse.person?.email?.email
      if (!email) {
        throw new Error('Prospeo could not find an email for this person.')
      }
      
      const finalName = customName.trim() || enrichResponse.person?.full_name || ''
      const finalTitle = customTitle.trim() || enrichResponse.person?.current_job_title || ''
      const finalLoc = enrichResponse.person?.location?.country || ''
      const finalLinkedin = enrichResponse.person?.linkedin_url || customLinkedinUrl.trim()
      
      await generatePitch(email, finalName, finalTitle, finalLoc, finalLinkedin)
    } catch (err) {
      setError(err.message || 'Failed to fetch from Prospeo')
      setLoading(false)
      setDraftingPitch(false)
    }
  }

  const handleSelectRecruiter = async (recruiter) => {
    generatePitch(recruiter.recruiter_email, recruiter.recruiter_name, recruiter.recruiter_title, recruiter.location, recruiter.linkedin_url)
  }

  const handleSendCustom = (e) => {
    e.preventDefault()
    if (!customEmail.trim()) {
      setError('Please provide a valid recruiter email')
      return
    }
    generatePitch(customEmail.trim(), customName.trim(), customTitle.trim(), customLocation.trim(), customLinkedinUrl.trim())
  }

  const reset = () => {
    setStep('form')
    setJobDescription('')
    setCompanyName('')
    setLocation('')
    setLinkedinUrl('')
    setRecruiterEmail('')
    setRecruiterName('')
    setRecruiterTitle('')
    setPitchType('outreach')
    setMatchingRecruiters([])
    setListFilter('')
    setCustomRecruiterMode(false)
    setProspeoMode(false)
    setCustomEmail('')
    setCustomName('')
    setCustomTitle('')
    setCustomLocation('')
    setCustomLinkedinUrl('')
    setDraftData({ subject: '', body: '', email: '' })
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
              {onGoToSentEmails && (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={onGoToSentEmails}
                  style={{ marginLeft: '0' }}
                >
                  📬 View Sent Emails
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (step === 'review_draft') {
    return (
      <section className="manual-page">
        <div className="page-intro">
          <div>
            <p className="kicker"><span>03</span> Review</p>
            <h1>Review <em>Draft</em></h1>
            <p>Review and edit the generated email before sending.</p>
          </div>
        </div>
        
        <div className="manual-layout" style={{ gridTemplateColumns: '1fr' }}>
          <form className="manual-form" onSubmit={confirmAndSend}>
            <div className="form-grid" style={{ gridTemplateColumns: '1fr', gap: '20px' }}>
              <label>
                <span>To</span>
                <input type="text" readOnly value={draftData.email} />
              </label>
              <label>
                <span>Subject line</span>
                <input 
                  type="text" 
                  required 
                  value={draftData.subject} 
                  onChange={(e) => setDraftData({ ...draftData, subject: e.target.value })} 
                />
              </label>
              <label>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Email Body (HTML supported)</span>
                  <button 
                    type="button" 
                    onClick={() => setPreviewMode(!previewMode)}
                    style={{ background: 'none', border: 'none', color: 'var(--green)', cursor: 'pointer', fontSize: '13px', fontWeight: 600, padding: 0 }}
                  >
                    {previewMode ? 'Edit HTML' : 'Preview'}
                  </button>
                </div>
                {previewMode ? (
                  <div 
                    className="email-preview" 
                    style={{ 
                      background: 'white', 
                      border: '1px solid var(--line)', 
                      borderRadius: '6px', 
                      padding: '24px', 
                      minHeight: '200px',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
                      marginTop: '8px'
                    }}
                  >
                    <div 
                      dangerouslySetInnerHTML={{ __html: draftData.body || '' }} 
                      style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--ink)' }}
                    />
                  </div>
                ) : (
                  <textarea
                    required
                    rows={15}
                    value={draftData.body}
                    onChange={(e) => setDraftData({ ...draftData, body: e.target.value })}
                    style={{ fontFamily: 'monospace', fontSize: '13px', marginTop: '8px' }}
                  />
                )}
              </label>

              {/* AI Enhance Box */}
              <div style={{
                marginTop: '12px',
                padding: '16px',
                background: '#f8faf7',
                border: '1px solid var(--line)',
                borderRadius: '8px',
                display: 'flex',
                gap: '12px',
                alignItems: 'center'
              }}>
                <div style={{ fontSize: '20px' }}>✨</div>
                <input 
                  type="text" 
                  placeholder="Ask AI to refine this... (e.g., 'Make it punchier', 'Add a joke')" 
                  value={enhanceInstruction}
                  onChange={(e) => setEnhanceInstruction(e.target.value)}
                  style={{ flex: 1, padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--line)', fontSize: '14px' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleEnhance()
                    }
                  }}
                />
                <button 
                  type="button" 
                  onClick={handleEnhance}
                  disabled={enhancing || !enhanceInstruction.trim()}
                  style={{ 
                    background: 'var(--green)', 
                    color: 'white', 
                    border: 'none', 
                    padding: '0 16px', 
                    minHeight: '38px',
                    borderRadius: '6px', 
                    cursor: (enhancing || !enhanceInstruction.trim()) ? 'not-allowed' : 'pointer', 
                    fontWeight: 'bold',
                    opacity: (enhancing || !enhanceInstruction.trim()) ? 0.7 : 1
                  }}
                >
                  {enhancing ? 'Refining...' : 'Enhance'}
                </button>
              </div>

            </div>
            
            {error && <div className="error-message" role="alert">{error}</div>}
            
            <div className="form-actions" style={{ marginTop: '24px' }}>
              <button className="clear-button" type="button" onClick={() => setStep('select_recruiter')} disabled={loading}>
                Back
              </button>
              <button className="compact-primary" disabled={loading} type="submit">
                {loading ? 'Sending...' : 'Confirm & Send Email'} {icons.arrow}
              </button>
            </div>
          </form>
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
            {!customRecruiterMode && !prospeoMode ? (
              <>
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Matching contacts</p>
                    <h2>Select a Recruiter</h2>
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <input
                    type="text"
                    placeholder="Search by name, title, or email..."
                    value={listFilter}
                    onChange={(e) => setListFilter(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--line)', fontSize: '14px' }}
                  />
                </div>

                <div style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
                  {matchingRecruiters.filter(r => {
                    if (!listFilter) return true
                    const lowerFilter = listFilter.toLowerCase()
                    const nameMatch = (r.recruiter_name || '').toLowerCase().includes(lowerFilter)
                    const titleMatch = (r.recruiter_title || '').toLowerCase().includes(lowerFilter)
                    const emailMatch = (r.recruiter_email || '').toLowerCase().includes(lowerFilter)
                    return nameMatch || titleMatch || emailMatch
                  }).map((recruiter) => (
                    <div
                      key={recruiter.id || recruiter.recruiter_email || Math.random().toString()}
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
                        {draftingPitch === recruiter.recruiter_email ? '🤖 Drafting Pitch...' : 'Select & Send'}
                      </button>
                    </div>
                  ))}
                </div>

                <div style={{ borderTop: '1px solid var(--line)', paddingTop: '20px', textAlign: 'center' }}>
                  <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '12px' }}>
                    Not finding the right person?
                  </p>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button className="secondary-button" onClick={() => setProspeoMode(true)} disabled={loading} type="button">
                      Fetch from Prospeo
                    </button>
                    <button className="secondary-button" onClick={() => setCustomRecruiterMode(true)} type="button">
                      Enter manually
                    </button>
                  </div>
                </div>
              </>
            ) : prospeoMode ? (
              <form onSubmit={handleFetchProspeo}>
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Data Enrichment</p>
                    <h2>Fetch from Prospeo</h2>
                    <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>Provide a Name or LinkedIn URL to fetch their verified email.</p>
                  </div>
                </div>

                <div className="form-grid">
                  <label>
                    <span>Recruiter Full Name</span>
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="e.g. John Doe"
                    />
                  </label>
                  <label>
                    <span>LinkedIn Profile URL</span>
                    <input
                      type="url"
                      value={customLinkedinUrl}
                      onChange={(e) => setCustomLinkedinUrl(e.target.value)}
                      placeholder="e.g. https://linkedin.com/in/johndoe"
                    />
                  </label>
                </div>

                {error && <div className="error-message" role="alert">{error}</div>}

                <div className="form-actions" style={{ marginTop: '24px' }}>
                  <button className="clear-button" type="button" onClick={() => { setProspeoMode(false); setError('') }}>
                    Back
                  </button>
                  <button className="compact-primary" disabled={loading} type="submit">
                    {draftingPitch ? '🤖 Drafting Pitch...' : loading ? 'Fetching...' : 'Fetch & Generate Draft'} {(!loading && !draftingPitch) && icons.arrow}
                  </button>
                </div>
              </form>
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
                  <label>
                    <span>Location (Optional)</span>
                    <input
                      type="text"
                      value={customLocation}
                      onChange={(e) => setCustomLocation(e.target.value)}
                      placeholder="e.g. San Francisco, CA"
                    />
                  </label>
                  <label>
                    <span>LinkedIn Profile URL (Optional)</span>
                    <input
                      type="url"
                      value={customLinkedinUrl}
                      onChange={(e) => setCustomLinkedinUrl(e.target.value)}
                      placeholder="e.g. https://linkedin.com/in/johndoe"
                    />
                  </label>
                </div>

                {error && <div className="error-message" role="alert">{error}</div>}

                <div className="form-actions" style={{ marginTop: '24px' }}>
                  <button className="clear-button" type="button" onClick={() => { setCustomRecruiterMode(false); setError('') }}>
                    Back
                  </button>
                  <button className="compact-primary" disabled={loading} type="submit">
                    {draftingPitch ? '🤖 Drafting Pitch...' : loading ? 'Processing...' : 'Save & Generate Draft'} {(!loading && !draftingPitch) && icons.arrow}
                  </button>
                </div>
              </form>
            )}

            {error && !customRecruiterMode && !prospeoMode && <div className="error-message" role="alert">{error}</div>}
            
            {!customRecruiterMode && !prospeoMode && (
              <div className="form-actions" style={{ marginTop: '20px', justifyContent: 'flex-start' }}>
                <button className="clear-button" onClick={() => setStep('form')} disabled={loading}>
                  Back to form
                </button>
              </div>
            )}
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
              <span>Outreach Type *</span>
              <select value={pitchType} onChange={(e) => setPitchType(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--line)' }}>
                <option value="outreach">Outreach Pitch</option>
                <option value="referral">Referral Request</option>
              </select>
            </label>

            <label style={{ gridColumn: '1 / -1' }}>
              <span>Job Description / Role Details *</span>
              <textarea
                required
                rows={10}
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
              {loading ? 'Processing...' : 'Check Contacts & Continue'} {icons.arrow}
            </button>
          </div>
        </form>

        <aside className="manual-note">
          <div style={{ background: 'var(--green)', color: 'white', display: 'grid', placeItems: 'center', fontSize: '20px' }}>⚡</div>
          <p className="eyebrow">Smart Workflow</p>
          <h3>How it works</h3>
          <p>
            1. Enter the target **Company** and **Job**.<br/>
            2. We scan your local database for matching recruiters.<br/>
            3. Choose an existing contact, or fetch a new one instantly using Prospeo.
          </p>
        </aside>
      </div>
    </section>
  )
}
