import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Satellite,
  ShieldCheck,
  Zap,
  Sprout,
  ArrowRight,
  MessageCircle,
} from 'lucide-react';
import FarmerAvatar3D from './FarmerAvatar3D';
import './StoryMode.css';

/* ═══════════════════════════════════════════════════
   SCENE DATA
   ═══════════════════════════════════════════════════ */
const scenes = [
  {
    id: 1,
    emoji: '🌾',
    headline: 'Meet Raju — A Farmer From Nagpur',
    description:
      'Raju owns 2 acres in Nagpur district. Every monsoon, he plants soybean — his family\'s entire livelihood. One bad season means debt, hunger, and despair. Traditional insurance never paid him a single rupee.',
    info: { icon: Cloud, text: 'Monsoon season, 2026 — Nagpur, Maharashtra' },
    colors: {
      orb1: 'rgba(16, 185, 129, 0.25)',
      orb2: 'rgba(13, 148, 136, 0.2)',
      orb3: 'rgba(52, 211, 153, 0.12)',
    },
  },
  {
    id: 2,
    emoji: '📱',
    headline: 'Raju Discovers InsureChain',
    description:
      'A friend tells Raju about InsureChain. He opens the app, selects Nagpur district, picks "Drought" as his risk trigger, and registers his 2-acre soybean farm. The entire process takes 3 minutes — no paperwork, no middlemen.',
    info: { icon: ShieldCheck, text: 'Policy registered on Ethereum blockchain' },
    colors: {
      orb1: 'rgba(59, 130, 246, 0.25)',
      orb2: 'rgba(99, 102, 241, 0.2)',
      orb3: 'rgba(139, 92, 246, 0.12)',
    },
  },
  {
    id: 3,
    emoji: '🛰️',
    headline: 'Satellites Watch Over His Farm',
    description:
      'Sentinel-2 satellites scan Raju\'s district every 5 days, measuring vegetation health (NDVI). NASA POWER stations track rainfall, temperature, and soil moisture. All data flows into InsureChain — immutable and tamper-proof.',
    info: { icon: Satellite, text: 'NDVI: 0.82 — Healthy vegetation detected' },
    colors: {
      orb1: 'rgba(6, 182, 212, 0.25)',
      orb2: 'rgba(14, 165, 233, 0.2)',
      orb3: 'rgba(56, 189, 248, 0.12)',
    },
  },
  {
    id: 4,
    emoji: '🌧️',
    headline: 'Drought Strikes Nagpur',
    description:
      'Monsoon fails. Rainfall drops 68% below normal. Raju\'s soybean wilts, NDVI plummets to 0.31. The Chainlink oracle feeds confirmed drought data to the smart contract. The blockchain doesn\'t lie — drought is verified.',
    info: { icon: Zap, text: 'Trigger condition met — NDVI < 0.35' },
    colors: {
      orb1: 'rgba(239, 68, 68, 0.25)',
      orb2: 'rgba(245, 158, 11, 0.22)',
      orb3: 'rgba(251, 191, 36, 0.12)',
    },
  },
  {
    id: 5,
    emoji: '💸',
    headline: 'Instant Payout — No Claims Needed',
    description:
      'Within minutes of trigger confirmation, the Solidity smart contract automatically executes. ₹25,000 flows directly into Raju\'s wallet. No forms, no inspectors, no 12-month wait. Code is law.',
    info: { icon: ShieldCheck, text: '₹25,000 sent — Transaction confirmed on-chain' },
    colors: {
      orb1: 'rgba(16, 185, 129, 0.3)',
      orb2: 'rgba(52, 211, 153, 0.25)',
      orb3: 'rgba(110, 231, 183, 0.15)',
    },
  },
  {
    id: 6,
    emoji: '🌱',
    headline: 'Raju Plants Again, With Confidence',
    description:
      'With the payout, Raju buys seeds for the next season. His family is safe. He tells every farmer in his village about InsureChain. This is what crop insurance should be — instant, transparent, and trustworthy.',
    info: null,
    isFinal: true,
    colors: {
      orb1: 'rgba(16, 185, 129, 0.3)',
      orb2: 'rgba(168, 85, 247, 0.18)',
      orb3: 'rgba(59, 130, 246, 0.12)',
    },
  },
];

