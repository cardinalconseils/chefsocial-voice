import { 
  VoiceRecorderConfig, 
  AudioProcessor, 
  AudioChunk, 
  AudioQuality, 
  VoiceError,
  VoiceProcessingEvents 
} from '../types/voice'

/**
 * Audio Compression Utility
 * Compresses audio for efficient upload
 */
export class AudioCompressor {
  static async compressAudio(audioBlob: Blob, quality = 0.7): Promise<Blob> {
    // Convert to audio context for processing
    const arrayBuffer = await audioBlob.arrayBuffer()
    const audioContext = new AudioContext()
    
    try {
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      
      // Create offline context for processing
      const offlineContext = new OfflineAudioContext(
        1, // mono channel for smaller size
        audioBuffer.length,
        16000 // 16kHz for Whisper compatibility
      )
      
      // Create buffer source
      const source = offlineContext.createBufferSource()
      source.buffer = audioBuffer
      
      // Apply compression/gain
      const compressor = offlineContext.createDynamicsCompressor()
      compressor.threshold.value = -24
      compressor.knee.value = 30
      compressor.ratio.value = 12
      compressor.attack.value = 0.003
      compressor.release.value = 0.25
      
      // Connect nodes
      source.connect(compressor)
      compressor.connect(offlineContext.destination)
      
      // Start processing
      source.start()
      const processedBuffer = await offlineContext.startRendering()
      
      // Convert back to blob
      const compressedBlob = await this.audioBufferToBlob(processedBuffer, quality)
      
      console.log(`Audio compressed: ${audioBlob.size} → ${compressedBlob.size} bytes`)
      return compressedBlob
      
    } finally {
      audioContext.close()
    }
  }
  
  private static async audioBufferToBlob(buffer: AudioBuffer, quality: number): Promise<Blob> {
    const numberOfChannels = buffer.numberOfChannels
    const length = buffer.length * numberOfChannels * 2
    const arrayBuffer = new ArrayBuffer(length)
    const view = new DataView(arrayBuffer)
    
    // Convert float32 to int16
    let offset = 0
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]))
        view.setInt16(offset, sample * 0x7FFF, true)
        offset += 2
      }
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' })
  }
}

/**
 * Audio Upload Utility
 * Handles audio file upload with progress tracking
 */
