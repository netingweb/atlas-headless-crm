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

# Create package directories and copy package.json files
# This ensures pnpm can resolve workspace dependencies
RUN mkdir -p packages/auth packages/config packages/core packages/db \
    packages/documents packages/embeddings packages/search packages/storage \
    packages/types packages/utils apps/api

COPY packages/auth/package.json ./packages/auth/
COPY packages/config/package.json ./packages/config/
COPY packages/core/package.json ./packages/core/
COPY packages/db/package.json ./packages/db/
COPY packages/documents/package.json ./packages/documents/
COPY packages/embeddings/package.json ./packages/embeddings/
COPY packages/search/package.json ./packages/search/
COPY packages/storage/package.json ./packages/storage/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
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


