/**
 * Seed 10 listings into a NON-PRODUCTION DB only. Never touches MONGO_URI (production).
 *
 * Run: node scripts/seedListingsForAgent.js
 *
 * Requires DEV_MONGO_URI in .env pointing at your dev/local DB.
 * This script never uses MONGO_URI, so production stays untouched.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Listing = require('../models/listing.model');
const User = require('../models/user.model');

const AGENT_EMAIL = 'mostafa@burjx.com';
const AGENT_DEFAULT_PASSWORD = 'DevPass123!'; // dev only
const COUNT = 10;

const propertyTypes = ['Apartment', 'Villa', 'Apartment', 'Townhouse', 'Apartment', 'Villa', 'Office', 'Apartment', 'Holiday Home', 'Apartment'];
const cities = ['Damascus', 'Aleppo', 'Latakia', 'Homs', 'Hama', 'Damascus', 'Tartus', 'Damascus', 'Latakia', 'Aleppo'];
const statuses = ['sale', 'rent', 'sale', 'rent', 'sale', 'rent', 'sale', 'rent', 'rent', 'sale'];
const rentTypes = ['monthly', 'monthly', 'monthly', 'weekly', 'monthly', 'yearly', 'monthly', 'monthly', 'weekly', 'monthly'];

async function run() {
  const devUri = process.env.DEV_MONGO_URI;
  if (!devUri) {
    console.error('Seed script only runs against a non-production DB.');
    console.error('Set DEV_MONGO_URI in .env to your dev database (MONGO_URI is never used for seeding).');
    process.exit(1);
  }

  console.log('Using DEV_MONGO_URI (non-production only)');

  await mongoose.connect(devUri);
  console.log('Connected to DB');

  let user = await User.findOne({ email: AGENT_EMAIL }).select('_id username email').lean();
  if (!user) {
    const hashedPassword = bcrypt.hashSync(AGENT_DEFAULT_PASSWORD, 10);
    const newUser = await User.create({
      username: 'mostafa_burjx',
      email: AGENT_EMAIL,
      password: hashedPassword,
      role: 'agent',
      agentName: 'Mostafa',
    });
    user = { _id: newUser._id, username: newUser.username, email: newUser.email };
    console.log('Created agent user:', user.email, '(password:', AGENT_DEFAULT_PASSWORD + ')');
  }
  const agentId = user._id;
  console.log('Agent:', user.email, agentId.toString());

  const propertyIdPrefix = `PROP_${Date.now()}`;
  let created = 0;
  for (let i = 0; i < COUNT; i++) {
    const listing = new Listing({
      propertyId: `${propertyIdPrefix}_${i}`,
      propertyType: propertyTypes[i],
      propertyKeyword: `Seed ${i + 1} ${propertyTypes[i]}`,
      propertyDesc: `Dev seed listing ${i + 1} for ${AGENT_EMAIL}`,
      propertyPrice: 50000 + i * 5000,
      currency: 'USD',
      status: statuses[i],
      rentType: statuses[i] === 'rent' ? rentTypes[i] : undefined,
      bedrooms: 2 + (i % 3),
      bathrooms: 1 + (i % 2),
      size: 80 + i * 15,
      sizeUnit: 'sqm',
      furnished: i % 2 === 0,
      garages: i % 3 === 0,
      country: 'Syria',
      city: cities[i],
      address: `${cities[i]}, Syria`,
      agent: AGENT_EMAIL,
      agentId,
      agentName: user.username || 'Mostafa',
      agentEmail: AGENT_EMAIL,
      agentNumber: '+963999000000',
      agentWhatsapp: '+963999000000',
      approvalStatus: 'approved',
      isFeatured: false,
      isDeleted: false,
      imageNames: [],
      images: [],
    });
    await listing.save();
    created++;
    console.log(`Created ${created}/${COUNT}: ${listing.propertyKeyword} (${listing._id})`);
  }

  console.log(`Done. Created ${created} listings for ${AGENT_EMAIL}`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
