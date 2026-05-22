import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Phone, MapPin, Loader2, Save, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { updateFarmerProfile } from '../services/firestoreService';
import DistrictSelector from '../components/DistrictSelector';

export default function Profile() {
  const navigate = useNavigate();
  const { currentUser, farmerProfile, setFarmerProfile } = useAuth();
  
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [state, setState] = useState('Maharashtra');
  const [districtId, setDistrictId] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 font-heading">Personal Profile</h1>
        <p className="text-slate-500 mt-2 font-medium">Complete your details to unlock policy registration and dashboard features.</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Farmer Information</h2>
          <p className="text-sm text-slate-500">This information will be attached to all your future policies.</p>
        </div>
        
        <form onSubmit={handleSaveProfile} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Legal Name</label>
              <div className="relative">
                <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ramesh Patil"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mobile Number</label>
              <div className="relative flex">
                <span className="flex items-center pl-4 pr-3 bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl text-sm font-bold text-slate-500">
                  +91
                </span>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit number"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-r-xl text-sm font-bold text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  required
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <DistrictSelector 
                stateValue={state}
                onStateChange={(newState) => {
                  setState(newState);
                  setDistrictId(''); // Reset district when state changes
                }}
                districtValue={districtId} 
                onDistrictChange={setDistrictId} 
              />
            </div>

          </div>

          <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-4">
            {success && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 text-emerald-600 font-bold text-sm"
              >
                <CheckCircle className="w-5 h-5" />
                Profile Saved!
              </motion.div>
            )}
            
            <button
              type="submit"
              disabled={loading || !fullName || !mobile || !districtId}
              className="px-8 py-3.5 bg-emerald-600 text-white font-black uppercase tracking-widest text-xs rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isProfileComplete ? 'Update Profile' : 'Save & Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
