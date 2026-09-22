/**
 * Truncate an Ethereum wallet address for display.
 * e.g. 0x3f8a2B7c9D4e1F6a...2c4d → 0x3f8a...2c4d
 */
export function truncateAddress(address, startLen = 6, endLen = 4) {
  if (!address) return '';
  return `${address.slice(0, startLen)}...${address.slice(-endLen)}`;
}

/**
 * Format a number as Indian Rupees
 */
export function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a date string to a readable format
 */
export function formatDate(date) {
  if (!date) return '—';
  
  // Handle Firestore Timestamp
  const d = date.toDate ? date.toDate() : new Date(date);
  
  if (isNaN(d.getTime())) return '—';

  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format relative time (e.g. "2 days ago")
 */
export function timeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return formatDate(dateString);
}

/**
 * Calculate premium based on the formula:
 * Premium = Base Rate × Regional Risk Multiplier × Season Factor × Coverage Multiplier
 */
export function calculatePremium({ district, season, triggers }) {
  const baseRate = 500;

  // Regional risk multiplier (1.0 – 2.5 based on district risk score)
  const riskScore = district?.riskScore || 50;
  const regionalRiskMultiplier = 1.0 + (riskScore / 100) * 1.5;

  // Season factor
  const seasonFactor = season === 'Kharif' ? 1.2 : 1.0;

  // Coverage multiplier based on number of triggers selected
  const coverageMultipliers = { 0: 0, 1: 1.0, 2: 1.3, 3: 1.5, 4: 1.8, 5: 2.0, 6: 2.2, 7: 2.4, 8: 2.6 };
  const coverageMultiplier = coverageMultipliers[triggers.length] || 1.0;

  const premium = Math.round(baseRate * regionalRiskMultiplier * seasonFactor * coverageMultiplier);
  const coverage = premium * 10; // Simple coverage model: 10x the premium

  return {
    premium,
    coverage,
    breakdown: {
      baseRate,
      regionalRiskMultiplier: +regionalRiskMultiplier.toFixed(2),
      seasonFactor,
      coverageMultiplier,
    },
  };
}

/**
 * Get trigger color class
 */
export function getTriggerColor(trigger) {
  const colors = {
    drought: { bg: 'bg-amber-100/90', text: 'text-amber-900', border: 'border-amber-300', dot: 'bg-amber-600' },
    flood: { bg: 'bg-blue-100/90', text: 'text-blue-900', border: 'border-blue-300', dot: 'bg-blue-600' },
    heatwave: { bg: 'bg-red-100/90', text: 'text-red-900', border: 'border-red-300', dot: 'bg-red-600' },
    frost: { bg: 'bg-sky-100/90', text: 'text-sky-900', border: 'border-sky-300', dot: 'bg-sky-600' },
    pest: { bg: 'bg-emerald-100/90', text: 'text-emerald-900', border: 'border-emerald-300', dot: 'bg-emerald-600' },
    hail: { bg: 'bg-indigo-100/90', text: 'text-indigo-900', border: 'border-indigo-300', dot: 'bg-indigo-600' },
    unseasonal_rain: { bg: 'bg-teal-100/90', text: 'text-teal-900', border: 'border-teal-300', dot: 'bg-teal-600' },
    cyclone: { bg: 'bg-rose-100/90', text: 'text-rose-900', border: 'border-rose-300', dot: 'bg-rose-600' },
  };
  return colors[trigger] || colors.drought;
}

/**
 * Get status styling
 */
export function getStatusStyle(status) {
  const styles = {
    Active: { bg: 'bg-emerald-100/90', text: 'text-emerald-900', dot: 'bg-emerald-600' },
    Triggered: { bg: 'bg-red-100/90', text: 'text-red-900', dot: 'bg-red-600' },
    Expired: { bg: 'bg-slate-200/90', text: 'text-slate-900', dot: 'bg-slate-600' },
    'Pending Payout': { bg: 'bg-amber-100/90', text: 'text-amber-900', dot: 'bg-amber-600' },
    PaidOut: { bg: 'bg-emerald-200/95', text: 'text-emerald-950', dot: 'bg-emerald-700' },
  };
  return styles[status] || styles.Active;
}

/**
 * Get risk level color
 */
export function getRiskColor(level) {
  const colors = {
    Low: { bg: 'bg-emerald-100/90', text: 'text-emerald-900', hex: '#047857' },
    Moderate: { bg: 'bg-yellow-100/90', text: 'text-yellow-900', hex: '#B45309' },
    High: { bg: 'bg-orange-100/90', text: 'text-orange-900', hex: '#C2410C' },
    Critical: { bg: 'bg-red-100/90', text: 'text-red-900', hex: '#B91C1C' },
  };
  return colors[level] || colors.Low;
}

/**
 * Get risk level from a numeric score
 */
export function getRiskLevel(score) {
  if (score >= 75) return 'Critical';
  if (score >= 55) return 'High';
  if (score >= 35) return 'Moderate';
  return 'Low';
}

