import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  Bot,
  Check,
  ChevronRight,
  CircleHelp,
  CloudOff,
  Command,
  Cpu,
  DoorClosed,
  Fan,
  Gauge,
  Home,
  KeyRound,
  Lightbulb,
  Link2,
  Lock,
  Menu,
  Moon,
  MoreHorizontal,
  PanelTop,
  Play,
  Plus,
  Power,
  Radio,
  RefreshCw,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Thermometer,
  SunMoon,
  LayoutTemplate,
  RotateCcw,
  GripVertical,
  Wifi,
  X,
  Zap,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type View = 'overview' | 'devices' | 'automations' | 'energy' | 'security' | 'settings';
type DeviceKind = 'light' | 'climate' | 'security' | 'sensor' | 'switch' | 'cover' | 'lock';

type Device = {
  id: string;
  name: string;
  room: string;
  kind: DeviceKind;
  state: 'on' | 'off' | 'unavailable' | 'locked' | 'open' | 'closed';
  detail: string;
  usage: number;
  source: 'Demo home' | 'Home Assistant';
  lastChanged?: string;
};

type HomeAssistantEntity = {
  entity_id: string;
  state: string;
  name: string;
  domain: string;
  last_changed: string;
  attributes: Record<string, unknown>;
};

type IntegrationStatus = {
  connected: boolean;
  host?: string;
  version?: string;
  message: string;
};

type ToastTone = 'success' | 'error' | 'info';
type Toast = { tone: ToastTone; message: string } | null;
type ThemeMode = 'system' | 'light' | 'dark';
type WidgetId = 'status' | 'energy' | 'forecast' | 'activity' | 'favorites';

type WidgetPreference = {
  id: WidgetId;
  enabled: boolean;
};

type EnergySample = {
  timestamp: string;
  hour: number;
  usageKw: number;
};

type ForecastPoint = {
  hour: number;
  predictedKw: number;
  lowerKw: number;
  upperKw: number;
  sourceSamples: number;
};

type EnergyForecast = {
  methodology: string;
  confidence: number;
  observationCount: number;
  forecast: ForecastPoint[];
  totalKwh: number;
  dataQualityNote: string;
};

const WIDGET_PREFERENCE_KEY = 'horizon.dashboard.widgets.v1';
const THEME_PREFERENCE_KEY = 'horizon.theme.v1';
const defaultWidgets: WidgetPreference[] = [
  { id: 'status', enabled: true },
  { id: 'energy', enabled: true },
  { id: 'forecast', enabled: true },
  { id: 'activity', enabled: true },
  { id: 'favorites', enabled: true },
];

const widgetLabels: Record<WidgetId, { title: string; detail: string }> = {
  status: { title: 'Home health', detail: 'Core status and active-device metrics' },
  energy: { title: 'Energy flow', detail: 'Live consumption and daily profile' },
  forecast: { title: 'Energy forecast', detail: 'Next-24-hour local adaptive forecast' },
  activity: { title: 'Live activity', detail: 'Recent home and automation events' },
  favorites: { title: 'Favorite devices', detail: 'Fast controls for selected devices' },
};

const demoEnergySamples: EnergySample[] = [
  { timestamp: '2026-08-16T00:00:00Z', hour: 0, usageKw: 0.91 },
  { timestamp: '2026-08-16T03:00:00Z', hour: 3, usageKw: 0.75 },
  { timestamp: '2026-08-16T06:00:00Z', hour: 6, usageKw: 0.82 },
  { timestamp: '2026-08-16T09:00:00Z', hour: 9, usageKw: 1.67 },
  { timestamp: '2026-08-16T12:00:00Z', hour: 12, usageKw: 2.31 },
  { timestamp: '2026-08-16T15:00:00Z', hour: 15, usageKw: 2.47 },
  { timestamp: '2026-08-16T18:00:00Z', hour: 18, usageKw: 2.02 },
  { timestamp: '2026-08-16T21:00:00Z', hour: 21, usageKw: 1.46 },
  { timestamp: '2026-08-17T00:00:00Z', hour: 0, usageKw: 0.88 },
  { timestamp: '2026-08-17T03:00:00Z', hour: 3, usageKw: 0.71 },
  { timestamp: '2026-08-17T06:00:00Z', hour: 6, usageKw: 0.86 },
  { timestamp: '2026-08-17T09:00:00Z', hour: 9, usageKw: 1.73 },
  { timestamp: '2026-08-17T12:00:00Z', hour: 12, usageKw: 2.42 },
  { timestamp: '2026-08-17T15:00:00Z', hour: 15, usageKw: 2.18 },
  { timestamp: '2026-08-17T18:00:00Z', hour: 18, usageKw: 1.96 },
  { timestamp: '2026-08-17T21:00:00Z', hour: 21, usageKw: 1.38 },
];

const energyData = [
  { time: '00:00', usage: 0.92 },
  { time: '04:00', usage: 0.74 },
  { time: '08:00', usage: 1.82 },
  { time: '12:00', usage: 2.44 },
  { time: '16:00', usage: 2.16 },
  { time: '20:00', usage: 1.96 },
  { time: 'Now', usage: 1.38 },
];

const initialDevices: Device[] = [
  {
    id: 'light.living_room',
    name: 'Living room lights',
    room: 'Living room',
    kind: 'light',
    state: 'on',
    detail: '68% brightness · Warm white',
    usage: 0.08,
    source: 'Demo home',
  },
  {
    id: 'climate.main',
    name: 'Main climate',
    room: 'Ground floor',
    kind: 'climate',
    state: 'on',
    detail: '21.5°C · Auto comfort',
    usage: 1.12,
    source: 'Demo home',
  },
  {
    id: 'lock.front_door',
    name: 'Front door',
    room: 'Entry',
    kind: 'lock',
    state: 'locked',
    detail: 'Locked · Last checked now',
    usage: 0,
    source: 'Demo home',
  },
  {
    id: 'switch.coffee_station',
    name: 'Coffee station',
    room: 'Kitchen',
    kind: 'switch',
    state: 'off',
    detail: 'Standby · 0 W',
    usage: 0,
    source: 'Demo home',
  },
  {
    id: 'sensor.air_quality',
    name: 'Indoor air quality',
    room: 'Bedroom',
    kind: 'sensor',
    state: 'on',
    detail: 'Excellent · PM2.5 4 μg/m³',
    usage: 0,
    source: 'Demo home',
  },
  {
    id: 'cover.garden_shade',
    name: 'Garden shade',
    room: 'Terrace',
    kind: 'cover',
    state: 'closed',
    detail: 'Closed · Wind protection on',
    usage: 0,
    source: 'Demo home',
  },
];

