import { 
  TranscriptionResult,
  ContentGenerationRequest,
  GeneratedContent,
  RestaurantContext,
  SocialPlatform,
  ProcessingQualityMetrics,
  PostingSuggestion 
} from '../types/voice'

/**
 * AI Content Generator Class
 * Handles transcription via OpenAI Whisper and content generation via GPT-4
 */
export class AIContentGenerator {
  private apiKey: string
  private baseURL = 'https://api.openai.com/v1'

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || ''
    if (!this.apiKey) {
      console.warn('OpenAI API key not provided. AI features will not work.')
    }
  }

  /**
   * Transcribe audio file using OpenAI Whisper
   */
  async transcribeAudio(audioFile: File): Promise<TranscriptionResult> {
    const startTime = Date.now()

    try {
      const formData = new FormData()
      formData.append('file', audioFile)
      formData.append('model', 'whisper-1')
      formData.append('response_format', 'verbose_json')
      formData.append('language', 'en') // Auto-detect or specify

      const response = await fetch(`${this.baseURL}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const processingTime = Date.now() - startTime

      return {
        text: data.text,
        confidence: data.segments ? this.calculateAverageConfidence(data.segments) : 0.95,
        language: data.language || 'en',
        segments: data.segments || [],
        processingTime
      }

    } catch (error) {
      throw new Error(`Transcription error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate social media content from transcript
   */
  async generateContent(request: ContentGenerationRequest): Promise<GeneratedContent[]> {
    const results: GeneratedContent[] = []

    for (const platform of request.platforms) {
      if (!platform.enabled) continue

      try {
        const content = await this.generatePlatformContent(request, platform)
        results.push(content)
      } catch (error) {
        console.error(`Failed to generate content for ${platform.name}:`, error)
        // Continue with other platforms
      }
    }

    return results
  }

  /**
   * Generate content for specific platform
   */
  private async generatePlatformContent(
    request: ContentGenerationRequest, 
    platform: SocialPlatform
  ): Promise<GeneratedContent> {
    const systemPrompt = this.buildSystemPrompt(request.context, platform)
    const userPrompt = this.buildUserPrompt(request, platform)

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini', // More cost-effective for content generation
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      })

      if (!response.ok) {
        throw new Error(`Content generation failed: ${response.status}`)
      }

      const data = await response.json()
      const generatedText = data.choices[0]?.message?.content

      if (!generatedText) {
        throw new Error('No content generated')
      }

      return this.parseGeneratedContent(generatedText, platform, request)

    } catch (error) {
      throw new Error(`Platform content generation error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Build system prompt for AI content generation
   */
  private buildSystemPrompt(context: RestaurantContext, platform: SocialPlatform): string {
    return `You are an expert social media content creator specializing in restaurant marketing.

RESTAURANT CONTEXT:
- Name: ${context.name}
- Cuisine: ${context.cuisine}
- Location: ${context.location}
- Brand Voice: ${context.brandVoice}
- Specialties: ${context.specialties.join(', ')}
- Target Audience: ${context.targetAudience.join(', ')}

PLATFORM: ${platform.name.toUpperCase()}
PLATFORM REQUIREMENTS:
- Max Length: ${platform.customization.maxLength} characters
- Hashtag Count: ${platform.customization.hashtagCount}
- Emoji Style: ${platform.customization.emojiStyle}
- Tone: ${platform.customization.tone}
- CTA Button: ${platform.customization.includeCtaButton ? 'Include' : 'Exclude'}

RESPONSE FORMAT (Return ONLY valid JSON):
{
  "content": "Main post content without hashtags",
  "hashtags": ["hashtag1", "hashtag2"],
  "emojis": ["🍽️", "✨"],
  "engagementHooks": ["Hook 1", "Hook 2"],
  "virality_score": 85,
  "estimated_reach": 1500,
  "posting_suggestions": [
    {"type": "timing", "message": "Best posted during lunch hours", "impact": "medium"}
  ]
}

CREATE COMPELLING, AUTHENTIC CONTENT THAT DRIVES ENGAGEMENT.`
  }

  /**
   * Build user prompt with specific content request
   */
  private buildUserPrompt(request: ContentGenerationRequest, platform: SocialPlatform): string {
    return `Create ${platform.name} content based on this voice description:

TRANSCRIPT: "${request.transcript}"

CONTENT TYPE: ${request.contentType}
MOOD: ${request.mood}
INCLUDE HASHTAGS: ${request.includeHashtags}
INCLUDE EMOJIS: ${request.includeEmojis}

Make it engaging, authentic, and optimized for ${platform.name}. Focus on storytelling and emotional connection.`
  }

  /**
   * Parse generated content and structure it properly
   */
  private parseGeneratedContent(
    generatedText: string, 
    platform: SocialPlatform,
    request: ContentGenerationRequest
  ): GeneratedContent {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(generatedText)
      
      return {
        platform: platform.name,
        content: parsed.content || generatedText,
        hashtags: parsed.hashtags || this.extractHashtags(generatedText),
        emojis: parsed.emojis || this.extractEmojis(generatedText),
        engagementHooks: parsed.engagementHooks || [],
        virality_score: parsed.virality_score || this.calculateViralityScore(generatedText),
        estimated_reach: parsed.estimated_reach || this.estimateReach(platform.name),
        posting_suggestions: parsed.posting_suggestions || this.generatePostingSuggestions(platform)
      }
      
    } catch {
      // Fallback: parse unstructured text
      return {
        platform: platform.name,
        content: generatedText,
        hashtags: this.extractHashtags(generatedText),
        emojis: this.extractEmojis(generatedText),
        engagementHooks: this.extractEngagementHooks(generatedText),
        virality_score: this.calculateViralityScore(generatedText),
        estimated_reach: this.estimateReach(platform.name),
        posting_suggestions: this.generatePostingSuggestions(platform)
      }
    }
  }

  /**
   * Calculate average confidence from transcription segments
   */
  private calculateAverageConfidence(segments: any[]): number {
    if (!segments.length) return 0.95
    
    const totalConfidence = segments.reduce((sum, segment) => {
      return sum + (segment.confidence || 0.95)
    }, 0)
    
    return totalConfidence / segments.length
  }

  /**
   * Extract hashtags from text
   */
  private extractHashtags(text: string): string[] {
    const hashtagRegex = /#[\w]+/g
    const matches = text.match(hashtagRegex) || []
    return matches.map(tag => tag.substring(1)) // Remove # symbol
  }

  /**
   * Extract emojis from text
   */
  private extractEmojis(text: string): string[] {
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu
    return text.match(emojiRegex) || []
  }

  /**
   * Extract engagement hooks from content
   */
  private extractEngagementHooks(text: string): string[] {
    const hooks: string[] = []
    
    // Look for question patterns
    const questions = text.match(/[^.!?]*\?/g)
    if (questions) hooks.push(...questions.map(q => q.trim()))
    
    // Look for call-to-action patterns
    const ctaPatterns = [
      /tag a friend/i,
      /share if/i,
      /comment below/i,
      /what's your favorite/i,
      /have you tried/i
    ]
    
    ctaPatterns.forEach(pattern => {
      const match = text.match(pattern)
      if (match) hooks.push(match[0])
    })
    
    return hooks.slice(0, 3) // Limit to top 3 hooks
  }

  /**
   * Calculate virality score based on content characteristics
   */
  private calculateViralityScore(content: string): number {
    let score = 50 // Base score
    
    // Positive indicators
    if (content.includes('?')) score += 10 // Questions engage
    if (this.extractEmojis(content).length > 0) score += 15 // Emojis help
    if (content.length > 50 && content.length < 200) score += 10 // Optimal length
    if (/(amazing|incredible|perfect|delicious|mouth-watering)/i.test(content)) score += 10
    if (/(secret|exclusive|limited|special)/i.test(content)) score += 15
    
    // Negative indicators
    if (content.length > 300) score -= 10 // Too long
    if (content.split('#').length > 8) score -= 10 // Too many hashtags
    
    return Math.min(95, Math.max(10, score))
  }

  /**
   * Estimate reach based on platform
   */
  private estimateReach(platform: string): number {
    const baseReach = {
      instagram: 800,
      tiktok: 1200,
      facebook: 600,
      twitter: 400,
      linkedin: 300
    }
    
    const base = baseReach[platform as keyof typeof baseReach] || 500
    const variance = base * 0.3 // ±30% variance
    
    return Math.floor(base + (Math.random() - 0.5) * 2 * variance)
  }

  /**
   * Generate posting suggestions for platform
   */
  private generatePostingSuggestions(platform: SocialPlatform): PostingSuggestion[] {
    const suggestions: PostingSuggestion[] = []
    
    // Platform-specific timing suggestions
    const timingAdvice = {
      instagram: 'Post between 11 AM - 1 PM for maximum engagement',
      tiktok: 'Best posted in the evening (6-10 PM) when users are most active',
      facebook: 'Optimal posting time is 1-3 PM on weekdays',
      twitter: 'Tweet during lunch hours (12-1 PM) for food content',
      linkedin: 'Share during business hours (9 AM - 5 PM)'
    }
    
    const timing = timingAdvice[platform.name as keyof typeof timingAdvice]
    if (timing) {
      suggestions.push({
        type: 'timing',
        message: timing,
        impact: 'medium'
      })
    }
    
    // Engagement suggestions
    suggestions.push({
      type: 'engagement',
      message: 'Add a call-to-action asking followers to share their favorite dishes',
      impact: 'high'
    })
    
    // Format suggestions
    if (platform.name === 'instagram') {
      suggestions.push({
        type: 'format',
        message: 'Consider creating a carousel post with multiple food angles',
        impact: 'medium'
      })
    }
    
    return suggestions
  }
}

/**
 * Utility functions for content optimization
 */

/**
 * Validate generated content meets platform requirements
 */
export function validateContent(content: GeneratedContent, platform: SocialPlatform): {
  valid: boolean
  issues: string[]
} {
  const issues: string[] = []
  
  // Check length
  if (content.content.length > platform.customization.maxLength) {
    issues.push(`Content exceeds ${platform.customization.maxLength} character limit`)
  }
  
  // Check hashtag count
  if (content.hashtags.length > platform.customization.hashtagCount) {
    issues.push(`Too many hashtags: ${content.hashtags.length} (max: ${platform.customization.hashtagCount})`)
  }
  
  // Check for required elements
  if (platform.customization.includeCtaButton && !hasCallToAction(content.content)) {
    issues.push('Missing call-to-action element')
  }
  
  return {
    valid: issues.length === 0,
    issues
  }
}

/**
 * Check if content has call-to-action
 */
function hasCallToAction(content: string): boolean {
  const ctaPatterns = [
    /visit us/i,
    /try it/i,
    /order now/i,
    /book a table/i,
    /call us/i,
    /check us out/i,
    /come hungry/i,
    /taste the difference/i
  ]
  
  return ctaPatterns.some(pattern => pattern.test(content))
}

/**
 * Calculate processing quality metrics
 */
export function calculateQualityMetrics(
  transcription: TranscriptionResult,
  generatedContent: GeneratedContent[],
  processingTime: number
): ProcessingQualityMetrics {
  const transcription_accuracy = Math.min(100, transcription.confidence * 100)
  
  const content_relevance = generatedContent.length > 0 
    ? generatedContent.reduce((sum, content) => sum + content.virality_score, 0) / generatedContent.length
    : 0
  
  const brand_alignment = generatedContent.length > 0 ? 85 : 0 // Simplified metric
  
  const engagement_potential = generatedContent.length > 0
    ? Math.max(...generatedContent.map(c => c.virality_score))
    : 0
  
  return {
    transcription_accuracy,
    content_relevance,
    brand_alignment,
    engagement_potential,
    processing_speed: processingTime
  }
} 