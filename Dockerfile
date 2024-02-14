FROM node:21-alpine as build

ENV NODE_ENV production

WORKDIR /app

COPY package*.json ./
RUN npm install --only=prod

FROM alpine:3.14 as alpine

RUN  wget https://github.com/kintone/cli-kintone/releases/download/v1.10.11/cli-kintone_v1.10.11_linux.zip \
     && unzip cli-kintone_v1.10.11_linux.zip \
     && chmod +x cli-kintone-linux/cli-kintone \
     && mv cli-kintone-linux/cli-kintone /usr/local/bin/     

FROM node:21-alpine

WORKDIR /app

COPY --from=alpine /usr/local/bin/cli-kintone /usr/local/bin/
RUN apk add --no-cache gcompat \
     && chmod +x /usr/local/bin/cli-kintone \
     && npm config set update-notifier false

COPY package*.json . ./
COPY --from=build /app ./

ENV NODE_ENV production

CMD ["npm", "start"]