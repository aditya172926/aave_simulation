import { impersonateAccount, stopImpersonatingAccount } from "@nomicfoundation/hardhat-network-helpers";
import axios from 'axios';
import { ethers } from "hardhat";
import {
    AAVE_SUBGRAPH_URL,
    POOL_ADDRESS_PROVIDER_ADDRESS,
    WBTC_ADDRESS,
    uiPoolDataProviderV3Address
} from './constants/simulation';

// graph queries
import { borrowQuery } from "./graph-query/borrow";
import { reserveQuery } from "./graph-query/reserve";

// Abi
import poolAddressProviderAbi from "./abi/poolAddressProvider.json";
import poolDataProviderAbi from './abi/poolDataProviderAbi.json';
import aaveOracleAbi from './abi/aaveOracle.json';
import aclManagerAbi from './abi/aclManagerAbi.json';
import poolAbi from "./abi/pool.json";
import uiPoolDataProviderV3Abi from './abi/uiPoolDataProviderV3Abi.json';
import { upload } from "./uploadToDb";
import { vars } from "hardhat/config";

const deployNewPriceFeedContract = async (
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

const runSimulation = async (runTest: boolean = false) => {
    try {
        const [signer] = await ethers.getSigners();
        console.log("Current block number ", await signer.provider.getBlockNumber());

        const poolAddressProviderContract = new ethers.Contract(POOL_ADDRESS_PROVIDER_ADDRESS, poolAddressProviderAbi, signer);

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
            'PoolDataProvider': poolDataProviderAddress,
            'UiPoolDataProviderV3Address': uiPoolDataProviderV3Address
        });

        const poolContract = new ethers.Contract(poolAddress, poolAbi, signer);
        const poolDataProviderContract = new ethers.Contract(poolDataProviderAddress, poolDataProviderAbi, signer);

        const oracleContract = new ethers.Contract(oracleAddress, aaveOracleAbi, signer);
        const aclManagerContract = new ethers.Contract(aclManagerAddress, aclManagerAbi, signer);

        const currentWBTCPrice = await oracleContract.getAssetPrice(WBTC_ADDRESS);
        console.log("WBTC price in USD = ", currentWBTCPrice);

        const WBTCPriceSource: string = await oracleContract.getSourceOfAsset(WBTC_ADDRESS);
        console.log("Price source ", WBTCPriceSource);

        if (runTest) {
            await deployNewPriceFeedContract(WBTCPriceSource, admin, aclManagerContract, signer, oracleAddress);
            const updatedWbtcPrice = await oracleContract.getAssetPrice(WBTC_ADDRESS);
            console.log("New Price of WBTC", updatedWbtcPrice);
        }
        const users = await getUsers(poolContract);
        // await checkUserReservePool(
        //     signer, 
        //     uiPoolDataProviderV3Address, 
        //     poolAddressProviderContract, 
        //     users
        // );
        return users;
    } catch (error) {
        console.error("error ", error);
    }
}

const getUsers = async (poolContract: any) => {
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
    return userAccounts;
}

const checkUserReservePool = async (
    signer: any,
    uiPoolDataProviderV3Address: string,
    poolAddressProviderContract: any,
    users: any
) => {
    const uiPoolDataContract = new ethers.Contract(uiPoolDataProviderV3Address, uiPoolDataProviderV3Abi, signer);
    for (let user of users) {
        const userReserveData = await uiPoolDataContract.getUserReservesData(poolAddressProviderContract, user);
        console.log("userReserveData ", userReserveData);
        console.log("-----------------------------------------------------------");
    }
}

const main = async () => {
    console.clear();
    console.log("Running Simulation at actual price of WBTC\n");
    const userDetails = await runSimulation();
    console.log("\n----------------------------------------------------------------\n");
    console.log("Running Simulation at manipulated price of WBTC\n");
    const userDetailsAfterTest = await runSimulation(true);

    const data = {
        beforeTest: userDetails,
        afterTest: userDetailsAfterTest,
        timestamp: Date.now()
    }
    if (vars.has('MONGODB_URI')) {
        await upload(data);
    } else {
        console.log('No mongodb uri found. Add MONGODB_URI envrionment variable to store the output');
    }
    process.exit(1);
}
main();