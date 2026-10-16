// app.js minimal adjustments to ensure forms work with the simplified UI
const API_BASE = '/2GreenChat/api';

async function postJSON(path, body){
  const res = await fetch(`${API_BASE}${path}`,{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),credentials:'include'
  });
  if(!res.ok){const t=await res.text();throw new Error(t||'Request failed');}
  return res.json().catch(()=>({}));
}

function el(id){return document.getElementById(id)}
function show(id){el(id).classList.remove('hidden')}
function hide(id){el(id).classList.add('hidden')}

// Tab switching
document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const tab = btn.dataset.tab;
  ['tab-login','tab-register','tab-reset'].forEach(id=>el(id).classList.add('hidden'));
  el('tab-'+tab).classList.remove('hidden');
  el('auth-msg').textContent='';
}));

// Quick wiring
el('to-reset').addEventListener('click',()=>{
  document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
  document.querySelector('[data-tab="reset"]').classList.add('active');
  ['tab-login','tab-register','tab-reset'].forEach(id=>el(id).classList.add('hidden'));
  el('tab-reset').classList.remove('hidden');
});

// Login
el('login-form').addEventListener('submit', async (e)=>{
  e.preventDefault();
  el('auth-msg').textContent='';
  try{
    const username = el('login-username').value.trim();
    const password = el('login-password').value;
    await postJSON('/login',{username,password});
    // show main app - reload state from server
    location.reload();
  }catch(err){el('auth-msg').textContent=err.message}
});

// Register
el('register-form').addEventListener('submit', async (e)=>{
  e.preventDefault();el('auth-msg').textContent='';
  try{
    const email = el('register-email').value.trim();
    const username = el('register-username').value.trim();
    const password = el('register-password').value;
    if(!email.endsWith('@gmail.com')){el('auth-msg').textContent='Use a Gmail address ending with @gmail.com';return}
    await postJSON('/register',{email,username,password});
    el('auth-msg').textContent='Account created — please log in';
    // switch to login
    document.querySelector('[data-tab="login"]').click();
  }catch(err){el('auth-msg').textContent=err.message}
});

// Reset validate
el('reset-validate-form').addEventListener('submit', async (e)=>{
  e.preventDefault();el('auth-msg').textContent='';
  try{
    const username = el('reset-username').value.trim();
    const email = el('reset-email').value.trim();
    if(!email.endsWith('@gmail.com')){el('auth-msg').textContent='Gmail address required';return}
    await postJSON('/reset-validate',{username,email});
    // show set form
    hide('reset-validate-form'); show('reset-set-form');
    el('auth-msg').textContent='Verified — enter a new password';
  }catch(err){el('auth-msg').textContent=err.message}
});

// Reset set
el('reset-set-form').addEventListener('submit', async (e)=>{
  e.preventDefault();el('auth-msg').textContent='';
  try{
    const username = el('reset-username').value.trim();
    const email = el('reset-email').value.trim();
    const newPassword = el('reset-new-password').value;
    const confirm = el('reset-confirm-password').value;
    if(newPassword.length<8){el('auth-msg').textContent='Password must be 8+ chars';return}
    if(newPassword!==confirm){el('auth-msg').textContent='Passwords do not match';return}
    await postJSON('/reset-set',{username,email,newPassword});
    el('auth-msg').textContent='Password updated — please log in';
    // reset forms
    el('reset-validate-form').reset(); el('reset-set-form').reset();
    hide('reset-set-form'); show('reset-validate-form');
    document.querySelector('[data-tab="login"]').click();
  }catch(err){el('auth-msg').textContent=err.message}
});

el('reset-back').addEventListener('click',()=>{
  document.querySelector('[data-tab="login"]').click();
});

// Logout button on app shell
const logoutBtn = document.getElementById('logout-btn');
if(logoutBtn) logoutBtn.addEventListener('click', async ()=>{await postJSON('/logout',{}).catch(()=>{});location.reload()});

// On load: check /me to see if logged in and show app shell
(async function(){
  try{
    const res = await fetch('/2GreenChat/api/me',{credentials:'include'});
    if(res.ok){
      // show app UI
      document.getElementById('auth').classList.add('hidden');
      document.getElementById('app-shell').classList.remove('hidden');
      // minimal load of conversations/friends via full app.js earlier (not included here)
    }
  }catch(e){/* not logged in */}
})();
