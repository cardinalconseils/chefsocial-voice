import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 bg-[length:400%_400%] animate-gradient-shift">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 p-4 backdrop-blur-lg bg-white/5 border-b border-white/10">
        <nav className="container mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3 text-2xl font-bold text-white">
            <span className="text-4xl bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent animate-pulse">
              🍽️
            </span>
            ChefSocial Voice
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-white/90 hover:text-white transition-colors">Features</Link>
            <Link href="#how-it-works" className="text-white/90 hover:text-white transition-colors">How It Works</Link>
            <Link href="/demo" className="text-white/90 hover:text-white transition-colors">Demo</Link>
            <Link href="/auth/login" className="text-white/90 hover:text-white transition-colors">Sign In</Link>
            <Link 
              href="/auth/register" 
              className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-full font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
            >
              Start Free Trial
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center">
          <div className="backdrop-blur-lg bg-white/10 rounded-3xl p-12 border border-white/20 shadow-2xl max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Transform Your Voice Into 
              <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent block">
                Viral Food Content
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-white/90 mb-10 max-w-3xl mx-auto leading-relaxed">
              AI-powered platform that turns your food descriptions into engaging social media content 
              for Instagram, TikTok, and more. Just speak, and watch your content go viral.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link 
                href="/auth/register"
                className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 py-4 rounded-full text-lg font-semibold hover:shadow-xl hover:-translate-y-1 transition-all duration-300 min-w-[200px]"
              >
                Start 14-Day Free Trial
              </Link>
              <Link 
                href="/demo"
                className="border-2 border-white/30 text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-white/10 transition-all duration-300 min-w-[200px]"
              >
                Watch Demo
              </Link>
            </div>
            
            <p className="text-white/70 mt-4 text-sm">
              No credit card required • 14-day free trial • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Powerful Features for Food Creators
            </h2>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              Everything you need to create engaging content that drives engagement and grows your audience
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="backdrop-blur-lg bg-white/10 rounded-2xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-300">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-2xl font-bold text-white mb-4">{feature.title}</h3>
                <p className="text-white/80 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              How It Works
            </h2>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              From voice to viral content in three simple steps
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="backdrop-blur-lg bg-white/10 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 border border-white/20">
                  <span className="text-2xl font-bold text-white">{index + 1}</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">{step.title}</h3>
                <p className="text-white/80 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="backdrop-blur-lg bg-white/10 rounded-3xl p-12 border border-white/20 shadow-2xl max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Transform Your Content?
            </h2>
            <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              Join thousands of food creators who are already using ChefSocial Voice to create viral content
            </p>
            <Link 
              href="/auth/register"
              className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-10 py-5 rounded-full text-xl font-semibold hover:shadow-xl hover:-translate-y-1 transition-all duration-300 inline-block"
            >
              Start Your Free Trial Today
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-white/10">
        <div className="container mx-auto text-center">
          <p className="text-white/60">
            © 2024 ChefSocial Voice. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

const features = [
  {
    icon: "🎤",
    title: "Voice to Content AI",
    description: "Simply describe your dish and our AI transforms your voice into compelling social media posts with hashtags and captions."
  },
  {
    icon: "🌍",
    title: "Multilingual Support",
    description: "Create content in multiple languages to reach global audiences and expand your restaurant's reach."
  },
  {
    icon: "📱",
    title: "Multi-Platform Ready",
    description: "Generate optimized content for Instagram, TikTok, Facebook, and Twitter with platform-specific formatting."
  },
  {
    icon: "🧠",
    title: "Smart Brand Learning",
    description: "AI learns your restaurant's voice, style, and preferences to maintain consistent brand messaging."
  },
  {
    icon: "👁️",
    title: "Visual AI Analysis",
    description: "Upload food photos and get AI-generated descriptions and content suggestions based on visual elements."
  },
  {
    icon: "📊",
    title: "Viral Prediction",
    description: "Get engagement predictions and optimization suggestions to maximize your content's viral potential."
  }
];

const steps = [
  {
    title: "Speak Your Story",
    description: "Record yourself describing your dish, restaurant story, or cooking process using our voice interface."
  },
  {
    title: "AI Magic Happens",
    description: "Our advanced AI processes your voice, understands context, and creates engaging social media content."
  },
  {
    title: "Share & Go Viral",
    description: "Get ready-to-post content with captions, hashtags, and posting schedules optimized for maximum engagement."
  }
];
