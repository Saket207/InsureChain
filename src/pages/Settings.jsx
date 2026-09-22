import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  MessageSquare,
  Mail,
  Loader2,
  CheckCircle,
  Sprout,
  X,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWalletStore } from '../stores/walletStore';
import WalletButton from '../components/WalletButton';
import DistrictSelector from '../components/DistrictSelector';
import { updateFarmerProfile } from '../services/firestoreService';
import { truncateAddress } from '../utils/helpers';

const cropOptions = [
  { id: 'Wheat', label: 'Wheat 🌾' },
  { id: 'Rice', label: 'Rice 🌾' },
  { id: 'Cotton', label: 'Cotton ☁️' },
  { id: 'Sugarcane', label: 'Sugarcane 🎋' },
  { id: 'Soybean', label: 'Soybean 🌱' },
  { id: 'Maize', label: 'Maize 🌽' },
];

const seasonOptions = [
  { id: 'Kharif', label: 'Kharif (Monsoon) 🌧️' },
  { id: 'Rabi', label: 'Rabi (Winter) ❄️' },
  { id: 'Zaid', label: 'Zaid (Summer) ☀️' },
];

export default function Settings() {
  const navigate = useNavigate();
  const { currentUser, farmerProfile, setFarmerProfile, deleteAccount } = useAuth();
  const { isConnected, address, networkName, disconnect } = useWalletStore();
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    preferredLanguage: 'en',
    season: 'Kharif',
    cropType: 'Wheat',
    districtId: 'nagpur',
    state: 'Maharashtra',
    whatsappAlerts: true,
    emailAlerts: true,
  });

  useEffect(() => {
    if (farmerProfile) {
      setFormData({
        name: farmerProfile.name || farmerProfile.fullName || '',
        mobile: farmerProfile.mobile || '',
        email: currentUser?.email || farmerProfile.email || '',
        preferredLanguage: farmerProfile.preferredLanguage || 'en',
        season: farmerProfile.season || 'Kharif',
        cropType: farmerProfile.cropType || 'Wheat',
        districtId: farmerProfile.districtId || 'nagpur',
        state: farmerProfile.state || 'Maharashtra',
        whatsappAlerts: farmerProfile.whatsappAlerts !== false,
        emailAlerts: farmerProfile.emailAlerts !== false,
      });
    }
  }, [farmerProfile, currentUser]);

  const handleSave = async () => {
    if (!currentUser) return;
    setSaving(true);
    try {
      const updates = {
        name: formData.name,
        fullName: formData.name,
        mobile: formData.mobile,
        preferredLanguage: formData.preferredLanguage,
        season: formData.season,
        cropType: formData.cropType,
        districtId: formData.districtId,
        state: formData.state,
        whatsappAlerts: formData.whatsappAlerts,
        emailAlerts: formData.emailAlerts,
      };

      await updateFarmerProfile(currentUser.uid, updates);
      setFarmerProfile((prev) => ({ ...prev, ...updates }));
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error("Failed to update settings:", e);
      alert("Failed to save settings. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      navigate('/login');
    } catch (e) {
      console.error("Deletion failed:", e);
      alert("Failed to delete account. Try again.");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const userInitials = formData.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'F';

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20 px-4">
      {/* ═══ MODERN GLOWING HEADER ═══ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#fcf8f2]/90 backdrop-blur-md p-6 rounded-3xl border border-[#eadaa6]/50 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-2.5 h-10 bg-amber-600 rounded-full shadow-[0_0_12px_rgba(245,158,11,0.4)]" />
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-heading">Settings Terminal</h1>
            <p className="text-sm font-semibold text-[#8c7438] mt-1">Configure your linked agricultural terminals, alert preferences, and blockchain nodes.</p>
          </div>
        </div>
        
        {isConnected && (
          <div className="flex items-center gap-2 bg-[#fcf8f2] px-4 py-2 rounded-2xl border border-[#eadaa6]/60 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Oracle Node Linked</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side (8 cols): Credentials & Farm Terminals */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Card 1: Farmer Credentials */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="premium-card bg-[#fcf8f2]/80 backdrop-blur-sm border-[#eadaa6]/40 rounded-3xl p-6 md:p-8 space-y-8 shadow-md"
          >
            <div className="flex items-center justify-between border-b border-[#eadaa6]/30 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-extrabold text-slate-800 text-sm font-heading leading-none">Profile Credentials</h2>
                  <p className="text-[9px] font-black text-[#8c7438] uppercase tracking-widest mt-1">Authorized farmer digital identity</p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-black uppercase tracking-widest">
                VERIFIED FARMER
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 bg-white/60 p-4 rounded-2xl border border-[#eadaa6]/30">
              <div className="w-16 h-16 rounded-full bg-emerald-600 border-2 border-emerald-500/20 flex items-center justify-center text-xl font-black text-white shadow-md shadow-emerald-600/10">
                {userInitials}
              </div>
              <div className="text-center sm:text-left space-y-1">
                <p className="text-lg font-black text-slate-900 leading-none">{formData.name || 'Farmer Profile'}</p>
                <p className="text-xs font-semibold text-slate-500">{formData.email}</p>
                <p className="text-[10px] font-black text-[#8c7438] uppercase tracking-widest">Linked Node Index: {currentUser?.uid?.substring(0, 12)}...</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 leading-none block">Full Legal Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter full name"
                  className="w-full px-5 py-3.5 rounded-2xl bg-white border-2 border-slate-100 focus:border-amber-500 text-sm font-bold text-slate-900 outline-none focus:bg-white transition-all shadow-inner"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 leading-none block">Mobile Number</label>
                <div className="relative flex items-center">
                  <span className="absolute left-5 text-sm font-black text-slate-400">+91</span>
                  <input
                    type="tel"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    placeholder="Enter mobile number"
                    className="w-full pl-14 pr-5 py-3.5 rounded-2xl bg-white border-2 border-slate-100 focus:border-amber-500 text-sm font-bold text-slate-900 outline-none focus:bg-white transition-all shadow-inner"
                  />
                </div>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 leading-none block">Email Address (Read-Only)</label>
                <input
                  type="email"
                  value={formData.email}
                  readOnly
                  className="w-full px-5 py-3.5 rounded-2xl bg-slate-100/80 border-2 border-slate-100 text-sm font-bold text-slate-400 outline-none select-none"
                />
              </div>
            </div>
          </motion.div>

          {/* Card 2: District Location Node (DistrictSelector) */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="premium-card bg-[#fcf8f2]/80 backdrop-blur-sm border-[#eadaa6]/40 rounded-3xl p-6 md:p-8 space-y-6 shadow-md"
          >
            <div className="flex items-center gap-3 border-b border-[#eadaa6]/30 pb-4">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-slate-800 text-sm font-heading leading-none">Location Node linkage</h2>
                <p className="text-[9px] font-black text-[#8c7438] uppercase tracking-widest mt-1">Satellite coverage coordinates targets</p>
              </div>
            </div>

            <DistrictSelector
              stateValue={formData.state}
              onStateChange={(state) => setFormData({ ...formData, state, districtId: '' })}
              districtValue={formData.districtId}
              onDistrictChange={(districtId) => setFormData({ ...formData, districtId })}
            />
          </motion.div>

          {/* Card 3: Crop & Season Parameters */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="premium-card bg-[#fcf8f2]/80 backdrop-blur-sm border-[#eadaa6]/40 rounded-3xl p-6 md:p-8 space-y-6 shadow-md"
          >
            <div className="flex items-center gap-3 border-b border-[#eadaa6]/30 pb-4">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
                <Sprout className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-slate-800 text-sm font-heading leading-none">Agricultural Parameters</h2>
                <p className="text-[9px] font-black text-[#8c7438] uppercase tracking-widest mt-1">Active crop indices and seasons target settings</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Crop Selection buttons */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 leading-none block">Cultivated Crop Type</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {cropOptions.map((crop) => (
                    <button
                      key={crop.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, cropType: crop.id })}
                      className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all border-2 flex items-center justify-center gap-2 cursor-pointer outline-none
                        ${formData.cropType === crop.id
                          ? 'border-amber-600 bg-amber-50 text-amber-800 shadow-sm'
                          : 'border-slate-100 bg-white text-slate-500 hover:border-[#eadaa6]/60 hover:bg-[#fcf8f2]/50'
                        }`}
                    >
                      {crop.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Season Selector buttons */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 leading-none block">Active Crop Season</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {seasonOptions.map((season) => (
                    <button
                      key={season.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, season: season.id })}
                      className={`px-4 py-3.5 rounded-2xl text-xs font-bold transition-all border-2 flex items-center justify-center gap-2 cursor-pointer outline-none
                        ${formData.season === season.id
                          ? 'border-amber-600 bg-amber-50 text-amber-800 shadow-sm'
                          : 'border-slate-100 bg-white text-slate-500 hover:border-[#eadaa6]/60 hover:bg-[#fcf8f2]/50'
                        }`}
                    >
                      {season.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

        </div>

        {/* Right Side (4 cols): Web3 Wallet Node & Alert Toggles */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Card 4: Web3 Blockchain Wallet Node */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="premium-card bg-[#fcf8f2]/80 backdrop-blur-sm border-[#eadaa6]/40 rounded-3xl p-6 shadow-md"
          >
            <div className="flex items-center gap-3 border-b border-[#eadaa6]/30 pb-4 mb-5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-slate-800 text-sm font-heading leading-none">Blockchain Node</h2>
                <p className="text-[9px] font-black text-[#8c7438] uppercase tracking-widest mt-1">Metamask & wallet authorization</p>
              </div>
            </div>

            {isConnected ? (
              <div className="space-y-4">
                <div className="p-4 bg-white/70 rounded-2xl border border-[#eadaa6]/30 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest font-heading">Address Terminals</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500 text-white text-[8px] font-black uppercase tracking-widest shadow-sm">CONNECTED</span>
                  </div>
                  <p className="text-xs font-mono font-bold text-slate-800 break-all bg-white p-2.5 rounded-xl border border-slate-100">{address}</p>
                  
                  <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-400 pt-1">
                    <span>Network Node</span>
                    <span className="text-emerald-700 font-extrabold">{networkName}</span>
                  </div>
                </div>
                
                <button
                  onClick={disconnect}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-700 bg-red-50 hover:bg-red-100 border border-red-100/60 transition-all outline-none cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" /> De-authorize Node
                </button>
              </div>
            ) : (
              <div className="text-center py-6 space-y-4">
                <p className="text-xs font-bold text-slate-500 leading-relaxed max-w-xs mx-auto">No Web3 authorization detected. Connect your hardware/digital node to authenticate oracle parameters.</p>
                <div className="flex justify-center">
                  <WalletButton />
                </div>
              </div>
            )}
          </motion.div>

          {/* Card 5: Real Alert Channels Preferences */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="premium-card bg-[#fcf8f2]/80 backdrop-blur-sm border-[#eadaa6]/40 rounded-3xl p-6 shadow-md"
          >
            <div className="flex items-center gap-3 border-b border-[#eadaa6]/30 pb-4 mb-6">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-slate-800 text-sm font-heading leading-none">Alert Channels</h2>
                <p className="text-[9px] font-black text-[#8c7438] uppercase tracking-widest mt-1">Environmental warning nodes alert routes</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* WhatsApp alerts checkbox */}
              <label className="flex items-center justify-between group cursor-pointer p-3 bg-white/50 border border-slate-100 rounded-2xl hover:bg-white hover:border-[#eadaa6]/40 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#fcf8f2] flex items-center justify-center text-slate-400 group-hover:text-amber-600 border border-slate-100 group-hover:border-[#eadaa6]/50 transition-colors">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900 leading-tight">WhatsApp alerts</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Live monitoring telemetry</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.whatsappAlerts}
                  onChange={(e) => setFormData({ ...formData, whatsappAlerts: e.target.checked })}
                  className="w-5 h-5 rounded border-2 border-slate-200 text-amber-600 focus:ring-amber-500 transition-all cursor-pointer outline-none"
                />
              </label>

              {/* Email alerts checkbox */}
              <label className="flex items-center justify-between group cursor-pointer p-3 bg-white/50 border border-slate-100 rounded-2xl hover:bg-white hover:border-[#eadaa6]/40 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#fcf8f2] flex items-center justify-center text-slate-400 group-hover:text-amber-600 border border-slate-100 group-hover:border-[#eadaa6]/50 transition-colors">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900 leading-tight">Email Alerts</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Automated policy receipts</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.emailAlerts}
                  onChange={(e) => setFormData({ ...formData, emailAlerts: e.target.checked })}
                  className="w-5 h-5 rounded border-2 border-slate-200 text-amber-600 focus:ring-amber-500 transition-all cursor-pointer outline-none"
                />
              </label>

              {/* Display Language dropdown */}
              <div className="pt-2 border-t border-[#eadaa6]/20">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 leading-none flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-amber-500" />
                  Display Language
                </p>
                <div className="flex gap-2">
                  {[
                    { id: 'en', label: 'English' },
                    { id: 'mr', label: 'मराठी' },
                    { id: 'hi', label: 'हिंदी' },
                  ].map((lang) => (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, preferredLanguage: lang.id })}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border-2 cursor-pointer outline-none
                        ${formData.preferredLanguage === lang.id
                          ? 'border-amber-600 bg-amber-50 text-amber-800'
                          : 'border-slate-100 bg-white text-slate-500 hover:border-[#eadaa6]/60 hover:bg-[#fcf8f2]/50'
                        }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 6: Guide Tour Assistance */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="premium-card bg-[#fcf8f2]/80 backdrop-blur-sm border-[#eadaa6]/40 rounded-3xl p-6 shadow-md"
          >
            <div className="flex items-center gap-3 border-b border-[#eadaa6]/30 pb-4 mb-4">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <Sprout className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-slate-800 text-sm font-heading leading-none">Interactive Tour Guide</h2>
                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mt-1">Farmer portal onboarding manual</p>
              </div>
            </div>
            
            <p className="text-xs font-semibold text-slate-500 leading-relaxed mb-4">
              Need a refresher on how the InsureChain parametric insurance portal, risk heatmaps, weather feeds, and wallet nodes operate? Replay the step-by-step interactive onboarding spotlight guide.
            </p>
            
            <button
              onClick={async () => {
                if (!currentUser) return;
                try {
                  await updateFarmerProfile(currentUser.uid, { hasSeenWalkthrough: false });
                  setFarmerProfile((prev) => ({ ...prev, hasSeenWalkthrough: false }));
                  navigate('/dashboard');
                } catch (e) {
                  console.error("Failed to reset onboarding state:", e);
                  alert("Failed to reset onboarding state. Please try again.");
                }
              }}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100/60 transition-all outline-none cursor-pointer"
            >
              Replay Onboarding Tour
            </button>
          </motion.div>

        </div>
      </div>

      {/* Floating Sparkle Save Action Button */}
      <div className="fixed bottom-10 right-10 z-40">
        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-3 px-8 py-4 rounded-3xl font-black text-xs uppercase tracking-widest transition-all shadow-2xl outline-none cursor-pointer
            ${saved 
              ? 'bg-emerald-600 text-white shadow-emerald-600/35' 
              : 'bg-amber-600 text-white hover:bg-amber-700 shadow-amber-600/25'
            }`}
        >
          {saving ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Saving Changes...</>
          ) : saved ? (
            <><CheckCircle className="w-5 h-5" /> Config Synced!</>
          ) : (
            <><Save className="w-5 h-5 animate-bounce" /> Update Intelligence</>
          )}
        </motion.button>
      </div>

      {/* ═══ Danger Zone: Terminate Access ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="premium-card p-6 md:p-8 border-red-200/80 bg-red-50/20 rounded-3xl space-y-6 shadow-md relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-red-500/[0.02] to-transparent pointer-events-none" />
        <div className="flex items-center gap-3 border-b border-red-200/40 pb-4">
          <Trash2 className="w-5 h-5 text-red-600" />
          <h2 className="text-sm font-black text-red-700 uppercase tracking-widest font-heading">Critical: Terminate access node</h2>
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <p className="text-xs font-semibold text-slate-500 max-w-xl leading-relaxed">
            Permanently delete your registered farmer profile and all linked parametrics on-chain preferences. All historical contract coverage data will be forcefully purged from the Firebase Firestore node. This action is irreversible.
          </p>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-600 bg-white border-2 border-red-100 hover:bg-red-50 hover:border-red-200 transition-all shrink-0 cursor-pointer outline-none"
          >
            Delete Account
          </button>
        </div>

        {/* Delete Confirmation Modal Overlay */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="w-full max-w-md bg-white border border-red-100 p-6 md:p-8 rounded-3xl shadow-2xl space-y-6 relative overflow-hidden"
              >
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors outline-none"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-3.5 border-b border-slate-100 pb-4">
                  <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base font-heading leading-tight">Purge Access Terminal?</h3>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Purging farmer identity</p>
                  </div>
                </div>

                <p className="text-xs font-semibold text-slate-500 leading-relaxed">
                  Are you absolutely certain? This operation will initiate a permanent database purge, forcefully deleting your farmer document: <span className="font-mono bg-slate-50 p-1 rounded font-bold text-slate-800 text-[10px] break-all">{currentUser?.uid}</span> from Firebase. All contract configurations are lost.
                </p>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all outline-none cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    className="px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white bg-red-600 hover:bg-red-700 transition-all shadow-lg shadow-red-500/25 flex items-center gap-2 outline-none cursor-pointer"
                  >
                    {deleting ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Purging...</>
                    ) : (
                      <><Trash2 className="w-3.5 h-3.5" /> Purge Account</>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
