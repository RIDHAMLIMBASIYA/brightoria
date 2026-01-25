export type LiveClassStatus = "scheduled" | "live" | "ended";

export type LiveClassRow = {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  title: string;
  description: string | null;
  meeting_url: string;
  status: LiveClassStatus;
  starts_at: string | null;
  ends_at: string | null;
};
