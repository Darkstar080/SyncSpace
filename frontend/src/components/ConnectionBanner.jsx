import { useEffect, useRef, useState } from 'react'
import { getMyRooms } from '../lib/api'

const SHOW_BANNER_AFTER_MS = 2500 // avoid flashing on brief, normal blips
const CHECK_AUTH_AFTER_MS = 6000 // if still down this long, check WHY

/**
 * Shows nothing while connected. If the connection drops, waits briefly
 * (so a normal split-second reconnect doesn't cause an annoying flash),
 * then shows a banner. If it's still down after a longer delay, checks
 * whether the problem is actually an expired/invalid login — since
 * y-websocket's automatic reconnect will retry forever with the same
 * bad token and NEVER succeed in that case, silently waiting would leave
 * the user staring at "reconnecting..." indefinitely for no reason.
 */
export default function ConnectionBanner({ status, provider, onSessionExpired }) {
  const [visible, setVisible] = useState(false)
  const [authExpired, setAuthExpired] = useState(false)
  const disconnectedSinceRef = useRef(null)
  const authCheckedRef = useRef(false)

  useEffect(() => {
    if (status === 'connected') {
      disconnectedSinceRef.current = null
      authCheckedRef.current = false
      setVisible(false)
      setAuthExpired(false)
      return
    }

    if (disconnectedSinceRef.current === null) {
      disconnectedSinceRef.current = Date.now()
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - disconnectedSinceRef.current
      if (elapsed >= SHOW_BANNER_AFTER_MS) {
        setVisible(true)
      }
      if (elapsed >= CHECK_AUTH_AFTER_MS && !authCheckedRef.current) {
        authCheckedRef.current = true
        // A cheap, already-existing authenticated endpoint - if the
        // token itself is the problem (expired/invalid), this fails
        // with a clear error; a pure network issue would also fail
        // this call, but in that case the WebSocket wouldn't reconnect
        // either way, so defaulting to "assume auth" only after this
        // long is a reasonable, low-cost check either way.
        getMyRooms().catch((err) => {
          if (/token|unauthorized|401/i.test(err.message)) {
            setAuthExpired(true)
          }
        })
      }
    }, 500)

    return () => clearInterval(interval)
  }, [status])

  if (!visible) return null

  if (authExpired) {
    return (
      <div className="bg-accent-2 text-bg-deep text-sm px-4 py-2 flex items-center justify-between">
        <span>Your session has expired. Please log in again to keep syncing.</span>
        <button
          onClick={onSessionExpired}
          className="bg-bg-deep text-accent-2 rounded px-3 py-1 text-xs font-semibold cursor-pointer"
        >
          Log in again
        </button>
      </div>
    )
  }

  return (
    <div className="bg-text-dim text-bg-deep text-sm px-4 py-2 flex items-center justify-between">
      <span>Connection lost — trying to reconnect…</span>
      <button
        onClick={() => provider?.connect()}
        className="bg-bg-deep text-text rounded px-3 py-1 text-xs font-semibold cursor-pointer"
      >
        Retry now
      </button>
    </div>
  )
}