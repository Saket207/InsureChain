import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Leaf, Mail, ArrowRight, Loader2, Lock } from 'lucide-react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { getFarmerProfile, createFarmerProfile } from '../services/firestoreService';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [authMode, setAuthMode] = useState('login'); // 'login', 'register'
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const { currentUser, mockLogin } = useAuth();

  const checkRoleAndRedirect = async (uid) => {
    try {
      setLoading(true);
      const profile = await getFarmerProfile(uid);
      if (profile && profile.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch profile.');
      setLoading(false);
    }
  };

  useEffect(() => {
    // If already logged in natively, redirect based on role
    if (currentUser && currentUser.uid !== 'mock-user-123' && !loading) {
      checkRoleAndRedirect(currentUser.uid);
    }
  }, [currentUser, loading]);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    if (authMode === 'register' && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    
    try {
      setLoading(true);
      if (authMode === 'login') {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        await checkRoleAndRedirect(userCredential.user.uid);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Create initial farmer profile, stripped of personal details
        await createFarmerProfile(userCredential.user.uid, {
          email,
          role: 'farmer'
        });
        
        // HACKATHON FIX: Trigger Welcome Email
        try {
          await fetch('http://127.0.0.1:5000/api/send-welcome-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer insurechain-api-key-2026'
            },
            body: JSON.stringify({ email })
          });
          console.log("Welcome email sent!");
        } catch (e) {
          console.error("Welcome email trigger failed silently", e);
        }
        
        navigate('/dashboard'); // First time users go to dashboard to see the banner
      }
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError("Email already in use. Try logging in.");
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        // HACKATHON FALLBACK: If Auth fails, check if the email exists in Firestore
        try {
          const { collection, query, where, getDocs } = await import('firebase/firestore');
          const { db } = await import('../config/firebase');
          const q = query(collection(db, 'farmers'), where('email', '==', email.toLowerCase()));
          const snap = await getDocs(q);
          
          if (!snap.empty) {
            console.log("Fallback: Found user in Firestore, bypassing Firebase Auth!");
            const farmerDoc = snap.docs[0];
            await mockLogin(farmerDoc.id);
            navigate('/dashboard');
            return;
          }
        } catch (dbErr) {
          console.error("Fallback DB check failed:", dbErr);
        }
        
        setError("Invalid email or password.");
      } else {
        setError(`Error: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAdminDemoLogin = async () => {
    setLoading(true);
    setError('');
    const adminEmail = 'admin@insurechain.com';
    const adminPass = 'admin123';
    
    try {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPass);
        await checkRoleAndRedirect(userCredential.user.uid);
      } catch (e) {
        if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
          // Create admin if not exists
          const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPass);
          await createFarmerProfile(userCredential.user.uid, {
            email: adminEmail,
            role: 'admin',
            name: 'Government Admin',
            districtId: 'all'
          });
          navigate('/admin');
        } else {
          throw e;
        }
      }
    } catch (err) {
      console.error("Admin login error:", err);
      setError("Failed to login as admin: " + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-20 right-20 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="absolute bottom-20 left-20 w-96 h-96 rounded-full bg-slate-300/20 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-emerald-500/30">
            <Leaf className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading">Welcome to InsureChain</h1>
          <p className="text-slate-500 text-sm mt-1">Secure your harvest with blockchain insurance</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100">
          
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 text-rose-600 text-sm font-medium border border-rose-100 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-5">
            
            {/* Toggle Register / Login */}
            <div className="flex justify-center mb-4">
              <div className="inline-flex bg-slate-100 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => { setAuthMode('login'); setError(''); }}
                  className={`px-6 py-2 text-xs font-black uppercase tracking-widest rounded-md transition-colors ${authMode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode('register'); setError(''); }}
                  className={`px-6 py-2 text-xs font-black uppercase tracking-widest rounded-md transition-colors ${authMode === 'register' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Create Account
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="farmer@example.com"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                  disabled={loading}
                />
              </div>
            </div>

            {authMode === 'register' && (
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={!email || !password || loading || (authMode === 'register' && !confirmPassword)}
              className="w-full py-4 rounded-xl bg-emerald-600 text-white font-black uppercase tracking-widest text-xs hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2 shadow-lg shadow-emerald-500/20"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <>{authMode === 'login' ? 'Sign In Securely' : 'Create Account'} <ArrowRight className="w-4 h-4" /></>
              )}
            </motion.button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={handleAdminDemoLogin}
              disabled={loading}
              className="text-xs font-bold text-slate-400 hover:text-emerald-600 transition-colors underline underline-offset-4"
            >
              Government Admin Demo Access
            </button>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
