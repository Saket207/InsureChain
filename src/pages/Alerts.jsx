import { useState, useEffect } from 'react';
import { backendApi } from '../services/backendApi';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Zap,
  CheckCircle,
  Clock,
  Bell,
  ExternalLink,
  Inbox,
  MapPin,
} from 'lucide-react';
import { useAlertStore } from '../stores/alertStore';
import { getAlertTypeStyle, timeAgo } from '../utils/helpers';

const alertIcons = {
  early_warning: AlertTriangle,
  trigger_fired: Zap,
  payout_confirmed: CheckCircle,
  policy_expiry: Clock,
};

const filterTabs = [
  { id: 'all', label: 'All' },
  { id: 'early_warning', label: 'Early Warning' },
  { id: 'trigger_fired', label: 'Trigger Fired' },
  { id: 'payout_confirmed', label: 'Payout' },
  { id: 'policy_expiry', label: 'Expiry' },
];

export default function Alerts() {
  const [activeFilter, setActiveFilter] = useState('all');
  const { alerts, dismissAlert, markAllRead, unreadCount } = useAlertStore();

  const filteredAlerts = activeFilter === 'all'
    ? alerts
    : alerts.filter((a) => a.type === activeFilter);

  const [backendStatus, setBackendStatus] = useState(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const status = await backendApi.getHealth();
        setBackendStatus(status);
      } catch (e) {
        setBackendStatus({ status: 'offline' });
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Intelligence & Alerts</h1>
          <p className="text-sm font-medium text-slate-500 mt-2">
            {unreadCount > 0 ? (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {unreadCount} critical updates pending review
              </span>
            ) : "System monitoring active · No pending notifications"}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={async () => {
              try {
                // 1. Show toast or loading indicator in real app
                const lat = 20.9374; // Default Amravati coordinates
                const lon = 77.7796;
                const district = 'amravati';
                
                // 2. Call the REAL Python backend which fetches from NASA POWER & Copernicus
                const result = await backendApi.checkTriggers(lat, lon, district);
                
                if (result && result.threats && result.threats.length > 0) {
                  // If real threats are detected by the ML model, add them to the UI
                  const newAlerts = result.threats.map(threat => ({
                    id: `live-${Date.now()}-${Math.random()}`,
                    type: 'early_warning',
                    title: `Live Alert: ${threat.type.toUpperCase()}`,
                    message: `AI Model Confidence: ${(threat.probability * 100).toFixed(1)}%. ${threat.details || 'Real-time NASA/Copernicus data indicates a high risk.'}`,
                    district: district,
                    timestamp: Date.now(),
                    isRead: false
                  }));
                  useAlertStore.getState().setAlerts([...newAlerts, ...useAlertStore.getState().alerts]);
                } else {
                  alert("Live Check Complete: No immediate threats detected by NASA/Copernicus for your district today.");
                }
              } catch (e) {
                console.error("Live check failed:", e);
                alert("Failed to run live intelligence check. Is the backend running?");
              }
            }}
            className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest text-white bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/25 transition-all flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            Run Live Intelligence Scan
          </button>
          <button
            onClick={markAllRead}
            className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-emerald-600 border border-slate-200 hover:border-emerald-200 transition-all"
          >
            Mark all read
          </button>
        </div>
      </div>

      {/* Backend Status Nodes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <div className="premium-card p-4 border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${backendStatus?.status === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`} />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Flask Engine</span>
          </div>
          <span className={`text-[10px] font-black uppercase ${backendStatus?.status === 'online' ? 'text-emerald-600' : 'text-red-600'}`}>
            {backendStatus?.status === 'online' ? 'Active' : 'Offline'}
          </span>
        </div>
        <div className="premium-card p-4 border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${backendStatus?.diagnostics?.ml_models_loaded ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500'}`} />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">ML Intelligence</span>
          </div>
          <span className={`text-[10px] font-black uppercase ${backendStatus?.diagnostics?.ml_models_loaded ? 'text-emerald-600' : 'text-amber-600'}`}>
            {backendStatus?.diagnostics?.ml_models_loaded ? 'Ready' : 'Training'}
          </span>
        </div>
        <div className="premium-card p-4 border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${backendStatus?.diagnostics?.firebase_connected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`} />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Firebase Sync</span>
          </div>
          <span className={`text-[10px] font-black uppercase ${backendStatus?.diagnostics?.firebase_connected ? 'text-emerald-600' : 'text-slate-400'}`}>
            {backendStatus?.diagnostics?.firebase_connected ? 'Linked' : 'Pending'}
          </span>
        </div>
      </div>

      {/* Filter Tabs - Network Console Style */}
      <div className="flex gap-3 mb-10 overflow-x-auto pb-4 custom-scrollbar">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id)}
            className={`px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all
              ${activeFilter === tab.id
                ? 'bg-slate-900 text-white shadow-xl shadow-slate-200'
                : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Alert List */}
      <div className="space-y-6">
        <AnimatePresence mode="popLayout">
          {filteredAlerts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="premium-card p-20 text-center bg-slate-50/50 border-dashed border-2"
            >
              <div className="w-24 h-24 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto mb-6">
                <Bell className="w-10 h-10 text-slate-200" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No Active Intelligence</h3>
              <p className="text-slate-500 text-sm max-w-xs mx-auto font-medium">
                Your systems are stable. We'll notify you here if any risks are detected in your area.
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredAlerts.map((alert, i) => {
                const style = getAlertTypeStyle(alert.type);
                const Icon = alertIcons[alert.type] || Bell;

                return (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.05 }}
                    className={`premium-card p-6 border-l-[6px] transition-all hover:bg-slate-50/80 cursor-pointer
                      ${!alert.read ? 'border-l-emerald-500' : 'border-l-slate-200 opacity-70'}`}
                    onClick={() => dismissAlert(alert.id)}
                  >
                    <div className="flex items-start gap-6">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm
                        ${!alert.read ? 'bg-emerald-50' : 'bg-slate-100'}`}>
                        <Icon className={`w-6 h-6 ${!alert.read ? 'text-emerald-600' : 'text-slate-400'}`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-4 mb-2">
                          <div className="flex items-center gap-3">
                            <h3 className={`text-lg font-bold text-slate-900`}>
                              {alert.title}
                            </h3>
                            {!alert.read && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest">New</span>
                            )}
                          </div>
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">
                            {timeAgo(alert.timestamp)}
                          </span>
                        </div>
                        
                        <p className="text-slate-600 font-medium mb-4 leading-relaxed">{alert.message}</p>
                        
                        <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-slate-100">
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <MapPin className="w-3.5 h-3.5 text-emerald-500" /> {alert.district}
                          </div>
                          {alert.policyId && (
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                              <div className="w-1 h-1 rounded-full bg-slate-300" />
                              Policy: <span className="text-slate-900">{alert.policyId}</span>
                            </div>
                          )}
                          {alert.txHash && (
                            <a
                              href={`https://sepolia.etherscan.io/tx/${alert.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="ml-auto flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 transition-colors"
                            >
                              Verify Transaction <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
