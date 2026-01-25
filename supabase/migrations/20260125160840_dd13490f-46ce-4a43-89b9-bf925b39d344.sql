-- Add provider + room_id to support internal Brightoria WebRTC rooms
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'live_class_provider') THEN
    CREATE TYPE public.live_class_provider AS ENUM ('external','brightoria_webrtc');
  END IF;
END $$;

ALTER TABLE public.live_classes
  ADD COLUMN IF NOT EXISTS provider public.live_class_provider NOT NULL DEFAULT 'external',
  ADD COLUMN IF NOT EXISTS room_id uuid;

-- Allow meeting_url to be null for internal rooms
ALTER TABLE public.live_classes
  ALTER COLUMN meeting_url DROP NOT NULL;

-- Ensure a row is either an external link OR an internal room.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'live_classes_provider_requires_link_or_room'
  ) THEN
    ALTER TABLE public.live_classes
      ADD CONSTRAINT live_classes_provider_requires_link_or_room
      CHECK (
        (provider = 'external' AND meeting_url IS NOT NULL AND length(trim(meeting_url)) > 0)
        OR
        (provider = 'brightoria_webrtc' AND room_id IS NOT NULL)
      );
  END IF;
END $$;

-- Helpful index for internal room lookups
CREATE INDEX IF NOT EXISTS idx_live_classes_room_id ON public.live_classes(room_id);
CREATE INDEX IF NOT EXISTS idx_live_classes_provider ON public.live_classes(provider);