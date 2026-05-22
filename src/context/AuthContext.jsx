/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, deleteUser } from 'firebase/auth';
import { auth } from '../config/firebase';
import { getFarmerProfile, deleteFarmerProfile } from '../services/firestoreService';
import { useAuthStore } from '../stores/authStore';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [farmerProfile, setFarmerProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sync with Zustand store for backward compatibility during transition
  const setZustandAuth = useAuthStore((s) => s.login);
  const clearZustandAuth = useAuthStore((s) => s.logout);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          // Fetch farmer profile from Firestore
          const profile = await getFarmerProfile(user.uid);
          setFarmerProfile(profile);
          
          // Sync with Zustand store if profile exists
          if (profile) {
            setZustandAuth(profile);
          } else {
            setZustandAuth({
              uid: user.uid,
              mobile: user.phoneNumber,
              email: user.email,
            });
          }
        } catch (err) {
          console.error("Firebase offline or error fetching profile. Using fallback profile.", err);
          const fallbackProfile = { name: "Demo Farmer", mobile: "+91 9876543210", districtId: "nagpur" };
          setFarmerProfile(fallbackProfile);
          setZustandAuth({ uid: user.uid, ...fallbackProfile });
        }
      } else {
        // Prevent clearing if using mock mode
        if (currentUser?.uid !== 'mock-user-123') {
          setCurrentUser(null);
          setFarmerProfile(null);
          clearZustandAuth();
        }
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [setZustandAuth, clearZustandAuth]);

  const logout = () => {
    if (currentUser?.uid === 'mock-user-123') {
      setCurrentUser(null);
      setFarmerProfile(null);
      clearZustandAuth();
      return Promise.resolve();
    }
    return signOut(auth);
  };

  const mockLogin = async (uid) => {
    let mockUser;
    let mockProfile;
    
    if (uid === 'admin') {
      mockUser = { uid: 'admin-123', phoneNumber: '+910000000000' };
      mockProfile = { name: 'Government Admin', mobile: '+91 0000000000', districtId: 'all', role: 'admin' };
    } else {
      const actualUid = uid || 'mock-user-123';
      mockUser = { uid: actualUid, phoneNumber: '+919999999999' };
      
      try {
        const realProfile = await getFarmerProfile(actualUid);
        if (realProfile) {
          mockProfile = realProfile;
        } else {
          mockProfile = { name: 'Ramesh Patil (Demo)', mobile: '+91 9999999999', districtId: 'nagpur', role: 'farmer' };
        }
      } catch (e) {
        mockProfile = { name: 'Ramesh Patil (Demo)', mobile: '+91 9999999999', districtId: 'nagpur', role: 'farmer' };
      }
    }
    
    setCurrentUser(mockUser);
    setFarmerProfile(mockProfile);
    setZustandAuth({ uid: mockUser.uid, ...mockProfile });
    setLoading(false);
  };

  const deleteAccount = async () => {
    if (currentUser && currentUser.uid !== 'mock-user-123') {
      try {
        // HACKATHON FIX: Use the Python backend to forcefully delete the user
        try {
          const resp = await fetch(`http://127.0.0.1:5000/api/delete-farmer/${currentUser.uid}`, {
            method: 'DELETE',
            headers: {
              'Authorization': 'Bearer insurechain-api-key-2026'
            }
          });
          if (!resp.ok) {
             console.warn("Backend deletion returned non-OK status");
          }
        } catch (apiErr) {
          console.warn("Backend deletion failed, falling back to client-side:", apiErr);
          try {
             await deleteFarmerProfile(currentUser.uid);
          } catch (dbErr) {
             console.warn("Client-side db deletion failed, ignoring:", dbErr);
          }
        }
        
        // Try to delete local auth session if possible
        if (typeof currentUser.getIdToken === 'function') {
          try {
            await deleteUser(currentUser);
          } catch (authErr) {
            console.warn("Firebase Auth deletion failed locally, ignored:", authErr);
          }
        }
        
        setCurrentUser(null);
        setFarmerProfile(null);
        clearZustandAuth();
      } catch (e) {
        console.error("Failed to execute delete workflow, but ignoring for demo:", e);
        setCurrentUser(null);
        setFarmerProfile(null);
        clearZustandAuth();
      }
    }
  };

  const value = {
    currentUser,
    farmerProfile,
    loading,
    logout,
    deleteAccount,
    setFarmerProfile,
    mockLogin,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
