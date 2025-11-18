/**
 * Manual Property Rental API Test
 * This test verifies the API structure and provides a curl command for testing
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Property Rental API Structure\n');
console.log('='.repeat(80));

// Check if files exist
const files = {
  route: './routes/propertyRental.route.js',
  controller: './controllers/propertyRental.controller.js',
  model: './models/propertyRental.model.js'
};

let allFilesExist = true;

for (const [name, filePath] of Object.entries(files)) {
  const fullPath = path.join(__dirname, filePath);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${name}: ${filePath} exists`);
  } else {
    console.log(`❌ ${name}: ${filePath} NOT FOUND`);
    allFilesExist = false;
  }
}

// Check if route is registered in index.js
const indexPath = path.join(__dirname, 'index.js');
if (fs.existsSync(indexPath)) {
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  if (indexContent.includes('property-rental') && indexContent.includes('propertyRentalRoutes')) {
    console.log(`✅ Route registered in index.js`);
  } else {
    console.log(`❌ Route NOT registered in index.js`);
    allFilesExist = false;
  }
} else {
  console.log(`❌ index.js NOT FOUND`);
  allFilesExist = false;
}

console.log('\n' + '='.repeat(80));

if (allFilesExist) {
  console.log('\n✅ All files exist and route is registered!');
  console.log('\n📋 To test the API, use one of these methods:\n');
  
  console.log('1. Using curl:');
  console.log(`
curl -X POST http://localhost:5500/api/property-rental \\
  -H "Content-Type: application/json" \\
  -d '{
    "ownerName": "Test Owner",
    "ownerEmail": "test@example.com",
    "ownerPhone": "+963999123456",
    "propertyType": "apartment",
    "propertySize": 1200,
    "bedrooms": 3,
    "bathrooms": 2,
    "location": "Damascus, Al-Mazzeh",
    "features": "Furnished, parking, garden",
    "additionalDetails": "Test request"
  }'
  `);
  
  console.log('\n2. Using the test script (when server is running):');
  console.log('   node test-property-rental-simple.js\n');
  
  console.log('3. Expected Response (Success):');
  console.log(`
{
  "success": true,
  "message": "Property rental service request submitted successfully...",
  "data": {
    "id": "...",
    "status": "pending"
  }
}
  `);
  
  console.log('4. Expected Response (Validation Error):');
  console.log(`
{
  "success": false,
  "message": "All required fields must be provided"
}
  `);
} else {
  console.log('\n❌ Some files are missing. Please check the errors above.');
  process.exit(1);
}

console.log('\n' + '='.repeat(80));

