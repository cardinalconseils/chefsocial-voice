'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { VoiceProcessor, checkVoiceSupport, formatDuration, formatFileSize } from '@/lib/voice-processing'
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
  uploadEndpoint?: string
  compressionEnabled?: boolean
}

export default function VoiceRecorder({
  onTranscriptionComplete,
  onError,
  onRecordingStateChange,
  disabled = false,
  maxDuration = 300,
  autoSubmit = true,
  className = '',
  uploadEndpoint = '/api/voice/process',
  compressionEnabled = true
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
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [audioFileSize, setAudioFileSize] = useState<number>(0)
  const [recordingStartTime, setRecordingStartTime] = useState<number>(0)
  
  // Refs
  const voiceProcessor = useRef<VoiceProcessor | null>(null)
  const durationInterval = useRef<NodeJS.Timeout | null>(null)
  const waveformInterval = useRef<NodeJS.Timeout | null>(null)
  const animationFrame = useRef<number | null>(null)

  const updateRecordingState = useCallback((updates: Partial<VoiceRecordingState>) => {
    setRecordingState(prev => {
      const newState = { ...prev, ...updates }
      onRecordingStateChange?.(newState)
      return newState
    })
  }, [onRecordingStateChange])

  const cleanup = useCallback(() => {
    if (durationInterval.current) {
      clearInterval(durationInterval.current)
      durationInterval.current = null
    }
    if (waveformInterval.current) {
      clearInterval(waveformInterval.current)
      waveformInterval.current = null
    }
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current)
      animationFrame.current = null
    }
  }, [])

  const handleErrorOccurred = useCallback((data: VoiceProcessingEvents['error_occurred']) => {
    console.error('Voice processing error:', data.error)
    cleanup()
    updateRecordingState({ 
      error: data.error,
      isRecording: false,
      isProcessing: false,
      isTranscribing: false 
    })
    setUploadProgress(0)
    setAudioFileSize(0)
    onError?.(data.error)
  }, [onError, cleanup, updateRecordingState])

  const processRecording = useCallback(async () => {
    if (!voiceProcessor.current) return

    try {
      updateRecordingState({ isProcessing: true })

      // Get processed audio file
      const audioFile = await voiceProcessor.current.getProcessedAudioFile(compressionEnabled)
      setAudioFileSize(audioFile.size)
      
      console.log(`Processing audio file: ${audioFile.name}, size: ${formatFileSize(audioFile.size)}`)

      updateRecordingState({ isTranscribing: true })

      // Upload with progress tracking
      const response = await voiceProcessor.current.uploadAudio(
        uploadEndpoint,
        {
          // Add restaurant context if available
          context: JSON.stringify({
            name: 'Demo Restaurant',
            cuisine: 'Modern American',
            location: 'Downtown',
            brandVoice: 'Friendly and passionate about food'
          }),
          platforms: JSON.stringify(['instagram', 'tiktok', 'facebook', 'twitter']),
          config: JSON.stringify({
            contentType: 'dish_description',
            mood: 'excited',
            includeHashtags: true,
            includeEmojis: true
          })
        },
        (progress) => {
          setUploadProgress(progress)
          console.log(`Upload progress: ${progress.toFixed(1)}%`)
        },
        compressionEnabled
      )

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      
      if (result.success && result.data) {
        console.log('Processing complete:', result.data)
        onTranscriptionComplete?.(result.data)
      } else {
        throw new Error(result.error?.message || 'Processing failed')
      }

    } catch (error) {
      const voiceError: VoiceError = {
        type: 'network',
        message: error instanceof Error ? error.message : 'Processing failed',
        recoverable: true
      }
      handleErrorOccurred({ error: voiceError, context: 'processing' })
    } finally {
      updateRecordingState({ 
        isProcessing: false, 
        isTranscribing: false 
      })
      setUploadProgress(0)
    }
  }, [compressionEnabled, onTranscriptionComplete, uploadEndpoint, handleErrorOccurred, updateRecordingState])


  const handleRecordingStarted = useCallback((data: VoiceProcessingEvents['recording_started']) => {
    console.log('Recording started:', data)
    
    const startTime = data.timestamp
    setRecordingStartTime(startTime)
    
    // Start duration tracking with high precision
    durationInterval.current = setInterval(() => {
      const duration = (Date.now() - startTime) / 1000
      updateRecordingState({ duration })
    }, 100)

    // Start visual feedback with smooth animation
    const updateWaveform = () => {
      if (voiceProcessor.current && voiceProcessor.current.isRecording()) {
        const quality = voiceProcessor.current.getQuality()
        updateRecordingState({ audioQuality: quality })
        
        // Generate dynamic waveform data based on actual audio levels
        const volumeLevel = quality.volume / 100
        const noiseLevel = quality.noiseLevel / 100
        
        const newWaveform = Array.from({ length: 20 }, (_, i) => {
          // Create more realistic waveform patterns
          const baseHeight = Math.sin((Date.now() / 100 + i) * 0.1) * 0.1 + 0.1
          const volumeComponent = volumeLevel * 0.7 * Math.sin((Date.now() / 50 + i) * 0.2)
          const randomComponent = (Math.random() - 0.5) * 0.2 * volumeLevel
          
          return Math.max(0.05, Math.min(1, baseHeight + volumeComponent + randomComponent))
        })
        
        setWaveformData(newWaveform)
        animationFrame.current = requestAnimationFrame(updateWaveform)
      }
    }
    
    updateWaveform()
  }, [updateRecordingState])

  const handleRecordingStopped = useCallback(async (data: VoiceProcessingEvents['recording_stopped']) => {
    console.log('Recording stopped:', data)
    
    cleanup()
    
    // Reset waveform with fade out animation
    const fadeOut = () => {
      setWaveformData(prev => prev.map(val => Math.max(0, val * 0.8)))
      if (Math.max(...waveformData) > 0.1) {
        setTimeout(fadeOut, 50)
      } else {
        setWaveformData(new Array(20).fill(0))
      }
    }
    fadeOut()

    updateRecordingState({
      isRecording: false,
      duration: data.duration
    })

    // Process audio if auto-submit is enabled
    if (autoSubmit) {
      await processRecording()
    }
  }, [autoSubmit, cleanup, processRecording, updateRecordingState, waveformData])

  const handleQualityWarning = useCallback((data: VoiceProcessingEvents['quality_warning']) => {
    console.warn('Quality warning:', data.warning)
    updateRecordingState({ audioQuality: data.quality })
    
    // Show visual warning feedback
    setTimeout(() => {
      updateRecordingState({ audioQuality: data.quality })
    }, 2000) // Clear warning after 2 seconds
  }, [updateRecordingState])

  // Initialize voice processor
  useEffect(() => {
    voiceProcessor.current = new VoiceProcessor({
      maxDuration,
      minDuration: 1,
      qualityThreshold: 60,
      autoStop: true,
      noiseReduction: true,
      echoCancellation: true,
      sampleRate: 16000, // Optimized for Whisper
      channelCount: 1
    })

    // Set up event listeners
    const processor = voiceProcessor.current

    processor.on('recording_started', handleRecordingStarted)
    processor.on('recording_stopped', handleRecordingStopped)
    processor.on('quality_warning', handleQualityWarning)
    processor.on('error_occurred', handleErrorOccurred)

    return () => {
      processor.cleanup()
      cleanup()
    }
  }, [maxDuration, cleanup, handleErrorOccurred, handleQualityWarning, handleRecordingStarted, handleRecordingStopped])


  // Main recording control
  const toggleRecording = async () => {
    if (!voiceProcessor.current || disabled) return

    try {
      if (recordingState.isRecording) {
        // Stop recording
        await voiceProcessor.current.stop()
      } else {
        // Reset state before starting
        setUploadProgress(0)
        setAudioFileSize(0)
        updateRecordingState({ 
          isRecording: true, 
          error: undefined,
          duration: 0,
          isProcessing: false,
          isTranscribing: false
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

  // Manual processing trigger
  const processManually = async () => {
    if (!recordingState.isRecording && !recordingState.isProcessing) {
      await processRecording()
    }
  }

  // UI Helper functions
  const getButtonIcon = () => {
    if (recordingState.isProcessing || recordingState.isTranscribing) return '⏳'
    if (recordingState.isRecording) return '⏹️'
    return '🎤'
  }

  const getButtonText = () => {
    if (recordingState.isTranscribing) return 'Transcribing...'
    if (recordingState.isProcessing) return 'Processing...'
    if (recordingState.isRecording) return 'Stop Recording'
    return 'Start Recording'
  }

  const getButtonColor = () => {
    if (recordingState.error) return 'bg-red-500 hover:bg-red-600'
    if (recordingState.isProcessing || recordingState.isTranscribing) return 'bg-yellow-500'
    if (recordingState.isRecording) return 'bg-red-500 hover:bg-red-600 animate-pulse'
    return 'bg-orange-500 hover:bg-orange-600'
  }

  const getQualityColor = (level: AudioQuality['level']) => {
    switch (level) {
      case 'excellent': return 'text-green-400'
      case 'good': return 'text-yellow-400'
      case 'poor': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  // Check if browser supports voice recording
  if (!voiceSupport.supported) {
    return (
      <div className={`voice-recorder-error ${className}`}>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <h3 className="font-bold">Voice Recording Not Available</h3>
          <ul className="mt-2 list-disc list-inside">
            {voiceSupport.missing.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
          {voiceSupport.warnings.length > 0 && (
            <div className="mt-2">
              <h4 className="font-semibold">Warnings:</h4>
              <ul className="list-disc list-inside">
                {voiceSupport.warnings.map((warning, index) => (
                  <li key={index} className="text-yellow-600">{warning}</li>
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
      {/* Main Recording Interface */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
        
        {/* Recording Status Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className={`w-3 h-3 rounded-full ${
              recordingState.isRecording ? 'bg-red-500 animate-pulse' : 
              recordingState.isProcessing ? 'bg-yellow-500 animate-spin' : 'bg-gray-400'
            }`}></div>
            <h3 className="text-xl font-semibold text-white">
              {recordingState.isRecording ? 'Recording...' : 
               recordingState.isProcessing ? 'Processing...' : 
               recordingState.isTranscribing ? 'Transcribing...' : 'Ready to Record'}
            </h3>
          </div>
          
          {/* Duration Display */}
          <div className="text-2xl font-mono text-white/80">
            {formatDuration(recordingState.duration)} / {formatDuration(maxDuration)}
          </div>
          
          {/* Audio File Info */}
          {audioFileSize > 0 && (
            <div className="text-sm text-white/60 mt-1">
              File size: {formatFileSize(audioFileSize)}
            </div>
          )}
        </div>

        {/* Waveform Visualization */}
        <div className="mb-6">
          <div className="flex items-end justify-center gap-1 h-20 px-4">
            {waveformData.map((height, index) => (
              <div
                key={index}
                className={`bg-gradient-to-t from-orange-500 to-orange-300 rounded-full transition-all duration-100 ${
                  recordingState.isRecording ? 'opacity-100' : 'opacity-50'
                }`}
                style={{
                  height: `${Math.max(8, height * 80)}px`,
                  width: '4px',
                  transform: recordingState.isRecording ? `scaleY(${0.8 + height * 0.4})` : 'scaleY(1)'
                }}
              />
            ))}
          </div>
        </div>

        {/* Audio Quality Indicator */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-white/80 text-sm">Audio Quality</span>
            <span className={`text-sm font-medium capitalize ${getQualityColor(recordingState.audioQuality.level)}`}>
              {recordingState.audioQuality.level}
            </span>
          </div>
          
          {/* Quality Metrics */}
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <div className="text-white/60">Volume</div>
              <div className="text-white font-mono">{recordingState.audioQuality.volume.toFixed(0)}%</div>
              <div className="w-full bg-gray-700 rounded-full h-1">
                <div 
                  className="bg-blue-500 h-1 rounded-full transition-all"
                  style={{ width: `${recordingState.audioQuality.volume}%` }}
                />
              </div>
            </div>
            <div>
              <div className="text-white/60">Noise</div>
              <div className="text-white font-mono">{recordingState.audioQuality.noiseLevel.toFixed(0)}%</div>
              <div className="w-full bg-gray-700 rounded-full h-1">
                <div 
                  className="bg-yellow-500 h-1 rounded-full transition-all"
                  style={{ width: `${recordingState.audioQuality.noiseLevel}%` }}
                />
              </div>
            </div>
            <div>
              <div className="text-white/60">Clarity</div>
              <div className="text-white font-mono">{recordingState.audioQuality.clarity.toFixed(0)}%</div>
              <div className="w-full bg-gray-700 rounded-full h-1">
                <div 
                  className="bg-green-500 h-1 rounded-full transition-all"
                  style={{ width: `${recordingState.audioQuality.clarity}%` }}
                />
              </div>
            </div>
          </div>
          
          {/* Quality Warnings */}
          {recordingState.audioQuality.warnings.length > 0 && (
            <div className="mt-2 p-2 bg-yellow-500/20 rounded-lg">
              <div className="text-yellow-200 text-xs">
                ⚠️ {recordingState.audioQuality.warnings[0]}
              </div>
            </div>
          )}
        </div>

        {/* Upload Progress */}
        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="mb-6">
            <div className="flex justify-between text-white/80 text-sm mb-2">
              <span>Uploading...</span>
              <span>{uploadProgress.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-orange-500 to-orange-400 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex justify-center gap-4">
          {/* Main Record/Stop Button */}
          <button
            onClick={toggleRecording}
            disabled={disabled || recordingState.isProcessing || recordingState.isTranscribing}
            className={`${getButtonColor()} text-white px-8 py-4 rounded-xl font-semibold 
                       text-lg shadow-lg transform transition-all duration-200 
                       hover:scale-105 active:scale-95 disabled:opacity-50 
                       disabled:cursor-not-allowed disabled:transform-none
                       flex items-center gap-3`}
          >
            <span className="text-2xl">{getButtonIcon()}</span>
            {getButtonText()}
          </button>

          {/* Manual Process Button */}
          {!autoSubmit && !recordingState.isRecording && recordingState.duration > 0 && (
            <button
              onClick={processManually}
              disabled={recordingState.isProcessing || recordingState.isTranscribing}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-4 rounded-xl 
                        font-semibold shadow-lg transform transition-all duration-200 
                        hover:scale-105 active:scale-95 disabled:opacity-50 
                        disabled:cursor-not-allowed disabled:transform-none"
            >
              Process Audio
            </button>
          )}
        </div>

        {/* Error Display */}
        {recordingState.error && (
          <div className="mt-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
            <div className="text-red-200">
              <div className="font-semibold">Error: {recordingState.error.type}</div>
              <div className="text-sm mt-1">{recordingState.error.message}</div>
              {recordingState.error.recoverable && (
                <button
                  onClick={() => updateRecordingState({ error: undefined })}
                  className="mt-2 text-xs bg-red-500 hover:bg-red-600 px-3 py-1 rounded"
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>
        )}

        {/* Recording Tips */}
        <div className="mt-6 text-center">
          <div className="text-white/60 text-sm">
            💡 For best results: Speak clearly, minimize background noise, and stay close to your microphone
          </div>
          {compressionEnabled && (
            <div className="text-white/40 text-xs mt-1">
              Audio compression enabled for faster uploads
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 