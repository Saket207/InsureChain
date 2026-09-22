import { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  FileText,
  Map,
  Bell,
  Vote,
  Settings,
  Menu,
  X,
  Shield,
  ChevronLeft,
  ChevronDown,
  Leaf,
  LogOut,
  User,
} from 'lucide-react';
import WalletButton from '../components/WalletButton';
import { useAuth } from '../context/AuthContext';
import { useWalletStore } from '../stores/walletStore';
import { useAlertStore } from '../stores/alertStore';
import { truncateAddress } from '../utils/helpers';
import { useWallet } from '../hooks/useWallet';
import { getAllFarmers } from '../services/firestoreService';

import { listAllFarmers } from '../services/firestoreService';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/profile', icon: User, label: 'My Profile' },
  { to: '/register-policy', icon: FileText, label: 'My Policies' },
  { to: '/heatmap', icon: Map, label: 'Risk Map' },
  { to: '/admin', icon: Shield, label: 'Gov Dashboard' },
  { to: '/alerts', icon: Bell, label: 'Alerts' },
  { to: '/governance', icon: Vote, label: 'Governance' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/profile': 'Personal Profile',
  '/register-policy': 'Register Policy',
  '/heatmap': 'Risk Heatmap',
  '/admin': 'Government Dashboard',
  '/alerts': 'Alerts & Notifications',
  '/governance': 'DAO Governance',
  '/settings': 'Settings',
};

