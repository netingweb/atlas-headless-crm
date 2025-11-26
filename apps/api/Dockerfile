FROM node:20 AS base

WORKDIR /app

# Install pnpm and tsx (needed for seed script inside container)
RUN npm install -g pnpm@8.15.0 tsx@4.7.0

# Copy workspace files
COPY pnpm-workspace.yaml package.json ./
COPY .npmrc* ./
COPY pnpm-lock.yaml ./

# Create package directories and copy package.json files
# This ensures pnpm can resolve workspace dependencies
RUN mkdir -p packages/auth packages/config packages/core packages/db \
    packages/documents packages/embeddings packages/search packages/storage \
    packages/types packages/utils \
    apps/api apps/agent-service apps/workflow apps/indexer apps/mcp-server apps/playground

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
COPY apps/agent-service/package.json ./apps/agent-service/
COPY apps/workflow/package.json ./apps/workflow/
COPY apps/indexer/package.json ./apps/indexer/
COPY apps/mcp-server/package.json ./apps/mcp-server/
COPY apps/playground/package.json ./apps/playground/

# Install dependencies
# Use --no-frozen-lockfile if lockfile is outdated (will update it)
RUN pnpm install --frozen-lockfile || pnpm install --no-frozen-lockfile

# Copy source code
COPY . .

# Build only required packages and apps for the API image
# We explicitly avoid building the agent-service here because it has its own Dockerfile
RUN pnpm -r --filter "./packages/*" \
    --filter @crm-atlas/api \
    --filter @crm-atlas/indexer \
    --filter @crm-atlas/workflow \
    --filter @crm-atlas/mcp-server build

# Production stage
FROM node:20 AS production

WORKDIR /app

# Install pnpm and tsx (needed for seed script inside container)
RUN npm install -g pnpm@8.15.0 tsx@4.7.0

# Copy workspace manifests so pnpm can find the monorepo root and scripts (seed)
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Reuse node_modules and built artifacts from the build stage so that
# workspace packages are fully available (for runtime and seed scripts)
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=base /app/packages ./packages
COPY --from=base /app/apps/api/dist ./apps/api/dist
COPY --from=base /app/scripts ./scripts

EXPOSE 3000

# Set NODE_PATH to help Node.js resolve pnpm modules correctly
# Include both root node_modules and package-specific node_modules
ENV NODE_PATH=/app/node_modules:/app/packages/auth/node_modules:/app/packages/config/node_modules:/app/packages/core/node_modules:/app/packages/db/node_modules:/app/packages/documents/node_modules:/app/packages/embeddings/node_modules:/app/packages/search/node_modules:/app/packages/storage/node_modules:/app/packages/types/node_modules:/app/packages/utils/node_modules:/app/apps/api/node_modules

# Run from workspace root
WORKDIR /app
CMD ["node", "apps/api/dist/apps/api/src/main.js"]


