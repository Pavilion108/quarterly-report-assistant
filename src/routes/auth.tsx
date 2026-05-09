import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Lock, Mail, User, Sparkles, ShieldCheck, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [tab, setTab] = useState("signin");

  useEffect(() => {
    if (user) navigate({ to: "/dashboard" });
  }, [user, navigate]);

  const signIn = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    navigate({ to: "/dashboard" });
  };

  const signUp = async () => {
    if (!email.endsWith("@dkothary.com")) {
      return toast.error("Registration is restricted to @dkothary.com email addresses only.");
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name }, emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account created. You can sign in now.");
    setTab("signin");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (tab === "signin") signIn();
      else signUp();
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4" onKeyDown={handleKeyDown}>
      {/* ── Animated Background ── */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950" />
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating orbs */}
        <motion.div
          className="absolute w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl"
          animate={{ x: [0, 80, 0], y: [0, -60, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          style={{ top: "-10%", left: "-5%" }}
        />
        <motion.div
          className="absolute w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl"
          animate={{ x: [0, -60, 0], y: [0, 80, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          style={{ bottom: "-10%", right: "-5%" }}
        />
        <motion.div
          className="absolute w-64 h-64 rounded-full bg-violet-500/8 blur-3xl"
          animate={{ x: [0, 40, 0], y: [0, 40, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          style={{ top: "40%", left: "50%" }}
        />
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px"
          }}
        />
      </div>

      {/* ── Auth Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Glassmorphism card */}
        <div className="backdrop-blur-xl bg-white/[0.07] border border-white/[0.12] rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-8 pb-4 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 grid place-items-center mb-5 shadow-lg shadow-indigo-500/25"
            >
              <ShieldCheck className="h-7 w-7 text-white" />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold text-white tracking-tight"
            >
              DKC Tracker
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-sm text-slate-400 mt-1"
            >
              Secure access to your quarterly reports
            </motion.p>
          </div>

          {/* Tab Content */}
          <div className="px-8 pb-8">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid grid-cols-2 w-full bg-white/[0.06] border border-white/[0.08] rounded-lg h-11 mb-6">
                <TabsTrigger
                  value="signin"
                  className="rounded-md text-sm font-medium text-slate-400 data-[state=active]:bg-white/[0.12] data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
                >
                  Sign in
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="rounded-md text-sm font-medium text-slate-400 data-[state=active]:bg-white/[0.12] data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
                >
                  Create account
                </TabsTrigger>
              </TabsList>

              <AnimatePresence mode="wait">
                <TabsContent value="signin" className="mt-0" key="signin">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    {/* Email */}
                    <div className="space-y-2">
                      <Label className="text-slate-300 text-sm font-medium">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input
                          id="signin-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@dkothary.com"
                          className="pl-10 bg-white/[0.06] border-white/[0.1] text-white placeholder:text-slate-500 h-11 rounded-lg focus:border-indigo-400/60 focus:ring-indigo-400/20"
                        />
                      </div>
                    </div>
                    {/* Password */}
                    <div className="space-y-2">
                      <Label className="text-slate-300 text-sm font-medium">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input
                          id="signin-password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="pl-10 pr-11 bg-white/[0.06] border-white/[0.1] text-white placeholder:text-slate-500 h-11 rounded-lg focus:border-indigo-400/60 focus:ring-indigo-400/20"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-0.5"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    {/* Submit */}
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={signIn}
                      disabled={busy}
                      className="w-full h-11 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:from-indigo-400 hover:to-cyan-400 transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50"
                    >
                      {busy ? (
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                      ) : (
                        <>Sign in <ArrowRight className="h-4 w-4" /></>
                      )}
                    </motion.button>
                  </motion.div>
                </TabsContent>

                <TabsContent value="signup" className="mt-0" key="signup">
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    {/* Name */}
                    <div className="space-y-2">
                      <Label className="text-slate-300 text-sm font-medium">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input
                          id="signup-name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your full name"
                          className="pl-10 bg-white/[0.06] border-white/[0.1] text-white placeholder:text-slate-500 h-11 rounded-lg focus:border-indigo-400/60 focus:ring-indigo-400/20"
                        />
                      </div>
                    </div>
                    {/* Email */}
                    <div className="space-y-2">
                      <Label className="text-slate-300 text-sm font-medium">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input
                          id="signup-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@dkothary.com"
                          className="pl-10 bg-white/[0.06] border-white/[0.1] text-white placeholder:text-slate-500 h-11 rounded-lg focus:border-indigo-400/60 focus:ring-indigo-400/20"
                        />
                      </div>
                    </div>
                    {/* Password */}
                    <div className="space-y-2">
                      <Label className="text-slate-300 text-sm font-medium">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input
                          id="signup-password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Min. 6 characters"
                          className="pl-10 pr-11 bg-white/[0.06] border-white/[0.1] text-white placeholder:text-slate-500 h-11 rounded-lg focus:border-indigo-400/60 focus:ring-indigo-400/20"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-0.5"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    {/* Submit */}
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={signUp}
                      disabled={busy}
                      className="w-full h-11 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:from-indigo-400 hover:to-cyan-400 transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50"
                    >
                      {busy ? (
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                      ) : (
                        <>Create account <Sparkles className="h-4 w-4" /></>
                      )}
                    </motion.button>
                    {/* Domain notice */}
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-indigo-500/[0.08] border border-indigo-500/[0.15]">
                      <ShieldCheck className="h-4 w-4 text-indigo-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Only <span className="text-indigo-300 font-medium">@dkothary.com</span> emails are allowed.
                        First registered user becomes Admin. Others start as Member; an Admin can promote to Manager or Partner.
                      </p>
                    </div>
                  </motion.div>
                </TabsContent>
              </AnimatePresence>
            </Tabs>
          </div>
        </div>

        {/* Footer branding */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-xs text-slate-600 mt-6"
        >
          DKC Quarterly Report Tracker · Secured by Supabase
        </motion.p>
      </motion.div>
    </div>
  );
}