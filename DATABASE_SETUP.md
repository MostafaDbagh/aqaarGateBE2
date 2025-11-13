# Database Configuration

## Current Setup

Both **local** and **production** environments are now configured to use the **same database**:

- **Database**: `SyProperties`
- **Cluster**: `cluster0-ags3s.mongodb.net`
- **Connection String**: `mongodb+srv://safi:35064612@cluster0-ags3s.mongodb.net/SyProperties?retryWrites=true&w=majority`

## Environment Variables

### Local (`.env` file in `api/` directory)
```env
MONGO_URI=mongodb+srv://safi:35064612@cluster0-ags3s.mongodb.net/SyProperties?retryWrites=true&w=majority
JWT_SECRET=5345jkj5kl34j5kl34j5
NODE_ENV=production
PORT=5500
```

### Production (Heroku Config Vars)
- `MONGO_URI`: Same connection string as local
- `MONGODB_URI`: Same connection string (kept for backward compatibility)
- Other environment variables as needed

## Code Support

The database connection code (`api/db/connect.js`) now supports both variable names:
- `MONGO_URI` (primary)
- `MONGODB_URI` (fallback for compatibility)

## Important Notes

⚠️ **Both environments share the same database**, which means:
- ✅ Data changes in local will appear in production
- ✅ Data changes in production will appear in local
- ✅ No data sync needed - they're always in sync
- ⚠️ Be careful when testing - changes affect both environments

## Troubleshooting

If you see different data between local and production:

1. **Check connection strings match exactly**:
   ```bash
   # Local
   cat api/.env | grep MONGO_URI
   
   # Production
   heroku config:get MONGO_URI -a proty-api-mostafa
   ```

2. **Verify database connection**:
   - Check MongoDB Atlas cluster status
   - Verify IP whitelist allows your local IP
   - Check network connectivity

3. **Check if using different databases**:
   - Verify the database name in connection string is `SyProperties`
   - Check MongoDB Atlas for multiple databases

4. **Restart services**:
   ```bash
   # Restart local
   # Stop and restart your local server
   
   # Restart production
   heroku restart -a proty-api-mostafa
   ```

