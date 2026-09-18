'use strict';
/* =========================================================
   exam.js — sisi siswa: daftar ujian, PIN sesi, runtime
   ujian, anti-curang, penilaian & pembahasan.
   ========================================================= */

let EXAM = null; // {h, j, order, opsiUrut, idx, deadline, tick, fsOk}

/* ================= SISWA: UJIAN SAYA ================= */
function renderSiswaUjian(v){
  const u = userAktif();
  const jam = new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const milik = DB.jadwal.filter(j=>j.kelas.includes(u.kelas));
  v.innerHTML = `
  <div class="page-head"><div><h1>Halo, ${esc(u.nama.split(' ')[0])} 👋</h1>
    <p>${jam} · Kelas ${esc(u.kelas||'—')} · ${esc(DB.settings.schoolName)}</p></div></div>
  ${milik.length?`<div class="examcards">${milik.map(j=>{
      const st=statusJadwal(j);
      const hs=DB.hasil.filter(h=>h.jadwalId===j.id&&h.userId===u.id);
      const bljr=hs.find(h=>h.status==='berlangsung');
      const selesai=hs.filter(h=>h.status!=='berlangsung');
      let aksi='', cls='';
      if(st.key==='aktif'){
        if(bljr) aksi=`<button class="btn pri sm" data-resume="${j.id}">${icon('play',14)} Lanjutkan Ujian</button>`;
        else if(!selesai.length) aksi=`<button class="btn pri sm" data-mulai="${j.id}">${icon('play',14)} Mulai Ujian</button>`;
        else aksi=`<span class="bdg g">${icon('check',12)} Sudah dikumpulkan</span>`;
      }else if(st.key==='depan'){ cls='locked'; aksi=`<span class="bdg b">${icon('clock',12)} Dibuka ${fmtTgl(j.mulai)}</span>`; }
      else if(st.key==='lalu'){ cls='locked'; aksi=`<span class="bdg s">Ditutup</span>`; }
      else { cls='locked'; aksi=`<span class="bdg s">Tidak tersedia</span>`; }
      const n = selesai.length? nilaiHasil(selesai[0]) : null;
      return `<div class="ecard ${cls}">
        <span class="emap">${icon('book',15)} ${esc(j.mapel)}</span>
        <h3>${esc(j.judul)}</h3>
        <div class="meta">
          <span>${icon('clock',13)} ${j.durasi} menit</span><span>${icon('file',13)} ${(j.soal||[]).length} soal</span>
          <span>${icon('pin',13)} butuh PIN</span><span>${icon('shield',13)} anti-curang ${DB.settings.anticheat&&j.aktif?'aktif':'off'} (maks ${j.maxWarn})</span>
        </div>
        <p class="small mut">${fmtTgl(j.mulai)} → ${fmtTgl(j.selesai)}</p>
        ${n?`<div class="row"><span class="bdg ${n.lulus?'g':'y'}">Nilai: <b>${n.nilaiAkhir}</b>${n.perluKoreksi?' (menunggu koreksi)':''}</span>${n.diskual?'<span class="bdg r">Diskualifikasi</span>':''}</div>`:''}
        <div class="row mt8">${aksi}${n&&j.tampilKunci?`<button class="btn sm ghost" data-review="${selesai[0].id}">${icon('eye',14)} Pembahasan</button>`:''}</div>
      </div>`;}).join('')}</div>`
    :`<div class="empty card">${icon('calendar',28)}<div>Belum ada ujian untuk kelasmu. Tunggu informasi dari gurumu ya!</div></div>`}`;
  $$('[data-mulai]',v).forEach(b=>b.onclick=()=>alurMulai(getJadwal(b.dataset.mulai),false));
  $$('[data-resume]',v).forEach(b=>b.onclick=async()=>{
    const u2=userAktif(), j=getJadwal(b.dataset.resume);
    const h=DB.hasil.find(x=>x.jadwalId===j.id&&x.userId===u2.id&&x.status==='berlangsung');
    if(h){ let fs=true; try{ await document.documentElement.requestFullscreen(); }catch{ fs=false; } startExam(j,h,fs); }
  });
  $$('[data-review]',v).forEach(b=>b.onclick=()=>reviewModal(getHasil(b.dataset.review)));
}
function reviewModal(h){
  const j=getJadwal(h.jadwalId), n=nilaiHasil(h);
  const body=(j.soal||[]).map((sid,i)=>{
    const s=getSoal(sid); if(!s) return '';
    const d=n.detail.find(x=>x.soalId===sid)||{};
    return `<div class="rev mb16">${soalHTML(s,i+1,{...d, kunci:kunciTeks(s)}, {review:true, tampilKunci:true, jawab:h.jawaban[s.id]})}
      ${s.tipe==='esai'&&h.esaiNilai[s.id]?`<div class="ans ok" style="margin-top:10px"><b>Catatan guru:</b> ${esc(h.esaiNilai[s.id].catatan||'—')} · skor ${h.esaiNilai[s.id].skor}/${s.bobot}</div>`:''}
    </div>`;
  }).join('');
  modal({title:'Pembahasan Jawaban', size:'lg', body, footer:[{label:'Tutup',cls:'pri'}]});
}

