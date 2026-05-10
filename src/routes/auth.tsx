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
import { Eye, EyeOff, Lock, Mail, User, ShieldCheck, ArrowRight, Building2 } from "lucide-react";

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
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4 bg-slate-50 font-sans" onKeyDown={handleKeyDown}>
      {/* ── Classical Modern Background ── */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-200 via-slate-50 to-white" />
      <div className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: "radial-gradient(#000 1px, transparent 1px)",
          backgroundSize: "24px 24px"
        }}
      />
      
      {/* Abstract architectural elements for CA firm vibe */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-slate-100/50 -skew-x-12 origin-top-right transform translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-1/4 h-1/2 bg-slate-100/50 skew-x-12 origin-bottom-left transform -translate-x-1/4" />

      {/* ── Auth Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[420px]"
      >
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-10 pb-6 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-12 h-12 rounded-lg bg-slate-900 grid place-items-center mb-6 shadow-md"
            >
              <Building2 className="h-6 w-6 text-white" />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold text-slate-900 tracking-tight"
            >
              DKC Tracker
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-sm text-slate-500 mt-2 font-medium"
            >
              Secure Audit & Compliance Portal
            </motion.p>
          </div>

          {/* Tab Content */}
          <div className="px-8 pb-10">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid grid-cols-2 w-full bg-slate-100/80 p-1 rounded-lg mb-8">
                <TabsTrigger
                  value="signin"
                  className="rounded-md text-sm font-semibold text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all py-2"
                >
                  Sign in
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="rounded-md text-sm font-semibold text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all py-2"
                >
                  Create account
                </TabsTrigger>
              </TabsList>

              <AnimatePresence mode="wait">
                <TabsContent value="signin" className="mt-0 outline-none" key="signin">
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-5"
                  >
                    {/* Email */}
                    <div className="space-y-2">
                      <Label className="text-slate-700 text-sm font-semibold">Corporate Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="signin-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@dkothary.com"
                          className="pl-10 h-12 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-lg focus:border-slate-400 focus:ring-slate-400/20 shadow-sm transition-all"
                        />
                      </div>
                    </div>
                    {/* Password */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-slate-700 text-sm font-semibold">Password</Label>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="signin-password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="pl-10 pr-12 h-12 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-lg focus:border-slate-400 focus:ring-slate-400/20 shadow-sm transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    {/* Submit */}
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={signIn}
                      disabled={busy}
                      className="w-full h-12 mt-2 rounded-lg bg-slate-900 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {busy ? (
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                      ) : (
                        <>Sign in to Portal <ArrowRight className="h-4 w-4" /></>
                      )}
                    </motion.button>
                  </motion.div>
                </TabsContent>

                <TabsContent value="signup" className="mt-0 outline-none" key="signup">
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-5"
                  >
                    {/* Name */}
                    <div className="space-y-2">
                      <Label className="text-slate-700 text-sm font-semibold">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="signup-name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your full name"
                          className="pl-10 h-12 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-lg focus:border-slate-400 focus:ring-slate-400/20 shadow-sm transition-all"
                        />
                      </div>
                    </div>
                    {/* Email */}
                    <div className="space-y-2">
                      <Label className="text-slate-700 text-sm font-semibold">Corporate Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="signup-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@dkothary.com"
                          className="pl-10 h-12 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-lg focus:border-slate-400 focus:ring-slate-400/20 shadow-sm transition-all"
                        />
                      </div>
                    </div>
                    {/* Password */}
                    <div className="space-y-2">
                      <Label className="text-slate-700 text-sm font-semibold">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="signup-password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Min. 6 characters"
                          className="pl-10 pr-12 h-12 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-lg focus:border-slate-400 focus:ring-slate-400/20 shadow-sm transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    {/* Submit */}
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={signUp}
                      disabled={busy}
                      className="w-full h-12 mt-2 rounded-lg bg-slate-900 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {busy ? (
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                      ) : (
                        <>Request Access <ArrowRight className="h-4 w-4" /></>
                      )}
                    </motion.button>
                    {/* Domain notice */}
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <ShieldCheck className="h-5 w-5 text-slate-700 shrink-0" />
                      <p className="text-[13px] text-slate-600 leading-relaxed font-medium">
                        Access is restricted to <span className="text-slate-900 font-bold">@dkothary.com</span> domains.
                        New accounts require administrative approval before portal access is granted.
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
          className="text-center text-xs text-slate-400 mt-6 font-medium"
        >
          © {new Date().getFullYear()} DKC & Associates. All rights reserved.
        </motion.p>
      </motion.div>
    </div>
  );
}