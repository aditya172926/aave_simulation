FROM node:22

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN ["npx", "hardhat", "vars", "set", "ALCHEMY_RPC_MAINNET", "<paste your ALCHEMY_RPC_MAINNET url>"]

RUN ["npx", "hardhat", "vars", "set", "GRAPH_API_KEY", "<paste your GRAPH_API_KEY>"]

RUN npx hardhat compile

CMD ["npm", "run", "simulate"]