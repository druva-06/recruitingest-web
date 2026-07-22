import React, { useState, useEffect } from 'react';
import { fetchJobScoutConfig, saveJobScoutConfig } from '../../services/api';
import { loadJobScoutApifyKey, saveJobScoutApifyKey, loadJobScoutGeminiKey, saveJobScoutGeminiKey } from '../../utils/secureStorage';

export function JobScoutConfig() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [apifyKey, setApifyKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  
  const [config, setConfig] = useState({
    apify_actor_id: 'curious_coder/linkedin-jobs-scraper',
    gemini_model: 'gemini-2.5-flash',
    default_scrape_limit: 25,
    scrape_company: true,
    score_rate_mode: 'per_minute',
    score_rate_value: 5,
    score_interval_seconds: 60,
    top_n_results: 15,
    user_skills_experience: '',
    scoring_prompt: '',
    default_linkedin_url: ''
  });

  useEffect(() => {
    async function loadConfig() {
      try {
        const storedApifyKey = await loadJobScoutApifyKey();
        const storedGeminiKey = await loadJobScoutGeminiKey();
        if (storedApifyKey) setApifyKey('•••••••••••••••');
        if (storedGeminiKey) setGeminiKey('•••••••••••••••');

        const serverResponse = await fetchJobScoutConfig();
        // Server returns the config directly or nested under .config
        const serverConfig = serverResponse?.config ?? serverResponse;
        if (serverConfig && serverConfig.user_email) {
          setConfig(prev => ({
            ...prev,
            apify_actor_id:          serverConfig.apify_actor_id          ?? prev.apify_actor_id,
            gemini_model:            serverConfig.gemini_model             ?? prev.gemini_model,
            default_scrape_limit:    serverConfig.default_scrape_limit     ?? prev.default_scrape_limit,
            scrape_company:          serverConfig.scrape_company           ?? prev.scrape_company,
            score_rate_mode:         serverConfig.score_rate_mode          ?? prev.score_rate_mode,
            score_rate_value:        serverConfig.score_rate_value         ?? prev.score_rate_value,
            score_interval_seconds:  serverConfig.score_interval_seconds   ?? prev.score_interval_seconds,
            top_n_results:           serverConfig.top_n_results            ?? prev.top_n_results,
            user_skills_experience:  serverConfig.user_skills_experience   ?? prev.user_skills_experience,
            scoring_prompt:          serverConfig.scoring_prompt           ?? prev.scoring_prompt,
            default_linkedin_url:    serverConfig.default_linkedin_url     ?? prev.default_linkedin_url,
          }));
        }
      } catch (err) {
        if (!err.message.includes('404') && !err.message.includes('not_found')) {
          setError(err.message || 'Failed to load configuration.');
        }
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? Number(value) : value)
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    
    try {
      if (apifyKey && apifyKey !== '•••••••••••••••') {
        await saveJobScoutApifyKey(apifyKey);
      }
      if (geminiKey && geminiKey !== '•••••••••••••••') {
        await saveJobScoutGeminiKey(geminiKey);
      }
      
      const configToSave = { ...config };
      if (apifyKey && apifyKey !== '•••••••••••••••') configToSave.apify_api_key = apifyKey;
      if (geminiKey && geminiKey !== '•••••••••••••••') configToSave.gemini_api_key = geminiKey;
      
      await saveJobScoutConfig(configToSave);
      setSuccess('Job Scout configuration saved successfully.');
      
      if (apifyKey && apifyKey !== '•••••••••••••••') setApifyKey('•••••••••••••••');
      if (geminiKey && geminiKey !== '•••••••••••••••') setGeminiKey('•••••••••••••••');
    } catch (err) {
      setError(err.message || 'Failed to save configuration.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading configuration...</div>;

  return (
    <div className="manual-form">
      <h2 style={{ marginBottom: '20px', fontSize: '20px' }}>Job Scout Configuration</h2>
      <form onSubmit={handleSave} className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
        
        <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: '1fr 1fr' }}>
          <label>
            <span>Apify API Key</span>
            <input 
              type="password" 
              value={apifyKey} 
              onChange={e => setApifyKey(e.target.value)} 
              placeholder="Enter Apify Key"
            />
          </label>
          <label>
            <span>Apify Actor ID</span>
            <input 
              type="text" 
              name="apify_actor_id" 
              value={config.apify_actor_id} 
              onChange={handleChange} 
            />
          </label>
        </div>

        <div style={{ marginTop: '20px', marginBottom: '10px', fontWeight: 'bold' }}>Scoring Settings (Isolated)</div>
        <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: '1fr 1fr' }}>
          <label>
            <span>Gemini API Key</span>
            <input 
              type="password" 
              value={geminiKey} 
              onChange={e => setGeminiKey(e.target.value)} 
              placeholder="Enter Gemini Key"
            />
          </label>
          <label>
            <span>Gemini Model</span>
            <input
              type="text"
              name="gemini_model"
              value={config.gemini_model}
              onChange={handleChange}
              list="gemini-model-suggestions"
              placeholder="e.g. gemini-2.5-flash"
              autoComplete="off"
            />
            <datalist id="gemini-model-suggestions">
              <option value="gemini-3.5-flash-lite" />
              <option value="gemini-3.5-flash" />
              <option value="gemini-3.6-flash" />
              <option value="gemini-2.5-flash" />
              <option value="gemini-2.5-flash-lite" />
              <option value="gemini-2.5-pro" />
              <option value="gemini-2.0-flash" />
              <option value="gemini-2.0-flash-lite" />
              <option value="gemini-1.5-flash" />
              <option value="gemini-1.5-pro" />
            </datalist>
            <small style={{ color: 'var(--muted)', marginTop: '5px' }}>
              Pick a suggestion or type any valid Gemini model name.
            </small>
          </label>
        </div>

        <div style={{ marginTop: '20px', marginBottom: '10px', fontWeight: 'bold' }}>Scraping Defaults</div>
        <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: '1fr 1fr' }}>
          <label>
            <span>Default Scrape Limit</span>
            <input 
              type="number" 
              name="default_scrape_limit" 
              value={config.default_scrape_limit} 
              onChange={handleChange} 
              min="10" max="1000"
            />
          </label>
          <label style={{ flexDirection: 'row', alignItems: 'center' }}>
            <input 
              type="checkbox" 
              name="scrape_company" 
              checked={config.scrape_company} 
              onChange={handleChange} 
              style={{ minHeight: 'auto', width: 'auto', marginRight: '10px' }}
            />
            <span>Scrape Company Info</span>
          </label>
        </div>

        <div style={{ marginTop: '20px' }}>
          <label>
            <span>Default LinkedIn Search URL</span>
            <input 
              type="text" 
              name="default_linkedin_url" 
              value={config.default_linkedin_url || ''} 
              onChange={handleChange} 
              placeholder="https://www.linkedin.com/jobs/search/?keywords=..."
            />
          </label>
        </div>

        <div style={{ marginTop: '20px', marginBottom: '10px', fontWeight: 'bold' }}>AI Match Scoring Setup</div>
        <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: '1fr' }}>
          <label>
            <span>Your Skills & Experience (Alternative to PDF Resume)</span>
            <textarea 
              name="user_skills_experience" 
              value={config.user_skills_experience || ''} 
              onChange={handleChange} 
              rows="6"
              placeholder="Describe your skills, past experience, and what you are looking for... (e.g. 'Senior React Developer with 5 years experience, strong in Go and Node.js...')"
            />
          </label>
          <label>
            <span>Custom Scoring Prompt (Optional)</span>
            <textarea 
              name="scoring_prompt" 
              value={config.scoring_prompt || ''} 
              onChange={handleChange} 
              rows="8"
              placeholder="Leave empty to use the default expert career match prompt. Use {{TITLE}}, {{COMPANY}}, {{LOCATION}}, {{DESCRIPTION}}, and {{CANDIDATE_INFO}} as placeholders."
            />
          </label>
        </div>

        <div style={{ marginTop: '20px', marginBottom: '10px', fontWeight: 'bold' }}>Scoring Rate Limit</div>
        <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: '1fr 1fr' }}>
          <label>
            <span>Rate Mode</span>
            <select name="score_rate_mode" value={config.score_rate_mode} onChange={handleChange}>
              <option value="per_minute">Per Minute</option>
              <option value="per_hour">Per Hour</option>
              <option value="per_day">Per Day</option>
              <option value="custom_interval">Custom Interval</option>
            </select>
          </label>
          <label>
            <span>Jobs Per Interval</span>
            <input 
              type="number" 
              name="score_rate_value" 
              value={config.score_rate_value} 
              onChange={handleChange} 
              min="1"
            />
          </label>
          {config.score_rate_mode === 'custom_interval' && (
            <label>
              <span>Interval (Seconds)</span>
              <input 
                type="number" 
                name="score_interval_seconds" 
                value={config.score_interval_seconds} 
                onChange={handleChange} 
                min="1"
              />
            </label>
          )}
          <label>
            <span>Top N Results to Show</span>
            <input 
              type="number" 
              name="top_n_results" 
              value={config.top_n_results} 
              onChange={handleChange} 
              min="1"
            />
          </label>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="form-actions">
          <button type="submit" className="primary-button" disabled={saving}>
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
}