/* ═══════════════════════════════════════════════════
   FLOATING PARTICLES
   ═══════════════════════════════════════════════════ */
function FloatingParticles() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    size: Math.random() * 4 + 1,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 15 + 10,
    delay: Math.random() * 8,
    opacity: Math.random() * 0.25 + 0.05,
  }));

  return (
    <>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="story-particle"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            background: 'rgba(255,255,255,0.6)',
          }}
          animate={{
            y: [0, -80, 0],
            x: [0, Math.random() * 40 - 20, 0],
            opacity: [p.opacity, p.opacity * 2, p.opacity],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: p.delay,
          }}
        />
      ))}
    </>
  );
}

/* ═══════════════════════════════════════════════════
   SCENE VIEW
   ═══════════════════════════════════════════════════ */
function SceneView({ scene, direction }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const emoji = el.querySelector('.story-emoji');
    const headline = el.querySelector('.story-headline');
    const desc = el.querySelector('.story-description');
    const card = el.querySelector('.story-info-card');
    const cta = el.querySelector('.story-cta');

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.fromTo(emoji, { y: 30, opacity: 0, scale: 0.6 }, { y: 0, opacity: 1, scale: 1, duration: 0.6 })
      .fromTo(headline, { y: 25, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, '-=0.3')
      .fromTo(desc, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, '-=0.3');

    if (card) {
      tl.fromTo(card, { y: 15, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 }, '-=0.2');
    }
    if (cta) {
      tl.fromTo(cta, { y: 15, opacity: 0, scale: 0.95 }, { y: 0, opacity: 1, scale: 1, duration: 0.5 }, '-=0.2');
    }

    return () => tl.kill();
  }, [scene.id]);

  const variants = {
    enter: (dir) => ({ x: dir > 0 ? 120 : -120, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir < 0 ? 120 : -120, opacity: 0 }),
  };

  return (
    <motion.div
      ref={ref}
      className="story-scene"
      custom={direction}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="story-scene-number">
        <Sprout style={{ width: 12, height: 12 }} />
        Scene {scene.id} of {scenes.length}
      </div>

      <div className="story-emoji">{scene.emoji}</div>

      <h2 className="story-headline">{scene.headline}</h2>

      <p className="story-description">{scene.description}</p>

      {scene.info && (
        <div className="story-info-card">
          <scene.info.icon className="story-info-icon" />
          <span>{scene.info.text}</span>
        </div>
      )}

      {scene.isFinal && (
        <Link to="/login" className="story-cta">
          Protect Your Harvest Now
          <ArrowRight className="cta-icon" />
        </Link>
      )}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════
   STORY MODE (Main Export)
   ═══════════════════════════════════════════════════ */
export default function StoryMode() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentScene, setCurrentScene] = useState(0);
  const [direction, setDirection] = useState(1);
  const [popupDismissed, setPopupDismissed] = useState(false);
  const [showBubble, setShowBubble] = useState(false);

  /* Show speech bubble 1s after popup appears */
  useEffect(() => {
    const t = setTimeout(() => setShowBubble(true), 3000);
    return () => clearTimeout(t);
  }, []);

  const goNext = useCallback(() => {
    if (currentScene < scenes.length - 1) {
      setDirection(1);
      setCurrentScene((s) => s + 1);
    }
  }, [currentScene]);

  const goBack = useCallback(() => {
    if (currentScene > 0) {
      setDirection(-1);
      setCurrentScene((s) => s - 1);
    }
  }, [currentScene]);

  const goToScene = useCallback(
    (index) => {
      setDirection(index > currentScene ? 1 : -1);
      setCurrentScene(index);
    },
    [currentScene]
  );

  const openStory = useCallback(() => {
    setCurrentScene(0);
    setDirection(1);
    setIsOpen(true);
    setPopupDismissed(true);
    document.body.style.overflow = 'hidden';
  }, []);

  const closeStory = useCallback(() => {
    setIsOpen(false);
    document.body.style.overflow = '';
  }, []);

  /* Keyboard nav */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goNext();
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goBack();
      else if (e.key === 'Escape') closeStory();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, goNext, goBack, closeStory]);

  const scene = scenes[currentScene];

  return (
    <>
      {/* ── 3D Farmer Popup Widget ── */}
      <AnimatePresence>
        {!popupDismissed && (
          <motion.div
            className="farmer-popup-wrapper"
            initial={{ opacity: 0, y: 100, scale: 0.6 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 80, scale: 0.5 }}
            transition={{ delay: 1.5, duration: 1, type: 'spring', stiffness: 120, damping: 14 }}
          >
            {/* Speech Bubble */}
            <AnimatePresence>
              {showBubble && (
                <motion.div
                  className="farmer-speech-bubble"
                  initial={{ opacity: 0, scale: 0.7, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  onClick={openStory}
                >
                  {/* Dismiss X */}
                  <button
                    className="farmer-bubble-close"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPopupDismissed(true);
                    }}
                    aria-label="Dismiss"
                  >
                    <X style={{ width: 12, height: 12 }} />
                  </button>

                  <div className="farmer-bubble-content">
                    <span className="farmer-bubble-wave">👋🏽</span>
                    <div>
                      <p className="farmer-bubble-title">Namaste! I'm Raju</p>
                      <p className="farmer-bubble-text">
                        Click to hear my story — how satellite insurance saved my harvest
                      </p>
                    </div>
                    <MessageCircle className="farmer-bubble-arrow" />
                  </div>

                  {/* Bubble tail / pointer */}
                  <div className="farmer-bubble-tail" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* 3D Farmer Character */}
            <motion.div
              className="farmer-avatar-ring"
              onClick={openStory}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              title="Meet Raju — A Farmer's Story"
            >
              <div className="farmer-avatar-glow" />
              <FarmerAvatar3D size={120} />
              {/* Online indicator */}
              <div className="farmer-avatar-status" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Fullscreen Overlay ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="story-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Ambient background */}
            <div className="story-ambient">
              <div
                className="story-ambient-orb orb-1"
                style={{ backgroundColor: scene.colors.orb1 }}
              />
              <div
                className="story-ambient-orb orb-2"
                style={{ backgroundColor: scene.colors.orb2 }}
              />
              <div
                className="story-ambient-orb orb-3"
                style={{ backgroundColor: scene.colors.orb3 }}
              />
              <FloatingParticles />
            </div>

            {/* Film grain */}
            <div className="story-grain" />

            {/* Close button */}
            <button className="story-close" onClick={closeStory} aria-label="Close Story">
              <X style={{ width: 20, height: 20 }} />
            </button>

            {/* Scene content */}
            <div className="story-scene-container">
              <AnimatePresence mode="wait" custom={direction}>
                <SceneView key={scene.id} scene={scene} direction={direction} />
              </AnimatePresence>
            </div>

            {/* Navigation */}
            <div className="story-nav">
              <button
                className="story-nav-btn"
                onClick={goBack}
                disabled={currentScene === 0}
              >
                <ChevronLeft className="nav-icon" />
                Back
              </button>

              <div className="story-dots">
                {scenes.map((_, i) => (
                  <button
                    key={i}
                    className={`story-dot ${
                      i === currentScene ? 'active' : i < currentScene ? 'completed' : ''
                    }`}
                    onClick={() => goToScene(i)}
                    aria-label={`Go to scene ${i + 1}`}
                  />
                ))}
              </div>

              <button
                className={`story-nav-btn ${currentScene < scenes.length - 1 ? 'primary' : ''}`}
                onClick={currentScene < scenes.length - 1 ? goNext : closeStory}
              >
                {currentScene < scenes.length - 1 ? 'Next' : 'Close'}
                <ChevronRight className="nav-icon" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
