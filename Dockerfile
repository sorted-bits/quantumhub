FROM node:22-alpine
LABEL maintainer="wim@sortedbits.com"

EXPOSE 3000

WORKDIR /home/node/packages/example-device
COPY ./packages/example-device .
RUN npm install

WORKDIR /home/node/app
COPY . . 
RUN npm install

CMD ["npm", "start"]
