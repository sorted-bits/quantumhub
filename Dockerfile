FROM node:22-alpine
LABEL maintainer="wim@sortedbits.com"

EXPOSE 3000

WORKDIR /home/node/packages/test-device
COPY ./packages/test-device .
RUN npm install

WORKDIR /home/node/app
COPY . . 
RUN npm install

CMD ["npm", "start"]
