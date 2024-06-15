import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    hardhat: {
      forking: {
        enabled: true,
        url: process.env.ALCHEMY_RPC_MAINNET,
        blockNumber: 18589542
      },
      chainId: 1
    }
  }
};

export default config;
