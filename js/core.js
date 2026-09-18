'use strict';
/* =========================================================
   core.js — utilitas umum: ikon, toast, modal, tanggal,
   helper DOM, generator gambar Google Drive
   ========================================================= */

/* ---------- DOM shortcuts ---------- */
const $  = (s, el=document)=>el.querySelector(s);
const $$ = (s, el=document)=>Array.from(el.querySelectorAll(s));
const ce = (tag, cls, html)=>{ const e=document.createElement(tag); if(cls) e.className=cls; if(html!=null) e.innerHTML=html; return e; };

/* ---------- escape HTML ---------- */
function esc(s){ return String(s??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* ---------- id unik ---------- */
function uid(p='id'){ return p+'_'+Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4); }

/* ---------- tanggal & angka ---------- */
function isoNow(){ return new Date().toISOString(); }
function toDate(s){ return s ? new Date(s) : null; }
function fmtTgl(s){ const d=toDate(s); if(!d||isNaN(d)) return '—';
  return d.toLocaleString('id-ID',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}); }
function fmtJam(s){ const d=toDate(s); if(!d||isNaN(d)) return '—';
  return d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}); }
function localInput(d){ const p=n=>String(n).padStart(2,'0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; }
function fmtDur(ms){
  if(ms<0) ms=0;
  const s=Math.floor(ms/1000), h=Math.floor(s/3600), m=Math.floor(s%3600/60), d=s%60;
  const p=n=>String(n).padStart(2,'0');
  return h>0 ? `${p(h)}:${p(m)}:${p(d)}` : `${p(m)}:${p(d)}`;
}
function num(v, def=0){ const n=parseFloat(v); return isNaN(n)?def:n; }
function r1(v){ return Math.round(v*10)/10; }
function initials(nama){ return String(nama||'?').trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase(); }

/* ---------- ikon (stroke SVG, gaya feather) ---------- */
const ICONS = {
  home:'<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  calendar:'<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  db:'<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
  file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  users:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  sliders:'<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  plus:'<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  pencil:'<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash:'<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  copy:'<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  eye:'<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  link:'<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  play:'<polygon points="6 4 20 12 6 20 6 4"/>',
  flag:'<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>',
  clock:'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  image:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
  upload:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  printer:'<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  search:'<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  x:'<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  check:'<polyline points="20 6 9 17 4 12"/>',
  lock:'<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  award:'<circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>',
  grid:'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
  book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  pin:'<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  key:'<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>',
  send:'<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
  refresh:'<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  menu:'<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
  folder:'<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  info:'<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
  chevL:'<polyline points="15 18 9 12 15 6"/>',
  chevR:'<polyline points="9 18 15 12 9 6"/>',
};
function icon(name, size=20, stroke=2){
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]||''}</svg>`;
}

/* ---------- toast ---------- */
function toast(msg, type='info', ms=3400){
  const t = ce('div','toast '+(type==='success'?'ok':type));
  const ic = type==='error'?'flag':type==='warn'?'info':type==='success'?'check':type==='cheat'?'shield':'info';
  t.innerHTML = `${icon(ic,18)}<div>${msg}</div>`;
  $('#toast-root').appendChild(t);
  setTimeout(()=>{ t.classList.add('out'); setTimeout(()=>t.remove(),300); }, ms);
  return t;
}

/* ---------- modal (mendukung bertumpuk) ---------- */
function modal({title='—', body='', size='', footer=null, staticBack=false, onMount=null}){
  const back = ce('div','mback');
  const card = ce('div','mcard '+size);
  card.innerHTML = `
    <div class="mhead"><h3>${title}</h3><button class="icon-btn mclose" type="button" style="border:0">${icon('x',18)}</button></div>
    <div class="mbody">${body}</div>`;
  if(footer!==null){
    const f = ce('div','mfoot');
    (footer||[]).forEach((b,i)=>{
      const btn = ce('button','btn '+(b.cls||'ghost'), `${b.icon?icon(b.icon,16):''} ${b.label}`);
      btn.type='button';
      btn.onclick = ()=> b.onClick ? b.onClick(api, f.children[i]) : api.close();
      f.appendChild(btn);
    });
    card.appendChild(f);
  }
  back.appendChild(card);
  back.addEventListener('mousedown', e=>{ if(!staticBack && e.target===back) api.close(); });
  $('.mclose',card).onclick = ()=>api.close();
  $('#modal-root').appendChild(back);
  const api = {
    el: card,
    body: $('.mbody',card),
    close(){ back.remove(); },
    setBody(html){ $('.mbody',card).innerHTML=html; if(onMount) onMount(card, api); }
  };
  if(onMount) onMount(card, api);
  return api;
}
function closeAllModals(){ $('#modal-root').innerHTML=''; }
function confirmBox(msg, {title='Konfirmasi', ok='Ya, lanjutkan', danger=false}={}){
  return new Promise(res=>{
    const m = modal({
      title, size:'',
      body:`<div style="display:flex;gap:12px;align-items:flex-start">${icon(danger?'flag':'info',22)}<div>${msg}</div></div>`,
      footer:[
        {label:'Batal', cls:'ghost', onClick:()=>{m.close();res(false);}},
        {label:ok, cls:danger?'danger':'pri', onClick:()=>{m.close();res(true);}}
      ], staticBack:true
    });
  });
}
function promptBox(label, {value='', type='text', title='Masukkan'}={}){
  return new Promise(res=>{
    const m = modal({
      title,
      body:`<label class="lab"><span>${esc(label)}</span><input class="inp" id="_pv" type="${type}" value="${esc(value)}"></label>`,
      footer:[
        {label:'Batal', cls:'ghost', onClick:()=>{m.close();res(null);}},
        {label:'OK', cls:'pri', onClick:()=>{const v=$('#_pv',m.el).value; m.close(); res(v.trim());}}
      ], staticBack:true,
      onMount:(el,api)=>{ const i=$('#_pv',el); i.focus(); i.select();
        i.onkeydown=e=>{ if(e.key==='Enter'){ e.preventDefault(); const v=i.value; api.close(); res(v.trim()); } }; }
    });
  });
}

/* ---------- clipboard & unduh ---------- */
async function copyText(t){
  try{ await navigator.clipboard.writeText(t); toast('Disalin ke clipboard ✔','success',1800); }
  catch{ const ta=ce('textarea'); ta.value=t; document.body.appendChild(ta); ta.select();
    try{document.execCommand('copy'); toast('Disalin ✔','success',1500);}catch{ toast('Gagal menyalin','error'); } ta.remove(); }
}
function downloadFile(name, content, mime='text/plain;charset=utf-8'){
  const a=ce('a'); a.href=URL.createObjectURL(new Blob([content],{type:mime})); a.download=name;
  document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},400);
}
function downloadText(name, text, mime){ downloadFile(name, text, mime); toast('Berkas '+name+' diunduh','success'); }

/* ---------- util array ---------- */
function shuffle(arr){ const a=arr.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a; }
function pick(arr,n){ return shuffle(arr).slice(0,n); }
function groupBy(arr,f){ return arr.reduce((m,x)=>{const k=f(x);(m[k]=m[k]||[]).push(x);return m;},{}); }

/* =========================================================
   Generator link gambar Google Drive
   - tempel link folder  -> daftar semua gambar + link
   - ketik nama file     -> saring otomatis
   (memakai proxy CORS publik karena browser tidak bisa
   membaca halaman Drive lintas-domain secara langsung)
   ========================================================= */
const DRIVE_PROXIES = [
  u => 'https://api.allorigins.win/raw?url='+encodeURIComponent(u),
  u => 'https://corsproxy.io/?url='+encodeURIComponent(u),
  u => 'https://api.codetabs.com/v1/proxy?quest='+encodeURIComponent(u),
];
function driveFolderId(s){
  const m = String(s||'').match(/folders\/([a-zA-Z0-9_-]{10,})/) || String(s||'').match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  return m ? m[1] : (/^[a-zA-Z0-9_-]{25,}$/.test(String(s||'').trim()) ? String(s).trim() : null);
}
function driveThumb(id){ return 'https://drive.google.com/thumbnail?id='+id+'&sz=w400'; }
function driveLink(id){ return 'https://drive.google.com/uc?export=view&id='+id; }

async function fetchDriveFolder(folderUrlOrId){
  const fid = driveFolderId(folderUrlOrId);
  if(!fid) throw new Error('Link folder tidak dikenali. Contoh: https://drive.google.com/drive/folders/xxxxxxxx');
  const target = 'https://drive.google.com/embeddedfolderview?id='+fid+'#grid';
  let lastErr=null;
  for(const mk of DRIVE_PROXIES){
    try{
      const ctl = new AbortController(); const to=setTimeout(()=>ctl.abort(),14000);
      const r = await fetch(mk(target), {signal:ctl.signal}); clearTimeout(to);
      if(!r.ok) throw new Error('HTTP '+r.status);
      const html = await r.text();
      const doc = new DOMParser().parseFromString(html,'text/html');
      const out=[];
      doc.querySelectorAll('.flip-entry').forEach(en=>{
        const a=$('a[href*="/file/d/"]',en), t=$('.flip-entry-title',en);
        if(!a) return;
        const m=a.getAttribute('href').match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if(!m) return;
        const name=(t?t.textContent:'').trim()||'tanpa-judul';
        if(/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name)) out.push({id:m[1], name});
      });
      if(out.length) return {folderId:fid, items:out};
      throw new Error('Folder kosong / bukan gambar / tidak publik');
    }catch(e){ lastErr=e; }
  }
  throw new Error('Gagal memuat folder Drive: '+(lastErr&&lastErr.message||'jaringan diblokir')+'. Pastikan folder terbagikan "siapa saja yang memiliki link".');
}
