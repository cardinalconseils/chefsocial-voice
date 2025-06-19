'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { VoiceProcessor, chunksToAudioFile, checkVoiceSupport } from '@/lib/voice-processing'
import { 
  VoiceRecordingState, 
  AudioQuality, 
  VoiceError, 
  VoiceProcessingResult,
  VoiceProcessingEvents,
  AudioChunk 
} from '@/types/voice'

interface VoiceRecorderProps {
  onTranscriptionComplete?: (result: VoiceProcessingResult) => void
  onError?: (error: VoiceError) => void
  onRecordingStateChange?: (state: VoiceRecordingState) => void
  disabled?: boolean
  maxDuration?: number
  autoSubmit?: boolean
  className?: string
}

export default function VoiceRecorder({
  onTranscriptionComplete,
  onError,
  onRecordingStateChange,
  disabled = false,
  maxDuration = 300,
  autoSubmit = true,
  className = ''
}: VoiceRecorderProps) {
  // State management
  const [recordingState, setRecordingState] = useState<VoiceRecordingState>({
    isRecording: false,
    isProcessing: false,
    isTranscribing: false,
    audioQuality: {
      level: 'excellent',
      volume: 0,
      noiseLevel: 0,
      clarity: 0,
      warnings: []
    },
    duration: 0
  })

  const [voiceSupport, setVoiceSupport] = useState(checkVoiceSupport())
  const [waveformData, setWaveformData] = useState<number[]>(new Array(20).fill(0))
  
  // Refs
  const voiceProcessor = useRef<VoiceProcessor | null>(null)
  const durationInterval = useRef<NodeJS.Timeout | null>(null)
  const waveformInterval = useRef<NodeJS.Timeout | null>(null)

  // Initialize voice processor
  useEffect(() => {
    voiceProcessor.current = new VoiceProcessor({
      maxDuration,
      minDuration: 1,
      qualityThreshold: 60,
      autoStop: true,
      noiseReduction: true
    })

    // Set up event listeners
    const processor = voiceProcessor.current

    processor.on('recording_started', handleRecordingStarted)
    processor.on('recording_stopped', handleRecordingStopped)
    processor.on('quality_warning', handleQualityWarning)
    processor.on('error_occurred', handleErrorOccurred)

    return () => {
      processor.cleanup()
      if (durationInterval.current) clearInterval(durationInterval.current)
      if (waveformInterval.current) clearInterval(waveformInterval.current)
    }
  }, [maxDuration])

  // Event handlers
  const handleRecordingStarted = useCallback((data: VoiceProcessingEvents['recording_started']) => {
    console.log('Recording started:', data)
    
    // Start duration tracking
    const startTime = data.timestamp
    durationInterval.current = setInterval(() => {
      const duration = (Date.now() - startTime) / 1000
      updateRecordingState({ duration })
    }, 100)

    // Start waveform animation
    waveformInterval.current = setInterval(() => {
      if (voiceProcessor.current) {
        const quality = voiceProcessor.current.getQuality()
        updateRecordingState({ audioQuality: quality })
        
        // Generate waveform data based on volume
        const newWaveform = Array.from({ length: 20 }, () => {
          const baseHeight = Math.random() * 0.3 + 0.1
          const volumeMultiplier = quality.volume / 100
          return Math.min(1, baseHeight + volumeMultiplier * 0.6)
        })
        setWaveformData(newWaveform)
      }
    }, 100)
  }, [])

  const handleRecordingStopped = useCallback(async (data: VoiceProcessingEvents['recording_stopped']) => {
    console.log('Recording stopped:', data)
    
    // Clean up intervals
    if (durationInterval.current) {
      clearInterval(durationInterval.current)
      durationInterval.current = null
    }
    if (waveformInterval.current) {
      clearInterval(waveformInterval.current)
      waveformInterval.current = null
    }

    // Reset waveform
    setWaveformData(new Array(20).fill(0))

    updateRecordingState({
      isRecording: false,
      duration: data.duration
    })

    // Process audio if auto-submit is enabled
    if (autoSubmit) {
      await processRecording()
    }
  }, [autoSubmit])

  const handleQualityWarning = useCallback((data: VoiceProcessingEvents['quality_warning']) => {
    console.warn('Quality warning:', data.warning)
    updateRecordingState({ audioQuality: data.quality })
  }, [])

  const handleErrorOccurred = useCallback((data: VoiceProcessingEvents['error_occurred']) => {
    console.error('Voice processing error:', data.error)
    updateRecordingState({ 
      error: data.error,
      isRecording: false,
      isProcessing: false,
      isTranscribing: false 
    })
    onError?.(data.error)
  }, [onError])

  // Helper to update recording state
  const updateRecordingState = useCallback((updates: Partial<VoiceRecordingState>) => {
    setRecordingState(prev => {
      const newState = { ...prev, ...updates }
      onRecordingStateChange?.(newState)
      return newState
    })
  }, [onRecordingStateChange])

  // Main recording control
  const toggleRecording = async () => {
    if (!voiceProcessor.current || disabled) return

    try {
      if (recordingState.isRecording) {
        // Stop recording
        await voiceProcessor.current.stop()
      } else {
        // Start recording
        updateRecordingState({ 
          isRecording: true, 
          error: undefined,
          duration: 0
        })
        await voiceProcessor.current.start()
      }
    } catch (error) {
      const voiceError: VoiceError = {
        type: 'permission',
        message: error instanceof Error ? error.message : 'Failed to toggle recording',
        recoverable: true
      }
      handleErrorOccurred({ error: voiceError, context: 'toggle_recording' })
    }
  }

  // Process recorded audio
  const processRecording = async () => {
    if (!voiceProcessor.current) return

    try {
      updateRecordingState({ isProcessing: true, isTranscribing: true })

      // Get audio chunks and convert to file
      const chunks: AudioChunk[] = []
      const audioFile = await chunksToAudioFile(chunks)

      // Send to processing API
      const formData = new FormData()
      formData.append('audio', audioFile)
      formData.append('config', JSON.stringify({
        contentType: 'dish_description',
        mood: 'excited',
        includeHashtags: true,
        includeEmojis: true
      }))

      const response = await fetch('/api/voice/process', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Processing failed: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success && result.data) {
        updateRecordingState({ 
          isProcessing: false, 
          isTranscribing: false 
        })
        onTranscriptionComplete?.(result.data)
      } else {
        throw new Error(result.error?.message || 'Processing failed')
      }

    } catch (error) {
      const voiceError: VoiceError = {
        type: 'processing',
        message: error instanceof Error ? error.message : 'Processing failed',
        recoverable: true
      }
      
      updateRecordingState({ 
        isProcessing: false, 
        isTranscribing: false,
        error: voiceError 
      })
      onError?.(voiceError)
    }
  }

  // Render helpers
  const getButtonIcon = () => {
    if (recordingState.isTranscribing) return '⚙️'
    if (recordingState.isProcessing) return '🔄'
    if (recordingState.isRecording) return '⏹️'
    return '🎤'
  }

  const getButtonText = () => {
    if (recordingState.isTranscribing) return 'Generating Content...'
    if (recordingState.isProcessing) return 'Processing Audio...'
    if (recordingState.isRecording) return 'Stop Recording'
    return 'Start Recording'
  }

  const getButtonColor = () => {
    if (recordingState.isTranscribing) return 'bg-blue-500'
    if (recordingState.isProcessing) return 'bg-yellow-500'
    if (recordingState.isRecording) return 'bg-red-500 animate-pulse'
    return 'bg-gradient-to-r from-orange-500 to-red-500'
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Show unsupported message if browser doesn't support voice features
  if (!voiceSupport.supported) {
    return (
      <div className={`voice-recorder-unsupported ${className}`}>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <h3 className="font-bold">Voice Recording Not Supported</h3>
          <p>Your browser doesn't support the required features:</p>
          <ul className="list-disc list-inside mt-2">
            {voiceSupport.missing.map(feature => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
          {voiceSupport.warnings.length > 0 && (
            <div className="mt-2">
              <p className="font-semibold">Warnings:</p>
              <ul className="list-disc list-inside">
                {voiceSupport.warnings.map(warning => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`voice-recorder ${className}`}>
      {/* Main Recording Button */}
      <div className="text-center mb-8">
        <button
          onClick={toggleRecording}
          disabled={disabled || recordingState.isProcessing}
          className={`w-32 h-32 rounded-full text-4xl font-bold transition-all duration-300 ${getButtonColor()} text-white shadow-lg hover:shadow-xl hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {getButtonIcon()}
        </button>
        
        <p className="text-white/80 mt-4 text-lg">
          {getButtonText()}
        </p>
        
        {/* Duration Display */}
        {recordingState.isRecording && (
          <div className="mt-4">
            <div className="text-2xl font-mono text-white">
              {formatDuration(recordingState.duration)}
            </div>
            <div className="text-sm text-white/60">
              Max: {formatDuration(maxDuration)}
            </div>
          </div>
        )}
      </div>

      {/* Waveform Visualization */}
      {recordingState.isRecording && (
        <div className="mb-8">
          <div className="flex items-end justify-center gap-1 h-16">
            {waveformData.map((height, index) => (
              <div
                key={index}
                className="bg-gradient-to-t from-orange-500 to-red-500 w-2 rounded-t transition-all duration-100"
                style={{ height: `${height * 100}%` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Audio Quality Indicator */}
      {recordingState.isRecording && (
        <div className="mb-6">
          <div className="bg-white/10 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/80">Audio Quality:</span>
              <span className={`font-semibold ${
                recordingState.audioQuality.level === 'excellent' ? 'text-green-300' :
                recordingState.audioQuality.level === 'good' ? 'text-yellow-300' :
                recordingState.audioQuality.level === 'poor' ? 'text-orange-300' :
                'text-red-300'
              }`}>
                {recordingState.audioQuality.level.toUpperCase()}
              </span>
            </div>
            
            {/* Quality Metrics */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <div className="text-white/60">Volume</div>
                <div className="text-white">{Math.round(recordingState.audioQuality.volume)}%</div>
              </div>
              <div>
                <div className="text-white/60">Clarity</div>
                <div className="text-white">{Math.round(recordingState.audioQuality.clarity)}%</div>
              </div>
              <div>
                <div className="text-white/60">Noise</div>
                <div className="text-white">{Math.round(recordingState.audioQuality.noiseLevel)}%</div>
              </div>
            </div>

            {/* Quality Warnings */}
            {recordingState.audioQuality.warnings.length > 0 && (
              <div className="mt-2 text-xs text-yellow-300">
                ⚠️ {recordingState.audioQuality.warnings.join(', ')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recording State Indicator */}
      {recordingState.isRecording && (
        <div className="text-center">
          <div className="flex justify-center items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-red-300 font-medium">Recording...</span>
          </div>
        </div>
      )}

      {/* Processing State */}
      {(recordingState.isProcessing || recordingState.isTranscribing) && (
        <div className="text-center">
          <div className="flex justify-center items-center gap-2">
            <div className="animate-spin text-blue-300">⚙️</div>
            <span className="text-blue-300 font-medium">
              {recordingState.isTranscribing ? 'AI is generating content...' : 'Processing audio...'}
            </span>
          </div>
        </div>
      )}

      {/* Error Display */}
      {recordingState.error && (
        <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <div className="flex items-center gap-2">
            <span>❌</span>
            <div>
              <div className="font-semibold">Error: {recordingState.error.type}</div>
              <div className="text-sm">{recordingState.error.message}</div>
              {recordingState.error.recoverable && (
                <div className="text-xs mt-1">Try recording again</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 