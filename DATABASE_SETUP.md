# Database Configuration

## 🛡️ Database Separation (Development vs Production)

**IMPORTANT**: Development and production now use **separate databases** automatically to prevent accidental data loss or corruption.

### How It Works

The system automatically selects the correct database based on `NODE_ENV`:

- **Development** (`NODE_ENV=development`): Uses `SyProperties_Dev` database
- **Production** (`NODE_ENV=production`): Uses `SyProperties` database

The database name is automatically appended to your connection string, so you don't need to change it manually.

## Environment Variables

### Local Development (`.env` file in `api/` directory)
```env
# Set to development to use separate dev database
NODE_ENV=development

# Base connection string (database name will be auto-changed to SyProperties_Dev)
MONGO_URI=mongodb+srv://safi:35064612@cluster0-ags3s.mongodb.net/SyProperties?retryWrites=true&w=majority
JWT_SECRET=5345jkj5kl34j5kl34j5
PORT=5500
```

### Production (Heroku Config Vars)
```env
# Set to production to use production database
NODE_ENV=production

# Base connection string (database name will remain as SyProperties)
MONGO_URI=mongodb+srv://safi:35064612@cluster0-ags3s.mongodb.net/SyProperties?retryWrites=true&w=majority
# ... other environment variables
```

## Code Support

The database connection code (`api/db/connect.js`) automatically:
- Detects `NODE_ENV` environment variable
- Appends `_Dev` suffix to database name in development mode
- Uses production database name as-is in production mode
- Supports both `MONGO_URI` and `MONGODB_URI` variable names
- Shows warnings if production database is used in development

## Safety Features

✅ **Automatic Database Separation**: Development and production databases are automatically separated
✅ **Safety Warnings**: System warns if production database is accidentally used in development
✅ **Environment Detection**: Automatically detects environment from `NODE_ENV`
✅ **No Manual Changes Needed**: Database name is automatically adjusted based on environment

## Important Notes

🛡️ **Database Separation is Automatic**:
- ✅ Development changes only affect `SyProperties_Dev` database
- ✅ Production changes only affect `SyProperties` database
- ✅ No risk of accidentally modifying production data during development
- ✅ You can test freely without worrying about production data

⚠️ **Before First Use**:
- Make sure `NODE_ENV=development` is set in your local `.env` file
- The `SyProperties_Dev` database will be created automatically on first connection
- You may need to create initial data in the development database

## Troubleshooting

### Check Which Database You're Using

1. **Check your environment**:
   ```bash
   # Local - should show "development"
   cat api/.env | grep NODE_ENV
   
   # Production - should show "production"
   heroku config:get NODE_ENV -a proty-api-mostafa
   ```

2. **Verify database connection**:
   - Check MongoDB Atlas cluster status
   - Verify IP whitelist allows your local IP
   - Check network connectivity
   - Look at server startup logs - it will show which database is being used

3. **Check database names in MongoDB Atlas**:
   - Development should use: `SyProperties_Dev`
   - Production should use: `SyProperties`
   - Both databases should exist in your MongoDB Atlas cluster

4. **If you see production data in development**:
   - Check that `NODE_ENV=development` is set in your `.env` file
   - Restart your local server
   - Verify the connection log shows `Database: SyProperties_Dev`

5. **Restart services**:
   ```bash
   # Restart local
   # Stop and restart your local server
   
   # Restart production
   heroku restart -a proty-api-mostafa
   ```

## Manual Database Name Override

If you need to use a custom database name, you can set `MONGO_DB_NAME` in your `.env` file:

```env
MONGO_DB_NAME=MyCustomDatabaseName
```

This will override the automatic database name selection.

