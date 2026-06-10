import React, { useState } from 'react'
import { icons } from '../../components/icons'

export function SettingsForm({ apiKey, modelName, rateLimitEnabled, rateLimitRequests, rateLimitInterval, onSave, onCancel }) {
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