/* ================= SISWA: NILAI SAYA ================= */
function renderSiswaNilai(v){
  const u=userAktif();
  const rows=hasilSiswa(u.id).slice().sort((a,b)=>+toDate(b.submit||b.mulai)-+toDate(a.submit||a.mulai));
  v.innerHTML=`
  <div class="page-head"><div><h1>Nilai Saya</h1><p>Hasil ujianmu muncul otomatis setelah dikumpulkan (esai menunggu koreksi guru).</p></div></div>
  <div class="tblwrap"><table class="tbl">
    <thead><tr><th>Ujian</th><th>Mapel</th><th>Nilai</th><th>Status</th><th>Pelanggaran</th><th></th></tr></thead>
    <tbody>${rows.map(h=>{const j=getJadwal(h.jadwalId);const n=nilaiHasil(h);return `<tr>
      <td><b>${esc(j?j.judul:'—')}</b></td><td class="small">${esc(j?j.mapel:'')}</td>
      <td><b style="font-size:1.1rem">${h.status==='berlangsung'?'—':(n?n.nilaiAkhir:'—')}</b></td>
      <td>${h.status==='berlangsung'?'<span class="bdg b">Berlangsung</span>':h.status==='didiskualifikasi'?'<span class="bdg r">Diskualifikasi</span>':n&&n.perluKoreksi?'<span class="bdg y">Menunggu koreksi</span>':n&&n.lulus?'<span class="bdg g">Tuntas</span>':'<span class="bdg s">Belum tuntas</span>'}</td>
      <td class="small">${(h.pelanggaran||[]).length}×</td>
      <td class="right">${h.status!=='berlangsung'&&j&&j.tampilKunci?`<button class="btn xs ghost" data-rv="${h.id}">${icon('eye',13)} Pembahasan</button>`:''}</td>
    </tr>`;}).join('')||`<tr><td colspan="6"><div class="empty">Belum ada hasil ujian.</div></td></tr>`}</tbody></table></div>`;
  $$('[data-rv]',v).forEach(b=>b.onclick=()=>reviewModal(getHasil(b.dataset.rv)));
}

