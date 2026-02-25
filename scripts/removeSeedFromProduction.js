/**
 * Remove seed data (listings + seed user) from the database.
 * Use this to clean production (or any DB) after seed was run by mistake.
 *
 * Run against PRODUCTION (or target DB):
 *   MONGO_URI="<production-uri>" node scripts/removeSeedFromProduction.js
 * Or set MONGO_URI in .env and run:
 *   node scripts/removeSeedFromProduction.js
 *
 * Removes:
 * - Listings where agentEmail = mostafa@burjx.com AND propertyKeyword matches "Seed N ..."
 * - User mostafa@burjx.com if they have no listings left after the above
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Listing = require('../models/listing.model');
const User = require('../models/user.model');

const SEED_AGENT_EMAIL = 'mostafa@burjx.com';
const SEED_KEYWORD_PATTERN = /^Seed \d+\s/; // "Seed 1 Apartment", "Seed 2 Villa", etc.

async function run() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('MONGO_URI not set. Set it to the DB you want to clean (e.g. production).');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to DB');

  const seedListings = await Listing.find({
    agentEmail: SEED_AGENT_EMAIL,
    propertyKeyword: SEED_KEYWORD_PATTERN,
  }).lean();

  const count = seedListings.length;
  if (count === 0) {
    console.log('No seed listings found (agentEmail=%s, propertyKeyword like "Seed N ...").', SEED_AGENT_EMAIL);
  } else {
    const ids = seedListings.map((l) => l._id);
    const result = await Listing.deleteMany({ _id: { $in: ids } });
    console.log('Deleted', result.deletedCount, 'seed listing(s).');
  }

  const user = await User.findOne({ email: SEED_AGENT_EMAIL }).select('_id').lean();
  if (user) {
    const remainingListings = await Listing.countDocuments({
      $or: [{ agentId: user._id }, { agentEmail: SEED_AGENT_EMAIL }],
    });
    if (remainingListings === 0) {
      await User.deleteOne({ _id: user._id });
      console.log('Deleted seed user:', SEED_AGENT_EMAIL);
    } else {
      console.log('Left user', SEED_AGENT_EMAIL, 'in place (still has', remainingListings, 'listing(s)).');
    }
  } else {
    console.log('No seed user found:', SEED_AGENT_EMAIL);
  }

  console.log('Done.');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
