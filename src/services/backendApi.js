/**
 * InsureChain Frontend API Service
 * Connects the React UI to the Python Flask Backend.
 */

const API_BASE_URL = 'http://localhost:5000/api';
const API_KEY = 'insurechain-api-key-2026';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${API_KEY}`,
});

export const backendApi = {
  /**
   * Health & Diagnostics
   */
  getHealth: async () => {
    const resp = await fetch(`${API_BASE_URL}/health`);
    return resp.json();
  },

  /**
   * Risk & Premiums
   */
  getRiskScores: async (season = 'Kharif') => {
    const resp = await fetch(`${API_BASE_URL}/risk-scores?season=${season}`, {
      headers: getHeaders(),
    });
    return resp.json();
  },

  getDistrictRisk: async (districtId, lat = null, lon = null, season = 'Kharif') => {
    try {
      let url = `${API_BASE_URL}/risk-scores/${districtId}?season=${season}`;
      if (lat && lon) {
        url += `&lat=${lat}&lon=${lon}`;
      }
      console.log(`[API] Fetching risk for: ${districtId} at ${lat},${lon}`);
      const resp = await fetch(url, {
        headers: getHeaders(),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      console.log(`[API] Risk Data received:`, data);
      return data;
    } catch (err) {
      console.error(`[API] Failed to fetch risk for ${districtId}:`, err);
      return { error: true, message: err.message };
    }
  },

  calculatePremium: async (districtId, triggers, season = 'Kharif') => {
    const triggerStr = triggers.join(',');
    const resp = await fetch(
      `${API_BASE_URL}/premium-calculate?district=${districtId}&triggers=${triggerStr}&season=${season}`,
      { headers: getHeaders() }
    );
    return resp.json();
  },

  /**
   * Weather & Satellite
   */
  getWeatherData: async (districtId, days = 7, lat = null, lon = null) => {
    try {
      let url = `${API_BASE_URL}/weather/${districtId}?days=${days}`;
      if (lat && lon) {
        url += `&lat=${lat}&lon=${lon}`;
      }
      const resp = await fetch(url, {
        headers: getHeaders(),
      });
      return resp.json();
    } catch (error) {
      console.error(`[API] Failed to fetch weather for ${districtId}:`, error);
      throw error;
    }
  },

  getNdviData: async (districtId) => {
    const resp = await fetch(`${API_BASE_URL}/ndvi/${districtId}`, {
      headers: getHeaders(),
    });
    return resp.json();
  },

  /**
   * Trigger Analysis
   */
  checkTriggers: async (lat, lon, districtId) => {
    const resp = await fetch(`${API_BASE_URL}/trigger-check`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ lat, lon, district: districtId }),
    });
    return resp.json();
  },

  getTriggerHistory: async (districtId) => {
    const resp = await fetch(`${API_BASE_URL}/trigger-history/${districtId}`, {
      headers: getHeaders(),
    });
    return resp.json();
  },

  getNationalAlerts: async () => {
    const resp = await fetch(`${API_BASE_URL}/national-alerts`, {
      headers: getHeaders(),
    });
    return resp.json();
  }
};
