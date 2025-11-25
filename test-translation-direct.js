// Quick test to verify translation is working
const { i18next } = require('./i18n');

// Wait for i18next to be ready
setTimeout(() => {
  const t = i18next.getFixedT('ar', 'translation');
  console.log('Test 1 - Apartment:', t('propertyType.Apartment'));
  console.log('Test 2 - Villa/farms:', t('propertyType.Villa/farms'));
  console.log('Test 3 - Villa/Farms:', t('propertyType.Villa/Farms'));
  console.log('Test 4 - Category message:', t('category.fetch_success'));
  
  // Test with English
  const tEn = i18next.getFixedT('en', 'translation');
  console.log('\nEnglish tests:');
  console.log('Test 1 - Apartment:', tEn('propertyType.Apartment'));
  console.log('Test 2 - Category message:', tEn('category.fetch_success'));
}, 1000);


