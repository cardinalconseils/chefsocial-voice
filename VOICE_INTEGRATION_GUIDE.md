# 🎤 ChefSocial Voice AI Integration Guide

## Overview

The ChefSocial Voice AI system transforms restaurant voice recordings into engaging social media content using OpenAI's Whisper for transcription and GPT-4 for content generation.

## System Architecture

```
Voice Input → Audio Processing → Transcription → AI Content Generation → Platform-Specific Output
     ↓              ↓               ↓                    ↓                        ↓
Audio Capture → Quality Check → Whisper API → GPT-4 Processing → Instagram/TikTok/etc.
```

## Core Components

### 1. Voice Processing (`src/lib/voice-processing.ts`)

**VoiceProcessor Class**
- Real-time audio capture using WebRTC
- Audio quality monitoring with visual feedback
- Chunked recording for optimal processing
- Automatic quality validation

**Key Features:**
- Volume level monitoring (0-100)
- Noise level detection
- Audio clarity analysis
- Real-time warnings for poor quality

**Usage:**
```typescript
const processor = new VoiceProcessor({
  maxDuration: 300, // 5 minutes max
  minDuration: 1,   // 1 second min
  qualityThreshold: 60,
  autoStop: true
})

processor.on('quality_warning', ({ warning, quality }) => {
  console.log(`Audio warning: ${warning}`)
})

await processor.start()
const chunks = await processor.stop()
const audioFile = await chunksToAudioFile(chunks)
```

### 2. AI Content Generation (`src/lib/ai-content.ts`)

**AIContentGenerator Class**
- OpenAI Whisper integration for transcription
- GPT-4 powered content generation
- Platform-specific optimization
- Virality scoring algorithm

**Supported Platforms:**
- Instagram (visual-focused, hashtag-heavy)
- TikTok (trend-aware, hook-focused)
- Facebook (community-engaging)
- Twitter (concise, witty)
- LinkedIn (professional, informative)

**Usage:**
```typescript
const generator = new AIContentGenerator(process.env.OPENAI_API_KEY)

const transcription = await generator.transcribeAudio(audioFile)
const content = await generator.generateContent({
  transcript: transcription.text,
  context: restaurantContext,
  platforms: selectedPlatforms,
  contentType: 'dish_description',
  mood: 'casual'
})
```

### 3. React Components

#### VoiceRecorder Component (`src/components/VoiceRecorder.tsx`)

**Features:**
- One-tap recording with visual feedback
- Real-time waveform visualization
- Quality monitoring with warnings
- Auto-submit on completion
- Mobile-optimized touch controls

**Props:**
```typescript
interface VoiceRecorderProps {
  onTranscriptionComplete?: (result: VoiceProcessingResult) => void
  onError?: (error: VoiceError) => void
  maxDuration?: number
  autoSubmit?: boolean
  disabled?: boolean
}
```

### 4. API Integration (`src/app/api/voice/process/route.ts`)

**POST /api/voice/process**
- Handles audio file upload
- Processes transcription and content generation
- Returns formatted results for all platforms
- Includes quality metrics and processing time

**Request Format:**
```typescript
FormData {
  audio: File, // WebM/MP4/WAV audio file
  context: JSON, // Restaurant context
  platforms: JSON, // Platform configurations
  options: JSON // Processing options
}
```

**Response Format:**
```typescript
{
  success: boolean,
  data: {
    transcript: TranscriptionResult,
    generatedContent: GeneratedContent[],
    processingTime: number,
    qualityMetrics: ProcessingQualityMetrics
  },
  metadata: {
    request_id: string,
    processing_time: number
  }
}
```

## Implementation Guide

### Step 1: Environment Setup

Add to your `.env.local`:
```bash
OPENAI_API_KEY=your_openai_api_key_here
```

### Step 2: Basic Integration

```typescript
import VoiceRecorder from '@/components/VoiceRecorder'
import { VoiceProcessingResult } from '@/types/voice'

function MyComponent() {
  const handleComplete = (result: VoiceProcessingResult) => {
    console.log('Transcription:', result.transcript.text)
    result.generatedContent.forEach(content => {
      console.log(`${content.platform}: ${content.content}`)
    })
  }

  return (
    <VoiceRecorder
      onTranscriptionComplete={handleComplete}
      maxDuration={180} // 3 minutes
      autoSubmit={true}
    />
  )
}
```

