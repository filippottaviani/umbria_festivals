FROM node:18-slim

WORKDIR /app

ENV CI=true
ENV GENERATE_SOURCEMAP=false

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
