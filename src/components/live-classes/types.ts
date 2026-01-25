export type LiveClassStatus = "scheduled" | "live" | "ended";

export type LiveClassProvider = "external" | "brightoria_webrtc";

export type LiveClassRow = {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  title: string;
  description: string | null;
  meeting_url: string | null;
  provider: LiveClassProvider;
  room_id: string | null;
  status: LiveClassStatus;
  starts_at: string | null;
  ends_at: string | null;
};