### Step 3: Custom Processing

```typescript
import { VoiceProcessor, AIContentGenerator } from '@/lib/voice-processing'

const processor = new VoiceProcessor()
const generator = new AIContentGenerator()

// Record audio
await processor.start()
// ... recording happens ...
const chunks = await processor.stop()

// Process with custom settings
const audioFile = await chunksToAudioFile(chunks)
const transcription = await generator.transcribeAudio(audioFile)
const content = await generator.generateContent({
  transcript: transcription.text,
  context: {
    name: "Bella Vista",
    cuisine: "Italian",
    location: "Downtown",
    brandVoice: "warm and welcoming",
    specialties: ["homemade pasta", "wood-fired pizza"],
    targetAudience: ["food lovers", "families"]
  },
  platforms: [
    {
      name: 'instagram',
      enabled: true,
      customization: {
        maxLength: 2200,
        hashtagCount: 25,
        emojiStyle: 'moderate',
        tone: 'casual',
        includeCtaButton: true
      }
    }
  ]
})
```

## Quality Metrics

### Audio Quality Indicators
- **Excellent (90-100)**: Crystal clear audio, minimal noise
- **Good (70-89)**: Clear audio with minor background noise
- **Poor (50-69)**: Audible but with quality issues
- **Unusable (<50)**: Too poor for reliable transcription

### Content Quality Metrics
- **Transcription Accuracy**: Based on OpenAI confidence scores
- **Content Relevance**: Alignment with input and restaurant context
- **Brand Alignment**: Professional language and brand voice consistency
- **Engagement Potential**: Predicted virality based on content analysis

## Performance Optimization

### Audio Processing
- Use WebM format for optimal compression
- Chunk recordings every 1 second for responsiveness
- Monitor quality in real-time to prevent bad recordings
- Auto-stop after quality warnings

### API Efficiency
- Batch process multiple platforms simultaneously
- Cache restaurant context to avoid repetition
- Use streaming responses for long processing times
- Implement retry logic for failed requests

### Error Handling
- Graceful degradation for unsupported browsers
- Clear error messages for permission issues
- Automatic retry for network failures
- Quality warnings before processing

## Browser Compatibility

### Supported Features
- **Chrome/Edge**: Full support including WebM recording
- **Firefox**: Full support with Opus codec
- **Safari**: Limited support (may require polyfills)
- **Mobile**: Optimized for touch interfaces

### Requirements
- HTTPS required for microphone access (except localhost)
- Modern browser with MediaRecorder API support
- Microphone permission from user

## Troubleshooting

### Common Issues

**1. "Microphone permission denied"**
- Solution: Ensure HTTPS and request permission properly
- Code: Check browser settings and retry permission request

**2. "Audio quality too poor"**
- Solution: Reduce background noise, speak closer to microphone
- Code: Adjust quality thresholds or add noise reduction

**3. "Transcription failed"**
- Solution: Check OpenAI API key and network connection
- Code: Implement retry logic and error handling

**4. "Content generation timeout"**
- Solution: Reduce platform count or simplify requirements
- Code: Add timeout handling and partial results

### Debug Mode

Enable debug logging:
```typescript
const processor = new VoiceProcessor({ debug: true })
processor.on('debug', ({ message, data }) => {
  console.log('[Voice Debug]', message, data)
})
```

## Integration Examples

### Demo Page (`src/app/demo/page.tsx`)
Complete implementation with content display and platform switching

### Conversation App (`src/app/apps/conversation/page.tsx`)
Real-time voice processing with live feedback

### Admin Dashboard
Analytics and quality monitoring for restaurant managers

## API Reference

See `src/types/voice.ts` for complete TypeScript definitions of all interfaces and types used in the voice processing system.

## Performance Targets

- **Processing Time**: <30 seconds end-to-end
- **Transcription Accuracy**: >95% for clear audio
- **Content Generation Success**: >95% completion rate
- **Quality Score**: >80 average across all metrics
- **Mobile Performance**: Smooth operation on mid-range devices

## Future Enhancements

1. **Real-time Streaming**: Live transcription as user speaks
2. **Voice Commands**: Navigate interface with voice
3. **Multi-language Support**: Detect and process multiple languages
4. **Advanced Analytics**: Detailed engagement prediction
5. **Integration APIs**: Connect to restaurant POS systems 