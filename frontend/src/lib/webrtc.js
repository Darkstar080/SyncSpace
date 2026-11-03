/**
 * webrtc.js
 *
 * Mesh voice chat: every participant connects directly to every other
 * participant via WebRTC. Audio never touches our server — only the
 * initial handshake (SDP offers/answers, ICE candidates) is relayed
 * through the existing room WebSocket connection, using a dedicated
 * message type the sync server just forwards without interpreting.
 *
 * SCOPE, stated plainly: this uses a public STUN server only, no TURN
 * server. It will work for most users, but will silently fail to
 * connect for anyone behind a restrictive NAT/firewall (some campus or
 * corporate networks) where direct peer-to-peer isn't possible. A TURN
 * server would fix this but requires a paid/hosted service — a
 * deliberate scope cut, not an oversight.
 *
 * Mesh topology is a reasonable fit for a small group (a handful of
 * people in one interview/study room) — it does not scale well much
 * beyond that, which is fine for this app's actual use case.
 */

import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'

const MESSAGE_WEBRTC_SIGNAL = 2

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }]

export class VoiceChatManager {
  /**
   * @param {WebSocket} ws - the underlying native WebSocket (from
   *   provider.ws), used purely to send/receive signaling messages
   * @param {number} myClientId - our own awareness clientID
   * @param {import('yjs').Awareness} awareness
   */
  constructor(ws, myClientId, awareness) {
    this.ws = ws
    this.myClientId = myClientId
    this.awareness = awareness
    this.peers = new Map() // clientId -> RTCPeerConnection
    this.localStream = null
    this.muted = false
    this.onRemoteStream = null // callback(clientId, MediaStream)
    this.onPeerLeft = null // callback(clientId)

    this._onMessage = this._onMessage.bind(this)
    this.ws.addEventListener('message', this._onMessage)

    this.awareness.on('change', this._handleAwarenessChange.bind(this))
  }

  async start() {
    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    // Connect to everyone already in the room.
    this._handleAwarenessChange({ added: Array.from(this.awareness.getStates().keys()) })
  }

  setMuted(muted) {
    this.muted = muted
    this.localStream?.getAudioTracks().forEach((track) => {
      track.enabled = !muted
    })
  }

  stop() {
    this.peers.forEach((pc) => pc.close())
    this.peers.clear()
    this.localStream?.getTracks().forEach((t) => t.stop())
    this.ws.removeEventListener('message', this._onMessage)
  }

  _handleAwarenessChange({ added = [], removed = [] }) {
    added.forEach((clientId) => {
      if (clientId === this.myClientId) return
      if (this.peers.has(clientId)) return
      // Deterministic tie-breaker so both sides don't simultaneously
      // send offers to each other: lower clientID always initiates.
      if (this.myClientId < clientId) {
        this._createPeer(clientId, true)
      } else {
        this._createPeer(clientId, false)
      }
    })
    removed.forEach((clientId) => {
      const pc = this.peers.get(clientId)
      if (pc) {
        pc.close()
        this.peers.delete(clientId)
        this.onPeerLeft?.(clientId)
      }
    })
  }

  _createPeer(remoteClientId, isInitiator) {
    if (!this.localStream) return
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    this.peers.set(remoteClientId, pc)

    this.localStream.getTracks().forEach((track) => pc.addTrack(track, this.localStream))

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        this._sendSignal(remoteClientId, { type: 'ice-candidate', candidate: e.candidate })
      }
    }

    pc.ontrack = (e) => {
      this.onRemoteStream?.(remoteClientId, e.streams[0])
    }

    if (isInitiator) {
      pc.onnegotiationneeded = async () => {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        this._sendSignal(remoteClientId, { type: 'offer', sdp: pc.localDescription })
      }
    }

    return pc
  }

  async _handleSignal(senderClientId, signal) {
    let pc = this.peers.get(senderClientId)

    if (signal.type === 'offer') {
      if (!pc) pc = this._createPeer(senderClientId, false)
      await pc.setRemoteDescription(signal.sdp)
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      this._sendSignal(senderClientId, { type: 'answer', sdp: pc.localDescription })
    } else if (signal.type === 'answer') {
      if (pc) await pc.setRemoteDescription(signal.sdp)
    } else if (signal.type === 'ice-candidate') {
      if (pc) {
        try {
          await pc.addIceCandidate(signal.candidate)
        } catch (e) {
          // benign if it arrives before the remote description is set
        }
      }
    }
  }

  _sendSignal(targetClientId, signal) {
    const payload = JSON.stringify({
      targetClientId,
      senderClientId: this.myClientId,
      ...signal,
    })
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MESSAGE_WEBRTC_SIGNAL)
    encoding.writeVarString(encoder, payload)
    this.ws.send(encoding.toUint8Array(encoder))
  }

  _onMessage(event) {
    const data = new Uint8Array(event.data)
    const decoder = decoding.createDecoder(data)
    let messageType
    try {
      messageType = decoding.readVarUint(decoder)
    } catch (e) {
      return // not a message we can read the header of; ignore
    }
    if (messageType !== MESSAGE_WEBRTC_SIGNAL) return // let y-websocket handle its own types

    const payload = decoding.readVarString(decoder)
    const signal = JSON.parse(payload)
    if (signal.targetClientId !== this.myClientId) return
    this._handleSignal(signal.senderClientId, signal)
  }
}