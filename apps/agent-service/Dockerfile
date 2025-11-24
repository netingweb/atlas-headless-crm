FROM node:20-alpine AS base

WORKDIR /app

RUN npm install -g pnpm@8.15.0

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
RUN mkdir -p packages/auth packages/config packages/core packages/db packages/types packages/utils apps/agent-service
COPY packages/auth/package.json ./packages/auth/
COPY packages/config/package.json ./packages/config/
COPY packages/core/package.json ./packages/core/
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY apps/agent-service/package.json ./apps/agent-service/

RUN pnpm install --filter ./apps/agent-service... --frozen-lockfile || pnpm install --filter ./apps/agent-service... --no-frozen-lockfile

COPY . .

RUN pnpm --filter @crm-atlas/agent-service build

FROM node:20-alpine AS production

WORKDIR /app

RUN npm install -g pnpm@8.15.0

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
RUN mkdir -p packages/auth packages/config packages/core packages/db packages/types packages/utils apps/agent-service
COPY packages/auth/package.json ./packages/auth/
COPY packages/config/package.json ./packages/config/
COPY packages/core/package.json ./packages/core/
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY apps/agent-service/package.json ./apps/agent-service/

ENV HUSKY=0
ENV CI=true
RUN if [ -f /app/package.json ]; then sed -i.bak '/"prepare":/d' /app/package.json || true; fi && \
    pnpm install --filter ./apps/agent-service... --frozen-lockfile --prod || \
    pnpm install --filter ./apps/agent-service... --no-frozen-lockfile --prod && \
    if [ -f /app/package.json.bak ]; then mv /app/package.json.bak /app/package.json; fi

COPY --from=base /app/apps/agent-service/dist ./apps/agent-service/dist
COPY --from=base /app/config ./config

ENV NODE_PATH=/app/node_modules:/app/apps/agent-service/node_modules

EXPOSE 4100

CMD ["node", "apps/agent-service/dist/apps/agent-service/src/main.js"]

