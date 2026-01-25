import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink, Plus, Video, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

type LiveClassStatus = "scheduled" | "live" | "ended";

type LiveClassRow = {
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

const createLiveClassSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(140, "Max 140 characters"),
  description: z.string().trim().max(2000, "Too long").optional().or(z.literal("")),
  meetingUrl: z
    .string()
    .trim()
    .min(10, "Meeting URL is required")
    .max(2000, "URL too long")
    .url("Enter a valid URL")
    .refine((v) => v.startsWith("http://") || v.startsWith("https://"), "URL must start with http(s)"),
});

function statusBadgeVariant(status: LiveClassStatus): "default" | "secondary" | "outline" {
  if (status === "live") return "default";
  if (status === "scheduled") return "secondary";
  return "outline";
}

export default function LiveClasses() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const canCreate = user?.role === "teacher" || user?.role === "admin";

  const [createOpen, setCreateOpen] = useState(false);
  const [active, setActive] = useState<LiveClassRow | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const { data: classes = [], isLoading, error } = useQuery({
    queryKey: ["live-classes"],
    queryFn: async (): Promise<LiveClassRow[]> => {
      const { data, error } = await supabase
        .from("live_classes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data ?? []) as LiveClassRow[];
    },
  });

  useEffect(() => {
    if (!error) return;
    toast.error((error as any)?.message ?? "Failed to load live classes");
  }, [error]);

  // Realtime refresh
  useEffect(() => {
    const channel = supabase
      .channel("live-classes-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_classes" },
        () => qc.invalidateQueries({ queryKey: ["live-classes"] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const { liveNow, upcomingOrOther } = useMemo(() => {
    const liveNow = classes.filter((c) => c.status === "live");
    const upcomingOrOther = classes.filter((c) => c.status !== "live");
    return { liveNow, upcomingOrOther };
  }, [classes]);

  const submitCreate = async () => {
    if (!user) return;
    if (!canCreate) {
      toast.error("Only teachers/admins can start a live class");
      return;
    }

    const parsed = createLiveClassSchema.safeParse({ title, description, meetingUrl });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid form");
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from("live_classes")
        .insert({
          created_by: user.id,
          title: parsed.data.title,
          description: parsed.data.description?.trim() ? parsed.data.description.trim() : null,
          meeting_url: parsed.data.meetingUrl,
          status: "live",
        })
        .select("*")
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Could not create class");

      toast.success("Live class started");
      setCreateOpen(false);
      setTitle("");
      setDescription("");
      setMeetingUrl("");
      setActive(data as LiveClassRow);
      qc.invalidateQueries({ queryKey: ["live-classes"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to start live class");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-display font-bold">Live Classes</h1>
          <p className="text-sm text-muted-foreground">
            Join live sessions. If embedding is blocked by the provider, use “Open in new tab”.
          </p>
        </div>

        {canCreate && (
          <Button className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" />
            Start Live Class
          </Button>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* List */}
        <div className="lg:col-span-5 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="w-5 h-5" />
                Live Now
                <Badge variant="secondary" className="ml-2">
                  {liveNow.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : liveNow.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active classes right now.</p>
              ) : (
                liveNow.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActive(c)}
                    className="w-full text-left rounded-lg border border-border p-3 hover:bg-muted/40 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{c.title}</p>
                        {c.description ? (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{c.description}</p>
                        ) : null}
                      </div>
                      <Badge variant={statusBadgeVariant(c.status)} className="shrink-0 capitalize">
                        {c.status}
                      </Badge>
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Upcoming / Ended</span>
                <Badge variant="secondary">{upcomingOrOther.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : upcomingOrOther.length === 0 ? (
                <p className="text-sm text-muted-foreground">No scheduled or ended classes.</p>
              ) : (
                upcomingOrOther.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActive(c)}
                    className="w-full text-left rounded-lg border border-border p-3 hover:bg-muted/40 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{c.title}</p>
                        {c.starts_at ? (
                          <p className="text-xs text-muted-foreground mt-1">Starts: {new Date(c.starts_at).toLocaleString()}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-1">Created: {new Date(c.created_at).toLocaleString()}</p>
                        )}
                      </div>
                      <Badge variant={statusBadgeVariant(c.status)} className="shrink-0 capitalize">
                        {c.status}
                      </Badge>
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Viewer */}
        <div className="lg:col-span-7">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="truncate">{active ? active.title : "Select a class"}</CardTitle>
                  {active?.description ? (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{active.description}</p>
                  ) : null}
                </div>
                {active ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => window.open(active.meeting_url, "_blank", "noreferrer")}
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open in new tab
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setActive(null)} aria-label="Close viewer">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              {active ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-border overflow-hidden bg-muted/20">
                    <iframe
                      title={active.title}
                      src={active.meeting_url}
                      className="w-full h-[60vh]"
                      // Some providers will still block via X-Frame-Options/CSP.
                      // We keep a safe sandbox and provide a fallback button.
                      sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    If the embed shows “blocked”, your meeting provider doesn’t allow embedding. Use “Open in new tab”.
                  </p>
                </div>
              ) : (
                <div className="h-[60vh] flex items-center justify-center rounded-lg border border-dashed border-border">
                  <p className="text-sm text-muted-foreground">Choose a class from the list to view it here.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Start Live Class</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lc-title">Title</Label>
              <Input
                id="lc-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Math Doubts Session"
                maxLength={140}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lc-url">Meeting URL</Label>
              <Input
                id="lc-url"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="https://..."
              />
              <p className="text-xs text-muted-foreground">Tip: Some providers block embedding; students can always use “Open in new tab”.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lc-desc">Description (optional)</Label>
              <Textarea
                id="lc-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What will be covered in this class?"
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={isCreating}>
                Cancel
              </Button>
              <Button onClick={submitCreate} disabled={isCreating} className="gap-2">
                <Video className="w-4 h-4" />
                {isCreating ? "Starting…" : "Start"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
