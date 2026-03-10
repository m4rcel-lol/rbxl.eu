FROM node:20-alpine

LABEL maintainer="rbxl.eu"
LABEL description="rbxl.eu — Really Beautiful eXtraordinary Link hosting platform"

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY backend/package*.json ./

RUN npm ci --only=production && \
    npm cache clean --force

COPY backend/src ./src

RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/rbxl.db

EXPOSE 3000

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

CMD ["node", "src/index.js"]
