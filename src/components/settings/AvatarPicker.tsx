import { Loader2, Shuffle, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";

interface AvatarPickerProps {
  presetAvatars: string[];
  currentAvatar: string;
  isUploading?: boolean;
  isSettingPresetAvatar?: boolean;
  onSelectAvatar: (url: string) => void;
  onUploadClick: () => void;
  onShuffle: () => void;
}

export function AvatarPicker({
  presetAvatars,
  currentAvatar,
  isUploading,
  isSettingPresetAvatar,
  onSelectAvatar,
  onUploadClick,
  onShuffle,
}: AvatarPickerProps) {
  const isBusy = Boolean(isUploading || isSettingPresetAvatar);

  return (
    <div className="flex-1 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Avatar</p>
          <p className="text-xs text-muted-foreground">Choose a preset or upload your own.</p>
        </div>

        <Button type="button" variant="outline" size="sm" onClick={onShuffle} disabled={isBusy} className="gap-2">
          <Shuffle className="h-4 w-4" />
          Shuffle
        </Button>
      </div>

      <p className="text-xs font-medium text-muted-foreground">Choose an avatar</p>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 max-h-64 overflow-y-auto pr-1">
        {presetAvatars.map((url) => {
          const selected = currentAvatar === url;
          return (
            <button
              key={url}
              type="button"
              onClick={() => onSelectAvatar(url)}
              disabled={isBusy}
              className={
                "relative h-16 w-16 overflow-hidden rounded-xl ring-1 ring-border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60" +
                (selected ? " ring-2 ring-primary" : " hover:ring-2 hover:ring-ring")
              }
              aria-label={selected ? "Selected avatar" : "Select avatar"}
            >
              <img src={url} alt="Preset avatar" className="h-full w-full object-cover" loading="lazy" />
              {selected ? <span className="sr-only">Selected</span> : null}
            </button>
          );
        })}
      </div>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="w-full sm:w-auto gap-2"
        onClick={onUploadClick}
        disabled={isBusy}
      >
        {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        Upload avatar
      </Button>
    </div>
  );
}
