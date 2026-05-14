import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Layout, Palette, Sparkles, Clock, Hammer, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_app/admin/templates")({ component: AdminTemplates });

function AdminTemplates() {
  const categories = [
    { name: "Financial Audits", icon: Palette, status: "Planned" },
    { name: "Compliance Reports", icon: Layout, status: "Planned" },
    { name: "Executive Briefings", icon: Sparkles, status: "Planned" },
  ];

  return (
    <div className="max-w-5xl mx-auto py-10 px-6">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-100 text-[10px] font-bold uppercase tracking-widest mb-4">
          <Hammer className="h-3 w-3" /> Construction Under Progress
        </div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-4">
          Global Report Templates
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
          The Report preparation processes is being improved. A dynamic report drafting engine is under Construction.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {categories.map((cat, idx) => (
          <motion.div
            key={cat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card className="relative overflow-hidden border-slate-200 bg-white group hover:shadow-xl transition-all duration-500">
              <div className="absolute top-0 left-0 w-1 h-full bg-slate-100 group-hover:bg-blue-500 transition-colors" />
              <CardContent className="pt-8 pb-6 px-6">
                <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-400 grid place-items-center mb-6 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                  <cat.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{cat.name}</h3>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                  <Clock className="h-3 w-3" /> Under Construction
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="bg-slate-900 border-none shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <CardContent className="p-10 relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-lg text-center md:text-left">
            <h2 className="text-2xl font-bold text-white mb-3">Customization is currently per-project</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              While we build the global library, you can still upload and manage specific PowerPoint and Word templates directly within each project's <strong>Overview</strong> tab.
            </p>
          </div>
          <div className="shrink-0">
            <div className="px-6 py-3 rounded-full bg-white/5 border border-white/10 text-white text-sm font-bold flex items-center gap-2">
              Next Update coming soon <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}