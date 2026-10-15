(function () {
  const status = document.getElementById('status');
  const buttons = [document.getElementById('loginBtn'), document.getElementById('loginBtn2')].filter(Boolean);

  function show(message) {
    if (status) status.textContent = message;
  }

  // Pi SDK must be initialized before calling Pi.authenticate().
  let piSdkReady = false;
  async function initializePiSdk() {
    if (!window.Pi) {
      show('Pi SDK is unavailable. Please open MarketHub in Pi Browser and try again.');
      return false;
    }
    try {
      await window.Pi.init({ version: '2.0' });
      piSdkReady = true;
      const existingToken = localStorage.getItem('pi_access_token');
      if (existingToken) {
        try {
          await verifyAccessToken(existingToken, false);
        } catch (error) {
          localStorage.removeItem('pi_access_token');
          show('Pi sign-in is ready. Tap Sign in with Pi.');
        }
      } else {
        show('Pi sign-in is ready. Tap Sign in with Pi.');
      }
      return true;
    } catch (error) {
      console.error('Pi SDK initialization failed:', error);
      show('Could not initialize Pi sign-in. Please reopen MarketHub in Pi Browser.');
      return false;
    }
  }

  async function verifyAccessToken(accessToken, persist = true) {
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.verified) {
      throw new Error(data.error || 'Pi sign-in could not be verified.');
    }
    if (persist) localStorage.setItem('pi_access_token', accessToken);
    show('Signed in as @' + (data.user && data.user.username ? data.user.username : 'Pioneer') + '.');
    return data.user;
  }

  async function login() {
    if (!piSdkReady) {
      const ready = await initializePiSdk();
      if (!ready) return;
    }
    buttons.forEach(button => { button.disabled = true; });
    show('Waiting for Pi sign-in approval…');
    try {
      const auth = await window.Pi.authenticate(['username'], function onIncompletePaymentFound(payment) {
        // MarketHub does not process Pi payments yet. Do not attempt to complete
        // an incomplete payment automatically; it must be reconciled server-side.
        console.warn('Pi SDK reported an incomplete payment:', payment && payment.identifier);
      });
      if (!auth || !auth.accessToken) {
        throw new Error('Pi did not return an access token. Please try again.');
      }
      await verifyAccessToken(auth.accessToken);
    } catch (error) {
      console.error('Pi SDK authentication failed:', error);
      show(error && error.message ? 'Pi sign-in failed: ' + error.message : 'Pi sign-in failed. Please try again in Pi Browser.');
    } finally {
      buttons.forEach(button => { button.disabled = false; });
    }
  }

  buttons.forEach(button => button.addEventListener('click', login));
  initializePiSdk().catch(error => {
    console.error(error);
    show('Could not initialize Pi sign-in. Please try again in Pi Browser.');
  });

  const products = [
    {name:'Dangote Cement',category:'Cement',price: 'Seller price pending', currency:'NGN',unit:'per 50kg bag',seller:'Sample seller · Lagos',kind:'cement',tag:'Popular'},
    {name:'50kg Cement (bulk order)',category:'Cement',price:'Seller price pending',currency:'NGN',unit:'bulk quantities',seller:'Sample seller · Oyo',kind:'cement',tag:'Bulk'},
    {name:'Concrete Blocks',category:'Blocks & Bricks',price:'Price set by seller in π',unit:'per 6-inch block',seller:'Sample seller · Ogun',kind:'blocks',tag:''},
    {name:'High-yield Iron Rods',category:'Iron Rods',price:'Contact seller for price',currency:'NGN',unit:'multiple sizes',seller:'Sample seller · Abuja',kind:'rods',tag:'Site essential'},
    {name:'Sharp Sand',category:'Sand & Granite',price:'Request quote',unit:'per tipper load',seller:'Sample seller · Rivers',kind:'sand',tag:''},
    {name:'Stone-coated Roofing Sheets',category:'Roofing',price:'Request quote',unit:'per bundle / project',seller:'Sample seller · Anambra',kind:'roof',tag:''},
    {name:'PVC Plumbing Pipes',category:'Plumbing',price:'Request quote',unit:'sizes vary',seller:'Sample seller · Enugu',kind:'pipes',tag:''},
    {name:'Interior Emulsion Paint',category:'Paint & Finishing',price:'Request quote',unit:'per bucket',seller:'Sample seller · Kaduna',kind:'paint',tag:''},
    {name:'Residential Plot of Land',category:'Land',price:'Request quote',unit:'price per plot · verify documents',seller:'Sample listing · Lagos',kind:'land',tag:'Property'},
    {name:'2-Bedroom Apartment',category:'Apartment',price:'Request quote',unit:'for sale or rent/lease · details to confirm',seller:'Sample listing · Abuja',kind:'property',tag:'Property'},
    {name:'Shop / Commercial Space',category:'Shop / Commercial Space',price:'Request quote',unit:'for sale or rent/lease · details to confirm',seller:'Sample listing · Oyo',kind:'property',tag:'Commercial'}
  ];
  let databaseProducts = [];
  async function loadDatabaseListings() {
    try {
      const response = await fetch('/api/listings');
      if (!response.ok) throw new Error('Could not load listings');
      const data = await response.json();
      databaseProducts = (Array.isArray(data.listings) ? data.listings : []).map(item => ({
        id: item.id,
        name: item.title,
        category: item.category || (item.listing_type === 'property' ? 'Property' : 'Building materials'),
        price: Number(item.price ?? item.price_ngn),
        currency: item.currency || 'NGN',
        unit: [item.quantity, item.unit].filter(Boolean).join(' · ') || item.transaction_type || '',
        seller: [item.city, item.state].filter(Boolean).join(', '),
        description: item.description || '',
        kind: item.listing_type === 'property' ? 'property' : 'cement',
        tag: 'Seller listing'
      }));
      renderProducts();
    } catch (error) {
      console.error('Could not load database listings:', error);
    }
  }
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
    const shown = databaseProducts.concat(products).filter(p => (selected === 'all' || p.category === selected) &&
      (p.name + ' ' + p.category + ' ' + p.seller).toLowerCase().includes(q));
    grid.innerHTML = shown.map(p => `<article class="product-card"><div class="product-art art-${p.kind}">${productArt(p.kind)}${p.tag ? '<span class="product-tag">'+p.tag+'</span>' : ''}</div><div class="product-info"><span class="product-category">${p.category}</span><h3>${p.name}</h3><div class="product-price">${typeof p.price === "number" ? ((p.currency === "PI" ? "π " : "₦") + p.price.toLocaleString(undefined, { maximumFractionDigits: 2 })) : p.price}</div><p class="product-unit">${p.unit}</p><div class="product-seller">⌖ ${p.seller}</div><button class="enquire-btn" type="button" data-product="${p.name}" ${p.id ? 'data-listing-id="'+p.id+'"' : ''}>Enquire about product</button></div></article>`).join('');
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
    loadDatabaseListings();
  }

  const sellerForm = document.getElementById('sellerForm');
  const sellerMessage = document.getElementById('sellerMessage');
  if (sellerForm) sellerForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (sellerMessage) sellerMessage.textContent = '';
    const accessToken = localStorage.getItem('pi_access_token');
    if (!accessToken) {
      if (sellerMessage) sellerMessage.textContent = 'Please sign in with Pi first, then submit your seller registration.';
      return;
    }
    const seller = Object.fromEntries(new FormData(sellerForm).entries());
    const submitButton = sellerForm.querySelector('button[type="submit"]');
    if (submitButton) { submitButton.disabled = true; submitButton.textContent = 'Saving registration…'; }
    try {
      const response = await fetch('/api/seller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, seller })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.saved) throw new Error(data.error || 'Registration could not be saved.');
      if (sellerMessage) sellerMessage.textContent = 'Registration saved successfully for Pi account @' + data.username + '.';
      sellerForm.reset();
    } catch (error) {
      if (sellerMessage) sellerMessage.textContent = error.message || 'Could not save registration. Please try again.';
    } finally {
      if (submitButton) { submitButton.disabled = false; submitButton.textContent = 'Submit seller registration'; }
    }
  });

  const listingForm = document.getElementById('listingForm');
  const listingMessage = document.getElementById('listingMessage');
  if (listingForm) listingForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (listingMessage) listingMessage.textContent = '';
    const accessToken = localStorage.getItem('pi_access_token');
    if (!accessToken) {
      if (listingMessage) listingMessage.textContent = 'Please sign in with Pi first.';
      return;
    }
    const formData = new FormData(listingForm);
    const listing = Object.fromEntries(formData.entries());
    listing.price = Number(listing.price);
    const button = listingForm.querySelector('button[type="submit"]');
    if (button) { button.disabled = true; button.textContent = 'Saving listing…'; }
    try {
      const response = await fetch('/api/listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, listing })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.saved) throw new Error(data.error || 'Could not save listing.');
      if (listingMessage) listingMessage.textContent = 'Listing saved. Currency: ' + (listing.currency === 'PI' ? 'Pi (π)' : 'NGN (₦)') + '. It is saved. Refresh the marketplace to check your published listing.';
      listingForm.reset();
    } catch (error) {
      if (listingMessage) listingMessage.textContent = error.message || 'Could not save listing. Please try again.';
    } finally {
      if (button) { button.disabled = false; button.textContent = 'Save listing'; }
    }
  });
})();
