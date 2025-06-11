// Simple script to import sample meetup data
import { runImport } from './import_sample_data';

// Run the import
runImport(false) // Set to true to force overwrite existing data
  .then(() => {
    console.log('✅ Import completed successfully!');
    console.log('🔗 Visit /meetup to see your events');
  })
  .catch((error) => {
    console.error('❌ Import failed:', error);
  }); 