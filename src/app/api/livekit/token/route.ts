import { NextRequest, NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'

/**
 * POST /api/livekit/token
 * Generate LiveKit access token for voice sessions
 */
export async function POST(request: NextRequest) {
  try {
    const { participantName, roomName, enableTelephony } = await request.json()

    // Validate required parameters
    if (!participantName || !roomName) {
      return NextResponse.json(
        { error: 'participantName and roomName are required' },
        { status: 400 }
      )
    }

    // Get LiveKit credentials from environment
    const apiKey = process.env.LIVEKIT_API_KEY
    const apiSecret = process.env.LIVEKIT_API_SECRET

    if (!apiKey || !apiSecret) {
      console.error('LiveKit credentials not configured')
      return NextResponse.json(
        { error: 'LiveKit not configured' },
        { status: 500 }
      )
    }

    // Generate access token
    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
      ttl: '2h' // 2 hour token
    })

    // Add standard grants
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true
    })

    // Add SIP grants if telephony is enabled
    if (enableTelephony) {
      at.addSIPGrant({
        call: true,
        admin: true
      })
    }

    const token = await at.toJwt()

    return NextResponse.json({
      token,
      serverUrl: process.env.LIVEKIT_URL || 'wss://chefsocial.livekit.cloud',
      participantName,
      roomName,
      enableTelephony: enableTelephony || false
    })

  } catch (error) {
    console.error('Failed to generate LiveKit token:', error)
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/livekit/token
 * Test endpoint to check LiveKit configuration
 */
export async function GET() {
  const hasCredentials = !!(process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET)
  
  return NextResponse.json({
    configured: hasCredentials,
    serverUrl: process.env.LIVEKIT_URL || 'wss://chefsocial.livekit.cloud',
    features: {
      voiceProcessing: true,
      telephony: process.env.ENABLE_TELEPHONY === 'true',
      recording: true
    }
  })
} 