import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  serverTimestamp,
  writeBatch,
  limit,
  deleteDoc,
  increment,
} from 'firebase/firestore';
import { db } from '../config/firebase';

// ── Farmer Profiles ──

export const createFarmerProfile = async (uid, profileData) => {
  const farmerRef = doc(db, 'farmers', uid);
  await setDoc(farmerRef, {
    uid,
    ...profileData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const getFarmerProfile = async (uid) => {
  const farmerRef = doc(db, 'farmers', uid);
  const snap = await getDoc(farmerRef);
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() };
  }
  return null;
};

export const getAllFarmers = async () => {
  const q = query(collection(db, 'farmers'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updateFarmerProfile = async (uid, updates) => {
  const farmerRef = doc(db, 'farmers', uid);
  await setDoc(farmerRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  }, { merge: true });
};

export const updateWalletAddress = async (uid, walletAddress) => {
  const farmerRef = doc(db, 'farmers', uid);
  await setDoc(farmerRef, {
    walletAddress,
    updatedAt: serverTimestamp(),
  }, { merge: true });
};

export const deleteFarmerProfile = async (uid) => {
  const farmerRef = doc(db, 'farmers', uid);
  await deleteDoc(farmerRef);
};

// ── Policies ──

// Utility to generate a meaningful Policy ID like IC-2026-MH-0042
const generatePolicyId = (state = 'MH') => {
  const year = new Date().getFullYear();
  // Map full state names to 2-letter codes
  const stateCode = (() => {
    const map = {
      'Maharashtra': 'MH', 'Rajasthan': 'RJ', 'Punjab': 'PB', 'Gujarat': 'GJ',
      'Uttar Pradesh': 'UP', 'Madhya Pradesh': 'MP', 'Karnataka': 'KA',
      'Tamil Nadu': 'TN', 'Andhra Pradesh': 'AP', 'Telangana': 'TS',
      'Haryana': 'HR', 'Bihar': 'BR', 'West Bengal': 'WB', 'Odisha': 'OD',
    };
    return map[state] || (state ? state.slice(0, 2).toUpperCase() : 'MH');
  })();
  const serial = String(Math.floor(1000 + Math.random() * 9000)); // 4-digit
  return `IC-${year}-${stateCode}-${serial}`;
};

export const createPolicy = async (policyData) => {
  const policyId = generatePolicyId(policyData.state);
  const policiesRef = collection(db, 'policies');
  const newPolicyData = {
    policyId,
    ...policyData,
    status: 'Active',
    createdAt: serverTimestamp(),
  };
  const docRef = await addDoc(policiesRef, newPolicyData);
  return { id: docRef.id, ...newPolicyData };
};

export const getPoliciesByFarmer = async (farmerUid, farmerName = '') => {
  try {
    const q = query(collection(db, 'policies'));
    const snap = await getDocs(q);
    const allPolicies = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    
    // Filter client-side to handle manual Firebase console entries where users might have typed the name instead of UID
    return allPolicies.filter(p => 
      p.farmerUid === farmerUid || 
      (farmerName && p.farmerName?.toLowerCase() === farmerName.toLowerCase()) ||
      (farmerName && p.farmerUid?.toLowerCase() === farmerName.toLowerCase())
    );
  } catch (e) {
    console.error("Error fetching policies:", e);
    return [];
  }
};

export const getPolicyById = async (id) => {
  // 1. Try to fetch as Document ID
  const docRef = doc(db, 'policies', id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }

  // 2. Try to fetch as Policy ID (INS-XXX)
  const q = query(collection(db, 'policies'), where('policyId', '==', id));
  const snap = await getDocs(q);
  if (!snap.empty) {
    const snapDoc = snap.docs[0];
    return { id: snapDoc.id, ...snapDoc.data() };
  }
  return null;
};

export const updatePolicyStatus = async (docId, status, txHash = null) => {
  const policyRef = doc(db, 'policies', docId);
  const updates = { status, updatedAt: serverTimestamp() };
  if (txHash) updates.txHash = txHash;
  await updateDoc(policyRef, updates);
};

// ── Alerts ──

export const getAlertsByFarmer = async (farmerUid) => {
  const q = query(
    collection(db, 'alerts'),
    where('farmerUid', '==', farmerUid),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const markAlertAsRead = async (alertId) => {
  const alertRef = doc(db, 'alerts', alertId);
  await updateDoc(alertRef, {
    isRead: true,
  });
};

// ── District Risk Scores ──

export const getDistrictRiskScores = async () => {
  const q = query(collection(db, 'districtRiskScores'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getDistrictRiskScore = async (districtSlug) => {
  const docRef = doc(db, 'districtRiskScores', districtSlug.toLowerCase());
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() };
  }
  return null;
};

export const seedDistrictRiskScores = async () => {
  const districts = [
    { district: 'Nagpur', lat: 21.1458, lon: 79.0882, riskScore: 72, riskLevel: 'High', droughtRisk: 65, floodRisk: 20, heatwaveRisk: 80, frostRisk: 5, ndvi: 0.42, activePoliciesCount: 145 },
    { district: 'Amravati', lat: 20.9320, lon: 77.7523, riskScore: 65, riskLevel: 'High', droughtRisk: 70, floodRisk: 15, heatwaveRisk: 75, frostRisk: 5, ndvi: 0.48, activePoliciesCount: 89 },
    { district: 'Wardha', lat: 20.7453, lon: 78.6022, riskScore: 58, riskLevel: 'Moderate', droughtRisk: 60, floodRisk: 10, heatwaveRisk: 70, frostRisk: 5, ndvi: 0.55, activePoliciesCount: 67 },
    { district: 'Yavatmal', lat: 20.3888, lon: 78.1204, riskScore: 81, riskLevel: 'Critical', droughtRisk: 85, floodRisk: 10, heatwaveRisk: 80, frostRisk: 5, ndvi: 0.35, activePoliciesCount: 210 },
    { district: 'Akola', lat: 20.7059, lon: 77.0086, riskScore: 68, riskLevel: 'High', droughtRisk: 75, floodRisk: 15, heatwaveRisk: 85, frostRisk: 5, ndvi: 0.45, activePoliciesCount: 112 },
    { district: 'Buldhana', lat: 20.5312, lon: 76.1805, riskScore: 62, riskLevel: 'High', droughtRisk: 65, floodRisk: 10, heatwaveRisk: 75, frostRisk: 5, ndvi: 0.51, activePoliciesCount: 94 },
    { district: 'Washim', lat: 20.1130, lon: 77.1293, riskScore: 55, riskLevel: 'Moderate', droughtRisk: 55, floodRisk: 10, heatwaveRisk: 65, frostRisk: 5, ndvi: 0.60, activePoliciesCount: 56 },
  ];

  const batch = writeBatch(db);

  districts.forEach((d) => {
    const slug = d.district.toLowerCase();
    const docRef = doc(db, 'districtRiskScores', slug);
    batch.set(docRef, {
      ...d,
      lastUpdated: serverTimestamp(),
    });
  });

  await batch.commit();
};

// ── Farmer Directory (for Login dropdown) ──

export const listAllFarmers = async () => {
  try {
    const snap = await getDocs(collection(db, 'farmers'));
    return snap.docs.map((d) => ({
      uid: d.id,
      id: d.id, // add id for AuthContext dropdown compatibility
      name: d.data().fullName || d.data().name || 'Unknown Farmer',
      fullName: d.data().fullName || d.data().name || 'Unknown Farmer',
      email: d.data().email || '',
      mobile: d.data().mobile || '',
      district: d.data().district || d.data().districtId || '',
      state: d.data().state || 'Maharashtra',
      role: d.data().role || 'farmer',
    }));
  } catch (e) {
    console.error('Error listing farmers:', e);
    return [];
  }
};

// ── Admin Functions ──

export const getPendingPolicies = async () => {
  try {
    const q = query(collection(db, 'policies'), where('status', '==', 'Pending'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error('Error getting pending policies:', e);
    return [];
  }
};

export const getAllAdminPolicies = async () => {
  try {
    const snap = await getDocs(collection(db, 'policies'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error('Error getting all admin policies:', e);
    return [];
  }
};

export const logAdminAction = async (adminUid, actionType, policyId, details) => {
  try {
    const logsRef = collection(db, 'adminLogs');
    await addDoc(logsRef, {
      adminUid,
      action: actionType,
      policyId,
      details,
      timestamp: serverTimestamp(),
    });
  } catch (e) {
    console.error('Error logging admin action:', e);
  }
};

export const getAdminLogs = async () => {
  try {
    const q = query(collection(db, 'adminLogs'), orderBy('timestamp', 'desc'), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error('Error getting admin logs:', e);
    return [];
  }
};

// ── DAO Governance ──

const DEFAULT_PROPOSALS = [
  {
    id: 'PROP-001',
    title: 'Increase Base Rate from ₹500 to ₹600',
    description: 'Adjust the base premium rate to account for increased climate volatility across Vidarbha region. This change will affect all new policies registered after the vote concludes.',
    category: 'Premium',
    status: 'active',
    votesFor: 12,
    votesAgainst: 4,
    totalVoters: 16,
    createdAt: new Date('2026-05-15'),
    endsAt: new Date('2026-06-15'),
    proposedBy: 'InsureChain Core Team',
    impact: 'high',
  },
  {
    id: 'PROP-002',
    title: 'Onboard Marathwada Districts',
    description: 'Expand InsureChain coverage to Aurangabad, Latur, Osmanabad, and Beed districts in the Marathwada region. This will add 4 new district nodes to the oracle monitoring network.',
    category: 'Expansion',
    status: 'active',
    votesFor: 21,
    votesAgainst: 2,
    totalVoters: 23,
    createdAt: new Date('2026-05-18'),
    endsAt: new Date('2026-06-18'),
    proposedBy: 'Community Request',
    impact: 'medium',
  },
  {
    id: 'PROP-003',
    title: 'Lower Drought Threshold to 35%',
    description: 'Reduce the drought trigger threshold from 40% to 35% of normal rainfall deficit. This means payouts will activate sooner when drought conditions begin, protecting more farmers.',
    category: 'Parameters',
    status: 'active',
    votesFor: 8,
    votesAgainst: 6,
    totalVoters: 14,
    createdAt: new Date('2026-05-20'),
    endsAt: new Date('2026-06-20'),
    proposedBy: 'ML Risk Committee',
    impact: 'high',
  },
  {
    id: 'PROP-004',
    title: 'Increase Oracle Update Frequency to 6 Hours',
    description: 'Change the Chainlink oracle polling interval from every 24 hours to every 6 hours. This provides faster detection of weather anomalies but increases gas costs by ~4x.',
    category: 'Oracle',
    status: 'active',
    votesFor: 15,
    votesAgainst: 9,
    totalVoters: 24,
    createdAt: new Date('2026-05-10'),
    endsAt: new Date('2026-06-10'),
    proposedBy: 'Chainlink Node Ops',
    impact: 'high',
  },
  {
    id: 'PROP-005',
    title: 'Cap Maximum Payout at ₹2,00,000',
    description: 'Introduce a ceiling of ₹2 Lakh on individual policy payouts to maintain the sustainability of the PayoutVault liquidity pool across extreme multi-district disaster scenarios.',
    category: 'Payout',
    status: 'active',
    votesFor: 5,
    votesAgainst: 18,
    totalVoters: 23,
    createdAt: new Date('2026-05-12'),
    endsAt: new Date('2026-06-12'),
    proposedBy: 'Risk Underwriting DAO',
    impact: 'critical',
  },
  {
    id: 'PROP-006',
    title: 'Introduce Kharif Season Premium Subsidy',
    description: 'Offer a 15% premium discount for policies registered during the Kharif season (June–October) to incentivize early adoption and increase farmer onboarding during the monsoon window.',
    category: 'Premium',
    status: 'active',
    votesFor: 30,
    votesAgainst: 3,
    totalVoters: 33,
    createdAt: new Date('2026-05-08'),
    endsAt: new Date('2026-06-08'),
    proposedBy: 'Farmer Cooperative Union',
    impact: 'medium',
  },
  {
    id: 'PROP-007',
    title: 'Add NDVI Satellite Threshold as Trigger',
    description: 'Enable NDVI vegetation health index (from Copernicus satellite) as an independent payout trigger. If NDVI drops below 0.25 for 14 consecutive days, trigger an automatic payout regardless of rainfall data.',
    category: 'Parameters',
    status: 'active',
    votesFor: 19,
    votesAgainst: 7,
    totalVoters: 26,
    createdAt: new Date('2026-05-06'),
    endsAt: new Date('2026-06-06'),
    proposedBy: 'Satellite Data Working Group',
    impact: 'critical',
  },
];

/**
 * Seeds the default governance proposals into Firestore if they don't already exist.
 */
export const seedGovernanceProposals = async () => {
  try {
    for (const proposal of DEFAULT_PROPOSALS) {
      const docRef = doc(db, 'governance_proposals', proposal.id);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        await setDoc(docRef, {
          ...proposal,
          createdAt: serverTimestamp(),
        });
      }
    }
  } catch (e) {
    console.error('Error seeding governance proposals:', e);
  }
};

/**
 * Fetches all governance proposals from Firestore.
 */
export const getGovernanceProposals = async () => {
  try {
    const snap = await getDocs(collection(db, 'governance_proposals'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error('Error fetching governance proposals:', e);
    return [];
  }
};

/**
 * Casts a vote on a governance proposal. Prevents duplicate votes per user.
 * @param {string} proposalId - The proposal document ID (e.g. 'PROP-001')
 * @param {string} oderId - The voter's UID
 * @param {'for'|'against'} voteType - The vote direction
 * @returns {{ success: boolean, alreadyVoted?: boolean, message?: string }}
 */
export const castGovernanceVote = async (proposalId, oderId, voteType) => {
  try {
    // Check if user already voted on this proposal
    const voteRef = doc(db, 'governance_votes', `${proposalId}_${oderId}`);
    const existingVote = await getDoc(voteRef);

    if (existingVote.exists()) {
      return { success: false, alreadyVoted: true, message: 'You have already voted on this proposal.' };
    }

    // Record the vote
    await setDoc(voteRef, {
      proposalId,
      oderId,
      voteType,
      votedAt: serverTimestamp(),
    });

    // Update the proposal counters atomically
    const proposalRef = doc(db, 'governance_proposals', proposalId);
    const fieldToIncrement = voteType === 'for' ? 'votesFor' : 'votesAgainst';
    await updateDoc(proposalRef, {
      [fieldToIncrement]: increment(1),
      totalVoters: increment(1),
    });

    return { success: true, message: `Vote "${voteType}" recorded successfully.` };
  } catch (e) {
    console.error('Error casting governance vote:', e);
    return { success: false, message: e.message };
  }
};

/**
 * Gets all votes cast by a specific user so the UI can show which proposals they've already voted on.
 * @param {string} oderId - The voter's UID
 * @returns {Object} - Map of proposalId -> voteType
 */
export const getUserGovernanceVotes = async (oderId) => {
  try {
    const q = query(collection(db, 'governance_votes'), where('oderId', '==', oderId));
    const snap = await getDocs(q);
    const votes = {};
    snap.docs.forEach((d) => {
      const data = d.data();
      votes[data.proposalId] = data.voteType;
    });
    return votes;
  } catch (e) {
    console.error('Error fetching user governance votes:', e);
    return {};
  }
};
