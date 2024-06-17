import { ethers } from "hardhat";
import poolAbi from "./abi/pool.json";
import poolAddressProviderAbi from "./abi/poolAddressProvider.json";
import routerArtifact from '@uniswap/v2-periphery/build/UniswapV2Router02.json';
import erc20Abi from './abi/erc20.json';
import wbtcAbi from './abi/wbtc.json';
import wethAbi from './abi/weth.json';
import aaveOracleAbi from './abi/aaveOracle.json';
import aclManagerAbi from './abi/aclManagerAbi.json';
import { impersonateAccount, stopImpersonatingAccount } from "@nomicfoundation/hardhat-network-helpers";


const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const WBTC_ADDRESS = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599';
const ROUTER_ADDRESS = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
const pool = "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2";
const poolAddressProvider = "0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e";

let accountBalance: [{ user: string, userETHBalance: string, userWBTCBalance: string }] = [{
    user: '',
    userETHBalance: '',
    userWBTCBalance: ''
}];

const configSetup = async () => {
    try {
        const [signer] = await ethers.getSigners();
        console.log("Current block number ",await signer.provider.getBlockNumber());


        const poolAddressProviderContract = new ethers.Contract(poolAddressProvider, poolAddressProviderAbi, signer);

        const poolAddress = await poolAddressProviderContract.getPool();
        const admin = await poolAddressProviderContract.getACLAdmin();
        const aclManagerAddress = await poolAddressProviderContract.getACLManager();
        const oracleAddress = await poolAddressProviderContract.getPriceOracle();
        console.table({ 'Pool': poolAddress, 'DEFAULT_ADMIN_ROLE': admin, 'ACLManager': aclManagerAddress, 'PriceOracle': oracleAddress });

        // fetch the users which borrowed a lot wbtc

        const oracleContract = new ethers.Contract(oracleAddress, aaveOracleAbi, signer);
        const aclManagerContract = new ethers.Contract(aclManagerAddress, aclManagerAbi, signer);

        const currentWBTCPrice = await oracleContract.getAssetPrice(WBTC_ADDRESS);
        console.log("WBTC price in USD = ", currentWBTCPrice);

        const WBTCPriceSource = await oracleContract.getSourceOfAsset(WBTC_ADDRESS);
        console.log("Price source ", WBTCPriceSource);

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

        const updatedWbtcPrice = await oracleContract.getAssetPrice(WBTC_ADDRESS);
        console.log(updatedWbtcPrice);




        // const wbtc = new ethers.Contract(WBTC_ADDRESS, wbtcAbi, signer);

        // const supplyAmount = ethers.parseUnits("1", 8); // 8 for btc

        // const approvalTxn = await wbtc.approve(pool, supplyAmount);
        // approvalTxn.wait();

        // const poolContract = new ethers.Contract(pool, poolAbi, signer);
        // const tx = await poolContract.supply(WBTC_ADDRESS, supplyAmount, signer.address, 0, { gasLimit: 2100000 });
        // console.log("Transaction ", tx);
        // const receipt = await tx.wait();
        // console.log(receipt);

        // const userData = await poolContract.getUserAccountData(signer.address);
        // console.log("User Data ", userData);

    } catch (error) {
        console.log("error ", error);
    }


}

const swapTokens = async () => {
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545/');


    const logBalances = async (accountBalance: [{ user: string, userETHBalance: string, userWBTCBalance: string }]) => {
        console.table(accountBalance);
    }

    for (let account = 0; account < 1; account++) {

        const signer = await provider.getSigner(account);
        console.log(`\nConfiguring User ${signer.address}`);

        const router = new ethers.Contract(ROUTER_ADDRESS, routerArtifact.abi, signer);
        const weth = new ethers.Contract(WETH_ADDRESS, wethAbi, signer);
        const wbtc = new ethers.Contract(WBTC_ADDRESS, wbtcAbi, signer);

        const ethBalance = await provider.getBalance(signer.address);
        const wbtcBalance = await wbtc.balanceOf(signer.address);
        if (wbtcBalance == 0) {
            // converting eth to weth
            await signer.sendTransaction({
                to: WETH_ADDRESS,
                value: ethers.parseUnits('1000', 18)
            });

            const amountIn = ethers.parseUnits('1000', 18)
            const tx1 = await weth.approve(router.target, amountIn);
            tx1.wait();

            // converting weth to wbtc
            const tx2 = await router.swapExactTokensForTokens(
                amountIn,
                0,
                [WETH_ADDRESS, WBTC_ADDRESS],
                signer.address,
                Math.floor(Date.now() / 1000) + (60 * 10),
                {
                    gasLimit: 1000000,
                }
            )
            await tx2.wait()
        }

        accountBalance.push({
            user: signer.address,
            userETHBalance: ethers.formatUnits(ethBalance, 18),
            userWBTCBalance: ethers.formatUnits(wbtcBalance, 8),
        });
    }

    logBalances(accountBalance);

    configSetup();
}

// swapTokens();
configSetup();
