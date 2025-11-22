FROM node:20-alpine AS base

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8.15.0

# Copy workspace files
COPY pnpm-workspace.yaml package.json ./
COPY .npmrc* ./
COPY pnpm-lock.yaml ./

# Copy all package.json files
COPY packages/*/package.json ./packages/*/
COPY apps/*/package.json ./apps/*/

# Install dependencies
# Use --no-frozen-lockfile if lockfile is outdated (will update it)
RUN pnpm install --frozen-lockfile || pnpm install --no-frozen-lockfile

# Copy source code
COPY . .

# Build all packages
RUN pnpm build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8.15.0

# Copy workspace files
COPY pnpm-workspace.yaml package.json ./
COPY pnpm-lock.yaml ./
COPY packages/*/package.json ./packages/*/
COPY apps/api/package.json ./apps/api/

# Install production dependencies only
# Use --no-frozen-lockfile if lockfile is outdated (will update it)
RUN pnpm install --frozen-lockfile --prod || pnpm install --no-frozen-lockfile --prod

# Copy built files
COPY --from=base /app/packages ./packages
COPY --from=base /app/apps/api/dist ./apps/api/dist

WORKDIR /app/apps/api

EXPOSE 3000

CMD ["node", "dist/main.js"]


