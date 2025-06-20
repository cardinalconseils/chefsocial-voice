/**
 * Server-only LiveKit utilities
 * This file should only be imported in API routes and server components
 */

import { AccessToken } from 'livekit-server-sdk'

export interface LiveKitTokenConfig {
  participantName: string
  roomName: string
  enableTelephony?: boolean
}

/**
 * Generate LiveKit access token (server-side only)
 */
export async function generateLiveKitToken(config: LiveKitTokenConfig): Promise<string> {
  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET

  if (!apiKey || !apiSecret) {
    throw new Error('LiveKit credentials not configured')
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: config.participantName,
    ttl: '2h'
  })

  // Add standard grants
  at.addGrant({
    room: config.roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true
  })

  // Add SIP grants if telephony is enabled
  if (config.enableTelephony) {
    at.addSIPGrant({
      call: true,
      admin: true
    })
  }

  return await at.toJwt()
}

/**
 * Get LiveKit configuration for client
 */
export function getLiveKitConfig() {
  return {
    serverUrl: process.env.LIVEKIT_URL || 'wss://chefsocial.livekit.cloud',
    hasCredentials: !!(process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET),
    telephonyEnabled: process.env.ENABLE_TELEPHONY === 'true'
  }
} 