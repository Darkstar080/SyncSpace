import { useEffect, useRef, useState } from 'react'
import { VoiceChatManager } from '../lib/webrtc'

/**
 * Known limitation, disclosed: if the room's WebSocket reconnects
 * (network drop), the underlying `provider.ws` object is replaced with
 * a new instance — this component's signaling connection does NOT
 * automatically follow that. Leaving and rejoining voice manually
 * recovers it; a full auto-recovery would need more plumbing than is
 * justified for this feature's scope right now.
 */
export default function VoiceChatControls({ provider, awareness }) {
  const [inCall, setInCall] = useState(false)
  const [muted, setMuted] = useState(false)
  const [peerCount, setPeerCount] = useState(0)
  const [error, setError] = useState('')
  const managerRef = useRef(null)
  const audioElsRef = useRef(new Map())

  useEffect(() => {
    return () => {
      managerRef.current?.stop()
      audioElsRef.current.forEach((el) => el.remove())
      audioElsRef.current.clear()
    }
  }, [])

  async function joinVoice() {
    setError('')
    try {
      const ws = provider.ws
      if (!ws) throw new Error('Not connected yet — try again in a moment.')

      const manager = new VoiceChatManager(ws, awareness.clientID, awareness)
      manager.onRemoteStream = (clientId, stream) => {
        let el = audioElsRef.current.get(clientId)
        if (!el) {
          el = document.createElement('audio')
          el.autoplay = true
          document.body.appendChild(el)
          audioElsRef.current.set(clientId, el)
        }
        el.srcObject = stream
        setPeerCount(audioElsRef.current.size)
      }
      manager.onPeerLeft = (clientId) => {
        const el = audioElsRef.current.get(clientId)
        if (el) {
          el.remove()
          audioElsRef.current.delete(clientId)
        }
        setPeerCount(audioElsRef.current.size)
      }

      await manager.start()
      managerRef.current = manager
      setInCall(true)
    } catch (err) {
      setError(
        err.name === 'NotAllowedError'
          ? 'Microphone access was denied — check your browser permissions.'
          : err.message
      )
    }
  }

  function leaveVoice() {
    managerRef.current?.stop()
    managerRef.current = null
    audioElsRef.current.forEach((el) => el.remove())
    audioElsRef.current.clear()
    setPeerCount(0)
    setInCall(false)
    setMuted(false)
  }

  function toggleMute() {
    const next = !muted
    managerRef.current?.setMuted(next)
    setMuted(next)
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-accent-2">{error}</span>}
      {!inCall ? (
        <button
          onClick={joinVoice}
          className="text-xs bg-accent text-bg-deep rounded-full px-3 py-1 cursor-pointer font-semibold"
        >
          🎙 Join voice
        </button>
      ) : (
        <>
          <span className="text-xs text-text-dim">
            {peerCount} {peerCount === 1 ? 'person' : 'people'} connected
          </span>
          <button
            onClick={toggleMute}
            className={`text-xs rounded-full px-3 py-1 cursor-pointer font-semibold ${
              muted ? 'bg-accent-2 text-bg-deep' : 'bg-bg-deep text-text border border-border'
            }`}
          >
            {muted ? '🔇 Unmute' : '🎙 Mute'}
          </button>
          <button
            onClick={leaveVoice}
            className="text-xs bg-transparent border border-accent-2 text-accent-2 rounded-full px-3 py-1 cursor-pointer hover:bg-accent-2 hover:text-bg-deep"
          >
            Leave voice
          </button>
        </>
      )}
    </div>
  )
}