FROM node:22-alpine
LABEL maintainer="wim@sortedbits.com"

EXPOSE 3000

WORKDIR /home/node/app
COPY . . 
RUN npm install

CMD ["npm", "start"]
