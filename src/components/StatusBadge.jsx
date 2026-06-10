import React from 'react'

export function StatusBadge({ status = 'pending' }) {
  return (
    <span className={`status-badge status-${status}`}>
      <span className="status-dot" />
      {status}
    </span>
  )
}
