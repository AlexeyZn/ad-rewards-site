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

    let timerInterval;
    let timerStarted = false;

    function initTimer() {
        if (!timerStarted) {
            timerStarted = true;
            timerDisplay.innerText = timeLeft;
            startTimer();
        }
    }

    // Wait for the ad to load before starting the timer
    adFrame.addEventListener('load', initTimer);

    // Fallback just in case the iframe ad is already loaded or taking too long
    setTimeout(initTimer, 3000);

    function startTimer() {
        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            timeLeft--;
            timerDisplay.innerText = Math.max(0, timeLeft);

            // Update progress bar (starts at 0%, goes to 100% over 10s)
            const pct = ((10 - timeLeft) / 10) * 100;
            progressFill.style.width = `${pct}%`;

            if (timeLeft <= 0) {
                clearInterval(timerInterval);
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

            // Reward 40 Naira per ad immediately
            balanceIncrease = 40;

            // Referral Reward: 50 Naira to the referrer, maybe checking if it's their first ad (we'll check if total_ads > 0 but we aren't keeping strict referral counts right now; keeping the logic simple: trigger reward for 1st ad for referrer to avoid double pay ideally, or keep the old % 5 logic just for referrals).
            // Let's reward referrer on the 1st ad watched.
            if (newTotalAds === 1 && user.referred_by) {
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
        // Reset state and wait for ad to load before starting timer
        timeLeft = 10;
        timerDisplay.innerText = '...';
        progressFill.style.width = '0%';
        actionArea.classList.add('hidden');
        adFrame.style.opacity = '1';
        rewardMessage.innerText = '';
        rewardMessage.className = 'mb-4 text-secondary';

        timerStarted = false;

        const adIframe = document.getElementById('ad-frame');
        if (adIframe) {
            adIframe.src = '/ad-unit.html?t=' + new Date().getTime(); // cache bust to force reload
        }

        // Timeout fallback for next ad
        setTimeout(initTimer, 3000);
    });

    // Listen for auth state changes
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
            window.location.href = '/';
        }
    });
});
