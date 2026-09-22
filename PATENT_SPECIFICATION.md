# INDIAN PATENT SPECIFICATION

---

## 1. TITLE OF THE INVENTION

### Suggested Patent Titles:
1. **AN AUTONOMOUS PARAMETRIC CROP INSURANCE SYSTEM AND METHOD USING DECENTRALIZED SMART CONTRACTS AND MULTI-SOURCE SATELLITE ML RISK ORACLES** *(Recommended)*
2. **A SYSTEM AND METHOD FOR TRUSTLESS PARAMETRIC AGRICULTURAL RISK PRICING AND AUTOMATED PAYOUT EXECUTION VIA DISTRIBUTED ORACLE ARCHITECTURE**
3. **PARAMETRIC CROP INSURANCE PLATFORM INTEGRATING EARTH OBSERVATION DATA, HYBRID ORACLE INGESTION, AND SMART CONTRACT PAYOUT VAULTS**
4. **AN AI-POWERED DECENTRALIZED CROP LOSS RISK ASSESSMENT AND AUTOMATED CLAIM SETTLEMENT SYSTEM**
5. **METHOD AND APPARATUS FOR REAL-TIME SATELLITE VEGETATION INDEX AND WEATHER METRIC PARAMETRIC CROP CLAIM AUTOMATION**

---

## 2. ABSTRACT

An autonomous, trustless parametric crop insurance system and method utilizing machine learning (ML) engines, multi-source Earth Observation satellite telemetry, and blockchain smart contracts is disclosed. The system comprises a data ingestion oracle layer configured to fetch daily rolling climatological features from satellite weather endpoints and compute Normalized Difference Vegetation Index (NDVI) degradation from high-resolution satellite imagery. A machine learning risk assessment engine processes the climatological features and NDVI metrics through extreme gradient boosting (XGBoost) classifiers to generate composite, location-specific risk scores and dynamic risk multipliers. A decentralized Web3 contract suite, comprising a Policy Registry contract, a Payout Vault contract, and a Trigger Oracle contract, computes dynamic premium pricing based on geographical risk factors and executes automated claim settlements directly into farmer digital wallets upon deterministic trigger verification without manual loss adjusting interventions.

---

## 3. FIELD OF THE INVENTION

The present invention relates generally to agricultural risk management and decentralized financial technologies (DeFi). More particularly, the present invention relates to an autonomous, trustless parametric crop insurance system and method that combines satellite Earth Observation (EO) telemetry, machine learning risk modeling, hybrid decentralized oracle architectures, and EVM-compatible smart contracts for dynamic premium computation and instantaneous claim payout execution.

---

## 4. BACKGROUND AND PRIOR ART

### Background:
Agricultural insurance is critical for stabilizing agrarian economies, protecting farmers against climate-induced crop failures, extreme weather events, droughts, and floods. Traditional indemnity-based crop insurance relies on human insurance adjusters physically visiting affected agricultural plots to measure actual crop damage post-disaster.

### Deficiencies in Prior Art:
1. **Prolonged Claim Settlement Delays:** Traditional claim assessment requires physical inspection, field loss verification, paperwork, and multi-tier bureaucratic processing, leading to settlement delays of 3 to 12 months.
2. **High Administrative and Operational Costs:** Physical deployment of insurance loss adjusters across remote rural areas incurs exorbitant operational overheads, increasing policy costs for smallholder farmers.
3. **Moral Hazard and Fraudulent Claims:** Manual loss adjusting is vulnerable to subjective bias, falsified loss reporting, and collusion between adjusters and claimants.
4. **Lack of Transparency in Risk Pricing:** Conventional insurance providers calculate premiums using opaque, aggregated regional metrics without providing plot-level risk transparency or real-time exposure breakdowns to policyholders.
5. **Data Bottlenecks and API Latency:** Contemporary Web3 parametric solutions suffer from API latency bottlenecks, asynchronous state synchronization errors, and floating-point type-coercion failures when bridging off-chain machine learning prediction outputs into deterministic smart contracts.

Therefore, there exists a critical need for an automated, parametric crop insurance platform that eliminates physical loss adjusters, ensures deterministic risk calculation and claim settlement, and integrates off-chain satellite ML risk engines with on-chain smart contracts in a latency-optimized, fault-tolerant manner.

