# Issue Explanation: MongoDB Connection Options Error

## The Problem

The server was crashing with this error:
```
MongoDB connection error: options buffermaxentries, maxtimems are not supported
```

## Root Cause

I had added invalid options to the Mongoose connection configuration:

```javascript
// ❌ WRONG - These are NOT valid Mongoose connection options
const connectOptions = {
  // ... other valid options ...
  bufferMaxEntries: 1000,  // ❌ NOT SUPPORTED
  maxTimeMS: 30000,         // ❌ NOT SUPPORTED
  bufferCommands: true      // ❌ NOT A CONNECTION OPTION
};
```

## Why These Options Are Invalid

1. **`bufferMaxEntries`**: This is not a valid Mongoose connection option. Mongoose handles command buffering internally and doesn't accept this as a connection parameter.

2. **`maxTimeMS`**: This is a **query option**, not a connection option. It should be used in individual queries like:
   ```javascript
   Model.find({}).maxTimeMS(30000)
   ```
   Not in the connection configuration.

3. **`bufferCommands`**: This is a **global Mongoose setting**, not a connection option. It should be set using `mongoose.set()`, not in connection options.

## The Fix

I removed the invalid options from the connection configuration and moved `bufferCommands` to the correct place:

```javascript
// ✅ CORRECT - Only valid connection options
const connectOptions = {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 60000,
  connectTimeoutMS: 30000,
  maxPoolSize: 10,
  minPoolSize: 1,
  retryWrites: true,
  w: 'majority',
  retryReads: true
  // ✅ Removed: bufferMaxEntries, maxTimeMS
};

// ✅ CORRECT - Global Mongoose settings
mongoose.set('bufferTimeoutMS', 30000);
mongoose.set('bufferCommands', true);
```

## Valid Mongoose Connection Options

The valid options for `mongoose.connect()` are:
- `serverSelectionTimeoutMS` - Time to wait for server selection
- `socketTimeoutMS` - Time before closing idle sockets
- `connectTimeoutMS` - Time to wait for initial connection
- `maxPoolSize` - Maximum number of connections in pool
- `minPoolSize` - Minimum number of connections in pool
- `retryWrites` - Enable retry writes
- `w` - Write concern (e.g., 'majority')
- `retryReads` - Enable retry reads

## Global Mongoose Settings (use `mongoose.set()`)

- `bufferTimeoutMS` - Time to wait before timing out buffered commands
- `bufferCommands` - Enable/disable command buffering

## Result

After fixing this, the server now:
- ✅ Connects to MongoDB successfully
- ✅ Waits for connection before accepting requests
- ✅ All APIs work correctly
- ✅ Caching is functioning properly

