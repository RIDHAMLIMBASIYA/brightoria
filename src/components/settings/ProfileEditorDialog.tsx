import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload } from "lucide-react";

type User = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
};

interface ProfileEditorDialogProps {
  user: User;
  onProfileUpdated: (patch: { name?: string; avatar?: string; email?: string }) => void;
  triggerLabel?: string;
}

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5MB

export function ProfileEditorDialog({ user, onProfileUpdated, triggerLabel = "Edit" }: ProfileEditorDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const avatarSrc = useMemo(
    () => user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`,
    [user.avatar, user.name]
  );

  useEffect(() => {
    if (!open) return;
    setName(user.name);
    setEmail(user.email);
  }, [open, user.name, user.email]);

  const pickAvatar = () => fileRef.current?.click();

  const uploadAvatar = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("Avatar image must be 5MB or smaller.");
      return;
    }

    setIsUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const objectPath = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(objectPath, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(objectPath);
      const publicUrl = data.publicUrl;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      onProfileUpdated({ avatar: publicUrl });
      toast.success("Avatar updated.");
    } catch (e: any) {
      toast.error(e?.message || "Failed to upload avatar.");
    } finally {
      setIsUploading(false);
    }
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // allow re-selecting the same file
    e.target.value = "";
    if (!file) return;
    await uploadAvatar(file);
  };

  const saveName = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Name cannot be empty.");
      return;
    }

    const nextEmail = email.trim();
    const emailChanged = nextEmail && nextEmail !== user.email;
    const basicEmailOk = !emailChanged || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail);
    if (!basicEmailOk) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ name: trimmed })
        .eq("user_id", user.id);

      if (error) throw error;

      if (emailChanged) {
        const { error: emailError } = await supabase.auth.updateUser({ email: nextEmail });
        if (emailError) throw emailError;
      }

      onProfileUpdated({ name: trimmed, ...(emailChanged ? { email: nextEmail } : {}) });
      toast.success(emailChanged ? "Profile updated. Please confirm your new email." : "Profile updated.");
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-[96px_1fr] gap-4 items-start">
          <div className="space-y-3">
            <img
              src={avatarSrc}
              alt={`${user.name} avatar`}
              className="w-24 h-24 rounded-xl ring-2 ring-border object-cover"
            />
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFileChange}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-full gap-2"
              onClick={pickAvatar}
              disabled={isUploading}
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Change
            </Button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Full Name</Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              <p className="text-xs text-muted-foreground">If you change your email, you may need to confirm it via inbox.</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={saveName} disabled={isSaving || isUploading} className="gap-2">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
