/**
 * auth.js
 *
 * The pure crypto/token logic: hashing passwords, signing and verifying
 * JWTs. No database access here on purpose — this file is testable in
 * complete isolation (see test-auth-logic.js), separate from db.js
 * which needs a real MongoDB connection.
 */

import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const JWT_SECRET = process.env.JWT_SECRET
const JWT_EXPIRES_IN = '24h'
const BCRYPT_ROUNDS = 10

if (!JWT_SECRET) {
  throw new Error(
    'JWT_SECRET environment variable is required. Set it in .env — ' +
      'never hardcode a secret directly in source code.'
  )
}

export async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash)
}

/**
 * @param {{ userId: string, username: string }} payload
 */
export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

/**
 * Throws if the token is invalid, tampered with, or expired — callers
 * should wrap this in try/catch, not assume it always succeeds.
 */
export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET)
}