import React, { useState } from 'react';
import { startJobScout } from '../../services/api';

export function JobScoutLauncher({ onStart }) {
  const [url, setUrl] = useState('');
  const [limit, setLimit] = useState('');
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  const handleStart = async (e) => {
    e.preventDefault();
    setError('');
    setStarting(true);
    try {
      const body = { linkedin_url: url };
      if (limit) body.scrape_limit = Number(limit);
      
      await startJobScout(body);
      onStart();
    } catch (err) {
      setError(err.message || 'Failed to start scan.');
      setStarting(false);
    }
  };

  return (
    <div className="manual-form">
      <h2 style={{ marginBottom: '20px', fontSize: '20px' }}>Start New Job Scan</h2>
      <form onSubmit={handleStart} className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
        
        <label>
          <span>LinkedIn Search URL (Optional)</span>
          <input 
            type="text" 
            value={url} 
            onChange={e => setUrl(e.target.value)} 
            placeholder="Leave empty to use Default URL from Config"
          />
          <small style={{ color: 'var(--muted)', marginTop: '5px' }}>
            💡 Go to LinkedIn → Search jobs → Copy the URL. Leave empty to use the Default URL from your Config.
          </small>
        </label>
        
        <label style={{ marginTop: '10px' }}>
          <span>Override Limit (Optional)</span>
          <input 
            type="number" 
            value={limit} 
            onChange={e => setLimit(e.target.value)} 
            placeholder="Leave empty for default"
            min="10"
          />
        </label>

        <div style={{ marginTop: '20px', padding: '15px', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '8px' }}>
          <strong>⚠️ Pre-flight info:</strong>
          <ul style={{ margin: '10px 0 0 20px', fontSize: '13px', color: 'var(--muted)' }}>
            <li>Jobs will be scraped in the background.</li>
            <li>Scoring will proceed according to your rate limit.</li>
          </ul>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="form-actions">
          <button type="submit" className="primary-button" disabled={starting}>
            {starting ? 'Starting...' : '🚀 Start Scanning'}
          </button>
        </div>
      </form>
    </div>
  );
}
