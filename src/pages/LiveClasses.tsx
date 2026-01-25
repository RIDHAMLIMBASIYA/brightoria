import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Video, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

import LiveClassModerationActions from "@/components/live-classes/LiveClassModerationActions";
import type { LiveClassRow } from "@/components/live-classes/types";
import LiveClassListItem from "@/components/live-classes/LiveClassListItem";
import LiveRoom from "@/components/live-classes/LiveRoom";

const createLiveClassCommonSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(140, "Max 140 characters"),
  description: z.string().trim().max(2000, "Too long").optional().or(z.literal("")),
});

const meetingUrlSchema = z
  .string()
  .trim()
  .min(10, "Meeting URL is required")
  .max(2000, "URL too long")
  .url("Enter a valid URL")
  .refine((v) => v.startsWith("http://") || v.startsWith("https://"), "URL must start with http(s)");

const createLiveClassSchema = z
  .discriminatedUnion("provider", [
    createLiveClassCommonSchema.extend({
      provider: z.literal("brightoria_webrtc"),
    }),
    createLiveClassCommonSchema.extend({
      provider: z.literal("external"),
      meetingUrl: meetingUrlSchema,
    }),
  ])
  .transform((v) => ({
    ...v,
    description: v.description?.trim() ? v.description.trim() : null,
  }));

type PublicProfile = {
  user_id: string;
  name: string | null;
  avatar_url: string | null;
};

type CreatorRole = "teacher" | "admin";

export default function LiveClasses() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const canCreate = user?.role === "teacher" || user?.role === "admin";

  const [createOpen, setCreateOpen] = useState(false);
  const [active, setActive] = useState<LiveClassRow | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [provider, setProvider] = useState<"brightoria_webrtc" | "external">("brightoria_webrtc");
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

  const creatorIds = useMemo(() => {
    return Array.from(new Set(classes.map((c) => c.created_by))).filter(Boolean);
  }, [classes]);

  const { data: creatorsById = new Map<string, PublicProfile>() } = useQuery({
    queryKey: ["live-class-creators", creatorIds.join(",")],
    enabled: creatorIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles_public")
        .select("user_id,name,avatar_url")
        .in("user_id", creatorIds);

      if (error) throw error;

      const rows = (data ?? []) as PublicProfile[];
      return new Map(rows.map((p) => [p.user_id, p] as const));
    },
  });

  const { data: creatorRolesById = new Map<string, CreatorRole>() } = useQuery({
    queryKey: ["live-class-creator-roles", creatorIds.join(",")],
    enabled: creatorIds.length > 0,
    queryFn: async () => {
      // Policy allows reading only teacher/admin roles for authenticated users.
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id,role")
        .in("user_id", creatorIds)
        .in("role", ["teacher", "admin"]);

      if (error) throw error;

      const rows = (data ?? []) as { user_id: string; role: CreatorRole }[];
      const map = new Map<string, CreatorRole>();
      for (const r of rows) {
        // If a user has multiple roles, prefer admin.
        const prev = map.get(r.user_id);
        if (!prev || (prev === "teacher" && r.role === "admin")) map.set(r.user_id, r.role);
      }
      return map;
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

    const parsed = createLiveClassSchema.safeParse({ title, description, meetingUrl, provider });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid form");
      return;
    }

    setIsCreating(true);
    try {
      const roomId = parsed.data.provider === "brightoria_webrtc" ? crypto.randomUUID() : null;

      const { data, error } = await supabase
        .from("live_classes")
        .insert({
          created_by: user.id,
          title: parsed.data.title,
          description: parsed.data.description,
          provider: parsed.data.provider,
          room_id: roomId,
          meeting_url: parsed.data.provider === "external" ? parsed.data.meetingUrl : null,
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
      setProvider("brightoria_webrtc");
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
                  <LiveClassListItem
                    key={c.id}
                    liveClass={c}
                    creator={creatorsById.get(c.created_by)}
                    creatorRole={creatorRolesById.get(c.created_by)}
                    onSelect={() => setActive(c)}
                  />
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
                  <div key={c.id} className="space-y-2">
                    <LiveClassListItem
                      liveClass={c}
                      creator={creatorsById.get(c.created_by)}
                      creatorRole={creatorRolesById.get(c.created_by)}
                      onSelect={() => setActive(c)}
                    />
                    <p className="px-1 text-xs text-muted-foreground">
                      {c.starts_at
                        ? `Starts: ${new Date(c.starts_at).toLocaleString()}`
                        : `Created: ${new Date(c.created_at).toLocaleString()}`}
                    </p>
                  </div>
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
                    <LiveClassModerationActions
                      liveClass={active}
                      onUpdated={(patch) => setActive((prev) => (prev ? ({ ...prev, ...patch } as LiveClassRow) : prev))}
                      onDeleted={() => setActive(null)}
                    />
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
                  {active.provider === "brightoria_webrtc" ? (
                    active.room_id ? (
                      <LiveRoom liveClass={active} />
                    ) : (
                      <div className="h-[60vh] flex items-center justify-center rounded-lg border border-dashed border-border">
                        <p className="text-sm text-muted-foreground">This room is not configured yet.</p>
                      </div>
                    )
                  ) : (
                    <>
                      {active.meeting_url ? (
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs text-muted-foreground">
                            If the embed is blocked (e.g., Google Meet), open the session in a new tab.
                          </p>
                          <Button asChild variant="secondary" className="gap-2">
                            <a href={active.meeting_url} target="_blank" rel="noreferrer noopener">
                              Open in new tab
                            </a>
                          </Button>
                        </div>
                      ) : null}

                      <div className="rounded-lg border border-border overflow-hidden bg-muted/20">
                        <iframe
                          title={active.title}
                          src={active.meeting_url ?? "about:blank"}
                          className="w-full h-[60vh]"
                          // Some providers will still block via X-Frame-Options/CSP.
                          // We keep a safe sandbox and provide a fallback button.
                          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </>
                  )}
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
              <Label>Session type</Label>
              <Select value={provider} onValueChange={(v) => setProvider(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="brightoria_webrtc">Brightoria Live Room (in-app)</SelectItem>
                  <SelectItem value="external">External meeting link</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Brightoria Live Room runs inside the website (best for 2–6 participants).
              </p>
            </div>

            <div className="space-y-2">
              {provider === "external" ? (
                <>
                  <Label htmlFor="lc-url">Meeting URL</Label>
                  <Input
                    id="lc-url"
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                    placeholder="https://..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Tip: Some providers block embedding; students can always use “Open in new tab”.
                  </p>
                </>
              ) : (
                <>
                  <Label>Meeting URL</Label>
                  <p className="text-sm text-muted-foreground">
                    Not needed for Brightoria Live Room.
                  </p>
                </>
              )}
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
