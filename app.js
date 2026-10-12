(async function () {
  const status = document.getElementById('status');
  const buttons = [
    document.getElementById('loginBtn'),
    document.getElementById('loginBtn2')
  ].filter(Boolean);

  function onIncompletePaymentFound(payment) {
    console.log('Incomplete payment found:', payment);
  }

  try {
    if (!window.Pi) {
      throw new Error('Pi SDK did not load. Please open MarketHub in Pi Browser.');
    }

    await window.Pi.init({
      version: '2.0',
      sandbox: false
    });

    async function login() {
      status.textContent = 'Connecting to Pi…';

      try {
        const auth = await window.Pi.authenticate(
          ['username'],
          onIncompletePaymentFound
        );

        const response = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken: auth.accessToken })
        });

        const data = await response.json();

        if (!response.ok || !data.verified) {
          throw new Error(
            data.error || 'Pi authentication could not be verified.'
          );
        }

        status.textContent =
          'Signed in as @' + (data.user.username || auth.user.username) + '.';
      } catch (error) {
        status.textContent = error.message || 'Sign-in failed.';
        console.error(error);
      }
    }

    buttons.forEach(button => {
      button.addEventListener('click', login);
    });

    status.textContent = 'Pi is ready. Tap Sign in with Pi.';
  } catch (error) {
    status.textContent = error.message || 'Could not connect to Pi.';
    console.error(error);
  }
})();