export default function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { farmerProfile, mockLogin, logout } = useAuth();
  const { isConnected, address, networkName } = useWalletStore();
  const { disconnect } = useWallet();
  const unreadCount = useAlertStore((s) => s.unreadCount);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [farmers, setFarmers] = useState([]);
  const dropdownRef = useRef(null);

  useEffect(() => {
    // Fetch farmers for the profile switcher
    const fetchFarmers = async () => {
      try {
        const fetchedFarmers = await listAllFarmers();
        setFarmers(fetchedFarmers);
      } catch (error) {
        console.error("Error fetching farmers:", error);
      }
    };
    fetchFarmers();
  }, []);

  useEffect(() => {
    // Click outside to close dropdown
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const pageTitle = pageTitles[location.pathname] || 'InsureChain';
  
  const userName = farmerProfile?.name || farmerProfile?.fullName || (farmerProfile?.email ? farmerProfile.email.split('@')[0].charAt(0).toUpperCase() + farmerProfile.email.split('@')[0].slice(1) : 'Farmer');
  const userInitials = userName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="flex h-screen bg-bg-app overflow-hidden">
      {/* ═══ Desktop Sidebar ═══ */}
      <aside
        className={`hidden lg:flex flex-col text-white transition-all duration-500 ease-in-out relative z-50 overflow-hidden
          ${sidebarCollapsed ? 'w-24' : 'w-72'}`}
        style={{
          background: 'linear-gradient(180deg, #0f172a 0%, #0c1220 50%, #0a0f1a 100%)',
        }}
      >
        {/* Subtle animated background pattern */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundSize: '24px 24px',
            backgroundImage: 'radial-gradient(circle, #10b981 1px, transparent 1px)',
          }}
        />

        {/* Logo Section */}
        <div className={`relative z-10 flex items-center gap-4 px-8 py-10 ${sidebarCollapsed ? 'justify-center px-4' : ''}`}>
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center sidebar-logo-glow">
            <Leaf className="w-6 h-6 text-white" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col">
              <span className="text-xl font-extrabold font-heading tracking-tight leading-none text-white">InsureChain</span>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.2em] mt-1">Blockchain Core</span>
            </div>
          )}
        </div>

        {/* Shimmer Divider */}
        <div className="px-6 relative z-10">
          <div className="sidebar-divider" />
        </div>

        {/* Nav Section Label */}
        {!sidebarCollapsed && (
          <div className="px-8 pt-6 pb-2 relative z-10">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Main Menu</p>
          </div>
        )}

        {/* Nav Links */}
        <nav className="flex-1 px-4 space-y-1.5 mt-2 overflow-y-auto custom-scrollbar relative z-10">
          {navItems.filter(item => item.to !== '/admin' || farmerProfile?.role === 'admin').map((item, index) => (
            <motion.div
              key={item.to}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05, ease: 'easeOut' }}
            >
              <NavLink
                to={item.to}
                id={item.to === '/register-policy' ? 'walkthrough-register-link' : undefined}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'} 
                  ${sidebarCollapsed ? 'justify-center px-0' : ''}`
                }
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && (
                  <span className="tracking-tight">{item.label}</span>
                )}
                {item.label === 'Alerts' && unreadCount > 0 && (
                  <span className={`ml-auto bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center
                    ${sidebarCollapsed ? 'absolute top-2 right-2 w-4 h-4' : 'w-5 h-5'}`}>
                    {unreadCount}
                  </span>
                )}
              </NavLink>
            </motion.div>
          ))}
        </nav>

        {/* Shimmer Divider */}
        <div className="px-6 relative z-10">
          <div className="sidebar-divider" />
        </div>

        {/* Footer Info */}
        <div className={`p-6 mt-auto relative z-10 ${sidebarCollapsed ? 'px-4' : ''}`}>
          <div className="rounded-2xl p-4 border border-white/10 transition-all duration-300 hover:border-emerald-500/30"
            style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(255,255,255,0.03))' }}
          >
            {isConnected ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-xs font-bold text-white shadow-md shadow-emerald-500/20">
                    {userInitials}
                  </div>
                  {!sidebarCollapsed && (
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-xs font-bold text-white truncate">{userName}</span>
                      <span className="text-[10px] text-emerald-400/80 font-mono flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-emerald inline-block" />
                        {truncateAddress(address)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className={sidebarCollapsed ? 'flex justify-center' : ''}>
                <WalletButton compact={sidebarCollapsed} />
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ═══ Main Content Area ═══ */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 lg:px-10 flex-shrink-0 z-40">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-3 rounded-2xl bg-slate-50 border border-slate-200"
            >
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
            <div className="flex flex-col">
              <h1 className="text-xl font-extrabold font-heading tracking-tight text-slate-900 leading-none">{pageTitle}</h1>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1.5">{isConnected ? `Network: ${networkName}` : 'WALLET DISCONNECTED'}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center bg-[#fcf8f2] p-1 rounded-2xl border border-[#eadaa6]/60 shadow-sm">
              <NavLink to="/alerts" className="p-2 rounded-xl hover:bg-white hover:shadow-sm transition-all relative group flex items-center justify-center">
                <Bell className="w-4 h-4 text-[#8c7438] group-hover:text-amber-600 transition-colors" />
                {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-amber-600 rounded-full animate-pulse" />}
              </NavLink>
              <NavLink to="/settings" className="p-2 rounded-xl hover:bg-white hover:shadow-sm transition-all group flex items-center justify-center">
                <Settings className="w-4 h-4 text-[#8c7438] group-hover:text-amber-600 transition-colors" />
              </NavLink>
            </div>
            
            <div className="h-10 w-px bg-slate-200 mx-1.5 hidden sm:block" />
            
            <div className="flex items-center gap-3 pl-2 relative" ref={dropdownRef}>
              <div 
                className="flex items-center gap-3.5 cursor-pointer group"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <div className="hidden md:flex flex-col items-end text-right">
                  <span className="text-sm font-black text-slate-900 leading-none group-hover:text-amber-600 transition-colors">{userName}</span>
                  <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mt-1 flex items-center gap-1.5">
                    {farmerProfile?.role === 'admin' ? 'VERIFIED ADMIN' : 'VERIFIED SENIOR FARMER'}
                    <svg className="w-3 h-3 text-[#c2ad6f]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round" />
                    </svg>
                  </span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Agriculture Technology Platform</span>
                </div>
                <div className="w-10 h-10 rounded-full bg-emerald-600 border border-emerald-500/30 flex items-center justify-center text-sm font-black text-white shadow-md shadow-emerald-600/10 group-hover:scale-105 transition-all">
                  {userInitials}
                </div>
              </div>

              {/* Profile Dropdown */}
              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-[120%] right-0 w-64 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden z-50 flex flex-col"
                  >
                    <div className="p-4 bg-slate-50 border-b border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Switch Account</p>
                      <div className="space-y-1 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                        {farmers.filter(f => f.id !== 'admin' && (f.email || f.name)).map((farmer) => (
                          <button
                            key={farmer.id}
                            onClick={() => {
                              if (mockLogin) {
                                mockLogin(farmer.id);
                              }
                              setDropdownOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition-colors ${
                              farmerProfile?.uid === farmer.id 
                                ? 'bg-emerald-50 text-emerald-700' 
                                : 'hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                              farmerProfile?.uid === farmer.id ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
                            }`}>
                              {(farmer.name || farmer.fullName || farmer.email || 'U').substring(0, 2).toUpperCase()}
                            </div>
                            <div className="flex flex-col overflow-hidden">
                              <span className="text-sm font-bold truncate">{farmer.name || farmer.fullName || farmer.email || 'Unknown'}</span>
                              <span className="text-[10px] opacity-70 truncate uppercase">{farmer.role || 'farmer'}</span>
                            </div>
                          </button>
                        ))}
                        {/* Admin Panel Access */}
                        <button
                          onClick={() => {
                            if (mockLogin) {
                              mockLogin('admin');
                            }
                            setDropdownOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition-colors mt-1 border-t border-slate-100 pt-2 ${
                            farmerProfile?.role === 'admin'
                              ? 'bg-amber-50 text-amber-700'
                              : 'hover:bg-amber-50/50 text-slate-700'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 bg-gradient-to-br from-amber-400 to-amber-600 text-white">
                            <Shield className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col overflow-hidden">
                            <span className="text-sm font-bold truncate">Admin Panel</span>
                            <span className="text-[10px] opacity-70 truncate uppercase">Government</span>
                          </div>
                        </button>
                      </div>
                    </div>
                    
                    <div className="p-2 space-y-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 p-3 rounded-xl text-left text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span className="text-sm font-bold">Logout</span>
                      </button>
                      <button
                        onClick={async () => {
                           if (window.confirm("Are you sure you want to permanently delete your account and all data? This cannot be undone.")) {
                             try {
                               if(deleteAccount) await deleteAccount();
                               navigate('/login');
                             } catch (e) {
                               alert("Failed to delete account. Please try logging out and logging back in, then trying again.");
                             }
                           }
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl text-left text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                        <span className="text-sm font-bold">Delete Account</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page content with scroll */}
        <main className="flex-1 overflow-y-auto bg-bg-app bg-grid custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="p-8 lg:p-12 max-w-[1400px] mx-auto"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
