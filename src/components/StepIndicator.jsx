import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

export default function StepIndicator({ steps, currentStep }) {
  return (
    <div className="w-full mb-10">
      <div className="flex items-start justify-between max-w-lg mx-auto">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isActive = index === currentStep;

          return (
            <div key={index} className="flex-1 flex flex-col items-center relative">
              {/* Connector line BEFORE this step (skip first) */}
              {index > 0 && (
                <div className="absolute top-5 right-1/2 w-full h-[2px] -z-10">
                  <div className="w-full h-full bg-gray-200 dark:bg-gray-700" />
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: isCompleted || isActive ? '100%' : '0%' }}
                    transition={{ duration: 0.4 }}
                    className="absolute top-0 left-0 h-full bg-primary"
                  />
                </div>
              )}

              {/* Step circle */}
              <motion.div
                initial={false}
                animate={{
                  scale: isActive ? 1.1 : 1,
                }}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold z-10 transition-colors duration-300
                  ${isCompleted ? 'bg-primary text-white shadow-md shadow-primary/30'
                    : isActive ? 'bg-primary text-white shadow-md shadow-primary/30'
                    : 'bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500'}`}
              >
                {isCompleted ? (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                    <Check className="w-5 h-5" />
                  </motion.div>
                ) : (
                  index + 1
                )}
              </motion.div>

              {/* Label */}
              <span
                className={`mt-2.5 text-xs font-medium text-center leading-tight
                  ${isActive || isCompleted ? 'text-primary dark:text-accent' : 'text-text-tertiary dark:text-gray-500'}`}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
