import { useState } from 'react'
import { login, register } from '../lib/api'

/**
 * Design notes (so future edits stay consistent with the intent):
 * - Palette and fonts here are scoped to THIS component via inline CSS
 *   custom properties on the wrapping div — deliberately not touching
 *   the shared Tailwind theme in index.css, so the rest of the app
 *   (Whiteboard, CodeEditor, JoinScreen) is untouched by this pass.
 * - Amber + teal are used to evoke syntax highlighting (keyword vs.
 *   string), not as a single decorative neon accent.
 * - The left preview panel is a stylized, non-interactive mock of the
 *   actual product (mini whiteboard + code pane with drifting labeled
 *   cursors) — it shows what SyncSpace does before you even log in,
 *   rather than just naming it.
 */
export default function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)

  // Mirrors the backend's actual rules (see authRoutes.js) so obvious
  // mistakes are caught instantly, without a round trip to the server.
  // The backend still re-validates everything itself — this is purely
  // for faster feedback, not a replacement for server-side checks.
  function validate() {
    const errors = {}

    if (!username.trim()) {
      errors.username = 'Username is required'
    } else if (username.trim().length < 3) {
      errors.username = 'Must be at least 3 characters'
    }

    if (!password) {
      errors.password = 'Password is required'
    } else if (password.length < 6) {
      errors.password = 'Must be at least 6 characters'
    }

    if (mode === 'register' && password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }

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

  const vars = {
    '--auth-bg': '#0B0E14',
    '--auth-panel': '#10141C',
    '--auth-panel-2': '#151A24',
    '--auth-border': '#232A38',
    '--auth-text': '#E4E6EB',
    '--auth-text-dim': '#7C8394',
    '--auth-amber': '#E8A33D',
    '--auth-teal': '#4FD1C5',
    '--auth-coral': '#E5484D',
  }

  return (
    <div
      style={vars}
      className="min-h-screen flex bg-[var(--auth-bg)] text-[var(--auth-text)]"
    >
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          @keyframes auth-drift-1 {
            0%, 100% { transform: translate(0, 0); }
            50% { transform: translate(6px, -5px); }
          }
          @keyframes auth-drift-2 {
            0%, 100% { transform: translate(0, 0); }
            50% { transform: translate(-5px, 6px); }
          }
          @keyframes auth-blink {
            0%, 45% { opacity: 1; }
            50%, 95% { opacity: 0; }
            100% { opacity: 1; }
          }
          @keyframes auth-fade-up {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes auth-fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          .auth-cursor-1 { animation: auth-drift-1 4.5s ease-in-out infinite; }
          .auth-cursor-2 { animation: auth-drift-2 5.5s ease-in-out infinite; }
          .auth-blink-caret { animation: auth-blink 1.1s step-end infinite; }
          .auth-panel-enter { animation: auth-fade-up 0.5s ease-out both; }
          .auth-form-enter { animation: auth-fade-up 0.5s ease-out 0.1s both; }
          .auth-mode-fade { animation: auth-fade-in 0.25s ease-out both; }
        }
        .auth-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }
        .auth-input {
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .auth-input:focus {
          box-shadow: 0 0 0 2px var(--auth-amber);
        }
        .auth-submit-btn {
          transition: transform 0.15s ease, filter 0.15s ease, box-shadow 0.15s ease;
        }
        .auth-submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 14px -4px var(--auth-amber);
        }
        .auth-submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }
      `}</style>

      {/* Left: live product preview - hidden on small screens */}
      <div className="auth-panel-enter hidden lg:flex flex-col justify-center flex-1 px-16 py-12 border-r border-[var(--auth-border)]">
        <div
          className="w-full max-w-lg rounded-xl border overflow-hidden"
          style={{ borderColor: 'var(--auth-border)', background: 'var(--auth-panel)' }}
        >
          {/* mini panel header, echoing the real app's split-screen bars */}
          <div
            className="flex text-xs auth-mono border-b"
            style={{ borderColor: 'var(--auth-border)' }}
          >
            <div className="flex-1 px-3 py-2 text-[var(--auth-text-dim)]">Whiteboard</div>
            <div
              className="flex-1 px-3 py-2 text-[var(--auth-text-dim)] border-l"
              style={{ borderColor: 'var(--auth-border)' }}
            >
              Code
            </div>
          </div>

          <div className="flex h-64 relative">
            {/* mini whiteboard half */}
            <div className="flex-1 bg-white relative overflow-hidden">
              <svg viewBox="0 0 200 160" className="w-full h-full">
                <rect x="24" y="24" width="70" height="46" rx="2" fill="none" stroke="#E8A33D" strokeWidth="2.5" />
                <line x1="30" y1="110" x2="120" y2="95" stroke="#4FD1C5" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="120" y1="95" x2="150" y2="130" stroke="#4FD1C5" strokeWidth="2.5" strokeLinecap="round" />
                <text x="24" y="140" fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#232A38">merge()</text>
              </svg>
              <div
                className="auth-cursor-1 absolute"
                style={{ left: '60%', top: '30%' }}
                aria-hidden="true"
              >
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: 'var(--auth-teal)' }} />
                  <span
                    className="auth-mono text-[10px] px-1.5 py-0.5 rounded"
                    style={{ background: 'var(--auth-teal)', color: '#04342C' }}
                  >
                    Alex
                  </span>
                </div>
              </div>
            </div>

            {/* mini code half */}
            <div
              className="flex-1 border-l px-3 py-3 auth-mono text-[11px] leading-5 relative overflow-hidden"
              style={{ borderColor: 'var(--auth-border)', background: 'var(--auth-panel-2)' }}
            >
              <div><span style={{ color: 'var(--auth-teal)' }}>function</span> <span style={{ color: 'var(--auth-text)' }}>merge</span>(a, b) {'{'}</div>
              <div className="pl-3" style={{ color: 'var(--auth-text-dim)' }}>// fast-forward merge</div>
              <div className="pl-3"><span style={{ color: 'var(--auth-teal)' }}>return</span> <span style={{ color: 'var(--auth-amber)' }}>[...a, ...b]</span></div>
              <div>{'}'}</div>
              <div
                className="auth-cursor-2 absolute"
                style={{ left: '40%', top: '58%' }}
                aria-hidden="true"
              >
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: 'var(--auth-amber)' }} />
                  <span
                    className="auth-mono text-[10px] px-1.5 py-0.5 rounded"
                    style={{ background: 'var(--auth-amber)', color: '#412402' }}
                  >
                    Priya
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="auth-mono text-lg mt-8" style={{ color: 'var(--auth-text)' }}>
          <span style={{ color: 'var(--auth-teal)' }}>// </span>
          real-time, together
          <span className="auth-blink-caret" style={{ color: 'var(--auth-amber)' }}>▍</span>
        </p>
        <p className="text-sm mt-2" style={{ color: 'var(--auth-text-dim)' }}>
          Draw, write code, and see every change the instant it happens.
        </p>
      </div>

      {/* Right: the actual form */}
      <div className="auth-form-enter flex-1 flex items-center justify-center px-6 py-12">
        <form onSubmit={submit} className="w-full max-w-sm flex flex-col gap-5">
          <div>
            <h1 className="auth-mono text-2xl font-bold" style={{ color: 'var(--auth-text)' }}>
              SyncSpace
            </h1>
            <p
              key={mode}
              className="auth-mono text-xs mt-1 auth-mode-fade"
              style={{ color: 'var(--auth-text-dim)' }}
            >
              {mode === 'login' ? '// sign in to your workspace' : '// create your workspace'}
            </p>
          </div>

          {/* segmented mode switch */}
          <div
            className="flex gap-1 p-1 rounded-lg border"
            style={{ borderColor: 'var(--auth-border)', background: 'var(--auth-panel)' }}
          >
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
                className="flex-1 py-2 rounded-md text-sm font-medium auth-mono cursor-pointer transition-colors"
                style={
                  mode === m
                    ? { background: 'var(--auth-amber)', color: '#412402' }
                    : { background: 'transparent', color: 'var(--auth-text-dim)' }
                }
              >
                {m === 'login' ? 'Log in' : 'Register'}
              </button>
            ))}
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="auth-mono text-xs" style={{ color: 'var(--auth-text-dim)' }}>
              // username
            </span>
            <input
              value={username}
              onChange={(e) => {
                setUsername(e.target.value)
                if (fieldErrors.username) setFieldErrors((prev) => ({ ...prev, username: '' }))
              }}
              placeholder="Enter Your Username..."
              autoFocus
              className="auth-mono auth-input rounded-md px-3 py-2.5 text-sm border outline-none"
              style={{
                background: 'var(--auth-panel)',
                borderColor: fieldErrors.username ? 'var(--auth-coral)' : 'var(--auth-border)',
                color: 'var(--auth-text)',
              }}
            />
            {fieldErrors.username && (
              <span className="auth-mono text-xs" style={{ color: 'var(--auth-coral)' }}>
                {fieldErrors.username}
              </span>
            )}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="auth-mono text-xs" style={{ color: 'var(--auth-text-dim)' }}>
              // password
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }))
                if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }))
              }}
              placeholder="At least 6 characters"
              className="auth-mono auth-input rounded-md px-3 py-2.5 text-sm border outline-none"
              style={{
                background: 'var(--auth-panel)',
                borderColor: fieldErrors.password ? 'var(--auth-coral)' : 'var(--auth-border)',
                color: 'var(--auth-text)',
              }}
            />
            {fieldErrors.password && (
              <span className="auth-mono text-xs" style={{ color: 'var(--auth-coral)' }}>
                {fieldErrors.password}
              </span>
            )}
          </label>

          {mode === 'register' && (
            <label className="flex flex-col gap-1.5">
              <span className="auth-mono text-xs" style={{ color: 'var(--auth-text-dim)' }}>
                // confirm password
              </span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }))
                }}
                placeholder="Type your password again"
                className="auth-mono auth-input rounded-md px-3 py-2.5 text-sm border outline-none"
                style={{
                  background: 'var(--auth-panel)',
                  borderColor: fieldErrors.confirmPassword ? 'var(--auth-coral)' : 'var(--auth-border)',
                  color: 'var(--auth-text)',
                }}
              />
              {fieldErrors.confirmPassword && (
                <span className="auth-mono text-xs" style={{ color: 'var(--auth-coral)' }}>
                  {fieldErrors.confirmPassword}
                </span>
              )}
            </label>
          )}

          {error && (
            <p className="auth-mono text-xs" style={{ color: 'var(--auth-coral)' }}>
              ✕ {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="auth-submit-btn rounded-md py-3 font-semibold text-sm cursor-pointer disabled:opacity-50"
            style={{ background: 'var(--auth-amber)', color: '#412402' }}
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  )
}