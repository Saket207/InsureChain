import { create } from 'zustand';
import mockPolicies from '../data/mockPolicies.json';

export const usePolicyStore = create((set) => ({
  activePolicies: mockPolicies,
  selectedDistrict: null,
  currentStep: 0,

  // Registration form data
  registrationData: {
    fullName: '',
    mobile: '',
    email: '',
    state: 'Maharashtra',
    district: null,
    season: 'Kharif',
    triggers: [],
    walletConnected: false,
    termsAccepted: false,
  },

  setSelectedDistrict: (district) => set({ selectedDistrict: district }),
  setCurrentStep: (step) => set({ currentStep: step }),
  nextStep: () => set((state) => ({ currentStep: Math.min(state.currentStep + 1, 3) })),
  prevStep: () => set((state) => ({ currentStep: Math.max(state.currentStep - 1, 0) })),
  resetRegistration: () =>
    set({
      currentStep: 0,
      registrationData: {
        fullName: '',
        mobile: '',
        email: '',
        state: 'Maharashtra',
        district: null,
        season: 'Kharif',
        triggers: [],
        walletConnected: false,
        termsAccepted: false,
      },
    }),

  updateRegistrationData: (updates) =>
    set((state) => ({
      registrationData: { ...state.registrationData, ...updates },
    })),

  toggleTrigger: (trigger) =>
    set((state) => {
      const current = state.registrationData.triggers;
      const updated = current.includes(trigger)
        ? current.filter((t) => t !== trigger)
        : [...current, trigger];
      return {
        registrationData: { ...state.registrationData, triggers: updated },
      };
    }),
}));
