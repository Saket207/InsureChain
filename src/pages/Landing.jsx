import { useEffect, useRef, useState } from 'react';
import StoryMode from '../components/StoryMode';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  Satellite,
  Brain,
  ShieldCheck,
  MessageSquare,
  ArrowRight,
  Users,
  XCircle,
  Clock,
  Leaf,
  ChevronRight,
  Map,
  Zap,
} from 'lucide-react';

/* ── Animated Counter ── */
function AnimatedCounter({ end, suffix = '', prefix = '', duration = 2 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const step = end / (duration * 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [isInView, end, duration]);

  return <span ref={ref}>{prefix}{count.toLocaleString('en-IN')}{suffix}</span>;
}

/* ═══════════════════════════════════════════════════
   LANDING PAGE
   ═══════════════════════════════════════════════════ */
export default function Landing() {
  const districts = ['Nagpur', 'Amravati', 'Wardha', 'Yavatmal', 'Akola', 'Buldhana', 'Washim'];

  return (
    <div className="min-h-screen bg-slate-50 font-[family-name:var(--font-sans)]">
      {/* ── Sticky Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-black font-[family-name:var(--font-heading)] text-slate-900 tracking-tight">
              InsureChain
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="text-sm font-bold text-slate-500 hover:text-emerald-600 transition-colors uppercase tracking-widest">How it Works</a>
            <a href="#features" className="text-sm font-bold text-slate-500 hover:text-emerald-600 transition-colors uppercase tracking-widest">Features</a>
            <Link to="/heatmap" className="text-sm font-bold text-slate-500 hover:text-emerald-600 transition-colors uppercase tracking-widest">Risk Map</Link>
            <Link
              to="/login"
              className="px-6 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-emerald-600 transition-all shadow-md hover:shadow-xl hover:shadow-emerald-500/20 hover:-translate-y-0.5"
            >
              Get Started
            </Link>
          </div>

          <Link to="/login" className="md:hidden px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold shadow-md shadow-emerald-500/20">
            Start
          </Link>
        </div>
      </nav>

      {/* ═══ HERO SECTION ═══ */}
      <section className="relative min-h-[100svh] flex items-center bg-slate-900 overflow-hidden pt-20">
        {/* Decorative elements */}
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="absolute top-0 right-0 w-[800px] h-[800px] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full bg-blue-500/10 blur-[100px] pointer-events-none" />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-24 lg:py-0">
          <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-20">
            {/* Text */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="flex-1 text-center lg:text-left max-w-2xl lg:max-w-none"
            >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-400 mb-8 uppercase tracking-widest"
              >
                <Zap className="w-4 h-4" />
                Powered by Satellite Data + Blockchain
              </motion.div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.1] mb-8 font-[family-name:var(--font-heading)] tracking-tight">
                Crop Insurance That <br className="hidden sm:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">Actually Pays.</span>
              </h1>
              <p className="text-lg sm:text-xl text-slate-300 max-w-2xl leading-relaxed mb-10 mx-auto lg:mx-0 font-medium">
                Parametric crop insurance powered by <span className="text-white font-bold">satellite intelligence</span> and <span className="text-white font-bold">smart contracts</span>. 
                InsureChain eliminates paperwork, bureaucracy, and delays. When extreme weather hits, payouts are triggered instantly and automatically to your wallet. Absolute security for the modern farmer.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                <Link
                  to="/login"
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-emerald-500 text-white font-bold text-lg hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 hover:-translate-y-1"
                >
                  Register as Farmer
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  to="/heatmap"
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/5 text-white font-bold text-lg hover:bg-white/10 transition-all border border-white/10 flex items-center justify-center gap-2 backdrop-blur-sm hover:-translate-y-1"
                >
                  <Map className="w-5 h-5" />
                  View Risk Map
                </Link>
              </div>
            </motion.div>

            {/* Visual / Illustration with HD Image and Enhanced Crop Animations */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.3, type: "spring" }}
              className="flex-1 hidden lg:flex items-center justify-center relative w-full max-w-[600px] mx-auto"
            >
              {/* Enhanced Floating Leaves & Glowing Orbs Background */}
              <div className="absolute inset-[-100px] z-0 pointer-events-none">
                {/* Floating Leaves */}
                {[...Array(12)].map((_, i) => {
                  const size = Math.random() > 0.5 ? 'w-8 h-8' : 'w-5 h-5';
                  const isTeal = Math.random() > 0.5;
                  return (
                    <motion.div
                      key={`leaf-${i}`}
                      className="absolute"
                      initial={{ 
                        x: Math.random() * 600 - 100, 
                        y: Math.random() * 600 - 100,
                        rotate: Math.random() * 360,
                        opacity: 0,
                        scale: Math.random() * 0.5 + 0.5
                      }}
                      animate={{ 
                        x: [null, Math.random() * 600 - 100],
                        y: [null, Math.random() * -200 - 100],
                        rotate: Math.random() * 360 + 180,
                        opacity: [0, Math.random() * 0.8 + 0.2, 0],
                        scale: [null, Math.random() * 1 + 0.5]
                      }}
                      transition={{ 
                        duration: Math.random() * 8 + 7,
                        repeat: Infinity,
                        ease: "linear",
                        delay: Math.random() * 5
                      }}
                    >
                      <Leaf className={`${size} ${isTeal ? 'text-teal-400' : 'text-emerald-500'} drop-shadow-[0_0_15px_rgba(16,185,129,0.5)] blur-[1px]`} />
                    </motion.div>
                  )
                })}
                
                {/* Glowing Tech Orbs */}
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={`orb-${i}`}
                    className="absolute rounded-full blur-[8px]"
                    initial={{ 
                      x: Math.random() * 600 - 100, 
                      y: Math.random() * 600 - 100,
                      opacity: 0
                    }}
                    animate={{ 
                      y: [null, Math.random() * -150 - 50],
                      opacity: [0, 0.5, 0],
                      scale: [0.5, 1.5, 0.5]
                    }}
                    transition={{ 
                      duration: Math.random() * 5 + 4,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: Math.random() * 4
                    }}
                    style={{
                      width: Math.random() * 20 + 10 + 'px',
                      height: Math.random() * 20 + 10 + 'px',
                      backgroundColor: Math.random() > 0.5 ? '#10b981' : '#2dd4bf', // emerald or teal
                    }}
                  />
                ))}
              </div>

              {/* Main Image Frame */}
              <div className="relative w-full aspect-square max-w-[500px] rounded-[3rem] overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.15)] border border-slate-700/50 group z-10">
                <img 
                  src="/hero-bg-v2.png" 
                  alt="Futuristic Aesthetic Crop Seedling" 
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                />
                
                {/* Image Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent pointer-events-none" />

                {/* Floating UI Elements over Image */}
                <motion.div
                  animate={{ y: [-8, 8, -8] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute top-8 right-8 bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-slate-700 shadow-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 pulse-emerald" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Live NDVI</p>
                      <p className="text-xl font-black text-white leading-none">0.82 <span className="text-emerald-500 text-sm">Optimal</span></p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  animate={{ y: [8, -8, 8] }}
                  transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                  className="absolute bottom-8 left-8 bg-emerald-600/90 backdrop-blur-md rounded-2xl p-4 border border-emerald-500 shadow-xl"
                >
                  <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest leading-none mb-1">Blockchain Link</p>
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-white" />
                    <p className="text-xl font-black text-white leading-none">Connected</p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 2, repeat: Infinity }} className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 hidden sm:block">
          <div className="w-8 h-14 rounded-full border-2 border-white/20 flex items-start justify-center pt-2 backdrop-blur-sm bg-white/5">
            <div className="w-1.5 h-3 rounded-full bg-emerald-500" />
          </div>
        </motion.div>
      </section>

      {/* ═══ PROBLEM STATS ═══ */}
      <section className="py-24 sm:py-32 bg-white relative">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-black font-[family-name:var(--font-heading)] text-slate-900 mb-6 tracking-tight">
              The Problem is <span className="text-rose-500">Massive</span>
            </h2>
            <p className="text-slate-500 max-w-3xl mx-auto text-lg leading-relaxed font-medium">
              Indian crop insurance is fundamentally broken. Millions of farmers pay premiums but
              never see a payout when disaster strikes due to bureaucracy and corruption.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Users, value: 150, suffix: 'M+', label: 'Small Farmers in India', description: 'The most climate-vulnerable population in the world, facing increasing extreme weather.', color: 'rose' },
              { icon: XCircle, value: 30, prefix: '<', suffix: '%', label: 'Claim Settlement Rate', description: 'Most claims are rejected due to bureaucratic processes, lack of evidence, or endless delays.', color: 'amber' },
              { icon: Clock, value: 12, suffix: ' months', label: 'Average Payout Delay', description: 'Even approved claims take 6–12 months to reach farmers, long after the crop season is lost.', color: 'slate' },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="bg-white rounded-[2rem] p-10 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all flex flex-col items-center text-center relative overflow-hidden group"
              >
                <div className={`absolute inset-0 bg-gradient-to-b from-${stat.color}-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className={`w-16 h-16 rounded-2xl bg-${stat.color}-50 flex items-center justify-center mb-8 relative z-10 group-hover:scale-110 transition-transform duration-500`}>
                  <stat.icon className={`w-8 h-8 text-${stat.color}-500`} />
                </div>
                <div className="text-5xl font-black font-[family-name:var(--font-heading)] text-slate-900 mb-4 relative z-10 tracking-tight">
                  <AnimatedCounter end={stat.value} suffix={stat.suffix} prefix={stat.prefix} />
                </div>
                <p className="text-lg font-bold text-slate-900 mb-3 relative z-10">{stat.label}</p>
                <p className="text-base text-slate-500 leading-relaxed relative z-10">{stat.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section id="how-it-works" className="py-24 sm:py-32 bg-slate-50 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-24">
            <h2 className="text-4xl sm:text-5xl font-black font-[family-name:var(--font-heading)] text-slate-900 mb-6 tracking-tight">
              How InsureChain Works
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto text-lg leading-relaxed font-medium">
              Three simple steps to absolute financial security. No paperwork. No waiting.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-8 relative">
            {/* Connecting line between steps (desktop only) */}
            <div className="hidden md:block absolute top-[52px] left-[15%] right-[15%] h-[3px] bg-slate-200 z-0" />

            {[
              { number: 1, icon: Users, title: 'Register Your Farm', description: 'Select your district, choose which weather risks to cover — drought, flood, heatwave, or frost — and pick your crop season.' },
              { number: 2, icon: Brain, title: 'Pay Smart Premium', description: "Our ML risk engine calculates a fair premium based on your district's historical weather data, NDVI trends, and seasonal risk profile." },
              { number: 3, icon: Zap, title: 'Auto Payout', description: 'When satellite and weather data confirm a trigger condition, the smart contract sends payout to your wallet automatically. No claims needed.' },
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.2 }}
                className="relative flex flex-col items-center text-center z-10 group"
              >
                <div className="relative mb-10">
                  <div className="w-28 h-28 rounded-[2rem] bg-white flex items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.06)] group-hover:-translate-y-2 group-hover:shadow-[0_20px_40px_rgba(16,185,129,0.15)] transition-all duration-500 border border-slate-100 group-hover:border-emerald-100">
                    <step.icon className="w-12 h-12 text-emerald-600 group-hover:scale-110 transition-transform duration-500" />
                  </div>
                  <div className="absolute -top-4 -right-4 w-10 h-10 rounded-xl bg-slate-900 text-white text-base font-black flex items-center justify-center shadow-lg border-4 border-slate-50 group-hover:bg-emerald-500 transition-colors duration-500">
                    {step.number}
                  </div>
                </div>

                <h3 className="text-2xl font-black font-[family-name:var(--font-heading)] text-slate-900 mb-4">
                  {step.title}
                </h3>
                <p className="text-base text-slate-500 leading-relaxed max-w-[280px]">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="features" className="py-24 sm:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-black font-[family-name:var(--font-heading)] text-slate-900 mb-6 tracking-tight">
              Why InsureChain
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto text-lg leading-relaxed font-medium">
              Built with the latest in satellite technology, machine learning, and blockchain to
              make crop insurance actually work for the farmer.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Satellite, title: 'Satellite Verified', description: 'NDVI from Sentinel-2 satellites combined with NASA POWER weather data. Immutable and impossible to fake.' },
              { icon: Brain, title: 'ML Powered Pricing', description: 'XGBoost + LSTM models calculate fair premiums based on real district-level historical risk data.' },
              { icon: ShieldCheck, title: 'Blockchain Guaranteed', description: 'Solidity smart contracts on Ethereum enforce automatic payouts. Code is law — no human middlemen.' },
              { icon: MessageSquare, title: 'Instant Alerts', description: 'SMS and email notifications. Know your risk and get early warnings before disaster strikes.' },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ y: -8 }}
                className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(16,185,129,0.1)] hover:border-emerald-100 transition-all duration-300 flex flex-col group"
              >
                <div className="w-14 h-14 rounded-2xl bg-slate-50 group-hover:bg-emerald-50 flex items-center justify-center mb-6 flex-shrink-0 transition-colors duration-300">
                  <feature.icon className="w-7 h-7 text-slate-700 group-hover:text-emerald-600 transition-colors duration-300" />
                </div>
                <h3 className="text-xl font-black font-[family-name:var(--font-heading)] text-slate-900 mb-3 group-hover:text-emerald-700 transition-colors duration-300">
                  {feature.title}
                </h3>
                <p className="text-slate-500 leading-relaxed font-medium">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ ABOUT THE DEVELOPER ═══ */}
      <section className="relative py-32 overflow-hidden flex items-center justify-center min-h-[600px]">
        {/* Large Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/developer-bg.png" 
            alt="Indian Farmer Silhouette" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-slate-900/80 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 sm:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <p className="text-sm font-black text-emerald-400 uppercase tracking-widest mb-4">About the Project</p>
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-8 font-[family-name:var(--font-heading)] tracking-tight">
              Built with ❤️ by <span className="text-emerald-400">Saket Kumar</span>
            </h2>
            
            <div className="max-w-2xl mx-auto bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-[2rem] shadow-2xl">
              <p className="text-xl text-emerald-50 mb-6 font-medium leading-relaxed">
                Developer at <span className="font-bold text-white">Dayananda Sagar College of Engineering</span>. 
                Passionate about using Web3, Machine Learning, and Satellite tech to solve real-world problems for farmers.
              </p>
              
              <div className="w-16 h-px bg-white/20 mx-auto mb-6" />
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm font-bold text-slate-300">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                    <Users className="w-4 h-4 text-emerald-400" />
                  </div>
                  Saket Kumar
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                  </div>
                  <a href="mailto:saketk207@gmail.com" className="hover:text-white transition-colors">saketk207@gmail.com</a>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="py-24 sm:py-32 bg-emerald-600 relative overflow-hidden">
        <div className="absolute inset-0 geo-pattern opacity-10 mix-blend-overlay" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/10 rounded-full blur-[80px]" />
        
        <div className="relative z-10 max-w-4xl mx-auto px-6 sm:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6 font-[family-name:var(--font-heading)] tracking-tight">
              Ready to Protect Your Harvest?
            </h2>
            <p className="text-xl text-emerald-100 mb-10 max-w-2xl mx-auto font-medium leading-relaxed">
              Join hundreds of farmers already using InsureChain for real, guaranteed crop protection.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-white text-emerald-700 font-black text-lg hover:bg-slate-50 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1"
            >
              Start Free Registration
              <ChevronRight className="w-6 h-6" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="bg-slate-950 text-slate-400 py-16 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
                  <Leaf className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-black text-white font-[family-name:var(--font-heading)]">InsureChain</span>
              </div>
              <p className="text-base leading-relaxed max-w-sm font-medium">
                Decentralized parametric crop insurance for Indian farmers. Satellite-verified.
                ML-powered. Blockchain-guaranteed.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-black mb-6 text-slate-300 uppercase tracking-widest">Platform</h4>
              <ul className="space-y-4 text-sm font-bold">
                <li><Link to="/heatmap" className="hover:text-emerald-400 transition-colors">Risk Heatmap</Link></li>
                <li><Link to="/governance" className="hover:text-emerald-400 transition-colors">Governance</Link></li>
                <li><a href="#how-it-works" className="hover:text-emerald-400 transition-colors">How it Works</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-black mb-6 text-slate-300 uppercase tracking-widest">Contact</h4>
              <ul className="space-y-4 text-sm font-bold">
                <li className="text-slate-400">Saket Kumar</li>
                <li><a href="mailto:saketk207@gmail.com" className="hover:text-emerald-400 transition-colors text-slate-400">saketk207@gmail.com</a></li>
              </ul>
            </div>

          </div>

          <div className="mt-16 pt-8 border-t border-slate-800/50 flex flex-col md:flex-row items-center justify-between gap-4 font-medium">
            <p className="text-sm">
              © 2026 InsureChain. This is a testnet pilot — no real funds involved.
            </p>
            <div className="flex items-center gap-6 text-sm">
              <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 pulse-emerald" /> Sepolia Testnet</span>
              <span className="text-slate-600">|</span>
              <span>v1.0.0-beta</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ── Story Mode (Isolated Component) ── */}
      <StoryMode />
    </div>
  );
}
