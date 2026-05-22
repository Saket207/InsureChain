import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, MapPin, Globe } from 'lucide-react';
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
        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
          Select State Node
        </label>
        <button
          type="button"
          onClick={() => {
            setIsStateOpen(!isStateOpen);
            setIsDistrictOpen(false);
          }}
          className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl border-2 bg-slate-50 text-left transition-all
            ${isStateOpen ? 'border-emerald-500 bg-white shadow-lg shadow-emerald-500/5' : 'border-slate-100 hover:border-emerald-200'}`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg transition-colors ${stateValue ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400 border border-slate-100'}`}>
              <Globe className="w-4 h-4" />
            </div>
            {stateValue ? (
              <span className="text-sm font-bold text-slate-900">{stateValue}</span>
            ) : (
              <span className="text-sm font-bold text-slate-400">Initialize State Node...</span>
            )}
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isStateOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {isStateOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute z-50 w-full mt-3 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden"
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
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all mb-1
                      ${stateValue === stateName
                        ? 'bg-emerald-50 text-emerald-700 font-black'
                        : 'text-slate-600 font-bold hover:bg-slate-50 hover:text-slate-900'
                      }`}
                  >
                    <span className="font-bold">{stateName}</span>
                    {stateValue === stateName && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
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
        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
          Select District Terminal
        </label>
        <button
          type="button"
          disabled={!stateValue}
          onClick={() => {
            setIsDistrictOpen(!isDistrictOpen);
            setIsStateOpen(false);
          }}
          className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl border-2 text-left transition-all
            ${!stateValue ? 'opacity-50 cursor-not-allowed bg-slate-100 border-slate-100' :
              isDistrictOpen ? 'border-emerald-500 bg-white shadow-lg shadow-emerald-500/5' : 'border-slate-100 hover:border-emerald-200 bg-slate-50'}`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg transition-colors ${selectedDistrict ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400 border border-slate-100'}`}>
              <MapPin className="w-4 h-4" />
            </div>
            {selectedDistrict ? (
              <span className="text-sm font-bold text-slate-900">{selectedDistrict.name}</span>
            ) : (
              <span className="text-sm font-bold text-slate-400">
                {stateValue ? 'Select District Node...' : 'Awaiting State Activation...'}
              </span>
            )}
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isDistrictOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {isDistrictOpen && stateValue && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute z-50 w-full mt-3 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden"
            >
              {/* Search */}
              <div className="p-4 border-b border-slate-50">
                <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 focus-within:border-emerald-500 transition-all">
                  <Search className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder={`Search ${stateValue} districts...`}
                    value={districtSearch}
                    onChange={(e) => setDistrictSearch(e.target.value)}
                    className="w-full bg-transparent text-sm font-bold outline-none text-slate-900 placeholder:text-slate-400"
                    autoFocus
                  />
                </div>
              </div>

              {/* Options */}
              <div className="max-h-60 overflow-y-auto p-2 custom-scrollbar">
                {filteredDistricts.length === 0 ? (
                  <div className="py-8 px-4 text-center">
                    <MapPin className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No districts found</p>
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
                      className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm transition-all mb-1
                        ${districtValue === district.id
                          ? 'bg-emerald-50 text-emerald-700 font-black'
                          : 'text-slate-600 font-bold hover:bg-slate-50 hover:text-slate-900'
                        }`}
                    >
                      <div className="flex flex-col text-left">
                        <span className={`${districtValue === district.id ? 'font-black' : 'font-bold'}`}>{district.name}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{district.state}</span>
                      </div>
                      <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${districtValue === district.id ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-100 text-slate-400'}`}>
                        Select Node
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
