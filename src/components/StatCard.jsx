import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function StatCard({ icon: Icon, label, value, trend, trendValue, delay = 0 }) {
  const trendColors = {
    up: 'text-emerald-600',
    down: 'text-red-500',
    neutral: 'text-gray-400',
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -2, boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
      className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 cursor-default
                 dark:bg-gray-800 dark:border-gray-700"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="p-2.5 rounded-lg bg-primary/10">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm font-medium ${trendColors[trend]}`}>
            <TrendIcon className="w-4 h-4" />
            <span>{trendValue}</span>
          </div>
        )}
      </div>
      <p className="text-sm text-text-secondary font-medium mb-1 dark:text-gray-400">{label}</p>
      <p className="text-2xl font-bold font-[family-name:var(--font-heading)] text-text-primary dark:text-white">
        {value}
      </p>
    </motion.div>
  );
}
