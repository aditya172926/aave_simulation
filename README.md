# AAVE Price Change Simulation

## Goal - How are the users affected if the price of WBTC is halved in the protocol

### Simulation Info

- Protocol - [AAVEv3](https://docs.aave.com/hub/)
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

## Use Docker to Run Simulation

You can use docker to build this project and run the simulation of price change. For this make sure you have docker installed in your machine.

You can check the installation using this command

```
docker --version
```

If you get the version of docker installed, great. If not follow the [Docker Docs](https://docs.docker.com/) for installation.

After you have cloned the `main` branch of the repo, go into the `Dockerfile` in the root directory.

By using docker you can reduce the number of steps required to get the project up and running with minimum commands resulting in less mistakes.

You will still require an ALCHEMY_RPC_MAINNET url and a GRAPH_API_KEY in the `Dockerfile`. Paste those values in the place of `<paste your ALCHEMY_RPC_MAINNET url>` and `<paste your GRAPH_API_KEY>` in the `Dockerfile`.

You can get the alchemy rpc url and graph api key in the following
- [Alchemy](https://www.alchemy.com/)
- [The Graph APIs](https://thegraph.com/studio/apikeys/)

After the edits in the `Dockerfile` run the following commands

```
docker build -t risk_sim:1.0 .
```

`risk_sim` is the name of the image we are building from the `Dockerfile`. You can change it to what you want.

After that, create and run the docker container to start and view the outputs of the simulation

```
docker run --rm risk_sim:1.0
```

This will run the simulation in a container and show the output of users who are eligible to liquidate. After the execution is done, the docker container will be deleted.

You can always run the simulation in a new container by just using the last command.