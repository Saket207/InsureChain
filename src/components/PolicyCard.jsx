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
      className="premium-card overflow-hidden group cursor-pointer bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg transition-all"
      onClick={() => navigate(`/policy/${policy.id}`)}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Policy ID</p>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-extrabold text-slate-900">{policy.policyId || policy.id?.slice(0, 10)}</h3>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>
          <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
            policy.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 
            policy.status === 'PaidOut' ? 'bg-emerald-50 text-emerald-700' : 
            policy.status === 'Pending' ? 'bg-slate-100 text-slate-500' :
            policy.status === 'Rejected' ? 'bg-rose-50 text-rose-600' :
            'bg-amber-50 text-amber-600'
          }`}>
            {policy.status === 'PaidOut' ? '✅ Paid Out' : 
             policy.status === 'Pending' ? '⏳ Pending Approval' : 
             policy.status === 'Rejected' ? '❌ Rejected' : 
             policy.status}
          </div>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Location</p>
            <p className="text-sm font-bold text-slate-900">{district.name || policy.district}</p>
          </div>
          <div className="ml-auto">
            <RiskBadge level={district.riskLevel || 'moderate'} size="sm" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Premium</p>
            <p className="text-sm font-extrabold text-emerald-600">{formatINR(policy.premiumINR || policy.premiumPaid || 0)}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Coverage</p>
            <p className="text-sm font-extrabold text-emerald-600">{formatINR(policy.coverageINR || (parseFloat(policy.premiumINR) * 10) || policy.coverageAmount || 0)}</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-100 group-hover:border-emerald-100 transition-colors">
          <div className="flex -space-x-2">
            {[1, 2].map((i) => (
              <div key={i} className="w-7 h-7 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center">
                <Shield className="w-3 h-3 text-slate-400" />
              </div>
            ))}
          </div>
          <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </motion.div>
  );
}
