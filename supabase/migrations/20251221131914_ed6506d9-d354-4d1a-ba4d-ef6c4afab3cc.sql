-- Enable REPLICA IDENTITY FULL for contacts table for complete real-time updates
ALTER TABLE contacts REPLICA IDENTITY FULL;

-- Add contacts to supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE contacts;

-- Also enable realtime for profiles to track online status changes
ALTER TABLE profiles REPLICA IDENTITY FULL;

-- Add profiles to supabase_realtime publication (for live online status)
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;