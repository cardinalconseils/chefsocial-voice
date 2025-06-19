// Voice processing types for ChefSocial Voice AI Integration
export interface VoiceRecordingState {
  isRecording: boolean
  isProcessing: boolean
  isTranscribing: boolean
  audioQuality: AudioQuality
  duration: number
  error?: VoiceError
}

export interface AudioQuality {
  level: 'excellent' | 'good' | 'poor' | 'unusable'
  volume: number // 0-100
  noiseLevel: number // 0-100
  clarity: number // 0-100
  warnings: string[]
}

export interface VoiceError {
  type: 'permission' | 'network' | 'processing' | 'quality' | 'timeout'
  message: string
  recoverable: boolean
  retryCount?: number
}

export interface AudioChunk {
  data: Blob
  timestamp: number
  quality: AudioQuality
  duration: number
}

export interface TranscriptionResult {
  text: string
  confidence: number
  language: string
  segments: TranscriptionSegment[]
  processingTime: number
}

export interface TranscriptionSegment {
  text: string
  start: number
  end: number
  confidence: number
}

export interface RestaurantContext {
  name: string
  cuisine: string
  location: string
  brandVoice: string
  specialties: string[]
  targetAudience: string[]
  previousContent?: string[]
}

export interface ContentGenerationRequest {
  transcript: string
  context: RestaurantContext
  platforms: SocialPlatform[]
  contentType: 'dish_description' | 'special_event' | 'behind_scenes' | 'promotion'
  mood: 'professional' | 'casual' | 'excited' | 'premium' | 'playful'
  includeHashtags: boolean
  includeEmojis: boolean
  maxLength?: number
}

export interface SocialPlatform {
  name: 'instagram' | 'tiktok' | 'facebook' | 'twitter' | 'linkedin'
  enabled: boolean
  customization: PlatformCustomization
}

export interface PlatformCustomization {
  maxLength: number
  hashtagCount: number
  emojiStyle: 'minimal' | 'moderate' | 'extensive'
  tone: 'professional' | 'casual' | 'trendy'
  includeCtaButton: boolean
}

export interface GeneratedContent {
  platform: string
  content: string
  hashtags: string[]
  emojis: string[]
  engagementHooks: string[]
  virality_score: number // 0-100
  estimated_reach: number
  posting_suggestions: PostingSuggestion[]
}

export interface PostingSuggestion {
  type: 'timing' | 'audience' | 'format' | 'engagement'
  message: string
  impact: 'low' | 'medium' | 'high'
}

export interface VoiceProcessingResult {
  success: boolean
  transcript: TranscriptionResult
  generatedContent: GeneratedContent[]
  processingTime: number
  qualityMetrics: ProcessingQualityMetrics
  error?: VoiceError
}

export interface ProcessingQualityMetrics {
  transcription_accuracy: number // 0-100
  content_relevance: number // 0-100
  brand_alignment: number // 0-100
  engagement_potential: number // 0-100
  processing_speed: number // milliseconds
}

export interface VoiceRecorderConfig {
  maxDuration: number // seconds
  minDuration: number // seconds
  qualityThreshold: number // 0-100
  autoStop: boolean
  noiseReduction: boolean
  echoCancellation: boolean
  sampleRate: number
  channelCount: number
}

export interface AudioProcessor {
  start: () => Promise<void>
  stop: () => Promise<AudioChunk[]>
  pause: () => void
  resume: () => void
  getQuality: () => AudioQuality
  cleanup: () => void
}

// Event types for real-time updates
export interface VoiceProcessingEvents {
  'recording_started': { timestamp: number, config: VoiceRecorderConfig }
  'recording_stopped': { duration: number, quality: AudioQuality }
  'quality_warning': { warning: string, quality: AudioQuality }
  'transcription_progress': { progress: number, partial_text?: string }
  'content_generated': { platform: string, content: GeneratedContent }
  'processing_complete': { result: VoiceProcessingResult }
  'error_occurred': { error: VoiceError, context: string }
}

// API response types
export interface VoiceProcessingAPIResponse {
  success: boolean
  data?: VoiceProcessingResult
  error?: {
    code: string
    message: string
    details?: any
  }
  metadata: {
    request_id: string
    processing_time: number
    cost?: number
  }
} 