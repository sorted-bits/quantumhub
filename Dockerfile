
FROM node:21.7.1-bullseye-slim AS build

RUN apt-get update && apt-get install -y --no-install-recommends dumb-init

WORKDIR /node/app/src
COPY --chown=node:node . .
RUN npm run build


# PRODUCTION
FROM node:21.7.1-bullseye-slim

RUN apt-get update && apt-get install -y --no-install-recommends dumb-init

ENV NODE_ENV production

WORKDIR /usr/src/app
COPY --chown=node:node . .

RUN npm ci --only=production

EXPOSE 3000

USER node

CMD ["dumb-init", "npm", "start"]