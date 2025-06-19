'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

interface Message {
  id: number
  text: string
  isUser: boolean
  timestamp: Date
}

export default function ConversationApp() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Hello! I'm your AI marketing assistant. Tell me about your restaurant and I'll help you create engaging content for social media.",
      isUser: false,
      timestamp: new Date()
    }
  ])
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleVoiceInput = () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false)
      setIsProcessing(true)
      
      // Simulate processing
      setTimeout(() => {
        const userMessage: Message = {
          id: Date.now(),
          text: "I just created this amazing truffle risotto with locally sourced mushrooms and aged parmesan. The dish has this incredible earthy aroma and creamy texture that our customers absolutely love.",
          isUser: true,
          timestamp: new Date()
        }
        
        setMessages(prev => [...prev, userMessage])
        
        // Simulate AI response
        setTimeout(() => {
          const aiMessage: Message = {
            id: Date.now() + 1,
            text: "That sounds absolutely delicious! Here's some engaging content for your truffle risotto:\n\n🍄✨ TRUFFLE RISOTTO PERFECTION ✨\n\nOur locally-sourced mushroom risotto just hit different today! The earthy aroma of fresh truffles combined with aged parmesan creates pure magic on every spoon. 🧄👨‍🍳\n\n#TruffleRisotto #LocalIngredients #ChefSpecial #ItalianCuisine #Foodie #RestaurantLife #MushroomLove #CreamyGoodness",
            isUser: false,
            timestamp: new Date()
          }
          setMessages(prev => [...prev, aiMessage])
          setIsProcessing(false)
        }, 1500)
      }, 2000)
    } else {
      // Start recording
      setIsRecording(true)
    }
  }

  const getButtonText = () => {
    if (isProcessing) return 'Processing...'
    if (isRecording) return 'Stop Recording'
    return 'Start Recording'
  }

  const getButtonIcon = () => {
    if (isProcessing) return '⚙️'
    if (isRecording) return '⏹️'
    return '🎤'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-lg bg-white/95 border-b border-orange-200">
        <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="flex items-center gap-3 text-xl font-bold text-gray-800">
            <span className="text-3xl">🍽️</span>
            ChefSocial Voice
          </Link>
          
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-gray-600 hover:text-orange-600 transition-colors">
              ← Back to Dashboard
            </Link>
          </div>
        </nav>
      </header>

      <div className="pt-20 px-4 pb-8">
        <div className="max-w-4xl mx-auto">
          {/* App Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">
              AI Marketing <span className="text-orange-600">Assistant</span>
            </h1>
            <p className="text-gray-600 text-lg">
              Have a natural conversation about your restaurant and get instant social media content
            </p>
          </div>

          {/* Main App Container */}
          <div className="bg-white/95 backdrop-blur-lg rounded-3xl p-8 shadow-xl border border-orange-100">
            
            {/* Conversation Area */}
            <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-6 mb-8 h-96 overflow-y-auto border border-orange-200">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                        message.isUser
                          ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                          : 'bg-white text-gray-800 border border-orange-200'
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-line">
                        {message.text}
                      </p>
                      <p className={`text-xs mt-2 ${
                        message.isUser ? 'text-orange-100' : 'text-gray-500'
                      }`}>
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                
                {isProcessing && (
                  <div className="flex justify-start">
                    <div className="bg-white text-gray-800 border border-orange-200 px-4 py-3 rounded-2xl max-w-xs">
                      <div className="flex items-center gap-2">
                        <div className="animate-spin text-orange-500">⚙️</div>
                        <span className="text-sm">AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Voice Controls */}
            <div className="text-center">
              <button
                onClick={handleVoiceInput}
                disabled={isProcessing}
                className={`w-32 h-32 rounded-full text-4xl font-bold transition-all duration-300 ${
                  isRecording 
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                    : isProcessing
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-orange-500 to-red-500 hover:shadow-xl hover:-translate-y-1'
                } text-white shadow-lg disabled:opacity-50`}
              >
                {getButtonIcon()}
              </button>
              
              <p className="text-gray-700 mt-4 text-lg font-medium">
                {getButtonText()}
              </p>
              
              {isRecording && (
                <div className="mt-4">
                  <div className="flex justify-center items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-red-600 font-medium">Listening...</span>
                  </div>
                </div>
              )}
              
              {!isRecording && !isProcessing && (
                <p className="text-gray-500 mt-4 text-sm max-w-md mx-auto">
                  Click the microphone and tell me about your latest dish, special event, or anything happening at your restaurant!
                </p>
              )}
            </div>
          </div>

          {/* Tips Section */}
          <div className="mt-8 bg-white/95 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-orange-100">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">💡 Tips for Great Content</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <h4 className="font-medium text-gray-800 mb-2">What to talk about:</h4>
                <ul className="space-y-1">
                  <li>• New dishes and specials</li>
                  <li>• Behind-the-scenes moments</li>
                  <li>• Customer favorites</li>
                  <li>• Seasonal ingredients</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-800 mb-2">Be descriptive:</h4>
                <ul className="space-y-1">
                  <li>• Mention colors, textures, aromas</li>
                  <li>• Share the cooking process</li>
                  <li>• Include customer reactions</li>
                  <li>• Add personal touches</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 