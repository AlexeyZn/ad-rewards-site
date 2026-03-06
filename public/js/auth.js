// Auth functions
const checkAuth = async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        window.location.href = '/dashboard.html';
    }
};

const showLoginForm = () => {
    document.getElementById('login-form-container').classList.remove('hidden');
    document.getElementById('register-form-container').classList.add('hidden');
    document.getElementById('auth-title').innerText = 'Welcome Back';
    document.getElementById('auth-subtitle').innerText = 'Login to continue earning';
};

const showRegisterForm = () => {
    document.getElementById('login-form-container').classList.add('hidden');
    document.getElementById('register-form-container').classList.remove('hidden');
    document.getElementById('auth-title').innerText = 'Create an Account';
    document.getElementById('auth-subtitle').innerText = 'Start earning Naira today by viewing ads';

    // Auto-fill referral code if present in URL
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    if (ref) {
        document.getElementById('reg-referred').value = ref;
    }
};

// Generate a random referral code
const generateReferralCode = (length = 8) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

document.addEventListener('DOMContentLoaded', () => {
    // Check if user is already logged in
    checkAuth();

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('ref')) {
        showRegisterForm();
    }

    // Toggle forms
    document.getElementById('show-register').addEventListener('click', (e) => {
        e.preventDefault();
        showRegisterForm();
    });

    document.getElementById('show-login').addEventListener('click', (e) => {
        e.preventDefault();
        showLoginForm();
    });

    // Login Submission
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errDiv = document.getElementById('login-error');
        const btn = e.target.querySelector('button');

        errDiv.innerText = '';
        btn.innerText = 'Logging in...';
        btn.disabled = true;

        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                errDiv.innerText = error.message;
            } else if (data.session) {
                window.location.href = '/dashboard.html';
            }
        } catch (error) {
            console.error(error);
            errDiv.innerText = 'An unexpected error occurred. Please try again.';
        } finally {
            btn.innerText = 'Login';
            btn.disabled = false;
        }
    });

    // Register Submission
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('reg-username').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const referred_by = document.getElementById('reg-referred').value || null;
        const errDiv = document.getElementById('reg-error');
        const btn = e.target.querySelector('button');

        errDiv.innerText = '';
        btn.innerText = 'Creating account...';
        btn.disabled = true;

        try {
            // 1. Sign up the user in Supabase Auth
            const { data: authData, error: authError } = await supabaseClient.auth.signUp({
                email,
                password,
            });

            if (authError) {
                errDiv.className = 'error-text mb-2 text-center';
                errDiv.innerText = authError.message;
                btn.innerText = 'Create Account';
                btn.disabled = false;
                return;
            }

            // 2. Insert their profile into the "users" table
            const user = authData.user;
            if (user) {
                const referralCode = generateReferralCode();

                const { error: dbError } = await supabaseClient
                    .from('users')
                    .insert([
                        {
                            id: user.id,
                            username: username,
                            email: email,
                            referral_code: referralCode,
                            referred_by: referred_by,
                            balance: 0,
                            total_ads_viewed: 0
                        }
                    ]);

                if (dbError) {
                    // Try to clean up auth if DB insert fails (optional depending on strictness)
                    console.error("Database insert error:", dbError);
                    errDiv.className = 'error-text mb-2 text-center';
                    errDiv.innerText = 'Account created, but failed to save profile. ' + dbError.message;
                    return;
                }
            }

            errDiv.className = 'success-text mb-2 text-center';
            errDiv.innerText = 'Account created! If email confirmations are enabled, please check your inbox. Otherwise, you can login now.';

            setTimeout(() => {
                showLoginForm();
                document.getElementById('login-email').value = email;
                document.getElementById('login-password').value = password;
                errDiv.innerText = '';
            }, 3000);

        } catch (error) {
            console.error('Registration Error:', error);
            errDiv.className = 'error-text mb-2 text-center';
            errDiv.innerText = 'Error: ' + (error.message || 'Network error. Please try again.');
        } finally {
            btn.innerText = 'Create Account';
            btn.disabled = false;
        }
    });
});
