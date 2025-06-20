import { NextRequest, NextResponse } from 'next/server'
import { AIContentGenerator, calculateQualityMetrics } from '@/lib/ai-content'
import { validateAudioFile } from '@/lib/voice-processing'
import { 
  VoiceProcessingResult, 
  VoiceProcessingAPIResponse, 
  ContentGenerationRequest,
  RestaurantContext,
  SocialPlatform,
  TranscriptionResult
} from '@/types/voice'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { transcribeAudioWithWhisper } from '@/lib/whisper-integration'

/**
 * POST /api/voice/process
 * Handles voice recording upload and transcription.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = `voice_${Date.now()}_${Math.random().toString(36).substring(7)}`

  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      return NextResponse.json({
        success: false,
        error: { code: 'MISSING_AUDIO', message: 'Audio file is required' },
        metadata: { request_id: requestId, processing_time: Date.now() - startTime }
      }, { status: 400 })
    }

    const audioValidation = validateAudioFile(audioFile)
    if (!audioValidation.valid) {
      return NextResponse.json({
        success: false,
        error: { code: 'INVALID_AUDIO', message: 'Invalid audio file', details: audioValidation.errors },
        metadata: { request_id: requestId, processing_time: Date.now() - startTime }
      }, { status: 400 })
    }

    // Save the file to a temporary directory
    const bytes = await audioFile.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const tempFilePath = join(process.cwd(), 'tmp', `${requestId}-${audioFile.name}`)
    await writeFile(tempFilePath, buffer)
    console.log(`Uploaded file saved to: ${tempFilePath}`)

    // Step 2: Transcribe the audio file
    const transcription = await transcribeAudioWithWhisper(tempFilePath);
    
    // Persist transcription result to a file (acting as a temporary DB)
    const transcriptionLogPath = join(process.cwd(), 'tmp', `${requestId}-transcription.json`);
    await writeFile(transcriptionLogPath, JSON.stringify(transcription, null, 2));
    console.log(`Transcription result saved to: ${transcriptionLogPath}`);
    
    const processingTime = Date.now() - startTime
    
    const result: VoiceProcessingResult = {
      success: true,
      transcript: transcription,
      generatedContent: [], // To be implemented in Task B3
      processingTime,
      qualityMetrics: { // To be replaced with real metrics
        transcription_accuracy: transcription.confidence,
        content_relevance: 0,
        brand_alignment: 0,
        engagement_potential: 0,
        processing_speed: processingTime
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
      metadata: {
        request_id: requestId,
        processing_time: processingTime,
        message: "File transcribed successfully.",
        filePath: tempFilePath,
        fileSize: audioFile.size
      }
    })

  } catch (error) {
    console.error('Voice processing error:', error)
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'PROCESSING_ERROR',
        message: error instanceof Error ? error.message : 'Unknown processing error',
      },
      metadata: {
        request_id: requestId,
        processing_time: Date.now() - startTime
      }
    }, { status: 500 })
  }
}

/**
 * GET /api/voice/process
 * Health check and API information
 */
export async function GET() {
  return NextResponse.json({
    service: 'ChefSocial Voice Processing API',
    version: '1.0.0',
    status: 'healthy',
    capabilities: [
      'audio_transcription',
      'content_generation',
      'multi_platform_optimization',
      'quality_monitoring'
    ],
    supported_formats: ['audio/webm', 'audio/mp4', 'audio/wav', 'audio/ogg'],
    max_file_size: '25MB',
    max_duration: '300s',
    platforms: ['instagram', 'tiktok', 'facebook', 'twitter', 'linkedin']
  })
}

// Helper functions

/**
 * Get default restaurant context for demo/testing
 */
function getDefaultContext(): RestaurantContext {
  return {
    name: 'Demo Restaurant',
    cuisine: 'Modern American',
    location: 'Downtown',
    brandVoice: 'Friendly and passionate about food',
    specialties: ['Farm-to-table', 'Artisan cuisine', 'Seasonal ingredients'],
    targetAudience: ['Food enthusiasts', 'Local diners', 'Social media users']
  }
}

/**
 * Get default social media platforms
 */
function getDefaultPlatforms(): SocialPlatform[] {
  return [
    {
      name: 'instagram',
      enabled: true,
      customization: {
        maxLength: 2200,
        hashtagCount: 20,
        emojiStyle: 'moderate',
        tone: 'casual',
        includeCtaButton: true
      }
    },
    {
      name: 'tiktok',
      enabled: true,
      customization: {
        maxLength: 300,
        hashtagCount: 5,
        emojiStyle: 'extensive',
        tone: 'trendy',
        includeCtaButton: true
      }
    },
    {
      name: 'facebook',
      enabled: true,
      customization: {
        maxLength: 2000,
        hashtagCount: 10,
        emojiStyle: 'minimal',
        tone: 'professional',
        includeCtaButton: true
      }
    }
  ]
}

/**
 * Estimate processing cost for billing/analytics
 */
function estimateProcessingCost(audioFile: File, platformCount: number): number {
  // Simplified cost calculation
  const transcriptionCost = Math.ceil(audioFile.size / (1024 * 1024)) * 0.006 // $0.006 per MB
  const contentGenerationCost = platformCount * 0.02 // $0.02 per platform
  
  return Math.round((transcriptionCost + contentGenerationCost) * 100) / 100
}

/**
 * OPTIONS handler for CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  })
} 