---

## 5. SUMMARY OF THE INVENTION

The present invention overcomes the drawbacks of conventional crop insurance systems by providing an autonomous, machine learning-driven parametric crop insurance framework.

### Key Objectives and Novel Contributions:
1. **Multi-Source Data Ingestion & Satellite Monitoring:** The system ingests 30-day rolling meteorological data (rainfall, maximum temperature, minimum temperature, relative humidity) from NASA POWER satellite endpoints and high-resolution optical imagery (Copernicus Sentinel-2 / Planet Labs) to monitor crop canopy health via Normalized Difference Vegetation Index (NDVI) deltas.
2. **Hybrid XGBoost ML Risk Engine:** Off-chain risk scoring engines execute pre-trained XGBoost classifiers on engineered feature vectors—including historical drought/flood frequencies, consecutive dry/hot days, 3-day cumulative rainfall, and satellite NDVI degradation trends—to generate localized risk scores (1-100) and risk multipliers (1.0x to 2.5x).
3. **Dynamic On-Chain Premium Calculation:** Dynamic premium calculations integrate base regional rates, machine learning risk multipliers, selected trigger coverage factors, and seasonal risk factors to formulate mathematically fair premiums.
4. **Decentralized Smart Contract Architecture:** A modular Ethereum Virtual Machine (EVM) smart contract suite (`PolicyRegistry.sol`, `PayoutVault.sol`, and `TriggerOracle.sol`) manages policy tokenization, premium escrowing, trigger validation, and zero-latency claim payouts via Chainlink node adapters.
5. **Fault-Tolerant Bridge Architecture:** System architecture incorporates backend type-coercion interceptors (resolving NumPy `int64` JSON serialization exceptions), cached spatial risk pre-fetching (reducing interface state latency from 15,000ms to 50ms), and automated transaction confirmation buffers to prevent component unmounting race conditions during payout routing.

---

## 6. DRAWINGS

```
================================================================================
                                    FIGURE 1
================================================================================
                       [ SYSTEM ARCHITECTURE OVERVIEW ]

   +------------------------------------------------------------------------+
   |                        EARTH OBSERVATION SOURCES                       |
   |   +-----------------------+        +-------------------------------+   |
   |   | NASA POWER (Weather)  |        | Copernicus / Planet (NDVI)    |   |
   |   +-----------+-----------+        +---------------+---------------+   |
   +---------------+--------------------------------+-----------------------+
                   |                                |
                   v                                v
   +------------------------------------------------------------------------+
   |                       PYTHON BACKEND ML ENGINE                         |
   |   +----------------------------------------------------------------+   |
   |   | Data Aggregator & Feature Engineer                             |   |
   |   | (Rainfall 7/14/21d, Temp extremes, Consecutive Dry/Hot days)   |   |
   |   +-------------------------------+--------------------------------+   |
   |                                   |                                    |
   |                                   v                                    |
   |   +----------------------------------------------------------------+   |
   |   | XGBoost Risk & Trigger Classifier Engine                       |   |
   |   | (Outputs: RiskScore 1-100, Multiplier, Trigger Fired Boolean)   |   |
   |   +-------------------------------+--------------------------------+   |
   +-----------------------------------|------------------------------------+
                                       |
                     +-----------------+-----------------+
                     |                                   |
                     v                                   v
   +-----------------------------------+   +--------------------------------+
   |       CHAINLINK ORACLE ADAPTER    |   |    FIREBASE / REST API LAYER  |
   +-----------------+-----------------+   +-----------------+--------------+
                     |                                       |
                     v                                       v
   +------------------------------------------------------------------------+
   |                       EVM BLOCKCHAIN SMART CONTRACTS                   |
   |  +--------------------+  +-------------------+  +-------------------+  |
   |  | PolicyRegistry.sol |->| TriggerOracle.sol |->|  PayoutVault.sol  |  |
   |  +--------------------+  +-------------------+  +---------+---------+  |
   +-----------------------------------------------------------|------------+
                                                               |
                                                               v
                                                      [ Farmer Wallet ]
================================================================================
```

*(Placeholders provided for visual insertion:)*

