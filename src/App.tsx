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
  Bell
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
          <NavItem icon={<Lightbulb size={20} />} label="Devices" active={activeTab === 'devices'} onClick={() => setActiveTab('devices')} />
          <NavItem icon={<Thermometer size={20} />} label="Climate" active={activeTab === 'climate'} onClick={() => setActiveTab('climate')} />
          <NavItem icon={<Zap size={20} />} label="Energy" active={activeTab === 'energy'} onClick={() => setActiveTab('energy')} />
          <NavItem icon={<ShieldCheck size={20} />} label="Security" active={activeTab === 'security'} onClick={() => setActiveTab('security')} />
          <NavItem icon={<MessageSquare size={20} />} label="AI Assistant" active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} />
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

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard label="Total Devices" value="42" change="+3 this week" icon={<Cpu className="text-blue-500" />} />
            <StatCard label="Active Energy" value="2.4 kW" change="-12% vs yesterday" icon={<Zap className="text-yellow-500" />} />
            <StatCard label="Average Temp" value="22.5°C" change="Optimal" icon={<Thermometer className="text-green-500" />} />
            <StatCard label="Security Status" value="Armed" change="All clear" icon={<ShieldCheck className="text-red-500" />} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Energy Usage Overview</h3>
                <select className="bg-slate-800 border-none rounded-md text-sm px-3 py-1 outline-none">
                  <option>Last 24 Hours</option>
                  <option>Last 7 Days</option>
                </select>
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
              <h3 className="text-lg font-semibold mb-6">Recent Activity</h3>
              <div className="space-y-4">
                <ActivityItem time="2 mins ago" text="Living Room Light turned on" type="device" />
                <ActivityItem time="15 mins ago" text="Motion detected in Garage" type="security" />
                <ActivityItem time="1 hour ago" text="AC scheduled to 22°C" type="climate" />
                <ActivityItem time="2 hours ago" text="System backup completed" type="system" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <DeviceControl name="Smart TV" room="Living Room" status="Online" icon={<LayoutDashboard />} color="blue" />
            <DeviceControl name="Main AC" room="Master Bedroom" status="Offline" icon={<Thermometer />} color="slate" />
            <DeviceControl name="Kitchen Lights" room="Kitchen" status="Online" icon={<Lightbulb />} color="yellow" />
          </div>
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
  <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl hover:border-slate-700 transition-colors">
    <div className="flex items-center justify-between mb-4">
      <div className="p-2 bg-slate-800 rounded-lg">{icon}</div>
      <span className="text-xs font-medium text-green-500 bg-green-500/10 px-2 py-1 rounded-full">{change}</span>
    </div>
    <p className="text-sm text-slate-400">{label}</p>
    <p className="text-2xl font-bold mt-1">{value}</p>
  </div>
);

const ActivityItem = ({ time, text }: any) => (
  <div className="flex gap-3">
    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2"></div>
    <div>
      <p className="text-sm text-slate-200">{text}</p>
      <p className="text-xs text-slate-500">{time}</p>
    </div>
  </div>
);

const DeviceControl = ({ name, room, status, icon, color }: any) => (
  <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl flex items-center justify-between group hover:bg-slate-800/50 transition-all">
    <div className="flex items-center gap-4">
      <div className={`p-3 rounded-xl bg-${color}-500/10 text-${color}-500 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <div>
        <h4 className="font-semibold">{name}</h4>
        <p className="text-xs text-slate-500">{room}</p>
      </div>
    </div>
    <div className="flex flex-col items-end">
      <div className={`w-12 h-6 rounded-full p-1 transition-colors ${status === 'Online' ? 'bg-blue-600' : 'bg-slate-700'}`}>
        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${status === 'Online' ? 'translate-x-6' : ''}`}></div>
      </div>
      <span className="text-[10px] mt-1 text-slate-500 uppercase tracking-widest">{status}</span>
    </div>
  </div>
);

export default App;
