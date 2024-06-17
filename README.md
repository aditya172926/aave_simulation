# AAVE Price Change Simulation

## Goal - How are the users affected if the price of WBTC is halved in the protocol

### Simulation Info

- Protocol - AAVEv3 (https://docs.aave.com/hub/)
- Asset - WBTC
- Price Change - 50% drop
- Fork at Blocknumber - 18589542
- Forked network chainId - 1

After the simulation the result data is stored in MongoDB.

## Steps to Simulate

First clone the repository. Navigate to the root directory and then run

`npm install`

Before you start the simulation, you have to set 2 environment variables.
- ALCHEMY_RPC_MAINNET - Mandatory
- MONGODB_URI - Optional

Set your ALCHEMY_RPC_MAINNET env variable by executing this in your terminal
`npx hardhat vars set ALCHEMY_RPC_MAINNET`
enter its value in the next prompt.

If you want to store the simulation data in your own mongoDB collection, set a MONGODB_URI environment variable like above using `npx hardhat vars set MONGODB_URI`.

The simulation data will be stored in a `aave_simulation` database in `simulation_data` collection.

After this you can Run the Simulation using this command

`npm run simulate`
