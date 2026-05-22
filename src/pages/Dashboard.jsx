import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
} from 'lucide-react';

import StatCard from '../components/StatCard';
import PolicyCard from '../components/PolicyCard';
import AlertBanner from '../components/AlertBanner';
import RiskBadge from '../components/RiskBadge';
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

export default function Dashboard() {
  const navigate = useNavigate();
  const { currentUser, farmerProfile } = useAuth();
  const { alerts, setAlerts, dismissAlert } = useAlertStore();
  const { address } = useWalletStore();
  
  const [policies, setPolicies] = useState([]);
  const [districtRisk, setDistrictRisk] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [vaultBalance, setVaultBalance] = useState(null);
  const [onChainHistory, setOnChainHistory] = useState([]);
  const [linkBalance, setLinkBalance] = useState('0.0');

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        
        // 1. Fetch policies (Independent)
        // 1. Fetch policies (Independent)
        try {
          const fallbackName = farmerProfile?.email ? farmerProfile.email.split('@')[0] : '';
          const fetchedPolicies = await getPoliciesByFarmer(currentUser.uid, farmerProfile?.name || farmerProfile?.fullName || fallbackName);
          setPolicies(fetchedPolicies);
        } catch (e) { console.error("Dashboard: Policies fetch failed", e); }
        
        // 2. Fetch alerts (Independent - this is where the index error is)
        try {
          const fetchedAlerts = await getAlertsByFarmer(currentUser.uid);
          setAlerts(fetchedAlerts);
        } catch (e) { console.error("Dashboard: Alerts fetch failed (Check Firebase Index)", e); }
        
        // 3. Fetch district risk and weather (Independent)
        const targetDistrict = farmerProfile?.districtId || 'nagpur';
        const lat = farmerProfile?.districtLat;
        const lon = farmerProfile?.districtLon;

        try {
          // Fix: Do not pass lat/lon here to prevent forcing a 15-second live ML computation
          const riskData = await backendApi.getDistrictRisk(targetDistrict);
          if (riskData && !riskData.error) {
            setDistrictRisk(riskData);
          } else {
            console.warn("Dashboard: Backend API failed, trying Firestore...", riskData?.message);
            try {
              const fallbackRisk = await getDistrictRiskScore(targetDistrict);
              if (fallbackRisk) {
                setDistrictRisk({ 
                  ...fallbackRisk, 
                  district: `${fallbackRisk.district || targetDistrict}`,
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
            } catch (e) {
              setDistrictRisk(generateMockRisk(targetDistrict));
            }
          }

          try {
            const weatherResp = await backendApi.getWeatherData(targetDistrict, 7, lat, lon);
            if (weatherResp && !weatherResp.error) {
              setWeatherData(weatherResp);
            }
          } catch { /* weather is optional */ }
        } catch (apiErr) {
          console.error("Dashboard: Risk API error:", apiErr);
          try {
            const fallbackRisk = await getDistrictRiskScore(targetDistrict);
            if (fallbackRisk) {
                setDistrictRisk(fallbackRisk);
            } else {
                setDistrictRisk(generateMockRisk(targetDistrict));
            }
          } catch {
            setDistrictRisk(generateMockRisk(targetDistrict));
          }
        }

        // 4. Fetch on-chain data (Independent)
        if (window.ethereum && address) {

          const provider = new BrowserProvider(window.ethereum);
          
          // Check owner status
          const ownerStatus = await isContractOwner(provider, address);
          setIsOwner(ownerStatus);
          if (ownerStatus) {
            const balance = await getVaultBalance(provider);
            setVaultBalance(balance);
          }

          // Fetch user's on-chain policies
          try {
            const onChainPolicies = await getPoliciesOnChain(provider, address);
            // Convert blockchain struct to app format
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
          } catch (e) {
            console.error("Error fetching user on-chain policies", e);
          }

          // Fetch on-chain history (events)
          try {
            const contracts = getContracts(provider);
            const triggerOracleAddr = await contracts.TriggerOracle.getAddress();
            const balance = await getLinkBalance(provider, triggerOracleAddr);
            setLinkBalance(balance);

            const filterReg = contracts.PolicyRegistry.filters.PolicyRegistered();
            const evReg = await contracts.PolicyRegistry.queryFilter(filterReg, -1000);
            
            const filterReq = contracts.TriggerOracle.filters.TriggerRequested();
            const evReq = await contracts.TriggerOracle.queryFilter(filterReq, -1000);

            const filterFul = contracts.TriggerOracle.filters.TriggerFulfilled();
            const evFul = await contracts.TriggerOracle.queryFilter(filterFul, -1000);

            const formattedHistory = [
              ...evReg.map(e => ({ id: e.transactionHash + '-reg', type: 'PolicyRegistered', message: `Policy Registered: ${e.args[0]}`, txHash: e.transactionHash, block: e.blockNumber })),
              ...evReq.map(e => ({ id: e.transactionHash + '-req', type: 'TriggerRequested', message: `Oracle Requested: ${e.args.triggerType} for ${e.args.policyId}`, txHash: e.transactionHash, block: e.blockNumber })),
              ...evFul.map(e => ({ id: e.transactionHash + '-ful', type: 'TriggerFulfilled', message: `Oracle Fulfilled: ${e.args.policyId} (Fired: ${e.args.fired.toString()})`, txHash: e.transactionHash, block: e.blockNumber }))
            ];
            
            formattedHistory.sort((a, b) => b.block - a.block);
            setOnChainHistory(formattedHistory);
          } catch (e) {
            console.error("Error fetching on-chain history", e);
          }
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [currentUser, farmerProfile, setAlerts, address]);

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
    <div className="space-y-10 pb-16">
      {/* Profile Incomplete Banner */}
      {farmerProfile && (!farmerProfile.name || !farmerProfile.mobile || !farmerProfile.districtId) && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-amber-900">Complete your profile to register a policy</h3>
              <p className="text-amber-700 text-sm font-medium">We need your basic details to link your wallet to the district risk parameters.</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/profile')}
            className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white text-sm font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-amber-600/20 whitespace-nowrap"
          >
            Complete Profile
          </button>
        </div>
      )}

      {/* Hero Alert Banner */}
      {earlyWarning && (
        <AlertBanner alert={earlyWarning} onDismiss={handleDismissAlert} />
      )}

      {/* Top Stats - High Contrast Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Active Policies', value: activePolicies.length, icon: Shield, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Total Coverage', value: formatINR(totalCoverage), icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Pending Payouts', value: formatINR(pendingPayouts), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Live Alerts', value: alerts.filter(a => !a.isRead).length, icon: Bell, color: 'text-rose-600', bg: 'bg-rose-50' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="premium-card p-6 border-emerald-50/50"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className={`stat-icon-box ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">{stat.label}</p>
                <h4 className="text-2xl font-extrabold text-slate-900">{stat.value}</h4>
              </div>
            </div>
            <div className="h-1 w-full bg-slate-50 rounded-full overflow-hidden mt-2">
              <div className={`h-full ${stat.color.replace('text', 'bg')} opacity-20 w-2/3`} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Live Pipeline Indicator Strip */}
      <div className="bg-slate-900 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between border border-emerald-500/20 shadow-xl shadow-emerald-900/10 gap-4">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
              <Zap className="w-5 h-5 text-emerald-400" />
           </div>
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Oracle Pipeline</p>
              <p className="text-white font-bold flex items-center gap-2">Active <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /></p>
           </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-right">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Oracle LINK Balance</p>
             <p className={`text-sm font-black ${Number(linkBalance) < 1 ? 'text-red-400' : 'text-emerald-400'}`}>{linkBalance} LINK</p>
          </div>
          <div className="w-px h-8 bg-slate-800" />
          <div className="text-left">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Next Run</p>
             <p className="text-sm font-bold text-white">06:00 AM (UTC)</p>
          </div>
        </div>
      </div>
      
      {Number(linkBalance) < 1 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <p className="text-xs font-bold text-red-400">Oracle LINK balance low — trigger checks may pause soon. Please fund the TriggerOracle contract.</p>
        </div>
      )}

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Left Column: Policies (8/12) */}
        <div className="lg:col-span-8 space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 mb-1">My Active Policies</h2>
              <p className="text-sm font-medium text-slate-500">You have <span className="text-emerald-600 font-bold">{activePolicies.length} policies</span> active on the blockchain.</p>
            </div>
            <Link to="/register-policy" className="hidden sm:flex px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-sm items-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all">
              <Plus className="w-4 h-4" /> Register New
            </Link>
          </div>

          {activePolicies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {activePolicies.map((policy, i) => (
                <PolicyCard key={policy.id} policy={policy} delay={i * 0.1} />
              ))}
            </div>
          ) : (
            <div className="premium-card p-16 text-center border-dashed border-2 bg-emerald-50/20">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="w-10 h-10 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No Active Policies Yet</h3>
              <p className="text-slate-500 text-sm max-w-sm mx-auto mb-8 font-medium">Secure your livelihood against drought, frost, and flood with our blockchain-powered insurance.</p>
              <Link to="/register-policy" className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all inline-flex items-center gap-2">
                Start Registration
              </Link>
            </div>
          )}

          {/* ── Payout Done Section ── */}
          {paidOutPolicies.length > 0 && (
            <div className="mt-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center">
                  <BadgeCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900">Payouts Completed</h2>
                  <p className="text-sm font-medium text-slate-500">Total disbursed: <span className="text-emerald-600 font-bold">{formatINR(totalPaidOut)}</span></p>
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
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="premium-card p-6 border-l-4 border-emerald-500 hover:shadow-lg transition-shadow"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200">
                                ✅ Payout Complete
                              </span>
                              <span className="text-xs font-bold text-slate-400">{policy.policyId}</span>
                            </div>
                            <p className="text-sm font-bold text-slate-900 mb-1">
                              {formatINR(payoutAmountINR)} disbursed as crop protection incentive for <span className="text-emerald-600 capitalize">{triggerName}</span> condition in <span className="font-black">{policy.district}</span>
                            </p>
                            <p className="text-xs text-slate-400">
                              Farmer: {policy.fullName || 'Registered User'} · Gas Fee: ≈{formatINR(gasEstimate)} · Season: {policy.season}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-black text-emerald-600">{formatINR(payoutAmountINR)}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Net Disbursed</p>
                            {latestPayout?.txHash && (
                              <a href={`https://sepolia.etherscan.io/tx/${latestPayout.txHash}`} target="_blank" rel="noreferrer" className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mt-1 inline-flex items-center gap-1 hover:underline" onClick={(e) => e.stopPropagation()}>
                                Verify <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Alerts & Risk (4/12) */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* District Risk Card - Network Console Style */}
          <div className="bg-slate-900 rounded-[32px] p-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-grid opacity-10" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-bl-full" />
            
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-400" /> District Risk Profile
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
                className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-all group"
                title="Detect My Location"
              >
                <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-all duration-500" />
              </button>
            </div>
            
            {districtRisk ? (
              <div className="space-y-6 relative z-10">
                <div className="p-6 bg-white/5 rounded-2xl text-center border border-white/5 group-hover:border-emerald-500/30 transition-colors">
                  <p className="text-[10px] font-bold text-emerald-300 mb-1 uppercase tracking-widest">{districtRisk.district}</p>
                  <div className="flex items-end justify-center gap-1">
                    <p className="text-6xl font-black text-white">{districtRisk.riskScore}%</p>
                    <RiskBadge level={districtRisk.riskLevel} className="mb-2" />
                  </div>
                </div>

                {/* Transparency Breakdown */}
                <div className="p-4 bg-white/5 rounded-2xl space-y-3">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-white/10 pb-2">Risk Transparency (Why {districtRisk.riskScore}%)</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400">Drought Hist.</span>
                      <span className="text-xs font-bold text-white">{districtRisk.transparency?.drought_impact || "N/A"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400">Flood Hist.</span>
                      <span className="text-xs font-bold text-white">{districtRisk.transparency?.flood_impact || "N/A"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400">Satellite Health</span>
                      <span className="text-xs font-bold text-white">{districtRisk.transparency?.satellite_impact || "N/A"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400">Weather Deficit</span>
                      <span className="text-xs font-bold text-white">{districtRisk.transparency?.weather_impact || "N/A"}</span>
                    </div>
                  </div>
                </div>
                
                {districtRisk.details && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Soil Moisture</p>
                      <p className="text-lg font-black text-white">{districtRisk.details.soil_moisture_index}</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">NDVI (Sat)</p>
                      <p className="text-lg font-black text-white">{districtRisk.details.ndvi_health}</p>
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${districtRisk.riskScore}%` }}
                      className="h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center relative z-10">
                <p className="text-sm font-bold text-amber-400 mb-2">⚠️ Backend Offline</p>
                <p className="text-xs text-slate-500">Start the Flask backend to get live satellite risk data.</p>
              </div>
            )}
          </div>

          {/* Activity Feed Card */}
          <div className="premium-card p-8">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" /> Network Activity
            </h3>
            <div className="space-y-8 relative">
              <div className="absolute left-[19px] top-2 bottom-2 w-px bg-slate-100" />
              
              {(onChainHistory.length > 0 || alerts.length > 0) ? (
                <>
                  {onChainHistory.slice(0, 5).map((event) => {
                    let icon = Shield;
                    let iconColor = 'text-emerald-600';
                    let bg = 'bg-emerald-50';
                    
                    if (event.type === 'TriggerRequested') {
                      icon = Clock;
                      iconColor = 'text-amber-600';
                      bg = 'bg-amber-50';
                    } else if (event.type === 'TriggerFulfilled') {
                      icon = Zap;
                      iconColor = 'text-blue-600';
                      bg = 'bg-blue-50';
                    }

                    return (
                      <div key={event.id} className="flex gap-4 relative">
                        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0 z-10 border border-white shadow-sm`}>
                          <icon className={`w-4 h-4 ${iconColor}`} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-slate-900 leading-tight">{event.message}</p>
                          <a href={`https://sepolia.etherscan.io/tx/${event.txHash}`} target="_blank" rel="noreferrer" className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mt-1.5 inline-flex items-center gap-1 hover:underline">
                            Verify On-Chain <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </div>
                    )
                  })}
                </>
              ) : (
                <div className="text-center py-6">
                  <Bell className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-400 mb-2">No On-Chain Activity Yet</p>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-[200px] mx-auto">
                    {!address ? (
                      <>Connect your <span className="font-bold text-emerald-600">MetaMask wallet</span> and start a Hardhat node to see blockchain events here.</>
                    ) : (
                      <>Register a policy or run a trigger check to see live blockchain events.</>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile-friendly bottom actions */}
      <div className="sm:hidden grid grid-cols-1 gap-4">
        <Link to="/register-policy" className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-center">
          Register New Policy
        </Link>
      </div>
    </div>
  );
}