/* ================= ALUR MULAI + PIN ================= */
function alurMulai(j, force=false){
  const u=userAktif();
  if(!u) return;
  if(!j.aktif) return toast('Ujian ini tidak diaktifkan oleh sekolah','warn');
  if(statusJadwal(j).key!=='aktif') return toast('Ujian tidak sedang dibuka','warn');
  // PIN
  const mp=modal({
    title: icon('lock',18)+' Masukkan PIN Sesi', staticBack:true,
    body:`<p class="mb16">Ujian <b>${esc(j.judul)}</b> — ${esc(j.mapel)}, kelas ${esc(j.kelas.join(', '))}.<br><span class="mut small">PIN diberikan oleh gurumu agar tidak salah jadwal.</span></p>
      <input class="inp" id="pin-inp" maxlength="8" inputmode="numeric" placeholder="••••"
        style="text-align:center;font-size:1.6rem;letter-spacing:.5em;font-family:ui-monospace,monospace">
      <div id="pin-err"></div>`,
    footer:[{label:'Batal',cls:'ghost',onClick:()=>mp.close()},
            {label:'Lanjut',cls:'pri',onClick:cek}],
    onMount(el){ const i=$('#pin-inp',el); setTimeout(()=>i.focus(),80);
      i.onkeydown=e=>{if(e.key==='Enter')cek();}; }
  });
  function cek(){
    const m=mp; const inp=$('#pin-inp',m.el);
    if(inp.value.trim()===String(j.pin)){ m.close(); instruksi(j); }
    else { inp.value=''; $('.lg-card'); m.el.classList.add('shake'); setTimeout(()=>m.el.classList.remove('shake'),400);
      $('#pin-err',m.el).innerHTML=`<div class="note red mt8">${icon('flag',16)}<div>PIN salah. Periksa kembali PIN dari gurumu.</div></div>`; }
  }
}
function instruksi(j){
  const u=userAktif();
  const bljr=DB.hasil.find(h=>h.jadwalId===j.id&&h.userId===u.id&&h.status==='berlangsung');
  if(bljr) return startExam(j,bljr);
  const m=modal({
    title:'Petunjuk Ujian', staticBack:true,
    body:`<div class="kv mb16">
      <b>Ujian</b><span>${esc(j.judul)} (${esc(j.mapel)})</span>
      <b>Jumlah soal</b><span>${(j.soal||[]).length} soal campuran (PG, Benar–Salah, Menjodohkan, Esai)</span>
      <b>Waktu pengerjaan</b><span>${j.durasi} menit — berakhir otomatis</span>
      <b>Penutupan</b><span>sesa jendela: ${fmtTgl(j.selesai)}</span>
      </div>
      ${j.petunjuk?`<div class="note blue mb16">${icon('info',18)}<div>${nl2br(j.petunjuk)}</div></div>`:''}
      <div class="note red mb16">${icon('shield',18)}<div><b>Aturan anti-curang ${DB.settings.anticheat?'AKTIF':'nonaktif'}:</b>
      selama ujian kamu harus berada di <b>layar penuh</b>. Berpindah tab/jendela atau keluar layar penuh dihitung sebagai pelanggaran.
      Lebih dari <b>${j.maxWarn} pelanggaran</b> → <b>DISKUALIFIKASI otomatis</b> dan jawaban dikunci.</div></div>
      <p class="small mut">Saat tombol di bawah ditekan, browser akan meminta izin layar penuh (fullscreen) — pilih <b>Izinkan / Allow</b>.</p>`,
    footer:[{label:'Batal',cls:'ghost',onClick:()=>m.close()},
            {label:icon('play',15)+' Mulai Ujian',cls:'pri',onClick:async()=>{
              m.close();
              let fsOk=false;
              try{ await document.documentElement.requestFullscreen(); fsOk=true; }catch{}
              startExam(j,null,fsOk);
              if(!fsOk) toast('Layar penuh tidak diizinkan browser — peringatan tetap dihitung bila keluar tab','warn',5000);
            }}]
  });
}

