import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    hardhat: {
      forking: {
        enabled: true,
        url: "https://eth-mainnet.g.alchemy.com/v2/4CzLEOliFHrLelLtaAbCRKt1uDipuuu2",
        blockNumber: 18589542
      },
      chainId: 1
    }
  }
};

export default config;