/**
 * Get alert type styling
 */
export function getAlertTypeStyle(type) {
  const styles = {
    early_warning: { bg: 'bg-amber-100/90', border: 'border-amber-300', icon: 'text-amber-800', label: 'Early Warning' },
    trigger_fired: { bg: 'bg-red-100/90', border: 'border-red-300', icon: 'text-red-800', label: 'Trigger Fired' },
    payout_confirmed: { bg: 'bg-emerald-100/90', border: 'border-emerald-300', icon: 'text-emerald-800', label: 'Payout Confirmed' },
    policy_expiry: { bg: 'bg-slate-200/90', border: 'border-slate-300', icon: 'text-slate-800', label: 'Policy Expiry' },
  };
  return styles[type] || styles.early_warning;
}

/**
 * Convert an INR amount to descriptive text for emails and payout summaries
 * e.g. 5000 => "Five Thousand Rupees"
 */
export function amountInWords(amount) {
  if (!amount || amount <= 0) return 'Zero Rupees';
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const num = Math.round(amount);
  if (num < 20) return ones[num] + ' Rupees';
  if (num < 100) return (tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '')) + ' Rupees';
  if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' and ' + amountInWords(num % 100).replace(' Rupees', '') : '') + ' Rupees';
  if (num < 100000) return amountInWords(Math.floor(num / 1000)).replace(' Rupees', '') + ' Thousand' + (num % 1000 ? ' ' + amountInWords(num % 1000).replace(' Rupees', '') : '') + ' Rupees';
  if (num < 10000000) return amountInWords(Math.floor(num / 100000)).replace(' Rupees', '') + ' Lakh' + (num % 100000 ? ' ' + amountInWords(num % 100000).replace(' Rupees', '') : '') + ' Rupees';
  return amountInWords(Math.floor(num / 10000000)).replace(' Rupees', '') + ' Crore' + (num % 10000000 ? ' ' + amountInWords(num % 10000000).replace(' Rupees', '') : '') + ' Rupees';
}

/**
 * Generate a descriptive payout sentence for farmer-facing communication
 */
export function payoutDescription(amountINR, triggerType, district) {
  const triggerLabels = {
    drought: 'drought condition',
    flood: 'flood disaster',
    heatwave: 'extreme heatwave',
    frost: 'frost damage',
    pest: 'pest infestation',
    hail: 'hailstorm damage',
    unseasonal_rain: 'unseasonal rainfall',
    cyclone: 'cyclone event',
  };
  const triggerDesc = triggerLabels[triggerType] || triggerType || 'weather calamity';
  return `${formatINR(amountINR)} (${amountInWords(amountINR)}) has been disbursed as crop protection incentive to the farmer for ${triggerDesc} in ${district || 'the registered district'}. This autonomous payout was triggered by InsureChain's parametric oracle system — no claims process required.`;
}

/**
 * Generate a deterministic pseudo-random risk profile based on the district name.
 * Used as a fallback when the backend or Firestore is offline.
 */
export function generateMockRisk(districtId) {
  if (!districtId) districtId = 'unknown';
  
  // Simple string hash
  let hash = 0;
  for (let i = 0; i < districtId.length; i++) {
    hash = ((hash << 5) - hash) + districtId.charCodeAt(i);
    hash |= 0; 
  }
  
  // Map hash to a risk score between 25 and 85
  const normalized = Math.abs(hash) % 61; 
  const riskScore = 25 + normalized;
  
  const riskLevel = getRiskLevel(riskScore);
  const riskMultiplier = 1.0 + (riskScore / 100) * 1.5;

  // Pseudo-randomly distribute the transparency impact percentages
  const drought = 10 + (Math.abs(hash * 2) % 25);
  const flood = 5 + (Math.abs(hash * 3) % 20);
  const sat = 10 + (Math.abs(hash * 5) % 15);
  const weather = 5 + (Math.abs(hash * 7) % 20);
  
  const total = drought + flood + sat + weather;
  const scale = 100 / total;

  return {
    district: districtId.charAt(0).toUpperCase() + districtId.slice(1),
    districtId: districtId,
    riskScore: riskScore,
    riskLevel: riskLevel,
    riskMultiplier: riskMultiplier,
    transparency: {
      drought_impact: `${Math.round(drought * scale)}%`,
      flood_impact: `${Math.round(flood * scale)}%`,
      satellite_impact: `${Math.round(sat * scale)}%`,
      weather_impact: `${Math.round(weather * scale)}%`
    },
    details: {
      soil_moisture_index: (0.1 + (Math.abs(hash) % 60) / 100).toFixed(2),
      ndvi_health: (0.3 + (Math.abs(hash * 3) % 50) / 100).toFixed(2),
      rainfall_30d_avg: (1.5 + (Math.abs(hash * 5) % 50) / 10).toFixed(1),
      consecutive_dry_days: Math.abs(hash * 7) % 15
    },
    computedAt: new Date().toISOString(),
    isOfflineData: true,
  };
}
