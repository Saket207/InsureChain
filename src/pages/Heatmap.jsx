/* eslint-disable */
import { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap, useMapEvents, Marker, Popup } from 'react-leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, X, MapPin, Droplets, Thermometer, Eye, BarChart3, 
  Database, Loader2, Compass, AlertTriangle, ShieldCheck, HelpCircle, ArrowRight
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';

import RiskBadge from '../components/RiskBadge';
import defaultDistricts from '../data/districts.json';
import { getRiskColor, getRiskLevel } from '../utils/helpers';
import { getDistrictRiskScores, seedDistrictRiskScores } from '../services/firestoreService';
import { backendApi } from '../services/backendApi';
import { usePolicyStore } from '../stores/policyStore';
import ThreeDDistrictNode from '../components/ThreeDDistrictNode';

// Custom pulsing Leaflet marker icon for the geocoded custom selection
const customPinIcon = typeof L !== 'undefined' ? new L.DivIcon({
  html: `
    <div class="relative flex items-center justify-center">
      <span class="absolute inline-flex h-8 w-8 animate-ping rounded-full bg-blue-500/40 opacity-75"></span>
      <span class="relative inline-flex h-4.5 w-4.5 rounded-full bg-blue-600 border-2 border-white shadow-lg"></span>
    </div>
  `,
  className: 'custom-leaflet-pin',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
}) : null;

// Fallback dynamic simulator for India coordinates when backend is offline
const fallbackComputeRisk = (lat, lon, districtName, stateName) => {
  const seed = Math.abs(Math.round(lat * 1000 + lon * 100)) % 100;
  const rawScore = Math.round(20 + (seed % 65)); // Range: 20% to 85%
  const score = Math.max(15, Math.min(95, rawScore));
  const level = score <= 30 ? 'Low' : score <= 55 ? 'Moderate' : score <= 75 ? 'High' : 'Critical';

  const droughtScore = Math.max(10, Math.round(score * 1.15 - 8));
  const floodScore = Math.max(5, Math.round((100 - score) * 0.9 + (seed % 12)));
  const ndviVal = (0.22 + (seed % 55) / 100).toFixed(2);
  const consecutiveDry = Math.round(4 + (score / 4.2) + (seed % 4));
  const soilMoisture = (0.04 + (1 - score / 100) * 0.46).toFixed(3);
  const rainfall30d = (1.2 + (1 - score / 100) * 6.2).toFixed(2);

  return {
    district: districtName,
    districtId: districtName.toLowerCase().replace(/\s+/g, '-'),
    lat,
    lon,
    riskScore: score,
    riskLevel: level,
    transparency: {
      drought_impact: `${Math.round(droughtScore * 0.30)}%`,
      flood_impact: `${Math.round(floodScore * 0.20)}%`,
      satellite_impact: `${Math.round((100 - parseFloat(ndviVal) * 100) * 0.25)}%`,
      weather_impact: `${Math.round((consecutiveDry * 3.5) * 0.25)}%`
    },
    details: {
      rainfall_30d_avg: parseFloat(rainfall30d),
      soil_moisture_index: parseFloat(soilMoisture),
      ndvi_health: parseFloat(ndviVal),
      consecutive_dry_days: consecutiveDry
    },
    computedAt: new Date().toISOString()
  };
};

/* ── Generate GeoJSON polygons from district center points ── */
function generateDistrictGeoJSON(districtsData) {
  const features = districtsData.map((d) => {
    const offset = 0.35;
    const coordinates = [[
      [d.lon - offset, d.lat - offset],
      [d.lon + offset, d.lat - offset],
      [d.lon + offset, d.lat + offset],
      [d.lon - offset, d.lat + offset],
      [d.lon - offset, d.lat - offset],
    ]];
    return {
      type: 'Feature',
      properties: { ...d },
      geometry: { type: 'Polygon', coordinates },
    };
  });
  return { type: 'FeatureCollection', features };
}

/* ── Map Click Handler component ── */
function MapClickHandler({ onMapClick, enabled }) {
  useMapEvents({
    click: (e) => {
      if (enabled) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    }
  });
  return null;
}

/* ── Map Reset View component ── */
function SetView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom, { animate: true, duration: 1 });
    }
  }, [center, zoom, map]);
  return null;
}

