import { useState } from 'react'
import { login, register } from '../lib/api'

export default function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
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
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,#232338_0%,var(--color-bg)_60%)]">
      <form
        onSubmit={submit}
        className="bg-bg-panel border border-border rounded-xl p-10 w-90 flex flex-col gap-4"
      >
        <h1 className="m-0 text-3xl tracking-tight bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-transparent">
          SyncSpace
        </h1>
        <p className="m-0 text-text-dim text-sm">
          {mode === 'login' ? 'Log in to continue' : 'Create an account to get started'}
        </p>

        <label className="flex flex-col gap-1.5 text-sm text-text-dim">
          Username
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. priya"
            autoFocus
            className="bg-bg-deep border border-border rounded-md px-3 py-2.5 text-text text-sm focus:outline-2 focus:outline-accent focus:outline-offset-1"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-text-dim">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            className="bg-bg-deep border border-border rounded-md px-3 py-2.5 text-text text-sm focus:outline-2 focus:outline-accent focus:outline-offset-1"
          />
        </label>

        {error && <p className="m-0 text-xs text-accent-2">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 bg-accent text-bg-deep rounded-md py-3 font-semibold text-sm cursor-pointer hover:brightness-110 disabled:opacity-50"
        >
          {loading ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login')
            setError('')
          }}
          className="text-xs text-text-dim underline cursor-pointer bg-transparent border-none"
        >
          {mode === 'login' ? "Don't have an account? Register" : 'Already have an account? Log in'}
        </button>
      </form>
    </div>
  )
}