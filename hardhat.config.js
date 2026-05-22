import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config.js";

/** @type import('hardhat/config').HardhatUserConfig */
const config = {
  solidity: "0.8.24",
  networks: {
    hardhat: {
      chainId: 1337 // Standard for local development
    },
    sepolia: {
      url: process.env.VITE_SEPOLIA_RPC_URL || "https://rpc2.sepolia.org",
      accounts: process.env.VITE_PRIVATE_KEY ? [process.env.VITE_PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: process.env.VITE_ETHERSCAN_API_KEY || "",
  },
};

export default config;
