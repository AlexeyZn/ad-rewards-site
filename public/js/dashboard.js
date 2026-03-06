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
