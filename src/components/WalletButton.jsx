import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Copy, ExternalLink, LogOut, ChevronDown, Check, AlertCircle } from 'lucide-react';
import { useWalletStore } from '../stores/walletStore';
import { useWallet } from '../hooks/useWallet';
import { truncateAddress } from '../utils/helpers';

export default function WalletButton({ compact = false }) {
  const { isConnected, address, networkName, balance } = useWalletStore();
  const { connect, disconnect, switchNetwork, isSepolia, isLocalhost } = useWallet();
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isConnected) {
    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={connect}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm
                   hover:bg-primary-light transition-colors shadow-sm"
      >
        <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="MetaMask" className="w-5 h-5" />
        {!compact && 'Connect Wallet'}
      </motion.button>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors
                   dark:bg-gray-700 dark:hover:bg-gray-600"
      >
        <span className={`w-2 h-2 rounded-full animate-pulse-dot ${(isSepolia || isLocalhost) ? 'bg-accent' : 'bg-red-500'}`} />
        <span className="text-sm font-medium text-text-primary dark:text-white">
          {truncateAddress(address)}
        </span>
        <ChevronDown className={`w-4 h-4 text-text-tertiary transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
      </motion.button>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50
                       dark:bg-gray-800 dark:border-gray-700"
          >
            {/* Balance */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 text-center">
              <p className="text-xs text-text-tertiary dark:text-gray-500 mb-1">Balance</p>
              <p className="text-xl font-bold font-[family-name:var(--font-heading)] text-primary dark:text-white">
                {balance ? `${balance} ETH` : '...'}
              </p>
            </div>

            {/* Network */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <p className="text-xs text-text-tertiary dark:text-gray-500 mb-2">Network</p>
              {isSepolia ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg dark:bg-emerald-500/10 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold">Sepolia Testnet</span>
                </div>
              ) : isLocalhost ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg dark:bg-blue-500/10 dark:text-blue-400">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-xs font-semibold">Localhost 8545</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg dark:bg-red-500/10 dark:text-red-400">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold">Wrong Network</span>
                  </div>
                  <button
                    onClick={switchNetwork}
                    className="w-full py-1.5 text-xs font-medium bg-gray-100 text-text-primary rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                  >
                    Switch to Sepolia
                  </button>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-1.5">
              <button
                onClick={handleCopy}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-secondary hover:bg-gray-50 transition-colors
                           dark:text-gray-300 dark:hover:bg-gray-700"
              >
                {copied ? <Check className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy Address'}
              </button>
              <button
                onClick={() => window.open(`https://sepolia.etherscan.io/address/${address}`, '_blank')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-secondary hover:bg-gray-50 transition-colors
                           dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <ExternalLink className="w-4 h-4" />
                View on Etherscan
              </button>
              <button
                onClick={() => { disconnect(); setShowDropdown(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors
                           dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <LogOut className="w-4 h-4" />
                Disconnect
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