const automations = [
  { name: 'Good morning', detail: 'Weekdays · 06:45', action: 'Lights, climate and briefing', enabled: true, icon: Sun },
  { name: 'Away protection', detail: 'When last person leaves', action: 'Arm security and reduce climate', enabled: true, icon: ShieldCheck },
  { name: 'Quiet evening', detail: 'Every day · 22:30', action: 'Dim lights and close shades', enabled: false, icon: Moon },
];

const navigation: Array<{ id: View; label: string; icon: typeof Home }> = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'devices', label: 'Devices', icon: SlidersHorizontal },
  { id: 'automations', label: 'Automations', icon: Sparkles },
  { id: 'energy', label: 'Energy', icon: Zap },
  { id: 'security', label: 'Security', icon: ShieldCheck },
];

const isActive = (device: Device) => device.state === 'on' || device.state === 'open';

const formatError = (error: unknown) => (error instanceof Error ? error.message : String(error));

const loadWidgetPreferences = (): WidgetPreference[] => {
  try {
    const stored = window.localStorage.getItem(WIDGET_PREFERENCE_KEY);
    if (!stored) return defaultWidgets;
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return defaultWidgets;
    const ids = new Set(defaultWidgets.map((widget) => widget.id));
    const valid = parsed.filter((item): item is WidgetPreference => (
      typeof item === 'object'
      && item !== null
      && 'id' in item
      && 'enabled' in item
      && typeof item.id === 'string'
      && ids.has(item.id as WidgetId)
      && typeof item.enabled === 'boolean'
    ));
    return valid.length === defaultWidgets.length ? valid : defaultWidgets;
  } catch {
    return defaultWidgets;
  }
};

const loadThemePreference = (): ThemeMode => {
  try {
    const value = window.localStorage.getItem(THEME_PREFERENCE_KEY);
    return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
  } catch {
    return 'system';
  }
};

const fallbackForecast = (): EnergyForecast => ({
  methodology: 'Preview fallback using the bundled demo history',
  confidence: 48,
  observationCount: demoEnergySamples.length,
  totalKwh: 35.31,
  dataQualityNote: 'Demo history is active. Connect a real meter or module before using this forecast for cost decisions.',
  forecast: [
    { hour: 22, predictedKw: 1.18, lowerKw: 1.01, upperKw: 1.35, sourceSamples: 2 },
    { hour: 23, predictedKw: 0.86, lowerKw: 0.72, upperKw: 1.0, sourceSamples: 1 },
    { hour: 0, predictedKw: 0.89, lowerKw: 0.76, upperKw: 1.02, sourceSamples: 2 },
    { hour: 1, predictedKw: 0.79, lowerKw: 0.66, upperKw: 0.92, sourceSamples: 0 },
    { hour: 2, predictedKw: 0.74, lowerKw: 0.61, upperKw: 0.87, sourceSamples: 0 },
    { hour: 3, predictedKw: 0.75, lowerKw: 0.62, upperKw: 0.88, sourceSamples: 2 },
    { hour: 4, predictedKw: 0.76, lowerKw: 0.63, upperKw: 0.89, sourceSamples: 0 },
    { hour: 5, predictedKw: 0.8, lowerKw: 0.67, upperKw: 0.93, sourceSamples: 0 },
    { hour: 6, predictedKw: 0.86, lowerKw: 0.72, upperKw: 1.0, sourceSamples: 2 },
    { hour: 7, predictedKw: 1.1, lowerKw: 0.92, upperKw: 1.28, sourceSamples: 0 },
    { hour: 8, predictedKw: 1.46, lowerKw: 1.2, upperKw: 1.72, sourceSamples: 0 },
    { hour: 9, predictedKw: 1.7, lowerKw: 1.49, upperKw: 1.91, sourceSamples: 2 },
    { hour: 10, predictedKw: 2.03, lowerKw: 1.72, upperKw: 2.34, sourceSamples: 0 },
    { hour: 11, predictedKw: 2.29, lowerKw: 1.91, upperKw: 2.67, sourceSamples: 0 },
    { hour: 12, predictedKw: 2.39, lowerKw: 2.22, upperKw: 2.56, sourceSamples: 2 },
    { hour: 13, predictedKw: 2.42, lowerKw: 2.08, upperKw: 2.76, sourceSamples: 0 },
    { hour: 14, predictedKw: 2.37, lowerKw: 2.02, upperKw: 2.72, sourceSamples: 0 },
    { hour: 15, predictedKw: 2.24, lowerKw: 2.05, upperKw: 2.43, sourceSamples: 2 },
    { hour: 16, predictedKw: 2.14, lowerKw: 1.83, upperKw: 2.45, sourceSamples: 0 },
    { hour: 17, predictedKw: 2.03, lowerKw: 1.73, upperKw: 2.33, sourceSamples: 0 },
    { hour: 18, predictedKw: 1.98, lowerKw: 1.83, upperKw: 2.13, sourceSamples: 2 },
    { hour: 19, predictedKw: 1.74, lowerKw: 1.44, upperKw: 2.04, sourceSamples: 0 },
    { hour: 20, predictedKw: 1.55, lowerKw: 1.27, upperKw: 1.83, sourceSamples: 0 },
    { hour: 21, predictedKw: 1.42, lowerKw: 1.29, upperKw: 1.55, sourceSamples: 2 },
  ],
});

