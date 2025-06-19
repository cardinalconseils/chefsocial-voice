import { 
  VoiceRecorderConfig, 
  AudioProcessor, 
  AudioChunk, 
  AudioQuality, 
  VoiceError,
  VoiceProcessingEvents 
} from '../types/voice'

/**
 * Core Voice Processing Class
 * Handles WebRTC audio capture, quality monitoring, and chunked processing
 */
export class VoiceProcessor implements AudioProcessor {
  private mediaRecorder: MediaRecorder | null = null
  private audioStream: MediaStream | null = null
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private audioChunks: AudioChunk[] = []
  private isActive = false
  private startTime = 0
  private config: VoiceRecorderConfig
  private eventCallbacks: Map<keyof VoiceProcessingEvents, Function[]> = new Map()

  constructor(config: Partial<VoiceRecorderConfig> = {}) {
    this.config = {
      maxDuration: 300,
      minDuration: 1,
      qualityThreshold: 60,
      autoStop: true,
      noiseReduction: true,
      echoCancellation: true,
      sampleRate: 48000,
      channelCount: 1,
      ...config
    }
  }

  /**
   * Start recording audio
   */
  async start(): Promise<void> {
    try {
      // Get user media with high quality settings
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: this.config.echoCancellation,
          noiseSuppression: this.config.noiseReduction,
          sampleRate: this.config.sampleRate,
          channelCount: this.config.channelCount
        }
      })

      // Set up audio analysis
      this.setupAudioAnalysis()

      // Create MediaRecorder with optimal settings
      const mimeType = this.getSupportedMimeType()
      this.mediaRecorder = new MediaRecorder(this.audioStream, {
        mimeType,
        audioBitsPerSecond: 128000
      })

      // Set up event handlers
      this.setupRecorderEvents()

      // Start recording
      this.startTime = Date.now()
      this.isActive = true
      this.audioChunks = []

      this.mediaRecorder.start(1000) // Collect data every second

      // Emit recording started event
      this.emit('recording_started', { 
        timestamp: this.startTime,
        config: this.config 
      })

      // Auto-stop after max duration
      if (this.config.autoStop) {
        setTimeout(() => {
          if (this.isActive) {
            this.stop()
          }
        }, this.config.maxDuration * 1000)
      }

    } catch (error) {
      const voiceError: VoiceError = {
        type: 'permission',
        message: `Failed to start recording: ${error instanceof Error ? error.message : 'Unknown error'}`,
        recoverable: true
      }
      this.emit('error_occurred', { error: voiceError, context: 'start_recording' })
      throw voiceError
    }
  }

  /**
   * Stop recording and return audio chunks
   */
  async stop(): Promise<AudioChunk[]> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isActive) {
        resolve(this.audioChunks)
        return
      }

      this.mediaRecorder.addEventListener('stop', () => {
        const duration = (Date.now() - this.startTime) / 1000
        const quality = this.getCurrentQuality()

        this.emit('recording_stopped', { duration, quality })

        // Check minimum duration
        if (duration < this.config.minDuration) {
          const error: VoiceError = {
            type: 'quality',
            message: `Recording too short: ${duration}s (minimum: ${this.config.minDuration}s)`,
            recoverable: true
          }
          this.emit('error_occurred', { error, context: 'duration_check' })
          reject(error)
          return
        }

        this.cleanup()
        resolve(this.audioChunks)
      })

      this.mediaRecorder.stop()
      this.isActive = false
    })
  }

  /**
   * Pause recording
   */
  pause(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause()
    }
  }

  /**
   * Resume recording
   */
  resume(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume()
    }
  }

  /**
   * Get current audio quality metrics
   */
  getQuality(): AudioQuality {
    return this.getCurrentQuality()
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop())
      this.audioStream = null
    }

    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }

    this.mediaRecorder = null
    this.analyser = null
    this.isActive = false
  }

  /**
   * Add event listener
   */
  on<K extends keyof VoiceProcessingEvents>(
    event: K, 
    callback: (data: VoiceProcessingEvents[K]) => void
  ): void {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, [])
    }
    this.eventCallbacks.get(event)!.push(callback)
  }

  /**
   * Remove event listener
   */
  off<K extends keyof VoiceProcessingEvents>(event: K, callback: Function): void {
    const callbacks = this.eventCallbacks.get(event)
    if (callbacks) {
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  /**
   * Emit event to registered listeners
   */
  private emit<K extends keyof VoiceProcessingEvents>(
    event: K, 
    data: VoiceProcessingEvents[K]
  ): void {
    const callbacks = this.eventCallbacks.get(event)
    if (callbacks) {
      callbacks.forEach(callback => callback(data))
    }
  }

  // Private methods

  private setupAudioAnalysis(): void {
    if (!this.audioStream) return

    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const source = this.audioContext.createMediaStreamSource(this.audioStream)
    this.analyser = this.audioContext.createAnalyser()
    
    this.analyser.fftSize = 256
    source.connect(this.analyser)

    // Start quality monitoring
    this.startQualityMonitoring()
  }

  private startQualityMonitoring(): void {
    const monitor = () => {
      if (!this.isActive || !this.analyser) return

      const quality = this.getCurrentQuality()
      
      // Check for quality warnings
      if (quality.level === 'poor' || quality.level === 'unusable') {
        this.emit('quality_warning', { 
          warning: `Audio quality is ${quality.level}: ${quality.warnings.join(', ')}`,
          quality 
        })
      }

      // Continue monitoring
      if (this.isActive) {
        setTimeout(monitor, 500) // Check every 500ms
      }
    }

    monitor()
  }

  private getCurrentQuality(): AudioQuality {
    if (!this.analyser) {
      return {
        level: 'unusable',
        volume: 0,
        noiseLevel: 100,
        clarity: 0,
        warnings: ['No audio analysis available']
      }
    }

    const bufferLength = this.analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    this.analyser.getByteFrequencyData(dataArray)

    // Calculate volume (RMS)
    const rms = Math.sqrt(dataArray.reduce((sum, value) => sum + value * value, 0) / bufferLength)
    const volume = Math.min(100, (rms / 128) * 100)

    // Estimate noise level (low frequency dominance)
    const lowFreqSum = dataArray.slice(0, bufferLength / 4).reduce((sum, val) => sum + val, 0)
    const totalSum = dataArray.reduce((sum, val) => sum + val, 0)
    const noiseLevel = totalSum > 0 ? (lowFreqSum / totalSum) * 100 : 0

    // Calculate clarity (high frequency presence)
    const highFreqSum = dataArray.slice(bufferLength * 3 / 4).reduce((sum, val) => sum + val, 0)
    const clarity = totalSum > 0 ? Math.min(100, (highFreqSum / totalSum) * 200) : 0

    const warnings: string[] = []
    
    if (volume < 10) warnings.push('Volume too low')
    if (volume > 90) warnings.push('Volume too high (clipping possible)')
    if (noiseLevel > 70) warnings.push('High background noise')
    if (clarity < 20) warnings.push('Poor audio clarity')

    let level: AudioQuality['level'] = 'excellent'
    if (warnings.length > 0) level = 'good'
    if (warnings.length > 1) level = 'poor'
    if (volume < 5 || noiseLevel > 80) level = 'unusable'

    return { level, volume, noiseLevel, clarity, warnings }
  }

  private setupRecorderEvents(): void {
    if (!this.mediaRecorder) return

    this.mediaRecorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) {
        const chunk: AudioChunk = {
          data: event.data,
          timestamp: Date.now(),
          quality: this.getCurrentQuality(),
          duration: (Date.now() - this.startTime) / 1000
        }
        this.audioChunks.push(chunk)
      }
    })

    this.mediaRecorder.addEventListener('error', (event) => {
      const error: VoiceError = {
        type: 'processing',
        message: `MediaRecorder error: ${event.error?.message || 'Unknown error'}`,
        recoverable: false
      }
      this.emit('error_occurred', { error, context: 'media_recorder_error' })
    })
  }

  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus'
    ]
    
    return types.find(type => MediaRecorder.isTypeSupported(type)) || 'audio/webm'
  }
}

