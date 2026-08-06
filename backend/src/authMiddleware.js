import { verifyToken } from './auth.js'

/**
 * Protects an HTTP route: requires a valid `Authorization: Bearer <token>`
 * header. On success, attaches `req.user = { userId, username }`.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    return res.status(401).json({ error: 'missing Authorization header' })
  }

  try {
    req.user = verifyToken(token)
    next()
  } catch (err) {
    return res.status(401).json({ error: 'invalid or expired token' })
  }
}