import { motion } from 'framer-motion';
import { AlertTriangle, Zap, CheckCircle, Clock, X } from 'lucide-react';
import { getAlertTypeStyle, timeAgo } from '../utils/helpers';

const alertIcons = {
  early_warning: AlertTriangle,
  trigger_fired: Zap,
  payout_confirmed: CheckCircle,
  policy_expiry: Clock,
};

export default function AlertBanner({ alert, onDismiss }) {
  const style = getAlertTypeStyle(alert.type);
  const Icon = alertIcons[alert.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: -10, height: 0 }}
      className={`w-full rounded-xl border-l-4 ${style.bg} ${style.border} p-4 flex items-start justify-between gap-3`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-1.5 rounded-lg ${style.icon} bg-white/60`}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-text-primary dark:text-gray-900">{alert.title}</p>
          <p className="text-sm text-text-secondary mt-0.5 dark:text-gray-700">{alert.message}</p>
          <p className="text-xs text-text-tertiary mt-1">{timeAgo(alert.timestamp)}</p>
        </div>
      </div>
      {onDismiss && (
        <button
          onClick={() => onDismiss(alert.id)}
          className="text-text-tertiary hover:text-text-primary transition-colors p-1"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
}
