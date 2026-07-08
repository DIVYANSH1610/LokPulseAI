from .utils import write_file

def generate_charts(base_dir: str):
    charts_content = """
"use client";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { motion } from "framer-motion";

const radarData = [
  { subject: "Roads", A: 120, fullMark: 150 },
  { subject: "Water", A: 98, fullMark: 150 },
  { subject: "Health", A: 86, fullMark: 150 },
  { subject: "Electricity", A: 99, fullMark: 150 },
  { subject: "Sanitation", A: 85, fullMark: 150 },
  { subject: "Education", A: 65, fullMark: 150 },
];

const areaData = [
  { name: "Jan", reports: 400, resolved: 240 },
  { name: "Feb", reports: 300, resolved: 139 },
  { name: "Mar", reports: 200, resolved: 980 },
  { name: "Apr", reports: 278, resolved: 390 },
  { name: "May", reports: 189, resolved: 480 },
  { name: "Jun", reports: 239, resolved: 380 },
];

export function IssueRadarChart() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className=".card p-6 h-[350px] w-full">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">Issue Density by Category</h3>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: "#64748b", fontSize: 12 }} />
          <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
          <Radar name="Reports" dataKey="A" stroke="#0d9488" fill="#14b8a6" fillOpacity={0.5} />
        </RadarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

export function ResolutionTrendChart() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className=".card p-6 h-[350px] w-full">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">Reports vs. Resolutions</h3>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={areaData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorReports" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0d9488" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
          <Area type="monotone" dataKey="reports" stroke="#f59e0b" fillOpacity={1} fill="url(#colorReports)" />
          <Area type="monotone" dataKey="resolved" stroke="#0d9488" fillOpacity={1} fill="url(#colorResolved)" />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
"""
    write_file(f"{base_dir}/src/components/dashboard/PremiumCharts.tsx", charts_content)