import { motion } from 'framer-motion';
import { 
  Sun, 
  CloudRain, 
  Flame, 
  Snowflake, 
  Check,
  Bug,
  CloudHail,
  CloudLightning,
  Wind
} from 'lucide-react';
import { calculatePremium, formatINR, getTriggerColor } from '../utils/helpers';

const triggers = [
  {
    id: 'drought',
    name: 'Drought',
    icon: Sun,
    description: 'Rainfall less than 40% of 30-year normal for 21 consecutive days',
    color: 'amber',
  },
  {
    id: 'flood',
    name: 'Flood',
    icon: CloudRain,
    description: 'Rainfall greater than 300% of normal within any 3-day window',
    color: 'blue',
  },
  {
    id: 'heatwave',
    name: 'Heatwave',
    icon: Flame,
    description: 'Temperature above 42°C for 5 or more consecutive days',
    color: 'red',
  },
  {
    id: 'frost',
    name: 'Frost',
    icon: Snowflake,
    description: 'Temperature below 2°C during the active crop season',
    color: 'cyan',
  },
  {
    id: 'pest',
    name: 'Pest Infestation',
    icon: Bug,
    description: 'High-stress NDVI canopy anomalies detected over a 14-day window indicating vegetative blight',
    color: 'emerald',
  },
  {
    id: 'hail',
    name: 'Hailstorm',
    icon: CloudHail,
    description: 'Extreme atmospheric pressure combined with rapid convective weather drop within a 24-hour period',
    color: 'indigo',
  },
  {
    id: 'unseasonal_rain',
    name: 'Unseasonal Rain',
    icon: CloudLightning,
    description: 'Excessive precipitation during harvest season exceeding 100mm in 24 hours',
    color: 'teal',
  },
  {
    id: 'cyclone',
    name: 'Cyclone / High Wind',
    icon: Wind,
    description: 'Satellite wind velocity index exceeding 85 km/h for coastal agricultural zones',
    color: 'rose',
  },
];

export default function TriggerSelector({ selected = [], onToggle, district, season = 'Kharif' }) {
  const premiumData = calculatePremium({ district, season, triggers: selected });

  return (
    <div>
      {/* Trigger Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {triggers.map((trigger, i) => {
          const isSelected = selected.includes(trigger.id);
          const colors = getTriggerColor(trigger.id);

          return (
            <motion.button
              key={trigger.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onToggle(trigger.id)}
              className={`relative flex flex-col items-start p-6 rounded-3xl border-2 text-left transition-all duration-300
                ${isSelected
                  ? `border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-500/5`
                  : 'border-slate-100 bg-white hover:border-emerald-200'
                }`}
            >
              {/* Checkmark */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`absolute top-4 right-4 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20`}
                >
                  <Check className="w-4 h-4 text-white" />
                </motion.div>
              )}

              {/* Icon */}
              <div className={`w-12 h-12 rounded-2xl mb-4 flex items-center justify-center transition-colors
                ${isSelected ? 'bg-white shadow-sm text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                <trigger.icon className="w-6 h-6" />
              </div>

              {/* Name & Description */}
              <h4 className={`text-sm font-black uppercase tracking-widest mb-2 ${isSelected ? 'text-emerald-700' : 'text-slate-900'}`}>
                {trigger.name}
              </h4>
              <p className={`text-xs font-medium leading-relaxed ${isSelected ? 'text-emerald-600/80' : 'text-slate-500'}`}>
                {trigger.description}
              </p>
            </motion.button>
          );
        })}
      </div>

      {/* Premium Calculator - Professional High Contrast Box */}
      {selected.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-900 rounded-[32px] p-8 shadow-2xl relative overflow-hidden"
        >
          {/* Decorative Grid */}
          <div className="absolute inset-0 bg-grid opacity-10" />
          
          <div className="relative z-10">
            <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-6">
              Contract Premium Computation
            </h4>

            <div className="space-y-4 text-xs font-bold mb-8">
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-slate-400 uppercase tracking-wider">Base Network Rate</span>
                <span className="text-white">{formatINR(premiumData.breakdown.baseRate)}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-slate-400 uppercase tracking-wider">Risk Multiplier ({district?.district || 'Selected Region'})</span>
                <span className="text-emerald-400">×{premiumData.breakdown.regionalRiskMultiplier}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-slate-400 uppercase tracking-wider">Season Factor ({season})</span>
                <span className="text-emerald-400">×{premiumData.breakdown.seasonFactor}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 uppercase tracking-wider">Coverage Nodes ({selected.length} active)</span>
                <span className="text-emerald-400">×{premiumData.breakdown.coverageMultiplier}</span>
              </div>
            </div>

            <div className="pt-6 border-t border-white/10 flex justify-between items-end">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Final Computation</span>
                <span className="text-3xl font-black text-white">
                  {formatINR(premiumData.premium)}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-emerald-400">
                  ≈ {(premiumData.premium / 280000).toFixed(6)} ETH
                </p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                  Live Exchange Rate
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
