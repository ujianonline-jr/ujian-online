'use strict';
/* =========================================================
   main.js — bootstrap, login, routing
   ========================================================= */

const RUTES_GURU = [
  {id:'beranda',   label:'Beranda',        icon:'home'},
  {id:'jadwal',    label:'Jadwal Ujian',   icon:'calendar'},
  {id:'bank',      label:'Bank Soal',      icon:'db'},
  {id:'hasil',     label:'Hasil & Nilai',  icon:'award'},
  {id:'pengguna',  label:'Pengguna',       icon:'users'},
  {id:'pengaturan',label:'Pengaturan',     icon:'sliders'},
];
const RUTES_SISWA = [
  {id:'ujian', label:'Ujian Saya',  icon:'file'},
  {id:'nilai', label:'Nilai Saya',  icon:'award'},
];
let RUTE_AKTIF='beranda';

function bgCss(){
  const b=DB.settings.bg||{type:'preset',idx:0};
  if(b.type==='color') return b.value||'#0f172a';
  if(b.type==='image') return `url("${b.value}") center/cover no-repeat`;
  return BG_PRESETS[b.idx%BG_PRESETS.length];
}
function applySettings(){
  const s=DB.settings;
  document.title = s.appTitle || 'Ujian Online';
  $('#lg-title').textContent=s.appTitle; $('#lg-sub').textContent=s.schoolName;
  $('#lg-logo').src=s.logo; $('#sb-logo').src=s.logo;
  $('#sb-title').textContent=s.appTitle; $('#sb-sub').textContent=s.schoolName;
  $('#login').style.background = bgCss();
  $('#login').style.backgroundSize='cover'; $('#login').style.backgroundPosition='center';
}

function renderNav(){
  const u=userAktif();
  const rutes = u.role==='siswa' ? RUTES_SISWA : RUTES_GURU;
  $('#nav').innerHTML = `<div class="nav-sep">${u.role==='siswa'?'MENU SISWA':'MENU PENGELOLA'}</div>` +
    rutes.map(r=>`<button data-r="${r.id}" class="${RUTE_AKTIF===r.id?'on':''}">${icon(r.icon,18)}<span>${r.label}</span></button>`).join('') +
    `<div class="syncchip" id="sync-chip" style="${(window.Remote&&Remote.on)?'':'display:none'}"></div>`;
  $$('#nav button').forEach(b=>b.onclick=()=>{go(b.dataset.r);closeSidebar();});
  $('#who-name').textContent=u.nama;
  $('#who-role').textContent = u.role==='siswa' ? `Siswa · ${u.kelas}` : (u.role==='admin'?'Administrator':'Guru');
  $('#who-av').textContent = initials(u.nama);
  if(window.Remote&&Remote.on) Remote.chip();
}
function go(rute){
  RUTE_AKTIF=rute;
  const v=$('#view');
  renderNav();
  const u=userAktif();
  const isSiswa=u.role==='siswa';
  const map = isSiswa
    ? {ujian:renderSiswaUjian, nilai:renderSiswaNilai}
    : {beranda:renderBeranda, jadwal:renderJadwal, bank:renderBank, hasil:renderHasil, pengguna:renderPengguna, pengaturan:renderPengaturan};
  (map[rute]||map.beranda)(v);
  v.scrollTop=0; window.scrollTo({top:0});
}
function masukAplikasi(){
  const u=userAktif(); if(!u) return keluar();
  document.body.classList.remove('boot');
  $('#login').classList.add('hidden');
  $('#shell').classList.remove('hidden');
  RUTE_AKTIF = u.role==='siswa' ? 'ujian' : (RUTE_AKTIF||'beranda');
  go(RUTE_AKTIF);
  // link ?ujian=ID untuk siswa
  if(u.role==='siswa'){
    const qj=new URLSearchParams(location.search).get('ujian') || location.hash.replace('#','');
    if(qj){ const j=getJadwal(qj);
      if(j&&j.kelas.includes(u.kelas)&&statusJadwal(j).key==='aktif') setTimeout(()=>alurMulai(j),450);
    }
  }
}
function keluar(){
  sesiClear();
  location.href = location.pathname;
}
function closeSidebar(){ $('#sidebar').classList.remove('open'); $('#sb-overlay').classList.remove('on'); }

/* ---------- init ---------- */
document.addEventListener('DOMContentLoaded',()=>{
  loadDB(); applySettings();
  if(window.Remote) Remote.init();   // mode server (Google Sheets) bila diaktifkan
  $('#btn-logout').innerHTML=icon('logout',16);
  $('#btn-hamb').innerHTML=icon('menu',18);
  $('#btn-hamb').onclick=()=>{ $('#sidebar').classList.toggle('open'); $('#sb-overlay').classList.toggle('on', $('#sidebar').classList.contains('open')); };
  $('#sb-overlay').onclick=closeSidebar;
  $('#btn-logout').onclick=async()=>{
    if(EXAM&&EXAM.h&&EXAM.h.status==='berlangsung') return toast('Selesaikan ujianmu dulu!','warn');
    if(await confirmBox('Keluar dari akun?')) keluar();
  };
  // login
  let loginRole='guru';
  $$('#lg-tabs button').forEach(b=>b.onclick=()=>{
    loginRole=b.dataset.r; $$('#lg-tabs button').forEach(x=>x.classList.toggle('on',x===b));
  });
  $('#lg-form').onsubmit=e=>{
    e.preventDefault();
    const un=$('#lg-user').value.trim().toLowerCase(), pw=$('#lg-pass').value;
    const u=DB.users.find(x=>x.username===un&&x.pass===pw&& (loginRole==='siswa'? x.role==='siswa' : x.role!=='siswa'));
    if(!u){ $('.lg-card').classList.add('shake'); setTimeout(()=>$('.lg-card').classList.remove('shake'),400);
      return toast('Username / password salah, atau role tidak cocok','error'); }
    sesiSet(u); masukAplikasi();
    toast(`Selamat datang, ${esc(u.nama)}!`,'success',2200);
    $('#lg-pass').value='';
  };
  // sesi masih ada → langsung masuk
  if(sesiGet()) masukAplikasi();
});
