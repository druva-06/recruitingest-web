import React, { useState, useEffect } from 'react'
import { icons } from '../../components/icons'
import { apiFetch } from '../../services/api'

export function PromptForm() {
  const [customPrompt, setCustomPrompt] = useState('')
  const [referralPrompt, setReferralPrompt] = useState('')
  const [linkedinOutreachPrompt, setLinkedinOutreachPrompt] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [showDefaultPrompt, setShowDefaultPrompt] = useState(false)

  const defaultLinkedinOutreachPromptTemplate = `Hi {{CandidateName}}, Hope all is well with you! I came across the {{RoleTitle}} Full-Time Opportunity at {{CompanyName}} and am interested in applying. Would you be open to submitting a referral for me to go with my application? Happy to chat more if you have the time as well. Looking forward to hearing from you. 

--- Follow the link below to review 
{{JobURL}}

{{ResumeLink}}`

  const defaultReferralPromptTemplate = `You are a professional outreach assistant. Write a personalized cold outreach email from a job applicant to a contact asking for a referral.

The output MUST be a valid JSON object matching this schema:
{
  "subject": "Email subject line",
  "body": "Email body in HTML"
}

[INPUT DETAILS]
Contact Name: {{recruiter_name}}
Company Name: {{company_name}}
Job Title: {{job_title}}
Job URL: {{job_url}}
Job Description:
{{job_description}}
Applicant Name: {{applicant_name}}
Applicant Email: {{applicant_email}}
Resume Raw Content:
{{resume_content}}
Google Drive Resume Link: {{drive_link}}

[INSTRUCTIONS]
1. Write a professional subject line.
2. In the body (HTML format using <p>, <strong>, <ul>, <li>, and <a>), politely ask for a referral for the provided job role. Highlight 2-3 specific skills/projects from the Resume Raw Content that match the Job Description. Use <strong> to highlight key metrics or tech.
3. Make sure to use the Google Drive Resume Link in a clean anchor tag '<a href="{{drive_link}}" style="color: #176b4a; font-weight: bold; text-decoration: underline;">view my complete resume on Google Drive</a>' in the body.
4. Keep the email concise and polite.
5. Output ONLY the raw JSON object. Do not include markdown code block wrappers (like triple backticks) or any conversational text outside the JSON.`

  const defaultPromptTemplate = `You are a professional outreach assistant. Write a personalized cold outreach email from a job applicant to a recruiter.

The output MUST be a valid JSON object matching this schema:
{
  "subject": "Email subject line",
  "body": "Email body in HTML"
}

[INPUT DETAILS]
Recruiter Name: {{recruiter_name}}
Company Name: {{company_name}}
Job Title: {{job_title}}
Job URL: {{job_url}}
Job Description:
{{job_description}}
Applicant Name: {{applicant_name}}
Applicant Email: {{applicant_email}}
Resume Raw Content:
{{resume_content}}
Google Drive Resume Link: {{drive_link}}

[EXAMPLE OUTPUT FORMAT]
{
  "subject": "Go Engineer - Aligning with Google Role",
  "body": "<p>Hi John,</p><p>I am reaching out regarding the Go Engineer role at Google. With my background in backend systems, I am excited about the opportunity.</p><p>Here is why my background aligns with your requirements:</p><ul><li><strong>Go backend development:</strong> Developed robust APIs using Go for 3+ years, improving performance by 25%.</li><li><strong>Database Optimization:</strong> Optimized MySQL schemas and queries to reduce latency.</li></ul><p>Please check my <a href=\"{{drive_link}}\" style=\"color: #176b4a; font-weight: bold; text-decoration: underline;\">view my complete resume on Google Drive</a>.</p><p>Are you open to a brief call this week to discuss alignment?</p><p>Thanks & Regards,<br>Alex Mercer<br>alex@email.com</p>"
}

[INSTRUCTIONS]
1. Write a professional subject line. Reference a key matching skill.
2. In the body (HTML format using <p>, <strong>, <ul>, <li>, and <a>), highlight 2-3 specific skills/projects from the Resume Raw Content that match the Job Description. Use <strong> to highlight key metrics or tech.
3. Make sure to use the Google Drive Resume Link in a clean anchor tag '<a href="{{drive_link}}" style="color: #176b4a; font-weight: bold; text-decoration: underline;">view my complete resume on Google Drive</a>' in the body.
4. Keep the email concise and call-to-action focused (encouraging a reply).
5. Output ONLY the raw JSON object. Do not include markdown code block wrappers (like triple backticks) or any conversational text outside the JSON.`

  useEffect(() => {
    async function loadPrompt() {
      try {
        const data = await apiFetch('/outreach/prompt')
        setCustomPrompt(data.custom_prompt || '')
        setReferralPrompt(data.referral_prompt || '')
        setLinkedinOutreachPrompt(data.linkedin_outreach_prompt || '')
      } catch (err) {
        console.error('Failed to load custom prompt:', err)
        setError('Could not retrieve custom prompt settings.')
      } finally {
        setLoading(false)
      }
    }
    loadPrompt()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const data = await apiFetch('/outreach/prompt', {
        method: 'POST',
        body: { custom_prompt: customPrompt, referral_prompt: referralPrompt, linkedin_outreach_prompt: linkedinOutreachPrompt },
      })
      setCustomPrompt(data.custom_prompt || '')
      setReferralPrompt(data.referral_prompt || '')
      setLinkedinOutreachPrompt(data.linkedin_outreach_prompt || '')
      setSuccess('Prompt preferences saved successfully!')
    } catch (err) {
      setError(err.message || 'Failed to save prompt settings')
    } finally {
      setSaving(false)
    }
  }

  const handleResetToDefault = async () => {
    if (!window.confirm('Are you sure you want to clear your custom prompt and reset to the system default prompt?')) {
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const data = await apiFetch('/outreach/prompt', {
        method: 'POST',
        body: { custom_prompt: '', referral_prompt: '', linkedin_outreach_prompt: '' },
      })
      setCustomPrompt('')
      setReferralPrompt('')
      setLinkedinOutreachPrompt('')
      setSuccess('Reset to system default prompt completed!')
    } catch (err) {
      setError(err.message || 'Failed to reset prompt settings')
    } finally {
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
          <p className="kicker"><span>06</span> AI Outreach Settings</p>
          <h1>Outreach <em>Prompt</em></h1>
          <p>Customize the system prompt used by Gemini to generate your recruiter outreach emails.</p>
        </div>
      </div>

      <div className="manual-layout">
        <form className="manual-form" onSubmit={handleSubmit}>
          <div className="section-heading">
            <div>
              <p className="eyebrow">Gemini Instructions</p>
              <h2>Outreach System Prompt</h2>
            </div>
          </div>

          <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
            <label>
              <span>Custom System Prompt (Outreach)</span>
              <textarea
                rows={18}
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Leave blank to use default outreach system prompt..."
                style={{ fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.5' }}
              />
            </label>
            <label>
              <span>Custom System Prompt (Referral)</span>
              <textarea
                rows={18}
                value={referralPrompt}
                onChange={(e) => setReferralPrompt(e.target.value)}
                placeholder="Leave blank to use default referral system prompt..."
                style={{ fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.5', marginTop: '10px' }}
              />
              <small style={{ color: 'var(--muted)', marginTop: '6px', display: 'block', lineHeight: '1.4' }}>
                If blank, the system automatically runs the default optimized prompts. You can insert variables using double curly braces (e.g., <code>{"{{recruiter_name}}"}</code>).
              </small>
            </label>
            <label>
              <span>LinkedIn Outreach Prompt (Extension)</span>
              <textarea
                rows={8}
                value={linkedinOutreachPrompt}
                onChange={(e) => setLinkedinOutreachPrompt(e.target.value)}
                placeholder={defaultLinkedinOutreachPromptTemplate}
                style={{ fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.5', marginTop: '10px' }}
              />
              <small style={{ color: 'var(--muted)', marginTop: '6px', display: 'block', lineHeight: '1.4' }}>
                Used by the "Copy Message" feature in the Chrome Extension's Active Pipelines. Variables available: <code>{"{{CandidateName}}"}</code>, <code>{"{{RoleTitle}}"}</code>, <code>{"{{CompanyName}}"}</code>, <code>{"{{JobURL}}"}</code>, <code>{"{{ResumeLink}}"}</code>.
              </small>
            </label>
          </div>

          {error && <div className="error-message" role="alert">{error}</div>}
          {success && <div className="success-message" role="status">{icons.check} {success}</div>}

          <div className="form-actions">
            {customPrompt && (
              <button className="clear-button" type="button" disabled={saving} onClick={handleResetToDefault}>
                Reset to default
              </button>
            )}
            <button className="compact-primary" disabled={saving} type="submit">
              {saving ? 'Saving…' : 'Save Prompt'} {icons.arrow}
            </button>
          </div>

          <div style={{ borderTop: '1px solid var(--line)', marginTop: '30px', paddingTop: '20px' }}>
            <button
              type="button"
              className="secondary-button"
              style={{ minHeight: '38px', fontSize: '13px' }}
              onClick={() => setShowDefaultPrompt(!showDefaultPrompt)}
            >
              {showDefaultPrompt ? 'Hide Default Prompt Template' : 'Show Default Prompt Template'}
            </button>
            
            {showDefaultPrompt && (
              <div style={{ marginTop: '15px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '.7px', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>
                    Default Outreach Prompt:
                  </span>
                  <pre style={{ background: '#f8faf7', border: '1px solid var(--line)', borderRadius: '6px', padding: '16px', fontSize: '12px', fontFamily: 'monospace', overflowX: 'auto', whiteSpace: 'pre-wrap', margin: 0, maxHeight: '300px' }}>
                    {defaultPromptTemplate}
                  </pre>
                </div>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '.7px', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>
                    Default Referral Prompt:
                  </span>
                  <pre style={{ background: '#f8faf7', border: '1px solid var(--line)', borderRadius: '6px', padding: '16px', fontSize: '12px', fontFamily: 'monospace', overflowX: 'auto', whiteSpace: 'pre-wrap', margin: 0, maxHeight: '300px' }}>
                    {defaultReferralPromptTemplate}
                  </pre>
                </div>
              </div>
            )}
            {showDefaultPrompt && (
              <div style={{ marginTop: '20px' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '.7px', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>
                  Default LinkedIn Outreach Prompt:
                </span>
                <pre style={{ background: '#f8faf7', border: '1px solid var(--line)', borderRadius: '6px', padding: '16px', fontSize: '12px', fontFamily: 'monospace', overflowX: 'auto', whiteSpace: 'pre-wrap', margin: 0, maxHeight: '300px' }}>
                  {defaultLinkedinOutreachPromptTemplate}
                </pre>
              </div>
            )}
          </div>
        </form>

        <aside className="manual-note">
          <div style={{ background: 'var(--green)', color: 'white', display: 'grid', placeItems: 'center', fontSize: '20px' }}>⚙️</div>
          <p className="eyebrow">Prompt Variables</p>
          <h3>Available Placeholders</h3>
          <p style={{ marginBottom: '14px' }}>
            You can inject dynamic recruiter, job, and applicant variables anywhere in your prompt using these tags:
          </p>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', lineHeight: '1.6', color: 'var(--muted)' }}>
            <li><code>{"{{recruiter_name}}"}</code> — Recruiter's full name.</li>
            <li><code>{"{{company_name}}"}</code> — Target company name.</li>
            <li><code>{"{{job_title}}"}</code> — Target job title.</li>
            <li><code>{"{{job_url}}"}</code> — URL of the job posting.</li>
            <li><code>{"{{job_description}}"}</code> — Paste of the job description.</li>
            <li><code>{"{{applicant_name}}"}</code> — Your Google account profile name.</li>
            <li><code>{"{{applicant_email}}"}</code> — Your Google account email.</li>
            <li><code>{"{{resume_content}}"}</code> — Extracted text contents of your resume PDF.</li>
            <li><code>{"{{drive_link}}"}</code> — Google Drive link to your resume.</li>
          </ul>
        </aside>
      </div>
    </section>
  )
}
