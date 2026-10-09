(async function(){
  const status=document.getElementById('status');
  const buttons=[document.getElementById('loginBtn'),document.getElementById('loginBtn2')].filter(Boolean);
  try{Pi.init({version:'2.0',sandbox:false});}catch(e){console.error(e);}
  async function login(){
    status.textContent='Connecting to Pi…';
    try{
      const auth=await Pi.authenticate(['username'], onIncompletePaymentFound);
      const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accessToken:auth.accessToken})});
      const data=await r.json();
      if(!r.ok||!data.verified) throw new Error(data.error||'Pi authentication could not be verified.');
      status.textContent='Signed in as @'+(data.user.username||auth.user.username)+'.';
    }catch(e){status.textContent=e.message||'Sign-in failed.';console.error(e);}
  }
  function onIncompletePaymentFound(payment){console.log('Incomplete payment found:',payment);}
  buttons.forEach(b=>b.addEventListener('click',login));
})();
