import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Timer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DisappearingMessage {
  id: string;
  content: string;
  expiresAt: Date;
  timer: '1min' | '1hr' | '1day';
}

export const DisappearingMessages: React.FC = () => {
  const [messages, setMessages] = useState<DisappearingMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [timer, setTimer] = useState<'1min' | '1hr' | '1day'>('1min');
  const { toast } = useToast();

  useEffect(() => {
    // Check for expired messages every second
    const interval = setInterval(() => {
      const now = new Date();
      setMessages(prev => prev.filter(msg => msg.expiresAt > now));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getExpirationTime = (timer: string): Date => {
    const now = new Date();
    switch (timer) {
      case '1min':
        return new Date(now.getTime() + 60 * 1000);
      case '1hr':
        return new Date(now.getTime() + 60 * 60 * 1000);
      case '1day':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 60 * 1000);
    }
  };

  const sendDisappearingMessage = () => {
    if (!newMessage.trim()) return;

    const message: DisappearingMessage = {
      id: Date.now().toString(),
      content: newMessage,
      expiresAt: getExpirationTime(timer),
      timer
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');
    
    toast({
      title: "Disappearing message sent!",
      description: `Will self-destruct in ${timer === '1min' ? '1 minute' : timer === '1hr' ? '1 hour' : '1 day'}`,
    });
  };

  const getTimeRemaining = (expiresAt: Date): string => {
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const minutes = Math.floor(diff / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (minutes > 60) {
      const hours = Math.floor(minutes / 60);
      return `${hours}h ${minutes % 60}m`;
    }
    
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Timer className="w-16 h-16 mx-auto mb-4 text-primary" />
        <h2 className="text-2xl font-bold mb-2">Disappearing Messages</h2>
        <p className="text-muted-foreground">Send messages that self-destruct</p>
      </div>

      {/* Send Message */}
      <Card className="glass border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Send Disappearing Message</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your secret message..."
            className="w-full p-3 glass border-white/20 rounded-lg resize-none h-24"
          />
          
          <div className="flex items-center space-x-4">
            <Select value={timer} onValueChange={(value: '1min' | '1hr' | '1day') => setTimer(value)}>
              <SelectTrigger className="w-40 glass border-white/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1min">1 Minute</SelectItem>
                <SelectItem value="1hr">1 Hour</SelectItem>
                <SelectItem value="1day">1 Day</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              onClick={sendDisappearingMessage}
              disabled={!newMessage.trim()}
              className="bg-gradient-to-r from-primary to-accent"
            >
              Send Secret Message
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Messages */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Active Disappearing Messages</h3>
        {messages.length === 0 ? (
          <Card className="glass border-white/20">
            <CardContent className="p-8 text-center">
              <Timer className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">No active disappearing messages</p>
            </CardContent>
          </Card>
        ) : (
          messages.map((message) => (
            <Card key={message.id} className="glass border-white/20 border-l-4 border-l-red-500">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="mb-2">{message.content}</p>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Timer className="w-4 h-4" />
                      <span>Expires in: {getTimeRemaining(message.expiresAt)}</span>
                    </div>
                  </div>
                  <div className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">
                    {message.timer}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};