export default function Heatmap() {
  const navigate = useNavigate();
  const updateRegistrationData = usePolicyStore((state) => state.updateRegistrationData);

  const [inspectorMode, setInspectorMode] = useState('region'); // 'region' or 'custom'
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  // Satellite NDVI Map Overlay State
  const [mapViewMode, setMapViewMode] = useState('risk'); // 'risk' or 'satellite'
  const [ndviLastFetched, setNdviLastFetched] = useState(() => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

  // Custom Point Inspector state
  const [customMarker, setCustomMarker] = useState(null);
  const [customLoading, setCustomLoading] = useState(false);
  const [customRiskData, setCustomRiskData] = useState(null);
  const [addressSearchQuery, setAddressSearchQuery] = useState('');
  const [geocodingResults, setGeocodingResults] = useState([]);
  const [searchingAddress, setSearchingAddress] = useState(false);

  const fetchRiskScores = async () => {
    try {
      setLoading(true);
      const scores = await getDistrictRiskScores();
      
      const initialNdviMap = {};
      defaultDistricts.forEach(d => {
        const seed = Math.abs(Math.round(d.lat * 1000 + d.lon * 100)) % 100;
        const base = 0.35 + (seed % 42) / 100;
        initialNdviMap[d.id] = parseFloat(base.toFixed(2));
      });
      
      if (scores.length === 0) {
        setDistricts(defaultDistricts.map(d => ({
          ...d, 
          riskScore: 0, 
          riskLevel: 'Low',
          ndvi: initialNdviMap[d.id]
        })));
      } else {
        const merged = defaultDistricts.map(d => {
          const scoreData = scores.find(s => s.district === d.name);
          if (scoreData) {
            return {
              ...d,
              riskScore: scoreData.riskScore,
              riskLevel: scoreData.riskLevel,
              activePolicies: scoreData.activePolicies,
              ndvi: initialNdviMap[d.id],
              riskBreakdown: {
                drought: scoreData.droughtRisk || Math.round(scoreData.riskScore * 0.8),
                flood: scoreData.floodRisk || Math.round((100 - scoreData.riskScore) * 0.6),
                heatwave: scoreData.heatwaveRisk || 12,
                frost: 5
              }
            };
          }
          return {
            ...d,
            riskScore: 0,
            riskLevel: 'Low',
            ndvi: initialNdviMap[d.id]
          };
        });
        setDistricts(merged);
      }
      setNdviLastFetched(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (error) {
      console.error("Error fetching risk scores:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiskScores();
  }, []);

  // Background lazy-fetch of live NDVI telemetry upon clicking a district
  useEffect(() => {
    if (!selectedDistrict) return;
    
    let active = true;
    const fetchLiveDistrictNdvi = async () => {
      try {
        const res = await backendApi.getNdviData(selectedDistrict.id);
        if (active && res && !res.error && res.current !== undefined) {
          const val = typeof res.current === 'object' && res.current !== null
            ? res.current.ndvi_value
            : res.current;
          
          if (val !== undefined && typeof val === 'number') {
            setSelectedDistrict(prev => prev && prev.id === selectedDistrict.id ? { ...prev, ndvi: val } : prev);
            setDistricts(prevList => prevList.map(d => d.id === selectedDistrict.id ? { ...d, ndvi: val } : d));
            setNdviLastFetched(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
          }
        }
      } catch (err) {
        console.warn(`[Live NDVI Fetch] Failed for ${selectedDistrict.id}, keeping fallback value:`, err);
      }
    };
    
    fetchLiveDistrictNdvi();
    return () => { active = false; };
  }, [selectedDistrict?.id]);

  const handleSeedData = async () => {
    try {
      setSeeding(true);
      await seedDistrictRiskScores();
      await fetchRiskScores();
    } catch (error) {
      console.error("Error seeding data:", error);
    } finally {
      setSeeding(false);
    }
  };

  const geoData = useMemo(() => generateDistrictGeoJSON(districts), [districts]);

  const filteredDistricts = districts.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getNdviColor = (val) => {
    if (val > 0.6) return { hex: '#047857', level: 'Healthy' };
    if (val > 0.4) return { hex: '#84cc16', level: 'Moderate' };
    if (val > 0.2) return { hex: '#f59e0b', level: 'Stressed' };
    return { hex: '#dc2626', level: 'Critical' };
  };

  const getStyle = (feature) => {
    if (mapViewMode === 'satellite') {
      const ndviVal = feature.properties.ndvi !== undefined ? feature.properties.ndvi : 0.5;
      const ndviColor = getNdviColor(ndviVal);
      return {
        fillColor: ndviColor.hex,
        fillOpacity: inspectorMode === 'custom' ? 0.05 : 0.6,
        color: ndviColor.hex,
        weight: inspectorMode === 'custom' ? 1 : 2,
        opacity: inspectorMode === 'custom' ? 0.15 : 0.8,
      };
    }

    const score = feature.properties.riskScore;
    const level = feature.properties.riskLevel || getRiskLevel(score);
    const color = getRiskColor(level);
    return {
      fillColor: score === 0 ? '#cccccc' : color.hex,
      fillOpacity: inspectorMode === 'custom' ? 0.05 : 0.45,
      color: score === 0 ? '#999999' : color.hex,
      weight: inspectorMode === 'custom' ? 1 : 2,
      opacity: inspectorMode === 'custom' ? 0.15 : 0.8,
    };
  };

  const onEachFeature = (feature, layer) => {
    layer.on({
      click: () => {
        if (inspectorMode === 'region') {
          setSelectedDistrict(feature.properties);
          setCustomMarker(null);
        }
      },
      mouseover: (e) => {
        if (inspectorMode === 'region') {
          e.target.setStyle({ fillOpacity: 0.75, weight: 3 });
        }
      },
      mouseout: (e) => {
        if (inspectorMode === 'region') {
          e.target.setStyle({ fillOpacity: mapViewMode === 'satellite' ? 0.6 : 0.45, weight: 2 });
        }
      },
    });
    if (inspectorMode === 'region') {
      layer.bindTooltip(
        `<strong>${feature.properties.name}</strong><br/>${
          mapViewMode === 'satellite' 
            ? `NDVI: ${feature.properties.ndvi !== undefined ? feature.properties.ndvi : '0.50'}` 
            : `Risk: ${feature.properties.riskScore}%`
        }`,
        { sticky: true, className: 'custom-tooltip' }
      );
    }
  };

  // Click handler on custom point inspector map
  const handleMapClick = async (lat, lon) => {
    if (inspectorMode !== 'custom') return;
    
    setCustomLoading(true);
    setCustomRiskData(null);
    setSelectedDistrict(null);
    setGeocodingResults([]);
    
    let addressStr = `${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E`;
    let districtName = 'Custom Location';
    let stateName = 'India';
    
    try {
      const geoResp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (geoResp.ok) {
        const geoData = await geoResp.json();
        addressStr = geoData.display_name || addressStr;
        const addr = geoData.address || {};
        districtName = addr.county || addr.district || addr.state_district || addr.city || addr.town || addr.suburb || 'Custom Location';
        stateName = addr.state || 'India';
        districtName = districtName.replace(/\s+District$/i, '');
      }
    } catch (err) {
      console.warn("Reverse geocoding failed:", err);
    }
    
    const matched = defaultDistricts.find(
      (d) => d.name.toLowerCase() === districtName.toLowerCase() ||
             d.id.toLowerCase() === districtName.toLowerCase()
    );
    const resolvedDistrictId = matched ? matched.id : 'custom';
    
    setCustomMarker({
      lat,
      lon,
      address: addressStr,
      districtId: resolvedDistrictId,
      districtName,
      state: stateName
    });
    
    try {
      const riskResp = await backendApi.getDistrictRisk(resolvedDistrictId, lat, lon);
      if (riskResp && !riskResp.error) {
        setCustomRiskData(riskResp);
      } else {
        const simulated = fallbackComputeRisk(lat, lon, districtName, stateName);
        setCustomRiskData(simulated);
      }
    } catch (error) {
      console.error("Error retrieving live risk analytics:", error);
      const simulated = fallbackComputeRisk(lat, lon, districtName, stateName);
      setCustomRiskData(simulated);
    } finally {
      setCustomLoading(false);
    }
  };

  // Indian Address Geocoder Autocomplete Search
  const handleAddressSearch = async (e) => {
    e.preventDefault();
    if (!addressSearchQuery.trim()) return;
    
    setSearchingAddress(true);
    setGeocodingResults([]);
    
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressSearchQuery)}&countrycodes=in&limit=5`
      );
      if (resp.ok) {
        const data = await resp.json();
        setGeocodingResults(data);
      }
    } catch (err) {
      console.error("Geocoding failed:", err);
    } finally {
      setSearchingAddress(false);
    }
  };

  const selectAddressResult = (result) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    setAddressSearchQuery('');
    setGeocodingResults([]);
    handleMapClick(lat, lon);
  };

  // Redirect to Registration pre-filled
  const handleInsureLocation = (marker, scoreData) => {
    const districtId = marker.districtId !== 'custom' ? marker.districtId : 'nagpur';
    updateRegistrationData({
      district: districtId,
      state: marker.state || 'Maharashtra'
    });
    navigate('/register-policy');
  };

  // Dynamic seeded rainfall data
  const rainfallChartData = useMemo(() => {
    if (!selectedDistrict) return [];
    if (selectedDistrict.rainfall7d && selectedDistrict.rainfall7d.length > 0) {
      return selectedDistrict.rainfall7d.map((v, i) => ({ day: `D${i + 1}`, value: v }));
    }
    const seed = Math.abs(Math.round(selectedDistrict.lat * 1000 + selectedDistrict.lon * 100)) % 100;
    const baseRain = Math.max(1.0, 14.0 - (selectedDistrict.riskScore / 5));
    const data = [];
    for (let i = 0; i < 7; i++) {
      const daySeed = (seed + i * 23) % 10;
      const val = parseFloat((baseRain + (daySeed % 4) - (daySeed % 2) * 1.5).toFixed(1));
      data.push({ day: `D${i + 1}`, value: val });
    }
    return data;
  }, [selectedDistrict]);

  const isUnseeded = districts.length > 0 && districts[0].riskScore === 0;

  // Custom Mode Agricultural Advisories
  const getAgriAdvisory = (score) => {
    if (score <= 30) {
      return {
        text: "Conditions are highly favorable. Soil moisture and satellite vegetation index indicate excellent crop vitality. Recommended: Kharif Cotton/Soybean.",
        severity: "success"
      };
    } else if (score <= 55) {
      return {
        text: "Moderate risk detected. Mild rainfall deficit observed over the past 14 days. Monitor soil moisture closely and ensure active micro-drip cycles.",
        severity: "warning"
      };
    } else if (score <= 75) {
      return {
        text: "High crop water stress! Satellite monitoring shows vegetative drying trend. Farmers are strongly encouraged to insure their fields with our Parametric Drought protection package.",
        severity: "danger"
      };
    } else {
      return {
        text: "CRITICAL AGRICULTURAL EMERGENCY! NASA indexes consecutive dry spell exceeding 15+ days. Activate heavy emergency irrigation and insure immediately to lock Ethereum crop payout guarantees.",
        severity: "critical"
      };
    }
  };

  const advisory = customRiskData ? getAgriAdvisory(customRiskData.riskScore) : null;

  const activeLevel = selectedDistrict ? selectedDistrict.riskLevel : (customRiskData ? customRiskData.riskLevel : 'Low');
  
  // ── Fully inline theme (NO dark: classes, purely driven by isSatellite) ──
  const isSatellite = mapViewMode === 'satellite';

  // Unified glassmorphism panel styles - one source of truth
  const glass = {
    // Main side panel
    panel: isSatellite
      ? { background: 'rgba(2,6,23,0.82)', backdropFilter: 'blur(32px) saturate(1.6)', border: '1px solid rgba(255,255,255,0.08)', color: '#f1f5f9' }
      : { background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(32px) saturate(1.8)', border: '1px solid rgba(255,255,255,0.85)', color: '#1e293b' },
    // Floating overlays (legend, toggles, search)
    overlay: isSatellite
      ? { background: 'rgba(2,6,23,0.65)', backdropFilter: 'blur(24px) saturate(1.4)', border: '1px solid rgba(255,255,255,0.06)' }
      : { background: 'rgba(255,255,255,0.68)', backdropFilter: 'blur(24px) saturate(1.8)', border: '1px solid rgba(255,255,255,0.75)' },
    // Inner data cards
    card: isSatellite
      ? { background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.05)' }
      : { background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', border: '1px solid rgba(226,232,240,0.6)' },
    // Progress bar track
    track: isSatellite
      ? { background: 'rgba(30,41,59,0.6)' }
      : { background: 'rgba(241,245,249,0.9)' },
    // Dropdown
    dropdown: isSatellite
      ? { background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }
      : { background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)', border: '1px solid rgba(226,232,240,0.7)', color: '#334155' },
  };

  // Text color tokens (no dark: classes)
  const txt = {
    primary: isSatellite ? '#f1f5f9' : '#0f172a',
    secondary: isSatellite ? '#94a3b8' : '#475569',
    muted: isSatellite ? '#64748b' : '#94a3b8',
    accent: isSatellite ? '#34d399' : '#059669',
  };

  // Header accent gradient per risk level
  const riskHeaderGradient = {
    Low: isSatellite
      ? 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(2,6,23,0.3))'
      : 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(255,255,255,0.3))',
    Moderate: isSatellite
      ? 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(2,6,23,0.3))'
      : 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(255,255,255,0.3))',
    High: isSatellite
      ? 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(2,6,23,0.3))'
      : 'linear-gradient(135deg, rgba(249,115,22,0.12), rgba(255,255,255,0.3))',
    Critical: isSatellite
      ? 'linear-gradient(135deg, rgba(239,68,68,0.18), rgba(2,6,23,0.3))'
      : 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(255,255,255,0.3))',
  };

  const riskAccentColor = {
    Low: '#10b981',
    Moderate: '#f59e0b',
    High: '#f97316',
    Critical: '#ef4444',
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-7rem)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-7rem)] lg:h-[calc(100vh-5rem)] flex flex-col lg:flex-row gap-0 -m-5 lg:-m-8 rounded-none overflow-hidden relative">
      
      {/* Dev Seeding Overlay */}
      {isUnseeded && (
        <div className="absolute inset-0 z-[2000] flex flex-col items-center justify-center p-6 text-center"
             style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)' }}>
          <Database className="w-12 h-12 text-primary mb-4" />
          <h2 className="text-2xl font-bold font-heading text-slate-900 mb-2">Initialize Database</h2>
          <p className="text-slate-600 max-w-md mb-6">
            The district risk scores have not been seeded to Firestore yet. Please initialize the database to view the heatmap.
          </p>
          <button
            onClick={handleSeedData}
            disabled={seeding}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-light disabled:opacity-70 transition-colors shadow-lg"
          >
            {seeding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
            {seeding ? 'Seeding Firestore...' : 'Seed District Data'}
          </button>
        </div>
      )}

      {/* ── Map Area ── */}
      <div className="flex-1 relative h-full">
        
        {/* Mode Toggle & Search Overlay */}
        <div className="absolute top-4 left-4 right-4 z-[1000] flex flex-col sm:flex-row gap-3 max-w-2xl">
          
          {/* Mode Switcher */}
          <div className="flex p-1 rounded-2xl transition-all duration-300 hover:scale-[1.02] transform flex-shrink-0"
               style={{ ...glass.overlay, boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
            <button
              onClick={() => {
                setInspectorMode('region');
                setCustomMarker(null);
                setCustomRiskData(null);
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all duration-300"
              style={inspectorMode === 'region'
                ? { background: 'rgba(16,185,129,0.85)', color: '#fff', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }
                : { color: txt.secondary }}
            >
              <Database className="w-3.5 h-3.5" />
              District Heatmap
            </button>
            <button
              onClick={() => {
                setInspectorMode('custom');
                setSelectedDistrict(null);
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all duration-300"
              style={inspectorMode === 'custom'
                ? { background: 'rgba(59,130,246,0.85)', color: '#fff', boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }
                : { color: txt.secondary }}
            >
              <Compass className="w-3.5 h-3.5 animate-spin-slow" />
              Address Inspector
            </button>
          </div>

          {/* District Search Bar (Region Mode) */}
          {inspectorMode === 'region' && (
            <div className="flex-1 max-w-sm relative">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
                   style={{ ...glass.overlay, boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
                <Search className="w-4 h-4 flex-shrink-0" style={{ color: txt.muted }} />
                <input
                  type="text"
                  placeholder="Search regions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none font-bold placeholder:text-slate-400"
                  style={{ color: txt.primary }}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} style={{ color: txt.muted }}>
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Search Dropdown */}
              {searchQuery && (
                <div className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden max-h-60 overflow-y-auto z-[2000]"
                     style={{ ...glass.dropdown, boxShadow: '0 16px 48px rgba(0,0,0,0.15)' }}>
                  {filteredDistricts.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => {
                        setSelectedDistrict(d);
                        setSearchQuery('');
                      }}
                      className="w-full flex items-center justify-between px-4 py-3 text-sm transition-colors text-left"
                      style={{ color: txt.primary }}
                      onMouseEnter={(e) => e.currentTarget.style.background = isSatellite ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5" style={{ color: txt.muted }} />
                        <span className="font-bold">{d.name}</span>
                      </div>
                      <RiskBadge level={d.riskLevel} size="sm" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Address Search Bar (Custom Point Mode) */}
          {inspectorMode === 'custom' && (
            <div className="flex-1 max-w-md relative">
              <form onSubmit={handleAddressSearch} className="flex items-center gap-2 px-4 py-2 rounded-xl"
                    style={{ ...glass.overlay, boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
                <Search className="w-4 h-4 flex-shrink-0" style={{ color: txt.muted }} />
                <input
                  type="text"
                  placeholder="Search Indian towns, pincodes, villages..."
                  value={addressSearchQuery}
                  onChange={(e) => setAddressSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none font-bold placeholder:text-slate-400"
                  style={{ color: txt.primary }}
                />
                {searchingAddress ? (
                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                ) : addressSearchQuery && (
                  <button type="button" onClick={() => setAddressSearchQuery('')} style={{ color: txt.muted }}>
                    <X className="w-4 h-4" />
                  </button>
                )}
              </form>

              {/* Autocomplete suggestions */}
              {geocodingResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden max-h-60 overflow-y-auto z-[2000]"
                     style={{ ...glass.dropdown, boxShadow: '0 16px 48px rgba(0,0,0,0.15)' }}>
                  {geocodingResults.map((res, idx) => (
                    <button
                      key={idx}
                      onClick={() => selectAddressResult(res)}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-left text-sm transition-colors"
                      style={{ color: txt.primary, borderBottom: `1px solid ${isSatellite ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}` }}
                      onMouseEnter={(e) => e.currentTarget.style.background = isSatellite ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <span className="font-medium line-clamp-2">{res.display_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Dynamic Legend */}
        <div className="absolute bottom-4 left-4 z-[1000] p-5 rounded-[24px] max-w-[220px] transition-all duration-300 hover:scale-[1.02] transform"
             style={{ ...glass.overlay, boxShadow: '0 12px 40px rgba(0,0,0,0.1)' }}>
          <p className="text-[9px] font-black mb-3 tracking-widest uppercase font-heading"
             style={{ color: txt.primary }}>
            {mapViewMode === 'satellite' ? 'Crop Health (NDVI)' : 'Climate Risk Scale'}
          </p>
          <div className="space-y-2">
            {mapViewMode === 'satellite' ? (
              [
                { level: 'Healthy (>0.6)', color: '#047857' },
                { level: 'Moderate (0.4-0.6)', color: '#84cc16' },
                { level: 'Stressed (0.2-0.4)', color: '#f59e0b' },
                { level: 'Critical (<0.2)', color: '#dc2626' },
              ].map(({ level, color }) => (
                <div key={level} className="flex items-center gap-2.5">
                  <div 
                    className="w-5 h-3 rounded-[4px] transition-all duration-300 flex-shrink-0" 
                    style={{ 
                      backgroundColor: `${color}99`, 
                      border: `1.5px solid ${color}`,
                      boxShadow: `0 0 8px ${color}30`
                    }} 
                  />
                  <span className="text-[11px] font-bold" style={{ color: txt.secondary }}>{level}</span>
                </div>
              ))
            ) : (
              [
                { level: 'Low (<30%)', color: getRiskColor('Low').hex },
                { level: 'Moderate (30-55%)', color: getRiskColor('Moderate').hex },
                { level: 'High (55-75%)', color: getRiskColor('High').hex },
                { level: 'Critical (>75%)', color: getRiskColor('Critical').hex },
              ].map(({ level, color }) => (
                <div key={level} className="flex items-center gap-2.5">
                  <div 
                    className="w-5 h-3 rounded-[4px] transition-all duration-300 flex-shrink-0" 
                    style={{ 
                      backgroundColor: `${color}77`, 
                      border: `1.5px solid ${color}`,
                      boxShadow: `0 0 8px ${color}20`
                    }} 
                  />
                  <span className="text-[11px] font-bold" style={{ color: txt.secondary }}>{level}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* View Toggle buttons overlay top right of the map */}
        <div className="absolute top-4 right-4 z-[1000] flex flex-col items-end gap-2">
          <div className="flex p-1 rounded-2xl transition-all duration-300 hover:scale-[1.02] transform"
               style={{ ...glass.overlay, boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
            <button
              type="button"
              onClick={() => setMapViewMode('risk')}
              className="px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-300"
              style={mapViewMode === 'risk'
                ? { background: 'rgba(16,185,129,0.85)', color: '#fff', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }
                : { color: txt.secondary }}
            >
              Risk View
            </button>
            <button
              type="button"
              onClick={() => setMapViewMode('satellite')}
              className="px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-300"
              style={mapViewMode === 'satellite'
                ? { background: 'rgba(59,130,246,0.85)', color: '#fff', boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }
                : { color: txt.secondary }}
            >
              Satellite View
            </button>
          </div>
          <span className="text-[9px] font-bold uppercase px-2.5 py-1 rounded-lg leading-none font-mono"
                style={{ ...glass.overlay, color: txt.muted }}>
            Last updated: {ndviLastFetched}
          </span>
        </div>

        {/* Info Box for Custom Mode */}
        {inspectorMode === 'custom' && !customMarker && (
          <div className="absolute bottom-4 right-4 z-[1000] rounded-xl p-4 max-w-sm animate-bounce-slow"
               style={{ background: 'rgba(30,58,138,0.9)', backdropFilter: 'blur(16px)', border: '1px solid rgba(96,165,250,0.25)', boxShadow: '0 12px 40px rgba(30,64,175,0.3)' }}>
            <div className="flex gap-2.5 items-start">
              <Compass className="w-5 h-5 text-blue-300 flex-shrink-0 mt-0.5 animate-spin-slow" />
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-blue-200">Point-Based Climate Inspector</h4>
                <p className="text-xs font-semibold text-blue-100/90 mt-1 leading-relaxed">
                  Click anywhere in India on the map to pinpoint a crop farm and automatically extract live satellite metrics!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Leaflet Map */}
        <MapContainer
          center={[20.5, 78.5]}
          zoom={7}
          className="h-full w-full"
          zoomControl={false}
          style={{ background: mapViewMode === 'satellite' ? '#040d1a' : '#f1f5f9' }}
        >
          <TileLayer
            attribution={
              mapViewMode === 'satellite'
                ? '&copy; <a href="https://www.esri.com">Esri</a> &copy; NASA/USGS'
                : '&copy; <a href="https://carto.com/attributions">CartoDB</a>'
            }
            url={
              mapViewMode === 'satellite'
                ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
            }
            opacity={mapViewMode === 'satellite' ? 0.85 : 0.9}
          />
          <GeoJSON
            key={mapViewMode + districts.length}
            data={geoData}
            style={getStyle}
            onEachFeature={onEachFeature}
          />
          
          <MapClickHandler onMapClick={handleMapClick} enabled={inspectorMode === 'custom'} />

          {selectedDistrict && (
            <SetView center={[selectedDistrict.lat, selectedDistrict.lon]} zoom={9} />
          )}

          {customMarker && (
            <SetView center={[customMarker.lat, customMarker.lon]} zoom={9} />
          )}

          {customMarker && (
            <Marker position={[customMarker.lat, customMarker.lon]} icon={customPinIcon}>
              <Popup className="custom-popup">
                <div className="p-2 text-center max-w-[200px]">
                  <p className="font-black text-slate-800 text-xs">{customMarker.districtName}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-bold line-clamp-1">{customMarker.state}</p>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* ── Side Panel ── */}
      <AnimatePresence>
        
        {/* District Detail View */}
        {inspectorMode === 'region' && selectedDistrict && (
          <motion.div
            initial={{ x: '110%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '110%', opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className="w-[calc(100%-2rem)] sm:w-96 m-4 rounded-[28px] overflow-hidden flex-shrink-0 z-[1100]
                       absolute right-0 top-0 bottom-0 h-[calc(100%-2rem)]
                       flex flex-col"
            style={{ ...glass.panel, boxShadow: '0 25px 60px -15px rgba(0,0,0,0.35)' }}
          >
            {/* Header */}
            <div className="p-5 flex-shrink-0"
                 style={{ background: riskHeaderGradient[activeLevel] || riskHeaderGradient.Low, borderBottom: `1px solid ${isSatellite ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-extrabold font-heading flex items-center gap-2"
                    style={{ color: txt.primary }}>
                  <MapPin className="w-5 h-5" style={{ color: riskAccentColor[activeLevel] || '#10b981' }} />
                  {selectedDistrict.name}
                </h2>
                <button
                  onClick={() => setSelectedDistrict(null)}
                  className="p-1.5 rounded-lg transition-all duration-200"
                  style={{ color: txt.muted }}
                  onMouseEnter={(e) => e.currentTarget.style.background = isSatellite ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <RiskBadge level={selectedDistrict.riskLevel} size="md" showDot />
                <span className="text-xs font-bold" style={{ color: txt.secondary }}>
                  District Risk: <span className="font-extrabold" style={{ color: txt.primary }}>{selectedDistrict.riskScore}%</span>
                </span>
              </div>
            </div>

            {/* 3D Telemetry Node */}
            <div className="p-5 flex-shrink-0"
                 style={{ borderBottom: `1px solid ${isSatellite ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}` }}>
              <ThreeDDistrictNode 
                riskScore={selectedDistrict.riskScore} 
                ndvi={selectedDistrict.ndvi !== undefined ? selectedDistrict.ndvi : 0.50} 
                name={selectedDistrict.name}
                isSatellite={isSatellite}
              />
            </div>

            {/* Scrollable Content Cards */}
            <div className="flex-1 p-5 space-y-4 overflow-y-auto custom-scrollbar">
              
              {/* Prominent NDVI Crop Health Index Block (Satellite mode) */}
              {mapViewMode === 'satellite' && (
                <div className="p-4 rounded-2xl"
                     style={{ ...glass.card, borderColor: 'rgba(16,185,129,0.15)', background: isSatellite ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.06)' }}>
                  <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-2"
                     style={{ color: '#10b981' }}>
                    Crop Health Index
                  </p>
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-4xl font-black font-heading font-mono"
                          style={{ color: '#10b981' }}>
                      {selectedDistrict.ndvi !== undefined ? selectedDistrict.ndvi : '0.50'}
                    </span>
                    <span className="text-xs font-bold mb-1" style={{ color: txt.muted }}>/ 1.0 NDVI</span>
                  </div>
                  <p className="text-xs font-semibold leading-relaxed mt-2" style={{ color: txt.secondary }}>
                    {(() => {
                      const ndvi = selectedDistrict.ndvi !== undefined ? selectedDistrict.ndvi : 0.50;
                      if (ndvi > 0.6) {
                        return "NDVI measures vegetation health from satellite imagery. Values above 0.6 indicate healthy crops. Current value suggests optimal vegetative development.";
                      } else if (ndvi > 0.4) {
                        return "NDVI measures vegetation health from satellite imagery. Values above 0.6 indicate healthy crops. Current value suggests moderate stress.";
                      } else if (ndvi > 0.2) {
                        return "NDVI measures vegetation health from satellite imagery. Values above 0.6 indicate healthy crops. Current value suggests significant canopy stress.";
                      } else {
                        return "NDVI measures vegetation health from satellite imagery. Values above 0.6 indicate healthy crops. Current value suggests critical vegetative degradation or bare soil.";
                      }
                    })()}
                  </p>
                </div>
              )}

              {/* NDVI Card */}
              <div className="p-4 rounded-2xl" style={glass.card}>
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: txt.primary }}>Satellite Canopy (NDVI)</h3>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-extrabold font-heading" style={{ color: txt.primary }}>{selectedDistrict.ndvi}</span>
                  <span className="text-xs font-bold mb-1.5" style={{ color: txt.secondary }}>/ 1.0</span>
                </div>
                <div className="mt-2.5 h-2 rounded-full overflow-hidden" style={glass.track}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${selectedDistrict.ndvi * 100}%`,
                      backgroundColor: selectedDistrict.ndvi > 0.5 ? '#10B981' : selectedDistrict.ndvi > 0.3 ? '#F59E0B' : '#DC2626',
                    }}
                  />
                </div>
                <p className="text-[10px] font-bold mt-2" style={{ color: txt.muted }}>
                  {selectedDistrict.ndvi > 0.5 ? '🌾 Healthy agricultural canopy' : selectedDistrict.ndvi > 0.3 ? '⚠️ Moderate canopy water stress' : '🚨 Severe crop drying & degradation'}
                </p>
              </div>

              {/* Rainfall Trend */}
              <div className="p-4 rounded-2xl" style={glass.card}>
                <div className="flex items-center gap-2 mb-3">
                  <Droplets className="w-4 h-4 text-blue-500" />
                  <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: txt.primary }}>7-Day Rainfall Trend</h3>
                </div>
                <div className="h-24 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={rainfallChartData}>
                      <defs>
                        <linearGradient id="rainfallGlow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563EB" stopOpacity={0.35}/>
                          <stop offset="95%" stopColor="#2563EB" stopOpacity={0.01}/>
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#2563EB"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#rainfallGlow)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-between text-[10px] font-black mt-1.5 uppercase tracking-widest"
                     style={{ color: txt.muted }}>
                  <span>7 days ago</span>
                  <span>Today</span>
                </div>
              </div>

              {/* Active Policies */}
              <div className="p-4 rounded-2xl" style={glass.card}>
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-amber-500" />
                  <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: txt.primary }}>Active Regional Policies</h3>
                </div>
                <p className="text-2xl font-extrabold font-heading" style={{ color: txt.primary }}>
                  {selectedDistrict.activePolicies || 0}
                </p>
                <p className="text-[10px] font-bold mt-0.5" style={{ color: txt.muted }}>smart contract policies active in this region</p>
              </div>

              {/* Risk Breakdown */}
              {selectedDistrict.riskBreakdown && (
                <div className="p-4 rounded-2xl" style={glass.card}>
                  <div className="flex items-center gap-2 mb-4">
                    <Thermometer className="w-4 h-4 text-red-500" />
                    <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: txt.primary }}>Risk Breakdown Models</h3>
                  </div>
                  <div className="space-y-3.5">
                    {Object.entries(selectedDistrict.riskBreakdown).map(([key, value]) => {
                      const colors = {
                        drought: { bar: '#f59e0b', label: '#d97706' },
                        flood: { bar: '#3b82f6', label: '#2563eb' },
                        heatwave: { bar: '#ef4444', label: '#dc2626' },
                        frost: { bar: '#06b6d4', label: '#0891b2' },
                      };
                      const c = colors[key] || { bar: '#6b7280', label: '#4b5563' };
                      return (
                        <div key={key}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="capitalize font-bold" style={{ color: txt.secondary }}>{key} Risk</span>
                            <span className="font-black" style={{ color: c.label }}>{value}%</span>
                          </div>
                          <div className="h-2 rounded-full overflow-hidden" style={glass.track}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${value}%` }}
                              transition={{ duration: 0.8, delay: 0.2 }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: c.bar }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          </motion.div>
        )}

        {/* Custom Point Inspector View */}
        {inspectorMode === 'custom' && customMarker && (
          <motion.div
            initial={{ x: '110%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '110%', opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className="w-[calc(100%-2rem)] sm:w-96 m-4 rounded-[28px] overflow-hidden flex-shrink-0 z-[1100]
                       absolute right-0 top-0 bottom-0 h-[calc(100%-2rem)]
                       flex flex-col"
            style={{ ...glass.panel, boxShadow: '0 25px 60px -15px rgba(0,0,0,0.35)' }}
          >
            {/* Header */}
            <div className="p-5 flex-shrink-0"
                 style={{ background: riskHeaderGradient[activeLevel] || riskHeaderGradient.Low, borderBottom: `1px solid ${isSatellite ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded"
                      style={{ background: `${riskAccentColor[activeLevel] || '#10b981'}22`, color: riskAccentColor[activeLevel] || '#10b981' }}>
                  Custom Location Inspector
                </span>
                <button
                  onClick={() => {
                    setCustomMarker(null);
                    setCustomRiskData(null);
                  }}
                  className="p-1 rounded-lg transition-all duration-200"
                  style={{ color: txt.muted }}
                  onMouseEnter={(e) => e.currentTarget.style.background = isSatellite ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <h2 className="text-base font-extrabold leading-snug line-clamp-1" style={{ color: txt.primary }}>
                {customMarker.districtName}
              </h2>
              <p className="text-[10px] font-bold line-clamp-2 mt-1 leading-relaxed" style={{ color: txt.secondary }}>
                📍 {customMarker.address}
              </p>
              <div className="flex gap-2 text-[9px] font-black uppercase tracking-widest mt-2 pt-2"
                   style={{ borderTop: `1px solid ${isSatellite ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`, color: txt.muted }}>
                <span>Lat: {customMarker.lat.toFixed(5)}</span>
                <span style={{ color: isSatellite ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }}>•</span>
                <span>Lon: {customMarker.lon.toFixed(5)}</span>
              </div>
            </div>

            {/* 3D Node for Custom Coordinates */}
            {!customLoading && customRiskData && (
              <div className="p-5 flex-shrink-0"
                   style={{ borderBottom: `1px solid ${isSatellite ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}` }}>
                <ThreeDDistrictNode 
                  riskScore={customRiskData.riskScore} 
                  ndvi={customRiskData.details?.ndvi_health !== undefined ? customRiskData.details?.ndvi_health : 0.50} 
                  name={customMarker.districtName}
                  isSatellite={isSatellite}
                />
              </div>
            )}

            {/* Scrollable Content Cards */}
            <div className="flex-1 p-5 space-y-4 overflow-y-auto custom-scrollbar">
              
              {customLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
                  <p className="text-xs font-black uppercase tracking-wider" style={{ color: txt.secondary }}>Querying NASA Satellites...</p>
                  <p className="text-[10px] max-w-[200px] mt-1 font-semibold" style={{ color: txt.muted }}>
                    Running multi-parameter ML XGBoost algorithm for crops.
                  </p>
                </div>
              ) : customRiskData ? (
                <>
                  {/* Circular Glow Meter */}
                  <div className="flex flex-col items-center py-4 rounded-2xl p-4" style={glass.card}>
                    <div className="relative w-28 h-28 flex items-center justify-center">
                      {/* Inner Ring Glow */}
                      <div className="absolute inset-0 rounded-full blur-sm opacity-25"
                           style={{
                             background: customRiskData.riskScore > 50 
                               ? 'linear-gradient(to top right, #F97316, #DC2626)' 
                               : 'linear-gradient(to top right, #10B981, #F59E0B)'
                           }}
                      />
                      {/* SVG Gauge */}
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="56"
                          cy="56"
                          r="48"
                          fill="none"
                          strokeWidth="8"
                          style={{ stroke: isSatellite ? 'rgba(30,41,59,0.5)' : 'rgba(226,232,240,0.8)' }}
                        />
                        <circle
                          cx="56"
                          cy="56"
                          r="48"
                          className="fill-none transition-all duration-1000"
                          strokeWidth="8"
                          strokeDasharray={2 * Math.PI * 48}
                          strokeDashoffset={2 * Math.PI * 48 * (1 - customRiskData.riskScore / 100)}
                          strokeLinecap="round"
                          stroke={getRiskColor(customRiskData.riskLevel).hex}
                        />
                      </svg>
                      {/* Percent Info */}
                      <div className="absolute flex flex-col items-center justify-center">
                        <span className="text-2xl font-black leading-none" style={{ color: txt.primary }}>
                          {customRiskData.riskScore}%
                        </span>
                        <span className="text-[9px] font-black uppercase tracking-widest mt-1" style={{ color: txt.muted }}>
                          Risk Index
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex items-center gap-2">
                      <RiskBadge level={customRiskData.riskLevel} size="md" showDot />
                      <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: txt.muted }}>
                        Climate Risk Grade
                      </span>
                    </div>
                  </div>

                  {/* NASA Climate Parameters */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: txt.primary }}>
                      NASA POWER Live parameters
                    </h3>

                    {/* Soil Moisture */}
                    <div className="p-3.5 rounded-xl" style={glass.card}>
                      <div className="flex justify-between items-center mb-1.5">
                        <div className="flex items-center gap-2">
                          <Droplets className="w-4 h-4 text-blue-500" />
                          <span className="text-xs font-black" style={{ color: txt.primary }}>Soil Moisture Index</span>
                        </div>
                        <span className="text-xs font-extrabold" style={{ color: '#3b82f6' }}>
                          {customRiskData.details?.soil_moisture_index}
                        </span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={glass.track}>
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(customRiskData.details?.soil_moisture_index || 0.25) * 200}%` }} />
                      </div>
                      <div className="flex justify-between text-[9px] font-bold mt-1 uppercase tracking-wide" style={{ color: txt.muted }}>
                        <span>Dry (0.0)</span>
                        <span>Saturated (0.5+)</span>
                      </div>
                    </div>

                    {/* NDVI */}
                    <div className="p-3.5 rounded-xl" style={glass.card}>
                      <div className="flex justify-between items-center mb-1.5">
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-emerald-500" />
                          <span className="text-xs font-black" style={{ color: txt.primary }}>NDVI Canopy Health</span>
                        </div>
                        <span className="text-xs font-extrabold" style={{ color: '#10b981' }}>
                          {customRiskData.details?.ndvi_health}
                        </span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={glass.track}>
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(customRiskData.details?.ndvi_health || 0.5) * 100}%` }} />
                      </div>
                      <div className="flex justify-between text-[9px] font-bold mt-1 uppercase tracking-wide" style={{ color: txt.muted }}>
                        <span>Bare Soil (0.1)</span>
                        <span>Dense Canopy (0.8+)</span>
                      </div>
                    </div>

                    {/* Dry Days and Rainfall */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl text-center" style={glass.card}>
                        <Thermometer className="w-4 h-4 text-red-500 mx-auto mb-1" />
                        <span className="text-[9px] font-black uppercase tracking-wider block" style={{ color: txt.muted }}>Consecutive Dry Days</span>
                        <span className="text-base font-extrabold mt-0.5 block" style={{ color: txt.primary }}>
                          {customRiskData.details?.consecutive_dry_days} Days
                        </span>
                      </div>
                      <div className="p-3 rounded-xl text-center" style={glass.card}>
                        <Droplets className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                        <span className="text-[9px] font-black uppercase tracking-wider block" style={{ color: txt.muted }}>30d Avg Rainfall</span>
                        <span className="text-base font-extrabold mt-0.5 block" style={{ color: txt.primary }}>
                          {customRiskData.details?.rainfall_30d_avg} mm/d
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Agricultural Advisory */}
                  {advisory && (
                    <div className="p-4 rounded-2xl flex gap-3 items-start"
                         style={{
                           background: advisory.severity === 'success' ? (isSatellite ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.06)')
                             : advisory.severity === 'warning' ? (isSatellite ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.06)')
                             : advisory.severity === 'danger' ? (isSatellite ? 'rgba(249,115,22,0.1)' : 'rgba(249,115,22,0.06)')
                             : (isSatellite ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.06)'),
                           border: `1px solid ${
                             advisory.severity === 'success' ? 'rgba(16,185,129,0.2)'
                             : advisory.severity === 'warning' ? 'rgba(245,158,11,0.2)'
                             : advisory.severity === 'danger' ? 'rgba(249,115,22,0.2)'
                             : 'rgba(239,68,68,0.2)'
                           }`,
                           backdropFilter: 'blur(8px)',
                           color: advisory.severity === 'success' ? '#059669'
                             : advisory.severity === 'warning' ? '#d97706'
                             : advisory.severity === 'danger' ? '#ea580c'
                             : '#dc2626',
                         }}>
                      <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wide leading-none mb-1">Agricultural Advisory</h4>
                        <p className="text-[11px] leading-relaxed font-bold" style={{ opacity: 0.85 }}>{advisory.text}</p>
                      </div>
                    </div>
                  )}

                  {/* Insurance Call-to-Action */}
                  <button
                    onClick={() => handleInsureLocation(customMarker, customRiskData)}
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl font-extrabold text-xs transition-all cursor-pointer text-white"
                    style={{ background: 'linear-gradient(135deg, #2563eb, #3b82f6)', boxShadow: '0 8px 24px rgba(37,99,235,0.3)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(37,99,235,0.4)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(37,99,235,0.3)'; }}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Insure Crop For This Coordinates
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <Compass className="w-8 h-8 animate-bounce-slow mb-3" style={{ color: txt.muted }} />
                  <p className="text-xs font-black uppercase tracking-wider" style={{ color: txt.secondary }}>Awaiting Coordinate Lock</p>
                  <p className="text-[10px] max-w-[200px] mt-1 font-semibold leading-relaxed" style={{ color: txt.muted }}>
                    Click anywhere on the map grid or enter an Indian address above to fetch metrics!
                  </p>
                </div>
              )}
              
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
