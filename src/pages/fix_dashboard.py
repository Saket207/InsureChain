import os
import re

file_path = r"c:\Users\asus\OneDrive\Desktop\InsureChain\src\pages\Dashboard.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# We need to replace the entire try-catch block for fetching district risk
# from `try { const riskData = await backendApi.getDistrictRisk(targetDistrict, lat, lon);`
# up to the end of the error handling block.

# Since regex on large nested structures can be flaky, let's locate the block by string matching.
start_str = "        try {\n          const riskData = await backendApi.getDistrictRisk(targetDistrict, lat, lon);"
end_str = "        // 4. Fetch on-chain data (Independent)"

new_block = """        try {
          const riskData = await backendApi.getDistrictRisk(targetDistrict, lat, lon);
          if (riskData && !riskData.error) {
            setDistrictRisk(riskData);
          } else {
            console.warn("Dashboard: Backend API failed, trying Firestore...", riskData?.message);
            try {
              const fallbackRisk = await getDistrictRiskScore(targetDistrict);
              if (fallbackRisk) {
                setDistrictRisk({ 
                  ...fallbackRisk, 
                  district: `${fallbackRisk.district || targetDistrict}`,
                  transparency: {
                    drought_impact: `${fallbackRisk.droughtRisk || 20}%`,
                    flood_impact: `${fallbackRisk.floodRisk || 10}%`,
                    satellite_impact: `${fallbackRisk.ndvi || 0.45}`,
                    weather_impact: `${fallbackRisk.heatwaveRisk || 15}%`
                  },
                  details: {
                    soil_moisture_index: fallbackRisk.soilMoisture || 0.2,
                    ndvi_health: fallbackRisk.ndvi || 0.45,
                    rainfall_30d_avg: fallbackRisk.rainfall || 3.0,
                    consecutive_dry_days: fallbackRisk.dryDays || 5
                  },
                  isOfflineData: true
                });
              } else {
                setDistrictRisk(generateMockRisk(targetDistrict));
              }
            } catch (e) {
              setDistrictRisk(generateMockRisk(targetDistrict));
            }
          }

          try {
            const weatherResp = await backendApi.getWeatherData(targetDistrict, 7, lat, lon);
            if (weatherResp && !weatherResp.error) {
              setWeatherData(weatherResp);
            }
          } catch { /* weather is optional */ }
        } catch (apiErr) {
          console.error("Dashboard: Risk API error:", apiErr);
          try {
            const fallbackRisk = await getDistrictRiskScore(targetDistrict);
            if (fallbackRisk) {
                setDistrictRisk(fallbackRisk);
            } else {
                setDistrictRisk(generateMockRisk(targetDistrict));
            }
          } catch {
            setDistrictRisk(generateMockRisk(targetDistrict));
          }
        }

"""

start_idx = content.find(start_str)
end_idx = content.find(end_str)

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + new_block + content[end_idx:]
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Dashboard.jsx updated successfully.")
else:
    print("Could not find blocks.")
