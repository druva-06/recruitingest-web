import { loadSecureApiKey, loadProspeoApiKey, loadModelName, loadRateLimitSettings } from '../utils/secureStorage'

const API_BASE_URL = '/api/v1'

export async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`
  const headers = { ...(options.headers || {}) }

  try {
    const apiKey = await loadSecureApiKey()
    const prospeoKey = await loadProspeoApiKey()
    const modelName = loadModelName()
    const rateLimit = loadRateLimitSettings()

    if (apiKey) {
      headers['X-Gemini-API-Key'] = apiKey
    }
    if (prospeoKey) {
      headers['X-Prospeo-API-Key'] = prospeoKey
    }
    if (modelName) {
      headers['X-Gemini-Model'] = modelName
    }
    if (rateLimit.enabled) {
      headers['X-Rate-Limit-Requests'] = String(rateLimit.requests)
      headers['X-Rate-Limit-Interval'] = String(rateLimit.interval)
    }
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

  const response = await fetch(url, {
    ...options,
    headers,
    body,
    credentials: 'include',
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.error || 'API request failed')
  }
  return payload
}


export function uploadDocument(file, apiKey, modelName, rateLimitEnabled, rateLimitRequests, rateLimitInterval, onProgress) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    const formData = new FormData()
    formData.append('file', file)

    request.open('POST', `${API_BASE_URL}/upload`)
    request.withCredentials = true // Send session cookie with the upload

    if (apiKey) {
      request.setRequestHeader('X-Gemini-API-Key', apiKey)
    }
    if (modelName) {
      request.setRequestHeader('X-Gemini-Model', modelName)
    }
    if (rateLimitEnabled) {
      request.setRequestHeader('X-Rate-Limit-Requests', String(rateLimitRequests))
      request.setRequestHeader('X-Rate-Limit-Interval', String(rateLimitInterval))
    }
    request.responseType = 'json'
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    }
    request.onload = () => {
      const response = request.response || {}
      if (request.status >= 200 && request.status < 300) {
        resolve(response)
      } else {
        reject(new Error(response.error || 'The upload could not be started.'))
      }
    }
    request.onerror = () => reject(new Error('Could not connect to the ingestion service.'))
    request.send(formData)
  })
}

export async function fetchJob(jobId) {
  const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`, { credentials: 'include' })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.error || 'Could not refresh job progress.')
  }
  return payload
}

export async function fetchRecentJobs() {
  const response = await fetch(`${API_BASE_URL}/jobs/recent`, { credentials: 'include' })
  const payload = await response.json().catch(() => ([]))
  if (!response.ok) {
    throw new Error(payload.error || 'Could not retrieve recent jobs.')
  }
  return payload
}

export async function searchRecruiters(filters = {}, page = 1, limit = 20) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value?.trim()) {
      params.set(key, value.trim())
    }
  })
  params.set('page', page)
  params.set('limit', limit)
  const response = await fetch(`${API_BASE_URL}/recruiters?${params}`, { credentials: 'include' })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.error || 'Could not search recruiters.')
  }
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
  if (!response.ok) {
    throw new Error(payload.error || 'Could not add recruiter.')
  }
  return payload
}

