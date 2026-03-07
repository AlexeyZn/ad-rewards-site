document.addEventListener('DOMContentLoaded', async () => {
    // Check Auth
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        window.location.href = '/';
        return;
    }

    const userId = session.user.id;

    // Logout
    document.getElementById('logout-btn').addEventListener('click', async (e) => {
        e.preventDefault();
        await supabaseClient.auth.signOut();
        window.location.href = '/';
    });

    // Fetch user info from Supabase public.users table
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .select('username, balance, total_ads_viewed, referral_code')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error fetching dashboard data:', error);
            return;
        }

        if (data) {
            document.getElementById('user-greeting').innerText = `Hello, ${data.username}`;
            document.getElementById('balance-display').innerText = (data.balance || 0).toLocaleString();
            document.getElementById('ads-viewed-display').innerText = (data.total_ads_viewed || 0).toLocaleString();

            const refLink = `${window.location.origin}/?ref=${data.referral_code}`;
            document.getElementById('referral-link').value = refLink;

            // Withdrawal Timer Logic
            // The public.users table does not contain created_at, so we use the session user's created_at.
            const createdAt = new Date(session.user.created_at);
            const withdrawalDate = new Date(createdAt.getTime() + (20 * 24 * 60 * 60 * 1000));
            const now = new Date();
            const timeDiff = withdrawalDate.getTime() - now.getTime();

            const timerElement = document.getElementById('withdrawal-timer');

            if (timeDiff <= 0) {
                // Time has passed
                timerElement.innerHTML = `<span style="color: var(--primary-color);">Unlocked! You can now request a withdrawal.</span>`;
            } else {
                // Calculate days remaining
                const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
                timerElement.innerText = `Available in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`;
            }
        }

    } catch (err) {
        console.error('Unexpected error fetching dashboard data:', err);
    }

    // Copy Referral Link
    document.getElementById('copy-ref-btn').addEventListener('click', () => {
        const refInput = document.getElementById('referral-link');
        refInput.select();
        refInput.setSelectionRange(0, 99999); // For mobile devices

        try {
            document.execCommand('copy');
            const btn = document.getElementById('copy-ref-btn');
            const originalText = btn.innerText;
            btn.innerText = 'Copied!';
            setTimeout(() => { btn.innerText = originalText; }, 2000);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    });

    // Listen for auth state changes (e.g. if their token expires)
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
            window.location.href = '/';
        }
    });
});
