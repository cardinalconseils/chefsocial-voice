import { NextRequest, NextResponse } from 'next/server'
import { TelephonyIntegration, LiveKitEnhancedProcessor, createLiveKitConfig } from '@/lib/livekit-enhanced'

/**
 * POST /api/telephony/call
 * Initiate outbound call with voice processing
 */
export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, restaurantId, purpose = 'voice_content_generation' } = await request.json()

    // Validate phone number
    if (!phoneNumber || !/^\+?[\d\s\-\(\)]+$/.test(phoneNumber)) {
      return NextResponse.json(
        { error: 'Valid phone number is required' },
        { status: 400 }
      )
    }

    // Create LiveKit configuration
    const liveKitConfig = createLiveKitConfig()
    liveKitConfig.roomName = `chef_call_${restaurantId}_${Date.now()}`
    liveKitConfig.participantName = `restaurant_${restaurantId}`
    liveKitConfig.enableTelephony = true

    // Initialize LiveKit processor
    const processor = new LiveKitEnhancedProcessor(liveKitConfig)

    // Configure telephony
    const telephonyConfig = {
      provider: (process.env.TELEPHONY_PROVIDER as 'twilio' | 'vonage' | 'livekit') || 'livekit',
      phoneNumber: process.env.OUTBOUND_PHONE_NUMBER || '',
      webhookUrl: `${request.nextUrl.origin}/api/telephony/webhook`,
      recordingEnabled: true,
      transcriptionEnabled: true
    }

    const telephony = new TelephonyIntegration(telephonyConfig, processor)

    // Make the outbound call
    await telephony.makeOutboundCall(phoneNumber)

    // Generate call tracking ID
    const callId = `call_${Date.now()}_${Math.random().toString(36).substring(7)}`

    return NextResponse.json({
      success: true,
      callId,
      phoneNumber,
      status: 'initiated',
      room: liveKitConfig.roomName,
      purpose,
      message: 'Outbound call initiated successfully'
    })

  } catch (error) {
    console.error('Failed to initiate outbound call:', error)
    return NextResponse.json(
      { 
        error: 'Failed to initiate call',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/telephony/call
 * Get telephony configuration and status
 */
export async function GET() {
  const telephonyEnabled = process.env.ENABLE_TELEPHONY === 'true'
  const provider = process.env.TELEPHONY_PROVIDER || 'livekit'
  
  return NextResponse.json({
    enabled: telephonyEnabled,
    provider,
    features: {
      outboundCalls: true,
      inboundCalls: true,
      recording: true,
      transcription: true,
      voiceProcessing: true
    },
    configuration: {
      hasCredentials: !!(process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET),
      webhookUrl: '/api/telephony/webhook',
      supportedProviders: ['livekit', 'twilio', 'vonage']
    }
  })
} 