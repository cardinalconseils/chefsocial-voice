import { NextRequest, NextResponse } from 'next/server'
import { AIContentGenerator, calculateQualityMetrics } from '@/lib/ai-content'
import { validateAudioFile } from '@/lib/voice-processing'
import { 
  VoiceProcessingResult, 
  VoiceProcessingAPIResponse, 
  ContentGenerationRequest,
  RestaurantContext,
  SocialPlatform 
} from '@/types/voice'

/**
 * POST /api/voice/process
 * Process voice recording: transcribe audio and generate social media content
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = `voice_${Date.now()}_${Math.random().toString(36).substring(7)}`

  try {
    // Parse form data
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const contextData = formData.get('context') as string
    const platformsData = formData.get('platforms') as string
    const configData = formData.get('config') as string

    // Validate required fields
    if (!audioFile) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_AUDIO',
          message: 'Audio file is required'
        },
        metadata: {
          request_id: requestId,
          processing_time: Date.now() - startTime
        }
      } as VoiceProcessingAPIResponse, { status: 400 })
    }

    // Validate audio file
    const audioValidation = validateAudioFile(audioFile)
    if (!audioValidation.valid) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_AUDIO',
          message: 'Invalid audio file',
          details: audioValidation.errors
        },
        metadata: {
          request_id: requestId,
          processing_time: Date.now() - startTime
        }
      } as VoiceProcessingAPIResponse, { status: 400 })
    }

    // Parse context and configuration
    const context: RestaurantContext = contextData ? JSON.parse(contextData) : getDefaultContext()
    const platforms: SocialPlatform[] = platformsData ? JSON.parse(platformsData) : getDefaultPlatforms()
    const config = configData ? JSON.parse(configData) : {}

    // Initialize AI content generator
    const aiGenerator = new AIContentGenerator()

    // Step 1: Transcribe audio
    console.log('Starting transcription...')
    const transcription = await aiGenerator.transcribeAudio(audioFile)
    
    if (!transcription.text || transcription.text.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'TRANSCRIPTION_EMPTY',
          message: 'No speech detected in audio file'
        },
        metadata: {
          request_id: requestId,
          processing_time: Date.now() - startTime
        }
      } as VoiceProcessingAPIResponse, { status: 400 })
    }

    // Step 2: Generate content for each platform
    console.log('Generating content for platforms...')
    const contentRequest: ContentGenerationRequest = {
      transcript: transcription.text,
      context,
      platforms,
      contentType: config.contentType || 'dish_description',
      mood: config.mood || 'excited',
      includeHashtags: config.includeHashtags ?? true,
      includeEmojis: config.includeEmojis ?? true,
      maxLength: config.maxLength
    }

    const generatedContent = await aiGenerator.generateContent(contentRequest)

    if (generatedContent.length === 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'CONTENT_GENERATION_FAILED',
          message: 'Failed to generate content for any platform'
        },
        metadata: {
          request_id: requestId,
          processing_time: Date.now() - startTime
        }
      } as VoiceProcessingAPIResponse, { status: 500 })
    }

    // Step 3: Calculate quality metrics
    const processingTime = Date.now() - startTime
    const qualityMetrics = calculateQualityMetrics(transcription, generatedContent, processingTime)

    // Step 4: Build response
    const result: VoiceProcessingResult = {
      success: true,
      transcript: transcription,
      generatedContent,
      processingTime,
      qualityMetrics
    }

    // Check if processing took too long (>30 seconds)
    if (processingTime > 30000) {
      console.warn(`Voice processing took ${processingTime}ms - exceeds 30s target`)
    }

    return NextResponse.json({
      success: true,
      data: result,
      metadata: {
        request_id: requestId,
        processing_time: processingTime,
        cost: estimateProcessingCost(audioFile, generatedContent.length)
      }
    } as VoiceProcessingAPIResponse)

  } catch (error) {
    console.error('Voice processing error:', error)
    
    const errorResponse: VoiceProcessingAPIResponse = {
      success: false,
      error: {
        code: 'PROCESSING_ERROR',
        message: error instanceof Error ? error.message : 'Unknown processing error',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      metadata: {
        request_id: requestId,
        processing_time: Date.now() - startTime
      }
    }

    return NextResponse.json(errorResponse, { status: 500 })
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