* **Figure 1:** Block Diagram of the End-to-End Autonomous Parametric Crop Insurance System.
* **Figure 2:** Flowchart detailing the Satellite Data Ingestion and Machine Learning Risk Scoring Workflow.
* **Figure 3:** Sequence Diagram illustrating Chainlink Oracle Trigger Check and Smart Contract Claim Settlement Execution.
* **Figure 4:** Component Layout of the On-Chain Policy Registration and Escrow Payout Vault Interaction.

---

## 7. BRIEF DESCRIPTION OF DRAWINGS

* **Figure 1** displays the overall system architecture, illustrating the interconnections between Earth Observation satellite providers, the Python ML risk engine, the Chainlink decentralized adapter, the Firebase metadata store, and the EVM smart contract layer.
* **Figure 2** depicts a flowchart of the machine learning feature extraction logic, showing how NASA POWER climatological parameters and Copernicus Sentinel-2 NDVI surface reflectances are transformed into composite risk scores.
* **Figure 3** illustrates the operational sequence diagram when a crop failure condition (e.g., severe drought or flood) is evaluated, showing message flows between the smart contracts, the Chainlink oracle, the ML backend, and the execution of payout transfers to the farmer's web3 wallet.
* **Figure 4** presents the internal contract interaction diagram between `PolicyRegistry.sol`, `TriggerOracle.sol`, and `PayoutVault.sol` during policy minting and automated escrow release.

---

## 8. DETAILED DESCRIPTION OF THE INVENTION

The present invention discloses a system and method for trustless, autonomous parametric crop insurance powered by satellite telemetry, machine learning risk assessment engines, and EVM smart contracts.

### 8.1 Data Ingestion & Earth Observation Oracle Module
The data ingestion oracle module aggregates multi-spectral and meteorological telemetry without manual human input. 
1. **Meteorological Telemetry:** The backend connects to NASA POWER APIs to retrieve daily rolling surface parameters for target geographic coordinates ($\text{Latitude}, \text{Longitude}$):
   * $\text{PRECTOTCORR}$: Daily corrected total precipitation ($\text{mm/day}$)
   * $\text{T2M}$: Temperature at 2 meters ($\text{°C}$)
   * $\text{RH2M}$: Relative Humidity at 2 meters ($\%$)
2. **Satellite Vegetation Index Telemetry:** Surface reflectance data from Copernicus Sentinel-2 imagery (Level-2A Bottom-Of-Atmosphere reflectance) or PlanetScope 4-band imagery is retrieved. The Normalized Difference Vegetation Index (NDVI) is computed via Near-Infrared ($\text{NIR}$, Band 8) and Red ($\text{RED}$, Band 4) bands:
   $$\text{NDVI} = \frac{\text{NIR} - \text{RED}}{\text{NIR} + \text{RED}}$$
   30-day vegetation degradation trends ($\Delta\text{NDVI}$) are calculated:
   $$\Delta\text{NDVI} = \text{NDVI}_{\text{current}} - \text{NDVI}_{t-30}$$
   Negative values of $\Delta\text{NDVI}$ indicate rapid loss of chlorophyll content and crop canopy failure.

### 8.2 Machine Learning Feature Engineering & XGBoost Risk Scoring
The Python backend processes raw telemetry into an engineered feature vector $\vec{X}$ comprising:
* Rolling rainfall averages: 7-day ($\text{RF}_{7d}$), 14-day ($\text{RF}_{14d}$), 21-day ($\text{RF}_{21d}$)
* Temperature extremes: 5-day rolling maximum ($\text{T}_{\text{max},5d}$) and minimum ($\text{T}_{\text{min},5d}$)
* Cumulative totals: 3-day cumulative rainfall ($\text{RF}_{3d}$)
* Stress counters: Consecutive dry days ($\text{CDD}$, where daily precipitation $< 1.0\text{ mm}$) and consecutive hot days ($\text{CHD}$, where daily max temperature $> 42.0\text{°C}$)
* Spatial risk baseline: Historical 30-year climatological drought frequency ($\text{Freq}_{\text{drought}}$) and flood frequency ($\text{Freq}_{\text{flood}}$)

