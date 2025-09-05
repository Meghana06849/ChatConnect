import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Mic, 
  Volume2, 
  Settings, 
  Play, 
  Square,
  Headphones,
  Waves,
  Bot
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const VoiceChangeChat: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('normal');
  const { toast } = useToast();

  const voiceEffects = [
    { id: 'normal', name: 'Normal', icon: '👤' },
    { id: 'robot', name: 'Robot', icon: '🤖' },
    { id: 'deep', name: 'Deep Voice', icon: '🦹‍♂️' },
    { id: 'chipmunk', name: 'Chipmunk', icon: '🐿️' },
    { id: 'echo', name: 'Echo', icon: '🔊' },
    { id: 'whisper', name: 'Whisper', icon: '🤫' },
    { id: 'demon', name: 'Demon', icon: '👹' },
    { id: 'alien', name: 'Alien', icon: '👽' },
  ];

  const handleStartRecording = () => {
    setIsRecording(true);
    toast({
      title: "Recording started",
      description: "Speak your message with the selected voice effect"
    });
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    toast({
      title: "Message sent!",
      description: `Voice message sent with ${voiceEffects.find(v => v.id === selectedVoice)?.name} effect`
    });
  };

  return (
    <div className="flex-1 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <Headphones className="w-16 h-16 mx-auto mb-4 text-primary animate-pulse" />
          <h1 className="text-3xl font-bold mb-2">Voice Change Chat</h1>
          <p className="text-muted-foreground">
            Transform your voice with real-time effects and send unique voice messages
          </p>
        </div>

        {/* Voice Effects Grid */}
        <Card className="glass border-white/20 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Waves className="w-5 h-5" />
              <span>Voice Effects</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {voiceEffects.map((effect) => (
                <Button
                  key={effect.id}
                  variant={selectedVoice === effect.id ? "default" : "outline"}
                  className={`h-20 flex-col space-y-2 ${
                    selectedVoice === effect.id 
                      ? "bg-primary text-primary-foreground" 
                      : "glass border-white/20 hover:bg-white/10"
                  }`}
                  onClick={() => setSelectedVoice(effect.id)}
                >
                  <span className="text-2xl">{effect.icon}</span>
                  <span className="text-sm font-medium">{effect.name}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recording Interface */}
        <Card className="glass border-white/20 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Mic className="w-5 h-5" />
                <span>Voice Recorder</span>
              </div>
              <Badge variant="outline" className="glass">
                {voiceEffects.find(v => v.id === selectedVoice)?.name} Selected
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="flex flex-col items-center space-y-6">
              <div className={`
                w-32 h-32 rounded-full border-4 flex items-center justify-center
                ${isRecording 
                  ? 'border-red-500 bg-red-500/20 animate-pulse' 
                  : 'border-primary bg-primary/20'
                }
              `}>
                {isRecording ? (
                  <Square className="w-8 h-8 text-red-500" />
                ) : (
                  <Mic className="w-8 h-8 text-primary" />
                )}
              </div>
              
              <div className="space-y-2">
                <p className="text-lg font-medium">
                  {isRecording ? 'Recording...' : 'Ready to record'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isRecording 
                    ? 'Tap to stop and send' 
                    : `Press to record with ${voiceEffects.find(v => v.id === selectedVoice)?.name} effect`
                  }
                </p>
              </div>

              <Button
                size="lg"
                className={`
                  px-8 py-4 text-lg font-medium
                  ${isRecording 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-primary hover:bg-primary/90'
                  }
                `}
                onClick={isRecording ? handleStopRecording : handleStartRecording}
              >
                {isRecording ? (
                  <>
                    <Square className="w-5 h-5 mr-2" />
                    Stop & Send
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5 mr-2" />
                    Start Recording
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Voice Messages */}
        <Card className="glass border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Volume2 className="w-5 h-5" />
              <span>Recent Voice Messages</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { effect: 'Robot', time: '2 minutes ago', duration: '00:05' },
                { effect: 'Chipmunk', time: '1 hour ago', duration: '00:03' },
                { effect: 'Echo', time: '3 hours ago', duration: '00:07' },
              ].map((message, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  <div className="flex items-center space-x-3">
                    <Button size="sm" variant="outline" className="w-10 h-10 p-0">
                      <Play className="w-4 h-4" />
                    </Button>
                    <div>
                      <p className="font-medium">{message.effect} Voice</p>
                      <p className="text-sm text-muted-foreground">{message.time}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="glass">
                    {message.duration}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};