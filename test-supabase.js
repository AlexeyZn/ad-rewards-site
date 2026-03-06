const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ngrodfzmeqmepofxpjhu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncm9kZnptZXFtZXBvZnhwamh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3OTc4NjYsImV4cCI6MjA4NzM3Mzg2Nn0.NcIhrBJKz34xYDxjM379Pmyb0dpvzhFiFz5zt-iEs0k';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const email = `testuser${Date.now()}@example.com`;
const username = `testuser${Date.now()}`;
const password = `testpassword123`;

async function testSignup() {
    console.log('Testing signup with', { email, username });

    // 1. Sign up the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
    });

    if (authError) {
        console.error('Auth Error:', authError.message);
        return;
    }

    console.log('Auth success. User ID:', authData.user?.id);

    // 2. Insert their profile into the "users" table
    const user = authData.user;
    if (user) {
        const referralCode = 'TESTREF';

        const { data, error: dbError } = await supabase
            .from('users')
            .insert([
                {
                    id: user.id,
                    username: username,
                    email: email,
                    referral_code: referralCode,
                    referred_by: null,
                    balance: 0,
                    total_ads_viewed: 0
                }
            ]);

        if (dbError) {
            console.error("Database insert error:", JSON.stringify(dbError, null, 2));
            return;
        }

        console.log('Database insert success:', data);
    }
}

testSignup();