/* ================= RUNTIME UJIAN ================= */
function startExam(j, hasilLama=null, fsOk=true){
  const u=userAktif();
  let h = hasilLama;
  if(!h){
    h={id:uid('h'), jadwalId:j.id, userId:u.id, mulai:isoNow(), submit:null,
       jawaban:{}, esaiNilai:{}, pelanggaran:[], status:'berlangsung'};
    DB.hasil.push(h); saveDB();
  }
  const startAt=+toDate(h.mulai), deadline=Math.min(startAt + j.durasi*60e3, +toDate(j.selesai));
  EXAM={ h, j, idx:0, fsAktif:fsOk!==false, opsiUrut:{},
    order: j.acakSoal? shuffle(j.soal) : [...(j.soal||[])],
    deadline, tick:null };
  // susunan opsi utk acakOpsi (stabil selama sesi)
  if(j.acakOpsi) for(const sid of j.soal){ const s=getSoal(sid); if(s&&s.tipe==='pg') EXAM.opsiUrut[sid]=shuffle(s.opsi.map((_,i)=>i)); }
  $('#shell').classList.add('hidden');
  document.body.classList.remove('boot');
  renderExamShell();
  pasangAntiCheat();
  clearInterval(EXAM.tick);
  EXAM.tick=setInterval(exTick,500);
  exTick();
}
function renderExamShell(){
  const {j,h}=EXAM;
  const el=$('#exam');
  el.classList.remove('hidden');
  el.innerHTML=`
  <div class="ex-top">
    <div class="ex-t"><b>${esc(j.judul)}</b><span>${esc(j.mapel)} · ${esc((getUser(h.userId)||{}).nama||'')}</span></div>
    <div class="timer" id="ex-timer">${icon('clock',18)}<span id="ex-ttime">--:--</span></div>
    <div class="viol" id="ex-viol">${icon('flag',14)}<span id="ex-vnum">${h.pelanggaran.length}</span>/${j.maxWarn}</div>
    <button class="btn sm ok" id="ex-submit">${icon('send',14)} Kumpulkan</button>
  </div>
  <div class="ex-body">
    <div class="ex-main" id="ex-main"></div>
    <aside class="ex-side">
      <div><h4 class="mb8">Navigasi soal</h4><div class="palette" id="ex-pal"></div></div>
      <div class="plegend">
        <span><i style="background:var(--ok);border-color:var(--ok)"></i>sudah dijawab</span>
        <span><i style="background:#fff"></i>belum dijawab</span>
        <span><i style="outline:2px solid var(--pri);outline-offset:-1px"></i>sedang dibuka</span>
      </div>
      <button class="btn block ghost" id="ex-collect2">${icon('send',15)} Kumpulkan Semua</button>
      <p class="small mut">Jangan tutup / refresh halaman — jawaban tersimpan otomatis dan dapat dilanjutkan.</p>
    </aside>
  </div>
  <div class="ex-foot" id="ex-foot"></div>`;
  $('#ex-submit',el).onclick=()=>tanyaKumpul();
  $('#ex-collect2',el).onclick=()=>tanyaKumpul();
  renderSoal();
}
function renderSoal(){
  const {j,h,order,idx}=EXAM;
  const sid=order[idx]; const s=getSoal(sid);
  const main=$('#ex-main');
  main.innerHTML = `<div class="row between mb8"><span class="mut small">Soal ${idx+1} dari ${order.length}</span>
      <div class="bar" style="flex:1;max-width:300px"><i style="width:${Math.round((idx+1)/order.length*100)}%"></i></div></div>`
      + soalHTML(s, idx+1, h.jawaban[s.id], {prefixId:'ex_', opsiUrut:EXAM.opsiUrut[sid]});
  // jawab
  const jawab=v=>{ h.jawaban[sid]=v; saveDBSoon(); renderPal(); };
  $$('[data-pg]',main).forEach(o=>o.onclick=()=>{jawab(+o.dataset.pg); const k=$('.opt.sel',main); $$('.opt',main).forEach(x=>x.classList.remove('sel')); o.classList.add('sel');});
  $$('[data-bs]',main).forEach(o=>o.onclick=()=>{jawab(o.dataset.bs); $$('.bsopt',main).forEach(x=>x.classList.remove('sel')); o.classList.add('sel');});
  $$('.mj-sel',main).forEach(se=>se.onchange=()=>{const m=h.jawaban[sid]||{}; m[+se.dataset.i]=se.value===''?null:+se.value; h.jawaban[sid]=m; saveDBSoon(); renderPal();});
  const ta=$('#esai-ex_'+sid,main)||$$('textarea',main)[0];
  if(ta){ const cnt=()=>{const c=$('#escount-ex_'+sid,main); if(c)c.textContent=ta.value.length+' / 4000 karakter';};
    ta.oninput=()=>{h.jawaban[sid]=ta.value; saveDBSoon(); cnt(); renderPal();}; cnt();
    ta.addEventListener('paste',e=>e.preventDefault()); ta.addEventListener('copy',e=>e.preventDefault()); ta.addEventListener('cut',e=>e.preventDefault()); }
  renderNav(); renderPal();
}
function renderNav(){
  const f=$('#ex-foot'), n=EXAM.order.length;
  f.innerHTML=`<button class="btn ghost" id="ex-prev" ${EXAM.idx===0?'disabled':''}>${icon('chevL',15)} Sebelumnya</button>
    <button class="btn ghost" id="ex-next" ${EXAM.idx>=n-1?'disabled':''}>Berikutnya ${icon('chevR',15)}</button>
    <span class="grow"></span><span class="pcount" id="ex-pcount"></span>
    <button class="btn pri" id="ex-kumpul">${icon('send',15)} Kumpulkan Ujian</button>`;
  $('#ex-prev',f).onclick=()=>{EXAM.idx--;renderSoal();};
  $('#ex-next',f).onclick=()=>{EXAM.idx++;renderSoal();};
  $('#ex-kumpul',f).onclick=()=>tanyaKumpul();
  hitungTerisi();
}
function jawabTerisi(s,h){ const v=h.jawaban[s.id];
  if(v==null||v==='')return false;
  if(s.tipe==='mj') return Object.values(v).some(x=>x!=null&&x!=='');
  if(s.tipe==='esai') return String(v).trim()!=='';
  return true; }