The composite risk score ($S_{\text{risk}} \in [0, 100]$) is calculated via weighted component normalization:
$$S_{\text{risk}} = \text{round}\Big(0.30 \cdot S_{\text{drought}} + 0.20 \cdot S_{\text{flood}} + 0.25 \cdot S_{\text{NDVI}} + 0.25 \cdot S_{\text{weather}}\Big)$$

Numeric risk scores map to risk levels and premium multipliers ($M_{\text{risk}}$):
* $S_{\text{risk}} \le 25 \implies \text{Low Risk}, \quad M_{\text{risk}} = 1.0\text{x}$
* $26 \le S_{\text{risk}} \le 50 \implies \text{Moderate Risk}, \quad M_{\text{risk}} = 1.4\text{x}$
* $51 \le S_{\text{risk}} \le 75 \implies \text{High Risk}, \quad M_{\text{risk}} = 1.8\text{x}$
* $S_{\text{risk}} > 75 \implies \text{Critical Risk}, \quad M_{\text{risk}} = 2.5\text{x}$

Four pre-trained XGBoost classifiers evaluate specific catastrophe triggers ($T \in \{\text{drought}, \text{flood}, \text{heatwave}, \text{frost}\}$). If an XGBoost model predicts a class-1 probability $P(T_i = 1 | \vec{X}) \ge 0.80$, the trigger is flagged as activated.

### 8.3 Smart Premium Calculation Engine
The dynamic policy premium ($P_{\text{final}}$ in Wei/INR) is computed using:
$$P_{\text{final}} = B_{\text{base}} \times M_{\text{risk}} \times M_{\text{coverage}} \times F_{\text{season}}$$
Where:
* $B_{\text{base}}$ = Regional base rate (e.g., ₹500 equivalent in Ether)
* $M_{\text{risk}}$ = Machine learning computed risk multiplier
* $M_{\text{coverage}}$ = User-selected trigger coverage multiplier (1.0x for single trigger up to 2.6x for multi-trigger protection)
* $F_{\text{season}}$ = Seasonal weight factor (Kharif monsoon vs. Rabi dry season)

### 8.4 Smart Contract Architecture & Execution Sequence
The blockchain operational layer consists of three smart contracts:

1. **`PolicyRegistry.sol`**:
   * Stores policy records (`Policy` struct containing `policyId`, `farmerWallet`, `district`, `season`, `triggersSelected`, `coverageAmount`, `premiumAmount`, `status`, and timestamp).
   * Minting function `registerPolicy()` verifies native currency value (`msg.value > 0`), forwards funds to `PayoutVault.sol`, records policy state, and emits `PolicyRegistered`.

2. **`PayoutVault.sol`**:
   * Functions as an isolated capital reserve vault storing locked premiums and underwriting reserves.
   * Restricts execution of `executePayout(address payable farmer, uint256 amount)` strictly to calls originating from `TriggerOracle.sol`.

3. **`TriggerOracle.sol`**:
   * Inherits Chainlink client capabilities.
   * `requestTriggerCheck()` builds off-chain requests containing spatial-temporal criteria ($\text{district}, \text{lat}, \text{lon}, \text{triggerType}$).
   * `fulfillTriggerRequest()` decodes data payloads returned by the Express.js Chainlink adapter.
   * Upon detecting a triggered condition (`fired == 1`), `TriggerOracle.sol` updates policy status in `PolicyRegistry.sol` to `PendingPayout` and directly invokes `executePayout()` in `PayoutVault.sol` to instantly transfer covered amounts to the farmer's Ethereum address.

### 8.5 Technical Optimization & Error-Handling Mechanics
* **Latency Mitigation:** Direct live satellite calls during client page loads are bypassed by fetching pre-cached district risk values stored in Cloud Firestore. This drops UI rendering response time from 15,000ms to 50ms.
* **Type-Coercion Interceptors:** Off-chain Python predictions cast NumPy C-primitives (`numpy.int64`) into native Python types (`int`) prior to JSON serialization, eliminating API runtime errors.
* **Asynchronous Unmount Safety:** Client-side Web3 transactional calls enforce explicit asynchronous waiting to prevent browser termination of outgoing REST network packets during React DOM component unmounting.

---

## 9. CLAIMS

### WE CLAIM:

