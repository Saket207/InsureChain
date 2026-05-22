// Simple caching to avoid rate limiting
let cachedPrice = null;
let lastFetchTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const fetchEthInrPrice = async () => {
  if (cachedPrice && lastFetchTime && (Date.now() - lastFetchTime < CACHE_DURATION)) {
    return cachedPrice;
  }

  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=inr');
    if (!response.ok) throw new Error('Network response was not ok');
    
    const data = await response.json();
    if (data && data.ethereum && data.ethereum.inr) {
      cachedPrice = data.ethereum.inr;
      lastFetchTime = Date.now();
      return cachedPrice;
    }
  } catch (error) {
    console.error('Error fetching ETH/INR price:', error);
  }

  // Fallback to static price if API fails
  return 280000;
};
