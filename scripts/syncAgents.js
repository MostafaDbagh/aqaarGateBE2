#!/usr/bin/env node

/**
 * Script to sync agent data between local and production databases
 * 
 * Usage:
 *   node scripts/syncAgents.js --source <sourceURI> --target <targetURI>
 *   node scripts/syncAgents.js --from-production --to-local
 *   node scripts/syncAgents.js --from-local --to-production
 * 
 * Environment variables:
 *   SOURCE_MONGO_URI - Source database URI
 *   TARGET_MONGO_URI - Target database URI
 *   MONGO_URI - Used for both if SOURCE/TARGET not provided
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user.model');
const logger = require('../utils/logger');

// Parse command line arguments
const args = process.argv.slice(2);
const argMap = {};

for (let i = 0; i < args.length; i += 2) {
  const key = args[i]?.replace('--', '');
  const value = args[i + 1];
  if (key) argMap[key] = value || true;
}

// Determine source and target URIs
let sourceURI, targetURI;

if (argMap['from-production'] || argMap['from-prod']) {
  sourceURI = process.env.PRODUCTION_MONGO_URI || process.env.MONGO_URI;
  targetURI = process.env.LOCAL_MONGO_URI || process.env.MONGO_URI;
} else if (argMap['from-local']) {
  sourceURI = process.env.LOCAL_MONGO_URI || process.env.MONGO_URI;
  targetURI = process.env.PRODUCTION_MONGO_URI || process.env.MONGO_URI;
} else {
  sourceURI = argMap.source || process.env.SOURCE_MONGO_URI || process.env.MONGO_URI;
  targetURI = argMap.target || process.env.TARGET_MONGO_URI || process.env.MONGO_URI;
}

if (!sourceURI || !targetURI) {
  console.error('❌ Error: Source and target database URIs are required');
  console.error('\nUsage:');
  console.error('  node scripts/syncAgents.js --source <sourceURI> --target <targetURI>');
  console.error('  node scripts/syncAgents.js --from-production --to-local');
  console.error('  node scripts/syncAgents.js --from-local --to-production');
  console.error('\nOr set environment variables:');
  console.error('  SOURCE_MONGO_URI or PRODUCTION_MONGO_URI');
  console.error('  TARGET_MONGO_URI or LOCAL_MONGO_URI');
  process.exit(1);
}

// Connection options
const connectOptions = {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  maxPoolSize: 10,
  minPoolSize: 5,
  retryWrites: true,
  w: 'majority'
};

async function syncAgents() {
  let sourceConnection = null;
  let targetConnection = null;

  try {
    console.log('🔄 Starting agent sync...');
    console.log(`📥 Source: ${sourceURI.substring(0, 30)}...`);
    console.log(`📤 Target: ${targetURI.substring(0, 30)}...\n`);

    // Connect to source database
    console.log('📡 Connecting to source database...');
    sourceConnection = await mongoose.createConnection(sourceURI, connectOptions);
    const SourceUser = sourceConnection.model('User', User.schema);
    console.log('✅ Connected to source database\n');

    // Connect to target database
    console.log('📡 Connecting to target database...');
    targetConnection = await mongoose.createConnection(targetURI, connectOptions);
    const TargetUser = targetConnection.model('User', User.schema);
    console.log('✅ Connected to target database\n');

    // Fetch agents from source
    console.log('📥 Fetching agents from source database...');
    const sourceAgents = await SourceUser.find({ role: 'agent' })
      .select('-password -__v')
      .lean();
    console.log(`✅ Found ${sourceAgents.length} agents in source database\n`);

    if (sourceAgents.length === 0) {
      console.log('⚠️  No agents found in source database. Nothing to sync.');
      return;
    }

    // Sync each agent to target
    console.log('📤 Syncing agents to target database...\n');
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors = [];

    for (const sourceAgent of sourceAgents) {
      try {
        // Check if agent exists in target (by email or _id)
        const existingAgent = await TargetUser.findOne({
          $or: [
            { email: sourceAgent.email },
            { _id: sourceAgent._id }
          ]
        });

        if (existingAgent) {
          // Update existing agent (except password)
          const { password, ...updateData } = sourceAgent;
          await TargetUser.findByIdAndUpdate(
            existingAgent._id,
            { $set: updateData },
            { new: true, runValidators: true }
          );
          updated++;
          console.log(`  ✅ Updated: ${sourceAgent.email || sourceAgent.username}`);
        } else {
          // Create new agent
          const { _id, password, ...newAgentData } = sourceAgent;
          const newAgent = new TargetUser({
            ...newAgentData,
            password: 'TEMPORARY_PASSWORD_' + Date.now(), // Set temporary password
            role: 'agent'
          });
          await newAgent.save();
          created++;
          console.log(`  ➕ Created: ${sourceAgent.email || sourceAgent.username}`);
        }
      } catch (error) {
        errors.push({ agent: sourceAgent.email || sourceAgent.username, error: error.message });
        skipped++;
        console.log(`  ❌ Error syncing ${sourceAgent.email || sourceAgent.username}: ${error.message}`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Sync Summary:');
    console.log('='.repeat(50));
    console.log(`✅ Created: ${created}`);
    console.log(`🔄 Updated: ${updated}`);
    console.log(`⏭️  Skipped/Errors: ${skipped}`);
    console.log(`📦 Total processed: ${sourceAgents.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      errors.forEach(({ agent, error }) => {
        console.log(`  - ${agent}: ${error}`);
      });
    }

    console.log('\n✅ Agent sync completed!');
    console.log('\n⚠️  Note: Newly created agents have temporary passwords.');
    console.log('   They will need to reset their passwords before logging in.');

  } catch (error) {
    console.error('❌ Error during sync:', error);
    throw error;
  } finally {
    // Close connections
    if (sourceConnection) {
      await sourceConnection.close();
      console.log('\n🔌 Closed source database connection');
    }
    if (targetConnection) {
      await targetConnection.close();
      console.log('🔌 Closed target database connection');
    }
    process.exit(0);
  }
}

// Run sync
syncAgents().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

