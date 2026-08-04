// Thin wrapper around the GitHub Contents API, used only by the admin panel
// to read and commit the cv.json data file. Nothing here runs on the public
// site — the public site just fetches the plain JSON file over HTTP.

const API = 'https://api.github.com'

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  }
}

// Encode a JS string as base64, safely handling UTF-8 (emoji, accents, etc.)
function toBase64(str) {
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  bytes.forEach((b) => (binary += String.fromCharCode(b)))
  return btoa(binary)
}

function fromBase64(b64) {
  const binary = atob(b64)
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

// Verifies the token/repo/path combination works and returns basic repo info.
export async function verifyAccess({ token, owner, repo }) {
  const res = await fetch(`${API}/repos/${owner}/${repo}`, {
    headers: authHeaders(token)
  })
  if (!res.ok) {
    if (res.status === 404) throw new Error('Repo not found, or token cannot see it.')
    if (res.status === 401) throw new Error('Token is invalid or expired.')
    throw new Error(`GitHub error (${res.status}) while checking repo access.`)
  }
  return res.json()
}

// Fetches the current cv.json content + its sha (needed to commit an update).
export async function fetchFile({ token, owner, repo, branch, path }) {
  const url = `${API}/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`
  const res = await fetch(url, { headers: authHeaders(token) })

  if (res.status === 404) {
    // File doesn't exist yet — that's fine, the save step will create it.
    return { data: null, sha: null }
  }
  if (!res.ok) {
    throw new Error(`Could not read ${path} (${res.status}).`)
  }
  const json = await res.json()
  const content = fromBase64(json.content.replace(/\n/g, ''))
  return { data: JSON.parse(content), sha: json.sha }
}

// Commits an updated cv.json straight to the given branch.
export async function saveFile({ token, owner, repo, branch, path, data, sha, message }) {
  const url = `${API}/repos/${owner}/${repo}/contents/${path}`
  const body = {
    message: message || 'Update CV data',
    content: toBase64(JSON.stringify(data, null, 2)),
    branch
  }
  if (sha) body.sha = sha

  const res = await fetch(url, {
    method: 'PUT',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `Could not save (${res.status}).`)
  }
  return res.json()
}
