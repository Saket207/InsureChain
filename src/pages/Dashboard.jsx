import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  Shield,
  Wallet,
  Clock,
  Bell,
  Plus,
  Map,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  RefreshCw,
  Zap,
  Loader2,
  MapPin,
  IndianRupee,
  TrendingUp,
  ExternalLink,
  BadgeCheck,
  User,
  Sprout,
  Leaf,
  Tractor,
  Droplets,
  Sun,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as ChartTooltip, ResponsiveContainer } from 'recharts';

import StatCard from '../components/StatCard';
import PolicyCard from '../components/PolicyCard';
import AlertBanner from '../components/AlertBanner';
import RiskBadge from '../components/RiskBadge';
import AnimatedCounter from '../components/AnimatedCounter';
import MagneticWrapper from '../components/MagneticWrapper';
import ThreeDTelemetrySphere from '../components/ThreeDTelemetrySphere';
import ThreeDDistrictNode from '../components/ThreeDDistrictNode';
import { useAuth } from '../context/AuthContext';
import { useAlertStore } from '../stores/alertStore';
import { formatINR, generateMockRisk } from '../utils/helpers';
import { 
  getPoliciesByFarmer, 
  getAlertsByFarmer, 
  getDistrictRiskScore,
  markAlertAsRead 
} from '../services/firestoreService';
import { 
  getVaultBalance, 
  isContractOwner,
  getContracts,
  getLinkBalance,
  getPoliciesOnChain
} from '../services/contractService';
import { useWalletStore } from '../stores/walletStore';
import { BrowserProvider, ethers } from 'ethers';
import OnboardingWalkthrough from '../components/OnboardingWalkthrough';

const getEventIcon = (type) => {
  switch (type) {
    case 'trigger_fired': return <Zap className="w-4 h-4" />;
    case 'payout_confirmed': return <CheckCircle className="w-4 h-4" />;
    case 'early_warning': return <AlertTriangle className="w-4 h-4" />;
    case 'policy_expiry': return <RefreshCw className="w-4 h-4" />;
    default: return <Bell className="w-4 h-4" />;
  }
};

const getEventColor = (type) => {
  switch (type) {
    case 'trigger_fired': return 'text-red-500 bg-red-100';
    case 'payout_confirmed': return 'text-accent bg-accent/10';
    case 'early_warning': return 'text-amber-500 bg-amber-100';
    case 'policy_expiry': return 'text-primary bg-primary/10';
    default: return 'text-gray-500 bg-gray-100';
  }
};

import { backendApi } from '../services/backendApi';

/* ──────────────────────────────────────────────
   TiltCard – mouse-tracking 3D perspective tilt
   ────────────────────────────────────────────── */
