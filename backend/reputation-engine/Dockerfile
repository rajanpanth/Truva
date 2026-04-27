FROM node:20-alpine

WORKDIR /app

COPY package.json tsconfig.json ./
RUN npm install

COPY src/ ./src/

EXPOSE 3001

CMD ["npx", "ts-node", "src/index.ts"]
