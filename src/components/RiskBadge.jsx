import { motion } from 'framer-motion';
import { getRiskColor } from '../utils/helpers';

export default function RiskBadge({ level, size = 'md', showDot = false }) {
  const colors = getRiskColor(level);
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  return (
    <motion.span
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold font-[family-name:var(--font-body)] ${colors.bg} ${colors.text} ${sizeClasses[size]}`}
    >
      {showDot && (
        <span
          className={`w-2 h-2 rounded-full ${level === 'Critical' ? 'animate-pulse-dot' : ''}`}
          style={{ backgroundColor: colors.hex }}
        />
      )}
      {level}
    </motion.span>
  );
}
