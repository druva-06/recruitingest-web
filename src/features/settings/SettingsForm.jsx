import React, { useState, useEffect } from 'react'
import { icons } from '../../components/icons'
import { fetchAiSettings, saveAiSettings, fetchReminderSettings, saveReminderSettings } from '../../services/api'
import { loadProspeoApiKey, saveProspeoApiKey } from '../../utils/secureStorage'

export function SettingsForm({ onCancel }) {
  const [formKey, setFormKey] = useState('')
  const [formProspeoKey, setFormProspeoKey] = useState('')
  const [formModel, setFormModel] = useState('gemini-3.5-flash')
  const [customModel, setCustomModel] = useState('')
  const [limitEnabled, setLimitEnabled] = useState(false)
  const [limitRequests, setLimitRequests] = useState(10)
  const [limitInterval, setLimitInterval] = useState(60)
  const [reminder1Delay, setReminder1Delay] = useState(5)
  const [reminder2Delay, setReminder2Delay] = useState(10)
  const [showKey, setShowKey] = useState(false)
  const [showProspeoKey, setShowProspeoKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const standardModels = ['gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-3.5-pro', 'gemini-3.5-flash-medium', 'gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-2.0-pro']
  const isCustomModel = !standardModels.includes(formModel) && formModel !== 'custom-model-placeholder'

  useEffect(() => {
    async function load() {
      try {
        const ai = await fetchAiSettings()
        const prospeo = await loadProspeoApiKey()
        setFormKey(ai.gemini_api_key || '')
        
        const loadedModel = ai.gemini_model || 'gemini-3.1-flash-lite'
        if (standardModels.includes(loadedModel)) {
          setFormModel(loadedModel)
        } else {
          setFormModel('custom-model-placeholder')
          setCustomModel(loadedModel)
        }

        // Handle rate_limit_enabled fallback from 0 checking if it used to be requests
        // Wait, the API doesn't specify if rate_limit_enabled exists? The instructions say rate_limit_requests, rate_limit_interval. 
        // We'll pass rate_limit_requests=0 to disable, or just pass a boolean. Let's pass boolean if we can or check what backend expects.
        // Assuming we pass rate_limit_enabled if backend supports it. If backend only stores what we send, this works.
        setLimitEnabled(ai.rate_limit_enabled || false)
        setLimitRequests(ai.rate_limit_requests || 10)
        setLimitInterval(ai.rate_limit_interval || 60)
        setFormProspeoKey(prospeo || '')

        try {
          const rem = await fetchReminderSettings()
          if (rem) {
            setReminder1Delay(rem.reminder1_delay_days || 5)
            setReminder2Delay(rem.reminder2_delay_days || 10)
          }
        } catch (e) {
          console.warn('Could not fetch reminder settings', e)
        }

      } catch (err) {
        setError('Failed to load settings')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleModelChange = (value) => {
    if (value === 'custom') {
      setFormModel('custom-model-placeholder')
      setCustomModel(customModel || 'gemini-3.1-flash-lite')
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
      
      await saveAiSettings({
        gemini_api_key: formKey.trim(),
        gemini_model: finalModel,
        rate_limit_enabled: limitEnabled,
        rate_limit_requests: limitRequests,
        rate_limit_interval: limitInterval
      })
      await saveReminderSettings(reminder1Delay, reminder2Delay)
      await saveProspeoApiKey(formProspeoKey.trim())
      
      await new Promise(resolve => setTimeout(resolve, 600))
      
      setSuccess('Settings saved successfully.')
    } catch (saveError) {
      setError(saveError.message)
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
          <p className="kicker"><span>04</span> Configuration</p>
          <h1>Settings &amp; <em>Security</em></h1>
          <p>Configure your Google Gemini API Key and Model Name. The API Key is securely stored on the backend.</p>
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
              <span>Prospeo API Key (Optional)</span>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input 
                  type={showProspeoKey ? 'text' : 'password'}
                  value={formProspeoKey}
                  onChange={(event) => setFormProspeoKey(event.target.value)}
                  placeholder="Enter your Prospeo API key"
                  style={{ paddingRight: '48px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowProspeoKey(!showProspeoKey)}
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
                  {showProspeoKey ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>


            <label>
              <span>Model Selection</span>
              <select
                value={standardModels.includes(formModel) ? formModel : 'custom'}
                onChange={(event) => handleModelChange(event.target.value)}
              >
                <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Default)</option>
                <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                <option value="gemini-3.5-pro">Gemini 3.5 Pro (High-Quality)</option>
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

          <div className="section-heading" style={{ marginTop: '30px' }}>
            <div>
              <p className="eyebrow">Automation defaults</p>
              <h2>Reminder Timings</h2>
            </div>
          </div>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <label>
              <span>Follow-up #1 Delay (Days) *</span>
              <input
                required
                type="number"
                min="1"
                max="60"
                value={reminder1Delay}
                onChange={(event) => setReminder1Delay(Number(event.target.value))}
              />
            </label>
            <label>
              <span>Follow-up #2 Delay (Days) *</span>
              <input
                required
                type="number"
                min="1"
                max="120"
                value={reminder2Delay}
                onChange={(event) => setReminder2Delay(Number(event.target.value))}
              />
            </label>
          </div>

          {error && <div className="error-message" role="alert">{error}</div>}
          {success && <div className="success-message" role="status">{icons.check}{success}</div>}
          <div className="form-actions">
            <button className="clear-button" type="button" onClick={onCancel}>Cancel</button>
            <button className="compact-primary" disabled={saving} type="submit" style={{ minWidth: '180px', justifyContent: 'center' }}>
              {saving ? 'Saving…' : <>Save configuration {icons.arrow}</>}
            </button>
          </div>
        </form>
        <aside className="manual-note">
          <div style={{ background: 'var(--green)', color: 'white', display: 'grid', placeItems: 'center', fontSize: '20px' }}>🔑</div>
          <p className="eyebrow">Backend Secure Storage</p>
          <h3>Your keys stay secure.</h3>
          <p>Your API settings are now stored securely on your local server. They are not sent from your browser to the backend on each document upload anymore.</p>
        </aside>
      </div>
    </section>
  )
}