/**
 * Helper Functions
 */

/**
 * Convert audio chunks to a single audio file
 */
export async function chunksToAudioFile(chunks: AudioChunk[]): Promise<File> {
  const audioBlobs = chunks.map(chunk => chunk.data)
  const combinedBlob = new Blob(audioBlobs, { type: 'audio/webm' })
  return new File([combinedBlob], 'recording.webm', { type: 'audio/webm' })
}

/**
 * Check browser voice support
 */
export function checkVoiceSupport(): {
  supported: boolean
  missing: string[]
  warnings: string[]
} {
  const missing: string[] = []
  const warnings: string[] = []

  // Only check in browser environment
  if (typeof window === 'undefined') {
    missing.push('Browser environment required')
    return { supported: false, missing, warnings }
  }

  // Check for required APIs
  if (!navigator?.mediaDevices) {
    missing.push('MediaDevices API')
  }
  
  if (!navigator?.mediaDevices?.getUserMedia) {
    missing.push('getUserMedia')
  }
  
  if (!window.MediaRecorder) {
    missing.push('MediaRecorder API')
  }
  
  if (!window.AudioContext && !(window as any).webkitAudioContext) {
    missing.push('AudioContext API')
  }

  // Check for HTTPS requirement (browser only)
  if (typeof window !== 'undefined' && typeof location !== 'undefined' && 
      location.protocol !== 'https:' && location.hostname !== 'localhost') {
    warnings.push('HTTPS required for production')
  }

  // Check for codec support
  if (typeof MediaRecorder !== 'undefined' && !MediaRecorder.isTypeSupported('audio/webm')) {
    warnings.push('WebM audio codec not supported')
  }

  return {
    supported: missing.length === 0,
    missing,
    warnings
  }
}

/**
 * Validate audio file before processing
 */
export function validateAudioFile(file: File): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  // Check file type
  const supportedTypes = ['audio/webm', 'audio/mp4', 'audio/wav', 'audio/ogg']
  if (!supportedTypes.some(type => file.type.includes(type.split('/')[1]))) {
    errors.push(`Unsupported file type: ${file.type}`)
  }
  
  // Check file size (max 25MB)
  const maxSize = 25 * 1024 * 1024
  if (file.size > maxSize) {
    errors.push(`File too large: ${Math.round(file.size / 1024 / 1024)}MB (max 25MB)`)
  }
  
  // Check minimum size (at least 1KB)
  if (file.size < 1024) {
    errors.push('File too small - likely empty recording')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
} 