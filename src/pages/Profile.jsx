import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Phone, MapPin, Loader2, Save, CheckCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { updateFarmerProfile } from '../services/firestoreService';
import DistrictSelector from '../components/DistrictSelector';
import districts from '../data/districts.json';

export default function Profile() {
  const navigate = useNavigate();
  const { currentUser, farmerProfile, setFarmerProfile } = useAuth();
  
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [state, setState] = useState('Maharashtra');
  const [districtId, setDistrictId] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [nameFocused, setNameFocused] = useState(false);
  const [mobileFocused, setMobileFocused] = useState(false);

  useEffect(() => {
    if (farmerProfile) {
      setFullName(farmerProfile.name || farmerProfile.fullName || '');
      setMobile(farmerProfile.mobile || '');
      setState(farmerProfile.state || 'Maharashtra');
      setDistrictId(farmerProfile.districtId || '');
    }
  }, [farmerProfile]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!fullName || !mobile || !districtId) return;

    setLoading(true);
    setSuccess(false);

    try {
      const updates = {
        name: fullName,
        fullName: fullName,
        mobile,
        state,
        districtId
      };
      
      await updateFarmerProfile(currentUser.uid, updates);
      
      // Update local context
      setFarmerProfile((prev) => ({ ...prev, ...updates }));
      
      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
      
    } catch (err) {
      console.error('Failed to update profile:', err);
      alert('Failed to update profile. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const isProfileComplete = farmerProfile?.name && farmerProfile?.mobile && farmerProfile?.districtId;

  // Real-time validations
  const isNameValid = fullName.trim().length >= 3;
  const isMobileValid = mobile.length === 10;
  const isStateValid = !!state;
  const isDistrictValid = !!districtId;

  const calculateProgress = () => {
    let completed = 0;
    if (isNameValid) completed += 25;
    if (isMobileValid) completed += 25;
    if (isStateValid) completed += 25;
    if (isDistrictValid) completed += 25;
    return completed;
  };

  const completionPercent = calculateProgress();
  const allFieldsValid = isNameValid && isMobileValid && isDistrictValid;

  const checklistContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const checklistItem = {
    hidden: { opacity: 0, x: -15 },
    show: { 
      opacity: 1, 
      x: 0, 
      transition: { 
        type: "spring", 
        stiffness: 280, 
        damping: 22 
      } 
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-4xl mx-auto space-y-8 relative"
    >
      {/* 🔮 Ambient Glowing Blur Orbs behind the glass containers to show off backdrop filter blur */}
      <div className="absolute top-20 right-1/4 w-80 h-80 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none -z-10 animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-20 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse" style={{ animationDuration: '12s' }} />

      {/* ═══ MODERN GLOWING HEADER ═══ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 bg-white/40 backdrop-blur-xl p-6 md:p-8 rounded-3xl border border-white/60 shadow-[0_8px_32px_rgba(148,163,184,0.06)] transition-all duration-300">
        <div>
          <h1 className="text-3xl font-black text-slate-900 font-heading tracking-tight flex items-center gap-3">
            <span className="bg-emerald-500 w-2.5 h-8 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.6)] animate-pulse" />
            Personal Profile
          </h1>
          <p className="text-slate-600 mt-1.5 font-semibold text-sm leading-relaxed">Configure your personal nodes and linkage parameters to access coverage options.</p>
        </div>

        {/* Dynamic Circular Completion Ring */}
        <div className="flex items-center gap-4 bg-white/65 backdrop-blur-md p-3.5 rounded-2xl border border-white/60 shadow-sm min-w-[250px] transition-all hover:bg-white/85">
          <div className="relative w-12 h-12 flex items-center justify-center">
            <svg className="w-12 h-12 transform -rotate-90">
              <circle
                cx="24"
                cy="24"
                r="20"
                className="stroke-slate-100/80 fill-transparent"
                strokeWidth="4"
              />
              <motion.circle
                cx="24"
                cy="24"
                r="20"
                className="stroke-emerald-500 fill-transparent"
                strokeWidth="4"
                strokeDasharray={2 * Math.PI * 20}
                animate={{ strokeDashoffset: (2 * Math.PI * 20) * (1 - completionPercent / 100) }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-xs font-black text-slate-800 font-mono">{completionPercent}%</span>
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Configuration Status</p>
            <p className="text-xs font-bold text-slate-700">
              {completionPercent === 100 
                ? 'All Terminals Connected!' 
                : `${4 - (isNameValid + isMobileValid + isStateValid + isDistrictValid)} parameters pending`}
            </p>
          </div>
        </div>
      </div>

      {/* ═══ PREMIUM DUAL-COLUMN GLASS CARD ═══ */}
      <div className="bg-white/40 backdrop-blur-xl border border-white/60 shadow-[0_12px_40px_rgba(15,23,42,0.06)] rounded-[32px] grid grid-cols-1 md:grid-cols-12 overflow-hidden transition-all duration-300 hover:shadow-emerald-500/[0.02] hover:border-emerald-500/20">
        
        {/* Left Side: Sophisticated Light-Glass Guide */}
        <div className="md:col-span-4 bg-gradient-to-b from-slate-50/40 via-emerald-50/10 to-white/40 backdrop-blur-md p-8 relative flex flex-col justify-between overflow-hidden border-r border-white/40">
          {/* Subtle grid background and glowing soft orbs */}
          <div className="absolute inset-0 bg-grid opacity-[0.05] pointer-events-none" />
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/[0.05] rounded-full blur-2xl animate-pulse" style={{ animationDuration: '6s' }} />
          <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-cyan-500/[0.04] rounded-full blur-2xl" />
          
          <div className="relative z-10 space-y-8">
            <div>
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-black uppercase tracking-widest shadow-sm">
                Identity Registry
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 mt-3 font-heading leading-tight">Farmer Node</h2>
              <p className="text-slate-650 text-xs mt-2 leading-relaxed font-semibold">
                Link your digital identity parameters to initialize automated satellite-verified crop coverage and secure direct settlements.
              </p>
            </div>

            {/* Dynamic Checklist with staggered Framer Motion entrance */}
            <motion.div 
              variants={checklistContainer}
              initial="hidden"
              animate="show"
              className="space-y-4 pt-2"
            >
              {/* Check 1: Name */}
              <motion.div variants={checklistItem} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500 ${
                  isNameValid 
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-110' 
                    : 'bg-white/60 text-slate-400 border border-slate-200/60'
                }`}>
                  {isNameValid ? <CheckCircle className="w-3.5 h-3.5" /> : <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
                </div>
                <div>
                  <p className={`text-[9px] font-black uppercase tracking-widest leading-none ${isNameValid ? 'text-emerald-600' : 'text-slate-400'}`}>Identity Lock</p>
                  <p className={`text-[11px] mt-0.5 max-w-[160px] truncate ${isNameValid ? 'font-bold text-slate-800' : 'font-semibold text-slate-400'}`}>{fullName || 'Awaiting full name...'}</p>
                </div>
              </motion.div>

              {/* Check 2: Mobile */}
              <motion.div variants={checklistItem} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500 ${
                  isMobileValid 
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-110' 
                    : 'bg-white/60 text-slate-400 border border-slate-200/60'
                }`}>
                  {isMobileValid ? <CheckCircle className="w-3.5 h-3.5" /> : <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
                </div>
                <div>
                  <p className={`text-[9px] font-black uppercase tracking-widest leading-none ${isMobileValid ? 'text-emerald-600' : 'text-slate-400'}`}>Communication Link</p>
                  <p className={`text-[11px] mt-0.5 ${isMobileValid ? 'font-bold text-slate-800' : 'font-semibold text-slate-400'}`}>{mobile ? `+91 ${mobile}` : 'Awaiting mobile...'}</p>
                </div>
              </motion.div>

              {/* Check 3: State Node */}
              <motion.div variants={checklistItem} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500 ${
                  isStateValid 
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-110' 
                    : 'bg-white/60 text-slate-400 border border-slate-200/60'
                }`}>
                  {isStateValid ? <CheckCircle className="w-3.5 h-3.5" /> : <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
                </div>
                <div>
                  <p className={`text-[9px] font-black uppercase tracking-widest leading-none ${isStateValid ? 'text-emerald-600' : 'text-slate-400'}`}>Regional Node</p>
                  <p className={`text-[11px] mt-0.5 ${isStateValid ? 'font-bold text-slate-800' : 'font-semibold text-slate-400'}`}>{state || 'Awaiting state...'}</p>
                </div>
              </motion.div>

              {/* Check 4: District Terminal */}
              <motion.div variants={checklistItem} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500 ${
                  isDistrictValid 
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-110' 
                    : 'bg-white/60 text-slate-400 border border-slate-200/60'
                }`}>
                  {isDistrictValid ? <CheckCircle className="w-3.5 h-3.5" /> : <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
                </div>
                <div>
                  <p className={`text-[9px] font-black uppercase tracking-widest leading-none ${isDistrictValid ? 'text-emerald-600' : 'text-slate-400'}`}>District Terminal</p>
                  <p className={`text-[11px] mt-0.5 max-w-[160px] truncate ${isDistrictValid ? 'font-bold text-slate-800' : 'font-semibold text-slate-400'}`}>
                    {isDistrictValid 
                      ? districts.find(d => d.id === districtId)?.name || 'Connected Terminal' 
                      : 'Awaiting terminal...'}
                  </p>
                </div>
              </motion.div>
            </motion.div>
          </div>

          <div className="relative z-10 pt-6 border-t border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            Secured Web3 Registry
          </div>
        </div>

        {/* Right Side: Interactive Form */}
        <div className="md:col-span-8 flex flex-col justify-between">
          <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-950 font-heading">Farmer Information</h2>
              <p className="text-xs text-slate-500 mt-1.5 font-semibold">This information will lock as the parameters for all future smart contract policies.</p>
            </div>
            <ShieldCheck className="w-8 h-8 text-emerald-500/85 bg-emerald-500/10 p-1.5 rounded-xl border border-emerald-500/20 shadow-sm" />
          </div>
          
          <form onSubmit={handleSaveProfile} className="p-6 md:p-8 space-y-6 flex-grow">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Full Legal Name */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Legal Name</label>
                <div className="relative">
                  <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 ${nameFocused ? 'text-emerald-500' : 'text-slate-400'}`}>
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    onFocus={() => setNameFocused(true)}
                    onBlur={() => setNameFocused(false)}
                    placeholder="e.g. Ramesh Patil"
                    className={`w-full pl-12 pr-16 py-3.5 bg-white/55 backdrop-blur-sm border rounded-2xl text-sm font-bold text-slate-800 outline-none transition-all duration-300 shadow-sm
                      ${nameFocused 
                        ? 'border-emerald-500 bg-white ring-4 ring-emerald-500/10 shadow-[0_4px_20px_rgba(16,185,129,0.08)]' 
                        : 'border-slate-200/80 hover:border-emerald-500/40 hover:bg-white/85'
                      }`}
                    required
                  />
                  
                  {/* Dynamic valid indicator */}
                  <AnimatePresence>
                    {isNameValid && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-emerald-50 border border-emerald-100 text-emerald-600 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm"
                      >
                        <CheckCircle className="w-3 h-3 stroke-[3]" />
                        Valid
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Mobile Number */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mobile Number</label>
                <div className="relative flex">
                  <span className="flex items-center gap-2 pl-4 pr-3 bg-slate-100/70 border border-r-0 border-slate-200 rounded-l-2xl text-sm font-bold text-slate-500 shadow-inner">
                    <span className="flex flex-col gap-0.5 w-3.5 h-2.5">
                      <span className="bg-[#FF9933] h-[3px] w-full rounded-t-[1px]" />
                      <span className="bg-white h-[3px] w-full flex items-center justify-center">
                        <span className="w-[1.5px] h-[1.5px] bg-[#000080] rounded-full" />
                      </span>
                      <span className="bg-[#138808] h-[3px] w-full rounded-b-[1px]" />
                    </span>
                    +91
                  </span>
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    onFocus={() => setMobileFocused(true)}
                    onBlur={() => setMobileFocused(false)}
                    placeholder="10-digit number"
                    className={`w-full px-4 pr-16 py-3.5 bg-white/55 backdrop-blur-sm border border-l-0 rounded-r-2xl text-sm font-bold text-slate-800 outline-none transition-all duration-300 shadow-sm
                      ${mobileFocused 
                        ? 'border-emerald-500 bg-white ring-4 ring-emerald-500/10 shadow-[0_4px_20px_rgba(16,185,129,0.08)]' 
                        : 'border-slate-200/80 hover:border-emerald-500/40 hover:bg-white/85'
                      }`}
                    required
                  />

                  {/* Dynamic valid indicator */}
                  <AnimatePresence>
                    {isMobileValid && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-emerald-50 border border-emerald-100 text-emerald-600 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm"
                      >
                        <CheckCircle className="w-3 h-3 stroke-[3]" />
                        Valid
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* State & District */}
              <div className="md:col-span-2">
                <DistrictSelector 
                  stateValue={state}
                  onStateChange={(newState) => {
                    setState(newState);
                    setDistrictId(''); // Reset district node
                  }}
                  districtValue={districtId} 
                  onDistrictChange={setDistrictId} 
                />
              </div>

            </div>

            {/* Submission Action Area */}
            <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-4">
              {success && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 text-emerald-600 font-extrabold text-sm font-mono"
                >
                  <CheckCircle className="w-5 h-5" />
                  Profile Saved & Secured!
                </motion.div>
              )}
              
              <motion.button
                whileHover={allFieldsValid ? { scale: 1.02, y: -1 } : {}}
                whileTap={allFieldsValid ? { scale: 0.98 } : {}}
                type="submit"
                disabled={loading || !allFieldsValid}
                className={`px-8 py-3.5 text-white font-black uppercase tracking-widest text-xs rounded-2xl transition-all duration-300 flex items-center gap-2 outline-none
                  ${allFieldsValid 
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-500/25 shimmer-btn cursor-pointer' 
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60'
                  }`}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isProfileComplete ? 'Update Profile' : 'Save & Continue'}
              </motion.button>
            </div>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