function renderPal(){
  const {h,order,idx}=EXAM;
  const pal=$('#ex-pal'); if(!pal) return;
  pal.innerHTML=order.map((sid,i)=>{ const s=getSoal(sid);
    const done=s&&jawabTerisi(s,h);
    return `<button class="pb ${done?'done':''} ${i===idx?'cur':''}" data-go="${i}" title="Soal ${i+1}">${i+1}</button>`;}).join('');
  $$('[data-go]',pal).forEach(b=>b.onclick=()=>{EXAM.idx=+b.dataset.go;renderSoal();});
  hitungTerisi();
}
function hitungTerisi(){
  const {h,order,j}=EXAM;
  const ter=order.filter(sid=>{const s=getSoal(sid);return s&&jawabTerisi(s,h);}).length;
  const e=$('#ex-pcount'); if(e) e.innerHTML=`<b>${ter}</b>/${order.length} terisi`;
  const pc=$('#ex-pc'); if(pc)pc.textContent=ter+'/'+order.length;
}
function exTick(){
  if(!EXAM) return;
  const sisa=EXAM.deadline-Date.now();
  const t=$('#ex-ttime');
  if(t) t.textContent=fmtDur(sisa);
  const tm=$('#ex-timer');
  if(tm){ tm.classList.toggle('warn',sisa<=300e3&&sisa>60e3); tm.classList.toggle('danger',sisa<=60e3); }
  if(sisa<=0){ toast('Waktu habis — jawaban dikumpulkan otomatis','warn',5000); finishExam(false,true); }
}
let _saveT=null; function saveDBSoon(){ clearTimeout(_saveT); _saveT=setTimeout(saveDB,400); }

/* ---------- anti-curang ---------- */
function pasangAntiCheat(){
  const el=$('#exam');
  el.oncontextmenu=e=>{ if(EXAM){e.preventDefault(); toast('Menu klik-kanan dinonaktifkan saat ujian','warn',2000);} };
  window.addEventListener('blur', exBlur);
  document.addEventListener('visibilitychange', exVis);
  document.addEventListener('fullscreenchange', exFs);
  window.addEventListener('beforeunload', exBye);
}
function lepasAntiCheat(){
  window.removeEventListener('blur', exBlur);
  document.removeEventListener('visibilitychange', exVis);
  document.removeEventListener('fullscreenchange', exFs);
  window.removeEventListener('beforeunload', exBye);
  const el=$('#exam'); if(el) el.oncontextmenu=null;
}
let _lastCheat=0;
function langgar(type){
  if(!EXAM||!EXAM.h||EXAM.h.status!=='berlangsung') return;
  const j=EXAM.j;
  if(!DB.settings.anticheat) return;
  const now=Date.now(); if(now-_lastCheat<1200) return; _lastCheat=now; // hindari hitung ganda (blur+vis)
  EXAM.h.pelanggaran.push({t:isoNow(), type});
  saveDB();
  const total=EXAM.h.pelanggaran.length;
  const vn=$('#ex-vnum'); if(vn) vn.textContent=total;
  if(total>=j.maxWarn){
    toast(`Kamu melakukan ${total} pelanggaran. Ujian <b>DIDISKUALIFIKASI</b> otomatis!`,'cheat',9000);
    finishExam(true,false);
  }else{
    const vbar=ce('div','warnbanner',`⚠ PERINGATAN — ${type} terdeteksi (pelanggaran ${total} dari ${j.maxWarn}). Lanjutkan dan ujianmu akan didiskualifikasi otomatis!`);
    document.body.appendChild(vbar); setTimeout(()=>vbar.remove(),4200);
    toast(`${type}! Pelanggaran ${total}/${j.maxWarn}. Hati-hati — ${j.maxWarn-total} tersisa sebelum didiskualifikasi.`,'cheat',7000);
  }
}
function exVis(){ if(EXAM&&document.hidden) langgar('Berpindah tab / aplikasi lain'); }
function exBlur(){ if(EXAM&&!document.hidden) langgar('Jendela ujian tidak aktif'); }
function exFs(){ if(EXAM&&EXAM.fsAktif&&!document.fullscreenElement&&EXAM.h&&EXAM.h.status==='berlangsung') langgar('Keluar dari layar penuh'); }
function exBye(e){ if(EXAM&&EXAM.h&&EXAM.h.status==='berlangsung'){ e.preventDefault(); e.returnValue='Ujian sedang berlangsung!'; } }

