// src/components/layout/DashboardShell.tsx
import { LayoutDashboard, AlertCircle, Map, BarChart3, FileText, Settings } from "lucide-react";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const navItems = [
    { name: "Overview", icon: LayoutDashboard },
    { name: "Complaints", icon: AlertCircle },
    { name: "Map View", icon: Map },
    { name: "Analytics", icon: BarChart3 },
    { name: "Reports", icon: FileText },
    { name: "Settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 p-6 flex flex-col">
        <div className="text-xl font-bold mb-10 flex items-center gap-2">
          <div className="bg-primary h-8 w-8 rounded-lg" /> LokPulse AI
        </div>
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => (
            <button key={item.name} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 transition-colors text-slate-600">
              <item.icon size={20} /> {item.name}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}