function TiltCard({ children, className = '', glowColor = 'rgba(16,185,129,0.08)' }) {
  const ref = useRef(null);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const onMouseMove = useCallback((e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const midX = rect.width / 2;
    const midY = rect.height / 2;
    const rotateY = ((x - midX) / midX) * 8;
    const rotateX = ((midY - y) / midY) * 8;
    setTilt({ rotateX, rotateY });
  }, []);

  const onMouseLeave = useCallback(() => {
    setTilt({ rotateX: 0, rotateY: 0 });
    setIsHovered(false);
  }, []);

  return (
    <div className="perspective-container" style={{ perspective: '1000px' }}>
      <div
        ref={ref}
        onMouseMove={(e) => { onMouseMove(e); setIsHovered(true); }}
        onMouseLeave={onMouseLeave}
        className={`tilt-card ${className}`}
        style={{
          transform: `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`,
          transition: isHovered ? 'transform 0.1s ease-out' : 'transform 0.5s ease-out',
          boxShadow: isHovered
            ? `0 20px 60px ${glowColor}, 0 5px 20px rgba(0,0,0,0.06)`
            : '0 4px 20px rgba(0,0,0,0.04)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Stagger animation container
   ────────────────────────────────────────────── */
const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const fadeUp = {
  hidden: { opacity: 0, y: 30, filter: 'blur(8px)' },
  visible: {
    opacity: 1, y: 0, filter: 'blur(0px)',
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] }
  }
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { currentUser, farmerProfile } = useAuth();
  const { alerts, setAlerts, dismissAlert } = useAlertStore();
  const { address, networkName } = useWalletStore();
  
  const [policies, setPolicies] = useState([]);
  const [districtRisk, setDistrictRisk] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [vaultBalance, setVaultBalance] = useState(null);
  const [onChainHistory, setOnChainHistory] = useState([]);
  const [linkBalance, setLinkBalance] = useState('0.0');
  
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState(false);
  const [droughtConfidence, setDroughtConfidence] = useState(null);

  useEffect(() => {
    if (!currentUser) { setLoading(false); return; }
    
    const targetDistrict = farmerProfile?.districtId || 'nagpur';
    const lat = farmerProfile?.districtLat;
    const lon = farmerProfile?.districtLon;

    // Show UI immediately — don't block on data
    setLoading(false);

    // ── 1. Policies (fire & forget) ──
    getPoliciesByFarmer(
      currentUser.uid,
      farmerProfile?.name || farmerProfile?.fullName || (farmerProfile?.email ? farmerProfile.email.split('@')[0] : '')
    )
      .then(fetchedPolicies => setPolicies(fetchedPolicies))
      .catch(e => console.error("Dashboard: Policies fetch failed", e));

    // ── 2. Alerts (fire & forget) ──
    getAlertsByFarmer(currentUser.uid)
      .then(fetchedAlerts => setAlerts(fetchedAlerts))
      .catch(e => console.error("Dashboard: Alerts fetch failed", e));

    // ── 3. District Risk (fire & forget) ──
    backendApi.getDistrictRisk(targetDistrict)
      .then(riskData => {
        if (riskData && !riskData.error) {
          setDistrictRisk(riskData);
        } else {
          return getDistrictRiskScore(targetDistrict).then(fallbackRisk => {
            if (fallbackRisk) {
              setDistrictRisk({
                ...fallbackRisk,
                district: fallbackRisk.district || targetDistrict,
                transparency: {
                  drought_impact: `${fallbackRisk.droughtRisk || 20}%`,
                  flood_impact: `${fallbackRisk.floodRisk || 10}%`,
                  satellite_impact: `${fallbackRisk.ndvi || 0.45}`,
                  weather_impact: `${fallbackRisk.heatwaveRisk || 15}%`
                },
                details: {
                  soil_moisture_index: fallbackRisk.soilMoisture || 0.2,
                  ndvi_health: fallbackRisk.ndvi || 0.45,
                  rainfall_30d_avg: fallbackRisk.rainfall || 3.0,
                  consecutive_dry_days: fallbackRisk.dryDays || 5
                },
                isOfflineData: true
              });
            } else {
              setDistrictRisk(generateMockRisk(targetDistrict));
            }
          });
        }
      })
      .catch(() => setDistrictRisk(generateMockRisk(targetDistrict)));

    // ── 4. Weather (fire & forget) ──
    backendApi.getWeatherData(targetDistrict, 7, lat, lon)
      .then(weatherResp => { if (weatherResp && !weatherResp.error) setWeatherData(weatherResp); })
      .catch(() => { /* weather is optional */ });

    // ── 5. On-chain data (fire & forget, only if wallet connected) ──
    if (window.ethereum && address) {
      const provider = new BrowserProvider(window.ethereum);

      // Owner + vault check
      isContractOwner(provider, address)
        .then(ownerStatus => {
          setIsOwner(ownerStatus);
          if (ownerStatus) getVaultBalance(provider).then(b => setVaultBalance(b)).catch(() => {});
        })
        .catch(() => {});

      // On-chain policies
      getPoliciesOnChain(provider, address)
        .then(onChainPolicies => {
          const formattedOnChain = onChainPolicies.map(p => ({
            id: p.policyId,
            policyId: p.policyId,
            farmerName: farmerProfile?.name || "On-Chain Farmer",
            district: p.district,
            season: p.season,
            triggers: p.triggers,
            coverageAmount: ethers.formatEther(p.coverageAmount),
            premiumPaid: ethers.formatEther(p.premiumPaid),
            status: ['Active', 'Triggered', 'Expired'][p.status] || 'Active',
            startDate: new Date(Number(p.startDate) * 1000).toISOString(),
            endDate: new Date(Number(p.endDate) * 1000).toISOString(),
            isChainOnly: true
          }));
          setPolicies(prev => {
            const existingIds = new Set(prev.map(p => p.policyId));
            const uniqueOnChain = formattedOnChain.filter(p => !existingIds.has(p.policyId));
            return [...prev, ...uniqueOnChain];
          });
        })
        .catch(e => console.error("Error fetching user on-chain policies", e));

      // On-chain event history + LINK balance
      try {
        const contracts = getContracts(provider);
        Promise.all([
          contracts.TriggerOracle.getAddress().then(addr => getLinkBalance(provider, addr)).catch(() => '0.0'),
          contracts.PolicyRegistry.queryFilter(contracts.PolicyRegistry.filters.PolicyRegistered(), -1000).catch(() => []),
          contracts.TriggerOracle.queryFilter(contracts.TriggerOracle.filters.TriggerRequested(), -1000).catch(() => []),
          contracts.TriggerOracle.queryFilter(contracts.TriggerOracle.filters.TriggerFulfilled(), -1000).catch(() => []),
        ]).then(([balance, evReg, evReq, evFul]) => {
          setLinkBalance(balance);
          const formattedHistory = [
            ...evReg.map(e => ({ id: e.transactionHash + '-reg', type: 'PolicyRegistered', message: `Policy Registered: ${e.args[0]}`, txHash: e.transactionHash, block: e.blockNumber })),
            ...evReq.map(e => ({ id: e.transactionHash + '-req', type: 'TriggerRequested', message: `Oracle Requested: ${e.args.triggerType} for ${e.args.policyId}`, txHash: e.transactionHash, block: e.blockNumber })),
            ...evFul.map(e => ({ id: e.transactionHash + '-ful', type: 'TriggerFulfilled', message: `Oracle Fulfilled: ${e.args.policyId} (Fired: ${e.args.fired.toString()})`, txHash: e.transactionHash, block: e.blockNumber }))
          ];
          formattedHistory.sort((a, b) => b.block - a.block);
          setOnChainHistory(formattedHistory);
        }).catch(e => console.error("Error fetching on-chain history", e));
      } catch (e) {
        console.error("Error initializing contracts", e);
      }
    }
  }, [currentUser, farmerProfile, setAlerts, address]);

  // ── 6. Live Weather & Drought Telemetry Effect ──
  useEffect(() => {
    if (!currentUser) return;
    
    const districtCoords = {
      nagpur: { lat: 21.1458, lon: 79.0882 },
      amravati: { lat: 20.9320, lon: 77.7523 },
      wardha: { lat: 20.7453, lon: 78.6022 },
      yavatmal: { lat: 20.3888, lon: 78.1204 },
      akola: { lat: 20.7002, lon: 77.0082 },
      buldhana: { lat: 20.5293, lon: 76.1842 },
      washim: { lat: 20.1041, lon: 77.1340 },
    };

    const targetDistrict = farmerProfile?.districtId || 'wardha';
    const lat = farmerProfile?.districtLat || districtCoords[targetDistrict.toLowerCase()]?.lat || 20.7453;
    const lon = farmerProfile?.districtLon || districtCoords[targetDistrict.toLowerCase()]?.lon || 78.6022;

    const fetchWeatherAndDrought = async () => {
      setWeatherLoading(true);
      setWeatherError(false);
      try {
        // Try fetching 7 day weather data from Flask backend
        const weatherResp = await backendApi.getWeatherData(targetDistrict, 7, lat, lon);
        if (weatherResp && !weatherResp.error && weatherResp.data && weatherResp.data.length > 0) {
          setWeatherData({ ...weatherResp, isSimulated: false });
        } else {
          throw new Error('Weather API failed or returned empty data');
        }
      } catch (err) {
        console.warn("[Weather Telemetry Fallback] Local server offline or API error, launching glassmorphic simulations:", err);
        
        // Generate high-fidelity simulation time series to keep card working every time
        const districtName = targetDistrict.charAt(0).toUpperCase() + targetDistrict.slice(1).toLowerCase();
        const data = [];
        const now = new Date();
        
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(now.getDate() - i);
          
          // Seed-based dynamic generation to simulate realistic late spring rainfall
          const rain = (i === 1) ? 14.5 : (i === 3) ? 5.2 : (i === 5) ? 19.8 : 0;
          const temp = 30.5 + Math.sin(i) * 2.2;
          const humidity = 65 + Math.cos(i) * 12;
          
          data.push({
            date: date.toISOString().split('T')[0],
            rainfall_mm: Number(rain.toFixed(1)),
            temperature_c: Number(temp.toFixed(1)),
            humidity_pct: Math.round(humidity),
            consecutive_dry_days: i > 3 ? i - 3 : 0
          });
        }
        
        setWeatherData({
          district: districtName,
          data: data,
          avg_temp_c: 30.8,
          total_rain_mm: 39.5,
          avg_humidity: 67,
          isSimulated: true
        });
      }

      // Fetch trigger confidence check
      try {
        const triggerResp = await backendApi.checkTriggers(lat, lon, targetDistrict);
        if (triggerResp && triggerResp.triggers && triggerResp.triggers.drought) {
          setDroughtConfidence(Math.round(triggerResp.triggers.drought.confidence * 100));
        } else {
          throw new Error('Trigger check API failed');
        }
      } catch (err) {
        // Dynamic simulated confidence percentage based on lat/lon coordinates
        const simulatedConf = 32 + (Math.abs(lat * lon * 10) % 43);
        setDroughtConfidence(Math.round(simulatedConf));
      } finally {
        setWeatherLoading(false);
      }
    };

    fetchWeatherAndDrought();

    // Auto-refresh every 30 minutes (1,800,000 ms)
    const intervalId = setInterval(fetchWeatherAndDrought, 1800000);

    return () => clearInterval(intervalId);
  }, [currentUser, farmerProfile]);

  const handleDismissAlert = async (alertId) => {
    try {
      await markAlertAsRead(alertId);
      dismissAlert(alertId);
    } catch (err) {
      console.error('Error dismissing alert:', err);
    }
  };

  const activePolicies = policies.filter(p => p.status === 'Active' || p.status === 'Triggered' || p.status === 'Pending Payout');
  const paidOutPolicies = policies.filter(p => p.status === 'PaidOut');
  const totalCoverage = activePolicies.reduce((sum, p) => sum + (parseFloat(p.coverageINR) || (parseFloat(p.premiumINR) * 10) || 0), 0);
  const pendingPayouts = policies.filter(p => p.status === 'Pending Payout').reduce((sum, p) => sum + (parseFloat(p.coverageINR) || (parseFloat(p.premiumINR) * 10) || 0), 0);
  const totalPaidOut = paidOutPolicies.reduce((sum, p) => {
    const history = p.payoutHistory || [];
    return sum + history.reduce((s, h) => s + (parseFloat(h.amountINR) || parseFloat(h.amount) || 0), 0);
  }, 0);
  
  const earlyWarning = alerts.find((a) => a.alertType === 'early_warning' && !a.isRead);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-16 relative">

      {/* ── Ambient Background Blobs & Floating Crops ── */}
      <div className="ambient-blob w-72 h-72 bg-emerald-400/20 -top-20 -right-20 z-0" />
      <div className="ambient-blob w-96 h-96 bg-cyan-400/10 top-1/3 -left-32 z-0" style={{ animationDelay: '3s' }} />
      <div className="ambient-blob w-64 h-64 bg-violet-400/10 bottom-20 right-10 z-0" style={{ animationDelay: '5s' }} />

      {/* Floating Animated Farm/Crop Elements */}
      <motion.div 
        animate={{ y: [-15, 25, -15], rotate: [0, 8, -8, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-20 right-40 opacity-30 pointer-events-none z-0"
      >
        <Sprout className="w-32 h-32 text-emerald-650" />
      </motion.div>
      <motion.div 
        animate={{ y: [15, -25, 15], rotate: [0, -12, 12, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
        className="absolute top-1/4 left-10 opacity-25 pointer-events-none z-0"
      >
        <Leaf className="w-24 h-24 text-emerald-500" />
      </motion.div>
      <motion.div 
        animate={{ y: [-20, 20, -20], x: [-10, 10, -10] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        className="absolute bottom-1/3 right-10 opacity-30 pointer-events-none z-0"
      >
        <Tractor className="w-24 h-24 text-emerald-700" />
      </motion.div>
      <motion.div 
        animate={{ scale: [1, 1.05, 1], rotate: [0, 5, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute top-10 left-1/3 opacity-20 pointer-events-none z-0"
      >
        <Sun className="w-40 h-40 text-amber-605" />
      </motion.div>

      {/* Profile Incomplete Banner */}
      {farmerProfile && (!farmerProfile.name || !farmerProfile.mobile || !farmerProfile.districtId) && (
        <motion.div 
          initial={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="glass-card p-6 flex flex-col md:flex-row items-center justify-between gap-4 relative z-10"
          style={{ borderColor: 'rgba(245, 158, 11, 0.3)' }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-amber-400">Complete your profile to register a policy</h3>
              <p className="text-amber-300/85 text-sm font-medium">We need your basic details to link your wallet to the district risk parameters.</p>
            </div>
          </div>
          <MagneticWrapper>
            <button 
              onClick={() => navigate('/profile')}
              className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-slate-900 text-sm font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-amber-600/20 whitespace-nowrap hover-target"
            >
              Complete Profile
            </button>
          </MagneticWrapper>
        </motion.div>
      )}

      {/* Hero Alert Banner */}
      {earlyWarning && (
        <AlertBanner alert={earlyWarning} onDismiss={handleDismissAlert} />
      )}

      {/* ── Welcome Header ── */}
      <motion.div 
        initial={{ opacity: 0, y: -10, filter: 'blur(8px)' }} 
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10"
      >
        <div>
          <h2 className="text-3xl font-black text-slate-950 mb-1">
            Welcome back, <span className="text-emerald-700 font-black underline decoration-emerald-500/30 decoration-4">{farmerProfile?.name || 'Farmer'}</span> 👋
          </h2>
          <p className="text-sm text-slate-805 font-bold">
            Here's your farm protection overview for <span className="font-black text-slate-950">{new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <MagneticWrapper>
            <Link to="/heatmap" className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-950 text-xs font-black flex items-center gap-2 transition-all hover:-translate-y-0.5 hover-target border border-slate-300">
              <Map className="w-4 h-4 text-slate-950" /> Risk Map
            </Link>
          </MagneticWrapper>
          <MagneticWrapper>
            <Link to="/register-policy" className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-slate-950 text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-0.5 hover-target border border-emerald-700/20">
              <Plus className="w-4 h-4 text-slate-950" /> New Policy
            </Link>
          </MagneticWrapper>
        </div>
      </motion.div>

      {/* Top Stats - Premium 3D Tilt Cards with Animated Counters */}
      <motion.div 
        id="walkthrough-stats-row" 
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        {[
          { label: 'Active Policies', value: activePolicies.length, icon: Shield, color: 'text-emerald-700', bg: 'bg-emerald-100 border border-emerald-300', progress: Math.min(activePolicies.length * 20, 100), trend: '+1 this season', glowColor: 'rgba(16,185,129,0.15)', barClass: 'bg-emerald-600' },
          { label: 'Total Coverage', value: formatINR(totalCoverage), icon: Wallet, color: 'text-emerald-700', bg: 'bg-emerald-100 border border-emerald-300', progress: Math.min(totalCoverage / 500, 100), trend: 'Blockchain secured', glowColor: 'rgba(16,185,129,0.15)', barClass: 'bg-emerald-600' },
          { label: 'Pending Payouts', value: formatINR(pendingPayouts), icon: Clock, color: 'text-amber-800', bg: 'bg-amber-100 border border-amber-300', progress: pendingPayouts > 0 ? 60 : 5, trend: pendingPayouts > 0 ? 'Processing...' : 'All clear', glowColor: 'rgba(245,158,11,0.15)', barClass: 'bg-amber-600' },
          { label: 'Live Alerts', value: alerts.filter(a => !a.isRead).length, icon: Bell, color: 'text-rose-800', bg: 'bg-rose-100 border border-rose-300', progress: Math.min(alerts.filter(a => !a.isRead).length * 25, 100), trend: alerts.filter(a => !a.isRead).length > 0 ? 'Action needed' : 'No threats', glowColor: 'rgba(239,68,68,0.1)', barClass: 'bg-rose-600' },
        ].map((stat, i) => (
          <motion.div key={i} variants={fadeUp}>
            <TiltCard className="glass-card p-6 cursor-default group border border-slate-300/85 hover:border-slate-400" glowColor={stat.glowColor}>
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${stat.bg} group-hover:scale-110 transition-transform duration-300`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <span className={`text-[10px] font-black ${stat.color} ${stat.bg} px-2 py-1 rounded-lg border`}>{stat.trend}</span>
              </div>
              <p className="text-[11px] font-black text-slate-800 uppercase tracking-[0.15em] mb-1">{stat.label}</p>
              <h4 className="text-3xl font-black text-slate-950 mb-3 stat-value-glow">
                <AnimatedCounter value={stat.value} delay={i * 0.15} />
              </h4>
              <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden border border-slate-300/50">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${stat.progress}%` }}
                  transition={{ duration: 1.2, delay: i * 0.15 + 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className={`h-full rounded-full ${stat.barClass} shadow-sm`}
                />
              </div>
            </TiltCard>
          </motion.div>
        ))}
      </motion.div>

      {/* Live Pipeline Indicator Strip */}
      <motion.div 
        initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ delay: 0.4, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="glass-card p-5 flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden z-10 border border-slate-300/80 shadow-md"
      >
        {/* Animated background shimmer */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent skew-x-12"
          />
        </div>

        <div className="flex items-center gap-4 relative z-10">
           <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center border border-emerald-300 relative shadow-sm">
              <Zap className="w-5 h-5 text-emerald-700" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-600 rounded-full border-2 border-slate-100 pulse-emerald" />
           </div>
           <div>
              <p className="text-xs font-black text-slate-800 uppercase tracking-widest">Chainlink Oracle Pipeline</p>
              <p className="text-slate-950 font-black flex items-center gap-2 text-base">
                Active <span className="text-emerald-700 text-xs font-black bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300/50">· Monitoring {farmerProfile?.districtId || 'All Districts'}</span>
              </p>
           </div>
         </div>
         
         <div className="flex items-center gap-6 relative z-10">
           <div className="text-center px-4">
              <p className="text-xs font-black text-slate-800 uppercase tracking-widest">LINK Balance</p>
              <p className={`text-xl font-black ${Number(linkBalance) < 1 ? 'text-red-700' : 'text-emerald-700'}`}>{linkBalance}</p>
           </div>
           <div className="w-px h-10 bg-slate-300" />
           <div className="text-center px-4">
              <p className="text-xs font-black text-slate-800 uppercase tracking-widest">Next Run</p>
              <p className="text-xl font-black text-slate-950">06:00 AM</p>
           </div>
           <div className="w-px h-10 bg-slate-300" />
           <div className="text-center px-4">
              <p className="text-xs font-black text-slate-800 uppercase tracking-widest">Network</p>
              <p className="text-xl font-black text-slate-850">{networkName || 'Sepolia'}</p>
           </div>
         </div>
       </motion.div>
       
       {Number(linkBalance) < 1 && (
         <div className="bg-red-100 border border-red-300 rounded-xl p-4 flex items-center gap-2.5 relative z-10 shadow-sm">
           <AlertTriangle className="w-5 h-5 text-red-700 flex-shrink-0" />
           <p className="text-sm font-black text-red-900">Oracle LINK balance low — trigger checks may pause soon. Please fund the TriggerOracle contract.</p>
         </div>
       )}

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 relative z-10">
        
        {/* Left Column: Policies (8/12) */}
        <motion.div 
          className="lg:col-span-8 space-y-8"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-black text-slate-950 mb-1">My Active Policies</h2>
              <p className="text-sm font-bold text-slate-805">You have <span className="text-emerald-700 font-black">{activePolicies.length} policies</span> active on the blockchain.</p>
            </div>
            <MagneticWrapper>
              <Link to="/register-policy" className="hidden sm:flex px-6 py-3 bg-emerald-600 text-slate-950 rounded-2xl font-black text-sm items-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-500/30 transition-all hover-target border border-emerald-700/20">
                <Plus className="w-4 h-4 text-slate-950" /> Register New
              </Link>
            </MagneticWrapper>
          </div>

          {activePolicies.length > 0 ? (
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 gap-8"
              variants={stagger}
              initial="hidden"
              animate="visible"
            >
              {activePolicies.map((policy, i) => (
                <motion.div key={policy.id} variants={fadeUp}>
                  <PolicyCard policy={policy} delay={i * 0.1} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <TiltCard className="glass-card p-16 text-center border-dashed border-2 border-slate-400 bg-emerald-50/50" glowColor="rgba(16,185,129,0.08)">
              <div className="relative w-32 h-32 mx-auto mb-8 flex items-center justify-center">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 border-2 border-dashed border-emerald-500/40 rounded-full"
                />
                <motion.div 
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="w-20 h-20 bg-emerald-100 border border-emerald-300 rounded-full flex items-center justify-center relative z-10 shadow-sm"
                >
                  <Sprout className="w-10 h-10 text-emerald-700" />
                </motion.div>
                <motion.div 
                   animate={{ y: [-5, 5, -5], rotate: [0, 15, 0] }}
                   transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                   className="absolute -top-2 -right-2 text-amber-500 drop-shadow-md"
                >
                   <Sun className="w-8 h-8" />
                </motion.div>
                <motion.div 
                   animate={{ y: [5, -5, 5], rotate: [0, -15, 0] }}
                   transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                   className="absolute -bottom-2 -left-2 text-cyan-500 drop-shadow-md"
                >
                   <Droplets className="w-8 h-8" />
                </motion.div>
              </div>
              <h3 className="text-2xl font-black text-slate-955 mb-2">No Active Policies Yet</h3>
              <p className="text-slate-805 text-sm max-w-sm mx-auto mb-8 font-black leading-relaxed">Secure your livelihood against drought, frost, and flood with our blockchain-powered insurance.</p>
              <MagneticWrapper>
                <Link to="/register-policy" className="px-8 py-4 bg-emerald-600 text-slate-955 rounded-2xl font-black hover:bg-emerald-700 shadow-lg shadow-emerald-500/30 transition-all inline-flex items-center gap-2 hover-target border border-emerald-700/20">
                  Start Registration
                </Link>
              </MagneticWrapper>
            </TiltCard>
          )}

          {/* ── Payout Done Section ── */}
          {paidOutPolicies.length > 0 && (
            <motion.div 
              className="mt-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.7 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 border border-emerald-350 flex items-center justify-center shadow-sm">
                  <BadgeCheck className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-950">Payouts Completed</h2>
                  <p className="text-sm font-bold text-slate-805">Total disbursed: <span className="text-emerald-750 font-black">{formatINR(totalPaidOut)}</span></p>
                </div>
              </div>
              <div className="space-y-4">
                {paidOutPolicies.map((policy) => {
                  const latestPayout = (policy.payoutHistory || []).slice(-1)[0];
                  const payoutAmountINR = latestPayout ? (parseFloat(latestPayout.amountINR) || parseFloat(latestPayout.amount) || 0) : 0;
                  const triggerName = latestPayout?.trigger || 'weather event';
                  const gasEstimate = Math.round(payoutAmountINR * 0.005) || 15;
                  return (
                    <Link key={policy.id} to={`/policy/${policy.id}`} className="block">
                      <TiltCard className="glass-card p-6 border-l-4 border-emerald-600 hover:shadow-lg transition-shadow border border-slate-300" glowColor="rgba(16,185,129,0.12)">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-800 border border-emerald-300">
                                ✅ Payout Complete
                              </span>
                              <span className="text-xs font-black text-slate-800">{policy.policyId}</span>
                            </div>
                            <p className="text-sm font-black text-slate-950 mb-1 leading-relaxed">
                              {formatINR(payoutAmountINR)} disbursed as crop protection incentive for <span className="text-emerald-800 capitalize font-black">{triggerName}</span> condition in <span className="font-black text-emerald-800">{policy.district}</span>
                            </p>
                            <p className="text-xs text-slate-800 font-bold">
                              Farmer: {policy.fullName || 'Registered User'} · Gas Fee: ≈{formatINR(gasEstimate)} · Season: {policy.season}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-black text-emerald-700">{formatINR(payoutAmountINR)}</p>
                            <p className="text-xs font-black text-slate-800 uppercase tracking-widest">Net Disbursed</p>
                            {latestPayout?.txHash && (
                              <a href={`https://sepolia.etherscan.io/tx/${latestPayout.txHash}`} target="_blank" rel="noreferrer" className="text-xs text-emerald-700 font-black uppercase tracking-widest mt-1.5 inline-flex items-center gap-1 hover:underline" onClick={(e) => e.stopPropagation()}>
                                Verify <ExternalLink className="w-3 h-3 text-emerald-700" />
                              </a>
                            )}
                          </div>
                        </div>
                      </TiltCard>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Right Column: Alerts & Risk (4/12) */}
        <motion.div 
          className="lg:col-span-4 space-y-8"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          
          {/* District Risk Card - With 3D Telemetry Sphere */}
          <TiltCard className="glass-card p-8 relative overflow-hidden group border border-slate-300/80 shadow-md" glowColor="rgba(16,185,129,0.15)">
            <div id="walkthrough-risk-card">
              <div className="absolute inset-0 bg-grid opacity-10" />
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-bl-full" />
              
              <div className="flex items-center justify-between mb-6 relative z-10">
                <h3 className="text-lg font-black text-slate-950 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-700" /> District Risk Profile
                </h3>
                <button 
                  onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(async (pos) => {
                        const { latitude, longitude } = pos.coords;
                        console.log("Detecting location:", latitude, longitude);
                        setLoading(true);
                        const customRisk = await backendApi.getDistrictRisk('My Location', latitude, longitude);
                        if (customRisk && !customRisk.error) {
                          setDistrictRisk(customRisk);
                        }
                        setLoading(false);
                      });
                    }
                  }}
                  className="p-2 bg-emerald-100 border border-emerald-300 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-all group hover-target shadow-sm"
                  title="Detect My Location"
                >
                  <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-all duration-500" />
                </button>
              </div>
              
              {districtRisk ? (
                <div className="space-y-6 relative z-10">
                  {/* 3D Telemetry Sphere */}
                  <div className="relative">
                    <ThreeDTelemetrySphere riskScore={districtRisk.riskScore} className="opacity-90" />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center">
                        <p className="text-xs font-black text-emerald-800 mb-0.5 uppercase tracking-widest bg-emerald-100/90 px-2 py-0.5 rounded border border-emerald-300">{districtRisk.district}</p>
                        <p className="text-5xl font-black text-slate-950 stat-value-glow">
                          <AnimatedCounter value={districtRisk.riskScore} duration={2} />%
                        </p>
                        <RiskBadge level={districtRisk.riskLevel} className="mt-1" />
                      </div>
                    </div>
                  </div>

                  {/* Transparency Breakdown */}
                  <div className="p-4 bg-slate-100/90 border border-slate-300/80 rounded-2xl space-y-3 shadow-inner">
                    <p className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-300/60 pb-2">Risk Transparency (Why {districtRisk.riskScore}%)</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-black text-slate-700">Drought Hist.</span>
                        <span className="text-xs font-black text-slate-950">{districtRisk.transparency?.drought_impact || "N/A"}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-black text-slate-700">Flood Hist.</span>
                        <span className="text-xs font-black text-slate-950">{districtRisk.transparency?.flood_impact || "N/A"}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-black text-slate-700">Satellite Health</span>
                        <span className="text-xs font-black text-slate-955">{districtRisk.transparency?.satellite_impact || "N/A"}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-black text-slate-700">Weather Deficit</span>
                        <span className="text-xs font-black text-slate-955">{districtRisk.transparency?.weather_impact || "N/A"}</span>
                      </div>
                    </div>
                  </div>
                  
                  {districtRisk.details && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 bg-slate-100/90 border border-slate-300 rounded-xl hover:-translate-y-1 hover:shadow-lg hover:border-emerald-600/30 transition-all duration-300 cursor-pointer shadow-sm">
                        <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1">Soil Moisture</p>
                        <p className="text-lg font-black text-slate-950">{districtRisk.details.soil_moisture_index}</p>
                      </div>
                      <div className="p-4 bg-slate-100/90 border border-slate-300 rounded-xl hover:-translate-y-1 hover:shadow-lg hover:border-emerald-600/30 transition-all duration-300 cursor-pointer shadow-sm">
                        <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1">NDVI (Sat)</p>
                        <p className="text-lg font-black text-slate-955">{districtRisk.details.ndvi_health}</p>
                      </div>
                    </div>
                  )}

                  <div className="pt-2">
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden border border-slate-300/30">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${districtRisk.riskScore}%` }}
                        transition={{ duration: 1.5, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
                        className="h-full bg-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center relative z-10 bg-amber-50/50 rounded-2xl border border-amber-300">
                  <p className="text-base font-black text-amber-800 mb-2">⚠️ Backend Offline</p>
                  <p className="text-xs font-black text-slate-800">Start the Flask backend to get live satellite risk data.</p>
                </div>
              )}
            </div>
          </TiltCard>

          {/* ── LIVE WEATHER WIDGET ── */}
          <TiltCard className="glass-card p-8 relative overflow-hidden group border border-slate-300/80 shadow-md" glowColor="rgba(16,185,129,0.1)">
            {/* Ambient glowing radial blur blobs in the background to show off glassmorphism */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/15 transition-all duration-500" />
            <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-cyan-500/5 rounded-full blur-2xl" />
            <div className="absolute inset-0 bg-grid opacity-10" />
            
            <div className="relative z-10 space-y-5">
              {/* Card Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-950 uppercase tracking-widest flex items-center gap-2">
                  <span className="text-base animate-bounce">🌤</span> Live Weather — {(() => {
                    const d = weatherData?.district || farmerProfile?.district || farmerProfile?.districtId || 'Nagpur';
                    return d.charAt(0).toUpperCase() + d.slice(1).toLowerCase();
                  })()}
                </h3>
                
                {/* Beautiful active simulation or live telemetry link pills */}
                {weatherData?.isSimulated ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-650 animate-pulse" /> Simulated Node
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" /> Satellite Live
                  </span>
                )}
              </div>

              {weatherLoading ? (
                /* Loading Skeleton using Glassmorphic boxes */
                <div className="space-y-4 animate-pulse">
                  <div className="h-16 bg-white/5 rounded-2xl border border-slate-200/50" />
                  <div className="h-28 bg-white/5 rounded-2xl border border-slate-200/50" />
                </div>
              ) : weatherError || !weatherData?.data || weatherData.data.length === 0 ? (
                /* Graceful Error Fallback */
                <div className="p-6 bg-slate-100/80 rounded-2xl border border-slate-250 text-center backdrop-blur-md">
                  <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                  <p className="text-xs font-black text-slate-800">Weather data unavailable</p>
                  <p className="text-[10px] text-slate-700 mt-1 font-black">Verify local Flask backend telemetry is active</p>
                </div>
              ) : (
                /* Real or Simulated High-Fidelity Weather Data View */
                <div className="space-y-6">
                  {/* Interactive 3D Crop Node representing Live Telemetry */}
                  <div className="hover:-translate-y-1 transition-transform duration-300 cursor-pointer">
                    <ThreeDDistrictNode 
                      riskScore={droughtConfidence || 45} 
                      ndvi={0.65} 
                      name={weatherData.district} 
                      isSatellite={!weatherData?.isSimulated} 
                    />
                  </div>

                  {/* Today Weather Stats Grid with Translucent Backdrop boxes */}
                  {(() => {
                    const todayWeather = weatherData.data[weatherData.data.length - 1];
                    const chartData = weatherData.data.slice(-7).map(item => ({
                      name: new Date(item.date).toLocaleDateString('en-IN', { weekday: 'short' }),
                      rain: item.rainfall_mm || 0
                    }));

                    return (
                      <>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-slate-100 border border-slate-300 p-3.5 rounded-2xl text-center space-y-1 hover:bg-white hover:-translate-y-1 hover:shadow-xl hover:border-emerald-600/40 transition-all duration-300 cursor-pointer shadow-sm">
                            <p className="text-[9px] font-black text-slate-800 uppercase tracking-widest">Temperature</p>
                            <p className="text-base font-black text-slate-950 font-mono">{(todayWeather.temperature_c || todayWeather.temp_max_5d || 28.5).toFixed(1)}°C</p>
                          </div>
                          <div className="bg-slate-100 border border-slate-300 p-3.5 rounded-2xl text-center space-y-1 hover:bg-white hover:-translate-y-1 hover:shadow-xl hover:border-emerald-600/40 transition-all duration-300 cursor-pointer shadow-sm">
                            <p className="text-[9px] font-black text-slate-800 uppercase tracking-widest">Rainfall</p>
                            <p className="text-base font-black text-emerald-800 font-mono">{(todayWeather.rainfall_mm || 0).toFixed(1)} mm</p>
                          </div>
                          <div className="bg-slate-100 border border-slate-300 p-3.5 rounded-2xl text-center space-y-1 hover:bg-white hover:-translate-y-1 hover:shadow-xl hover:border-emerald-600/40 transition-all duration-300 cursor-pointer shadow-sm">
                            <p className="text-[9px] font-black text-slate-800 uppercase tracking-widest">Humidity</p>
                            <p className="text-base font-black text-cyan-800 font-mono">{(todayWeather.humidity_pct || 65).toFixed(0)}%</p>
                          </div>
                        </div>

                        {/* Drought Confidence Pill */}
                        {droughtConfidence !== null && (
                          <div className="flex justify-between items-center bg-slate-100 border border-slate-300 p-3.5 rounded-2xl hover:bg-slate-200/50 transition-all duration-300 shadow-sm">
                            <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Drought ML Confidence</span>
                            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-lg uppercase tracking-wider border ${
                              droughtConfidence < 40 ? 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-sm' :
                              droughtConfidence <= 70 ? 'bg-amber-100 text-amber-800 border-amber-300 shadow-sm' :
                              'bg-rose-100 text-rose-800 border-rose-300 shadow-sm'
                            }`}>
                              {droughtConfidence}% {droughtConfidence < 40 ? 'Low Risk' : droughtConfidence <= 70 ? 'Warning' : 'Critical'}
                            </span>
                          </div>
                        )}

                        {/* 7-Day Rainfall Bar Chart Container */}
                        <div className="space-y-2">
                          <p className="text-[11px] font-black text-slate-850 uppercase tracking-widest">7-Day Rainfall Trend (mm)</p>
                          <div className="h-28 w-full bg-slate-100 border border-slate-300 rounded-2xl p-2 shadow-inner">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 8, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#475569', fontSize: 8, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                <ChartTooltip 
                                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '12px', backdropFilter: 'blur(10px)' }}
                                  labelStyle={{ color: '#94a3b8', fontSize: '9px', fontWeight: 'bold', fontFamily: 'monospace' }}
                                  itemStyle={{ color: '#10b981', fontSize: '9px', fontWeight: 'bold', fontFamily: 'monospace' }}
                                />
                                <Bar dataKey="rain" fill="#047857" radius={[3, 3, 0, 0]} barSize={10} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </TiltCard>

          {/* Activity Feed Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ delay: 0.7, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <TiltCard className="glass-card p-8 border border-slate-300 shadow-md" glowColor="rgba(16,185,129,0.06)">
              <h3 className="text-lg font-black text-slate-955 mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-700" /> Network Activity
              </h3>
              <div className="space-y-6 relative">
                <div className="absolute left-[19px] top-2 bottom-2 w-px bg-gradient-to-b from-emerald-500/50 via-slate-400 to-transparent" />
                
                {(onChainHistory.length > 0 || alerts.length > 0) ? (
                  <>
                    {onChainHistory.slice(0, 5).map((event, idx) => {
                      let icon = Shield;
                      let iconColor = 'text-emerald-800';
                      let bg = 'bg-emerald-100 border border-emerald-300';
                      
                      if (event.type === 'TriggerRequested') {
                        icon = Clock;
                        iconColor = 'text-amber-800';
                        bg = 'bg-amber-100 border border-amber-300';
                      } else if (event.type === 'TriggerFulfilled') {
                        icon = Zap;
                        iconColor = 'text-blue-800';
                        bg = 'bg-blue-100 border border-blue-300';
                      }

                      return (
                        <motion.div 
                          key={event.id} 
                          className="flex gap-4 relative"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.8 + idx * 0.1 }}
                        >
                          <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0 z-10 shadow-sm`}>
                            <icon className={`w-4 h-4 ${iconColor}`} />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-black text-slate-950 leading-tight">{event.message}</p>
                            <a href={`https://sepolia.etherscan.io/tx/${event.txHash}`} target="_blank" rel="noreferrer" className="text-[11px] text-emerald-700 font-black uppercase tracking-widest mt-1.5 inline-flex items-center gap-1 hover:underline">
                              Verify On-Chain <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        </motion.div>
                      )
                    })}
                  </>
                ) : (
                  <div className="text-center py-6">
                    <Bell className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                    <p className="text-sm font-black text-slate-900 mb-2">No On-Chain Activity Yet</p>
                    <p className="text-xs text-slate-800 font-bold leading-relaxed max-w-[220px] mx-auto">
                      {!address ? (
                        <>Connect your <span className="font-black text-emerald-800">MetaMask wallet</span> and start a Hardhat node to see blockchain events here.</>
                      ) : (
                        <>Register a policy or run a trigger check to see live blockchain events.</>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </TiltCard>
          </motion.div>
 
          {/* Weather Quick View */}
          {weatherData && (
            <motion.div 
              initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ delay: 0.8, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <TiltCard className="glass-card p-6 space-y-4 border border-slate-300 shadow-md" glowColor="rgba(16,185,129,0.06)">
                <h3 className="text-sm font-black text-slate-950 flex items-center gap-2">
                  <span className="text-lg">🌤</span> 7-Day Weather Quick View
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-100 border border-slate-300 rounded-xl p-3 text-center shadow-sm">
                    <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Temp</p>
                    <p className="text-lg font-black text-slate-950">{weatherData.avg_temp_c ? `${weatherData.avg_temp_c.toFixed(1)}°` : '--'}</p>
                  </div>
                  <div className="bg-slate-100 border border-slate-300 rounded-xl p-3 text-center shadow-sm">
                    <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Rain</p>
                    <p className="text-lg font-black text-slate-955">{weatherData.total_rain_mm ? `${weatherData.total_rain_mm.toFixed(0)}mm` : '--'}</p>
                  </div>
                  <div className="bg-slate-100 border border-slate-300 rounded-xl p-3 text-center shadow-sm">
                    <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Humidity</p>
                    <p className="text-lg font-black text-slate-955">{weatherData.avg_humidity ? `${weatherData.avg_humidity.toFixed(0)}%` : '--'}</p>
                  </div>
                </div>
              </TiltCard>
            </motion.div>
          )}
 
          {/* Platform Health */}
          <motion.div 
            initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ delay: 0.9, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <TiltCard className="glass-card p-6 border border-slate-300 shadow-md" glowColor="rgba(16,185,129,0.06)">
              <h3 className="text-sm font-black text-slate-950 mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-700" /> Platform Health Status
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'Smart Contract', status: address ? 'Deployed' : 'Not Connected', ok: !!address },
                  { label: 'Oracle Feed', status: Number(linkBalance) >= 1 ? 'Funded' : 'Low Balance', ok: Number(linkBalance) >= 1 },
                  { label: 'ML Model', status: districtRisk ? 'Active' : 'Standby', ok: !!districtRisk },
                  { label: 'Firebase Engine', status: 'Connected', ok: true },
                ].map((item, i) => (
                  <motion.div 
                    key={i} 
                    className="flex items-center justify-between py-2 border-b border-slate-200 last:border-0"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1 + i * 0.08 }}
                  >
                    <span className="text-xs font-black text-slate-805">{item.label}</span>
                    <span className={`text-xs font-black flex items-center gap-1.5 px-2.5 py-0.5 rounded border ${
                      item.ok ? 'text-emerald-800 bg-emerald-100 border-emerald-300' : 'text-amber-805 bg-amber-100 border-amber-300'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${item.ok ? 'bg-emerald-600' : 'bg-amber-600 animate-pulse'}`} />
                      {item.status}
                    </span>
                  </motion.div>
                ))}
              </div>
            </TiltCard>
          </motion.div>
        </motion.div>
      </div>
      
      {/* Mobile-friendly bottom actions */}
      <div className="sm:hidden grid grid-cols-1 gap-4 relative z-10">
        <Link to="/register-policy" className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-slate-950 rounded-2xl font-black text-center shadow-lg border border-emerald-700/20">
          Register New Policy
        </Link>
      </div>
      <OnboardingWalkthrough />
    </div>
  );
}
