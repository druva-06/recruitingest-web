import React, { useState } from 'react';
import { JobScoutConfig } from './JobScoutConfig';
import { JobScoutLauncher } from './JobScoutLauncher';
import { JobScoutRuns } from './JobScoutRuns';

export function JobScout({ user }) {
  const [activeTab, setActiveTab] = useState('runs');

  return (
    <div>
      <div className="page-intro" style={{ marginBottom: '20px' }}>
        <div>
          <h1>Job Scout <em>AI</em></h1>
          <p>Scan LinkedIn and score jobs against your resume.</p>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '15px', marginBottom: '30px' }}>
        <button 
          className={activeTab === 'runs' ? 'primary-button' : 'secondary-button'} 
          style={{ width: 'auto', minHeight: '40px', padding: '0 20px', marginTop: 0 }}
          onClick={() => setActiveTab('runs')}
        >
          Runs & Results
        </button>
        <button 
          className={activeTab === 'launcher' ? 'primary-button' : 'secondary-button'}
          style={{ width: 'auto', minHeight: '40px', padding: '0 20px', marginTop: 0 }}
          onClick={() => setActiveTab('launcher')}
        >
          New Scan
        </button>
        <button 
          className={activeTab === 'config' ? 'primary-button' : 'secondary-button'}
          style={{ width: 'auto', minHeight: '40px', padding: '0 20px', marginTop: 0 }}
          onClick={() => setActiveTab('config')}
        >
          Configuration
        </button>
      </div>

      <div className="job-scout-content">
        {activeTab === 'config' && <JobScoutConfig />}
        {activeTab === 'launcher' && <JobScoutLauncher onStart={() => setActiveTab('runs')} />}
        {activeTab === 'runs' && <JobScoutRuns />}
      </div>
    </div>
  );
}
