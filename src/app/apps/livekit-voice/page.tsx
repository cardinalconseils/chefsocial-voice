'use client'

/**
 * LiveKit Voice & Telephony Testing Interface
 * Comprehensive testing suite for voice processing capabilities
 */

import { useState, useEffect } from 'react'
import { LiveKitVoiceProcessor, testLiveKitConnection } from '@/lib/livekit-client'

interface TestResult {
  success: boolean
  message: string
  duration?: number
  error?: string
}

interface TestSuite {
  environment: TestResult | null
  connection: TestResult | null
  audioPermissions: TestResult | null
  voiceRecording: TestResult | null
  telephonyConfig: TestResult | null
  apiEndpoints: TestResult | null
}

export default function LiveKitVoiceTestPage() {
  const [testResults, setTestResults] = useState<TestSuite>({
    environment: null,
    connection: null,
    audioPermissions: null,
    voiceRecording: null,
    telephonyConfig: null,
    apiEndpoints: null
  })

  const [isRunningTests, setIsRunningTests] = useState(false)
  const [voiceProcessor, setVoiceProcessor] = useState<LiveKitVoiceProcessor | null>(null)
  const [manualTests, setManualTests] = useState({
    voiceSession: false,
    outboundCall: false,
    phoneNumber: '+1234567890'
  })

  // Automated Tests
  const runEnvironmentTest = async (): Promise<TestResult> => {
    const startTime = Date.now()
    
    try {
      const hasWebRTC = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
      const hasWebAudio = !!(window.AudioContext || (window as any).webkitAudioContext)
      const hasWebSocket = !!window.WebSocket
      
      if (!hasWebRTC) {
        throw new Error('WebRTC not supported')
      }
      
      if (!hasWebAudio) {
        throw new Error('Web Audio API not supported')
      }
      
      if (!hasWebSocket) {
        throw new Error('WebSocket not supported')
      }

      return {
        success: true,
        message: 'Browser environment supports all required APIs',
        duration: Date.now() - startTime
      }
    } catch (error) {
      return {
        success: false,
        message: 'Browser environment check failed',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  const runConnectionTest = async (): Promise<TestResult> => {
    const startTime = Date.now()
    
    try {
      const result = await testLiveKitConnection()
      
      return {
        success: result.success,
        message: result.success 
          ? 'LiveKit connection successful' 
          : `Connection failed: ${result.error}`,
        duration: Date.now() - startTime,
        error: result.error
      }
    } catch (error) {
      return {
        success: false,
        message: 'LiveKit connection test failed',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  const runAudioPermissionsTest = async (): Promise<TestResult> => {
    const startTime = Date.now()
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => track.stop())
      
      return {
        success: true,
        message: 'Audio permissions granted successfully',
        duration: Date.now() - startTime
      }
    } catch (error) {
      return {
        success: false,
        message: 'Audio permissions denied or unavailable',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Permission denied'
      }
    }
  }

  const runVoiceRecordingTest = async (): Promise<TestResult> => {
    const startTime = Date.now()
    
    try {
      const processor = new LiveKitVoiceProcessor({
        serverUrl: 'wss://chefsocial.livekit.cloud',
        roomName: 'test-room',
        participantName: 'test-user'
      })

      await processor.initialize()
      await processor.startRecording()
      
      // Record for 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const audioData = await processor.stopRecording()
      await processor.disconnect()
      
      return {
        success: !!audioData,
        message: audioData ? 'Voice recording test successful' : 'No audio data captured',
        duration: Date.now() - startTime
      }
    } catch (error) {
      return {
        success: false,
        message: 'Voice recording test failed',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Recording failed'
      }
    }
  }

  const runTelephonyConfigTest = async (): Promise<TestResult> => {
    const startTime = Date.now()
    
    try {
      const response = await fetch('/api/telephony/call')
      const config = await response.json()
      
      return {
        success: response.ok && config.configured,
        message: config.configured 
          ? 'Telephony configuration valid' 
          : 'Telephony not configured',
        duration: Date.now() - startTime,
        error: !response.ok ? `HTTP ${response.status}` : undefined
      }
    } catch (error) {
      return {
        success: false,
        message: 'Telephony configuration test failed',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Config check failed'
      }
    }
  }

  const runApiEndpointsTest = async (): Promise<TestResult> => {
    const startTime = Date.now()
    
    try {
      const endpoints = [
        '/api/livekit/token',
        '/api/voice/process',
        '/api/telephony/call'
      ]
      
      const results = await Promise.all(
        endpoints.map(async (endpoint) => {
          try {
            const response = await fetch(endpoint)
            return { endpoint, status: response.status, ok: response.ok }
          } catch (error) {
            return { endpoint, status: 0, ok: false, error: error instanceof Error ? error.message : 'Unknown' }
          }
        })
      )
      
      const failedEndpoints = results.filter(r => !r.ok)
      
      return {
        success: failedEndpoints.length === 0,
        message: failedEndpoints.length === 0 
          ? 'All API endpoints responding' 
          : `${failedEndpoints.length} endpoints failed: ${failedEndpoints.map(f => f.endpoint).join(', ')}`,
        duration: Date.now() - startTime,
        error: failedEndpoints.length > 0 ? JSON.stringify(failedEndpoints) : undefined
      }
    } catch (error) {
      return {
        success: false,
        message: 'API endpoints test failed',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Endpoints unreachable'
      }
    }
  }

  // Run all automated tests
  const runAllTests = async () => {
    setIsRunningTests(true)
    
    const tests = [
      { name: 'environment', test: runEnvironmentTest },
      { name: 'connection', test: runConnectionTest },
      { name: 'audioPermissions', test: runAudioPermissionsTest },
      { name: 'voiceRecording', test: runVoiceRecordingTest },
      { name: 'telephonyConfig', test: runTelephonyConfigTest },
      { name: 'apiEndpoints', test: runApiEndpointsTest }
    ]

    for (const { name, test } of tests) {
      const result = await test()
      setTestResults(prev => ({ ...prev, [name]: result }))
    }
    
    setIsRunningTests(false)
  }

  // Manual test functions
  const startVoiceSession = async () => {
    try {
      const processor = new LiveKitVoiceProcessor({
        serverUrl: 'wss://chefsocial.livekit.cloud',
        roomName: `test-${Date.now()}`,
        participantName: 'manual-tester'
      })

      const session = await processor.initialize()
      setVoiceProcessor(processor)
      setManualTests(prev => ({ ...prev, voiceSession: true }))
      
      console.log('Voice session started:', session)
    } catch (error) {
      console.error('Failed to start voice session:', error)
      alert(`Voice session failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const stopVoiceSession = async () => {
    if (voiceProcessor) {
      await voiceProcessor.disconnect()
      setVoiceProcessor(null)
      setManualTests(prev => ({ ...prev, voiceSession: false }))
    }
  }

  const testOutboundCall = async () => {
    try {
      const response = await fetch('/api/telephony/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: manualTests.phoneNumber,
          action: 'test_call'
        })
      })

      const result = await response.json()
      
      if (response.ok) {
        setManualTests(prev => ({ ...prev, outboundCall: true }))
        alert(`Test call initiated: ${result.message}`)
      } else {
        alert(`Call failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Outbound call test failed:', error)
      alert(`Call test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const getStatusIcon = (result: TestResult | null): string => {
    if (!result) return '⏳'
    return result.success ? '✅' : '❌'
  }

  const getStatusColor = (result: TestResult | null): string => {
    if (!result) return 'text-yellow-600'
    return result.success ? 'text-green-600' : 'text-red-600'
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          LiveKit Voice & Telephony Testing
        </h1>
        <p className="text-gray-600 mb-6">
          Comprehensive testing interface for ChefSocial voice processing capabilities
        </p>

        {/* Automated Tests Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-gray-700">Automated Tests</h2>
            <button
              onClick={runAllTests}
              disabled={isRunningTests}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition-colors"
            >
              {isRunningTests ? 'Running Tests...' : 'Run All Tests'}
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(testResults).map(([testName, result]) => (
              <div key={testName} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium capitalize">
                    {testName.replace(/([A-Z])/g, ' $1').trim()}
                  </h3>
                  <span className="text-2xl">{getStatusIcon(result)}</span>
                </div>
                
                {result && (
                  <div className={`text-sm ${getStatusColor(result)}`}>
                    <p className="mb-1">{result.message}</p>
                    {result.duration && (
                      <p className="text-gray-500">Duration: {result.duration}ms</p>
                    )}
                    {result.error && (
                      <p className="text-red-500 text-xs mt-1">Error: {result.error}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Manual Tests Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Manual Tests</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Voice Session Test */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-3">Voice Session Test</h3>
              <p className="text-sm text-gray-600 mb-3">
                Test real-time voice session with LiveKit
              </p>
              
              {!manualTests.voiceSession ? (
                <button
                  onClick={startVoiceSession}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition-colors"
                >
                  Start Voice Session
                </button>
              ) : (
                <div>
                  <p className="text-green-600 mb-2">✅ Voice session active</p>
                  <button
                    onClick={stopVoiceSession}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
                  >
                    Stop Session
                  </button>
                </div>
              )}
            </div>

            {/* Outbound Call Test */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-3">Outbound Call Test</h3>
              <p className="text-sm text-gray-600 mb-3">
                Test telephony integration with outbound calls
              </p>
              
              <div className="space-y-3">
                <input
                  type="tel"
                  value={manualTests.phoneNumber}
                  onChange={(e) => setManualTests(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  placeholder="Phone number (+1234567890)"
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                
                <button
                  onClick={testOutboundCall}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded transition-colors"
                >
                  Test Call
                </button>
                
                {manualTests.outboundCall && (
                  <p className="text-green-600 text-sm">✅ Test call completed</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Status Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium mb-2">System Status</h3>
          <div className="text-sm text-gray-600">
            <p>🎤 Voice Processing: {testResults.voiceRecording?.success ? 'Ready' : 'Not Ready'}</p>
            <p>📞 Telephony: {testResults.telephonyConfig?.success ? 'Configured' : 'Not Configured'}</p>
            <p>🔗 API Endpoints: {testResults.apiEndpoints?.success ? 'Operational' : 'Issues Detected'}</p>
            <p>🌐 LiveKit Connection: {testResults.connection?.success ? 'Connected' : 'Disconnected'}</p>
          </div>
        </div>
      </div>
    </div>
  )
} 
