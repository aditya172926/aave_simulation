import { HardhatUserConfig, vars } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    hardhat: {
      forking: {
        enabled: true,
        url: vars.get('ALCHEMY_RPC_MAINNET'),
        blockNumber: 18589542,
      },
      gas: 2100000,
      chainId: 1,
    }
  }
};

export default config;
