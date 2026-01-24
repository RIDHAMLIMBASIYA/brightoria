import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Bell, 
  Lock, 
  Palette, 
  Globe, 
  Shield,
  Save
} from 'lucide-react';
import { toast } from 'sonner';
import { ProfileEditorDialog } from '@/components/settings/ProfileEditorDialog';
import { supabase } from '@/integrations/supabase/client';
import { validatePassword } from '@/lib/password';

export default function Settings() {
  const { user, updateUser } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const passwordHelperText = useMemo(() => {
    if (!newPassword) return 'Use at least 12 chars with upper/lowercase, a number, and a symbol.';
    const err = validatePassword(newPassword);
    return err ?? 'Password looks good.';
  }, [newPassword]);

  const handleSave = () => {
    toast.info('Profile changes are saved automatically. Preferences will be available soon.');
  };

  const handlePasswordUpdate = async () => {
    if (!user) return;

    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in the new password fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast.success('Password updated successfully');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
          Settings ⚙️
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and preferences
        </p>
      </div>

      {/* Profile Section */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 mb-6">
          <User className="w-5 h-5 text-primary" />
          <h2 className="font-display font-semibold text-lg">Profile Information</h2>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-start gap-6">
          <div className="flex-shrink-0">
            <img
              src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`}
              alt={user?.name}
              className="w-20 h-20 rounded-xl ring-2 ring-border"
            />
            {user && (
              <div className="mt-3">
                <ProfileEditorDialog
                  user={user}
                  triggerLabel="Change"
                  onProfileUpdated={(patch) => updateUser(patch)}
                />
              </div>
            )}
          </div>
          
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={user?.name || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" value={user?.email || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <div className="flex items-center gap-2 h-10">
                <Badge variant="default" className="capitalize">
                  {user?.role}
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Member Since</Label>
              <p className="text-sm text-muted-foreground h-10 flex items-center">
                {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-5 h-5 text-primary" />
          <h2 className="font-display font-semibold text-lg">Notifications</h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Email Notifications</p>
              <p className="text-sm text-muted-foreground">Receive updates about your courses</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Assignment Reminders</p>
              <p className="text-sm text-muted-foreground">Get notified before deadlines</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Quiz Results</p>
              <p className="text-sm text-muted-foreground">Notifications when grades are available</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Marketing Emails</p>
              <p className="text-sm text-muted-foreground">New courses and platform updates</p>
            </div>
            <Switch />
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 mb-6">
          <Lock className="w-5 h-5 text-primary" />
          <h2 className="font-display font-semibold text-lg">Security</h2>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
              <p className="text-xs text-muted-foreground">{passwordHelperText}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>
          
          <Button
            variant="outline"
            className="mt-2"
            onClick={handlePasswordUpdate}
            disabled={isUpdatingPassword}
          >
            {isUpdatingPassword ? 'Updating…' : 'Update Password'}
          </Button>
        </div>

        <Separator className="my-6" />

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium flex items-center gap-2">
              <Shield className="w-4 h-4 text-success" />
              Two-Factor Authentication
            </p>
            <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
          </div>
          <Button variant="outline">Enable 2FA</Button>
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 mb-6">
          <Palette className="w-5 h-5 text-primary" />
          <h2 className="font-display font-semibold text-lg">Preferences</h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Language
              </p>
              <p className="text-sm text-muted-foreground">Select your preferred language</p>
            </div>
            <select className="h-10 rounded-lg border border-border bg-background px-3 text-sm">
              <option>English</option>
              <option>Spanish</option>
              <option>French</option>
            </select>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} className="gap-2">
          <Save className="w-4 h-4" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}
