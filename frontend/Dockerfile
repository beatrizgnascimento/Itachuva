FROM node:23

WORKDIR /app

COPY ./pages ./pages
COPY ./components ./components
COPY ./public ./public
COPY ./styles ./styles
COPY ./package.json ./package.json
COPY ./next.config.js ./next.config.js
COPY ./postcss.config.js ./postcss.config.js
COPY ./tailwind.config.js ./tailwind.config.js
COPY ./lib ./lib

RUN npm install

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

CMD [ "npm", "run", "start" ]