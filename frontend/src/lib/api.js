/**
 * api.js
 *
 * Talks to the backend's HTTP endpoints (register/login/create room/
 * list my rooms) and manages the JWT in localStorage.
 *
 * Note on localStorage: this is a real deployed app running in a real
 * browser, not a Claude-generated artifact — the "no localStorage"
 * restriction that applies to Claude artifacts does NOT apply here.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'
const TOKEN_KEY = 'syncspace_token'
const USERNAME_KEY = 'syncspace_username'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getUsername() {
  return localStorage.getItem(USERNAME_KEY)
}

function setSession(token, username) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USERNAME_KEY, username)
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USERNAME_KEY)
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = getToken()
    if (!token) throw new Error('Not logged in')
    headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`)
  }

  return data
}

export async function register(username, password) {
  const data = await request('/auth/register', {
    method: 'POST',
    body: { username, password },
  })
  setSession(data.token, data.username)
  return data
}

export async function login(username, password) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: { username, password },
  })
  setSession(data.token, data.username)
  return data
}

export async function createRoom(roomId) {
  return request('/rooms', { method: 'POST', body: { roomId }, auth: true })
}

export async function getMyRooms() {
  return request('/rooms', { auth: true })
}

export async function verifyRoomAccess(roomId, pin) {
  return request(`/rooms/${encodeURIComponent(roomId)}/verify`, {
    method: 'POST',
    body: { pin },
    auth: true,
  })
}