/* ---------- kumpul ---------- */
function tanyaKumpul(){
  if(!EXAM) return;
  const {h,order,j}=EXAM;
  const blm=[];
  order.forEach((sid,i)=>{const s=getSoal(sid); if(s&&!jawabTerisi(s,h)) blm.push(i+1);});
  const m=modal({
    title:'Kumpulkan Ujian?', staticBack:true,
    body:`<div class="kv mb16"><b>Soal terjawab</b><span>${order.length-blm.length} dari ${order.length}</span>
      <b>Menit tersisa</b><span>${Math.max(0,Math.round((EXAM.deadline-Date.now())/6e4))}</span></div>
      ${blm.length?`<div class="note">${icon('info',18)}<div>Belum dijawab (nomor ${blm.join(', ')}).</div></div>`
                 :`<div class="note green">${icon('check',18)}<div>Semua soal sudah dijawab. Mantap!</div></div>`}`,
    footer:[{label:'Lanjut mengerjakan',cls:'ghost',onClick:()=>m.close()},
            {label:'Ya, kumpulkan',cls:'ok',icon:'send',onClick:()=>{m.close();finishExam(false,false);}}]
  });
}
function finishExam(diskual, waktuHabis){
  if(!EXAM) return;
  const {h,j}=EXAM;
  clearInterval(EXAM.tick);
  h.submit=isoNow();
  h.status = diskual?'didiskualifikasi':'selesai';
  saveDB();
  lepasAntiCheat();
  try{ if(document.fullscreenElement) document.exitFullscreen(); }catch{}
  renderResult(diskual, waktuHabis);
}
function renderResult(diskual, waktuHabis){
  const {h,j}=EXAM;
  const n=nilaiHasil(h);
  const adaEsai=(j.soal||[]).some(sid=>{const s=getSoal(sid);return s&&s.tipe==='esai';});
  const lulus=n.lulus;
  const review = j.tampilKunci ? (j.soal||[]).map((sid,i)=>{
    const s=getSoal(sid); if(!s) return '';
    const d=n.detail.find(x=>x.soalId===sid)||{};
    return soalHTML(s,i+1,{...d, kunci:kunciTeks(s)},{review:true,tampilKunci:true,jawab:h.jawaban[s.id]});
  }).join('') : '';
  $('#exam').innerHTML=`
  <div class="ex-top"><div class="ex-t"><b>${esc(j.judul)}</b><span>${esc(j.mapel)}</span></div></div>
  <div style="overflow:auto;flex:1">
    <div class="result-wrap">
      ${diskual?`<div class="note red" style="font-size:1rem">${icon('flag',22)}<div><b>UJIAN DIDISKUALIFIKASI.</b> Batas pelanggaran (${j.maxWarn}×) terlampaui${waktuHabis?' / waktu habis':''}.
        Jawabanmu terkunci dengan nilai 0. Silakan hubungi gurumu.${DB.settings.anticheat?'':''}</div></div>`:''}
      ${waktuHabis&&!diskual?`<div class="note">${icon('clock',18)}<div>Waktu habis — jawabanmu otomatis dikumpulkan.</div></div>`:''}
      <div class="card" style="text-align:center">
        <p class="mut small mb8">NILAI AKHIR</p>
        <div class="score-circle" style="--p:${diskual?0:n.persen}%"><b style="color:${diskual?'var(--bad)':lulus?'var(--ok)':'var(--warn)'}">${diskual?0:n.persen}</b><span>/ 100</span></div>
        <p class="mt8">${diskual?`<span class="bdg r">Didiskualifikasi</span>`
          :n.perluKoreksi?`<span class="bdg y">${icon('clock',12)} Menunggu koreksi esai guru</span> — nilai otomatis <b>${n.persen}</b> akan diperbarui</span>`
          :lulus?`<span class="bdg g">${icon('check',12)} Tuntas (≥ KKM ${j.kkm})</span>`
          :`<span class="bdg y">Belum tuntas (KKM ${j.kkm})</span>`}</p>
        <p class="small mut mt8">Skor mentah ${n.total} / ${n.maks}${adaEsai?` · ada soal esai (${n.perluKoreksi?'menunggu':'sudah'} penilaian guru)`:''}</p>
        <div class="row mt16" style="justify-content:center">
          <button class="btn pri" id="rs-home">${icon('home',15)} Kembali ke Beranda</button>
        </div>
      </div>
      ${review?`<h2 style="font-size:1.05rem" class="mt16">Pembahasan</h2><div class="list">${review}</div>`:
        `<div class="note blue">${icon('info',18)}<div>Guru tidak menampilkan pembahasan untuk ujian ini.</div></div>`}
      <div style="height:40px"></div>
    </div>
  </div>`;
  $('#rs-home').onclick=()=>{ EXAM=null; closeAllModals(); $('#exam').classList.add('hidden'); $('#exam').innerHTML=''; masukAplikasi(); };
}
