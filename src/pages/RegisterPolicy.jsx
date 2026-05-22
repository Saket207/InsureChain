import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  User,
  Phone,
  MapPin,
  Calendar,
  Check,
  Wallet,
  Shield,
  PartyPopper,
  ExternalLink,
  Loader2,
  TrendingUp,
  Zap,
  Mail
} from 'lucide-react';
import StepIndicator from '../components/StepIndicator';
import TriggerSelector from '../components/TriggerSelector';
import DistrictSelector from '../components/DistrictSelector';
import WalletButton from '../components/WalletButton';
import { usePolicyStore } from '../stores/policyStore';
import { useWalletStore } from '../stores/walletStore';
import { calculatePremium, formatINR, generateMockRisk } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import { 
  updateFarmerProfile, 
  createPolicy, 
  getDistrictRiskScore,
  getDistrictRiskScores 
} from '../services/firestoreService';
import { fetchEthInrPrice } from '../utils/priceUtils';
import { registerPolicyOnChain } from '../services/contractService';
import { BrowserProvider, parseEther } from 'ethers';

import { backendApi } from '../services/backendApi';

const steps = ['Risk Coverage', 'Authentication', 'Final Receipt'];

export default function RegisterPolicy() {
  const navigate = useNavigate();
  const { registrationData, updateRegistrationData, toggleTrigger, currentStep, setCurrentStep, nextStep, prevStep, resetRegistration } = usePolicyStore();
  const { isConnected, address } = useWalletStore();
  const { currentUser, farmerProfile, setFarmerProfile } = useAuth();
  
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [createdPolicy, setCreatedPolicy] = useState(null);
  
  const [districtsCache, setDistrictsCache] = useState({});
  const [selectedDistrictData, setSelectedDistrictData] = useState(null);
  const [ethPrice, setEthPrice] = useState(280000); // Default fallback
  const [backendPremium, setBackendPremium] = useState(null);

  // Fetch ETH price
  useEffect(() => {
    fetchEthInrPrice().then(setEthPrice);
  }, []);

  // Sync registration data with farmer profile
  useEffect(() => {
    if (farmerProfile && !registrationData.district) {
      updateRegistrationData({
        district: farmerProfile.districtId || null,
        state: farmerProfile.state || 'Maharashtra',
        fullName: farmerProfile.fullName || farmerProfile.name || '',
        email: farmerProfile.email || '',
      });
    }
  }, [farmerProfile]);

  // Fetch district data and premium from backend
  useEffect(() => {
    const fetchBackendData = async () => {
      if (!registrationData.district) {
        setSelectedDistrictData(null);
        setBackendPremium(null);
        return;
      }

      try {
        // 1. Fetch District Risk
        let districtData = districtsCache[registrationData.district];
        if (!districtData) {
          const resp = await backendApi.getDistrictRisk(registrationData.district, registrationData.season);
          if (resp && !resp.error) {
            districtData = resp;
            setDistrictsCache(prev => ({ ...prev, [registrationData.district]: resp }));
          } else {
            districtData = await getDistrictRiskScore(registrationData.district);
            if (!districtData) {
               districtData = generateMockRisk(registrationData.district);
            }
          }
        }
        setSelectedDistrictData(districtData);

        // 2. Fetch Premium if triggers selected
        if (registrationData.triggers.length > 0) {
          const premResp = await backendApi.calculatePremium(
            registrationData.district, 
            registrationData.triggers,
            registrationData.season
          );
          if (premResp && !premResp.error) {
            setBackendPremium(premResp);
          }
        } else {
          setBackendPremium(null);
        }
      } catch (err) {
        console.error("Backend fetch error:", err);
      }
    };
    
    fetchBackendData();
  }, [registrationData.district, registrationData.triggers, registrationData.season, districtsCache]);

  // Use backend premium if available, otherwise fallback to local calculation
  const premiumData = (backendPremium && backendPremium.breakdown) ? {
    premium: backendPremium.total_premium_inr,
    coverage: backendPremium.coverage_inr,
    breakdown: {
      baseRate: backendPremium.breakdown.base_rate || 500,
      regionalRiskMultiplier: backendPremium.breakdown.risk_multiplier || 1.0,
      seasonFactor: backendPremium.breakdown.season_factor || 1.0,
      coverageMultiplier: backendPremium.breakdown.coverage_multiplier || 1.0,
    }
  } : (backendPremium ? {
    premium: backendPremium.total_premium_inr,
    coverage: backendPremium.coverage_inr,
    breakdown: {
      baseRate: 500,
      regionalRiskMultiplier: 1.0,
      seasonFactor: 1.0,
      coverageMultiplier: 1.0,
    }
  } : calculatePremium({
    district: selectedDistrictData || { riskScore: 50 },
    season: registrationData.season,
    triggers: registrationData.triggers,
  }));

  const validateEmail = (email) => {
    return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  

  const canProceedStep1 = registrationData.triggers.length > 0;
  const canProceedStep2 = isConnected && termsAccepted;

  

  const handleConfirmAndPay = async () => {
    try {
      setIsProcessing(true);
      
      let mockTxHash = `0x${Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('')}`;
 
      const policyData = {
        farmerUid: currentUser?.uid || 'mock-user-123',
        walletAddress: address,
        email: registrationData.email,
        fullName: registrationData.fullName || '',
        state: selectedDistrictData?.state || registrationData.state || 'Maharashtra',
        district: selectedDistrictData?.district || registrationData.district,
        districtLat: selectedDistrictData?.lat || 0,
        districtLon: selectedDistrictData?.lon || 0,
        season: registrationData.season,
        triggersSelected: registrationData.triggers,
        coverageAmount: parseFloat(((premiumData.coverage || 5000) / (ethPrice || 280000)).toFixed(6)),
        coverageINR: premiumData.coverage || (premiumData.premium * 10) || 5000,
        premiumINR: premiumData.premium || 0,
        premiumETH: parseFloat(((premiumData.premium || 0) / (ethPrice || 280000)).toFixed(6)),
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 6)),
        status: 'Pending',
      };
 
      if (isConnected && window.ethereum) {
        try {
          const provider = new BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          policyData.policyId = `IC-${new Date().getFullYear()}-${(policyData.state || 'MH').slice(0,2).toUpperCase()}-${Date.now().toString().slice(-4)}`;
          mockTxHash = await registerPolicyOnChain(signer, policyData, policyData.premiumETH);
        } catch (e) {
          console.error("Transaction failed", e);
          const errorMsg = e.reason || e.message || "Transaction failed.";
          alert("Error: " + errorMsg);
          setIsProcessing(false);
          return;
        }
      } else {
        await new Promise(resolve => setTimeout(resolve, 2000));
        policyData.policyId = `IC-${new Date().getFullYear()}-${(policyData.state || 'MH').slice(0,2).toUpperCase()}-${Date.now().toString().slice(-4)}`;
      }
      
      policyData.txHash = mockTxHash;
 
      let newPolicy;
      if (currentUser?.uid) {
        newPolicy = await Promise.race([
          createPolicy(policyData),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore Write Timeout')), 2000))
        ]).catch(e => null);
      }
      
      if (!newPolicy) {
        newPolicy = { id: 'mock-policy', ...policyData, status: 'Active' };
      }
      
      setCreatedPolicy(newPolicy);
      
      // Trigger confirmation email via Flask backend using Resend.com
      if (registrationData.email) {
        try {
          await fetch('http://127.0.0.1:5000/api/send-policy-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer insurechain-api-key-2026'
            },
            body: JSON.stringify({
              email: registrationData.email,
              policyId: newPolicy.policyId || newPolicy.id,
              fullName: registrationData.fullName,
              state: selectedDistrictData?.state || registrationData.state || 'Maharashtra',
              district: selectedDistrictData?.district || registrationData.district || 'Nagpur',
              season: registrationData.season,
              triggers: registrationData.triggers,
              premiumINR: premiumData.premium,
              premiumETH: parseFloat((premiumData.premium / (ethPrice || 280000)).toFixed(6)),
              coverageINR: premiumData.coverage || (premiumData.premium * 10),
              txHash: mockTxHash,
              walletAddress: address || '0xDemoWalletAddress'
            })
          })
          .then(res => {
            if (res.status === 403) {
              // Resend free tier restriction – log instead of sending
              console.warn('Resend blocked email to external address; logging for dev');
              return { emailSent: false };
            }
            return res.json();
          })
          .then(emailResp => console.log('Resend policy email dispatch success:', emailResp))
          .catch(err => console.error('Failed to send registration email:', err));
        } catch (e) {
          console.error("Email API invocation failed", e);
        }
      }
      nextStep();
    } catch (err) {
      console.error('Failed to create policy', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="mb-12 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-600 mb-4">
          <Shield className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">Secure Node Registration</span>
        </div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Policy Initiation</h1>
        <p className="text-slate-500 font-medium">Protect your agricultural assets with real-time blockchain monitoring.</p>
      </div>

      <div className="mb-12 px-6">
        <StepIndicator steps={steps} currentStep={currentStep} />
      </div>

      <AnimatePresence mode="wait">
        {/* ═══ STEP 0: Coverage ═══ */}
        {currentStep === 0 && (
          <motion.div
            key="step-0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="premium-card overflow-hidden"
          >
            <div className="bg-slate-900 px-8 py-4 flex items-center gap-3 border-b border-slate-800">
              <Shield className="w-5 h-5 text-emerald-400" />
              <h2 className="text-sm font-black text-white uppercase tracking-widest">Autonomous Risk Configuration</h2>
            </div>

            
            <div className="p-8 sm:p-12">
              {/* District & Season Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Confirmed District</label>
                  <div className="relative group">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                    <input
                      type="text"
                      value={selectedDistrictData?.district || registrationData.district || 'Select from profile'}
                      disabled
                      className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 text-sm font-bold text-slate-900 outline-none cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Operational Season</label>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { id: 'Kharif', label: 'Kharif', icon: <Zap className="w-4 h-4" /> },
                      { id: 'Rabi', label: 'Rabi', icon: <Shield className="w-4 h-4" /> },
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => updateRegistrationData({ season: s.id })}
                        className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all hover:scale-[1.01] active:scale-[0.99]
                          ${registrationData.season === s.id
                            ? 'border-emerald-500 bg-emerald-50/50 shadow-inner text-emerald-700'
                            : 'border-slate-50 bg-slate-50/30 text-slate-500'
                          }`}
                      >
                        <div className={`p-2 rounded-xl ${registrationData.season === s.id ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400 border border-slate-100 shadow-sm'}`}>
                          {s.icon}
                        </div>
                        <p className="text-xs font-black uppercase tracking-widest">{s.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <TriggerSelector

                selected={registrationData.triggers}
                onToggle={toggleTrigger}
                district={selectedDistrictData}
                season={registrationData.season}
              />

              {registrationData.triggers.length > 0 && (
                <div className="mt-10 p-8 bg-emerald-50 rounded-3xl border border-emerald-100 border-dashed">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-emerald-500 text-white">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Projected Payout Intelligence</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {registrationData.triggers.map((t) => (
                      <div key={t} className="flex justify-between items-center p-4 bg-white rounded-2xl border border-emerald-100 shadow-sm">
                        <span className="text-xs font-black text-slate-700 uppercase tracking-widest">{t} Incident</span>
                        <span className="text-sm font-black text-emerald-600">{formatINR(Math.round(premiumData.premium * 8))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end mt-12">
                <button
                  onClick={nextStep}
                  disabled={!canProceedStep1}
                  className="px-12 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 hover:shadow-2xl hover:shadow-emerald-500/20 disabled:opacity-30 transition-all flex items-center gap-3"
                >
                  Verify Protection <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══ STEP 2: Review ═══ */}
        {currentStep === 1 && (
          <motion.div
            key="step-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="premium-card overflow-hidden"
          >
            <div className="bg-slate-900 px-8 py-4 flex items-center gap-3 border-b border-slate-800">
              <Wallet className="w-5 h-5 text-emerald-400" />
              <h2 className="text-sm font-black text-white uppercase tracking-widest">Blockchain Authorization</h2>
            </div>

            <div className="p-8 sm:p-12">
              <div className="mb-10 p-8 rounded-3xl bg-slate-50 border-2 border-slate-100 border-dashed text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">On-Chain Identity Link</p>
                <div className="flex justify-center">
                  <WalletButton />
                </div>
                {isConnected && (
                  <div className="mt-6 flex items-center justify-center gap-2 text-xs font-black text-emerald-600">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    CONNECTED: {address?.slice(0, 8)}...{address?.slice(-6)}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden mb-10">
                <div className="bg-slate-50 px-8 py-4 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Policy Summary Receipt</h3>
                  <div className="px-3 py-1 rounded bg-emerald-500 text-white text-[10px] font-black tracking-tighter">AUTHENTICATED</div>
                </div>
                
                <div className="p-8 space-y-6">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Beneficiary</span>
                    <span className="text-sm font-bold text-slate-900">{registrationData.fullName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Coverage Node</span>
                    <span className="text-sm font-bold text-slate-900">{selectedDistrictData?.district}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest pt-1">Active Triggers</span>
                    <div className="flex gap-2 flex-wrap justify-end max-w-xs">
                      {registrationData.triggers.map((t) => (
                        <span key={t} className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-100">{t}</span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="pt-8 mt-8 border-t border-slate-100 flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Registration Premium</p>
                      <p className="text-4xl font-black text-emerald-600">{formatINR(premiumData.premium)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-900">≈ {(premiumData.premium / ethPrice).toFixed(6)} ETH</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">L1 Base Fee Included</p>
                    </div>
                  </div>
                </div>
              </div>

              <label className="flex items-start gap-4 cursor-pointer group mb-12 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <div className="relative mt-1">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="peer appearance-none w-6 h-6 rounded-lg border-2 border-slate-200 checked:bg-emerald-500 checked:border-emerald-500 transition-all cursor-pointer"
                  />
                  <Check className="absolute top-1 left-1 w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed tracking-wider">
                  I authorize the smart contract to initiate this policy. I understand that payouts are automated based on decentralized weather oracles.
                </span>
              </label>

              <div className="flex justify-between items-center">
                <button onClick={prevStep} className="px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-emerald-600 transition-colors">
                  Modify Parameters
                </button>
                <button
                  onClick={handleConfirmAndPay}
                  disabled={!canProceedStep2 || isProcessing}
                  className="px-12 py-5 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 hover:shadow-2xl hover:shadow-emerald-500/30 disabled:opacity-30 transition-all flex items-center gap-3"
                >
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <> <Shield className="w-5 h-5" /> Execute Smart Contract </>}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══ STEP 3: Confirmation ═══ */}
        {currentStep === 2 && createdPolicy && (
          <motion.div
            key="step-2"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="premium-card p-12 text-center"
          >
            <div className="w-24 h-24 rounded-3xl bg-emerald-500 flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-emerald-500/20 rotate-12">
              <Check className="w-12 h-12 text-white -rotate-12" />
            </div>

            <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-4">Registration Submitted</h2>
            <p className="text-slate-500 font-medium mb-12 max-w-sm mx-auto">Your protection policy <b>{createdPolicy.policyId}</b> has been broadcasted and is <b>awaiting Government Approval</b>.</p>

            <div className="bg-slate-900 rounded-3xl p-8 mb-12 text-left space-y-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-grid opacity-10" />
              <div className="relative z-10">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Transaction Hash</span>
                  <a href={`https://sepolia.etherscan.io/tx/${createdPolicy.txHash}`} target="_blank" rel="noreferrer" className="text-white font-mono text-[10px] flex items-center gap-2 hover:text-emerald-400 transition-colors">
                    {createdPolicy.txHash.slice(0, 16)}... <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex justify-between items-center pt-6 border-t border-white/10">
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Network Status</span>
                  <span className="text-amber-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" /> PENDING APPROVAL
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => { resetRegistration(); navigate('/dashboard'); }}
              className="w-full py-5 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 hover:shadow-2xl hover:shadow-emerald-500/30 transition-all shadow-lg"
            >
              Access Command Center
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
