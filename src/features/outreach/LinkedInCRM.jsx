import React, { useEffect, useState } from 'react'
import { fetchCrmDashboard, updateReferralStatus, deleteReferral } from '../../services/api'
import { icons } from '../../components/icons'
import { formatTime } from '../../utils/formatters'
import { ConfirmDeleteModal } from '../../components/ConfirmDeleteModal'

export function LinkedInCRM() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedJob, setExpandedJob] = useState(null)
  
  // New state for creating jobs
  const [showJobForm, setShowJobForm] = useState(false)
  const [newCompany, setNewCompany] = useState('')
  const [newRole, setNewRole] = useState('')
  const [newJobUrl, setNewJobUrl] = useState('')
  const [creating, setCreating] = useState(false)

  // Filters & Pagination
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [page, setPage] = useState(1)
  const limit = 5 // Jobs per page

  // Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetchCrmDashboard()
      setData(res.referrals || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateJob = async (e) => {
    e.preventDefault()
    if (!newCompany || !newRole) return
    setCreating(true)
    try {
      await fetch('/api/v1/crm/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_name: newCompany, role_title: newRole, job_url: newJobUrl })
      })
      setNewCompany('')
      setNewRole('')
      setNewJobUrl('')
      setShowJobForm(false)
      await loadData()
    } catch (err) {
      alert("Failed to create job: " + err.message)
    } finally {
      setCreating(false)
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

  // Process data
  const jobsMap = new Map()
  let totalLogged = 0
  let totalAccepted = 0
  let totalMessaged = 0
  let totalReferred = 0

  data.forEach(ref => {
    if (!jobsMap.has(ref.job_posting_id)) {
      jobsMap.set(ref.job_posting_id, {
        id: ref.job_posting_id,
        company_name: ref.company_name,
        role_title: ref.role_title,
        job_url: ref.job_url,
        job_created_at: ref.job_created_at,
        referrals: []
      })
    }
    // If the left join found a referral
    if (ref.referral_id && ref.referral_id !== 0) {
      jobsMap.get(ref.job_posting_id).referrals.push(ref)
      
      totalLogged++
      if (['Accepted', 'Messaged', 'Referred'].includes(ref.status)) totalAccepted++
      if (['Messaged', 'Referred'].includes(ref.status)) totalMessaged++
      if (ref.status === 'Referred') totalReferred++
    }
  })

  let jobs = Array.from(jobsMap.values())

  // Apply filters
  jobs = jobs.filter(job => {
    const q = search.toLowerCase()
    const matchesSearch = !search || 
      job.company_name.toLowerCase().includes(q) || 
      job.role_title.toLowerCase().includes(q)
    
    let matchesStatus = true
    if (statusFilter !== 'All') {
      if (statusFilter === 'Empty') {
        matchesStatus = job.referrals.length === 0
      } else {
        matchesStatus = job.referrals.some(r => r.status === statusFilter)
      }
    }

    return matchesSearch && matchesStatus
  })

  // Sort by created date descending
  jobs.sort((a, b) => new Date(b.job_created_at || 0) - new Date(a.job_created_at || 0))

  const totalPages = Math.ceil(jobs.length / limit)
  const paginatedJobs = jobs.slice((page - 1) * limit, page * limit)

  // Loading Skeleton Component
  const SkeletonCard = () => (
    <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1rem' }}>
      <div className="responsive-grid" style={{ alignItems: 'center' }}>
        <div className="rg-title">
          <div className="skeleton" style={{ height: '20px', width: '150px', marginBottom: '8px' }}></div>
          <div className="skeleton" style={{ height: '14px', width: '100px' }}></div>
        </div>
        <div>
          <div className="skeleton" style={{ height: '12px', width: '60px', marginBottom: '8px' }}></div>
          <div className="skeleton" style={{ height: '24px', width: '30px' }}></div>
        </div>
        <div>
          <div className="skeleton" style={{ height: '12px', width: '60px', marginBottom: '8px' }}></div>
          <div className="skeleton" style={{ height: '24px', width: '30px' }}></div>
        </div>
        <div>
          <div className="skeleton" style={{ height: '12px', width: '60px', marginBottom: '8px' }}></div>
          <div className="skeleton" style={{ height: '24px', width: '30px' }}></div>
        </div>
        <div>
          <div className="skeleton" style={{ height: '12px', width: '60px', marginBottom: '8px' }}></div>
          <div className="skeleton" style={{ height: '24px', width: '30px' }}></div>
        </div>
        <div className="rg-action skeleton" style={{ height: '24px', width: '24px', borderRadius: '50%' }}></div>
      </div>
    </div>
  )

  const MetricCard = ({ title, value, color }) => (
    <div style={{ flex: '1', minWidth: '150px', background: 'var(--paper)', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--line)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</div>
      <div style={{ fontSize: '24px', fontWeight: '700', color: color || 'var(--ink)' }}>{value}</div>
    </div>
  )

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      {/* Header Section */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', letterSpacing: '-0.02em', margin: '0 0 0.5rem 0' }}>Job Pipeline Dashboard</h1>
          <p style={{ color: 'var(--muted)', margin: 0, fontSize: '15px' }}>Track jobs and your logged candidates from LinkedIn.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => setShowJobForm(!showJobForm)} className="btn btn-primary">
            {icons.plus} Create Job
          </button>
        </div>
      </div>

      {/* Metrics Section */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <MetricCard title="Total Logged" value={totalLogged} />
        <MetricCard title="Total Accepted" value={totalAccepted} />
        <MetricCard title="Total Messaged" value={totalMessaged} />
        <MetricCard title="Total Referred" value={totalReferred} color="var(--green)" />
      </div>

      {/* Filters Section */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '2rem', alignItems: 'center' }}>
        <div style={{ flex: '1', height: '40px', maxWidth: '400px', display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid var(--line)', borderRadius: '8px', padding: '0 12px', gap: '8px' }}>
          <div style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>
          <input 
            type="text" 
            placeholder="Search by company or role..." 
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', height: '100%', fontSize: '14px', color: 'var(--ink)', padding: 0 }}
          />
        </div>
        <select 
          className="input" 
          style={{ width: '160px', height: '40px', padding: '0 12px', background: '#fff', border: '1px solid var(--line)', borderRadius: '8px', fontSize: '14px', color: 'var(--ink)', outline: 'none' }}
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
        >
          <option value="All">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Accepted">Accepted</option>
          <option value="Messaged">Messaged</option>
          <option value="Referred">Referred</option>
          <option value="Empty">No Candidates</option>
        </select>
      </div>

      {/* Error State */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '1rem', borderRadius: '8px', color: '#b91c1c', marginBottom: '2rem' }}>
          <strong>Error loading data:</strong> {error}
        </div>
      )}

      {/* Create Job Form (Slide down effect) */}
      {showJobForm && (
        <div style={{ background: 'var(--paper)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: '1px solid var(--line)', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '16px', fontWeight: '600' }}>Add Target Role</h3>
          <form onSubmit={handleCreateJob} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--muted)', marginBottom: '6px' }}>Company Name</label>
              <input type="text" value={newCompany} onChange={e => setNewCompany(e.target.value)} placeholder="e.g. Acme Corp" required style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--line)', background: '#fff' }} />
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--muted)', marginBottom: '6px' }}>Role Title</label>
              <input type="text" value={newRole} onChange={e => setNewRole(e.target.value)} placeholder="e.g. Backend Engineer" required style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--line)', background: '#fff' }} />
            </div>
            <div style={{ flex: '2 1 300px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--muted)', marginBottom: '6px' }}>Job Link (Optional)</label>
              <input type="url" value={newJobUrl} onChange={e => setNewJobUrl(e.target.value)} placeholder="https://..." style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--line)', background: '#fff' }} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={creating} style={{ height: '41px' }}>
              {creating ? 'Saving...' : 'Save Job'}
            </button>
          </form>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : paginatedJobs.length === 0 && !error ? (
        <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'var(--paper)', border: '1px dashed var(--line)', borderRadius: '12px' }}>
          <div style={{ color: 'var(--muted)', marginBottom: '1rem', transform: 'scale(1.5)' }}>{icons.users}</div>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '18px' }}>No jobs found</h3>
          <p style={{ color: 'var(--muted)', margin: 0, fontSize: '14px' }}>Try adjusting your filters or create a new job.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {paginatedJobs.map(job => {
            const contacted = job.referrals.length
            const accepted = job.referrals.filter(r => r.status === 'Accepted' || r.status === 'Messaged' || r.status === 'Referred').length
            const messaged = job.referrals.filter(r => r.status === 'Messaged' || r.status === 'Referred').length
            const referred = job.referrals.filter(r => r.status === 'Referred').length
            const isExpanded = expandedJob === job.id

            return (
              <div key={job.id} style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden', transition: 'box-shadow 0.2s ease', boxShadow: isExpanded ? '0 8px 16px rgba(0,0,0,0.03)' : 'none' }}>
                {/* Job Summary Row */}
                <div 
                  className="responsive-grid"
                  style={{ padding: '1.25rem 1.5rem', alignItems: 'center', cursor: 'pointer', background: isExpanded ? '#fbfcf8' : 'transparent' }}
                  onClick={() => setExpandedJob(isExpanded ? null : job.id)}
                >
                  <div className="rg-title" style={{ minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--ink)' }}>{job.company_name}</h3>
                      <span style={{ fontSize: '12px', color: 'var(--muted)', background: '#f3f4f6', padding: '2px 8px', borderRadius: '12px', fontWeight: '500' }}>
                        {formatTime(job.job_created_at)}
                      </span>
                    </div>
                    {job.job_url ? (
                      <a href={job.job_url} target="_blank" rel="noreferrer" style={{ color: 'var(--green)', fontSize: '14px', textDecoration: 'none', fontWeight: '500' }}>{job.role_title} ↗</a>
                    ) : (
                      <span style={{ color: 'var(--muted)', fontSize: '14px' }}>{job.role_title}</span>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Logged</div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--ink)' }}>{contacted}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Accepted</div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--ink)' }}>{accepted}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Messaged</div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--ink)' }}>{messaged}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Referred</div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: referred > 0 ? 'var(--green)' : 'var(--ink)' }}>{referred}</div>
                  </div>
                  <div className="rg-action" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    {icons.arrow}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--line)', background: '#fff' }}>
                    {job.referrals.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: '14px' }}>
                        No candidates logged for this role yet.
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                          <thead>
                            <tr style={{ textAlign: 'left', color: 'var(--muted)', fontSize: '12px', borderBottom: '1px solid var(--line)', background: '#fafbfa' }}>
                              <th style={{ padding: '12px 24px', fontWeight: '600' }}>Candidate Profile</th>
                              <th style={{ padding: '12px 24px', fontWeight: '600' }}>Status</th>
                              <th style={{ padding: '12px 24px', fontWeight: '600' }}>Last Updated</th>
                              <th style={{ padding: '12px 24px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {job.referrals.map(ref => (
                              <tr key={ref.referral_id} style={{ borderBottom: '1px solid var(--line)' }}>
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
                                  <span className={`badge ${ref.status === 'Referred' ? 'badge-green' : ref.status === 'Pending' ? 'badge-orange' : 'badge-gray'}`}>
                                    {ref.status}
                                  </span>
                                </td>
                                <td style={{ padding: '16px 24px', color: 'var(--muted)', fontSize: '13px' }}>
                                  {formatTime(ref.updated_at)}
                                </td>
                                <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                    {ref.status === 'Pending' && (
                                      <button onClick={() => handleUpdateStatus(ref.referral_id, 'Accepted')} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                                        Mark Accepted
                                      </button>
                                    )}
                                    {ref.status === 'Accepted' && (
                                      <button onClick={() => handleUpdateStatus(ref.referral_id, 'Messaged')} className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }}>
                                        Mark Messaged
                                      </button>
                                    )}
                                    {ref.status === 'Messaged' && (
                                      <button onClick={() => handleUpdateStatus(ref.referral_id, 'Referred')} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                                        Got Referral!
                                      </button>
                                    )}
                                    <button onClick={() => handleUpdateStatus(ref.referral_id, 'Follow-Up')} className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }}>
                                      Follow Up
                                    </button>
                                    <button onClick={() => promptDelete(ref.referral_id)} className="btn btn-outline" style={{ padding: '6px', color: '#ef4444', borderColor: '#fee2e2', background: '#fef2f2' }} title="Delete Contact">
                                      {icons.trash}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="pagination-bar" style={{ marginTop: '1.5rem', background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }}>
          <div className="pagination-info">
            Showing <strong>{(page - 1) * limit + 1}</strong> to <strong>{Math.min(page * limit, jobs.length)}</strong> of <strong>{jobs.length}</strong> jobs
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
