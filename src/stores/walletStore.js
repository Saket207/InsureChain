import { create } from 'zustand';

export const useWalletStore = create((set) => ({
  isConnected: false,
  address: null,
  chainId: null,
  networkName: null,
  balance: null,
  provider: null,
  signer: null,

  setWalletState: (newState) => set(newState),

  disconnect: () =>
    set({
      isConnected: false,
      address: null,
      chainId: null,
      networkName: null,
      balance: null,
      provider: null,
      signer: null,
    }),
}));
