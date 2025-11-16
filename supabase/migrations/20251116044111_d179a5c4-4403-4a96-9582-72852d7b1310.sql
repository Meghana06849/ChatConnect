-- Create couple_calendar table for shared events and dates
CREATE TABLE IF NOT EXISTS public.couple_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  partner_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  event_date timestamp with time zone NOT NULL,
  event_type text DEFAULT 'date',
  is_recurring boolean DEFAULT false,
  reminder_time integer DEFAULT 60,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.couple_calendar ENABLE ROW LEVEL SECURITY;

-- Create policies for couple calendar
CREATE POLICY "Users can view own couple events"
  ON public.couple_calendar
  FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = partner_id);

CREATE POLICY "Users can create couple events"
  ON public.couple_calendar
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own couple events"
  ON public.couple_calendar
  FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = partner_id);

CREATE POLICY "Users can delete own couple events"
  ON public.couple_calendar
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_couple_calendar_updated_at
  BEFORE UPDATE ON public.couple_calendar
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();