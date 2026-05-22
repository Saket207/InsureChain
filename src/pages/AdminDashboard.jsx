import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BrowserProvider, Contract, parseEther } from 'ethers';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  IndianRupee,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Loader2,
  Zap,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  getAllAdminPolicies, 
  updatePolicyStatus, 
  logAdminAction, 
  getAdminLogs,
  getDistrictRiskScore
} from '../services/firestoreService';
import { backendApi } from '../services/backendApi';
import { formatINR } from '../utils/helpers';
import { useWalletStore } from '../stores/walletStore';
import { getContracts } from '../services/contractService';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { farmerProfile, currentUser } = useAuth();
  const { isConnected, address } = useWalletStore();

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // 'approve-id', 'reject-id', 'payout-id'
  const [policies, setPolicies] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('All');
  
  // Modal states
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [selectedPolicyForRisk, setSelectedPolicyForRisk] = useState(null);
  const [riskData, setRiskData] = useState(null);

  useEffect(() => {
    // Route guard
    if (farmerProfile && farmerProfile.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [farmerProfile, navigate]);

  const fetchData = async () => {
    setLoading(true);
    const fetchedPolicies = await getAllAdminPolicies();
    const fetchedLogs = await getAdminLogs();
    
    // Sort policies by createdAt desc
    fetchedPolicies.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return timeB - timeA;
    });

    setPolicies(fetchedPolicies);
    setLogs(fetchedLogs);
    setLoading(false);
  };

  useEffect(() => {
    if (farmerProfile?.role === 'admin') {
      fetchData();
    }
  }, [farmerProfile]);

  // Derived Stats
  const activeCount = policies.filter(p => p.status === 'Active').length;
  const pendingCount = policies.filter(p => p.status === 'Pending').length;
  const payoutsCount = policies.filter(p => p.status === 'PaidOut').length;
  
  // Total exposure (Sum of coverage for Active policies)
  const totalExposure = policies
    .filter(p => p.status === 'Active')
    .reduce((sum, p) => sum + (parseFloat(p.coverageINR) || 0), 0);

  // Total payouts released (Sum of coverage for PaidOut policies)
  const totalPayouts = policies
    .filter(p => p.status === 'PaidOut')
    .reduce((sum, p) => sum + (parseFloat(p.coverageINR) || 0), 0);

  // Filtered Policies for Table
  const filteredPolicies = activeTab === 'All' 
    ? policies 
    : policies.filter(p => p.status === activeTab);

  const pendingPolicies = policies.filter(p => p.status === 'Pending');

  // --- ACTIONS ---

  const handleRiskApprove = async (policy) => {
    setActionLoading(`risk-${policy.id}`);
    const district = policy.district || 'nagpur';
    let riskScore = 0;
    
    try {
      const backendRisk = await backendApi.getDistrictRisk(district);
      if (backendRisk && !backendRisk.error) {
        riskScore = backendRisk.riskScore;
      } else {
        const fallback = await getDistrictRiskScore(district);
        riskScore = fallback?.riskScore || 50;
      }
    } catch (e) {
      riskScore = 50; // default
    }

    setRiskData({ score: riskScore, district });

    if (riskScore > 60) {
      setSelectedPolicyForRisk(policy);
      setWarningModalOpen(true);
      setActionLoading(null);
    } else {
      await forceApprove(policy);
    }
  };

  const forceApprove = async (policy) => {
    setActionLoading(`approve-${policy.id}`);
    try {
      await updatePolicyStatus(policy.id, 'Active');
      await logAdminAction(currentUser.uid, 'APPROVE_POLICY', policy.id, `Approved Policy ${policy.policyId}`);
      await fetchData();
    } catch (e) {
      alert("Approval failed: " + e.message);
    }
    setActionLoading(null);
    setWarningModalOpen(false);
  };

  const handleForceReject = async (policy) => {
    if (!isConnected || !window.ethereum) {
      alert("Please connect your wallet to process refunds.");
      return;
    }
    if (!confirm(`Are you sure you want to reject policy ${policy.policyId} and refund ${policy.premiumETH} ETH?`)) return;

    setActionLoading(`reject-${policy.id}`);
    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const { PayoutVault } = getContracts(signer);
      
      const amountWei = parseEther(policy.premiumETH.toString());
      
      const tx = await PayoutVault.refundPremium(policy.walletAddress, amountWei);
      await tx.wait();

      await updatePolicyStatus(policy.id, 'Rejected');
      await logAdminAction(currentUser.uid, 'REJECT_POLICY', policy.id, `Rejected & Refunded ${policy.premiumETH} ETH`);
      await fetchData();
    } catch (e) {
      console.error(e);
      alert("Rejection failed. Ensure you are connected as Admin (Owner) on Metamask.");
    }
    setActionLoading(null);
  };

  const handleForcePayout = async (policy) => {
    if (!isConnected || !window.ethereum) {
      alert("Please connect your admin wallet to release payouts.");
      return;
    }
    if (!confirm(`Force release payout of ${policy.coverageINR} INR for ${policy.policyId}?`)) return;

    setActionLoading(`payout-${policy.id}`);
    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const { TriggerOracle } = getContracts(signer);

      const tx = await TriggerOracle.manualTrigger(policy.policyId, "Admin_Force_Payout");
      await tx.wait();

      // Ensure status is updated locally/firestore
      await updatePolicyStatus(policy.id, 'PaidOut');
      await logAdminAction(currentUser.uid, 'FORCE_PAYOUT', policy.id, `Forced Payout of ${policy.coverageINR} INR`);
      await fetchData();
    } catch (e) {
      console.error(e);
      alert("Payout failed. " + (e.reason || e.message));
    }
    setActionLoading(null);
  };

  if (loading && policies.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-extrabold font-heading tracking-tight text-slate-900">Government Command Center</h1>
          </div>
          <p className="text-sm font-bold text-slate-500">Monitor exposure, approve registrations, and audit payouts globally.</p>
        </div>
      </div>

      {/* ── STATS CARDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Activity className="w-24 h-24 text-slate-900" />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Total Active Policies</p>
          <p className="text-4xl font-black text-slate-900">{activeCount}</p>
        </div>
        
        <div className="bg-slate-900 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingUp className="w-24 h-24 text-white" />
          </div>
          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4">Total Coverage Exposure</p>
          <p className="text-4xl font-black text-white">{formatINR(totalExposure)}</p>
        </div>
        
        <div className="bg-amber-50 rounded-3xl p-6 border border-amber-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <AlertTriangle className="w-24 h-24 text-amber-500" />
          </div>
          <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-4">Pending Approvals</p>
          <div className="flex items-center gap-3">
            <p className="text-4xl font-black text-amber-700">{pendingCount}</p>
            {pendingCount > 0 && <span className="flex h-3 w-3 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span></span>}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <IndianRupee className="w-24 h-24 text-emerald-500" />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Total Payouts Released</p>
          <p className="text-4xl font-black text-emerald-600">{formatINR(totalPayouts)}</p>
          <p className="text-xs font-bold text-slate-400 mt-2">{payoutsCount} Policies Settled</p>
        </div>
      </div>

      {/* ── PENDING APPROVALS ── */}
      {pendingPolicies.length > 0 && (
        <div className="bg-white rounded-3xl border border-amber-200 shadow-xl overflow-hidden">
          <div className="bg-amber-50 px-8 py-5 border-b border-amber-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h3 className="text-sm font-black text-amber-900 uppercase tracking-widest">Action Required: Pending Registrations</h3>
            </div>
            <span className="px-3 py-1 bg-amber-200 text-amber-800 rounded-lg text-[10px] font-black uppercase tracking-widest">
              {pendingPolicies.length} Pending
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Policy Details</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Farmer</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Premium / Coverage</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingPolicies.map((policy) => (
                  <tr key={policy.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                          <Eye className="w-4 h-4 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{policy.policyId}</p>
                          <p className="text-xs font-medium text-slate-500">{policy.district} • {policy.season}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold text-slate-900">{policy.fullName}</p>
                      <p className="text-xs font-mono text-slate-400">{policy.walletAddress?.slice(0,8)}...</p>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold text-emerald-600">{formatINR(policy.premiumINR)} / {policy.premiumETH} ETH</p>
                      <p className="text-xs font-medium text-slate-500">Cov: {formatINR(policy.coverageINR)}</p>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleForceReject(policy)}
                          disabled={actionLoading}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors disabled:opacity-50"
                          title="Reject & Refund"
                        >
                          {actionLoading === `reject-${policy.id}` ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5" />}
                        </button>
                        <button 
                          onClick={() => forceApprove(policy)}
                          disabled={actionLoading}
                          className="px-4 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50"
                        >
                          {actionLoading === `approve-${policy.id}` ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Force Approve'}
                        </button>
                        <button 
                          onClick={() => handleRiskApprove(policy)}
                          disabled={actionLoading}
                          className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                          {actionLoading === `risk-${policy.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                          Risk Verify
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ALL POLICIES TABLE ── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-8 py-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-slate-400" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Global Policy Registry</h3>
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {['All', 'Active', 'Pending', 'PaidOut', 'Rejected'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab === 'PaidOut' ? 'Paid Out' : tab}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Policy ID / Date</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Admin Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPolicies.map(policy => (
                <tr key={policy.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-8 py-4">
                    <p className="text-sm font-bold text-slate-900">{policy.policyId}</p>
                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">
                      {policy.createdAt?.toDate ? policy.createdAt.toDate().toLocaleDateString() : 'Unknown Date'}
                    </p>
                  </td>
                  <td className="px-8 py-4">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                      policy.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 
                      policy.status === 'PaidOut' ? 'bg-emerald-100 text-emerald-800' : 
                      policy.status === 'Pending' ? 'bg-amber-50 text-amber-600' :
                      policy.status === 'Rejected' ? 'bg-rose-50 text-rose-600' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {policy.status}
                    </span>
                  </td>
                  <td className="px-8 py-4">
                    <p className="text-sm font-bold text-slate-900">{policy.district}</p>
                  </td>
                  <td className="px-8 py-4 text-right">
                    {policy.status === 'Active' ? (
                      <button
                        onClick={() => handleForcePayout(policy)}
                        disabled={actionLoading}
                        className="px-4 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === `payout-${policy.id}` ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : 'Force Payout'}
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No Action</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredPolicies.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-8 py-12 text-center text-slate-500 font-medium">
                    No policies found in this category.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── AUDIT LOG FEED ── */}
      <div className="bg-slate-900 rounded-3xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-10" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <Activity className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Admin Action Audit Log</h3>
          </div>
          
          <div className="space-y-6 max-h-[400px] overflow-y-auto custom-scrollbar pr-4">
            {logs.map((log) => (
              <div key={log.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center z-10">
                    <Shield className="w-3 h-3 text-emerald-400" />
                  </div>
                  <div className="w-px h-full bg-slate-800 -my-2" />
                </div>
                <div className="pb-6">
                  <p className="text-xs font-bold text-emerald-400 mb-1">{log.action}</p>
                  <p className="text-sm font-medium text-slate-300">{log.details}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <p className="text-[10px] font-mono text-slate-500">{log.policyId}</p>
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                      {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : 'Just now'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {logs.length === 0 && (
              <p className="text-slate-500 text-sm font-medium text-center py-8">No admin actions recorded yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* ── RISK WARNING MODAL ── */}
      <AnimatePresence>
        {warningModalOpen && selectedPolicyForRisk && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-amber-500" />
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-6 mx-auto">
                <AlertTriangle className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 text-center mb-2">High Risk District</h3>
              <p className="text-slate-500 text-center font-medium mb-8">
                The district <b>{riskData?.district}</b> currently has a risk score of <b className="text-amber-600">{riskData?.score}</b>. Are you sure you want to approve this policy?
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setWarningModalOpen(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => forceApprove(selectedPolicyForRisk)}
                  className="flex-1 py-4 bg-amber-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-amber-600 transition-colors shadow-lg shadow-amber-500/30"
                >
                  Approve Anyway
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
