// Served to anyone without a valid session. Contains nothing sensitive.
export const loginPage = (error = '') => `<!DOCTYPE html>
<html lang="en-AU"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><meta name="theme-color" content="#47D7AC">
<title>Sign in - Balter Lab Handover</title>
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<style>
@font-face{font-family:'Lexend';src:url('/fonts/lexend-latin-wght-normal.woff2') format('woff2');font-weight:100 900;font-display:swap}
:root{--teal:#47D7AC;--orange:#FDAA63;--purple:#7566A0;--sky:#99D6EA;--gold:#FFD637;--line:#E7E5DE;--muted:#6B685D}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fff;color:#000;font-family:'Lexend','Segoe UI',system-ui,Arial,sans-serif;overflow:hidden}
.bubbles{position:fixed;inset:0;pointer-events:none;overflow:hidden}
.bubbles span{position:absolute;bottom:-40px;border-radius:50%;background:radial-gradient(circle at 30% 30%,rgba(255,255,255,.95),rgba(71,215,172,.12));border:1px solid rgba(71,215,172,.28);animation:rise linear infinite}
@keyframes rise{0%{transform:translateY(0);opacity:0}10%{opacity:.7}100%{transform:translateY(-115vh);opacity:0}}
@media (prefers-reduced-motion:reduce){.bubbles{display:none}}
.card{position:relative;z-index:1;width:min(400px,92vw);background:#fff;border:1px solid var(--line);border-radius:16px;box-shadow:0 1px 2px rgba(0,0,0,.04),0 12px 32px rgba(0,0,0,.08);overflow:hidden}
.strip{display:flex;height:5px}.strip i{flex:1}
.in{padding:30px 30px 28px;text-align:center}
.logo{width:64px;height:64px}
.kicker{margin:14px 0 0;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--purple);font-weight:600}
h1{margin:4px 0 6px;font-size:22px;font-weight:700;letter-spacing:-.01em}
p{margin:0 0 20px;color:var(--muted);font-size:13px}
input{width:100%;padding:13px 14px;border:1.5px solid var(--line);border-radius:10px;font:inherit;font-size:15px;text-align:center}
input:focus{outline:none;border-color:var(--teal);box-shadow:0 0 0 3px rgba(71,215,172,.25)}
button{margin-top:12px;width:100%;padding:13px;border:0;border-radius:10px;background:#000;color:#fff;font:inherit;font-weight:600;font-size:14px;cursor:pointer;transition:background .15s}
button:hover{background:var(--purple)}button:disabled{opacity:.6;cursor:wait}
.err{min-height:18px;margin:12px 0 0;color:#B4531A;font-size:12.5px;font-weight:500}
</style></head><body>
<div class="bubbles" id="b"></div>
<main class="card"><div class="strip"><i style="background:#47D7AC"></i><i style="background:#FDAA63"></i><i style="background:#7566A0"></i><i style="background:#99D6EA"></i></div>
<form class="in" id="f" autocomplete="off">
<img class="logo" src="/favicon.svg" alt="Balter Brewing">
<div class="kicker">Balter Brewing</div><h1>Daily Lab Handover</h1><p>Enter the team password to continue.</p>
<input type="password" id="pw" placeholder="Password" autocomplete="current-password" autofocus required>
<button id="go" type="submit">Sign in</button>
<div class="err" id="e" role="alert">${error}</div>
</form></main>
<script>
(function(){var b=document.getElementById('b'),h='';for(var i=0;i<16;i++){var s=8+Math.random()*26;h+='<span style="left:'+(Math.random()*100)+'%;width:'+s+'px;height:'+s+'px;animation-duration:'+(9+Math.random()*10)+'s;animation-delay:-'+(Math.random()*14)+'s"></span>'}b.innerHTML=h;
var f=document.getElementById('f'),e=document.getElementById('e'),go=document.getElementById('go');
f.addEventListener('submit',function(ev){ev.preventDefault();go.disabled=true;e.textContent='';
fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:document.getElementById('pw').value})})
.then(function(r){return r.json().catch(function(){return{}}).then(function(j){return[r,j]})})
.then(function(a){if(a[0].ok){location.reload()}else{e.textContent=a[1].error||'Something went wrong.';go.disabled=false;document.getElementById('pw').select()}})
.catch(function(){e.textContent='Network error - please try again.';go.disabled=false})})})();
</script></body></html>`;
