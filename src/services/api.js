import { loadProspeoApiKey } from '../utils/secureStorage'

const API_BASE_URL = '/api/v1'

export async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`
  const headers = { ...(options.headers || {}) }

  try {
    const prospeoKey = await loadProspeoApiKey()
    if (prospeoKey) headers['X-Prospeo-API-Key'] = prospeoKey
  } catch (e) {
    console.error('Failed to load secure settings for API request:', e)
  }

  let body = options.body
  if (body && !(body instanceof FormData)) {
    if (typeof body === 'object') {
      body = JSON.stringify(body)
      headers['Content-Type'] = 'application/json'
    }
  }

  const response = await fetch(url, { ...options, headers, body, credentials: 'include' })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'API request failed')
  return payload
}

export function uploadDocument(file, onProgress) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    const formData = new FormData()
    formData.append('file', file)
    request.open('POST', `${API_BASE_URL}/upload`)
    request.withCredentials = true
    request.responseType = 'json'
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100))
    }
    request.onload = () => {
      const response = request.response || {}
      if (request.status >= 200 && request.status < 300) resolve(response)
      else reject(new Error(response.error || 'The upload could not be started.'))
    }
    request.onerror = () => reject(new Error('Could not connect to the ingestion service.'))
    request.send(formData)
  })
}

export async function fetchJob(jobId) {
  const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`, { credentials: 'include' })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'Could not refresh job progress.')
  return payload
}

export async function getJobStatus(jobId) {
  return fetchJob(jobId)
}

export async function fetchRecentJobs() {
  const response = await fetch(`${API_BASE_URL}/jobs/recent`, { credentials: 'include' })
  const payload = await response.json().catch(() => ([]))
  if (!response.ok) throw new Error(payload.error || 'Could not retrieve recent jobs.')
  return payload
}

export async function searchRecruiters(filters = {}, page = 1, limit = 20) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => { if (value?.trim()) params.set(key, value.trim()) })
  params.set('page', page)
  params.set('limit', limit)
  const response = await fetch(`${API_BASE_URL}/recruiters?${params}`, { credentials: 'include' })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'Could not search recruiters.')
  return payload
}

export async function createRecruiter(recruiter) {
  const response = await fetch(`${API_BASE_URL}/recruiters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(recruiter),
    credentials: 'include',
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'Could not add recruiter.')
  return payload
}

// --- Reminder API helpers ---

export async function fetchReminderDrafts() {
  return apiFetch('/reminders/drafts')
}

export async function fetchReminderCount() {
  return apiFetch('/reminders/count')
}

export async function sendReminderDrafts(draftIds) {
  return apiFetch('/reminders/send', { method: 'POST', body: { draft_ids: draftIds } })
}

export async function generateReminderDrafts() {
  return apiFetch('/reminders/generate', { method: 'POST', body: {} })
}

export async function updateReminderDraft(id, subject, body) {
  return apiFetch(`/reminders/drafts/${id}`, { method: 'PATCH', body: { subject, body } })
}

export async function rejectReminderDraft(id) {
  const response = await fetch(`${API_BASE_URL}/reminders/drafts/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'Failed to reject draft.')
  return payload
}

export async function updateEmailStatus(id, status) {
  return apiFetch(`/outreach/emails/${id}/status`, { method: 'PATCH', body: { status } })
}

export async function updateEmailDelays(id, reminder1DelayDays, reminder2DelayDays) {
  return apiFetch(`/outreach/emails/${id}/delays`, {
    method: 'PATCH',
    body: { reminder1_delay_days: reminder1DelayDays, reminder2_delay_days: reminder2DelayDays }
  })
}

export async function fetchReminderSettings() {
  return apiFetch('/reminders/settings')
}

export async function saveReminderSettings(reminder1DelayDays, reminder2DelayDays) {
  return apiFetch('/reminders/settings', {
    method: 'POST',
    body: { reminder1_delay_days: reminder1DelayDays, reminder2_delay_days: reminder2DelayDays }
  })
}

// --- AI Settings API ---

export async function fetchAiSettings() {
  return apiFetch('/settings/ai')
}

export async function saveAiSettings(settings) {
  return apiFetch('/settings/ai', {
    method: 'POST',
    body: settings
  })
}

export async function extractRecruitersFromText(text) {
  return apiFetch('/extract-recruiters', {
    method: 'POST',
    body: { text }
  })
}

export async function bulkCreateRecruiters(recruiters) {
  return apiFetch('/recruiters/bulk', {
    method: 'POST',
    body: { recruiters }
  })
}

// CRM API Endpoints
export async function fetchCrmDashboard() {
  return apiFetch('/crm/dashboard')
}

export async function createCrmJob(body) {
  return apiFetch('/crm/jobs', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateReferralStatus(referralRequestId, status) {
  return apiFetch('/crm/outreach/status', {
    method: 'PATCH',
    body: {
      referral_request_id: referralRequestId,
      status: status
    }
  })
}

export async function deleteReferral(referralRequestId) {
  const response = await fetch(`${API_BASE_URL}/crm/outreach/${referralRequestId}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'Failed to delete referral request.')
  return payload
}

// ─── Job Scout (Isolated) ───────────────────────────

export async function fetchJobScoutConfig() {
  return apiFetch('/job-scout/config')
}

export async function saveJobScoutConfig(body) {
  return apiFetch('/job-scout/config', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export async function startJobScout(body) {
  return apiFetch('/job-scout/start', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function fetchJobScoutRuns() {
  return apiFetch('/job-scout/runs')
}

export async function fetchJobScoutRun(id) {
  return apiFetch(`/job-scout/runs/${id}`)
}

export async function deleteJobScoutRun(id) {
  return apiFetch(`/job-scout/runs/${id}`, { method: 'DELETE' })
}

export async function rescoreJobScoutRun(id) {
  return apiFetch(`/job-scout/runs/${id}/rescore`, { method: 'POST' })
}

