import { ethers, network } from "hardhat";
import poolAbi from "./abi/pool.json";
import poolAddressProviderAbi from "./abi/poolAddressProvider.json";
import routerArtifact from '@uniswap/v2-periphery/build/UniswapV2Router02.json';
import erc20Abi from './abi/erc20.json';
import wbtcAbi from './abi/wbtc.json';
import wethAbi from './abi/weth.json';
import aaveOracleAbi from './abi/aaveOracle.json';
import aclManagerAbi from './abi/aclManagerAbi.json';
import poolDataProviderAbi from './abi/poolDataProviderAbi.json';
import { impersonateAccount, stopImpersonatingAccount } from "@nomicfoundation/hardhat-network-helpers";
import { reserveQuery } from "./graph-query/reserve";
import { AAVE_SUBGRAPH_URL } from './constants/simulation';
import axios from 'axios';
import { borrowQuery } from "./graph-query/borrow";
import { HardhatEthersHelpers } from "hardhat/types";


const WBTC_ADDRESS = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599';
const pool = "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2";
const poolAddressProvider = "0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e";

let accountBalance: [{ user: string, userETHBalance: string, userWBTCBalance: string }] = [{
    user: '',
    userETHBalance: '',
    userWBTCBalance: ''
}];

const deployNewPriceFeedContract = async(
    WBTCPriceSource: string, 
    admin: string, 
    aclManagerContract: any,
    signer: any,
    oracleAddress: string) => {
    const newPriceFeedFactory = await ethers.getContractFactory("WBTCFeedOverride");
    const newPriceFeedContract = await newPriceFeedFactory.deploy(WBTCPriceSource);
    const newPriceFeedContractAddress = await newPriceFeedContract.getAddress();

    console.log("New pricefeed contract deployed at ", newPriceFeedContractAddress);

    const hasAccess = await aclManagerContract.isPoolAdmin(admin);

    if (hasAccess === true) {
        await impersonateAccount(admin);
        const adminSigner = await ethers.getSigner(admin);
        const fundAdmin = await signer.sendTransaction({
            to: adminSigner.address,
            value: ethers.parseEther("5")
        });
        await fundAdmin.wait();
        console.log("Admin balance = ", await adminSigner.provider.getBalance(adminSigner.address));
        const adminOracleContract = new ethers.Contract(oracleAddress, aaveOracleAbi, adminSigner);
        const newPriceSourceTxn = await adminOracleContract.setAssetSources(
            [WBTC_ADDRESS],
            [newPriceFeedContractAddress]
        );
        await newPriceSourceTxn.wait();
        await stopImpersonatingAccount(admin);
    } else {
        throw new Error("Cannot impersonate AAVE ACL Admin. No permissions");
    }
}

const configSetup = async () => {
    try {
        const [signer] = await ethers.getSigners();
        console.log("Current block number ", await signer.provider.getBlockNumber());

        const poolAddressProviderContract = new ethers.Contract(poolAddressProvider, poolAddressProviderAbi, signer);

        const poolAddress = await poolAddressProviderContract.getPool();
        const admin = await poolAddressProviderContract.getACLAdmin();
        const aclManagerAddress = await poolAddressProviderContract.getACLManager();
        const oracleAddress = await poolAddressProviderContract.getPriceOracle();
        const poolDataProviderAddress = await poolAddressProviderContract.getPoolDataProvider();
        console.table({
            'Pool': poolAddress,
            'DEFAULT_ADMIN_ROLE': admin,
            'ACLManager': aclManagerAddress,
            'PriceOracle': oracleAddress,
            'PoolDataProvider': poolDataProviderAddress
        });

        const poolContract = new ethers.Contract(poolAddress, poolAbi, signer);
        const poolDataProviderContract = new ethers.Contract(poolDataProviderAddress, poolDataProviderAbi, signer);

        const oracleContract = new ethers.Contract(oracleAddress, aaveOracleAbi, signer);
        const aclManagerContract = new ethers.Contract(aclManagerAddress, aclManagerAbi, signer);

        const currentWBTCPrice = await oracleContract.getAssetPrice(WBTC_ADDRESS);
        console.log("WBTC price in USD = ", currentWBTCPrice);

        const WBTCPriceSource: string = await oracleContract.getSourceOfAsset(WBTC_ADDRESS);
        console.log("Price source ", WBTCPriceSource);

        await deployNewPriceFeedContract(WBTCPriceSource, admin, aclManagerContract, signer, oracleAddress);
        const updatedWbtcPrice = await oracleContract.getAssetPrice(WBTC_ADDRESS);
        console.log(updatedWbtcPrice);
        await getUsers(poolContract, poolDataProviderContract);
    } catch (error) {
        console.log("error ", error);
    }
}

const getUsers = async (poolContract: any, poolDataProviderContract: any) => {
    /*
    Read borrow event of Pool contract
    Filter the events by asset WBTC_ADDRESS
    Get the top 20 user address filtered by borrow amount
    */

    const res = await axios.post(AAVE_SUBGRAPH_URL, {
        query: reserveQuery(),
        variables: { underlyingAssetAddress: WBTC_ADDRESS }
    });
    console.log(res.data.data.reserves[0].id);
    const reserveId: string = res.data.data.reserves[0].id;

    const res2 = await axios.post(AAVE_SUBGRAPH_URL, {
        query: borrowQuery(),
        variables: {
            reserveId: reserveId,
            blockNumber: 18589542
        }
    });
    const borrowLogs = res2.data.data.userReserves;
    let userAccounts: any = {};

    for (let log of borrowLogs) {
        const user = log.user.id;
        const userAccountData = await poolContract.getUserAccountData(user);
        const healthFactor = userAccountData.healthFactor;
        userAccounts[user] = {
            healthFactor: healthFactor,
            totalCollateralBase: userAccountData.totalCollateralBase,
            totalDebtBase: userAccountData.totalDebtBase,
            liquidation: healthFactor < 1e18 ? true : false
        }
    }
    console.table(userAccounts);

    // liquidate all accounts which are true

    

    //getReserveTokensAddresses
    //getUserReserveData

}
configSetup();
