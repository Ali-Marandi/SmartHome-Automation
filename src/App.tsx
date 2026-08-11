import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Lightbulb, 
  Thermometer, 
  ShieldCheck, 
  Settings, 
  Cpu, 
  Zap,
  MessageSquare,
  Bell,
  Send,
  AlertTriangle,
  Activity
} from 'lucide-react';
import { CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis } from 'recharts';

const data = [
  { name: '00:00', usage: 400 },
  { name: '04:00', usage: 300 },
  { name: '08:00', usage: 900 },
  { name: '12:00', usage: 1200 },
  { name: '16:00', usage: 1500 },
  { name: '20:00', usage: 1800 },
  { name: '23:59', usage: 600 },
];

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('Welcome to SmartHome Pro AI. How can I assist you today?');

  const handleAiQuery = () => {
    if (!aiPrompt) return;
    setAiResponse("Processing via local LLM...");
    // Simulate Tauri invoke
    setTimeout(() => {
        setAiResponse(`Intent recognized: "${aiPrompt}". Executing local automation sequence...`);
        setAiPrompt('');
    }, 1000);
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900/50 border-r border-slate-800 flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Cpu size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">SmartHome <span className="text-blue-500">Pro</span></h1>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-2">
          <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavItem icon={<Activity size={20} />} label="System Health" active={activeTab === 'health'} onClick={() => setActiveTab('health')} />
          <NavItem icon={<Zap size={20} />} label="Energy" active={activeTab === 'energy'} onClick={() => setActiveTab('energy')} />
          <NavItem icon={<MessageSquare size={20} />} label="AI Assistant" active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} />
          <NavItem icon={<ShieldCheck size={20} />} label="Security" active={activeTab === 'security'} onClick={() => setActiveTab('security')} />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <NavItem icon={<Settings size={20} />} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-900/20 backdrop-blur-md">
          <h2 className="text-lg font-semibold capitalize">{activeTab}</h2>
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-slate-800 rounded-full relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-slate-900"></span>
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
              <div className="text-right">
                <p className="text-sm font-medium">Enterprise User</p>
                <p className="text-xs text-slate-400">Admin</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                AU
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-8">
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label="Total Devices" value="42" change="+3 this week" icon={<Cpu className="text-blue-500" />} />
                <StatCard label="Active Energy" value="2.4 kW" change="-12% vs yesterday" icon={<Zap className="text-yellow-500" />} />
                <StatCard label="System Health" value="98%" change="Optimal" icon={<Activity className="text-green-500" />} />
                <StatCard label="Security Status" value="Armed" change="All clear" icon={<ShieldCheck className="text-red-500" />} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold">Energy Usage Overview</h3>
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data}>
                        <defs>
                          <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                          itemStyle={{ color: '#3b82f6' }}
                        />
                        <Area type="monotone" dataKey="usage" stroke="#3b82f6" fillOpacity={1} fill="url(#colorUsage)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold mb-6">Predictive Alerts</h3>
                  <div className="space-y-4">
                    <AlertItem type="warning" title="AC Unit Efficiency" description="Vibration anomaly detected. Maintenance recommended in 5 days." />
                    <AlertItem type="info" title="System Update" description="Local LLM weights updated to v2.4." />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="h-full flex flex-col max-w-4xl mx-auto bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                <div className="bg-slate-800/50 p-4 rounded-2xl rounded-tl-none max-w-[80%]">
                    <p className="text-sm text-blue-400 font-bold mb-1">SmartHome AI</p>
                    <p>{aiResponse}</p>
                </div>
              </div>
              <div className="p-4 border-t border-slate-800 flex gap-4">
                <input 
                    type="text" 
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAiQuery()}
                    placeholder="Ask SmartHome AI (e.g., 'Optimize energy for tonight')"
                    className="flex-1 bg-slate-800 border-none rounded-xl px-4 py-3 outline-none focus:ring-2 ring-blue-500"
                />
                <button 
                    onClick={handleAiQuery}
                    className="bg-blue-600 hover:bg-blue-700 p-3 rounded-xl transition-colors"
                >
                    <Send size={20} />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'health' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <HealthCard name="Main HVAC" status="Warning" score={68} issues={["Bearing Vibration", "Filter Clog"]} />
                <HealthCard name="Smart Fridge" status="Optimal" score={94} issues={[]} />
                <HealthCard name="Security Gateway" status="Optimal" score={99} issues={[]} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

const NavItem = ({ icon, label, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
  >
    {icon}
    <span className="font-medium">{label}</span>
  </button>
);

const StatCard = ({ label, value, change, icon }: any) => (
  <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
    <div className="flex items-center justify-between mb-4">
      <div className="p-2 bg-slate-800 rounded-lg">{icon}</div>
      <span className="text-xs font-medium text-green-500 bg-green-500/10 px-2 py-1 rounded-full">{change}</span>
    </div>
    <p className="text-sm text-slate-400">{label}</p>
    <p className="text-2xl font-bold mt-1">{value}</p>
  </div>
);

const AlertItem = ({ type, title, description }: any) => (
  <div className={`p-4 rounded-xl border ${type === 'warning' ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-blue-500/5 border-blue-500/20'} flex gap-3`}>
    <AlertTriangle size={18} className={type === 'warning' ? 'text-yellow-500' : 'text-blue-500'} />
    <div>
      <h4 className="text-sm font-bold">{title}</h4>
      <p className="text-xs text-slate-400 mt-1">{description}</p>
    </div>
  </div>
);

const HealthCard = ({ name, status, score, issues }: any) => (
    <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
        <div className="flex justify-between items-start mb-6">
            <div>
                <h3 className="text-lg font-bold">{name}</h3>
                <p className={`text-sm ${status === 'Optimal' ? 'text-green-500' : 'text-yellow-500'}`}>{status}</p>
            </div>
            <div className="text-right">
                <p className="text-3xl font-black">{score}%</p>
                <p className="text-xs text-slate-500 uppercase">Health Score</p>
            </div>
        </div>
        <div className="w-full bg-slate-800 h-2 rounded-full mb-6">
            <div className={`h-full rounded-full ${score > 80 ? 'bg-green-500' : 'bg-yellow-500'}`} style={{ width: `${score}%` }}></div>
        </div>
        {issues.length > 0 && (
            <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase">Detected Issues</p>
                {issues.map((issue: string) => (
                    <div key={issue} className="flex items-center gap-2 text-sm text-slate-300">
                        <div className="w-1 h-1 bg-red-500 rounded-full"></div>
                        {issue}
                    </div>
                ))}
            </div>
        )}
    </div>
);

export default App;
