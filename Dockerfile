FROM node:16.15-alpine3.16

WORKDIR /opt/roomba-exporter

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 7000
CMD [ "node", "index.js" ]
