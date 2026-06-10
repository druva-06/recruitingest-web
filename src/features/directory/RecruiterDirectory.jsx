import React, { useState, useEffect, useCallback } from 'react'
import { icons } from '../../components/icons'
import { searchRecruiters } from '../../services/api'

export function RecruiterDirectory({ refreshKey, onAddRecruiter }) {
  const [filters, setFilters] = useState({ q: '', company: '', email: '' })
  const [recruiters, setRecruiters] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const LIMIT = 20

  const runSearch = useCallback(async (nextFilters = filters, nextPage = 1) => {
    setLoading(true)
    setError('')
    try {
      const payload = await searchRecruiters(nextFilters, nextPage, LIMIT)
      setRecruiters(payload.recruiters || [])
      setTotal(payload.total || 0)
      setPage(payload.page || 1)
    } catch (searchError) {
      setError(searchError.message)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    runSearch({ q: '', company: '', email: '' }, 1)
  }, [refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateFilter = (field, value) => setFilters((current) => ({ ...current, [field]: value }))
  const clearFilters = () => {
    const empty = { q: '', company: '', email: '' }
    setFilters(empty)
    runSearch(empty, 1)
  }

  const totalPages = Math.ceil(total / LIMIT) || 1

  const handlePrevPage = () => {
    if (page > 1) {
      runSearch(filters, page - 1)
    }
  }

  const handleNextPage = () => {
    if (page < totalPages) {
      runSearch(filters, page + 1)
    }
  }

  return (
    <section className="directory-page">
      <div className="page-intro">
        <div>
          <p className="kicker"><span>02</span> Recruiter intelligence</p>
          <h1>Find the right <em>contact.</em></h1>
          <p>Search every recruiter collected from documents or added manually.</p>
        </div>
        <button className="compact-primary" type="button" onClick={onAddRecruiter}>{icons.plus} Add recruiter</button>
      </div>

      <form className="search-panel" onSubmit={(event) => { event.preventDefault(); runSearch(filters, 1) }}>
        <label className="main-search">
          {icons.search}
          <input value={filters.q} onChange={(event) => updateFilter('q', event.target.value)} placeholder="Search name, title, company, email, or gmail.com…" />
        </label>
        <div className="filter-row">
          <label>{icons.building}<input value={filters.company} onChange={(event) => updateFilter('company', event.target.value)} placeholder="Filter by company" /></label>
          <label>{icons.mail}<input value={filters.email} onChange={(event) => updateFilter('email', event.target.value)} placeholder="Filter by email or domain" /></label>
          <button className="search-button" type="submit">{icons.search} Search</button>
          <button className="clear-button" type="button" onClick={clearFilters}>Clear</button>
        </div>
      </form>

      <div className="results-head">
        <div><p className="eyebrow">Contact database</p><h2>{loading ? 'Searching…' : `${total} recruiter${total === 1 ? '' : 's'} found`}</h2></div>
        <span>Page {page} of {totalPages}</span>
      </div>
      {error && <div className="error-message" role="alert">{error}</div>}
      {!loading && !error && (
        recruiters.length ? (
          <>
            <div className="recruiter-grid">
              {recruiters.map((recruiter) => (
                <article className="recruiter-card" key={recruiter.id}>
                  <div className="avatar">{recruiter.recruiter_name?.split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase()}</div>
                  <div className="recruiter-main">
                    <div className="recruiter-name"><div><h3>{recruiter.recruiter_name}</h3><p>{recruiter.recruiter_title || 'Recruiter'}</p></div><span>{recruiter.source_file === 'manual-entry' ? 'Manual' : 'Ingested'}</span></div>
                    <div className="contact-lines">
                      <a href={`mailto:${recruiter.recruiter_email}`}>{icons.mail}{recruiter.recruiter_email}</a>
                      <p>{icons.building}{recruiter.company_name || 'Company not provided'}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="pagination-bar">
                <button 
                  type="button" 
                  disabled={page === 1} 
                  onClick={handlePrevPage}
                  className="pagination-btn"
                >
                  &larr; Previous
                </button>
                <span className="pagination-info">
                  Page <strong>{page}</strong> of <strong>{totalPages}</strong> <small>({total} total recruiters)</small>
                </span>
                <button 
                  type="button" 
                  disabled={page === totalPages} 
                  onClick={handleNextPage}
                  className="pagination-btn"
                >
                  Next &rarr;
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="empty-directory">{icons.search}<h3>No recruiters matched your search</h3><p>Try a company, email domain, name, or add a new recruiter manually.</p><button type="button" onClick={onAddRecruiter}>Add recruiter</button></div>
        )
      )}
    </section>
  )
}