const readAttribute = (entity: HomeAssistantEntity, attribute: string): string | undefined => {
  const value = entity.attributes[attribute];
  return typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;
};

const mapHomeAssistantEntity = (entity: HomeAssistantEntity): Device => {
  const domainMap: Record<string, DeviceKind> = {
    light: 'light',
    switch: 'switch',
    climate: 'climate',
    sensor: 'sensor',
    binary_sensor: 'sensor',
    lock: 'lock',
    cover: 'cover',
  };
  const kind = domainMap[entity.domain] ?? 'sensor';
  const state = entity.state.toLowerCase();
  const activeState: Device['state'] = state === 'on' || state === 'open' || state === 'unlocked'
    ? state === 'unlocked' ? 'open' : state as Device['state']
    : state === 'locked' || state === 'closed' || state === 'off' || state === 'unavailable'
      ? state as Device['state']
      : state === 'unknown' ? 'unavailable' : 'off';
  const temperature = readAttribute(entity, 'current_temperature');
  const brightness = readAttribute(entity, 'brightness');
  const unit = readAttribute(entity, 'unit_of_measurement');
  const detail = temperature
    ? `${temperature}°C · ${entity.state}`
    : brightness
      ? `${Math.round((Number(brightness) / 255) * 100)}% brightness · ${entity.state}`
      : unit
        ? `${entity.state} ${unit}`
        : entity.state.replaceAll('_', ' ');

  return {
    id: entity.entity_id,
    name: entity.name,
    room: readAttribute(entity, 'area_id') ?? 'Home Assistant',
    kind,
    state: activeState,
    detail,
    usage: 0,
    source: 'Home Assistant',
    lastChanged: entity.last_changed,
  };
};

