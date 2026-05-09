const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();
const appEnv = process.env.APP_ENV || 'local';
dotenv.config({ path: path.resolve(process.cwd(), `.env.${appEnv}`), override: true });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const BUCKETS = [
  {
    id: process.env.SUPABASE_STORAGE_RECORDS_BUCKET || 'health-records',
    name: 'Health Records',
    public: false // Health records should be private
  },
  {
    id: process.env.SUPABASE_STORAGE_PROFILE_BUCKET || 'profile-pictures',
    name: 'Profile Pictures',
    public: true // Profile pictures can be public for easy viewing
  }
];

async function setupStorage() {
  console.log('🚀 Starting Supabase Storage Setup...');
  
  for (const bucket of BUCKETS) {
    console.log(`\nChecking bucket: ${bucket.id} (${bucket.name})...`);
    
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error(`Error listing buckets: ${listError.message}`);
      continue;
    }
    
    const exists = buckets.some(b => b.id === bucket.id);
    
    if (exists) {
      console.log(`✅ Bucket "${bucket.id}" already exists.`);
    } else {
      console.log(`Creating bucket "${bucket.id}"...`);
      const { data, error } = await supabase.storage.createBucket(bucket.id, {
        public: bucket.public,
        allowedMimeTypes: bucket.id === 'profile-pictures' ? ['image/*'] : null,
        fileSizeLimit: 5242880 // 5MB limit
      });
      
      if (error) {
        console.error(`❌ Error creating bucket: ${error.message}`);
      } else {
        console.log(`✅ Bucket "${bucket.id}" created successfully.`);
      }
    }
  }

  console.log('\n✨ Storage setup complete.');
  console.log('Next Steps:');
  console.log('1. Set STORAGE_PROVIDER=supabase in your .env file.');
  console.log('2. Restart the backend server.');
}

setupStorage().catch(err => {
  console.error('Fatal error during setup:', err);
  process.exit(1);
});
