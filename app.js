(function () {
  const status = document.getElementById('status');
  const buttons = [document.getElementById('loginBtn'), document.getElementById('loginBtn2')].filter(Boolean);
  const CLIENT_ID = 'qzQ2R9iI56R6R_dj_0C4urjdlqIX2E07_LKlQyIutbA';
  // Keep this URI aligned with the Pi Developer Portal configuration.
  const REDIRECT_URI = 'https://markethub-updated-1.vercel.app/';

  function show(message) { if (status) status.textContent = message; }

  async function verifyAccessToken(accessToken) {
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.verified) throw new Error(data.error || 'Pi sign-in could not be verified.');
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
    if (error) { show('Pi sign-in was not completed: ' + error + '. Please try again.'); return true; }
    try { show('Verifying your Pi account…'); await verifyAccessToken(token); }
    catch (err) { show(err.message || 'Pi sign-in verification failed.'); console.error(err); }
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
      } catch (err) { show(err.message || 'Could not start Pi sign-in.'); console.error(err); }
    }
    buttons.forEach(button => button.addEventListener('click', login));
    show('Pi sign-in is ready. Tap Sign in with Pi.');
  }
  start().catch(error => { show(error.message || 'Could not connect to Pi sign-in.'); console.error(error); });

  const products = [
    {name:'Dangote Cement',category:'Cement',price: '₦8,500',unit:'per 50kg bag',seller:'Sample seller · Lagos',kind:'cement',tag:'Popular'},
    {name:'50kg Cement (bulk order)',category:'Cement',price:'Request quote',unit:'bulk quantities',seller:'Sample seller · Oyo',kind:'cement',tag:'Bulk'},
    {name:'Concrete Blocks',category:'Blocks & Bricks',price:'₦650',unit:'per 6-inch block',seller:'Sample seller · Ogun',kind:'blocks',tag:''},
    {name:'High-yield Iron Rods',category:'Iron Rods',price:'Request quote',unit:'multiple sizes',seller:'Sample seller · Abuja',kind:'rods',tag:'Site essential'},
    {name:'Sharp Sand',category:'Sand & Granite',price:'Request quote',unit:'per tipper load',seller:'Sample seller · Rivers',kind:'sand',tag:''},
    {name:'Stone-coated Roofing Sheets',category:'Roofing',price:'Request quote',unit:'per bundle / project',seller:'Sample seller · Anambra',kind:'roof',tag:''},
    {name:'PVC Plumbing Pipes',category:'Plumbing',price:'Request quote',unit:'sizes vary',seller:'Sample seller · Enugu',kind:'pipes',tag:''},
    {name:'Interior Emulsion Paint',category:'Paint & Finishing',price:'Request quote',unit:'per bucket',seller:'Sample seller · Kaduna',kind:'paint',tag:''},
    {name:'Residential Plot of Land',category:'Land',price:'Request quote',unit:'price per plot · verify documents',seller:'Sample listing · Lagos',kind:'land',tag:'Property'},
    {name:'2-Bedroom Apartment',category:'Apartment',price:'Request quote',unit:'for sale or rent/lease · details to confirm',seller:'Sample listing · Abuja',kind:'property',tag:'Property'},
    {name:'Shop / Commercial Space',category:'Shop / Commercial Space',price:'Request quote',unit:'for sale or rent/lease · details to confirm',seller:'Sample listing · Oyo',kind:'property',tag:'Commercial'}
  ];
  const grid = document.getElementById('productGrid');
  const search = document.getElementById('searchInput');
  const category = document.getElementById('categoryFilter');
  const empty = document.getElementById('emptyState');

  function productArt(kind) {
    const art = {
      cement:'<div class="art-cement"><span>BUILD<br>STRONG</span><b>CEMENT</b><small>50 kg</small></div>',
      blocks:'<div class="art-blocks"><i></i><i></i><i></i><i></i></div>',
      rods:'<div class="art-rods"><i></i><i></i><i></i><i></i><i></i></div>',
      sand:'<div class="art-sand"><i></i><i></i><i></i></div>',
      roof:'<div class="art-roof"><i></i><i></i><i></i><i></i></div>',
      pipes:'<div class="art-pipes"><i></i><i></i><i></i></div>',
      paint:'<div class="art-paint"><i></i><i></i><b>PAINT</b></div>',
      land:'<div class="art-property"><b>LAND</b><span>FOR SALE</span></div>',
      property:'<div class="art-property"><b>PROPERTY</b><span>SALE · RENT · LEASE</span></div>'
    };
    return art[kind] || '';
  }
  function renderProducts() {
    if (!grid) return;
    const q = (search ? search.value : '').trim().toLowerCase();
    const selected = category ? category.value : 'all';
    const shown = products.filter(p => (selected === 'all' || p.category === selected) &&
      (p.name + ' ' + p.category + ' ' + p.seller).toLowerCase().includes(q));
    grid.innerHTML = shown.map(p => `<article class="product-card"><div class="product-art art-${p.kind}">${productArt(p.kind)}${p.tag ? '<span class="product-tag">'+p.tag+'</span>' : ''}</div><div class="product-info"><span class="product-category">${p.category}</span><h3>${p.name}</h3><div class="product-price">${p.price}</div><p class="product-unit">${p.unit}</p><div class="product-seller">⌖ ${p.seller}</div><button class="enquire-btn" type="button" data-product="${p.name}">Enquire about product</button></div></article>`).join('');
    if (empty) empty.hidden = shown.length > 0;
  }
  if (search) search.addEventListener('input', renderProducts);
  if (category) category.addEventListener('change', renderProducts);
  if (grid) {
    grid.addEventListener('click', event => {
      const button = event.target.closest('[data-product]');
      if (!button) return;
      const name = button.getAttribute('data-product');
      alert('Enquiry flow for "' + name + '" is a preview only. Seller contact and order handling need a connected marketplace backend.');
    });
    renderProducts();
  }

  const sellerForm = document.getElementById('sellerForm');
  const sellerMessage = document.getElementById('sellerMessage');
  if (sellerForm) sellerForm.addEventListener('submit', event => {
    event.preventDefault();
    if (sellerMessage) sellerMessage.textContent = 'Thanks for your interest. This preview cannot submit registrations yet; a secure database and seller account system must be connected before real registration.';
  });
})();
