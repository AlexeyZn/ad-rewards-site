document.addEventListener('DOMContentLoaded', async () => {
    // Check Auth
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        window.location.href = '/';
        return;
    }

    const userId = session.user.id;
    let timeLeft = 10;
    const timerDisplay = document.getElementById('timer-display');
    const progressFill = document.getElementById('progress-fill');
    const actionArea = document.getElementById('action-area');
    const rewardMessage = document.getElementById('reward-message');
    const adFrame = document.getElementById('ad-frame');

    // Simulate initial loading delay
    setTimeout(() => {
        startTimer();
    }, 1000);

    function startTimer() {
        const interval = setInterval(() => {
            timeLeft--;
            timerDisplay.innerText = Math.max(0, timeLeft);

            // Update progress bar (starts at 0%, goes to 100% over 10s)
            const pct = ((10 - timeLeft) / 10) * 100;
            progressFill.style.width = `${pct}%`;

            if (timeLeft <= 0) {
                clearInterval(interval);
                completeAdView();
            }
        }, 1000);
    }

    async function completeAdView() {
        timerDisplay.innerText = "Done!";
        adFrame.style.opacity = '0.5'; // Dim ad
        actionArea.classList.remove('hidden');

        try {
            // 1. Fetch current user data
            const { data: user, error: fetchErr } = await supabaseClient
                .from('users')
                .select('total_ads_viewed, balance, referred_by')
                .eq('id', userId)
                .single();

            if (fetchErr || !user) {
                throw fetchErr || new Error("User not found");
            }

            const newTotalAds = (user.total_ads_viewed || 0) + 1;
            let balanceIncrease = 0;

            // Every 5 ads = 200 Naira
            if (newTotalAds > 0 && newTotalAds % 5 === 0) {
                balanceIncrease = 200;

                // Referral Reward: 50 Naira to the referrer
                if (user.referred_by) {
                    // Fetch referrer's current balance
                    const { data: referrer, error: refFetchErr } = await supabaseClient
                        .from('users')
                        .select('id, balance')
                        .eq('referral_code', user.referred_by)
                        .single();

                    if (referrer && !refFetchErr) {
                        // Update referrer balance
                        await supabaseClient
                            .from('users')
                            .update({ balance: (referrer.balance || 0) + 50 })
                            .eq('id', referrer.id);
                    }
                }
            }

            // 2. Update current user data
            const { error: updateErr } = await supabaseClient
                .from('users')
                .update({
                    total_ads_viewed: newTotalAds,
                    balance: (user.balance || 0) + balanceIncrease
                })
                .eq('id', userId);

            if (updateErr) {
                throw updateErr;
            }

            // 3. Display success message
            let msg = `Total ads viewed: ${newTotalAds}`;
            if (balanceIncrease > 0) {
                msg += `. You just earned ₦${balanceIncrease}! 🎉`;
                rewardMessage.className = 'mb-4 text-gradient';
                rewardMessage.style.fontWeight = 'bold';
            }

            rewardMessage.innerText = msg;

        } catch (err) {
            console.error('Error recording view:', err);
            rewardMessage.innerText = 'Error recording view. Please try again.';
            rewardMessage.className = 'mb-4 error-text';
        }
    }

    // Next ad button logic
    document.getElementById('next-ad-btn').addEventListener('click', () => {
        // Reset state and run again
        timeLeft = 10;
        timerDisplay.innerText = timeLeft;
        progressFill.style.width = '0%';
        actionArea.classList.add('hidden');
        adFrame.style.opacity = '1';
        rewardMessage.innerText = '';
        rewardMessage.className = 'mb-4 text-secondary';

        // In a real scenario with Adsterra, we would refresh the iframe/ad unit here.
        // For mock:
        adFrame.innerHTML = `<div style="text-align: center; color: #888;">
            <h3>Sponsored Content (Reloaded)</h3>
            <p>MOCK ADSTERRA AD PLACEMENT ${Math.floor(Math.random() * 100)}</p>
            <p style="font-size: 0.8rem; margin-top: 1rem;">(In production, replace this block with the real Adsterra script snippet)</p>
        </div>`;

        startTimer();
    });

    // Listen for auth state changes
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
            window.location.href = '/';
        }
    });
});