1. **An autonomous parametric crop insurance system using decentralized smart contracts and satellite machine learning risk engines, the system comprising:**
   * a data ingestion engine configured to fetch daily meteorological telemetry parameters and Earth Observation multi-spectral satellite imagery for a target geographical coordinate;
   * an off-chain machine learning risk scoring engine coupled to said data ingestion engine, configured to construct an engineered feature vector and compute a composite risk score and dynamic risk multiplier using pre-trained gradient boosted decision tree classifiers;
   * a Chainlink oracle adapter bridging off-chain classifier outputs with an on-chain smart contract network;
   * a smart contract suite deployed on an EVM-compatible blockchain, comprising:
     * a **Policy Registry contract** configured to record policy parameters and issue policy tokens upon receiving dynamic premium payments;
     * a **Payout Vault contract** configured to pool policy premiums and hold capital reserves in escrow; and
     * a **Trigger Oracle contract** coupled to said Policy Registry contract and Payout Vault contract, configured to initiate an automated claim payout from said Payout Vault contract to a policyholder wallet address upon verifying trigger conditions from said off-chain machine learning risk engine.

2. **The system as claimed in claim 1, wherein said data ingestion engine:**
   * fetches 30-day rolling meteorological parameters including daily precipitation totals, 2-meter air temperatures, and relative humidity from NASA POWER satellite endpoints; and
   * fetches multi-spectral optical imagery from satellite constellations to compute a Normalized Difference Vegetation Index ($\text{NDVI} = \frac{\text{NIR} - \text{RED}}{\text{NIR} + \text{RED}}$) and a 30-day vegetation degradation delta ($\Delta\text{NDVI}$).

3. **The system as claimed in claim 1, wherein said engineered feature vector comprises:**
   * rolling rainfall averages calculated over 7-day, 14-day, and 21-day windows;
   * rolling temperature extremes comprising 5-day maximum temperature and 5-day minimum temperature;
   * a 3-day cumulative rainfall total;
   * a consecutive dry days counter defining consecutive days with daily precipitation below 1.0 millimeter;
   * a consecutive hot days counter defining consecutive days with maximum temperatures exceeding 42.0 degrees Celsius; and
   * a 30-year historical climatological baseline frequency for regional drought and flood occurrences.

4. **The system as claimed in claim 1, wherein said dynamic premium ($P_{\text{final}}$) is computed on a client interface according to the formula:**
   $$P_{\text{final}} = B_{\text{base}} \times M_{\text{risk}} \times M_{\text{coverage}} \times F_{\text{season}}$$
   where $B_{\text{base}}$ is a base monetary rate, $M_{\text{risk}}$ is the machine learning risk multiplier derived from said composite risk score, $M_{\text{coverage}}$ is a factor based on selected trigger protections, and $F_{\text{season}}$ is a seasonal risk factor.

5. **The system as claimed in claim 1, wherein said Trigger Oracle contract:**
   * executes a re-entrancy protected payout sequence that updates policy status in said Policy Registry contract from `Active` to `PendingPayout`;
   * invokes an `executePayout` function on said Payout Vault contract to release funds via direct EVM transfer; and
   * updates policy status in said Policy Registry contract to `PaidOut` upon successful transfer completion.

6. **A method for trustless parametric crop insurance claim settlement, the method comprising the steps of:**
   * ingesting daily weather parameters and optical satellite reflectance values for a defined agricultural territory;
   * computing an engineered feature vector tracking temperature extremes, precipitation deficits, and vegetation index degradation deltas;
   * executing pre-trained Extreme Gradient Boosting (XGBoost) models on said feature vector to generate a binary trigger activation state and a prediction confidence metric;
   * dispatching said trigger activation state to a Trigger Oracle smart contract via a decentralized oracle bridge;
   * verifying on-chain that an associated insurance policy status is `Active` and has not previously executed a claim payout; and
   * transferring coverage funds from an escrow Payout Vault contract directly to a policyholder web3 wallet address without manual loss adjustment intervention.

7. **The method as claimed in claim 6, further comprising the step of:**
   * intercepting NumPy computational data types within an off-chain application programming interface (API) and casting said NumPy data types into native primitive types prior to JSON serialization, preventing API runtime crashes.
