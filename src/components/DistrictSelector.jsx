import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, MapPin, Globe, Check } from 'lucide-react';
import districts from '../data/districts.json';

export default function DistrictSelector({ 
  stateValue, 
  onStateChange, 
  districtValue, 
  onDistrictChange,
  label = 'Select Location Terminal'
}) {
  const [isStateOpen, setIsStateOpen] = useState(false);
  const [isDistrictOpen, setIsDistrictOpen] = useState(false);
  const [districtSearch, setDistrictSearch] = useState('');
  
  const stateRef = useRef(null);
  const districtRef = useRef(null);

  // Click outside handlers
  useEffect(() => {
    function handleClickOutside(e) {
      if (stateRef.current && !stateRef.current.contains(e.target)) {
        setIsStateOpen(false);
      }
      if (districtRef.current && !districtRef.current.contains(e.target)) {
        setIsDistrictOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Unique list of states sorted alphabetically
  const statesList = Array.from(new Set(districts.map((d) => d.state))).sort();

  // Filtered districts based on selected state and search term
  const filteredDistricts = districts.filter((d) => {
    const matchesState = d.state === stateValue;
    const matchesSearch = d.name.toLowerCase().includes(districtSearch.toLowerCase());
    return matchesState && matchesSearch;
  });

  const selectedDistrict = districts.find((d) => d.id === districtValue);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* ═══ STATE SELECTOR ═══ */}
      <div className="relative" ref={stateRef}>
        <div className="flex justify-between items-center mb-2 ml-1">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Select State Node
          </label>
          {stateValue && (
            <span className="flex items-center gap-1.5 text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100/50 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              Node Connected
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setIsStateOpen(!isStateOpen);
            setIsDistrictOpen(false);
          }}
          className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl border bg-slate-50/50 text-left transition-all duration-300 outline-none
            ${isStateOpen 
              ? 'border-emerald-500 bg-white shadow-xl shadow-emerald-500/5 ring-4 ring-emerald-500/10' 
              : 'border-slate-200/80 hover:border-emerald-500/40 hover:bg-slate-50 hover:shadow-md'
            }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl transition-all duration-300 ${
              stateValue 
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                : 'bg-white text-slate-400 border border-slate-200/60'
            }`}>
              <Globe className={`w-4 h-4 transition-transform duration-500 ${isStateOpen ? 'rotate-12' : ''}`} />
            </div>
            <div>
              {stateValue ? (
                <>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">State Active</p>
                  <span className="text-sm font-bold text-slate-800 leading-none">{stateValue}</span>
                </>
              ) : (
                <span className="text-sm font-semibold text-slate-400">Initialize State Node...</span>
              )}
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isStateOpen ? 'rotate-180 text-emerald-500' : ''}`} />
        </button>

        <AnimatePresence>
          {isStateOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="absolute z-50 w-full mt-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden"
            >
              <div className="max-h-60 overflow-y-auto p-2 custom-scrollbar">
                {statesList.map((stateName) => (
                  <button
                    key={stateName}
                    type="button"
                    onClick={() => {
                      onStateChange(stateName);
                      setIsStateOpen(false);
                      setDistrictSearch('');
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all duration-200 mb-1 outline-none
                      ${stateValue === stateName
                        ? 'bg-emerald-50 text-emerald-700 font-extrabold shadow-sm'
                        : 'text-slate-600 font-bold hover:bg-slate-50 hover:text-slate-900'
                      }`}
                  >
                    <span className="font-bold">{stateName}</span>
                    {stateValue === stateName && (
                      <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-sm">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ═══ DISTRICT SELECTOR ═══ */}
      <div className="relative" ref={districtRef}>
        <div className="flex justify-between items-center mb-2 ml-1">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Select District Terminal
          </label>
          {selectedDistrict && (
            <span className="flex items-center gap-1.5 text-[9px] font-black text-cyan-600 uppercase tracking-widest bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-100/50">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)] animate-pulse" />
              Terminal Synced
            </span>
          )}
        </div>
        <button
          type="button"
          disabled={!stateValue}
          onClick={() => {
            setIsDistrictOpen(!isDistrictOpen);
            setIsStateOpen(false);
          }}
          className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl border text-left transition-all duration-300 outline-none
            ${!stateValue 
              ? 'opacity-40 cursor-not-allowed bg-slate-100/50 border-slate-200/50' 
              : isDistrictOpen 
                ? 'border-emerald-500 bg-white shadow-xl shadow-emerald-500/5 ring-4 ring-emerald-500/10' 
                : 'border-slate-200/80 hover:border-emerald-500/40 hover:bg-slate-50 hover:shadow-md bg-slate-50/50'
            }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl transition-all duration-300 ${
              selectedDistrict 
                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' 
                : 'bg-white text-slate-400 border border-slate-200/60'
            }`}>
              <MapPin className={`w-4 h-4 transition-transform duration-500 ${isDistrictOpen ? 'scale-110' : ''}`} />
            </div>
            <div>
              {selectedDistrict ? (
                <>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Terminal Link</p>
                  <span className="text-sm font-bold text-slate-800 leading-none">{selectedDistrict.name}</span>
                </>
              ) : (
                <span className="text-sm font-semibold text-slate-400">
                  {stateValue ? 'Select District Node...' : 'Awaiting State Activation...'}
                </span>
              )}
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isDistrictOpen ? 'rotate-180 text-emerald-500' : ''}`} />
        </button>

        <AnimatePresence>
          {isDistrictOpen && stateValue && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="absolute z-50 w-full mt-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden"
            >
              {/* Search */}
              <div className="p-3 border-b border-slate-100 bg-slate-50/40">
                <div className="flex items-center gap-2.5 px-3 py-2 bg-white rounded-xl border border-slate-200 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/10 transition-all duration-300 shadow-inner">
                  <Search className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder={`Search ${stateValue} districts...`}
                    value={districtSearch}
                    onChange={(e) => setDistrictSearch(e.target.value)}
                    className="w-full bg-transparent text-sm font-bold outline-none text-slate-800 placeholder:text-slate-400"
                    autoFocus
                  />
                </div>
              </div>

              {/* Options */}
              <div className="max-h-60 overflow-y-auto p-2 custom-scrollbar">
                {filteredDistricts.length === 0 ? (
                  <div className="py-8 px-4 text-center">
                    <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2 animate-bounce" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No terminals found</p>
                  </div>
                ) : (
                  filteredDistricts.map((district) => (
                    <button
                      key={district.id}
                      type="button"
                      onClick={() => {
                        onDistrictChange(district.id);
                        setIsDistrictOpen(false);
                        setDistrictSearch('');
                      }}
                      className={`w-full flex items-center justify-between px-3 py-3.5 rounded-xl text-sm transition-all duration-200 mb-1 outline-none text-left
                        ${districtValue === district.id
                          ? 'bg-emerald-50 text-emerald-700 font-extrabold shadow-sm'
                          : 'text-slate-600 font-bold hover:bg-slate-50 hover:text-slate-900'
                        }`}
                    >
                      <div className="flex flex-col">
                        <span className={`text-sm ${districtValue === district.id ? 'font-black' : 'font-bold text-slate-800'}`}>{district.name}</span>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{district.state} Region</span>
                      </div>
                      <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm transition-all ${
                        districtValue === district.id 
                          ? 'bg-emerald-500 text-white' 
                          : 'bg-white text-slate-500 border border-slate-200/80 hover:border-slate-300'
                      }`}>
                        {districtValue === district.id ? 'Synced' : 'Link Node'}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

