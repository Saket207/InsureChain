import { useEffect, useState } from 'react';
import { BrowserProvider, formatEther } from 'ethers';
import { useWalletStore } from '../stores/walletStore';
import { useAuth } from '../context/AuthContext';
import { updateWalletAddress } from '../services/firestoreService';

const SEPOLIA_CHAIN_ID = '0xaa36a7'; // 11155111 in hex
const LOCALHOST_CHAIN_ID = '0x7a69'; // 31337 in hex (Hardhat default)
const LOCALHOST_ALT_CHAIN_ID = '0x539'; // 1337 in hex (Alternative local)

export function useWallet() {
  const { setWalletState, disconnect, provider, chainId } = useWalletStore();
  const { currentUser } = useAuth();
  const [error, setError] = useState(null);

  const getBalance = async (web3Provider, address) => {
    try {
      const balanceWei = await web3Provider.getBalance(address);
      const balanceEth = parseFloat(formatEther(balanceWei)).toFixed(4);
      setWalletState({ balance: balanceEth });
    } catch (err) {
      console.error('Failed to get balance', err);
    }
  };

  const checkNetwork = async (eth) => {
    const currentChainId = await eth.request({ method: 'eth_chainId' });
    
    let networkName = 'Unknown';
    if (currentChainId === SEPOLIA_CHAIN_ID) {
      networkName = 'Sepolia Testnet';
    } else if (currentChainId === LOCALHOST_CHAIN_ID || currentChainId === LOCALHOST_ALT_CHAIN_ID) {
      networkName = 'Localhost 8545';
    } else {
      networkName = 'Wrong Network';
    }
    setWalletState({ chainId: currentChainId, networkName });
    return currentChainId;
  };

  const switchNetwork = async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: SEPOLIA_CHAIN_ID,
                chainName: 'Sepolia test network',
                nativeCurrency: {
                  name: 'SepoliaETH',
                  symbol: 'SEP',
                  decimals: 18,
                },
                rpcUrls: ['https://rpc.sepolia.org'],
                blockExplorerUrls: ['https://sepolia.etherscan.io'],
              },
            ],
          });
        } catch (addError) {
          console.error('Failed to add Sepolia network', addError);
        }
      }
    }
  };

  const connect = async () => {
    setError(null);
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          const account = accounts[0];
          
          const web3Provider = new BrowserProvider(window.ethereum);
          const web3Signer = await web3Provider.getSigner();

          setWalletState({
            address: account,
            isConnected: true,
            provider: web3Provider,
            signer: web3Signer,
          });

          await getBalance(web3Provider, account);
          await checkNetwork(window.ethereum);

          if (currentUser) {
            await updateWalletAddress(currentUser.uid, account);
          }
        }
      } catch (err) {
        console.error('Failed to connect wallet', err);
        const errMsg = err.code === 4001 ? 'You rejected the connection request in MetaMask.' : 'Failed to connect: ' + err.message;
        setError(errMsg);
        alert(errMsg); // Show immediate feedback
      }
    } else {
      const errMsg = 'MetaMask is not installed. Please install the MetaMask extension.';
      setError(errMsg);
      alert(errMsg);
    }
  };

  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      const handleAccountsChanged = async (accounts) => {
        if (accounts.length > 0) {
          setWalletState({ address: accounts[0] });
          if (provider) {
            await getBalance(provider, accounts[0]);
          }
          if (currentUser) {
            await updateWalletAddress(currentUser.uid, accounts[0]);
          }
        } else {
          disconnect();
        }
      };

      const handleChainChanged = () => {
        window.location.reload(); 
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, [provider, currentUser, disconnect, setWalletState]);

  return {
    error,
    connect,
    disconnect,
    switchNetwork,
    isSepolia: chainId === SEPOLIA_CHAIN_ID,
    isLocalhost: chainId === LOCALHOST_CHAIN_ID || chainId === LOCALHOST_ALT_CHAIN_ID,
  };
}
