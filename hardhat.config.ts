import 'dotenv/config';
import { HardhatUserConfig } from "hardhat/config";
import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-etherscan";

const { POLYGON_PROJECT_ID, PRIVATE_KEY, POLYGONSCAN_API_KEY } = process.env;

const config: HardhatUserConfig = {
  solidity: "0.8.9",
  networks: {
    hardhat: {},
    mumbai: {
      url: `https://polygon-mumbai.infura.io/v3/${POLYGON_PROJECT_ID}`,
      accounts: [PRIVATE_KEY!]
    },
    mainnet: {
      url: `https://polygon-mainnet.infura.io/v3/${POLYGON_PROJECT_ID}`,
      accounts: [PRIVATE_KEY!]
    }
  },
  etherscan: {
    apiKey: POLYGONSCAN_API_KEY
  }
};

export default config;
