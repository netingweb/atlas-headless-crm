# MongoDB Replica Set Configuration for Local Development

## Overview

This guide explains the MongoDB Replica Set configuration for local development. The Indexer service requires MongoDB Change Streams, which only work with Replica Sets.

## Why Replica Set?

MongoDB Change Streams allow the Indexer to monitor database changes in real-time. However, Change Streams are **only supported on Replica Sets** or Sharded Clusters, not on standalone MongoDB instances.

Error without Replica Set:

```
MongoServerError: The $changeStream stage is only supported on replica sets
```

## Configuration

### Docker Compose Override

The `docker-compose.override.yml` file configures MongoDB as a single-node replica set for local development:

```yaml
services:
  mongo:
    ports:
      - '27017:27017'
    command: --replSet rs0 --bind_ip_all
    environment:
      MONGO_INITDB_DATABASE: crm_atlas
    healthcheck:
      test:
        [
          'CMD',
          'mongosh',
          '--eval',
          'try { rs.status().ok } catch(e) { rs.initiate({_id:"rs0",members:[{_id:0,host:"mongo:27017"}]}).ok }',
        ]
      interval: 10s
      timeout: 10s
      retries: 5
      start_period: 40s
```

**What this does:**

- `--replSet rs0`: Starts MongoDB as part of replica set named "rs0"
- `--bind_ip_all`: Allows connections from any IP (needed for Docker networking)
- Healthcheck automatically initializes the replica set on first start

### Connection String

The `.env` file must include the replica set name in the connection string:

```env
MONGODB_URI=mongodb://localhost:27017/crm_atlas?replicaSet=rs0&directConnection=true
```

**Parameters:**

- `replicaSet=rs0`: Specifies the replica set name
- `directConnection=true`: Allows direct connection to a single node (useful for local dev)

## Setup Instructions

### Initial Setup

1. **Update Docker Override** (already done):

   ```bash
   # The docker-compose.override.yml already includes the replica set config
   ```

2. **Update .env file** (already done):

   ```bash
   # The .env file already includes the correct connection string
   ```

3. **Restart MongoDB**:

   ```bash
   docker compose stop mongo
   docker compose rm -f mongo
   docker compose up -d mongo
   ```

4. **Wait for initialization** (30-40 seconds):

   ```bash
   # The healthcheck will automatically initialize the replica set
   sleep 40
   ```

5. **Verify replica set status**:
   ```bash
   docker exec crm-atlas-mongo mongosh --eval "rs.status()"
   ```

### Verification

Check that MongoDB is running as PRIMARY:

```bash
docker exec crm-atlas-mongo mongosh --quiet --eval "rs.status().members.forEach(m => print('Member:', m.name, 'State:', m.stateStr))"
```

Expected output:

```
Member: mongo:27017 State: PRIMARY
```

## Development Workflow

### Starting Services

```bash
# Start all database services
docker compose up -d mongo redis typesense qdrant minio

# Wait for MongoDB replica set to initialize (first time only)
sleep 40

# Start backend services (API, Indexer, Workflow, MCP)
pnpm dev:backend
```

### Testing Change Streams

The Indexer should now work without errors. You can verify by checking the logs:

```bash
# In the terminal where dev:backend is running, look for:
✓ Monitoring: demo2_milano_sales_contact (milano_sales)
✓ Monitoring: demo2_milano_sales_company (milano_sales)
# ... etc (no more change stream errors)
```

## Troubleshooting

### Error: "The $changeStream stage is only supported on replica sets"

**Cause**: MongoDB is not running as a replica set.

**Solution**:

1. Check docker-compose.override.yml has the replica set configuration
2. Restart MongoDB: `docker compose stop mongo && docker compose rm -f mongo && docker compose up -d mongo`
3. Wait 40 seconds for initialization
4. Verify: `docker exec crm-atlas-mongo mongosh --eval "rs.status().ok"`

### Error: "MongoNetworkError: connection refused"

**Cause**: MongoDB is not running or not fully initialized.

**Solution**:

```bash
# Check if MongoDB is running
docker compose ps mongo

# Check MongoDB logs
docker compose logs mongo --tail 50

# If not running, start it
docker compose up -d mongo
```

### Replica Set Not Initialized

**Symptoms**:

- `rs.status()` returns an error
- Healthcheck keeps restarting

**Solution**:

```bash
# Manually initialize the replica set
docker exec crm-atlas-mongo mongosh --eval '
  rs.initiate({
    _id: "rs0",
    members: [{
      _id: 0,
      host: "mongo:27017"
    }]
  })
'

# Wait a few seconds and verify
docker exec crm-atlas-mongo mongosh --eval "rs.status()"
```

### Data Persistence

**Note**: The MongoDB data is stored in a Docker volume `mongo_data`.

To completely reset MongoDB (including replica set config):

```bash
# WARNING: This deletes ALL data!
docker compose down
docker volume rm crm-atlas_mongo_data
docker compose up -d mongo
```

## Production Considerations

### Production Replica Set

For production, use a **3-node replica set** (minimum) for high availability:

```yaml
# docker-compose.yml (production)
services:
  mongo-1:
    image: mongo:7.0
    command: --replSet rs0
    # ... configuration

  mongo-2:
    image: mongo:7.0
    command: --replSet rs0
    # ... configuration

  mongo-3:
    image: mongo:7.0
    command: --replSet rs0
    # ... configuration
```

### Connection String for Production

```env
# Multi-node replica set
MONGODB_URI=mongodb://mongo-1:27017,mongo-2:27017,mongo-3:27017/crm_atlas?replicaSet=rs0
```

### Performance Considerations

- **Write Concern**: Default is `majority` for replica sets (safer but slower)
- **Read Preference**: Can use `secondaryPreferred` to distribute read load
- **Change Streams**: Use resume tokens for resuming after disconnection

## References

- [MongoDB Replica Set Deployment](https://www.mongodb.com/docs/manual/replication/)
- [MongoDB Change Streams](https://www.mongodb.com/docs/manual/changeStreams/)
- [Docker Compose MongoDB Replica Set](https://www.mongodb.com/compatibility/docker)

## Summary

✅ **What was configured:**

1. MongoDB runs as single-node replica set (`rs0`) in local development
2. Automatic replica set initialization via healthcheck
3. Connection string includes `replicaSet=rs0&directConnection=true`
4. Indexer can now use Change Streams without errors

✅ **Benefits:**

- Real-time indexing works correctly
- Development environment matches production (both use replica sets)
- No more "change stream not supported" errors
- Data persistence maintained

✅ **Trade-offs:**

- Slightly longer startup time (40 seconds for initialization)
- Slightly more memory usage (~50MB extra)
- Still perfectly fine for local development
