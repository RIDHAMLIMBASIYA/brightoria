import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowRight, Loader2, Lock } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import brightoriaLogo from "@/assets/brightoria-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validatePassword } from "@/lib/password";

const schema = z
  .object({
    password: z.string().min(12, "Password must be at least 12 characters").max(72, "Password is too long"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setHasSession(!!data.session);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setHasSession(!!session);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const helper = useMemo(() => {
    if (!password) return "Use at least 12 chars with upper/lowercase, a number, and a symbol.";
    const err = validatePassword(password);
    return err ?? "Password looks good.";
  }, [password]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = schema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Please check the form");
      return;
    }
    const strengthErr = validatePassword(parsed.data.password);
    if (strengthErr) {
      toast.error(strengthErr);
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
      if (error) throw error;

      toast.success("Password updated. You can sign in now.");
      navigate("/login", { replace: true });
    } catch (err: any) {
      toast.error(err?.message || "Failed to update password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 hero-gradient relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200')] bg-cover bg-center opacity-10" />
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-[28rem] w-[28rem] rounded-full bg-accent/20 blur-3xl" />
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-center">
          <div className="mb-8 animate-fade-in">
            <img src={brightoriaLogo} alt="Brightoria logo" className="w-20 h-20 object-contain drop-shadow" loading="eager" />
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mb-4 animate-slide-up">
            Set a new password
          </h1>
          <p className="text-xl text-primary-foreground/80 max-w-md animate-slide-up stagger-1">
            Choose a strong password to secure your account.
          </p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-background">
        <div className="w-full max-w-md animate-scale-in">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <img src={brightoriaLogo} alt="Brightoria logo" className="w-16 h-16 object-contain drop-shadow" loading="eager" />
            <h1 className="font-display text-2xl font-bold text-foreground">Brightoria</h1>
          </div>

          <div className="glass-card rounded-2xl p-6 md:p-7 shadow-elegant border border-border/60">
            <div className="text-center mb-6">
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">Reset password</h2>
              <p className="text-muted-foreground mt-2">
                {hasSession === false
                  ? "This reset link is invalid or expired. Request a new one."
                  : "Enter a new password for your account"}
              </p>
            </div>

            {hasSession === false ? (
              <div className="space-y-4">
                <Button asChild className="w-full" size="lg">
                  <Link to="/forgot-password">
                    Request new link
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  <Link to="/login" className="text-primary font-medium hover:underline">
                    Back to sign in
                  </Link>
                </p>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="password">New password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      autoComplete="new-password"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{helper}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm new password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={isLoading || hasSession === null}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Updating…
                    </>
                  ) : (
                    <>
                      Update password
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  <Link to="/login" className="text-primary font-medium hover:underline">
                    Back to sign in
                  </Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
