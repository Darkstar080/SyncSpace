import { Router } from 'express'
import { getDB } from './db.js'
import { hashPassword, verifyPassword, signToken } from './auth.js'

const router = Router()

router.post('/register', async (req, res) => {
  const { username, password } = req.body || {}

  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' })
  }
  if (username.length < 3 || password.length < 6) {
    return res
      .status(400)
      .json({ error: 'username must be at least 3 characters, password at least 6' })
  }

  const db = getDB()

  const existing = await db.collection('users').findOne({ username })
  if (existing) {
    return res.status(409).json({ error: 'username already taken' })
  }

  const passwordHash = await hashPassword(password)
  const result = await db.collection('users').insertOne({
    username,
    passwordHash,
    createdAt: new Date(),
  })

  const token = signToken({ userId: result.insertedId.toString(), username })
  res.status(201).json({ token, username })
})

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {}

  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' })
  }

  const db = getDB()
  const user = await db.collection('users').findOne({ username })

  // Deliberately return the SAME error whether the username doesn't
  // exist or the password is wrong. Being specific ("no such user" vs
  // "wrong password") would let an attacker discover which usernames
  // are registered just by trying logins — a real, well-known issue,
  // not paranoia.
  const invalidMessage = { error: 'invalid username or password' }

  if (!user) {
    return res.status(401).json(invalidMessage)
  }

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) {
    return res.status(401).json(invalidMessage)
  }

  const token = signToken({ userId: user._id.toString(), username: user.username })
  res.json({ token, username: user.username })
})

export default router