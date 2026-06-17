import React from 'react'

export function ConfirmDeleteModal({ isOpen, onClose, onConfirm, isDeleting, title = "Delete Contact", message = "Are you sure you want to delete this contact? This action cannot be undone." }) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-title">{title}</div>
        <div className="modal-body">{message}</div>
        <div className="modal-actions">
          <button 
            className="btn btn-outline" 
            onClick={onClose} 
            disabled={isDeleting}
            style={{ padding: '8px 16px' }}
          >
            Cancel
          </button>
          <button 
            className="btn btn-primary" 
            onClick={onConfirm} 
            disabled={isDeleting}
            style={{ padding: '8px 16px', background: '#ef4444', color: 'white', border: 'none' }}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
