FROM node:23

WORKDIR /app

COPY ./src ./src
COPY ./server.js ./server.js
COPY ./package.json ./package.json

RUN npm install

CMD [ "npm", "run", "start" ]