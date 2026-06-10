import React from 'react'
import { icons } from '../../components/icons'
import { StatusBadge } from '../../components/StatusBadge'
import { formatTime } from '../../utils/formatters'

export function JobProgress({ job, fileName, onReset }) {
  const total = job?.total_chunks || 0
  const processed = job?.processed_chunks || 0
  const percent = job?.status === 'completed' ? 100 : total ? Math.round((processed / total) * 100) : 8
  const isDone = job?.status === 'completed'
  const isFailed = job?.status === 'failed'

  return (
    <section className={`progress-card ${isDone ? 'is-complete' : ''} ${isFailed ? 'is-failed' : ''}`} aria-live="polite">
      <div className="progress-card-head">
        <div className="file-icon">{isDone ? icons.check : icons.file}</div>
        <div>
          <p className="eyebrow">{isDone ? 'Ingestion complete' : isFailed ? 'Ingestion stopped' : 'Processing document'}</p>
          <h2>{fileName || 'Recruiter document'}</h2>
        </div>
        <StatusBadge status={job?.status} />
      </div>

      <div className="progress-visual">
        <div className="progress-meta">
          <span>{isDone ? 'Ready in your database' : isFailed ? 'Review the service logs and try again' : 'Extracting recruiter contacts'}</span>
          <strong>{percent}%</strong>
        </div>
        <div className="progress-track">
          <span style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div className="progress-stats">
        <div><span>Chunks processed</span><strong>{processed}<small> / {total || '—'}</small></strong></div>
        <div><span>Job started</span><strong>{formatTime(job?.created_at)}</strong></div>
        <div><span>Job reference</span><strong className="job-reference">{job?.job_id?.slice(0, 8) || 'Creating'}</strong></div>
      </div>

      <button className="secondary-button" type="button" onClick={onReset}>
        {icons.upload} Upload another document
      </button>
    </section>
  )
}
