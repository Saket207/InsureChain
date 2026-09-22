import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyACW3-A60Y0Rzox__XEBwgGcSFKMzzpfDE",
  authDomain: "insurechain-2d763.firebaseapp.com",
  databaseURL: "https://insurechain-2d763-default-rtdb.firebaseio.com",
  projectId: "insurechain-2d763",
  storageBucket: "insurechain-2d763.firebasestorage.app",
  messagingSenderId: "463548601595",
  appId: "1:463548601595:web:89534ba8a877b3f1520c5e",
  measurementId: "G-6BXY5VM6Q9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const SEED_POLICIES = [
  {
    id: "IC-2026-MH-7041",
    policyId: "IC-2026-MH-7041",
    farmerUid: "5rHSSnxZIchrHucMt2JHM1Gkgyh2", // Alice
    farmerName: "Alice",
    fullName: "Alice",
    walletAddress: "0xa129f55a5919ef322cc5c16ecda1455f552aa936",
    state: "Maharashtra",
    district: "Nagpur",
    season: "Kharif",
    cropType: "Cotton",
    premiumINR: 2400,
    premiumETH: 0.0012,
    coverageINR: 120000,
    coverageAmount: 120000,
    status: "Active",
    triggersSelected: ["Drought", "Excessive Heat"],
    createdAt: new Date()
  },
  {
    id: "IC-2026-MH-8219",
    policyId: "IC-2026-MH-8219",
    farmerUid: "5rHSSnxZIchrHucMt2JHM1Gkgyh2", // Alice
    farmerName: "Alice",
    fullName: "Alice",
    walletAddress: "0xa129f55a5919ef322cc5c16ecda1455f552aa936",
    state: "Maharashtra",
    district: "Amravati",
    season: "Rabi",
    cropType: "Wheat",
    premiumINR: 3200,
    premiumETH: 0.0016,
    coverageINR: 160000,
    coverageAmount: 160000,
    status: "Pending",
    triggersSelected: ["Frost", "Hailstorm"],
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
  },
  {
    id: "IC-2026-KL-1052",
    policyId: "IC-2026-KL-1052",
    farmerUid: "vYz29ZYgeyS1AHchvT7GaW2Loqp2", // Bob
    farmerName: "Bob",
    fullName: "Bob",
    walletAddress: "0xa129f55a5919ef322cc5c16ecda1455f552aa936",
    state: "Kerala",
    district: "Thiruvananthapuram",
    season: "Kharif",
    cropType: "Rice",
    premiumINR: 4000,
    premiumETH: 0.002,
    coverageINR: 200000,
    coverageAmount: 200000,
    status: "PaidOut",
    triggersSelected: ["Flood", "Excess Rainfall"],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
  }
];

async function main() {
  console.log("Seeding policies collection in Firestore...");
  for (const policy of SEED_POLICIES) {
    const docRef = doc(db, "policies", policy.id);
    await setDoc(docRef, {
      ...policy,
      createdAt: serverTimestamp()
    });
    console.log(`Seeded policy ${policy.policyId} for ${policy.farmerName}`);
  }
  console.log("Seeding completed successfully!");
}

main();
