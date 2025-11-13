# Database Sync Scripts

## Sync Agents Script

This script syncs agent data (users with `role='agent'`) between local and production databases.

### Prerequisites

1. MongoDB connection strings for both source and target databases
2. Node.js and npm installed
3. All dependencies installed (`npm install`)

### Setup

#### Option 1: Use Environment Variables

Create a `.env` file in the `api/` directory with:

```env
# Production database URI
PRODUCTION_MONGO_URI=mongodb+srv://username:password@production-cluster.mongodb.net/dbname

# Local database URI
LOCAL_MONGO_URI=mongodb://localhost:27017/localdb
# OR
LOCAL_MONGO_URI=mongodb+srv://username:password@local-cluster.mongodb.net/dbname

# Or use the same for both (if syncing between same database)
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname
```

#### Option 2: Use Command Line Arguments

Pass URIs directly via command line.

### Usage

#### Method 1: Using NPM Scripts (Recommended)

```bash
# Sync from production to local
npm run sync:agents:prod-to-local

# Sync from local to production
npm run sync:agents:local-to-prod

# Generic sync (requires environment variables)
npm run sync:agents -- --source <sourceURI> --target <targetURI>
```

#### Method 2: Direct Node Command

```bash
# Sync from production to local
node scripts/syncAgents.js --from-production --to-local

# Sync from local to production
node scripts/syncAgents.js --from-local --to-production

# Custom source and target
node scripts/syncAgents.js --source <sourceURI> --target <targetURI>
```

### How It Works

1. **Connects** to both source and target databases
2. **Fetches** all users with `role='agent'` from source database
3. **Syncs** each agent to target database:
   - If agent exists (by email or _id): **Updates** the existing record
   - If agent doesn't exist: **Creates** a new record with temporary password
4. **Reports** summary of created, updated, and skipped records

### Important Notes

⚠️ **Password Handling**: 
- Existing agents: Password is preserved (not updated)
- New agents: Temporary password is set (`TEMPORARY_PASSWORD_<timestamp>`)
- New agents will need to reset their password before logging in

⚠️ **Data Safety**: 
- The script only updates agent data, not passwords for existing agents
- It matches agents by email or _id to avoid duplicates

### Example Output

```
🔄 Starting agent sync...
📥 Source: mongodb+srv://user@prod-clu...
📤 Target: mongodb://localhost:27017/...

📡 Connecting to source database...
✅ Connected to source database

📡 Connecting to target database...
✅ Connected to target database

📥 Fetching agents from source database...
✅ Found 10 agents in source database

📤 Syncing agents to target database...

  ✅ Updated: ahmad.al-hassan@syrianproperties.com
  ➕ Created: tarek.farouk@syrianproperties.com
  ✅ Updated: mohammad.ali@syrianproperties.com
  ...

==================================================
📊 Sync Summary:
==================================================
✅ Created: 3
🔄 Updated: 7
⏭️  Skipped/Errors: 0
📦 Total processed: 10

✅ Agent sync completed!

⚠️  Note: Newly created agents have temporary passwords.
   They will need to reset their passwords before logging in.
```

### Troubleshooting

**Connection Errors**:
- Verify MongoDB connection strings are correct
- Check network access (firewall, VPN)
- Ensure IP addresses are whitelisted in MongoDB Atlas (if using Atlas)

**Authentication Errors**:
- Verify username and password in connection string
- Check database user permissions

**No Agents Found**:
- Verify source database has users with `role='agent'`
- Check if you're connecting to the correct database

### Using Same Database for Local and Production

If you want to use the same database for both local and production:

1. Set the same `MONGO_URI` in both environments
2. Or set `PRODUCTION_MONGO_URI` and `LOCAL_MONGO_URI` to the same value
3. No sync needed - data will be automatically shared

This is the simplest approach if you want to keep data consistent across environments.

