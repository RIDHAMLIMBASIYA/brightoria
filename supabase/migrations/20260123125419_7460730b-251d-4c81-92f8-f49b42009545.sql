-- Enable Realtime for new-user feed in Admin Dashboard
-- (Allows subscribing to INSERT events on profiles)
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;