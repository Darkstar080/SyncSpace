import { useState } from 'react'
import { login, register } from '../lib/api'
import { motion } from 'framer-motion'

function PasswordToggleButton({ visible, onClick }) {
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      type="button"
      onClick={onClick}
      tabIndex={-1}
      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 cursor-pointer text-text-dim hover:text-text transition-colors"
      aria-label={visible ? 'Hide password' : 'Show password'}
    >
      {visible ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 3l18 18M10.58 10.58a2 2 0 002.83 2.83M9.88 4.24A9.53 9.53 0 0112 4c5 0 9 4 10 8-.36 1.28-1 2.5-1.85 3.55M6.5 6.5C4.5 8 3.13 10 2 12c1 4 5 8 10 8a9.5 9.5 0 004.24-.99" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8-10-8-10-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </motion.button>
  )
}

export default function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)

  function validate() {
    const errors = {}
    if (!username.trim()) errors.username = 'Username is required'
    else if (username.trim().length < 3) errors.username = 'Must be at least 3 characters'
    if (!password) errors.password = 'Password is required'
    else if (password.length < 6) errors.password = 'Must be at least 6 characters'
    if (mode === 'register' && password !== confirmPassword) errors.confirmPassword = 'Passwords do not match'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!validate()) return
    setLoading(true)
    try {
      const action = mode === 'login' ? login : register
      const data = await action(username.trim(), password)
      onAuthenticated(data.username)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-bg text-text relative overflow-hidden font-sans">
      {/* 3D Animated Background Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex justify-center items-center">
        <motion.div
          animate={{ rotate: 360, scale: [1, 1.2, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute w-[800px] h-[800px] bg-accent/10 rounded-full blur-[120px] -top-1/4 -left-1/4"
        />
        <motion.div
          animate={{ rotate: -360, scale: [1, 1.5, 1] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute w-[600px] h-[600px] bg-mauve/10 rounded-full blur-[100px] bottom-0 right-0"
        />
      </div>

      {/* Left: Floating 3D Preview Panel */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="hidden lg:flex flex-col justify-center flex-1 px-16 py-12 relative z-10 perspective-[1000px]"
      >
        <motion.div
          animate={{
            rotateY: [5, -5, 5],
            rotateX: [2, -2, 2],
            y: [-10, 10, -10]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="w-full max-w-lg rounded-2xl border border-border/50 bg-bg-panel/60 backdrop-blur-xl shadow-2xl overflow-hidden shadow-black/40"
        >
          <div className="flex text-xs font-mono border-b border-border/50 bg-bg-deep/50">
            <div className="flex-1 px-4 py-3 text-text-dim">Whiteboard</div>
            <div className="flex-1 px-4 py-3 text-text-dim border-l border-border/50">Code</div>
          </div>
          <div className="flex h-72 relative">
            <div className="flex-1 bg-white/5 relative overflow-hidden p-4">
              <svg viewBox="0 0 200 160" className="w-full h-full opacity-80">
                <rect x="24" y="24" width="70" height="46" rx="6" fill="none" stroke="var(--color-peach)" strokeWidth="2.5" />
                <line x1="30" y1="110" x2="120" y2="95" stroke="var(--color-sky)" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="120" y1="95" x2="150" y2="130" stroke="var(--color-sky)" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              <motion.div
                animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute left-[30%] top-[40%]"
              >
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-sky shadow-[0_0_8px_var(--color-sky)]" />
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-sky/20 text-sky border border-sky/30">Alex</span>
                </div>
              </motion.div>
            </div>
            <div className="flex-1 border-l border-border/50 px-4 py-4 font-mono text-[12px] leading-6 relative overflow-hidden bg-bg-deep/30">
              <div><span className="text-mauve">function</span> <span className="text-text">merge</span>(a, b) {'{'}</div>
              <div className="pl-4 text-text-dim italic">// fast-forward merge</div>
              <div className="pl-4"><span className="text-mauve">return</span> <span className="text-peach">[...a, ...b]</span></div>
              <div>{'}'}</div>
              <motion.div
                animate={{ x: [0, -20, 0], y: [0, 20, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute left-[50%] top-[60%]"
              >
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-peach shadow-[0_0_8px_var(--color-peach)]" />
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-peach/20 text-peach border border-peach/30">Priya</span>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          <p className="text-2xl mt-12 font-semibold text-text tracking-tight">
            Real-time, together
          </p>
          <p className="text-base mt-3 text-text-dim max-w-sm leading-relaxed">
            Draw, write code, and see every change the instant it happens.
          </p>
        </motion.div>
      </motion.div>

      {/* Right: Modern Auth Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-md bg-bg-panel/40 backdrop-blur-2xl border border-border/50 rounded-3xl p-8 shadow-2xl"
        >
          <div className="mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-br from-text to-text-dim bg-clip-text text-transparent">
              SyncSpace
            </h1>
            <p className="text-sm mt-2 text-text-dim">
              {mode === 'login' ? 'Sign in to your workspace' : 'Create your workspace'}
            </p>
          </div>

          <div className="flex gap-2 p-1.5 rounded-xl bg-bg-deep/50 border border-border/50 mb-6">
            {['login', 'register'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m)
                  setError('')
                  setFieldErrors({})
                  setConfirmPassword('')
                }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                  mode === m
                    ? 'bg-accent text-bg-deep shadow-[0_0_15px_rgba(137,180,250,0.3)]'
                    : 'text-text-dim hover:text-text hover:bg-bg-panel/50'
                }`}
              >
                {m === 'login' ? 'Log in' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="flex flex-col gap-5">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium text-text-dim ml-1">Username</span>
              <input
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value)
                  if (fieldErrors.username) setFieldErrors((prev) => ({ ...prev, username: '' }))
                }}
                placeholder="Enter Your Username"
                autoFocus
                className={`bg-bg-deep/50 rounded-xl px-4 py-3 text-sm border outline-none transition-all duration-300 ${
                  fieldErrors.username ? 'border-accent-2 focus:border-accent-2' : 'border-border/50 focus:border-accent focus:bg-bg-deep'
                }`}
              />
              {fieldErrors.username && <span className="text-xs text-accent-2 ml-1">{fieldErrors.username}</span>}
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium text-text-dim ml-1">Password</span>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }))
                    if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }))
                  }}
                  placeholder="At least 6 characters"
                  className={`w-full bg-bg-deep/50 rounded-xl pl-4 pr-12 py-3 text-sm border outline-none transition-all duration-300 ${
                    fieldErrors.password ? 'border-accent-2 focus:border-accent-2' : 'border-border/50 focus:border-accent focus:bg-bg-deep'
                  }`}
                />
                <PasswordToggleButton visible={showPassword} onClick={() => setShowPassword((v) => !v)} />
              </div>
              {fieldErrors.password && <span className="text-xs text-accent-2 ml-1">{fieldErrors.password}</span>}
            </label>

            {mode === 'register' && (
              <motion.label
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-col gap-2"
              >
                <span className="text-xs font-medium text-text-dim ml-1">Confirm Password</span>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }))
                    }}
                    placeholder="Type your password again"
                    className={`w-full bg-bg-deep/50 rounded-xl pl-4 pr-12 py-3 text-sm border outline-none transition-all duration-300 ${
                      fieldErrors.confirmPassword ? 'border-accent-2 focus:border-accent-2' : 'border-border/50 focus:border-accent focus:bg-bg-deep'
                    }`}
                  />
                  <PasswordToggleButton visible={showConfirmPassword} onClick={() => setShowConfirmPassword((v) => !v)} />
                </div>
                {fieldErrors.confirmPassword && <span className="text-xs text-accent-2 ml-1">{fieldErrors.confirmPassword}</span>}
              </motion.label>
            )}

            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-accent-2 text-center mt-2 bg-accent-2/10 py-2 rounded-lg border border-accent-2/20">
                {error}
              </motion.p>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="mt-4 bg-gradient-to-r from-accent to-mauve text-bg-deep rounded-xl py-3.5 font-bold text-sm cursor-pointer shadow-[0_4px_20px_rgba(137,180,250,0.4)] disabled:opacity-50 transition-all"
            >
              {loading ? 'Please wait…' : mode === 'login' ? 'Log In' : 'Create Account'}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  )
}