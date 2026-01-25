import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { MonitorUp, MicOff, PhoneOff, VideoOff } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import type { LiveClassRow } from "./types";

type SignalMessage =
  | { type: "offer"; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { type: "answer"; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { type: "ice"; from: string; to: string; candidate: RTCIceCandidateInit }
  | { type: "kick"; from: string; to: string }
  | { type: "mute_request"; from: string; to: string };

type PresenceState = {
  user_id: string;
  name: string;
  role: "student" | "teacher" | "admin";
  joined_at: string;
  audio_muted?: boolean;
  video_off?: boolean;
};

function VideoTile({
  label,
  muted,
  stream,
}: {
  label: string;
  muted?: boolean;
  stream: MediaStream | null;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (!stream) {
      ref.current.srcObject = null;
      return;
    }
    ref.current.srcObject = stream;
  }, [stream]);

  return (
    <div className="relative rounded-lg border border-border overflow-hidden bg-muted/20">
      <video ref={ref} autoPlay playsInline muted={muted} className="w-full h-full object-cover" />
      <div className="absolute left-2 bottom-2">
        <Badge variant="secondary" className="text-[10px]">
          {label}
        </Badge>
      </div>
    </div>
  );
}

export default function LiveRoom({ liveClass }: { liveClass: LiveClassRow }) {
  const { user } = useAuth();

  const isHost = useMemo(() => {
    if (!user) return false;
    return user.role === "admin" || user.id === liveClass.created_by;
  }, [user, liveClass.created_by]);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [peers, setPeers] = useState<Record<string, PresenceState>>({});

  const [audioMuted, setAudioMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const shareTrackRef = useRef<MediaStreamTrack | null>(null);

  const topic = useMemo(() => {
    // Prefer a stable room identifier.
    const roomId = liveClass.room_id ?? liveClass.id;
    return `live-class:${roomId}`;
  }, [liveClass.id, liveClass.room_id]);

  const closeAll = async () => {
    try {
      for (const pc of pcsRef.current.values()) pc.close();
      pcsRef.current.clear();
      setRemoteStreams({});

      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      if (shareTrackRef.current) {
        shareTrackRef.current.stop();
        shareTrackRef.current = null;
      }

      if (localStreamRef.current) {
        for (const t of localStreamRef.current.getTracks()) t.stop();
        localStreamRef.current = null;
      }
      setLocalStream(null);
    } catch {
      // best-effort cleanup
    }
  };

  const ensureLocalMedia = async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStreamRef.current = s;
    setLocalStream(s);
    return s;
  };

  const getOrCreatePc = (peerId: string) => {
    const existing = pcsRef.current.get(peerId);
    if (existing) return existing;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
    });

    pc.ontrack = (ev) => {
      const stream = ev.streams[0];
      if (!stream) return;
      setRemoteStreams((prev) => ({ ...prev, [peerId]: stream }));
    };

    pc.onicecandidate = (ev) => {
      if (!ev.candidate || !user) return;
      channelRef.current?.send({
        type: "broadcast",
        event: "signal",
        payload: {
          type: "ice",
          from: user.id,
          to: peerId,
          candidate: ev.candidate.toJSON(),
        } satisfies SignalMessage,
      });
    };

    pcsRef.current.set(peerId, pc);
    return pc;
  };

  const attachLocalTracks = async (pc: RTCPeerConnection) => {
    const s = await ensureLocalMedia();
    const senders = pc.getSenders();
    const hasVideo = senders.some((sn) => sn.track?.kind === "video");
    const hasAudio = senders.some((sn) => sn.track?.kind === "audio");
    if (!hasVideo) {
      const vt = s.getVideoTracks()[0];
      if (vt) pc.addTrack(vt, s);
    }
    if (!hasAudio) {
      const at = s.getAudioTracks()[0];
      if (at) pc.addTrack(at, s);
    }
  };

  const sendOffer = async (peerId: string) => {
    if (!user) return;
    const pc = getOrCreatePc(peerId);
    await attachLocalTracks(pc);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await channelRef.current?.send({
      type: "broadcast",
      event: "signal",
      payload: {
        type: "offer",
        from: user.id,
        to: peerId,
        sdp: offer,
      } satisfies SignalMessage,
    });
  };

  const handleSignal = async (msg: SignalMessage) => {
    if (!user) return;
    if (msg.to !== user.id) return;

    if (msg.type === "kick") {
      toast.error("You were removed from the room");
      await closeAll();
      return;
    }

    if (msg.type === "mute_request") {
      toast.message("Host requested you mute your microphone");
      setAudioMuted(true);
      const s = localStreamRef.current;
      s?.getAudioTracks().forEach((t) => (t.enabled = false));
      await channelRef.current?.track({ audio_muted: true });
      return;
    }

    const pc = getOrCreatePc(msg.from);
    await attachLocalTracks(pc);

    if (msg.type === "offer") {
      await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await channelRef.current?.send({
        type: "broadcast",
        event: "signal",
        payload: {
          type: "answer",
          from: user.id,
          to: msg.from,
          sdp: answer,
        } satisfies SignalMessage,
      });
      return;
    }

    if (msg.type === "answer") {
      await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
      return;
    }

    if (msg.type === "ice") {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
      } catch {
        // ignore race conditions where description isn't set yet
      }
    }
  };

  const syncPeersFromPresence = (channel: any) => {
    const state = channel.presenceState() as Record<string, PresenceState[]>;
    const merged: Record<string, PresenceState> = {};
    for (const key of Object.keys(state)) {
      const latest = state[key]?.[0];
      if (latest?.user_id) merged[latest.user_id] = latest;
    }
    setPeers(merged);

    if (!user) return;
    // Deterministic offer initiator: lowest user_id initiates to higher ids.
    for (const peerId of Object.keys(merged)) {
      if (peerId === user.id) continue;
      if (user.id < peerId) {
        // Create connection if not already present.
        if (!pcsRef.current.get(peerId)) {
          void sendOffer(peerId);
        }
      }
    }
  };

  const toggleMic = async () => {
    const next = !audioMuted;
    setAudioMuted(next);
    const s = localStreamRef.current;
    s?.getAudioTracks().forEach((t) => (t.enabled = !next));
    await channelRef.current?.track({ audio_muted: next });
  };

  const toggleCamera = async () => {
    const next = !videoOff;
    setVideoOff(next);
    const s = localStreamRef.current;
    s?.getVideoTracks().forEach((t) => (t.enabled = !next));
    await channelRef.current?.track({ video_off: next });
  };

  const startScreenShare = async () => {
    if (!isHost) {
      toast.error("Only the host can share screen");
      return;
    }
    if (isSharing) return;

    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const displayTrack = display.getVideoTracks()[0];
      if (!displayTrack) return;
      shareTrackRef.current = displayTrack;
      setIsSharing(true);

      // Replace the outgoing video track for all peers.
      for (const pc of pcsRef.current.values()) {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) await sender.replaceTrack(displayTrack);
      }

      // Update local preview to show the shared screen.
      const s = localStreamRef.current;
      if (s) {
        const cam = s.getVideoTracks()[0];
        if (cam) cam.enabled = false;
      }
      setLocalStream(display);

      displayTrack.onended = () => {
        void stopScreenShare();
      };
    } catch (e: any) {
      toast.error(e?.message ?? "Screen share failed");
    }
  };

  const stopScreenShare = async () => {
    if (!shareTrackRef.current) return;
    shareTrackRef.current.stop();
    shareTrackRef.current = null;
    setIsSharing(false);

    // Restore camera track
    const s = localStreamRef.current;
    if (!s) return;

    // If localStream currently points to display, rebuild camera stream
    const camStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStreamRef.current = camStream;
    setLocalStream(camStream);

    for (const pc of pcsRef.current.values()) {
      const sender = pc.getSenders().find((sn) => sn.track?.kind === "video");
      const camTrack = camStream.getVideoTracks()[0];
      if (sender && camTrack) await sender.replaceTrack(camTrack);
    }
  };

  const kick = async (targetId: string) => {
    if (!user) return;
    if (!isHost) return;
    await channelRef.current?.send({
      type: "broadcast",
      event: "signal",
      payload: { type: "kick", from: user.id, to: targetId } satisfies SignalMessage,
    });
  };

  const requestMute = async (targetId: string) => {
    if (!user) return;
    if (!isHost) return;
    await channelRef.current?.send({
      type: "broadcast",
      event: "signal",
      payload: { type: "mute_request", from: user.id, to: targetId } satisfies SignalMessage,
    });
  };

  const leave = async () => {
    await closeAll();
    toast.message("Left the room");
  };

  useEffect(() => {
    if (!user) return;
    if (!liveClass.room_id) {
      toast.error("Room is not configured");
      return;
    }

    let cancelled = false;

    const start = async () => {
      try {
        await ensureLocalMedia();
        if (cancelled) return;

        const channel = supabase.channel(topic, {
          config: {
            presence: { key: user.id },
          },
        });
        channelRef.current = channel;

        channel
          .on("presence", { event: "sync" }, () => syncPeersFromPresence(channel))
          .on("presence", { event: "join" }, () => syncPeersFromPresence(channel))
          .on("presence", { event: "leave" }, () => syncPeersFromPresence(channel))
          .on("broadcast", { event: "signal" }, ({ payload }) => {
            void handleSignal(payload as SignalMessage);
          });

        channel.subscribe(async (status) => {
          if (status !== "SUBSCRIBED") return;
          await channel.track({
            user_id: user.id,
            name: user.name,
            role: user.role,
            joined_at: new Date().toISOString(),
            audio_muted: audioMuted,
            video_off: videoOff,
          } satisfies PresenceState);
        });
      } catch (e: any) {
        toast.error(e?.message ?? "Could not start room");
      }
    };

    void start();

    return () => {
      cancelled = true;
      void closeAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic, user?.id]);

  const participantList = useMemo(() => {
    return Object.values(peers).sort((a, b) => a.name.localeCompare(b.name));
  }, [peers]);

  const tiles = useMemo(() => {
    const remoteEntries = Object.entries(remoteStreams);
    const count = 1 + remoteEntries.length;
    const cols = count <= 1 ? "grid-cols-1" : count <= 2 ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3";
    return { remoteEntries, cols };
  }, [remoteStreams]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Brightoria Live Room</Badge>
          <Badge variant="outline" className="capitalize">
            {liveClass.status}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={toggleMic}>
            <MicOff className="h-4 w-4" />
            {audioMuted ? "Unmute" : "Mute"}
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={toggleCamera}>
            <VideoOff className="h-4 w-4" />
            {videoOff ? "Camera on" : "Camera off"}
          </Button>
          {isHost ? (
            <Button variant="secondary" size="sm" className="gap-2" onClick={isSharing ? stopScreenShare : startScreenShare}>
              <MonitorUp className="h-4 w-4" />
              {isSharing ? "Stop share" : "Share screen"}
            </Button>
          ) : null}
          <Button variant="destructive" size="sm" className="gap-2" onClick={leave}>
            <PhoneOff className="h-4 w-4" />
            Leave
          </Button>
        </div>
      </div>

      <div className={`grid gap-3 ${tiles.cols}`}>
        <div className="aspect-video">
          <VideoTile label="You" muted stream={localStream} />
        </div>
        {tiles.remoteEntries.map(([peerId, stream]) => (
          <div key={peerId} className="aspect-video">
            <VideoTile label={peers[peerId]?.name ?? "Participant"} stream={stream} />
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Participants</p>
          <Badge variant="secondary">{participantList.length}</Badge>
        </div>
        <div className="mt-2 space-y-2">
          {participantList.map((p) => (
            <div key={p.user_id} className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{p.role}</p>
              </div>
              {isHost && user?.id !== p.user_id ? (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => requestMute(p.user_id)}>
                    Request mute
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => kick(p.user_id)}>
                    Kick
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
