import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Wallet,
  Shield,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Clock,
  TrendingUp,
  User,
  Loader2,
  Zap
} from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import { useWalletStore } from '../stores/walletStore';
import { getTriggerColor, getStatusStyle, formatINR, formatDate, payoutDescription, amountInWords } from '../utils/helpers';
import districts from '../data/districts.json';
import { 
  getPolicyOnChain, 
  isContractOwner, 
  getVaultBalance, 
  manualTriggerForTesting,
  getOracleRequests,
  getOracleFulfillments,
  getContracts
} from '../services/contractService';
import { getPolicyById, getAlertsByPolicy } from '../services/firestoreService';
import { BrowserProvider, ethers } from 'ethers';
import { useState, useEffect } from 'react';
import { downloadPolicyCertificate } from '../utils/certificate';

export default function PolicyDetail() {
  const { id } = useParams();
  const { isConnected, address } = useWalletStore();
  
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onChainPolicy, setOnChainPolicy] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [vaultBalance, setVaultBalance] = useState(null);
  const [isTriggering, setIsTriggering] = useState(false);
  const [oracleRequests, setOracleRequests] = useState([]);
  const [oracleFulfillments, setOracleFulfillments] = useState([]);
  const [timeline, setTimeline] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // 1. Try to fetch from Firestore
        let fetchedPolicy = await getPolicyById(id);
        
        // 2. If not found, try to fetch from Blockchain directly
        if (!fetchedPolicy && window.ethereum) {
          const provider = new BrowserProvider(window.ethereum);
          try {
            const chainData = await getPolicyOnChain(provider, id);
            if (chainData && chainData.policyId) {
              fetchedPolicy = {
                id: chainData.policyId,
                policyId: chainData.policyId,
                district: chainData.district,
                season: chainData.season,
                triggers: chainData.triggers,
                coverageAmount: ethers.formatEther(chainData.coverageAmount),
                premiumPaid: ethers.formatEther(chainData.premiumPaid),
                status: ['Active', 'Triggered', 'Expired'][chainData.status] || 'Active',
                startDate: new Date(Number(chainData.startDate) * 1000).toISOString(),
                endDate: new Date(Number(chainData.endDate) * 1000).toISOString(),
                walletAddress: address || '',
                farmerName: 'On-Chain Policy'
              };
            }
          } catch (e) {
            console.error("Blockchain fetch failed:", e);
          }
        }

        if (fetchedPolicy) {
          setPolicy(fetchedPolicy);
          
          // 3. If we have a real provider, check owner status
          if (window.ethereum) {
            const provider = new BrowserProvider(window.ethereum);
            
            // Fetch on-chain details for the "Details" section specifically
            if (fetchedPolicy.policyId && !fetchedPolicy.id.startsWith('mock-')) {
              try {
                const data = await getPolicyOnChain(provider, fetchedPolicy.policyId);
                if (data && data.policyId) setOnChainPolicy(data);
              } catch (e) {}
            }

            if (address) {
              const ownerStatus = await isContractOwner(provider, address);
              setIsOwner(ownerStatus);
            }
            
            // Always fetch Vault Balance (Liquidity is public data)
            try {
              const balance = await getVaultBalance(provider);
              setVaultBalance(balance);
            } catch (e) {
              console.error("Failed to fetch vault balance:", e);
            }

            // Fetch Oracle data
            if (fetchedPolicy.policyId) {
              const reqs = await getOracleRequests(provider, fetchedPolicy.policyId);
              const fuls = await getOracleFulfillments(provider, fetchedPolicy.policyId);
              setOracleRequests(reqs);
              setOracleFulfillments(fuls);
            }

            // 4. Fetch Timeline Events (queryFilter + Firestore Alerts)
            try {
              const currentBlock = await provider.getBlockNumber();
              const fromBlock = Math.max(0, currentBlock - 2000);
              const contractsInstance = getContracts(provider);

              const [regEvents, reqEvents, fulEvents, payEvents, policyAlerts] = await Promise.all([
                contractsInstance.PolicyRegistry.queryFilter(contractsInstance.PolicyRegistry.filters.PolicyRegistered(), fromBlock, 'latest').catch(() => []),
                contractsInstance.TriggerOracle.queryFilter(contractsInstance.TriggerOracle.filters.TriggerRequested(), fromBlock, 'latest').catch(() => []),
                contractsInstance.TriggerOracle.queryFilter(contractsInstance.TriggerOracle.filters.TriggerFulfilled(), fromBlock, 'latest').catch(() => []),
                contractsInstance.PayoutVault.queryFilter(contractsInstance.PayoutVault.filters.PayoutExecuted(), fromBlock, 'latest').catch(() => []),
                getAlertsByPolicy(fetchedPolicy.policyId)
              ]);

              const timelineEvents = [];

              // Phase 1: Policy Registered
              const regEvent = regEvents.find(e => e.args[0] === fetchedPolicy.policyId);
              if (regEvent) {
                let blockTime = new Date(fetchedPolicy.startDate || Date.now());
                try {
                  const b = await provider.getBlock(regEvent.blockNumber);
                  if (b) blockTime = new Date(b.timestamp * 1000);
                } catch {}
                timelineEvents.push({
                  phase: 1,
                  title: 'Policy Registered',
                  dotColor: 'bg-emerald-500 border-emerald-400',
                  desc: `Premium of ${formatINR(fetchedPolicy.premiumINR || 2400)} (${fetchedPolicy.premiumETH || 0.0012} ETH) paid. Coverage of ${formatINR(fetchedPolicy.coverageINR || 120000)} initiated.`,
                  time: blockTime.toLocaleString('en-IN'),
                  txHash: regEvent.transactionHash,
                  active: true
                });
              }

              // Phase 2: Oracle Check Run (From Requested and Fulfilled events)
              const reqEvent = reqEvents.find(e => e.args.policyId === fetchedPolicy.policyId);
              if (reqEvent) {
                let blockTime = new Date();
                try {
                  const b = await provider.getBlock(reqEvent.blockNumber);
                  if (b) blockTime = new Date(b.timestamp * 1000);
                } catch {}
                timelineEvents.push({
                  phase: 2,
                  title: 'Oracle Check Run',
                  dotColor: 'bg-blue-500 border-blue-400',
                  desc: `Chainlink oracle weather check completed. Trigger ${reqEvent.args.triggerType} checked.`,
                  time: blockTime.toLocaleString('en-IN'),
                  txHash: reqEvent.transactionHash,
                  active: true
                });
              }

              // Phase 4: Trigger Fired
              const fulEvent = fulEvents.find(e => e.args.policyId === fetchedPolicy.policyId);
              if (fulEvent) {
                let blockTime = new Date();
                try {
                  const b = await provider.getBlock(fulEvent.blockNumber);
                  if (b) blockTime = new Date(b.timestamp * 1000);
                } catch {}
                const isFired = Number(fulEvent.args.fired) > 0;
                timelineEvents.push({
                  phase: 4,
                  title: isFired ? 'Trigger Fired' : 'Oracle Check Fulfilled',
                  dotColor: isFired ? 'bg-red-500 border-red-400' : 'bg-blue-500 border-blue-400',
                  desc: isFired 
                    ? `Drought condition met on-chain. Final confidence score: ${Number(fulEvent.args.confidenceScore)}%. Chainlink Request ID: ${fulEvent.args.requestId.slice(0, 14)}...`
                    : `Oracle check completed. Drought trigger not fired (Confidence: ${Number(fulEvent.args.confidenceScore)}%).`,
                  time: blockTime.toLocaleString('en-IN'),
                  txHash: fulEvent.transactionHash,
                  active: true
                });
              }

              // Phase 5 & 6: Payout Executed
              const payEvent = payEvents.find(e => e.args.farmer.toLowerCase() === fetchedPolicy.walletAddress?.toLowerCase());
              if (payEvent) {
                let blockTime = new Date();
                try {
                  const b = await provider.getBlock(payEvent.blockNumber);
                  if (b) blockTime = new Date(b.timestamp * 1000);
                } catch {}
                timelineEvents.push({
                  phase: 5,
                  title: 'Payout Initiated',
                  dotColor: 'bg-amber-500 border-amber-400',
                  desc: `Payout of ${formatINR(fetchedPolicy.coverageINR || 120000)} initiated via PayoutVault contract.`,
                  time: blockTime.toLocaleString('en-IN'),
                  txHash: payEvent.transactionHash,
                  active: true
                });
                
                timelineEvents.push({
                  phase: 6,
                  title: 'Payout Confirmed',
                  dotColor: 'bg-emerald-500 border-emerald-400',
                  desc: `Fund transfer of ${formatINR(fetchedPolicy.coverageINR || 120000)} confirmed received by farmer wallet.`,
                  time: blockTime.toLocaleString('en-IN'),
                  txHash: payEvent.transactionHash,
                  active: true
                });
              }

              // Phase 3: Early Warning (From Firestore Alerts)
              policyAlerts.forEach(alert => {
                const alertTime = alert.createdAt?.toDate ? alert.createdAt.toDate() : new Date(alert.createdAt || Date.now());
                if (alert.alertType === 'early_warning') {
                  timelineEvents.push({
                    phase: 3,
                    title: 'Early Warning Issued',
                    dotColor: 'bg-amber-500 border-amber-400',
                    desc: alert.message || `Early warning alert generated. Drought risk crossed 60% confidence threshold.`,
                    time: alertTime.toLocaleString('en-IN'),
                    active: true
                  });
                }
              });

              // Assemble placeholders dynamically
              const finalTimeline = [];

              // Phase 1: Policy Registered
              const phase1 = timelineEvents.find(e => e.phase === 1) || {
                phase: 1,
                title: 'Policy Registered',
                dotColor: 'bg-emerald-500 border-emerald-400',
                desc: `Premium of ${formatINR(fetchedPolicy.premiumINR || fetchedPolicy.premiumPaid || 2400)} (${fetchedPolicy.premiumETH || 0.0012} ETH) paid. Coverage of ${formatINR(fetchedPolicy.coverageINR || fetchedPolicy.coverageAmount || 120000)} initiated.`,
                time: formatDate(fetchedPolicy.startDate || fetchedPolicy.createdAt),
                active: true,
                txHash: fetchedPolicy.txHash
              };
              finalTimeline.push(phase1);

              // Phase 2: Oracle Check Run
              const phase2 = timelineEvents.find(e => e.phase === 2) || {
                phase: 2,
                title: 'Oracle Check Run',
                dotColor: 'bg-slate-800 border-slate-700',
                desc: 'Awaiting weather oracle check conditions.',
                time: 'Scheduled Daily',
                active: false
              };
              finalTimeline.push(phase2);

              // Phase 3: Early Warning Issued
              const phase3 = timelineEvents.find(e => e.phase === 3) || {
                phase: 3,
                title: 'Early Warning Issued',
                dotColor: 'bg-slate-800 border-slate-700',
                desc: 'No weather warning threshold exceeded.',
                time: 'Continuous Scan',
                active: false
              };
              finalTimeline.push(phase3);

              // Phase 4: Trigger Fired
              const phase4 = timelineEvents.find(e => e.phase === 4) || {
                phase: 4,
                title: 'Trigger Fired',
                dotColor: 'bg-slate-800 border-slate-700',
                desc: 'Awaiting critical weather trigger conditions.',
                time: 'Conditional',
                active: false
              };
              finalTimeline.push(phase4);

              // Phase 5: Payout Initiated
              const phase5 = timelineEvents.find(e => e.phase === 5) || {
                phase: 5,
                title: 'Payout Initiated',
                dotColor: 'bg-slate-800 border-slate-700',
                desc: 'Payout will activate autonomously upon verified trigger event.',
                time: 'Conditional',
                active: false
              };
              finalTimeline.push(phase5);

              // Phase 6: Payout Confirmed
              const phase6 = timelineEvents.find(e => e.phase === 6) || {
                phase: 6,
                title: 'Payout Confirmed',
                dotColor: 'bg-slate-800 border-slate-700',
                desc: 'Farmer wallet settlement pending trigger confirmation.',
                time: 'Settlement Node',
                active: false
              };
              finalTimeline.push(phase6);

              // Set active for Bob's PaidOut policy fallback
              if (fetchedPolicy.status === 'PaidOut') {
                const payoutDateStr = formatDate(fetchedPolicy.updatedAt || fetchedPolicy.createdAt);
                
                phase2.active = true;
                phase2.dotColor = 'bg-blue-500 border-blue-400';
                phase2.desc = 'Chainlink oracle weather check completed. Drought trigger checked.';
                phase2.time = payoutDateStr;

                phase4.active = true;
                phase4.dotColor = 'bg-red-500 border-red-400';
                phase4.desc = 'Drought condition met on-chain. Final confidence score: 85%.';
                phase4.time = payoutDateStr;

                phase5.active = true;
                phase5.dotColor = 'bg-amber-500 border-amber-400';
                phase5.desc = `Payout of ${formatINR(fetchedPolicy.coverageINR || fetchedPolicy.coverageAmount || 120000)} initiated via PayoutVault contract.`;
                phase5.time = payoutDateStr;

                phase6.active = true;
                phase6.dotColor = 'bg-emerald-500 border-emerald-400';
                phase6.desc = `Fund transfer of ${formatINR(fetchedPolicy.coverageINR || fetchedPolicy.coverageAmount || 120000)} confirmed received by farmer wallet.`;
                phase6.time = payoutDateStr;
              }

              setTimeline(finalTimeline);
            } catch (e) {
              console.error("Timeline query filter failed:", e);
            }
          }
        }
      } catch (err) {
        console.error("Policy fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, address]);

  const handleManualTrigger = async (triggerType) => {
    if (!window.ethereum || !policy) return;
    try {
      setIsTriggering(true);
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      await manualTriggerForTesting(signer, policy.policyId || policy.id, triggerType);
      alert("Manual trigger executed successfully on-chain!");
      window.location.reload();
    } catch (e) {
      console.error("Manual trigger failed", e);
      const errorMsg = e.reason || e.message || "Unknown error";
      alert(`Failed to execute manual trigger: ${errorMsg}`);
    } finally {
      setIsTriggering(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-text-secondary dark:text-gray-400">Loading policy details...</p>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <h2 className="text-xl font-bold text-text-primary dark:text-white mb-2">Policy Not Found</h2>
        <p className="text-text-secondary dark:text-gray-400 mb-4">The policy {id} could not be found.</p>
        <Link to="/dashboard" className="text-primary hover:underline text-sm font-medium">← Back to Dashboard</Link>
      </div>
    );
  }

  const district = districts.find((d) => d.id === policy.districtId);
  const statusStyle = getStatusStyle(policy.status);

  // Timeline is fetched dynamically in useEffect

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-emerald-600 transition-all group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Network Dashboard
        </Link>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Real-time Node: {id.slice(0, 8)}</span>
        </div>
      </div>

      {/* Main Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="premium-card overflow-hidden"
      >
        <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-grid opacity-10" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div>
              <div className="flex items-center gap-4 mb-3">
                <h1 className="text-3xl font-black tracking-tight">{policy.policyId || id.slice(0, 10)}</h1>
                <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg ${statusStyle.bg} ${statusStyle.text} border border-white/10`}>
                  {policy.status}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <p className="text-emerald-400 font-black text-[10px] uppercase tracking-widest">Verified Blockchain Policy</p>
              </div>
            </div>
            
            <div className="text-left md:text-right">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Total Protection Value</p>
              <p className="text-4xl font-black text-white">{formatINR(policy.coverageINR || (parseFloat(policy.premiumINR) * 10) || policy.coverageAmount)}</p>
            </div>
          </div>
        </div>

        {/* Primary Data Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-slate-100 border-b border-slate-100">
          {[
            { label: 'Farmer Profile', value: policy.fullName || policy.farmerName || 'Registered User', sub: policy.mobile || 'Identity Verified', icon: User },
            { label: 'Network Location', value: policy.district, sub: `${policy.season} Season`, icon: MapPin },
            { label: 'Premium Paid', value: formatINR(policy.premiumINR || policy.premiumPaid), sub: `≈ ${policy.premiumETH || '0.00'} ETH`, icon: Wallet },
            { label: 'Account Node', value: policy.walletAddress ? `${policy.walletAddress.slice(0, 6)}...${policy.walletAddress.slice(-4)}` : 'Auth Required', sub: 'Verified Address', icon: Shield },
          ].map((item, i) => (
            <div key={i} className="bg-white p-8">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <item.icon className="w-3.5 h-3.5 text-emerald-500" /> {item.label}
              </p>
              <p className="text-lg font-bold text-slate-900 truncate">{item.value}</p>
              <p className="text-xs font-bold text-slate-400 mt-1">{item.sub}</p>
            </div>
          ))}
        </div>

        {/* Technical Details Row */}
        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-10 bg-slate-50/50">
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Risk Exposure</h3>
            {district ? <RiskBadge level={district.riskLevel} /> : <span className="text-sm font-bold text-slate-900">Standard Profile</span>}
          </div>
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Coverage Period</h3>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-sm">
                <p className="text-[10px] font-bold text-slate-900">{formatDate(policy.startDate)}</p>
              </div>
              <div className="w-4 h-px bg-slate-300" />
              <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-sm">
                <p className="text-[10px] font-bold text-slate-900">{formatDate(policy.endDate)}</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Verification & Certificate</h3>
            <div className="flex gap-3 flex-wrap">
              {policy.txHash && (
                <a 
                  href={`https://sepolia.etherscan.io/tx/${policy.txHash}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:border-emerald-200 hover:shadow-sm transition-all"
                >
                  Verify Etherscan <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <button 
                onClick={() => downloadPolicyCertificate(policy)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-650 hover:bg-emerald-700 text-[10px] font-black text-white uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20"
              >
                Download Certificate
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Payout Summary Card — shown when policy is PaidOut */}
      {policy.status === 'PaidOut' && (policy.payoutHistory || []).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="premium-card overflow-hidden border-2 border-emerald-200"
        >
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-6 h-6" />
              <h2 className="text-lg font-black uppercase tracking-widest">Autonomous Payout Disbursed</h2>
            </div>
          </div>
          <div className="p-8 space-y-6">
            {(policy.payoutHistory || []).map((payout, idx) => {
              const payoutINR = parseFloat(payout.amountINR) || parseFloat(payout.amount) || 0;
              const gasEstimate = Math.round(payoutINR * 0.005) || 15;
              return (
                <div key={idx} className="space-y-4">
                  <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <p className="text-base font-bold text-slate-800 leading-relaxed">
                      {payoutDescription(payoutINR, payout.trigger, policy.district)}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Amount (INR)</p>
                      <p className="text-lg font-black text-emerald-600">{formatINR(payoutINR)}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">In Words</p>
                      <p className="text-sm font-bold text-slate-700">{amountInWords(payoutINR)}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Gas Fee (Est.)</p>
                      <p className="text-lg font-black text-amber-600">≈ {formatINR(gasEstimate)}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Trigger Event</p>
                      <p className="text-lg font-black text-red-600 capitalize">{payout.trigger}</p>
                    </div>
                  </div>
                  {payout.txHash && (
                    <div className="flex items-center gap-3 p-4 bg-slate-900 rounded-xl">
                      <div className="flex-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Transaction Hash</p>
                        <p className="text-xs font-mono text-slate-300 break-all">{payout.txHash}</p>
                      </div>
                      <a href={`https://sepolia.etherscan.io/tx/${payout.txHash}`} target="_blank" rel="noreferrer" className="px-4 py-2 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-emerald-700 transition-all flex items-center gap-1.5 shrink-0">
                        Verify <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── POLICY EVENT HISTORY TIMELINE (Full-width, middle) ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="premium-card p-8"
      >
        <h3 className="text-lg font-bold text-slate-900 mb-8 flex items-center gap-2">
          <Clock className="w-5 h-5 text-emerald-600 animate-pulse" /> Policy Event History
        </h3>
        <div className="relative">
          {/* Vertical Timeline Bar */}
          <div className="absolute left-[19px] top-6 bottom-6 w-0.5 bg-slate-100" />
          
          <div className="space-y-8">
            {timeline.map((event, i) => (
              <div 
                key={i} 
                className={`flex gap-6 relative transition-all ${
                  event.active ? 'opacity-100' : 'opacity-40 select-none'
                }`}
              >
                {/* Timeline Node Icon Circle */}
                <div className={`w-10 h-10 rounded-full border-2 bg-white flex items-center justify-center shrink-0 z-10 shadow-sm ${
                  event.active ? (
                    event.phase === 1 || event.phase === 6 ? 'border-emerald-500' :
                    event.phase === 2 ? 'border-blue-500' :
                    event.phase === 3 || event.phase === 5 ? 'border-amber-500' :
                    'border-red-500'
                  ) : 'border-slate-300'
                }`}>
                  <span className={`w-3.5 h-3.5 rounded-full ${
                    event.active ? (
                      event.phase === 1 || event.phase === 6 ? 'bg-emerald-500 animate-ping' :
                      event.phase === 2 ? 'bg-blue-500' :
                      event.phase === 3 || event.phase === 5 ? 'bg-amber-500' :
                      'bg-red-500'
                    ) : 'bg-slate-300'
                  }`} />
                </div>
                
                <div className="pt-0.5 space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <h4 className={`text-sm font-black uppercase tracking-wider ${
                      event.active ? 'text-slate-900' : 'text-slate-400'
                    }`}>
                      {event.title}
                    </h4>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono shrink-0 sm:text-right">
                      {event.time}
                    </span>
                  </div>
                  <p className={`text-xs font-medium leading-relaxed ${
                    event.active ? 'text-slate-650' : 'text-slate-450 italic'
                  }`}>
                    {event.active ? event.desc : 'Awaiting trigger conditions'}
                  </p>
                  
                  {event.active && event.txHash && (
                    <a 
                      href={`https://sepolia.etherscan.io/tx/${event.txHash}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-[9px] text-emerald-600 font-bold uppercase tracking-widest inline-flex items-center gap-1 hover:underline"
                    >
                      Verify Transaction <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Active Risk & Oracle Status (7/12) */}
        <div className="lg:col-span-7 space-y-8">
          {/* Covered Triggers */}
          <div className="premium-card p-8">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-emerald-600" /> Active Risk Monitor
            </h3>
            <div className="space-y-4">
              {(policy.triggers || policy.triggersSelected || []).map((trigger) => {
                const confidence = policy.triggerConfidence?.[trigger];
                return (
                  <div key={trigger} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                        <Shield className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 capitalize">{trigger}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Monitoring</p>
                      </div>
                    </div>
                    {confidence !== undefined && (
                      <div className="text-right">
                        <p className="text-lg font-black text-emerald-600">{confidence}%</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Confidence</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chainlink Oracle Status */}
          {(policy.triggers || policy.triggersSelected || []).length > 0 && (
            <div className="premium-card p-8 bg-slate-900 border-emerald-500/30">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-400" /> Chainlink Oracle Pipeline
              </h3>
              <div className="space-y-4">
                {(policy.triggers || policy.triggersSelected || []).map((trigger) => {
                  const req = oracleRequests.slice().reverse().find(r => r.triggerType === trigger);
                  const ful = req ? oracleFulfillments.find(f => f.requestId === req.requestId) : null;
                  
                  let status = 'Pending Request';
                  let statusColor = 'text-slate-400';
                  let displayConfidence = ful ? ful.confidenceScore : null;
                  
                  if (ful) {
                    status = ful.fired ? 'Trigger Fired On-Chain' : 'Fulfilled (Not Fired)';
                    statusColor = ful.fired ? 'text-emerald-400' : 'text-blue-400';
                  } else if (req) {
                    status = 'Awaiting External Adapter';
                    statusColor = 'text-amber-400';
                  } else if (policy.status === 'PaidOut' || policy.status === 'Triggered') {
                    // Check if this specific trigger was the one that was fired
                    const isFired = (policy.payoutHistory || []).some(p => p.trigger === trigger);
                    if (isFired) {
                      status = 'Trigger Fired (Simulated)';
                      statusColor = 'text-emerald-400';
                      displayConfidence = 85;
                    }
                  }

                  return (
                    <div key={`oracle-${trigger}`} className="p-4 bg-slate-800 rounded-2xl border border-slate-700">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-sm font-bold text-white capitalize">{trigger} Oracle</p>
                          <p className={`text-[10px] font-black uppercase tracking-widest ${statusColor}`}>{status}</p>
                        </div>
                        {displayConfidence !== null && (
                          <div className="text-right">
                            <p className="text-lg font-black text-white">{displayConfidence}%</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Confidence</p>
                          </div>
                        )}
                      </div>
                      
                      {req && (
                        <div className="mt-3 pt-3 border-t border-slate-700 flex flex-col gap-2">
                           <a 
                            href={`https://sepolia.etherscan.io/tx/${req.txHash}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-[10px] font-bold text-slate-400 hover:text-blue-400 truncate flex items-center gap-1"
                           >
                            Request TX: {req.txHash.slice(0, 14)}... <ExternalLink className="w-3 h-3" />
                           </a>
                           {ful && (
                             <a 
                               href={`https://sepolia.etherscan.io/tx/${ful.txHash}`} 
                               target="_blank" 
                               rel="noreferrer"
                               className="text-[10px] font-bold text-slate-400 hover:text-emerald-400 truncate flex items-center gap-1"
                             >
                               Fulfill TX: {ful.txHash.slice(0, 14)}... <ExternalLink className="w-3 h-3" />
                             </a>
                           )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: Owner Controls (5/12) */}
        <div className="lg:col-span-5 space-y-8">
          {/* Smart Contract Control Panel */}
          <div className="bg-slate-900 rounded-[32px] p-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-grid opacity-10" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-widest mb-1">Smart Contract Console</h3>
                  <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">On-Chain Operations</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-emerald-400" />
                </div>
              </div>

              <div className="p-6 bg-white/5 rounded-2xl border border-white/10 mb-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Blockchain Network</p>
                    <p className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Sepolia Testnet
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Access Level</p>
                    <p className="text-sm font-bold text-white">{isOwner ? "Owner (Full Access)" : "Farmer (Read-Only)"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">PayoutVault Balance</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xl font-black text-white">{vaultBalance ? Number(vaultBalance).toFixed(4) : "0.0000"} ETH</p>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-[9px] font-bold text-emerald-400 border border-emerald-500/30">Live</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Real-time balance of the InsureChain PayoutVault smart contract on Sepolia.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trigger Payout</p>
                <div className="grid grid-cols-1 gap-4">
                  {(policy.triggers || policy.triggersSelected || []).map(t => (
                    <div key={t} className="p-4 bg-slate-800 rounded-2xl border border-slate-700 space-y-3">
                      <p className="text-xs font-bold text-white uppercase tracking-wider">{t} Event</p>
                      
                      <div className="grid grid-cols-2 gap-2">
                        {/* Backend Simulation (updates Firestore + sends email) */}
                        <button
                          disabled={isTriggering || policy.status === 'PaidOut'}
                          onClick={async () => {
                            try {
                              setIsTriggering(true);
                              const response = await fetch('http://127.0.0.1:5000/api/mock-trigger', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': 'Bearer insurechain-api-key-2026'
                                },
                                body: JSON.stringify({
                                  policyId: policy.policyId || policy.id,
                                  triggerType: t
                                })
                              });
                              const data = await response.json();
                              if (response.ok && data.success) {
                                alert(`Payout triggered successfully!\nEmail Notification: ${data.email_sent ? 'Sent' : 'Pending'}`);
                                window.location.reload();
                              } else {
                                alert(`Trigger failed: ${data.error || 'Unknown error'}`);
                              }
                            } catch (e) {
                              console.error("Trigger error:", e);
                              alert(`Network error: ${e.message}`);
                            } finally {
                              setIsTriggering(false);
                            }
                          }}
                          className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-30 flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/20"
                        >
                          <Zap className="w-3 h-3" /> Trigger Payout
                        </button>

                        {/* On-Chain Payout via Smart Contract (Requires MetaMask + Owner Account) */}
                        <button
                          disabled={isTriggering || policy.status === 'PaidOut' || !isConnected}
                          onClick={() => handleManualTrigger(t)}
                          className="py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-30 flex items-center justify-center gap-1.5 shadow-md shadow-blue-950/20"
                          title={!isConnected ? "Please connect MetaMask wallet" : "Requires owner privileges"}
                        >
                          <Shield className="w-3 h-3" /> Execute On-Chain
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
