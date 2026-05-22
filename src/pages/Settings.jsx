import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Wallet,
  Bell,
  Globe,
  Calendar,
  MapPin,
  Trash2,
  Save,
  LogOut,
  Shield,
  Smartphone,
  MessageSquare,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useWalletStore } from '../stores/walletStore';
import WalletButton from '../components/WalletButton';
import DistrictSelector from '../components/DistrictSelector';
import { truncateAddress } from '../utils/helpers';

export default function Settings() {
  const { user, updateUser, logout } = useAuthStore();
  const { isConnected, address, networkName, disconnect } = useWalletStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saved, setSaved] = useState(false);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    mobile: user?.mobile || '',
    email: user?.email || '',
    preferredLanguage: user?.preferredLanguage || 'en',
    season: user?.season || 'Kharif',
    district: user?.districtId || 'nagpur',
    smsAlerts: true,
    whatsappAlerts: true,
  });

  const handleSave = () => {
    updateUser(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const userInitials = user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Account Settings</h1>
          <p className="text-sm font-medium text-slate-500 mt-2">Manage your profile, wallet connections, and notification preferences.</p>
        </div>
      </div>

      {/* ═══ Profile Section ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="premium-card overflow-hidden"
      >
        <div className="bg-slate-900 px-8 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-black text-white uppercase tracking-widest">Personal Profile</h2>
          </div>
          <span className="px-3 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest">Active System</span>
        </div>

        <div className="p-8">
          <div className="flex items-center gap-6 mb-10">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500 flex items-center justify-center text-2xl font-black text-white shadow-xl shadow-emerald-500/20">
              {userInitials}
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">{user?.name}</p>
              <p className="text-sm font-bold text-emerald-600 uppercase tracking-widest mt-1">Verified Farmer Status</p>
              <p className="text-xs font-medium text-slate-400 mt-1">{user?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-2 border-slate-100 text-sm font-bold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-inner"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Mobile Number</label>
              <input
                type="tel"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-2 border-slate-100 text-sm font-bold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-inner"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email (Google Auth)</label>
              <input
                type="email"
                value={formData.email}
                readOnly
                className="w-full px-5 py-3.5 rounded-2xl bg-slate-100 border-2 border-slate-100 text-sm font-bold text-slate-400 outline-none"
              />
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ═══ Wallet Section ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="premium-card overflow-hidden"
        >
          <div className="bg-slate-900 px-8 py-4 flex items-center gap-3 border-b border-slate-800">
            <Wallet className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-black text-white uppercase tracking-widest">Blockchain Node</h2>
          </div>

          <div className="p-8">
            {isConnected ? (
              <div className="space-y-6">
                <div className="p-6 bg-slate-50 rounded-2xl border-2 border-slate-100 border-dashed">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Address</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500 text-white text-[10px] font-black">CONNECTED</span>
                  </div>
                  <p className="text-sm font-mono font-bold text-slate-900 break-all bg-white p-3 rounded-xl border border-slate-100">{address}</p>
                  
                  <div className="mt-6 flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Network</span>
                    <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">{networkName}</span>
                  </div>
                </div>
                
                <button
                  onClick={disconnect}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-red-600 bg-red-50 hover:bg-red-100 transition-colors border border-red-100"
                >
                  <LogOut className="w-4 h-4" /> De-authorize Node
                </button>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm font-bold text-slate-500 mb-6">No wallet detected. Connect your node to interact with the blockchain.</p>
                <WalletButton />
              </div>
            )}
          </div>
        </motion.div>

        {/* ═══ Notification Preferences ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="premium-card overflow-hidden"
        >
          <div className="bg-slate-900 px-8 py-4 flex items-center gap-3 border-b border-slate-800">
            <Bell className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-black text-white uppercase tracking-widest">Alert Channels</h2>
          </div>

          <div className="p-8 space-y-8">
            <label className="flex items-center justify-between group cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-emerald-50 transition-colors">
                  <Smartphone className="w-5 h-5 text-slate-400 group-hover:text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">SMS Direct</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Critical weather alerts via SMS</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={formData.smsAlerts}
                onChange={(e) => setFormData({ ...formData, smsAlerts: e.target.checked })}
                className="w-6 h-6 rounded-lg border-2 border-slate-200 text-emerald-600 focus:ring-emerald-500 transition-all cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between group cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-emerald-50 transition-colors">
                  <MessageSquare className="w-5 h-5 text-slate-400 group-hover:text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">WhatsApp Alert</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live intelligence via WhatsApp</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={formData.whatsappAlerts}
                onChange={(e) => setFormData({ ...formData, whatsappAlerts: e.target.checked })}
                className="w-6 h-6 rounded-lg border-2 border-slate-200 text-emerald-600 focus:ring-emerald-500 transition-all cursor-pointer"
              />
            </label>

            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Display Language</p>
              <div className="flex gap-2">
                {[
                  { id: 'en', label: 'English' },
                  { id: 'mr', label: 'मराठी' },
                  { id: 'hi', label: 'हिंदी' },
                ].map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => setFormData({ ...formData, preferredLanguage: lang.id })}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border-2
                      ${formData.preferredLanguage === lang.id
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                      }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Save Changes Floating Action */}
      <div className="fixed bottom-10 right-10 z-50">
        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSave}
          className={`flex items-center gap-3 px-8 py-4 rounded-3xl font-black text-xs uppercase tracking-widest transition-all shadow-2xl
            ${saved ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white hover:bg-emerald-600 shadow-emerald-500/20'}`}
        >
          {saved ? (
            <><Shield className="w-5 h-5" /> All Saved!</>
          ) : (
            <><Save className="w-5 h-5" /> Update Intelligence</>
          )}
        </motion.button>
      </div>

      {/* ═══ Danger Zone ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="premium-card p-8 border-red-100 bg-red-50/20"
      >
        <div className="flex items-center gap-3 mb-4">
          <Trash2 className="w-5 h-5 text-red-600" />
          <h2 className="text-sm font-black text-red-600 uppercase tracking-widest">Critical: Terminate Access</h2>
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <p className="text-sm font-medium text-slate-500 max-w-lg">
            Permanently delete your farmer profile and all on-chain preferences. This action is irreversible.
          </p>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest text-red-600 border-2 border-red-100 hover:bg-red-100 transition-all shrink-0"
            >
              Delete Account
            </button>
          ) : (
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => { logout(); }}
                className="px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest text-white bg-red-600 hover:bg-red-700 transition-all shadow-lg shadow-red-500/20"
              >
                Confirm
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-white transition-all"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
