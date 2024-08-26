FROM node:22

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ENV ALCHEMY_RPC_MAINNET=""
ENV GRAPH_API_KEY=""

RUN ["npx", "hardhat", "vars", "set", "ALCHEMY_RPC_MAINNET", "$ALCHEMY_RPC_MAINNET"]

RUN ["npx", "hardhat", "vars", "set", "GRAPH_API_KEY", "$GRAPH_API_KEY"]

RUN npx hardhat compile

CMD ["npm", "run", "simulate"]