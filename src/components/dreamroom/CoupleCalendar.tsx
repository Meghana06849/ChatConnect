import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Calendar as CalendarIcon, 
  Heart, 
  Plus, 
  Trash2, 
  Bell,
  Sparkles,
  Clock
} from 'lucide-react';
import { format, isSameDay, isPast, isFuture, startOfDay } from 'date-fns';

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_type: string;
  is_recurring: boolean;
  reminder_time: number;
}

export const CoupleCalendar: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    event_date: new Date(),
    event_type: 'date',
    is_recurring: false,
    reminder_time: 60
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('couple_calendar')
        .select('*')
        .order('event_date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: "Error",
        description: "Failed to load calendar events",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('lovers_partner_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.lovers_partner_id) {
        toast({
          title: "No Partner",
          description: "You need to have a lover partner to create couple events",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('couple_calendar')
        .insert({
          user_id: user.id,
          partner_id: profile.lovers_partner_id,
          title: newEvent.title,
          description: newEvent.description,
          event_date: newEvent.event_date.toISOString(),
          event_type: newEvent.event_type,
          is_recurring: newEvent.is_recurring,
          reminder_time: newEvent.reminder_time
        });

      if (error) throw error;

      toast({
        title: "Event Created! 💕",
        description: "Your special moment has been added to the calendar"
      });

      setIsDialogOpen(false);
      setNewEvent({
        title: '',
        description: '',
        event_date: new Date(),
        event_type: 'date',
        is_recurring: false,
        reminder_time: 60
      });
      fetchEvents();
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: "Error",
        description: "Failed to create event",
        variant: "destructive"
      });
    }
  };

  const deleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('couple_calendar')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      toast({
        title: "Event Deleted",
        description: "Event removed from calendar"
      });
      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: "Error",
        description: "Failed to delete event",
        variant: "destructive"
      });
    }
  };

  const getEventTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      date: 'bg-pink-500',
      anniversary: 'bg-red-500',
      birthday: 'bg-purple-500',
      special: 'bg-yellow-500',
      reminder: 'bg-blue-500'
    };
    return colors[type] || 'bg-gray-500';
  };

  const getEventTypeEmoji = (type: string) => {
    const emojis: { [key: string]: string } = {
      date: '💕',
      anniversary: '💍',
      birthday: '🎂',
      special: '✨',
      reminder: '🔔'
    };
    return emojis[type] || '📅';
  };

  const selectedDateEvents = events.filter(event => 
    isSameDay(new Date(event.event_date), selectedDate)
  );

  const upcomingEvents = events
    .filter(event => isFuture(new Date(event.event_date)))
    .slice(0, 5);

  return (
    <div className="flex-1 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-lovers-primary to-lovers-secondary bg-clip-text text-transparent mb-2">
              Couple Calendar
            </h1>
            <p className="text-muted-foreground">
              Never miss a special moment together 💕
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-lovers-primary to-lovers-secondary text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add Event
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-lovers-primary">
                  Create Special Moment ✨
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="title">Event Title</Label>
                  <Input
                    id="title"
                    placeholder="Date Night at the Park 🌙"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Bring blankets and snacks..."
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="event_type">Event Type</Label>
                  <select
                    id="event_type"
                    className="w-full p-2 border rounded-md"
                    value={newEvent.event_type}
                    onChange={(e) => setNewEvent({ ...newEvent, event_type: e.target.value })}
                  >
                    <option value="date">💕 Date</option>
                    <option value="anniversary">💍 Anniversary</option>
                    <option value="birthday">🎂 Birthday</option>
                    <option value="special">✨ Special</option>
                    <option value="reminder">🔔 Reminder</option>
                  </select>
                </div>
                
                <div>
                  <Label>Event Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={format(newEvent.event_date, "yyyy-MM-dd'T'HH:mm")}
                    onChange={(e) => setNewEvent({ ...newEvent, event_date: new Date(e.target.value) })}
                  />
                </div>

                <Button 
                  onClick={createEvent}
                  className="w-full bg-gradient-to-r from-lovers-primary to-lovers-secondary text-white"
                >
                  <Heart className="w-4 h-4 mr-2" />
                  Create Event
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="glass border-white/20 lg:col-span-2">
            <CardContent className="p-6">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border-0"
                modifiers={{
                  hasEvent: events.map(e => new Date(e.event_date))
                }}
                modifiersStyles={{
                  hasEvent: {
                    backgroundColor: 'hsl(var(--lovers-primary))',
                    color: 'white',
                    fontWeight: 'bold'
                  }
                }}
              />
            </CardContent>
          </Card>

          {/* Events Sidebar */}
          <div className="space-y-6">
            {/* Selected Date Events */}
            <Card className="glass border-white/20">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-lovers-primary" />
                  {format(selectedDate, 'MMM dd, yyyy')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedDateEvents.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No events on this date
                  </p>
                ) : (
                  selectedDateEvents.map(event => (
                    <div 
                      key={event.id}
                      className="p-3 rounded-lg bg-gradient-to-r from-lovers-accent/30 to-transparent border border-lovers-primary/20"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{getEventTypeEmoji(event.event_type)}</span>
                            <h4 className="font-semibold">{event.title}</h4>
                          </div>
                          {event.description && (
                            <p className="text-sm text-muted-foreground">{event.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {format(new Date(event.event_date), 'h:mm a')}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteEvent(event.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Upcoming Events */}
            <Card className="glass border-white/20">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-lovers-primary" />
                  Upcoming
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingEvents.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No upcoming events
                  </p>
                ) : (
                  upcomingEvents.map(event => (
                    <div 
                      key={event.id}
                      className="p-3 rounded-lg bg-gradient-to-r from-lovers-accent/20 to-transparent"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={`${getEventTypeColor(event.event_type)} text-white border-0`}>
                          {getEventTypeEmoji(event.event_type)}
                        </Badge>
                        <h4 className="font-semibold text-sm">{event.title}</h4>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(event.event_date), 'MMM dd, h:mm a')}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
