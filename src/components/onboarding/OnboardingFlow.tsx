import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle, 
  Heart, 
  Moon, 
  Shield, 
  Calendar,
  Sparkles,
  ArrowRight,
  Check,
  ChevronRight
} from 'lucide-react';

interface OnboardingFlowProps {
  onComplete: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      icon: MessageCircle,
      iconColor: 'text-cyan-400',
      gradient: 'from-cyan-400 to-teal-500',
      title: 'Welcome to ChatConnect! 💬',
      description: 'The next-gen chat app designed for meaningful connections and special relationships.',
      features: [
        'Real-time messaging & media sharing',
        'Voice & video calls with HD quality',
        'Stories with music & AI filters',
        'Smart friend system & groups'
      ],
      emoji: '🌟'
    },
    {
      icon: Heart,
      iconColor: 'text-pink-500',
      gradient: 'from-pink-500 to-rose-600',
      title: 'Two Modes, One App 💕',
      description: 'Switch between General Mode for everyone and Lovers Mode for that special someone.',
      features: [
        'General Mode: Chat with friends & family',
        'Lovers Mode: Private romantic space',
        'Separate histories & call logs',
        'PIN-protected privacy'
      ],
      emoji: '🔐'
    },
    {
      icon: Moon,
      iconColor: 'text-purple-500',
      gradient: 'from-purple-500 to-pink-600',
      title: 'Dream Room 🌙',
      description: 'Your private 3D virtual space that opens at midnight. Design it together with your partner.',
      features: [
        'Customizable themes & decorations',
        'Animated virtual pets that grow',
        'Mood-synced environment',
        'Available 12AM - 5AM'
      ],
      emoji: '✨'
    },
    {
      icon: Shield,
      iconColor: 'text-emerald-500',
      gradient: 'from-emerald-500 to-teal-600',
      title: 'Love Vault 🔒',
      description: 'End-to-end encrypted storage for your most precious moments. Zero-knowledge security.',
      features: [
        'AES-256-GCM encryption',
        'Store photos, videos & messages',
        'Client-side encryption only',
        'Only you two can access'
      ],
      emoji: '💎'
    },
    {
      icon: Calendar,
      iconColor: 'text-blue-500',
      gradient: 'from-blue-500 to-cyan-600',
      title: 'Couple Calendar 📅',
      description: 'Never miss special moments with shared calendar, reminders, and love-level tracking.',
      features: [
        'Shared events & date planning',
        'Anniversary reminders',
        'Mini love-games to play',
        'Track your love journey'
      ],
      emoji: '💕'
    },
    {
      icon: Sparkles,
      iconColor: 'text-yellow-500',
      gradient: 'from-yellow-400 to-orange-500',
      title: "You're All Set! 🎉",
      description: 'Start connecting with friends and unlock premium features as you explore.',
      features: [
        'Earn Love Coins through activity',
        'Unlock exclusive themes & features',
        'Build daily login streaks',
        'Level up your relationships'
      ],
      emoji: '🚀'
    }
  ];

  const currentSlideData = slides[currentSlide];
  const isLastSlide = currentSlide === slides.length - 1;

  const nextSlide = () => {
    if (isLastSlide) {
      localStorage.setItem('chatconnect_onboarding_completed', 'true');
      onComplete();
    } else {
      setCurrentSlide(prev => prev + 1);
    }
  };

  const skipOnboarding = () => {
    localStorage.setItem('chatconnect_onboarding_completed', 'true');
    onComplete();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-blue-500/20 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-floating-hearts"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${8 + Math.random() * 4}s`
            }}
          >
            {i % 3 === 0 ? '💕' : i % 3 === 1 ? '✨' : '🌟'}
          </div>
        ))}
      </div>

      <div className="w-full max-w-3xl relative z-10">
        {/* Skip Button */}
        {!isLastSlide && (
          <div className="text-right mb-4">
            <Button
              variant="ghost"
              onClick={skipOnboarding}
              className="text-muted-foreground hover:text-foreground"
            >
              Skip Tour
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {/* Main Card */}
        <Card className="glass border-white/20 overflow-hidden animate-slide-up">
          <CardContent className="p-8 md:p-12">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className={`bg-gradient-to-br ${currentSlideData.gradient} p-6 rounded-3xl shadow-2xl animate-scale-in`}>
                <currentSlideData.icon className={`w-16 h-16 ${currentSlideData.iconColor} animate-float`} />
              </div>
            </div>

            {/* Title */}
            <h1 className={`text-4xl md:text-5xl font-bold text-center mb-4 bg-gradient-to-r ${currentSlideData.gradient} bg-clip-text text-transparent animate-fade-in`}>
              {currentSlideData.title}
            </h1>

            {/* Description */}
            <p className="text-lg text-center text-muted-foreground mb-8 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.1s' }}>
              {currentSlideData.description}
            </p>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {currentSlideData.features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-white/5 to-transparent border border-white/10 hover:bg-white/10 transition-all animate-slide-up"
                  style={{ animationDelay: `${0.2 + index * 0.1}s` }}
                >
                  <div className={`bg-gradient-to-br ${currentSlideData.gradient} p-1.5 rounded-lg flex-shrink-0 mt-0.5`}>
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-sm text-foreground">{feature}</p>
                </div>
              ))}
            </div>

            {/* Progress Dots */}
            <div className="flex justify-center gap-2 mb-8">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === currentSlide
                      ? `w-8 bg-gradient-to-r ${currentSlideData.gradient}`
                      : 'w-2 bg-muted hover:bg-muted-foreground/50'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>

            {/* Navigation */}
            <div className="flex gap-4">
              {currentSlide > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setCurrentSlide(prev => prev - 1)}
                  className="flex-1"
                >
                  Previous
                </Button>
              )}
              <Button
                onClick={nextSlide}
                className={`flex-1 bg-gradient-to-r ${currentSlideData.gradient} text-white border-0 hover:scale-105 transition-transform`}
              >
                {isLastSlide ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Get Started
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>

            {/* Emoji */}
            <div className="text-center mt-6">
              <span className="text-5xl animate-bounce inline-block">
                {currentSlideData.emoji}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Progress Text */}
        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            {currentSlide + 1} of {slides.length}
          </p>
        </div>
      </div>
    </div>
  );
};
