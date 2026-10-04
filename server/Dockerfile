FROM node:24-bookworm AS build
RUN apt-get update && apt-get install -y --no-install-recommends openjdk-17-jdk-headless && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY . .
RUN ./gradlew :engine:jsPackage --no-daemon --no-build-cache
RUN npm ci
RUN npm run build -w server
RUN npm prune --omit=dev

FROM node:24-bookworm-slim
WORKDIR /app
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/server/dist /app/server/dist
USER node
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server/dist/index.mjs"]