function App() {
  const [view, setView] = useState<View>('overview');
  const [devices, setDevices] = useState<Device[]>(initialDevices);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [connection, setConnection] = useState<IntegrationStatus>({
    connected: false,
    message: 'Demo mode is running locally. Connect a Home Assistant hub when ready.',
  });
  const [toast, setToast] = useState<Toast>(null);
  const [themeMode, setThemeMode] = useState<ThemeMode>(loadThemePreference);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [widgets, setWidgets] = useState<WidgetPreference[]>(loadWidgetPreferences);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [forecast, setForecast] = useState<EnergyForecast>(fallbackForecast);
  const [forecastLoading, setForecastLoading] = useState(true);
  const [forecastSource, setForecastSource] = useState<'local model' | 'preview fallback'>('preview fallback');

  const resolvedTheme = themeMode === 'system' ? (systemDark ? 'dark' : 'light') : themeMode;
  const visibleWidgets = widgets.filter((widget) => widget.enabled);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const syncSystemTheme = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    media.addEventListener('change', syncSystemTheme);
    return () => media.removeEventListener('change', syncSystemTheme);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.horizonTheme = resolvedTheme;
    try {
      window.localStorage.setItem(THEME_PREFERENCE_KEY, themeMode);
    } catch {
      // Theme preference is optional and should never block the desktop UI.
    }
  }, [resolvedTheme, themeMode]);

  useEffect(() => {
    try {
      window.localStorage.setItem(WIDGET_PREFERENCE_KEY, JSON.stringify(widgets));
    } catch {
      // Widget preferences are optional and should never block the desktop UI.
    }
  }, [widgets]);

  const refreshForecast = async () => {
    setForecastLoading(true);
    try {
      const result = await invoke<EnergyForecast>('forecast_energy_usage', { samples: demoEnergySamples, horizonHours: 24 });
      setForecast(result);
      setForecastSource('local model');
    } catch {
      setForecast(fallbackForecast());
      setForecastSource('preview fallback');
    } finally {
      setForecastLoading(false);
    }
  };

  useEffect(() => {
    void refreshForecast();
  }, []);

  const activeDevices = devices.filter(isActive).length;
  const liveUsage = devices.reduce((total, device) => total + (isActive(device) ? device.usage : 0), 0);
  const connectedDevices = devices.filter((device) => device.source === 'Home Assistant').length;

  const showToast = (tone: ToastTone, message: string) => {
    setToast({ tone, message });
    window.setTimeout(() => setToast(null), 4600);
  };

  const importHomeAssistantEntities = async () => {
    const entities = await invoke<HomeAssistantEntity[]>('get_home_assistant_entities');
    const imported = entities.map(mapHomeAssistantEntity);
    setDevices((current) => [...current.filter((device) => device.source !== 'Home Assistant'), ...imported]);
    return imported.length;
  };

  const connectHomeAssistant = async (url: string, token: string) => {
    setLoading(true);
    try {
      const status = await invoke<IntegrationStatus>('connect_home_assistant', { credentials: { url, token } });
      const importedCount = await importHomeAssistantEntities();
      setConnection(status);
      setConnectOpen(false);
      showToast('success', `Connected to ${status.host ?? 'Home Assistant'} and imported ${importedCount} supported entities.`);
    } catch (error) {
      showToast('error', formatError(error));
    } finally {
      setLoading(false);
    }
  };

  const refreshHomeAssistant = async () => {
    if (!connection.connected) {
      setConnectOpen(true);
      return;
    }
    setLoading(true);
    try {
      const count = await importHomeAssistantEntities();
      showToast('success', `Synced ${count} supported entities from ${connection.host ?? 'your hub'}.`);
    } catch (error) {
      showToast('error', formatError(error));
    } finally {
      setLoading(false);
    }
  };

  const toggleDevice = async (device: Device) => {
    if (device.kind === 'sensor') {
      showToast('info', `${device.name} is a read-only sensor.`);
      return;
    }

    const willActivate = !isActive(device);
    const nextState: Device['state'] = device.kind === 'lock'
      ? willActivate ? 'locked' : 'open'
      : device.kind === 'cover'
        ? willActivate ? 'open' : 'closed'
        : willActivate ? 'on' : 'off';

    if (device.source === 'Home Assistant') {
      try {
        await invoke('control_home_assistant_entity', {
          entityId: device.id,
          action: device.kind === 'lock' || device.kind === 'cover' ? 'toggle' : 'toggle',
        });
      } catch (error) {
        showToast('error', formatError(error));
        return;
      }
    }

    setDevices((current) => current.map((item) => item.id === device.id ? { ...item, state: nextState } : item));
    showToast('success', `${device.name} ${isActive({ ...device, state: nextState }) ? 'activated' : 'deactivated'}.`);
  };

  const disconnect = async () => {
    try {
      await invoke('disconnect_home_assistant');
      setConnection({ connected: false, message: 'Home Assistant disconnected. Demo home remains available locally.' });
      setDevices((current) => current.filter((device) => device.source !== 'Home Assistant'));
      showToast('info', 'Home Assistant was disconnected and in-memory credentials were cleared.');
    } catch (error) {
      showToast('error', formatError(error));
    }
  };

  const toggleWidget = (id: WidgetId) => {
    setWidgets((current) => current.map((widget) => widget.id === id ? { ...widget, enabled: !widget.enabled } : widget));
  };

  const moveWidget = (id: WidgetId, direction: -1 | 1) => {
    setWidgets((current) => {
      const index = current.findIndex((widget) => widget.id === id);
      const destination = index + direction;
      if (index < 0 || destination < 0 || destination >= current.length) return current;
      const next = [...current];
      [next[index], next[destination]] = [next[destination], next[index]];
      return next;
    });
  };

  const restoreDashboardDefaults = () => {
    setWidgets(defaultWidgets);
    showToast('success', 'Dashboard widgets were restored to the Horizon default layout.');
  };

  const pageTitle = navigation.find((item) => item.id === view)?.label ?? 'Settings';

  return (
    <div className="app-shell" data-theme={resolvedTheme}>
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><Command size={20} strokeWidth={2.7} /></div>
          <div><strong>Horizon</strong><span>Smart home control</span></div>
          <button className="icon-button mobile-only" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={19} /></button>
        </div>
        <nav className="nav-stack" aria-label="Primary navigation">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item ${view === id ? 'nav-item-active' : ''}`} onClick={() => { setView(id); setMobileOpen(false); }}>
              <Icon size={18} /><span>{label}</span>{id === 'security' && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className={`hub-status ${connection.connected ? 'hub-live' : ''}`}>
            <span className="status-pulse" />
            <div><strong>{connection.connected ? 'Hub connected' : 'Local demo mode'}</strong><span>{connection.connected ? connection.host : 'No cloud account required'}</span></div>
          </div>
          <button className={`nav-item ${view === 'settings' ? 'nav-item-active' : ''}`} onClick={() => setView('settings')}>
            <Settings size={18} /><span>Settings</span>
          </button>
        </div>
      </aside>

      {mobileOpen && <button className="mobile-overlay" aria-label="Close navigation overlay" onClick={() => setMobileOpen(false)} />}

      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-title">
            <button className="icon-button menu-button" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={21} /></button>
            <div><p className="eyebrow">Horizon Home</p><h1>{pageTitle}</h1></div>
          </div>
          <div className="topbar-actions">
            <button className="sync-button" onClick={refreshHomeAssistant} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'spin' : ''} />{connection.connected ? 'Sync hub' : 'Connect hub'}
            </button>
            <button className="icon-button notification-button" aria-label="Notifications"><Bell size={19} /><span /></button>
            <div className="profile-avatar">AM</div>
          </div>
        </header>

        <section className="page-content">
          {view === 'overview' && <Overview devices={devices} activeDevices={activeDevices} liveUsage={liveUsage} connected={connection.connected} widgets={visibleWidgets} forecast={forecast} forecastLoading={forecastLoading} forecastSource={forecastSource} onConnect={() => setConnectOpen(true)} onToggle={toggleDevice} onViewDevices={() => setView('devices')} onCustomize={() => setCustomizeOpen(true)} onRefreshForecast={refreshForecast} />}
          {view === 'devices' && <DevicesPage devices={devices} onToggle={toggleDevice} onConnect={() => setConnectOpen(true)} />}
          {view === 'automations' && <AutomationsPage onNew={() => showToast('info', 'The visual rule builder is scheduled for the next production milestone.')} />}
          {view === 'energy' && <EnergyPage liveUsage={liveUsage} />}
          {view === 'security' && <SecurityPage onArm={() => showToast('success', 'Away protection has been armed for this demo home.')} />}
          {view === 'settings' && <SettingsPage connection={connection} connectedDevices={connectedDevices} themeMode={themeMode} resolvedTheme={resolvedTheme} onThemeChange={setThemeMode} onCustomize={() => setCustomizeOpen(true)} onConnect={() => setConnectOpen(true)} onDisconnect={disconnect} />}
        </section>
      </main>

      <button className="assistant-launcher" onClick={() => setAssistantOpen(true)} aria-label="Open Horizon assistant"><Bot size={21} /><span>Ask Horizon</span></button>
      {assistantOpen && <AssistantPanel onClose={() => setAssistantOpen(false)} onMessage={showToast} />}
      {customizeOpen && <WidgetCustomizer widgets={widgets} onClose={() => setCustomizeOpen(false)} onToggle={toggleWidget} onMove={moveWidget} onReset={restoreDashboardDefaults} />}
      {connectOpen && <ConnectionDialog loading={loading} onClose={() => setConnectOpen(false)} onConnect={connectHomeAssistant} />}
      {toast && <div className={`toast toast-${toast.tone}`} role="status"><span>{toast.tone === 'success' ? <Check size={18} /> : toast.tone === 'error' ? <AlertTriangle size={18} /> : <CircleHelp size={18} />}</span>{toast.message}<button onClick={() => setToast(null)} aria-label="Dismiss notification"><X size={16} /></button></div>}
    </div>
  );
}

function Overview({ devices, activeDevices, liveUsage, connected, widgets, forecast, forecastLoading, forecastSource, onConnect, onToggle, onViewDevices, onCustomize, onRefreshForecast }: { devices: Device[]; activeDevices: number; liveUsage: number; connected: boolean; widgets: WidgetPreference[]; forecast: EnergyForecast; forecastLoading: boolean; forecastSource: 'local model' | 'preview fallback'; onConnect: () => void; onToggle: (device: Device) => void; onViewDevices: () => void; onCustomize: () => void; onRefreshForecast: () => Promise<void> }) {
  const content: Record<WidgetId, ReactNode> = {
    status: <section className="widget-status"><div className="metric-grid"><MetricCard label="Home status" value="All clear" detail="No attention needed" icon={<ShieldCheck size={20} />} color="teal" /><MetricCard label="Active devices" value={`${activeDevices} / ${devices.length}`} detail="Across your connected spaces" icon={<Activity size={20} />} color="violet" /><MetricCard label="Live energy" value={`${liveUsage.toFixed(2)} kW`} detail="12% below daily average" icon={<Zap size={20} />} color="amber" /><MetricCard label="Indoor comfort" value="21.5°" detail="Excellent air quality" icon={<Thermometer size={20} />} color="blue" /></div></section>,
    energy: <section className="card energy-card"><div className="card-heading"><div><p className="eyebrow">Today</p><h3>Energy flow</h3></div><button className="text-button">View report <ArrowRight size={15} /></button></div><div className="energy-summary"><div><strong>{liveUsage.toFixed(2)} kW</strong><span>Live consumption</span></div><span className="trend-positive">↓ 12.4%</span><p>Compared with your Tuesday baseline</p></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={energyData} margin={{ top: 8, left: -20, right: 6, bottom: 0 }}><defs><linearGradient id="usageFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#7c5cff" stopOpacity={0.4} /><stop offset="100%" stopColor="#7c5cff" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 4" /><XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fill: 'var(--chart-tick)', fontSize: 11 }} /><YAxis tickLine={false} axisLine={false} tick={{ fill: 'var(--chart-tick)', fontSize: 11 }} tickFormatter={(value: number) => `${value}k`} /><Tooltip contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, boxShadow: '0 14px 35px rgba(26,20,58,.12)' }} formatter={(value: number) => [`${value.toFixed(2)} kW`, 'Usage']} /><Area type="monotone" dataKey="usage" stroke="#7259f7" fillOpacity={1} strokeWidth={3} fill="url(#usageFill)" /></AreaChart></ResponsiveContainer></div></section>,
    forecast: <ForecastWidget forecast={forecast} loading={forecastLoading} source={forecastSource} onRefresh={onRefreshForecast} />,
    activity: <section className="card pulse-card"><div className="card-heading"><div><p className="eyebrow">Live pulse</p><h3>Home activity</h3></div><span className="live-tag"><i /> LIVE</span></div><div className="pulse-list"><PulseItem icon={<Lightbulb size={17} />} title="Living room lights" detail="Brightness adjusted to 68%" time="Just now" /><PulseItem icon={<ShieldCheck size={17} />} title="Perimeter secured" detail="Front door verified locked" time="12 min ago" /><PulseItem icon={<Fan size={17} />} title="Climate optimized" detail="Reduced fan power after sunset" time="28 min ago" /><PulseItem icon={<Sparkles size={17} />} title="Automation ready" detail="Quiet evening begins in 1h 24m" time="Today" /></div></section>,
    favorites: <section className="favorites-widget"><div className="section-heading"><div><p className="eyebrow">Favorites</p><h3>Rooms that matter now</h3></div><button className="text-button" onClick={onViewDevices}>All devices <ArrowRight size={15} /></button></div><section className="device-grid">{devices.slice(0, 4).map((device) => <DeviceCard key={device.id} device={device} onToggle={onToggle} />)}</section></section>,
  };

  return <><section className="welcome-row"><div><p className="eyebrow">Tuesday, 18 August</p><h2>Good evening, Ali.</h2><p className="muted-copy">Your home is calm, protected, and running efficiently.</p></div><div className="overview-actions"><button className="secondary-button customize-button" onClick={onCustomize}><LayoutTemplate size={16} /> Customize dashboard</button><div className={`connection-card ${connected ? 'connection-card-live' : ''}`}><div className="connection-icon">{connected ? <Wifi size={19} /> : <CloudOff size={19} />}</div><div><strong>{connected ? 'Live hub connected' : 'Run your real home from here'}</strong><span>{connected ? 'Live controls are available' : 'Connect Home Assistant securely'}</span></div><button onClick={onConnect}>{connected ? 'Manage' : 'Connect'} <ChevronRight size={15} /></button></div></div></section><section className="dashboard-widget-grid">{widgets.length > 0 ? widgets.map((widget) => <div className={`dashboard-widget widget-${widget.id}`} key={widget.id}>{content[widget.id]}</div>) : <section className="empty-dashboard"><LayoutTemplate size={26} /><h3>All dashboard widgets are hidden</h3><p>Restore or enable a widget to make this workspace useful again.</p><button className="primary-button" onClick={onCustomize}>Customize dashboard</button></section>}</section></>;
}

function ForecastWidget({ forecast, loading, source, onRefresh }: { forecast: EnergyForecast; loading: boolean; source: 'local model' | 'preview fallback'; onRefresh: () => Promise<void> }) {
  const chartData = forecast.forecast.filter((_, index) => index % 3 === 0).map((point) => ({ time: `${String(point.hour).padStart(2, '0')}:00`, predicted: point.predictedKw, lower: point.lowerKw, upper: point.upperKw }));
  return <section className="card forecast-card"><div className="card-heading"><div><p className="eyebrow">Adaptive forecast</p><h3>Next 24 hours</h3></div><button className="icon-button" onClick={() => { void onRefresh(); }} aria-label="Refresh energy forecast" disabled={loading}><RefreshCw className={loading ? 'spin' : ''} size={17} /></button></div><div className="forecast-headline"><div><strong>{forecast.totalKwh.toFixed(1)} kWh</strong><span>Projected consumption</span></div><div className="confidence-badge"><Sparkles size={14} /><span>{forecast.confidence}% confidence</span></div></div><div className="forecast-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 7, left: -17, right: 4, bottom: 0 }}><defs><linearGradient id="forecastFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#0ba58a" stopOpacity={0.35} /><stop offset="100%" stopColor="#0ba58a" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 4" /><XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fill: 'var(--chart-tick)', fontSize: 10 }} /><YAxis hide domain={[0, 'dataMax + 0.4']} /><Tooltip contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10 }} formatter={(value: number, name: string) => [`${value.toFixed(2)} kW`, name === 'predicted' ? 'Prediction' : name]} /><Area type="monotone" dataKey="upper" stroke="transparent" fill="transparent" /><Area type="monotone" dataKey="lower" stroke="transparent" fill="var(--surface)" fillOpacity={1} /><Area type="monotone" dataKey="predicted" stroke="#0ba58a" fill="url(#forecastFill)" strokeWidth={3} /></AreaChart></ResponsiveContainer></div><div className="forecast-foot"><span className={source === 'local model' ? 'forecast-source-live' : ''}><i /> {source === 'local model' ? 'Local model' : 'Preview fallback'}</span><span>{forecast.observationCount} observations</span></div><p className="forecast-note">{forecast.dataQualityNote}</p></section>;
}

function DevicesPage({ devices, onToggle, onConnect }: { devices: Device[]; onToggle: (device: Device) => void; onConnect: () => void }) {
  const grouped = useMemo(() => Array.from(new Set(devices.map((device) => device.room))).map((room) => ({ room, devices: devices.filter((device) => device.room === room) })), [devices]);
  return <><section className="content-intro"><div><p className="eyebrow">Control center</p><h2>Your devices</h2><p className="muted-copy">Control your local demo home or securely connect a compatible Home Assistant hub.</p></div><button className="primary-button" onClick={onConnect}><Link2 size={17} /> Connect integration</button></section><div className="filter-row"><button className="filter-active">All devices <span>{devices.length}</span></button><button>Active</button><button>Needs attention</button><div className="filter-spacer" /><button className="filter-icon"><MoreHorizontal size={18} /></button></div><div className="rooms-list">{grouped.map(({ room, devices: roomDevices }) => <section key={room}><div className="room-heading"><h3>{room}</h3><span>{roomDevices.length} devices</span></div><div className="device-grid">{roomDevices.map((device) => <DeviceCard key={device.id} device={device} onToggle={onToggle} />)}</div></section>)}</div></>;
}

function AutomationsPage({ onNew }: { onNew: () => void }) {
  const [automationState, setAutomationState] = useState(automations);
  return <><section className="content-intro"><div><p className="eyebrow">Local rules</p><h2>Automations</h2><p className="muted-copy">Simple, transparent routines that keep your home responsive even without cloud access.</p></div><button className="primary-button" onClick={onNew}><Plus size={17} /> New automation</button></section><section className="automation-hero"><div className="automation-orbit"><Sparkles size={34} /></div><div><strong>Built for dependable moments</strong><p>Horizon evaluates local routines first. Cloud connectors can be added later without becoming a single point of failure.</p></div><button onClick={onNew}>Explore rule builder <ArrowRight size={16} /></button></section><section className="automation-list">{automationState.map((automation, index) => { const Icon = automation.icon; return <article className="automation-item" key={automation.name}><div className="automation-icon"><Icon size={21} /></div><div className="automation-copy"><div><h3>{automation.name}</h3><span>{automation.detail}</span></div><p>{automation.action}</p></div><button className={`toggle ${automation.enabled ? 'toggle-on' : ''}`} onClick={() => setAutomationState((current) => current.map((item, position) => position === index ? { ...item, enabled: !item.enabled } : item))} aria-label={`Toggle ${automation.name}`}><span /></button><button className="icon-button"><MoreHorizontal size={20} /></button></article>})}</section></>;
}

function EnergyPage({ liveUsage }: { liveUsage: number }) {
  return <><section className="content-intro"><div><p className="eyebrow">Efficiency center</p><h2>Energy intelligence</h2><p className="muted-copy">A clear picture of current consumption and the next practical opportunity to reduce it.</p></div><button className="secondary-button"><PanelTop size={17} /> Export report</button></section><section className="metric-grid"><MetricCard label="Live draw" value={`${liveUsage.toFixed(2)} kW`} detail="Within your comfort budget" icon={<Gauge size={20} />} color="violet" /><MetricCard label="Today" value="18.4 kWh" detail="Estimated 4.12 USD" icon={<Zap size={20} />} color="amber" /><MetricCard label="Peak window" value="16:00" detail="2.44 kW recorded" icon={<Activity size={20} />} color="blue" /><MetricCard label="Monthly target" value="-9.8%" detail="On track this month" icon={<Check size={20} />} color="teal" /></section><section className="dashboard-grid"><div className="card energy-card"><div className="card-heading"><div><p className="eyebrow">Consumption profile</p><h3>Today’s usage</h3></div><button className="range-button">Today <ChevronRight size={14} /></button></div><div className="chart-wrap chart-large"><ResponsiveContainer width="100%" height="100%"><AreaChart data={energyData}><defs><linearGradient id="usageFillWide" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#0ba58a" stopOpacity={0.35} /><stop offset="100%" stopColor="#0ba58a" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#e8e8f0" strokeDasharray="3 4" /><XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fill: '#8d8da0', fontSize: 11 }} /><YAxis tickLine={false} axisLine={false} tick={{ fill: '#8d8da0', fontSize: 11 }} /><Area type="monotone" dataKey="usage" stroke="#0ba58a" strokeWidth={3} fill="url(#usageFillWide)" /></AreaChart></ResponsiveContainer></div></div><div className="card recommendation-card"><div className="recommendation-icon"><Sparkles size={21} /></div><p className="eyebrow">Suggested action</p><h3>Shift climate pre-cooling by 40 minutes</h3><p>Your modeled comfort remains stable and the estimated daily saving is 0.7 kWh.</p><button className="primary-button">Review plan <ArrowRight size={16} /></button></div></section></>;
}

function SecurityPage({ onArm }: { onArm: () => void }) {
  return <><section className="content-intro"><div><p className="eyebrow">Protection center</p><h2>Security status</h2><p className="muted-copy">A local-first overview of perimeter state, access, and home health.</p></div><button className="primary-button" onClick={onArm}><ShieldCheck size={17} /> Arm away protection</button></section><section className="security-banner"><div className="security-state"><div><ShieldCheck size={28} /></div><section><p>PERIMETER STATUS</p><h3>Protected and calm</h3><span>All monitored access points report a secure state.</span></section></div><div className="security-meta"><span>Last scan</span><strong>Just now</strong></div></section><section className="security-grid"><article className="card access-card"><div className="card-heading"><div><p className="eyebrow">Access</p><h3>Entry points</h3></div><DoorClosed size={22} /></div><SecurityRow name="Front door" state="Locked" icon={<Lock size={17} />} /><SecurityRow name="Garden gate" state="Closed" icon={<DoorClosed size={17} />} /><SecurityRow name="Garage" state="Closed" icon={<PanelTop size={17} />} /></article><article className="card access-card"><div className="card-heading"><div><p className="eyebrow">Network</p><h3>System integrity</h3></div><Radio size={22} /></div><SecurityRow name="Local hub" state="Healthy" icon={<Cpu size={17} />} /><SecurityRow name="Encrypted sessions" state="Enabled" icon={<KeyRound size={17} />} /><SecurityRow name="Security log" state="No critical events" icon={<ShieldCheck size={17} />} /></article></section></>;
}

function SettingsPage({ connection, connectedDevices, themeMode, resolvedTheme, onThemeChange, onCustomize, onConnect, onDisconnect }: { connection: IntegrationStatus; connectedDevices: number; themeMode: ThemeMode; resolvedTheme: 'light' | 'dark'; onThemeChange: (theme: ThemeMode) => void; onCustomize: () => void; onConnect: () => void; onDisconnect: () => void }) {
  return <><section className="content-intro"><div><p className="eyebrow">Workspace</p><h2>Settings</h2><p className="muted-copy">Manage trusted integrations, appearance, and the local control environment.</p></div></section><section className="settings-layout"><article className="card settings-card"><div className="card-heading"><div><p className="eyebrow">Integrations</p><h3>Home Assistant</h3></div><span className={`status-badge ${connection.connected ? 'status-live' : ''}`}>{connection.connected ? 'Connected' : 'Not connected'}</span></div><p>Connect to a Home Assistant server using a long-lived access token. Credentials stay only in the running application session and are cleared when you disconnect or close the app.</p><div className="integration-details"><span><Wifi size={16} /> {connection.connected ? connection.host ?? 'Connected hub' : 'No hub configured'}</span><span><SlidersHorizontal size={16} /> {connection.connected ? `${connectedDevices} supported entities imported` : 'Demo devices available'}</span></div><div className="settings-actions">{connection.connected ? <><button className="secondary-button" onClick={onConnect}>Manage connection</button><button className="danger-button" onClick={onDisconnect}>Disconnect</button></> : <button className="primary-button" onClick={onConnect}><Link2 size={16} /> Connect Home Assistant</button>}</div></article><article className="card settings-card"><div className="card-heading"><div><p className="eyebrow">Appearance</p><h3>Adaptive workspace theme</h3></div><SunMoon size={22} /></div><p>Choose a high-contrast mode for focused control. System mode follows your Windows appearance preference.</p><div className="theme-options">{(['system', 'light', 'dark'] as ThemeMode[]).map((option) => <button key={option} className={`theme-option ${themeMode === option ? 'theme-option-active' : ''}`} onClick={() => onThemeChange(option)}><span className={`theme-swatch swatch-${option}`} />{option[0].toUpperCase() + option.slice(1)}</button>)}</div><div className="theme-status"><span><i /> Active: {resolvedTheme === 'dark' ? 'Advanced dark' : 'Light'} mode</span><button className="text-button" onClick={onCustomize}><LayoutTemplate size={15} /> Customize widgets</button></div></article><article className="card settings-card"><div className="card-heading"><div><p className="eyebrow">Privacy</p><h3>Local by design</h3></div><ShieldCheck size={22} /></div><p>Horizon does not create an account or send demo-home telemetry to a cloud service. External control requires a user-initiated hub connection.</p><div className="check-list"><span><Check size={16} /> No cloud account required</span><span><Check size={16} /> Session credentials are memory-only</span><span><Check size={16} /> Home activity stays on your network</span></div></article><article className="card settings-card full-settings"><div className="card-heading"><div><p className="eyebrow">Protocol roadmap</p><h3>What Horizon supports now</h3></div><span className="status-badge">v1.1.2</span></div><div className="protocol-grid"><Protocol name="Home Assistant" detail="Live REST control for supported entities" state="Available" /><Protocol name="Energy Forecast API" detail="Local adaptive forecasting from normalized samples" state="Available" /><Protocol name="Matter / MQTT" detail="Roadmap through scoped module adapters" state="Roadmap" /><Protocol name="Zigbee / Z-Wave" detail="Roadmap through trusted hub adapters" state="Roadmap" /></div></article></section></>;
}

function WidgetCustomizer({ widgets, onClose, onToggle, onMove, onReset }: { widgets: WidgetPreference[]; onClose: () => void; onToggle: (id: WidgetId) => void; onMove: (id: WidgetId, direction: -1 | 1) => void; onReset: () => void }) {
  return <div className="dialog-backdrop" role="presentation"><section className="dialog widget-dialog" role="dialog" aria-modal="true" aria-labelledby="widget-dialog-title"><div className="dialog-header"><div><div className="dialog-icon"><LayoutTemplate size={21} /></div><h2 id="widget-dialog-title">Customize dashboard</h2><p>Show the information you need most, then reorder the workspace to match your routine.</p></div><button className="icon-button" onClick={onClose} aria-label="Close dashboard customization"><X size={19} /></button></div><div className="widget-list">{widgets.map((widget, index) => { const meta = widgetLabels[widget.id]; return <article key={widget.id} className="widget-list-item"><GripVertical size={17} /><div className="widget-list-copy"><strong>{meta.title}</strong><span>{meta.detail}</span></div><button className={`toggle ${widget.enabled ? 'toggle-on' : ''}`} onClick={() => onToggle(widget.id)} aria-label={`Toggle ${meta.title}`}><span /></button><div className="widget-order-actions"><button className="icon-button" onClick={() => onMove(widget.id, -1)} disabled={index === 0} aria-label={`Move ${meta.title} up`}>↑</button><button className="icon-button" onClick={() => onMove(widget.id, 1)} disabled={index === widgets.length - 1} aria-label={`Move ${meta.title} down`}>↓</button></div></article>; })}</div><div className="dialog-actions"><button type="button" className="secondary-button" onClick={onReset}><RotateCcw size={15} /> Restore defaults</button><button type="button" className="primary-button" onClick={onClose}>Done</button></div></section></div>;
}

function MetricCard({ label, value, detail, icon, color }: { label: string; value: string; detail: string; icon: ReactNode; color: string }) { return <article className="metric-card"><div className={`metric-icon metric-${color}`}>{icon}</div><p>{label}</p><strong>{value}</strong><span>{detail}</span></article>; }
function PulseItem({ icon, title, detail, time }: { icon: ReactNode; title: string; detail: string; time: string }) { return <div className="pulse-item"><div className="pulse-icon">{icon}</div><div><strong>{title}</strong><p>{detail}</p></div><time>{time}</time></div>; }
function SecurityRow({ name, state, icon }: { name: string; state: string; icon: ReactNode }) { return <div className="security-row"><span className="security-row-icon">{icon}</span><span>{name}</span><strong>{state}</strong></div>; }
function Protocol({ name, detail, state }: { name: string; detail: string; state: string }) { return <div className="protocol"><div><strong>{name}</strong><span>{detail}</span></div><em className={state === 'Available' ? 'available' : ''}>{state}</em></div>; }

function DeviceCard({ device, onToggle }: { device: Device; onToggle: (device: Device) => void }) {
  const active = isActive(device);
  const icon = device.kind === 'light' ? <Lightbulb size={21} /> : device.kind === 'climate' ? <Thermometer size={21} /> : device.kind === 'lock' ? <Lock size={21} /> : device.kind === 'cover' ? <PanelTop size={21} /> : device.kind === 'sensor' ? <Activity size={21} /> : <Power size={21} />;
  return <article className={`device-card ${active ? 'device-active' : ''}`}><div className="device-top"><div className={`device-icon device-${device.kind}`}>{icon}</div><button className={`toggle ${active ? 'toggle-on' : ''}`} onClick={() => onToggle(device)} aria-label={`Toggle ${device.name}`}><span /></button></div><div className="device-copy"><p>{device.room}</p><h4>{device.name}</h4><span>{device.detail}</span></div><div className="device-footer"><span className={device.source === 'Home Assistant' ? 'source-live' : ''}>{device.source === 'Home Assistant' ? <Wifi size={13} /> : <Home size={13} />}{device.source}</span><button aria-label={`Open ${device.name}`}><ChevronRight size={17} /></button></div></article>;
}

function AssistantPanel({ onClose, onMessage }: { onClose: () => void; onMessage: (tone: ToastTone, message: string) => void }) {
  const [value, setValue] = useState('');
  const submit = (event: FormEvent) => { event.preventDefault(); if (!value.trim()) return; onMessage('info', `Horizon assistant received: “${value.trim()}”. The connected AI action layer is planned for a future release.`); setValue(''); };
  return <aside className="assistant-panel"><div className="assistant-header"><div><div className="assistant-logo"><Bot size={18} /></div><div><strong>Horizon assistant</strong><span><i /> Local-first guidance</span></div></div><button className="icon-button" onClick={onClose}><X size={18} /></button></div><div className="assistant-body"><div className="assistant-message"><span>Horizon</span><p>I can help you discover devices, explain your home’s energy patterns, and draft safe automations.</p></div><div className="assistant-suggestions"><button onClick={() => onMessage('info', 'Energy summary: live consumption is below your daily baseline in demo mode.')}>How is energy use today?</button><button onClick={() => onMessage('info', 'Security summary: all demo perimeter sensors are reporting a secure state.')}>Is the home secure?</button></div></div><form className="assistant-form" onSubmit={submit}><input value={value} onChange={(event) => setValue(event.target.value)} placeholder="Ask about your home…" /><button type="submit"><Play size={16} fill="currentColor" /></button></form></aside>;
}

function ConnectionDialog({ loading, onClose, onConnect }: { loading: boolean; onClose: () => void; onConnect: (url: string, token: string) => Promise<void> }) {
  const [url, setUrl] = useState('http://homeassistant.local:8123');
  const [token, setToken] = useState('');
  const submit = (event: FormEvent) => { event.preventDefault(); void onConnect(url, token); };
  return <div className="dialog-backdrop" role="presentation"><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="connect-title"><div className="dialog-header"><div><div className="dialog-icon"><Link2 size={21} /></div><h2 id="connect-title">Connect Home Assistant</h2><p>Bring supported devices from your trusted local hub into Horizon.</p></div><button className="icon-button" onClick={onClose} aria-label="Close connection dialog"><X size={19} /></button></div><form onSubmit={submit}><label>Home Assistant URL<input type="url" required value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://home.example.com" /></label><label>Long-lived access token<input type="password" required value={token} onChange={(event) => setToken(event.target.value)} placeholder="Paste token from your Home Assistant profile" autoComplete="off" /></label><div className="dialog-note"><ShieldCheck size={17} /><span>The token is sent only to your specified hub and stays in app memory for the current session. It is never saved to disk by Horizon.</span></div><div className="dialog-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button" disabled={loading}>{loading ? <RefreshCw className="spin" size={17} /> : <Link2 size={17} />}{loading ? 'Connecting…' : 'Connect securely'}</button></div></form></section></div>;
}

export default App;
