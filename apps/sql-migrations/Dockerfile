FROM node:12-alpine

RUN apk add --no-cache postgresql-client

ENV DB_USER ""
ENV DB_PASS ""
ENV DB_HOST ""
ENV DB_PORT ""
ENV DB_DB ""

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .

CMD exec ./wait_then_migrate.sh