export class AudioUploader {
  static async uploadAudio(
    audioFile: File,
    endpoint: string,
    additionalData: Record<string, any> = {},
    onProgress?: (progress: number) => void
  ): Promise<Response> {
    const formData = new FormData()
    formData.append('audio', audioFile)
    
    // Add additional data
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, typeof value === 'string' ? value : JSON.stringify(value))
    })
    
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100
          onProgress?.(progress)
        }
      })
      
      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(new Response(xhr.response, {
            status: xhr.status,
            statusText: xhr.statusText
          }))
        } else {
          reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`))
        }
      })
      
      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed: Network error'))
      })
      
      xhr.addEventListener('timeout', () => {
        reject(new Error('Upload failed: Timeout'))
      })
      
      // Configure request
      xhr.open('POST', endpoint)
      xhr.timeout = 30000 // 30 second timeout
      
      // Send request
      xhr.send(formData)
    })
  }
}

/**
 * Enhanced Voice Processing Class
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
  private qualityMonitorInterval: NodeJS.Timeout | null = null

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
   * Start recording audio with enhanced format support
   */
  async start(): Promise<void> {
    try {
      // Get user media with high quality settings
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: this.config.echoCancellation,
          noiseSuppression: this.config.noiseReduction,
          sampleRate: this.config.sampleRate,
          channelCount: this.config.channelCount,
          autoGainControl: true
        }
      })

      // Set up audio analysis
      this.setupAudioAnalysis()

      // Create MediaRecorder with optimal settings
      const mimeType = this.getBestSupportedMimeType()
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

      // Start quality monitoring
      this.startQualityMonitoring()

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
   * Stop recording and return processed audio file
   */
  async stop(): Promise<AudioChunk[]> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isActive) {
        resolve(this.audioChunks)
        return
      }

      this.mediaRecorder.addEventListener('stop', async () => {
        const duration = (Date.now() - this.startTime) / 1000
        const quality = this.getCurrentQuality()

        // Stop quality monitoring
        if (this.qualityMonitorInterval) {
          clearInterval(this.qualityMonitorInterval)
          this.qualityMonitorInterval = null
        }

        this.emit('recording_stopped', { duration, quality })

        // Check minimum duration
        if (duration < this.config.minDuration) {
          const error: VoiceError = {
            type: 'quality',
            message: `Recording too short: ${duration.toFixed(1)}s (minimum: ${this.config.minDuration}s)`,
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
   * Get processed audio file ready for upload
   */
  async getProcessedAudioFile(compress = true): Promise<File> {
    const audioBlob = await chunksToAudioFile(this.audioChunks)
    
    if (compress && audioBlob.size > 1024 * 1024) { // Compress files > 1MB
      const compressedBlob = await AudioCompressor.compressAudio(audioBlob)
      return new File([compressedBlob], 'recording.wav', { type: 'audio/wav' })
    }
    
    return new File([audioBlob], 'recording.webm', { type: audioBlob.type })
  }

  /**
   * Upload recorded audio with progress tracking
   */
  async uploadAudio(
    endpoint: string,
    additionalData: Record<string, any> = {},
    onProgress?: (progress: number) => void,
    compress = true
  ): Promise<Response> {
    const audioFile = await this.getProcessedAudioFile(compress)
    
         // Validate file size
     const maxSize = 25 * 1024 * 1024 // 25MB
     if (audioFile.size > maxSize) {
       const error: VoiceError = {
         type: 'processing',
         message: `Audio file too large: ${(audioFile.size / 1024 / 1024).toFixed(1)}MB (max: 25MB)`,
         recoverable: false
       }
       throw error
     }
    
    return AudioUploader.uploadAudio(audioFile, endpoint, additionalData, onProgress)
  }

  /**
   * Pause recording
   */
  pause(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause()
      if (this.qualityMonitorInterval) {
        clearInterval(this.qualityMonitorInterval)
        this.qualityMonitorInterval = null
      }
    }
  }

  /**
   * Resume recording
   */
  resume(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume()
      this.startQualityMonitoring()
    }
  }

  /**
   * Get current audio quality metrics
   */
  getQuality(): AudioQuality {
    return this.getCurrentQuality()
  }

  /**
   * Get recording duration in seconds
   */
  getDuration(): number {
    return this.isActive ? (Date.now() - this.startTime) / 1000 : 0
  }

  /**
   * Check if recording is active
   */
  isRecording(): boolean {
    return this.isActive
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.qualityMonitorInterval) {
      clearInterval(this.qualityMonitorInterval)
      this.qualityMonitorInterval = null
    }
    
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

  // Private methods

  /**
   * Emit event to listeners
   */
  private emit<K extends keyof VoiceProcessingEvents>(
    event: K, 
    data: VoiceProcessingEvents[K]
  ): void {
    const callbacks = this.eventCallbacks.get(event)
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`Error in ${event} callback:`, error)
        }
      })
    }
  }

  /**
   * Set up audio analysis for quality monitoring
   */
  private setupAudioAnalysis(): void {
    if (!this.audioStream) return

    this.audioContext = new AudioContext()
    const source = this.audioContext.createMediaStreamSource(this.audioStream)
    this.analyser = this.audioContext.createAnalyser()
    
    this.analyser.fftSize = 256
    this.analyser.smoothingTimeConstant = 0.8
    
    source.connect(this.analyser)
  }

  /**
   * Start real-time quality monitoring
   */
  private startQualityMonitoring(): void {
    if (this.qualityMonitorInterval) return

    this.qualityMonitorInterval = setInterval(() => {
      const quality = this.getCurrentQuality()
      
      // Check for quality warnings
      if (quality.level === 'poor' && quality.warnings.length > 0) {
        this.emit('quality_warning', { warning: quality.warnings[0], quality })
      }
    }, 500) // Check every 500ms
  }

  /**
   * Calculate current audio quality metrics
   */
  private getCurrentQuality(): AudioQuality {
    if (!this.analyser) {
      return {
        level: 'good',
        volume: 0,
        noiseLevel: 0,
        clarity: 75,
        warnings: []
      }
    }

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount)
    this.analyser.getByteFrequencyData(dataArray)

    // Calculate volume (RMS)
    const rms = Math.sqrt(dataArray.reduce((sum, value) => sum + value * value, 0) / dataArray.length)
    const volume = Math.min(100, (rms / 255) * 100)

    // Estimate noise level (low frequency content)
    const lowFreqSum = dataArray.slice(0, 10).reduce((sum, value) => sum + value, 0)
    const noiseLevel = Math.min(100, (lowFreqSum / (10 * 255)) * 100)

    // Calculate clarity (frequency distribution)
    const midFreqSum = dataArray.slice(10, 50).reduce((sum, value) => sum + value, 0)
    const highFreqSum = dataArray.slice(50, 100).reduce((sum, value) => sum + value, 0)
    const clarity = Math.min(100, ((midFreqSum + highFreqSum) / (90 * 255)) * 100)

    // Generate warnings
    const warnings: string[] = []
    if (volume < 10) warnings.push('Microphone level too low')
    if (volume > 90) warnings.push('Audio may be clipping')
    if (noiseLevel > 30) warnings.push('High background noise detected')
    if (clarity < 40) warnings.push('Poor audio clarity')

    // Determine overall quality level
    let level: AudioQuality['level'] = 'excellent'
    if (volume < 15 || noiseLevel > 40 || clarity < 50) level = 'poor'
    else if (volume < 25 || noiseLevel > 25 || clarity < 70) level = 'good'

    return { level, volume, noiseLevel, clarity, warnings }
  }

  /**
   * Set up MediaRecorder event handlers
   */
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
      this.emit('error_occurred', { error, context: 'media_recorder' })
    })
  }

  /**
   * Get the best supported MIME type for recording
   */
  private getBestSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4;codecs=mp4a.40.2',
      'audio/mp4',
      'audio/wav',
      'audio/ogg;codecs=opus',
      'audio/ogg'
    ]

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log(`Using MIME type: ${type}`)
        return type
      }
    }

    throw new Error('No supported audio MIME type found')
  }
}

/**
 * Convert audio chunks to a single audio file
 */
export async function chunksToAudioFile(chunks: AudioChunk[]): Promise<Blob> {
  if (chunks.length === 0) {
    throw new Error('No audio chunks available')
  }

  const blobs = chunks.map(chunk => chunk.data)
  const audioBlob = new Blob(blobs, { type: chunks[0].data.type })
  
  return audioBlob
}

/**
 * Check browser voice recording support
 */
export function checkVoiceSupport(): {
  supported: boolean
  missing: string[]
  warnings: string[]
} {
  const missing: string[] = []
  const warnings: string[] = []

     // Check for required APIs
   if (!navigator.mediaDevices) missing.push('MediaDevices API')
   if (!navigator.mediaDevices?.getUserMedia) missing.push('getUserMedia')
   if (!window.MediaRecorder) missing.push('MediaRecorder API')
   if (!window.AudioContext && !(window as any).webkitAudioContext) missing.push('Web Audio API')

  // Check for modern features
  if (!MediaRecorder.isTypeSupported('audio/webm')) {
    warnings.push('WebM audio not supported - will use fallback format')
  }

  // Check for HTTPS (required for getUserMedia)
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
    warnings.push('HTTPS required for microphone access in production')
  }

  return {
    supported: missing.length === 0,
    missing,
    warnings
  }
}

/**
 * Validate uploaded audio file
 */
export function validateAudioFile(file: File): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  const maxSize = 25 * 1024 * 1024 // 25MB
  const maxDuration = 300 // 5 minutes
  
  // Check file type
  const supportedTypes = [
    'audio/webm',
    'audio/mp4',
    'audio/wav',
    'audio/ogg',
    'audio/mpeg',
    'audio/mp3'
  ]
  
  if (!supportedTypes.includes(file.type)) {
    errors.push(`Unsupported audio format: ${file.type}`)
  }

  // Check file size
  if (file.size > maxSize) {
    errors.push(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max: 25MB)`)
  }

  if (file.size < 1024) {
    errors.push('File too small: May be corrupted')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Format duration for display
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
} 