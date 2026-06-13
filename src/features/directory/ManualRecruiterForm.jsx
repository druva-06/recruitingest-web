import React, { useState } from 'react'
import { icons } from '../../components/icons'
import { createRecruiter } from '../../services/api'
import { AIPasteModal } from './AIPasteModal'

export function ManualRecruiterForm({ onCreated, onCancel }) {
  const emptyForm = { recruiter_name: '', recruiter_title: '', recruiter_email: '', company_name: '' }
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showAiModal, setShowAiModal] = useState(false)

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
        <button className="compact-primary" onClick={() => setShowAiModal(true)} type="button">
          {icons.sparkles} Paste with AI
        </button>
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
      {showAiModal && <AIPasteModal onClose={() => setShowAiModal(false)} onCreated={onCreated} />}
    </section>
  )
}
