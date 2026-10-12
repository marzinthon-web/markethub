(async function () {
  const status = document.getElementById('status');
  const buttons = [
    document.getElementById('loginBtn'),
    document.getElementById('loginBtn2')
  ].filter(Boolean);

  const CLIENT_ID = 'qzQ2R9iI56R6R_dj_0C4urjdlqIX2E07_LKlQyIutbA';
  const REDIRECT_URI = 'https://markethub-updated-1.vercel.app/';

  function show(message) {
    if (status) status.textContent = message;
  }

  async function verifyAccessToken(accessToken) {
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.verified) {
      throw new Error(data.error || 'Pi sign-in could not be verified.');
    }

    show('Signed in as @' + (data.user && data.user.username ? data.user.username : 'Pioneer') + '.');
  }

  // OAuth returns its result in the URL fragment, which is only readable in the browser.
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  const returnedToken = fragment.get('access_token');
  const returnedState = fragment.get('state');
  const returnedError = fragment.get('error');

  if (returnedToken || returnedError) {
    const expectedState = sessionStorage.getItem('pi_oauth_state');
    sessionStorage.removeItem('pi_oauth_state');
    history.replaceState(null, '', window.location.pathname + window.location.search);

    if (!expectedState || returnedState !== expectedState) {
      show('Sign-in could not be verified (state mismatch). Please try again.');
      return;
    }

    if (returnedError) {
      show('Pi sign-in was not completed: ' + returnedError + '. Please try again.');
      return;
    }

    try {
      show('Verifying your Pi account…');
      await verifyAccessToken(returnedToken);
    } catch (error) {
      show(error.message || 'Pi sign-in verification failed.');
      console.error(error);
    }
    return;
  }

  try {
    if (!window.Pi) {
      throw new Error('Pi SDK did not load. Please open MarketHub in Pi Browser.');
    }

    await window.Pi.init({ version: '2.0', sandbox: false });

    function login() {
      try {
        const state = window.crypto.randomUUID();
        sessionStorage.setItem('pi_oauth_state', state);
        show('Opening Pi sign-in…');

        window.Pi.signIn({
          clientId: CLIENT_ID,
          redirectUri: REDIRECT_URI,
          scopes: ['username'],
          state
        });
      } catch (error) {
        show(error.message || 'Could not start Pi sign-in.');
        console.error(error);
      }
    }

    buttons.forEach(button => button.addEventListener('click', login));
    show('Pi is ready. Tap Sign in with Pi.');
  } catch (error) {
    show(error.message || 'Could not connect to Pi.');
    console.error(error);
  }
})();
