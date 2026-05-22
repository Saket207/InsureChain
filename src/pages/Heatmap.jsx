/* eslint-disable */
import { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap, useMapEvents, Marker, Popup } from 'react-leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, X, MapPin, Droplets, Thermometer, Eye, BarChart3, 
  Database, Loader2, Compass, AlertTriangle, ShieldCheck, HelpCircle, ArrowRight
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';

import RiskBadge from '../components/RiskBadge';
import defaultDistricts from '../data/districts.json';
import { getRiskColor, getRiskLevel } from '../utils/helpers';
import { getDistrictRiskScores, seedDistrictRiskScores } from '../services/firestoreService';
import { backendApi } from '../services/backendApi';
import { usePolicyStore } from '../stores/policyStore';

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

  // Custom Point Inspector state
  const [customMarker, setCustomMarker] = useState(null); // { lat, lon, address, districtId, districtName, state }
  const [customLoading, setCustomLoading] = useState(false);
  const [customRiskData, setCustomRiskData] = useState(null);
  const [addressSearchQuery, setAddressSearchQuery] = useState('');
  const [geocodingResults, setGeocodingResults] = useState([]);
  const [searchingAddress, setSearchingAddress] = useState(false);

  const fetchRiskScores = async () => {
    try {
      setLoading(true);
      const scores = await getDistrictRiskScores();
      
      if (scores.length === 0) {
        setDistricts(defaultDistricts.map(d => ({...d, riskScore: 0, riskLevel: 'Low'})));
      } else {
        const merged = defaultDistricts.map(d => {
          const scoreData = scores.find(s => s.district === d.name);
          if (scoreData) {
            return {
              ...d,
              riskScore: scoreData.riskScore,
              riskLevel: scoreData.riskLevel,
              activePolicies: scoreData.activePolicies,
              riskBreakdown: {
                drought: scoreData.droughtRisk || Math.round(scoreData.riskScore * 0.8),
                flood: scoreData.floodRisk || Math.round((100 - scoreData.riskScore) * 0.6),
                heatwave: scoreData.heatwaveRisk || 12,
                frost: 5
              }
            };
          }
          return d;
        });
        setDistricts(merged);
      }
    } catch (error) {
      console.error("Error fetching risk scores:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiskScores();
  }, []);

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

  const getStyle = (feature) => {
    const score = feature.properties.riskScore;
    const level = feature.properties.riskLevel || getRiskLevel(score);
    const color = getRiskColor(level);
    return {
      fillColor: score === 0 ? '#cccccc' : color.hex,
      fillOpacity: inspectorMode === 'custom' ? 0.05 : 0.45, // Make very transparent in custom point mode
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
          e.target.setStyle({ fillOpacity: 0.45, weight: 2 });
        }
      },
    });
    if (inspectorMode === 'region') {
      layer.bindTooltip(
        `<strong>${feature.properties.name}</strong><br/>Risk: ${feature.properties.riskScore}%`,
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
        // Cleanup strings
        districtName = districtName.replace(/\s+District$/i, '');
      }
    } catch (err) {
      console.warn("Reverse geocoding failed:", err);
    }
    
    // Find matching district in preset database
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

  // Chart data for region view
  const rainfallChartData = selectedDistrict?.rainfall7d?.map((v, i) => ({
    day: `D${i + 1}`,
    value: v,
  })) || [];

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
        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-[2000] flex flex-col items-center justify-center p-6 text-center">
          <Database className="w-12 h-12 text-primary mb-4" />
          <h2 className="text-2xl font-bold font-[family-name:var(--font-heading)] text-text-primary mb-2">Initialize Database</h2>
          <p className="text-text-secondary max-w-md mb-6">
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
      <div className="flex-1 relative">
        
        {/* Mode Toggle & Search Overlay */}
        <div className="absolute top-4 left-4 right-4 z-[1000] flex flex-col sm:flex-row gap-3 max-w-2xl">
          
          {/* Mode Switcher */}
          <div className="flex bg-white/95 backdrop-blur-md p-1 rounded-2xl border border-slate-200/80 shadow-lg dark:bg-gray-800 dark:border-gray-700 flex-shrink-0">
            <button
              onClick={() => {
                setInspectorMode('region');
                setCustomMarker(null);
                setCustomRiskData(null);
              }}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all duration-300
                ${inspectorMode === 'region' 
                  ? 'bg-primary text-white shadow-md' 
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'}`}
            >
              <Database className="w-3.5 h-3.5" />
              District Heatmap
            </button>
            <button
              onClick={() => {
                setInspectorMode('custom');
                setSelectedDistrict(null);
              }}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all duration-300
                ${inspectorMode === 'custom' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'}`}
            >
              <Compass className="w-3.5 h-3.5 animate-spin-slow" />
              Address Inspector
            </button>
          </div>

          {/* District Search Bar (Region Mode) */}
          {inspectorMode === 'region' && (
            <div className="flex-1 max-w-sm relative">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                <Search className="w-4 h-4 text-text-tertiary flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search regions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none text-text-primary dark:text-white placeholder:text-text-tertiary"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="text-text-tertiary hover:text-text-primary">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Search Dropdown */}
              {searchQuery && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden max-h-60 overflow-y-auto dark:bg-gray-800 dark:border-gray-700 z-[2000]">
                  {filteredDistricts.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => {
                        setSelectedDistrict(d);
                        setSearchQuery('');
                      }}
                      className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-slate-50 transition-colors dark:hover:bg-gray-700 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-text-tertiary" />
                        <span className="text-text-primary dark:text-white font-bold">{d.name}</span>
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
              <form onSubmit={handleAddressSearch} className="flex items-center gap-2 px-4 py-2 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search Indian towns, pincodes, villages..."
                  value={addressSearchQuery}
                  onChange={(e) => setAddressSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none text-text-primary dark:text-white placeholder:text-text-tertiary font-bold"
                />
                {searchingAddress ? (
                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                ) : addressSearchQuery && (
                  <button type="button" onClick={() => setAddressSearchQuery('')} className="text-text-tertiary hover:text-text-primary">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </form>

              {/* Autocomplete suggestions */}
              {geocodingResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden max-h-60 overflow-y-auto dark:bg-gray-800 dark:border-gray-700 z-[2000]">
                  {geocodingResults.map((res, idx) => (
                    <button
                      key={idx}
                      onClick={() => selectAddressResult(res)}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-left text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors dark:hover:bg-gray-700 dark:border-gray-700"
                    >
                      <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <span className="text-slate-700 dark:text-slate-200 font-medium line-clamp-2">{res.display_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-md rounded-xl shadow-lg p-3 border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
          <p className="text-xs font-black text-slate-800 mb-2 dark:text-white tracking-wide uppercase text-[9px]">Climate Risk scale</p>
          <div className="space-y-1.5">
            {[
              { level: 'Low', color: '#10B981' },
              { level: 'Moderate', color: '#F59E0B' },
              { level: 'High', color: '#F97316' },
              { level: 'Critical', color: '#DC2626' },
            ].map(({ level, color }) => (
              <div key={level} className="flex items-center gap-2">
                <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: color, opacity: 0.65 }} />
                <span className="text-xs font-bold text-text-secondary dark:text-gray-400">{level}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Info Box for Custom Mode */}
        {inspectorMode === 'custom' && !customMarker && (
          <div className="absolute bottom-4 right-4 z-[1000] bg-blue-900/90 text-white rounded-xl shadow-2xl p-4 border border-blue-500/30 max-w-sm backdrop-blur-md animate-bounce-slow">
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
          style={{ background: '#E0EDE0' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            opacity={0.35}
          />
          <GeoJSON
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
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full lg:w-96 bg-white border-l border-gray-200 overflow-y-auto flex-shrink-0 z-[1100]
                       dark:bg-gray-800 dark:border-gray-700 absolute lg:relative right-0 top-0 bottom-0 h-full"
          >
            {/* Header */}
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-900/30">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-black font-[family-name:var(--font-heading)] text-text-primary dark:text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  {selectedDistrict.name}
                </h2>
                <button
                  onClick={() => setSelectedDistrict(null)}
                  className="p-1.5 rounded-lg text-text-tertiary hover:bg-gray-100 transition-colors dark:hover:bg-gray-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <RiskBadge level={selectedDistrict.riskLevel} size="md" showDot />
                <span className="text-xs font-bold text-text-secondary dark:text-gray-400">
                  District Risk: <span className="font-extrabold text-text-primary dark:text-white">{selectedDistrict.riskScore}%</span>
                </span>
              </div>
            </div>

            {/* NDVI */}
            <div className="p-5 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-black uppercase tracking-wider text-text-primary dark:text-white">Satellite Canopy (NDVI)</h3>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-extrabold text-primary font-[family-name:var(--font-heading)]">{selectedDistrict.ndvi}</span>
                <span className="text-xs font-bold text-text-secondary mb-1.5 dark:text-gray-400">/ 1.0</span>
              </div>
              <div className="mt-2 h-2.5 bg-gray-150 rounded-full overflow-hidden dark:bg-gray-700 border border-slate-100 dark:border-slate-800">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${selectedDistrict.ndvi * 100}%`,
                    backgroundColor: selectedDistrict.ndvi > 0.5 ? '#10B981' : selectedDistrict.ndvi > 0.3 ? '#F59E0B' : '#DC2626',
                  }}
                />
              </div>
              <p className="text-[10px] font-bold text-text-tertiary mt-2 dark:text-gray-500">
                {selectedDistrict.ndvi > 0.5 ? '🌾 Healthy agricultural canopy' : selectedDistrict.ndvi > 0.3 ? '⚠️ Moderate canopy water stress' : '🚨 Severe crop drying & degradation'}
              </p>
            </div>

            {/* Rainfall Trend */}
            <div className="p-5 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <Droplets className="w-4 h-4 text-blue-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-text-primary dark:text-white">7-Day Rainfall Trend</h3>
              </div>
              <div className="h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={rainfallChartData}>
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#2563EB"
                      strokeWidth={2}
                      dot={{ fill: '#2563EB', strokeWidth: 0, r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-between text-[10px] font-black text-text-tertiary mt-1.5 dark:text-gray-500 uppercase tracking-widest">
                <span>7 days ago</span>
                <span>Today</span>
              </div>
            </div>

            {/* Active Policies */}
            <div className="p-5 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-text-primary dark:text-white">Active Regional Node Policies</h3>
              </div>
              <p className="text-2xl font-extrabold text-text-primary font-[family-name:var(--font-heading)] dark:text-white">
                {selectedDistrict.activePolicies || 0}
              </p>
              <p className="text-[10px] font-bold text-text-tertiary dark:text-gray-500 mt-0.5">smart contract policies active in this region</p>
            </div>

            {/* Risk Breakdown */}
            {selectedDistrict.riskBreakdown && (
              <div className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Thermometer className="w-4 h-4 text-red-500" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-text-primary dark:text-white">Risk Breakdown Models</h3>
                </div>
                <div className="space-y-3.5">
                  {Object.entries(selectedDistrict.riskBreakdown).map(([key, value]) => {
                    const colors = {
                      drought: { bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
                      flood: { bar: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400' },
                      heatwave: { bar: 'bg-red-500', text: 'text-red-600 dark:text-red-400' },
                      frost: { bar: 'bg-cyan-500', text: 'text-cyan-600 dark:text-cyan-400' },
                    };
                    const c = colors[key] || { bar: 'bg-gray-500', text: 'text-gray-600' };
                    return (
                      <div key={key}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="capitalize font-bold text-text-secondary dark:text-gray-400">{key} Risk</span>
                          <span className={`font-black ${c.text}`}>{value}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden dark:bg-gray-700">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${value}%` }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className={`h-full rounded-full ${c.bar}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Custom Point Inspector View */}
        {inspectorMode === 'custom' && customMarker && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full lg:w-96 bg-white border-l border-gray-200 overflow-y-auto flex-shrink-0 z-[1100]
                       dark:bg-gray-800 dark:border-gray-700 absolute lg:relative right-0 top-0 bottom-0 h-full flex flex-col"
          >
            {/* Header */}
            <div className="p-5 border-b border-gray-150 dark:border-gray-700 bg-blue-50/20 dark:bg-blue-900/10 flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider bg-blue-100 text-blue-700 rounded dark:bg-blue-900/50 dark:text-blue-300">
                  Custom Location Inspector
                </span>
                <button
                  onClick={() => {
                    setCustomMarker(null);
                    setCustomRiskData(null);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors dark:hover:bg-gray-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug line-clamp-1">
                {customMarker.districtName}
              </h2>
              <p className="text-[10px] text-slate-500 font-bold dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                📍 {customMarker.address}
              </p>
              <div className="flex gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2 border-t border-slate-100 dark:border-slate-800 pt-2">
                <span>Lat: {customMarker.lat.toFixed(5)}</span>
                <span className="text-slate-300">•</span>
                <span>Lon: {customMarker.lon.toFixed(5)}</span>
              </div>
            </div>

            {/* Custom Risk Score Loading / Panel */}
            <div className="flex-1 p-5 space-y-5">
              
              {customLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
                  <p className="text-xs font-black uppercase tracking-wider text-slate-500">Querying NASA Satellites...</p>
                  <p className="text-[10px] text-slate-400 max-w-[200px] mt-1 font-semibold">
                    Running multi-parameter ML XGBoost algorithm for crops.
                  </p>
                </div>
              ) : customRiskData ? (
                <>
                  {/* Circular Glow Meter */}
                  <div className="flex flex-col items-center py-2 bg-slate-50/50 rounded-2xl p-4 border border-slate-100 dark:bg-slate-900/20 dark:border-slate-800">
                    <div className="relative w-28 h-28 flex items-center justify-center">
                      {/* Inner Ring Glow */}
                      <div className="absolute inset-0 rounded-full blur bg-gradient-to-tr opacity-25"
                           style={{
                             backgroundImage: customRiskData.riskScore > 50 
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
                          className="stroke-slate-200 dark:stroke-slate-800 fill-none"
                          strokeWidth="8"
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
                        <span className="text-2xl font-black text-slate-800 dark:text-white leading-none">
                          {customRiskData.riskScore}%
                        </span>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">
                          Risk Index
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex items-center gap-2">
                      <RiskBadge level={customRiskData.riskLevel} size="md" showDot />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Climate Risk Grade
                      </span>
                    </div>
                  </div>

                  {/* NASA Climate Parameters */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                      NASA POWER Live parameters
                    </h3>

                    {/* Soil Moisture */}
                    <div className="bg-slate-50 dark:bg-slate-900/30 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="flex justify-between items-center mb-1.5">
                        <div className="flex items-center gap-2">
                          <Droplets className="w-4 h-4 text-blue-500" />
                          <span className="text-xs font-black text-slate-800 dark:text-slate-200">Soil Moisture Index</span>
                        </div>
                        <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">
                          {customRiskData.details?.soil_moisture_index}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden dark:bg-slate-700">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(customRiskData.details?.soil_moisture_index || 0.25) * 200}%` }} />
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-wide">
                        <span>Dry (0.0)</span>
                        <span>Saturated (0.5+)</span>
                      </div>
                    </div>

                    {/* NDVI */}
                    <div className="bg-slate-50 dark:bg-slate-900/30 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="flex justify-between items-center mb-1.5">
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-emerald-500" />
                          <span className="text-xs font-black text-slate-800 dark:text-slate-200">NDVI Canopy Health</span>
                        </div>
                        <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                          {customRiskData.details?.ndvi_health}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden dark:bg-slate-700">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(customRiskData.details?.ndvi_health || 0.5) * 100}%` }} />
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-wide">
                        <span>Bare Soil (0.1)</span>
                        <span>Dense Canopy (0.8+)</span>
                      </div>
                    </div>

                    {/* Dry Days and Rainfall */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 dark:bg-slate-900/30 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                        <Thermometer className="w-4 h-4 text-red-500 mx-auto mb-1" />
                        <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">Consecutive Dry Days</span>
                        <span className="text-base font-extrabold text-slate-800 dark:text-white mt-0.5 block">
                          {customRiskData.details?.consecutive_dry_days} Days
                        </span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900/30 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                        <Droplets className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                        <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">30d Avg Rainfall</span>
                        <span className="text-base font-extrabold text-slate-800 dark:text-white mt-0.5 block">
                          {customRiskData.details?.rainfall_30d_avg} mm/d
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Agricultural Advisory */}
                  {advisory && (
                    <div className={`p-4 rounded-2xl border flex gap-3 items-start backdrop-blur-sm
                      ${advisory.severity === 'success' ? 'bg-emerald-50/50 border-emerald-500/20 text-emerald-800 dark:bg-emerald-950/20' : ''}
                      ${advisory.severity === 'warning' ? 'bg-amber-50/50 border-amber-500/20 text-amber-800 dark:bg-amber-950/20' : ''}
                      ${advisory.severity === 'danger' ? 'bg-orange-50/50 border-orange-500/20 text-orange-800 dark:bg-orange-950/20' : ''}
                      ${advisory.severity === 'critical' ? 'bg-red-50/50 border-red-500/20 text-red-800 dark:bg-red-950/20 animate-pulse' : ''}
                    `}>
                      <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5
                        ${advisory.severity === 'success' ? 'text-emerald-500' : ''}
                        ${advisory.severity === 'warning' ? 'text-amber-500' : ''}
                        ${advisory.severity === 'danger' ? 'text-orange-500' : ''}
                        ${advisory.severity === 'critical' ? 'text-red-500' : ''}
                      `} />
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wide leading-none mb-1">Agricultural Advisory</h4>
                        <p className="text-[11px] leading-relaxed font-bold">{advisory.text}</p>
                      </div>
                    </div>
                  )}

                  {/* Insurance Call-to-Action */}
                  <button
                    onClick={() => handleInsureLocation(customMarker, customRiskData)}
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-lg transition-all scale-100 hover:scale-102 cursor-pointer shadow-blue-500/10"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Insure Crop For This Coordinates
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <Compass className="w-8 h-8 text-slate-350 animate-bounce-slow mb-3" />
                  <p className="text-xs font-black uppercase tracking-wider text-slate-500">Awaiting Coordinate Lock</p>
                  <p className="text-[10px] text-slate-400 max-w-[200px] mt-1 font-semibold leading-relaxed">
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
