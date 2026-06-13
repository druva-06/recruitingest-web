import React, { useState, useEffect } from 'react'
import { icons } from '../../components/icons'
import { extractRecruitersFromText, getJobStatus, bulkCreateRecruiters } from '../../services/api'
import './AIPasteModal.css'

export function AIPasteModal({ onClose, onCreated }) {
  const [text, setText] = useState('')
  const [phase, setPhase] = useState('input') // 'input', 'processing', 'review', 'saving'
  const [jobId, setJobId] = useState(null)
  const [recruiters, setRecruiters] = useState([])
  const [selectedIndices, setSelectedIndices] = useState(new Set())
  const [error, setError] = useState('')
  const [editingIndex, setEditingIndex] = useState(null)
  const [editingForm, setEditingForm] = useState({})

  // Poll for job status
  useEffect(() => {
    let interval
    if (phase === 'processing' && jobId) {
      interval = setInterval(async () => {
        try {
          const status = await getJobStatus(jobId)
          if (status.status === 'completed') {
            clearInterval(interval)
            const result = typeof status.result === 'string' ? JSON.parse(status.result || '{}') : (status.result || {})
            const extracted = result.recruiters || []
            setRecruiters(extracted)
            setSelectedIndices(new Set(extracted.map((_, i) => i))) // Select all by default
            setPhase('review')
          } else if (status.status === 'failed') {
            clearInterval(interval)
            setError(status.error_message || 'AI extraction failed.')
            setPhase('input')
          }
        } catch (err) {
          clearInterval(interval)
          setError('Failed to check job status.')
          setPhase('input')
        }
      }, 3000)
    }
    return () => clearInterval(interval)
  }, [phase, jobId])

  const handleExtract = async () => {
    if (!text.trim()) return
    setError('')
    setPhase('processing')
    try {
      const resp = await extractRecruitersFromText(text)
      setJobId(resp.job_id)
    } catch (err) {
      setError(err.message)
      setPhase('input')
    }
  }

  const toggleSelection = (index) => {
    const newSet = new Set(selectedIndices)
    if (newSet.has(index)) newSet.delete(index)
    else newSet.add(index)
    setSelectedIndices(newSet)
  }

  const toggleAll = () => {
    if (selectedIndices.size === recruiters.length) {
      setSelectedIndices(new Set())
    } else {
      setSelectedIndices(new Set(recruiters.map((_, i) => i)))
    }
  }

  const startEdit = (index) => {
    setEditingIndex(index)
    setEditingForm(recruiters[index])
  }

  const cancelEdit = () => {
    setEditingIndex(null)
    setEditingForm({})
  }

  const saveEdit = (index) => {
    const updated = [...recruiters]
    updated[index] = editingForm
    setRecruiters(updated)
    setEditingIndex(null)
  }

  const handleApprove = async () => {
    const toInsert = recruiters.filter((_, i) => selectedIndices.has(i))
    if (toInsert.length === 0) return
    
    setError('')
    setPhase('saving')
    try {
      await bulkCreateRecruiters(toInsert)
      onCreated() // refresh parent directory
      onClose()
    } catch (err) {
      setError(err.message)
      setPhase('review')
    }
  }

  return (
    <div className="modal-overlay">
      <div className="ai-paste-modal">
        <header className="modal-header">
          <h2>{icons.sparkles} Paste with AI</h2>
          <button className="icon-button" onClick={onClose}>{icons.close}</button>
        </header>
        
        <div className="modal-body">
          {error && <div className="error-message">{error}</div>}

          {phase === 'input' && (
            <div className="phase-input">
              <p>Paste text containing recruiter names, emails, and companies. Our AI will extract the details for you.</p>
              <textarea 
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="e.g. Maya Patel is a Senior Recruiter at Acme Corp. Email her at maya@acme.com"
                rows={8}
              />
            </div>
          )}

          {phase === 'processing' && (
            <div className="phase-processing">
              <div className="spinner"></div>
              <p>Extracting details using AI...</p>
            </div>
          )}

          {(phase === 'review' || phase === 'saving') && (
            <div className="phase-review">
              <p>Review the extracted recruiters. Select the ones you want to add.</p>
              {recruiters.length === 0 ? (
                <p className="no-results">No recruiters could be extracted from the text.</p>
              ) : (
                <div className="extracted-list">
                  <div className="list-header">
                    <label>
                      <input 
                        type="checkbox" 
                        checked={selectedIndices.size === recruiters.length && recruiters.length > 0} 
                        onChange={toggleAll} 
                      />
                      <span>Select All ({selectedIndices.size}/{recruiters.length})</span>
                    </label>
                  </div>
                  {recruiters.map((rec, i) => (
                    <div key={i} className="extracted-card">
                      <label className="checkbox-label">
                        <input 
                          type="checkbox" 
                          checked={selectedIndices.has(i)} 
                          onChange={() => toggleSelection(i)} 
                          disabled={editingIndex === i}
                        />
                      </label>
                      
                      {editingIndex === i ? (
                        <div className="card-edit-form">
                          <input 
                            value={editingForm.recruiter_name || ''} 
                            onChange={e => setEditingForm({...editingForm, recruiter_name: e.target.value})} 
                            placeholder="Name" 
                          />
                          <input 
                            value={editingForm.recruiter_title || ''} 
                            onChange={e => setEditingForm({...editingForm, recruiter_title: e.target.value})} 
                            placeholder="Title" 
                          />
                          <input 
                            value={editingForm.recruiter_email || ''} 
                            onChange={e => setEditingForm({...editingForm, recruiter_email: e.target.value})} 
                            placeholder="Email" 
                          />
                          <input 
                            value={editingForm.company_name || ''} 
                            onChange={e => setEditingForm({...editingForm, company_name: e.target.value})} 
                            placeholder="Company" 
                          />
                          <div className="edit-actions">
                            <button className="compact-primary" onClick={() => saveEdit(i)}>Save</button>
                            <button className="clear-button" onClick={cancelEdit}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="card-details">
                          <div className="card-header-row">
                            <strong>{rec.recruiter_name || 'Unknown Name'}</strong>
                            <button className="icon-button edit-btn" onClick={() => startEdit(i)} title="Edit details">{icons.edit}</button>
                          </div>
                          <span className="title">{rec.recruiter_title}</span>
                          <div className="contact-info">
                            <span>{icons.mail} {rec.recruiter_email || 'No email'}</span>
                            <span>{icons.building} {rec.company_name || 'No company'}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <footer className="modal-footer">
          <button className="clear-button" onClick={onClose} disabled={phase === 'processing' || phase === 'saving'}>Cancel</button>
          
          {phase === 'input' && (
            <button className="compact-primary" onClick={handleExtract} disabled={!text.trim()}>
              Extract details {icons.sparkles}
            </button>
          )}

          {(phase === 'review' || phase === 'saving') && recruiters.length > 0 && (
            <button className="compact-primary" onClick={handleApprove} disabled={phase === 'saving' || selectedIndices.size === 0}>
              {phase === 'saving' ? 'Saving...' : `Approve ${selectedIndices.size} Selected`}
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}
