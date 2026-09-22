import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  MapPin, 
  ArrowRight,
  Droplets,
  Wind,
  Thermometer,
  CloudLightning,
  Bug,
  CloudHail,
  Flame,
  Snowflake
} from 'lucide-react';
import { formatINR, getStatusStyle } from '../utils/helpers';
import RiskBadge from './RiskBadge';
import districts from '../data/districts.json';

export default function PolicyCard({ policy, delay = 0 }) {
  const navigate = useNavigate();
  const district = districts.find(d => d.id === policy.district) || { name: policy.district, riskLevel: 'moderate' };

  // Helper to get trigger icon
  const getTriggerIcon = (type = '') => {
    switch (type.toLowerCase()) {
      case 'drought': return Droplets;
      case 'flood': return CloudLightning;
      case 'heatwave': return Flame;
      case 'frost': return Snowflake;
      case 'pest': return Bug;
      case 'hail': return CloudHail;
      case 'unseasonal_rain': return CloudLightning;
      case 'cyclone': return Wind;
      default: return Shield;
    }
  };

  const Icon = getTriggerIcon(policy.triggerType);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass-card overflow-hidden group cursor-pointer border border-slate-300/70 hover:border-emerald-600/40 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
      onClick={() => navigate(`/policy/${policy.id}`)}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-1">Policy ID</p>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-slate-950">{policy.policyId || policy.id?.slice(0, 10)}</h3>
              <div className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            </div>
          </div>
          <div className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
            policy.status === 'Active' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 
            policy.status === 'PaidOut' ? 'bg-emerald-200 text-emerald-950 border-emerald-400' : 
            policy.status === 'Pending' ? 'bg-slate-100 text-slate-900 border-slate-300' :
            policy.status === 'Rejected' ? 'bg-rose-100 text-rose-900 border-rose-300' :
            'bg-amber-100 text-amber-900 border-amber-300'
          }`}>
            {policy.status === 'PaidOut' ? '✅ Paid Out' : 
             policy.status === 'Pending' ? '⏳ Pending Approval' : 
             policy.status === 'Rejected' ? '❌ Rejected' : 
             policy.status}
          </div>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Icon className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Location</p>
            <p className="text-base font-black text-slate-950">{district.name || policy.district}</p>
          </div>
          <div className="ml-auto">
            <RiskBadge level={district.riskLevel || 'moderate'} size="sm" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-slate-100/80 rounded-2xl border border-slate-200">
            <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-1">Premium</p>
            <p className="text-base font-black text-emerald-800">{formatINR(policy.premiumINR || policy.premiumPaid || 0)}</p>
          </div>
          <div className="p-4 bg-slate-100/80 rounded-2xl border border-slate-200">
            <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-1">Coverage</p>
            <p className="text-base font-black text-emerald-800">{formatINR(policy.coverageINR || (parseFloat(policy.premiumINR) * 10) || policy.coverageAmount || 0)}</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-300/70 group-hover:border-emerald-600/30 transition-colors">
          <div className="flex -space-x-2">
            {[1, 2].map((i) => (
              <div key={i} className="w-7 h-7 rounded-full border border-slate-300 bg-slate-100 flex items-center justify-center">
                <Shield className="w-3 h-3 text-slate-700" />
              </div>
            ))}
          </div>
          <ArrowRight className="w-5 h-5 text-slate-850 group-hover:text-emerald-700 group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </motion.div>
  );
}
