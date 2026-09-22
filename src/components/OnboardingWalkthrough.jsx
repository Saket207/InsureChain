import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, X, Play, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { updateFarmerProfile } from '../services/firestoreService';

const TOUR_STEPS = [
  {
    targetId: 'walkthrough-stats-row',
    title: 'Your insurance overview',
    description: 'These cards show your active policies, total coverage amount, pending payouts, and live alerts at a glance.',
    placement: 'bottom'
  },
  {
    targetId: 'walkthrough-risk-card',
    title: 'Your district risk',
    description: 'This shows real time drought, flood, heatwave and frost risk for your district calculated by our ML model using NASA satellite data.',
    placement: 'left'
  },
  {
    targetId: 'walkthrough-register-link',
    title: 'Get covered',
    description: 'Click here to register a crop insurance policy. Choose your triggers, pay a small premium, and get automatically compensated if conditions are met.',
    placement: 'right'
  },
  {
    targetId: 'walkthrough-wallet-btn',
    title: 'Connect your wallet',
    description: 'Connect your MetaMask wallet on Sepolia testnet to pay premiums and receive payouts directly to your wallet address.',
    placement: 'right'
  }
];

export default function OnboardingWalkthrough({ manualTrigger = false, onClose = null }) {
  const { currentUser, farmerProfile, setFarmerProfile } = useAuth();
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);

  // Determine if walkthrough should trigger
  useEffect(() => {
    if (manualTrigger) {
      setActive(true);
      setStep(0);
    } else if (farmerProfile && farmerProfile.hasSeenWalkthrough === false) {
      // Auto-trigger for new profile signup
      setActive(true);
      setStep(0);
    }
  }, [farmerProfile, manualTrigger]);

  // Track target element bounding coordinates on step change, resize or scroll
  useEffect(() => {
    if (!active) return;

    const measureElement = () => {
      const stepData = TOUR_STEPS[step];
      const el = document.getElementById(stepData.targetId);
      
      if (el) {
        // Scroll element into view if it is not inside viewport
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Give smooth scroll a fraction of time to finish before measuring
        setTimeout(() => {
          const rect = el.getBoundingClientRect();
          setTargetRect({
            x: rect.left + window.scrollX,
            y: rect.top + window.scrollY,
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height
          });
        }, 150);
      } else {
        setTargetRect(null); // Fallback to center-screen card if target isn't visible
      }
    };

    measureElement();
    window.addEventListener('resize', measureElement);
    window.addEventListener('scroll', measureElement);
    
    // Periodically remeasure in case other widgets load asynchronously
    const intervalId = setInterval(measureElement, 1000);

    return () => {
      window.removeEventListener('resize', measureElement);
      window.removeEventListener('scroll', measureElement);
      clearInterval(intervalId);
    };
  }, [active, step]);

  const handleComplete = async () => {
    setActive(false);
    if (currentUser?.uid) {
      try {
        await updateFarmerProfile(currentUser.uid, { hasSeenWalkthrough: true });
        setFarmerProfile(prev => ({ ...prev, hasSeenWalkthrough: true }));
      } catch (e) {
        console.error("Failed to update walkthrough state in Firestore:", e);
      }
    }
    if (onClose) onClose();
  };

  if (!active) return null;

  const currentStepData = TOUR_STEPS[step];

  // Dynamic position calculation for the tooltip card nearby the target element
  const getTooltipStyle = () => {
    if (!targetRect) {
      // Default fallback: perfectly centered on viewport
      return {
        position: 'fixed',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: '380px'
      };
    }

    const pad = 16;
    const { left, top, width, height } = targetRect;

    // Positioning based on step configuration
    if (currentStepData.placement === 'bottom') {
      return {
        position: 'fixed',
        left: Math.max(pad, Math.min(window.innerWidth - 380 - pad, left + width / 2 - 190)),
        top: top + height + pad
      };
    }

    if (currentStepData.placement === 'right') {
      return {
        position: 'fixed',
        left: left + width + pad,
        top: Math.max(pad, Math.min(window.innerHeight - 280 - pad, top + height / 2 - 100))
      };
    }

    if (currentStepData.placement === 'left') {
      return {
        position: 'fixed',
        left: Math.max(pad, left - 380 - pad),
        top: Math.max(pad, Math.min(window.innerHeight - 280 - pad, top + height / 2 - 100))
      };
    }

    return {
      position: 'fixed',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      width: '380px'
    };
  };

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* ── Spotlight SVG Mask Overlay ── */}
      <AnimatePresence>
        {targetRect && (
          <svg className="fixed inset-0 w-full h-full pointer-events-none z-[9997]">
            <defs>
              <mask id="walkthrough-spotlight-mask">
                {/* White covers the screen (meaning mask is opaque -> overlay dark) */}
                <rect width="100%" height="100%" fill="white" />
                {/* Black cuts out the mask (meaning transparent spotlight cutout) */}
                <rect 
                  x={targetRect.left - 8} 
                  y={targetRect.top - 8} 
                  width={targetRect.width + 16} 
                  height={targetRect.height + 16} 
                  rx="16" 
                  fill="black" 
                />
              </mask>
            </defs>
            {/* Dark background panel applying the spotlight cutout mask */}
            <rect 
              width="100%" 
              height="100%" 
              fill="rgba(15, 23, 42, 0.75)" 
              mask="url(#walkthrough-spotlight-mask)" 
              className="pointer-events-auto"
            />
          </svg>
        )}
        
        {/* Full-dark backup backdrop if coordinates are offline */}
        {!targetRect && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm pointer-events-auto z-[9997]"
          />
        )}
      </AnimatePresence>

      {/* ── Glowing emerald border around the spotlighted element ── */}
      {targetRect && (
        <div 
          className="fixed border-2 border-emerald-500 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.6)] pointer-events-none z-[9998] transition-all duration-300"
          style={{
            left: targetRect.left - 8,
            top: targetRect.top - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16
          }}
        />
      )}

      {/* ── Walkthrough Tooltip Card ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="fixed bg-white border border-slate-200/80 rounded-[32px] p-6 shadow-[0_20px_50px_rgba(15,23,42,0.3)] pointer-events-auto z-[9999] w-[360px] sm:w-[380px] space-y-4"
        style={getTooltipStyle()}
      >
        {/* Tag & Skip */}
        <div className="flex items-center justify-between">
          <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest border border-emerald-100/50 font-mono">
            Step {step + 1} of 4
          </span>
          <button 
            onClick={handleComplete}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
          >
            Skip <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Text Details */}
        <div className="space-y-1.5">
          <h3 className="text-base font-black text-slate-900 font-heading leading-tight">
            {currentStepData.title}
          </h3>
          <p className="text-xs font-semibold leading-relaxed text-slate-500">
            {currentStepData.description}
          </p>
        </div>

        {/* Shimmer line progress indicators */}
        <div className="flex items-center gap-1.5 py-1">
          {[0, 1, 2, 3].map((s) => (
            <span 
              key={s} 
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step 
                  ? 'bg-emerald-500 w-6' 
                  : 'bg-slate-100 border border-slate-200/40 w-2.5'
              }`} 
            />
          ))}
        </div>

        {/* Buttons Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <button
            onClick={() => setStep(prev => Math.max(0, prev - 1))}
            disabled={step === 0}
            className={`flex items-center gap-1 text-xs font-black uppercase tracking-widest transition-colors outline-none
              ${step === 0 
                ? 'text-slate-300 cursor-not-allowed' 
                : 'text-slate-400 hover:text-slate-700'}`}
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep(prev => Math.min(3, prev + 1))}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-emerald-500/10 flex items-center gap-1 hover:-translate-y-0.5 active:translate-y-0"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-emerald-500/10 flex items-center gap-1.5 hover:-translate-y-0.5 active:translate-y-0 animate-pulse"
            >
              Get Started <Play className="w-3.5 h-3.5 fill-white stroke-none" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
