'use client'

import { useState } from 'react'
import Link from 'next/link'
import VoiceRecorder from '@/components/VoiceRecorder'
import { VoiceProcessingResult, VoiceError, GeneratedContent } from '@/types/voice'

// Content Display Component
interface ContentDisplayProps {
  content: GeneratedContent[]
  transcript: string
  processingTime: number
}

function ContentDisplay({ content, transcript, processingTime }: ContentDisplayProps) {
  const [selectedPlatform, setSelectedPlatform] = useState(0)

  if (!content || content.length === 0) return null

  const selectedContent = content[selectedPlatform]

  return (
    <div className="mt-8 space-y-6">
      {/* Transcript */}
      <div className="bg-white/10 rounded-lg p-6">
        <h3 className="text-xl font-bold text-white mb-3">🎤 What You Said</h3>
        <p className="text-white/90 text-lg leading-relaxed italic">
          &quot;{transcript}&quot;
        </p>
        <div className="text-white/60 text-sm mt-2">
          Processed in {processingTime}ms
        </div>
      </div>

      {/* Platform Tabs */}
      <div className="bg-white/10 rounded-lg overflow-hidden">
        <div className="flex bg-black/20">
          {content.map((item, index) => (
            <button
              key={item.platform}
              onClick={() => setSelectedPlatform(index)}
              className={`px-6 py-3 font-medium capitalize transition-colors ${
                selectedPlatform === index
                  ? 'bg-orange-500 text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              {item.platform}
            </button>
          ))}
        </div>

        {/* Selected Platform Content */}
        <div className="p-6">
          <div className="space-y-4">
            {/* Main Content */}
            <div>
              <h4 className="text-white/80 font-medium mb-2">📝 Generated Content</h4>
              <div className="bg-black/20 rounded-lg p-4">
                <p className="text-white text-lg leading-relaxed">
                  {selectedContent.content}
                </p>
              </div>
            </div>

            {/* Hashtags */}
            {selectedContent.hashtags.length > 0 && (
              <div>
                <h4 className="text-white/80 font-medium mb-2">🏷️ Hashtags</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedContent.hashtags.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-blue-500/20 text-blue-200 px-3 py-1 rounded-full text-sm"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Emojis */}
            {selectedContent.emojis.length > 0 && (
              <div>
                <h4 className="text-white/80 font-medium mb-2">😊 Suggested Emojis</h4>
                <div className="flex gap-2 text-2xl">
                  {selectedContent.emojis.map((emoji, index) => (
                    <span key={index} className="cursor-pointer hover:scale-110 transition-transform">
                      {emoji}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Engagement Hooks */}
            {selectedContent.engagementHooks.length > 0 && (
              <div>
                <h4 className="text-white/80 font-medium mb-2">🎣 Engagement Ideas</h4>
                <ul className="space-y-1">
                  {selectedContent.engagementHooks.map((hook, index) => (
                    <li key={index} className="text-white/80 text-sm">
                      • {hook}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
              <div>
                <div className="text-white/60 text-sm">Virality Score</div>
                <div className="text-white font-bold text-lg">
                  {selectedContent.virality_score}/100
                </div>
              </div>
              <div>
                <div className="text-white/60 text-sm">Est. Reach</div>
                <div className="text-white font-bold text-lg">
                  {selectedContent.estimated_reach.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Posting Suggestions */}
            {selectedContent.posting_suggestions.length > 0 && (
              <div>
                <h4 className="text-white/80 font-medium mb-2">💡 Posting Tips</h4>
                <div className="space-y-2">
                  {selectedContent.posting_suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg text-sm ${
                        suggestion.impact === 'high' ? 'bg-green-500/20 text-green-200' :
                        suggestion.impact === 'medium' ? 'bg-yellow-500/20 text-yellow-200' :
                        'bg-blue-500/20 text-blue-200'
                      }`}
                    >
                      <div className="font-medium capitalize">{suggestion.type}</div>
                      <div>{suggestion.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Main Demo Page
export default function DemoPage() {
  const [processingResult, setProcessingResult] = useState<VoiceProcessingResult | null>(null)
  const [error, setError] = useState<VoiceError | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleTranscriptionComplete = (result: VoiceProcessingResult) => {
    console.log('Transcription complete:', result)
    setProcessingResult(result)
    setError(null)
    setIsLoading(false)
  }

  const handleError = (voiceError: VoiceError) => {
    console.error('Voice error:', voiceError)
    setError(voiceError)
    setProcessingResult(null)  
    setIsLoading(false)
  }

  const handleRecordingStateChange = (state: any) => {
    setIsLoading(state.isProcessing || state.isTranscribing)
    
    // Clear previous results when starting new recording
    if (state.isRecording && !state.isProcessing) {
      setProcessingResult(null)
      setError(null)
    }
  }

  const resetDemo = () => {
    setProcessingResult(null)
    setError(null)
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-orange-900 to-red-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('/api/placeholder/1920/1080')] bg-cover bg-center opacity-10"></div>
      
      <div className="relative z-10 container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            🎤 Voice to Social Content
          </h1>
          <p className="text-xl text-white/80 max-w-3xl mx-auto">
            Describe your dish, and our AI will instantly create optimized social media content 
            for Instagram, TikTok, Facebook, and more!
          </p>
        </div>

        {/* Instructions */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="bg-white/10 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">📋 How to Use</h2>
            <div className="space-y-3 text-white/80">
              <div className="flex items-start gap-3">
                <span className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
                <p>Click the microphone button to start recording</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
                <p>Describe your dish naturally - ingredients, preparation, taste, experience</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</span>
                <p>Watch the AI quality monitor and speak clearly</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">4</span>
                <p>Get optimized content for multiple social platforms instantly!</p>
              </div>
            </div>
          </div>
        </div>

        {/* Voice Recorder */}
        <div className="max-w-2xl mx-auto">
          <VoiceRecorder
            onTranscriptionComplete={handleTranscriptionComplete}
            onError={handleError}
            onRecordingStateChange={handleRecordingStateChange}
            maxDuration={180} // 3 minutes for demo
            autoSubmit={true}
            className="mb-8"
          />
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center">
            <div className="inline-flex items-center gap-3 bg-white/10 rounded-lg px-6 py-4">
              <div className="animate-spin text-2xl">🔄</div>
              <span className="text-white font-medium">Processing your voice...</span>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">❌</span>
                <h3 className="text-xl font-bold text-red-200">Something went wrong</h3>
              </div>
              <p className="text-red-200 mb-4">{error.message}</p>
              {error.recoverable && (
                <button
                  onClick={resetDemo}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Try Again
                </button>
              )}
            </div>
          </div>
        )}

        {/* Results Display */}
        {processingResult && (
          <div className="max-w-4xl mx-auto">
            <ContentDisplay
              content={processingResult.generatedContent}
              transcript={processingResult.transcript.text}
              processingTime={processingResult.processingTime}
            />
            
            {/* Quality Metrics */}
            <div className="mt-8 bg-white/10 rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-4">📊 Processing Quality</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-300">
                    {Math.round(processingResult.qualityMetrics.transcription_accuracy)}%
                  </div>
                  <div className="text-white/60 text-sm">Transcription</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-300">
                    {Math.round(processingResult.qualityMetrics.content_relevance)}%
                  </div>
                  <div className="text-white/60 text-sm">Relevance</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-300">
                    {Math.round(processingResult.qualityMetrics.brand_alignment)}%
                  </div>
                  <div className="text-white/60 text-sm">Brand Fit</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-300">
                    {Math.round(processingResult.qualityMetrics.engagement_potential)}%
                  </div>
                  <div className="text-white/60 text-sm">Engagement</div>
                </div>
              </div>
            </div>

            {/* Reset Button */}
            <div className="text-center mt-8">
              <button
                onClick={resetDemo}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-3 px-8 rounded-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                🎙️ Record Another
              </button>
            </div>
          </div>
        )}

        {/* Demo Examples */}
        {!processingResult && !isLoading && !error && (
          <div className="max-w-4xl mx-auto mt-12">
            <h2 className="text-2xl font-bold text-white text-center mb-8">💡 Example Descriptions</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white/10 rounded-lg p-6">
                <h3 className="font-bold text-white mb-3">🍝 Perfect for Pasta Dishes</h3>
                <p className="text-white/80 italic">
                  &quot;This is our signature truffle carbonara - we use fresh house-made pasta, 
                  real Pecorino Romano, and shave black truffles right at the table. 
                  The sauce is silky, the pasta has perfect bite, and that truffle aroma 
                  just fills the whole dining room.&quot;
                </p>
              </div>
              <div className="bg-white/10 rounded-lg p-6">
                <h3 className="font-bold text-white mb-3">🥩 Great for Meat Dishes</h3>
                <p className="text-white/80 italic">
                  &quot;Our dry-aged ribeye is marbled beautifully and grilled to perfection. 
                  We serve it with roasted garlic butter, grilled asparagus, and these 
                  amazing truffle fingerling potatoes. Every bite is incredibly tender 
                  and packed with flavor.&quot;
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 