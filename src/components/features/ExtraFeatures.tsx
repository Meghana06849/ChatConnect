import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Sparkles, 
  Zap, 
  Heart, 
  MessageCircle,
  Image,
  Music,
  Calendar,
  Gift
} from 'lucide-react';

export const ExtraFeatures: React.FC = () => {
  const features = [
    {
      icon: Sparkles,
      title: "AI Smart Replies",
      description: "Get intelligent message suggestions",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: Zap,
      title: "Quick Reactions",
      description: "React instantly with emoji",
      color: "from-yellow-500 to-orange-500"
    },
    {
      icon: Heart,
      title: "Love Notes",
      description: "Send special romantic messages",
      color: "from-pink-500 to-red-500"
    },
    {
      icon: MessageCircle,
      title: "Voice Messages",
      description: "Record and send voice notes",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: Image,
      title: "Photo Sharing",
      description: "Share moments instantly",
      color: "from-green-500 to-teal-500"
    },
    {
      icon: Music,
      title: "Music Status",
      description: "Share what you're listening to",
      color: "from-indigo-500 to-purple-500"
    },
    {
      icon: Calendar,
      title: "Event Planning",
      description: "Plan dates and meetups",
      color: "from-orange-500 to-red-500"
    },
    {
      icon: Gift,
      title: "Virtual Gifts",
      description: "Send surprise virtual presents",
      color: "from-pink-500 to-purple-500"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {features.map((feature, index) => (
        <Card key={index} className="glass border-white/20 hover:scale-105 transition-transform cursor-pointer">
          <CardHeader>
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${feature.color} flex items-center justify-center mb-2`}>
              <feature.icon className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-lg">{feature.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{feature.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
