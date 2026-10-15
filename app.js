(function () {
  const status = document.getElementById('status');
  const buttons = [
    document.getElementById('loginBtn'),
    document.getElementById('loginBtn2')
  ].filter(Boolean);

  const CLIENT_ID = 'qzQ2R9iI56R6R_dj_0C4urjdlqIX2E07_LKlQyIutbA';
  // Must match the redirect URI registered in the Pi Developer Portal.
  const REDIRECT_URI = 'https://markethub-pi-login.vercel.app/';

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

  async function handleOAuthReturn() {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get('access_token');
    const returnedState = params.get('state');
    const error = params.get('error');

    if (!token && !error) return false;

    const expectedState = sessionStorage.getItem('pi_oauth_state');
    sessionStorage.removeItem('pi_oauth_state');
    history.replaceState(null, '', window.location.pathname + window.location.search);

    if (!expectedState || returnedState !== expectedState) {
      show('Sign-in could not be verified (state mismatch). Please try again.');
      return true;
    }
    if (error) {
      show('Pi sign-in was not completed: ' + error + '. Please try again.');
      return true;
    }

    try {
      show('Verifying your Pi account…');
      await verifyAccessToken(token);
    } catch (err) {
      show(err.message || 'Pi sign-in verification failed.');
      console.error(err);
    }
    return true;
  }

  async function start() {
    if (await handleOAuthReturn()) return;

    function login() {
      try {
        const state = Array.from(window.crypto.getRandomValues(new Uint8Array(24)))
          .map(value => value.toString(16).padStart(2, '0')).join('');
        sessionStorage.setItem('pi_oauth_state', state);

        const authorizeUrl = new URL('https://accounts.pinet.com/oauth/authorize');
        authorizeUrl.searchParams.set('response_type', 'token');
        authorizeUrl.searchParams.set('client_id', CLIENT_ID);
        authorizeUrl.searchParams.set('redirect_uri', REDIRECT_URI);
        authorizeUrl.searchParams.set('scope', 'username');
        authorizeUrl.searchParams.set('state', state);

        show('Redirecting to Pi sign-in…');
        window.location.assign(authorizeUrl.toString());
      } catch (err) {
        show(err.message || 'Could not start Pi sign-in.');
        console.error(err);
      }
    }

    buttons.forEach(button => button.addEventListener('click', login));
    show('Pi sign-in is ready. Tap Sign in with Pi.');
  }

  start().catch(error => {
    show(error.message || 'Could not connect to Pi sign-in.');
    console.error(error);
  });
})();
