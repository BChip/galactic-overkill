FROM node:20 as build

WORKDIR /app

COPY client ./client

RUN cd client && npm install
RUN cd client && npm run build

COPY server ./server

RUN cd server && npm install
RUN cd server && npm run build

FROM node:20 AS production

ENV NODE_ENV=production

WORKDIR /app

COPY --from=build /app/server/package*.json ./server/
RUN cd server && npm install --omit=dev

COPY --from=build /app/client/dist ./server/build/client
COPY --from=build /app/server/lib ./server/build

EXPOSE 2567

# Step 7: Start the Colyseus server
CMD [ "node", "server/build/index.js" ]