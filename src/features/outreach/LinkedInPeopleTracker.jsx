import React, { useState, useEffect } from 'react'
import { icons } from '../../components/icons'
import { fetchCrmDashboard, updateReferralStatus, deleteReferral } from '../../services/api'
import { formatTime } from '../../utils/formatters'
import { ConfirmDeleteModal } from '../../components/ConfirmDeleteModal'

export function LinkedInPeopleTracker() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Filtering & Pagination
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const limit = 10

  // Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetchCrmDashboard()
      const actualCandidates = (res.referrals || []).filter(r => r.referral_id && r.referral_id !== 0 && r.profile_name)
      setData(actualCandidates)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleUpdateStatus = async (id, status) => {
    try {
      await updateReferralStatus(id, status)
      await loadData()
    } catch (err) {
      alert("Failed to update status: " + err.message)
    }
  }

  const promptDelete = (id) => {
    setDeletingId(id)
    setDeleteModalOpen(true)
  }

  const executeDelete = async () => {
    if (!deletingId) return
    setIsDeleting(true)
    try {
      await deleteReferral(deletingId)
      await loadData()
      setDeleteModalOpen(false)
    } catch (err) {
      alert("Failed to delete contact: " + err.message)
    } finally {
      setIsDeleting(false)
      setDeletingId(null)
    }
  }

  const filteredData = data.filter(ref => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (ref.profile_name || '').toLowerCase().includes(q) ||
      (ref.current_company || '').toLowerCase().includes(q) ||
      (ref.current_role || '').toLowerCase().includes(q) ||
      (ref.company_name || '').toLowerCase().includes(q) || // Target job company
      (ref.status || '').toLowerCase().includes(q)
    )
  })

  const totalPages = Math.ceil(filteredData.length / limit)
  const paginatedData = filteredData.slice((page - 1) * limit, page * limit)

  // Loading Skeleton Component
  const SkeletonRow = () => (
    <tr style={{ borderBottom: '1px solid var(--line)' }}>
      <td style={{ padding: '16px 24px' }}>
        <div className="skeleton" style={{ height: '16px', width: '120px', marginBottom: '8px' }}></div>
        <div className="skeleton" style={{ height: '12px', width: '80px' }}></div>
      </td>
      <td style={{ padding: '16px 24px' }}><div className="skeleton" style={{ height: '24px', width: '80px', borderRadius: '12px' }}></div></td>
      <td style={{ padding: '16px 24px' }}><div className="skeleton" style={{ height: '14px', width: '100px' }}></div></td>
      <td style={{ padding: '16px 24px' }}><div className="skeleton" style={{ height: '14px', width: '80px' }}></div></td>
      <td style={{ padding: '16px 24px' }}><div className="skeleton" style={{ height: '32px', width: '100px', float: 'right' }}></div></td>
    </tr>
  )

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      {/* Header Section */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', letterSpacing: '-0.02em', margin: '0 0 0.5rem 0' }}>Network Tracker</h1>
          <p style={{ color: 'var(--muted)', margin: 0, fontSize: '15px' }}>Track and manage all your individual LinkedIn connections.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ height: '40px', width: '300px', display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid var(--line)', borderRadius: '8px', padding: '0 12px', gap: '8px' }}>
            <div style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </div>
            <input 
              type="text" 
              placeholder="Search people, companies..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', height: '100%', fontSize: '14px', color: 'var(--ink)', padding: 0 }}
            />
          </div>
          <button onClick={loadData} className="btn btn-secondary">
            {icons.refresh}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '1rem', borderRadius: '8px', color: '#b91c1c', marginBottom: '2rem' }}>
          <strong>Error loading data:</strong> {error}
        </div>
      )}

      {/* Main Table Area */}
      <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--muted)', fontSize: '12px', borderBottom: '1px solid var(--line)', background: '#fafbfa' }}>
                <th style={{ padding: '14px 24px', fontWeight: '600' }}>Candidate Profile</th>
                <th style={{ padding: '14px 24px', fontWeight: '600' }}>Status</th>
                <th style={{ padding: '14px 24px', fontWeight: '600' }}>Target Role</th>
                <th style={{ padding: '14px 24px', fontWeight: '600' }}>Last Updated</th>
                <th style={{ padding: '14px 24px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                    <div style={{ color: 'var(--muted)', marginBottom: '1rem', transform: 'scale(1.5)' }}>{icons.users}</div>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '16px' }}>No contacts found</h3>
                    <p style={{ color: 'var(--muted)', margin: 0, fontSize: '14px' }}>
                      {search ? "No matches for your search." : "You haven't logged any LinkedIn outreach yet."}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedData.map(ref => (
                  <tr key={ref.referral_id} style={{ borderBottom: '1px solid var(--line)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#fbfcf8'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <a href={ref.linkedin_url} target="_blank" rel="noreferrer" style={{ color: 'var(--ink)', fontWeight: '600', textDecoration: 'none', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {ref.profile_name}
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                        </a>
                        {(ref.current_company || ref.current_role) && (
                          <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                            {ref.current_role} {ref.current_company ? <span style={{ color: 'var(--ink)', fontWeight: '500' }}>@ {ref.current_company}</span> : ''}
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span className={`badge ${ref.connection_status === 'Connected' ? 'badge-green' : 'badge-orange'}`} title="Connection Status">
                          🔗 {ref.connection_status || 'Pending'}
                        </span>
                        {ref.status && (
                          <span className={`badge ${ref.status === 'Referred' ? 'badge-green' : ref.status === 'Messaged' ? 'badge-blue' : 'badge-gray'}`} title="Referral Status">
                            📋 {ref.status}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--ink)' }}>{ref.company_name}</div>
                      <div style={{ fontSize: '13px', color: 'var(--muted)' }}>{ref.role_title}</div>
                    </td>
                    <td style={{ padding: '16px 24px', color: 'var(--muted)', fontSize: '13px' }}>
                      {formatTime(ref.updated_at)}
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          {ref.status === 'Logged' && (
                            <button onClick={() => handleUpdateStatus(ref.referral_id, 'Messaged')} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                              Mark Messaged
                            </button>
                          )}
                          {ref.status === 'Messaged' && (
                            <button onClick={() => handleUpdateStatus(ref.referral_id, 'Referred')} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                              Got Referral! 🎉
                            </button>
                          )}
                          {ref.status !== 'Referred' && (
                            <button onClick={() => handleUpdateStatus(ref.referral_id, 'Follow-Up')} className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }}>
                              Follow Up
                            </button>
                          )}
                        <button onClick={() => promptDelete(ref.referral_id)} className="btn btn-outline" style={{ padding: '6px', color: '#ef4444', borderColor: '#fee2e2', background: '#fef2f2' }} title="Delete Contact">
                          {icons.trash}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="pagination-bar" style={{ marginTop: '1.5rem', background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }}>
          <div className="pagination-info">
            Showing <strong>{(page - 1) * limit + 1}</strong> to <strong>{Math.min(page * limit, filteredData.length)}</strong> of <strong>{filteredData.length}</strong> people
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="pagination-btn" 
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              Previous
            </button>
            <button 
              className="pagination-btn" 
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
      
      <ConfirmDeleteModal 
        isOpen={deleteModalOpen} 
        onClose={() => setDeleteModalOpen(false)} 
        onConfirm={executeDelete} 
        isDeleting={isDeleting} 
      />
    </div>
  )
}
