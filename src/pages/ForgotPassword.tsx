import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { Mail, ArrowRight, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import brightoriaLogo from "@/assets/brightoria-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  email: z.string().trim().email("Please enter a valid email").max(255, "Email is too long"),
});

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const helper = useMemo(() => {
    if (!email.trim()) return "We’ll send a reset link to your email.";
    const parsed = schema.safeParse({ email });
    return parsed.success ? "Email looks good." : parsed.error.issues[0]?.message;
  }, [email]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Please check your email");
      return;
    }

    setIsLoading(true);
    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo });
      if (error) throw error;

      toast.success("If an account exists, a reset link has been sent.");
    } catch (err: any) {
      // Avoid leaking whether an email exists; still show a generic message
      toast.success("If an account exists, a reset link has been sent.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 hero-gradient relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1519452575417-564c1401ecc0?w=1200')] bg-cover bg-center opacity-10" />
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-[28rem] w-[28rem] rounded-full bg-accent/20 blur-3xl" />
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-center">
          <div className="mb-8 animate-fade-in">
            <img src={brightoriaLogo} alt="Brightoria logo" className="w-20 h-20 object-contain drop-shadow" loading="eager" />
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mb-4 animate-slide-up">
            Reset access
          </h1>
          <p className="text-xl text-primary-foreground/80 max-w-md animate-slide-up stagger-1">
            We’ll email you a secure link to set a new password.
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
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">Forgot password</h2>
              <p className="text-muted-foreground mt-2">Enter your email to receive a reset link</p>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    autoComplete="email"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">{helper}</p>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending link…
                  </>
                ) : (
                  <>
                    Send reset link
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-7">
              Remember your password?{" "}
              <Link to="/login" className="text-primary font-medium hover:underline">
                Back to sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
