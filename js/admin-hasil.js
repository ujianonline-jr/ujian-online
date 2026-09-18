'use strict';
/* =========================================================
   admin-hasil.js — Hasil & penilaian (koreksi esai, PDF,
   rekap), Manajemen Pengguna, dan Pengaturan aplikasi.
   ========================================================= */

let hasilPilih = null;

/* ================= HASIL & PENILAIAN ================= */
function renderHasil(v){
  const jadwalList = DB.jadwal.slice().sort((a,b)=>+toDate(b.mulai)-+toDate(a.mulai));
  if(!jadwalList.length){ v.innerHTML=`<div class="empty">${icon('award',30)}<div>Belum ada ujian.</div></div>`; return; }
  if(!hasilPilih || !getJadwal(hasilPilih)) hasilPilih=jadwalList[0].id;
  v.innerHTML = `
  <div class="page-head">
    <div><h1>Hasil &amp; Penilaian</h1><p>Koreksi esai, nilai tambahan, rekap kelas, serta unduh jawaban siswa dalam format PDF (cetak → simpan sebagai PDF).</p></div>
    <div class="row">
      <select class="inp" id="h-jadwal" style="width:320px">${jadwalList.map(j=>`<option value="${j.id}" ${j.id===hasilPilih?'selected':''}>${esc(j.judul)} — ${esc(j.mapel)}</option>`).join('')}</select>
      <button class="btn ghost" id="h-cetak">${icon('printer')} Cetak Rekap (PDF)</button>
      <button class="btn ghost" id="h-csv">${icon('download')} CSV</button>
    </div>
  </div>
  <div id="h-body"></div>`;
  $('#h-jadwal',v).onchange=e=>{hasilPilih=e.target.value;draw();};
  $('#h-cetak',v).onclick=()=>cetakRekap(hasilPilih);
  $('#h-csv',v).onclick=()=>unduhCSV(hasilPilih);
  function draw(){
    const j=getJadwal(hasilPilih);
    const rows = DB.hasil.filter(h=>h.jadwalId===j.id).map(h=>({h, u:getUser(h.userId)||{nama:'(dihapus)',kelas:'—'}, n:nilaiHasil(h)}));
    const selesai = rows.filter(r=>r.h.status!=='berlangsung');
    const nilaiArr = selesai.filter(r=>r.n&&!r.n.perluKoreksi).map(r=>r.n.nilaiAkhir);
    const rata = nilaiArr.length? r1(nilaiArr.reduce((a,b)=>a+b,0)/nilaiArr.length):0;
    const lulus = selesai.filter(r=>r.n&&r.n.lulus).length;
    const kor = selesai.filter(r=>r.n&&r.n.perluKoreksi).length;
    const dis = selesai.filter(r=>r.h.status==='didiskualifikasi').length;
    $('#h-body',v).innerHTML = `
    <div class="grid stats mb16">
      ${[['Rata-rata',rata,'award','tint-b'],['Tuntas KKM '+ (j.kkm||75),lulus,'check','tint-g'],['Perlu koreksi esai',kor,'file','tint-y'],['Didiskualifikasi',dis,'flag','tint-r'],['Peserta masuk',rows.length,'users','tint-v']]
        .map(([l,n,ic,t])=>`<div class="stat"><div class="si ${t}">${icon(ic,20)}</div><div><b>${n}</b><span>${l}</span></div></div>`).join('')}
    </div>
    <div class="tblwrap"><table class="tbl">
      <thead><tr><th>Siswa</th><th>Nilai</th><th>Status</th><th>Durasi</th><th>Pelanggaran</th><th>Dikumpulkan</th><th class="right">Aksi</th></tr></thead>
      <tbody>${rows.map(({h,u,n})=>{
        const badge = h.status==='berlangsung' ? `<span class="bdg b">Sedang mengerjakan</span>`
          : h.status==='didiskualifikasi' ? `<span class="bdg r">DISKUALIFIKASI</span>`
          : n&&n.perluKoreksi ? `<span class="bdg y">Menunggu koreksi</span>`
          : n&&n.lulus ? `<span class="bdg g">Tuntas</span>` : `<span class="bdg s">Belum tuntas</span>`;
        const nv = h.status==='berlangsung' ? '—' : (n? `<b style="font-size:1.06rem">${n.nilaiAkhir}</b><span class="mut small">/${n.diskual?0:100}</span>` : '—');
        const dv = h.mulai&&h.submit? Math.round((+toDate(h.submit)-+toDate(h.mulai))/6e4)+' mnt': '—';
        const vl = (h.pelanggaran||[]).length;
        return `<tr>
          <td><div class="row" style="gap:9px"><div class="avsm">${esc(initials(u.nama))}</div><div><b>${esc(u.nama)}</b><div class="mut small">${esc(u.kelas||'')}</div></div></div></td>
          <td>${nv}</td><td>${badge}</td><td class="small">${dv}</td>
          <td>${vl?`<span class="bdg r">${vl}×</span>`:'<span class="mut">0</span>'}</td>
          <td class="small">${h.submit?fmtTgl(h.submit):'—'}</td>
          <td class="acts">
            ${h.status!=='berlangsung'&&n&&n.perluKoreksi?`<button class="btn xs pri" data-kor="${h.id}">${icon('pencil',13)} Koreksi</button>`:''}
            <button class="btn xs ghost" data-detail="${h.id}" title="Detail jawaban">${icon('eye',13)}</button>
            <button class="btn xs ghost" data-pdf="${h.id}" title="Unduh PDF">${icon('printer',13)}</button>
            <button class="btn xs ghost" data-hapus="${h.id}" title="Hapus hasil">${icon('trash',13)}</button>
          </td></tr>`;}).join('') || `<tr><td colspan="7"><div class="empty">Belum ada peserta pada ujian ini.</div></td></tr>`}
      </tbody></table></div>`;
    $$('[data-kor]',v).forEach(b=>b.onclick=()=>openKoreksi(b.dataset.kor, draw));
    $$('[data-detail]',v).forEach(b=>b.onclick=()=>detailModal(b.dataset.detail));
    $$('[data-pdf]',v).forEach(b=>b.onclick=()=>cetakHasil(b.dataset.pdf));
    $$('[data-hapus]',v).forEach(b=>b.onclick=async()=>{
      if(await confirmBox('Hapus hasil ujian peserta ini? Siswa dapat mengerjakan ulang.',{danger:true,ok:'Hapus'})){
        markDeleted('hasil',b.dataset.hapus); DB.hasil=DB.hasil.filter(h=>h.id!==b.dataset.hapus); saveDB(); draw(); toast('Hasil dihapus','success');
      }});
  }
  draw();
}

function ringkasJawaban(s, ans){
  if(ans==null||ans==='') return '';
  if(s.tipe==='pg'){ const i=+ans; return `${opsiLabel(i)}. ${s.opsi[i]??''}`; }
  if(s.tipe==='bs') return ans;
  if(s.tipe==='mj'){
    const ps=s.pasangan||[];
    return ps.map((p,i)=>`${i+1}. ${p.kiri} → ${ans[i]!=null&&ans[i]!==''?(ps[ans[i]]?ps[ans[i]].kanan:'—'):'—'}`).join('  ·  ');
  }
  return String(ans);
}
function kunciTeks(s){
  if(s.tipe==='pg') return `${opsiLabel(s.kunci)}. ${s.opsi[s.kunci]??''}`;
  if(s.tipe==='bs') return s.kunci;
  if(s.tipe==='esai') return s.kunciEsai||'—';
  return (s.pasangan||[]).map((p,i)=>`${i+1}. ${p.kiri} → ${p.kanan}`).join('  ·  ');
}
function detailHTML(h){
  const j=getJadwal(h.jadwalId), u=getUser(h.userId)||{nama:'—',kelas:''}, n=nilaiHasil(h);
  const rows=(j.soal||[]).map((sid,i)=>{
    const s=getSoal(sid); if(!s) return '';
    const d=n.detail.find(x=>x.soalId===sid)||{};
    const en = s.tipe==='esai'? (h.esaiNilai[s.id]&&h.esaiNilai[s.id].catatan?`<div class="small mut">Catatan guru: ${esc(h.esaiNilai[s.id].catatan)}</div>`:'') : '';
    return `<tr><td>${i+1}</td><td><span class="bdg ${s.tipe==='pg'?'b':s.tipe==='bs'?'v':s.tipe==='mj'?'y':'g'}">${TIPE_LABEL[s.tipe]}</span></td>
      <td class="qj">${esc(s.teks)}${s.gambar?' 🖼':''}</td>
      <td class="qj">${esc(ringkasJawaban(s, h.jawaban[s.id]))||'<i>tidak dijawab</i>'}</td>
      <td class="qj"><i>${esc(kunciTeks(s))}</i></td>
      <td align="center"><b>${d.skor??0}</b>/${d.maks??s.bobot}${en}</td></tr>`;
  }).join('');
  const pl=(h.pelanggaran||[]).map(p=>`${p.type} (${fmtTgl(p.t)})`).join(' · ')||'—';
  return {u,j,n,h,rows,pl};
}
function detailModal(hid){
  const {u,j,n,h,rows,pl}=detailHTML(getHasil(hid));
  modal({title:`Jawaban — ${esc(u.nama)}`, size:'lg',
    body:`<div class="kv mb16"><b>Ujian</b><span>${esc(j.judul)} (${esc(j.mapel)})</span>
      <b>Nilai</b><span><b style="font-size:1.2rem">${n.nilaiAkhir}</b>${n.diskual?' · <span class="bdg r">Didiskualifikasi</span>':''}${n.perluKoreksi?' · <span class="bdg y">perlu koreksi</span>':''}</span>
      <b>Pelanggaran</b><span class="small">${esc(pl)}</span></div>
      <div class="tblwrap"><table class="tbl" style="min-width:0">
      <thead><tr><th>#</th><th>Tipe</th><th>Pertanyaan</th><th>Jawaban siswa</th><th>Kunci</th><th>Skor</th></tr></thead>
      <tbody>${rows}</tbody></table></div>`,
    footer:[{label:'Tutup',cls:'ghost'},{label:'Unduh PDF',cls:'pri',icon:'printer',onClick:()=>cetakHasil(hid)}]});
}

/* ---------- koreksi esai ---------- */
function openKoreksi(hid, after){
  const h=getHasil(hid); const j=getJadwal(h.jadwalId); const u=getUser(h.userId)||{nama:'—'};
  const esaiIds=(j.soal||[]).filter(sid=>{const s=getSoal(sid);return s&&s.tipe==='esai';});
  const m=modal({
    title:`Koreksi Esai — ${esc(u.nama)}`, size:'lg',
    body: esaiIds.map((sid,i)=>{
      const s=getSoal(sid);
      const cur=h.esaiNilai[sid]||{skor:'', catatan:''};
      const ans=esc(h.jawaban[sid]||'');
      return `<div class="korek-item"><div class="q">${i+1}. ${nl2br(s.teks)}</div>
      <div class="jwb">${ans||'<i class="mut">peserta tidak menulis jawaban</i>'}</div>
      ${s.kunciEsai?`<div class="small mut mb8">🔑 Pedoman: <b>${esc(s.kunciEsai)}</b></div>`:''}
      <div class="row">
        <label class="lab" style="margin:0;width:150px"><span>Skor (maks ${s.bobot})</span><input class="inp k-skor" data-id="${sid}" type="number" min="0" max="${s.bobot}" step="0.5" value="${cur.skor}"></label>
        <label class="lab grow" style="margin:0"><span>Catatan (opsional)</span><input class="inp k-cat" data-id="${sid}" value="${esc(cur.catatan||'')}" placeholder="umpan balik untuk siswa"></label>
        <button class="btn sm ghost mt8" data-ai="${sid}">${icon('check',14)} Isi dari kata kunci</button>
      </div></div>`;
    }).join('') || '<div class="empty">Tidak ada soal esai pada ujian ini.</div>',
    footer:[{label:'Batal',cls:'ghost',onClick:()=>m.close()},
      {label:'Simpan Nilai',cls:'pri',icon:'check',onClick:()=>simpan()}],
    onMount(el){
      $$('[data-ai]',el).forEach(b=>b.onclick=()=>{
        const s=getSoal(b.dataset.ai), ans=String(h.jawaban[s.id]||'').toLowerCase();
        const kws=(s.kunciEsai||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
        if(!kws.length) return toast('Soal ini belum punya kata kunci di bank soal','warn');
        const hit=kws.filter(k=>ans.includes(k)).length;
        const skor=r1(s.bobot*hit/kws.length);
        const inp=$(`.k-skor[data-id="${s.id}"]`,el); inp.value=skor;
        toast(`${hit}/${kws.length} kata kunci ditemukan → skor ${skor}`, 'info');
      });
    }
  });
  function simpan(){
    const map={};
    $$('.k-skor',m.el).forEach(inp=>{
      const v=inp.value===''?null:num(inp.value);
      const cat=$(`.k-cat[data-id="${inp.dataset.id}"]`,m.el).value.trim();
      if(v!=null) map[inp.dataset.id]={skor:Math.max(0,v), catatan:cat};
      else if(cat) map[inp.dataset.id]={skor:0, catatan:cat};
    });
    h.esaiNilai={...(h.esaiNilai||{}),...map};
    saveDB(); m.close(); after&&after(); toast('Nilai esai tersimpan','success');
  }
}

/* ---------- cetak / PDF ---------- */
function kopHTML(){
  const s=DB.settings;
  return `<div class="kop"><img src="${esc(s.logo)}"><div><h2>${esc(s.appTitle)}</h2><p>${esc(s.schoolName)}</p></div></div>`;
}
function cetak(html){
  const pa=$('#print-area'); pa.innerHTML=html;
  const before=()=>{pa.innerHTML='';};
  window.addEventListener('afterprint',before,{once:true});
  setTimeout(()=>{ try{ window.print(); }catch{ toast('Jendela cetak tidak tersedia di sini — gunakan menu browser ▸ Cetak (Ctrl+P)','warn',5000);} },80);
}
function cetakHasil(hid){
  const {u,j,n,h,rows,pl}=detailHTML(getHasil(hid));
  cetak(`${kopHTML()}
    <h3>Hasil &amp; Lembar Jawaban Ujian</h3>
    <table><tr><th>Nama / NIS</th><td>${esc(u.nama)}${u.nis?' · '+esc(u.nis):''}</td><th>Kelas</th><td>${esc(u.kelas||'—')}</td></tr>
    <tr><th>Ujian</th><td>${esc(j.judul)}</td><th>Mapel</th><td>${esc(j.mapel)}</td></tr>
    <tr><th>Waktu</th><td>${fmtTgl(h.mulai)} → ${h.submit?fmtTgl(h.submit):'—'}</td><th>Pelanggaran</th><td>${esc(pl)} ${h.status==='didiskualifikasi'?' · DIDISKUALIFIKASI':''}</td></tr></table>
    <h3>Jawaban Peserta</h3>
    <table><thead><tr><th>#</th><th>Tipe</th><th>Pertanyaan</th><th>Jawaban</th><th>Kunci</th><th>Skor</th></tr></thead><tbody>${rows}</tbody></table>
    <table><tr><th>Total skor</th><td>${n.total} / ${n.maks}</td><th>Nilai akhir</th><td class="bigv">${n.nilaiAkhir}</td><th>KKM ${j.kkm||75}</th><td>${n.diskual?'DIDISKUALIFIKASI':(n.lulus?'TUNTAS':'BELUM TUNTAS')}</td></tr></table>
    <p class="small">Dicetak otomatis oleh sistem ujian · ${fmtTgl(isoNow())}</p>
    <div class="ttd">Mengetahui, Guru Pengawas<br><br><br><b>(______________________)</b><br>NIP. </div>`);
}
function cetakRekap(jid){
  const j=getJadwal(jid);
  const rows=DB.hasil.filter(h=>h.jadwalId===jid&&h.status!=='berlangsung')
    .map(h=>{const u=getUser(h.userId)||{nama:'—',kelas:'—'};const n=nilaiHasil(h);return {u,n,h};})
    .sort((a,b)=>(b.n?b.n.nilaiAkhir:0)-(a.n?a.n.nilaiAkhir:0));
  cetak(`${kopHTML()}<h3>Rekap Nilai — ${esc(j.judul)} (${esc(j.mapel)})</h3>
    <p class="small">Kelas: ${esc(j.kelas.join(', '))} · Jendela: ${fmtTgl(j.mulai)} s/d ${fmtTgl(j.selesai)} · KKM ${j.kkm||75}</p>
    <table><thead><tr><th>No</th><th>Nama</th><th>Kelas</th><th>Nilai</th><th>Status</th><th>Pelanggaran</th></tr></thead>
    <tbody>${rows.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.u.nama)}</td><td>${esc(r.u.kelas||'')}</td>
      <td><b>${r.n?r.n.nilaiAkhir:'—'}</b></td><td>${r.n?(r.h.status==='didiskualifikasi'?'Diskualifikasi':(r.n.perluKoreksi?'Menunggu koreksi':(r.n.lulus?'Tuntas':'Belum tuntas'))):'—'}</td>
      <td>${(r.h.pelanggaran||[]).length}</td></tr>`).join('')}</tbody></table>
    <p class="small">Dicetak otomatis · ${fmtTgl(isoNow())}</p>
    <div class="ttd">Kepala Sekolah,<br><br><br><b>(______________________)</b></div>`);
}
function unduhCSV(jid){
  const j=getJadwal(jid);
  const baris=[['No','Nama','Kelas','Nilai','Status','Pelanggaran','Dikumpulkan']];
  DB.hasil.filter(h=>h.jadwalId===jid).forEach((h,i)=>{
    const u=getUser(h.userId)||{nama:'—',kelas:''}, n=nilaiHasil(h);
    baris.push([i+1,u.nama,u.kelas||'',n?n.nilaiAkhir:'',h.status,(h.pelanggaran||[]).length,h.submit?fmtTgl(h.submit):'']);
  });
  const csv='\ufeff'+baris.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  downloadText('rekap-'+(j.judul||'').replace(/\W+/g,'-').toLowerCase()+'.csv', csv,'text/csv');
}

/* ================= PENGGUNA ================= */
let userTab='siswa';
function renderPengguna(v){
  v.innerHTML=`
  <div class="page-head">
    <div><h1>Pengguna</h1><p>Akun administrator, guru, dan siswa. Siswa login memakai username + password dan PIN sesi saat ujian.</p></div>
    <div class="row">
      <button class="btn ghost" id="u-bulk">${icon('upload')} Tambah massal siswa</button>
      <button class="btn pri" id="u-add">${icon('plus')} Tambah Pengguna</button>
    </div>
  </div>
  <div class="seg" style="max-width:380px;margin-bottom:16px" id="u-tabs">
    <button class="${userTab==='siswa'?'on':''}" data-t="siswa">Siswa (${DB.users.filter(u=>u.role==='siswa').length})</button>
    <button class="${userTab!=='siswa'?'on':''}" data-t="guru">Guru &amp; Admin (${DB.users.filter(u=>u.role!=='siswa').length})</button>
  </div>
  <div id="u-body"></div>`;
  const draw=()=>{
    const arr=DB.users.filter(u=>userTab==='siswa'?u.role==='siswa':u.role!=='siswa');
    $('#u-body',v).innerHTML=`<div class="tblwrap"><table class="tbl">
      <thead><tr><th>Nama</th><th>Username</th><th>Role</th>${userTab==='siswa'?'<th>Kelas</th><th>Riwayat ujian</th>':''}<th class="right">Aksi</th></tr></thead>
      <tbody>${arr.map(u=>`<tr>
        <td><div class="row" style="gap:9px"><div class="avsm">${esc(initials(u.nama))}</div><b>${esc(u.nama)}</b></div></td>
        <td><code>${esc(u.username)}</code></td>
        <td><span class="bdg ${u.role==='admin'?'r':u.role==='guru'?'b':'g'}">${u.role.toUpperCase()}</span></td>
        ${userTab==='siswa'?`<td>${esc(u.kelas||'—')}</td><td class="small mut">${hasilSiswa(u.id).length} riwayat</td>`:''}
        <td class="acts">
          <button class="btn xs ghost" data-edit="${u.id}">${icon('pencil',13)}</button>
          <button class="btn xs ghost" data-pass="${u.id}" title="Reset password">${icon('key',13)}</button>
          ${u.role!=='admin'?`<button class="btn xs ghost" data-del="${u.id}">${icon('trash',13)}</button>`:''}
        </td></tr>`).join('')||`<tr><td colspan="6"><div class="empty">Belum ada data.</div></td></tr>`}</tbody></table></div>`;
    $$('[data-edit]',v).forEach(b=>b.onclick=()=>openUserForm(getUser(b.dataset.edit),draw));
    $$('[data-del]',v).forEach(b=>b.onclick=async()=>{
      if(await confirmBox('Hapus pengguna ini beserta hasil ujiannya?',{danger:true,ok:'Hapus'})){
        markDeleted('users',b.dataset.del); DB.users=DB.users.filter(u=>u.id!==b.dataset.del); DB.hasil=DB.hasil.filter(h=>h.userId!==b.dataset.del);
        saveDB(); draw(); renderPengguna(v); toast('Pengguna dihapus','success');
      }});
    $$('[data-pass]',v).forEach(b=>b.onclick=async()=>{
      const p=await promptBox('Password baru',{value:'123456'}); if(p){getUser(b.dataset.pass).pass=p;saveDB();toast('Password direset','success');}
    });
  };
  $$('#u-tabs button',v).forEach(b=>b.onclick=()=>{userTab=b.dataset.t;renderPengguna(v);});
  $('#u-add',v).onclick=()=>openUserForm(null,draw);
  $('#u-bulk',v).onclick=()=>openBulk(draw);
  draw();
}
function openUserForm(u, after){
  const isNew=!u; u=u?JSON.parse(JSON.stringify(u)):{id:uid('u'),nama:'',username:'',pass:'123456',role:'siswa',kelas:DB.kelas[0]||''};
  const m=modal({
    title: isNew?'Tambah Pengguna':'Ubah Pengguna',
    body:`<div class="f2">
      <label class="lab"><span>Nama lengkap</span><input class="inp" id="u-nama" value="${esc(u.nama)}"></label>
      <label class="lab"><span>Role</span><select class="inp" id="u-role">${['siswa','guru','admin'].map(r=>`<option ${u.role===r?'selected':''}>${r}</option>`).join('')}</select></label>
      <label class="lab"><span>Username</span><input class="inp" id="u-user" value="${esc(u.username)}"></label>
      <label class="lab"><span>Password</span><input class="inp" id="u-pass" value="${esc(u.pass)}"></label>
      </div><div class="lab" id="u-kelas-wrap"><span>Kelas</span><div class="checks">
        ${DB.kelas.map(k=>`<label class="check ${u.kelas===k?'on':''}"><input type="radio" name="_kl" value="${esc(k)}" ${u.kelas===k?'checked':''}> ${esc(k)}</label>`).join('')}
        <button class="btn xs ghost" id="u-newkelas" type="button">${icon('plus',12)} Kelas</button></div></div>`,
    footer:[{label:'Batal',cls:'ghost',onClick:()=>m.close()},{label:'Simpan',cls:'pri',icon:'check',onClick:()=>simpan()}],
    onMount(el){
      const sync=()=>{$('#u-kelas-wrap',el).style.display=$('#u-role',el).value==='siswa'?'':'none';};
      $('#u-role',el).onchange=sync; sync();
      $$('.check',el).forEach(c=>c.querySelector('input').onchange=()=>{$$('.check',el).forEach(x=>x.classList.remove('on'));c.classList.add('on');});
      $('#u-newkelas',el).onclick=async()=>{const k=await promptBox('Nama kelas baru (cth: 9A)');if(k){DB.kelas.push(k);saveDB();openUserForm(u,after);m.close();}};
    }
  });
  function simpan(){
    const get=id=>$('#'+id,m.el).value.trim();
    const data={...u, nama:get('u-nama'), username:get('u-user').replace(/\s+/g,'').toLowerCase(), pass:$('#u-pass',m.el).value, role:get('u-role'),
      kelas:$('#u-kelas-wrap input:checked',m.el)?.value||''};
    if(!data.nama||!data.username) return toast('Nama dan username wajib diisi','warn');
    if(DB.users.some(x=>x.username===data.username&&x.id!==data.id)) return toast('Username sudah dipakai','warn');
    if(isNew) DB.users.push(data); else DB.users[DB.users.findIndex(x=>x.id===u.id)]=data;
    saveDB(); m.close(); after&&after(); toast('Pengguna disimpan','success');
  }
}
function openBulk(after){
  const contoh='saya7a;Andi Pratama;7A\nsari7a;Sari Dewi;7A';
  const m=modal({
    title:'Tambah Siswa Massal',
    body:`<div class="note blue mb16">${icon('info',18)}<div>Satu baris = satu siswa. Format: <code>username;nama kelas?→ tidak; kelas</code><br>
      contoh: <code>${esc(contoh)}</code><br>semua siswa dibuat dengan password awal <b>siswa123</b> (bisa direset per siswa).</div></div>
      <textarea class="inp" id="bu-t" rows="8" style="font-family:ui-monospace,monospace;font-size:.82rem" placeholder="${esc(contoh)}"></textarea>`,
    footer:[{label:'Batal',cls:'ghost',onClick:()=>m.close()},{label:'Tambah',cls:'pri',icon:'plus',onClick:()=>{
      const lines=$('#bu-t',m.el).value.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
      let ok=0,skip=[];
      lines.forEach(L=>{
        const [un,nm,kl]=L.split(/[;,\t]/).map(x=>(x||'').trim());
        if(!un||!nm){skip.push(L);return;}
        if(DB.users.some(u=>u.username===un)){skip.push(un+' (sudah ada)');return;}
        DB.users.push({id:uid('u'),nama:nm,username:un.replace(/\s+/g,'').toLowerCase(),pass:'siswa123',role:'siswa',kelas:kl||''}); ok++;
      });
      saveDB(); m.close(); after&&after(); renderPengguna($('#view'));
      toast(`${ok} siswa ditambahkan${skip.length?` · ${skip.length} dilewati`:''}`, ok?'success':'warn');
    }}]
  });
}

/* ================= PENGATURAN ================= */
function renderPengaturan(v){
  const s=DB.settings;
  v.innerHTML=`
  <div class="page-head"><div><h1>Pengaturan</h1><p>Ubah judul aplikasi, logo, latar halaman login — semuanya langsung diterapkan.</p></div></div>
  <div class="wrap">
    <div class="card" style="flex:2;min-width:320px">
      <h3 class="mb16" style="font-size:1rem">Tampilan</h3>
      <label class="lab"><span>Judul aplikasi</span><input class="inp" id="g-title" value="${esc(s.appTitle)}"></label>
      <label class="lab"><span>Nama sekolah / lembaga</span><input class="inp" id="g-school" value="${esc(s.schoolName)}"></label>
      <div class="lab"><span>Logo</span>
        <div class="droplogo" id="g-logo">${s.logo?`<img src="${esc(s.logo)}"><div class="small mt8">klik untuk ganti gambar</div>`:`<div>${icon('upload',22)}</div><div class="small mt8">klik / seret logo PNG-JPG ke sini</div>`}
        <input type="file" id="g-logo-file" accept="image/*" hidden></div>
        <button class="btn xs ghost mt8" id="g-logo-clear">Hapus logo kustom</button>
      </div>
      <div class="lab"><span>Latar halaman login</span>
        <div class="bgswatches mt8" id="g-bg">
          ${BG_PRESETS.map((p,i)=>`<div class="sw ${s.bg.type==='preset'&&s.bg.idx===i?'on':''}" style="background:${p}" data-i="${i}"></div>`).join('')}
        </div>
        <div class="row mt16">
          <label class="lab" style="margin:0;flex:1"><span>…atau warna polos</span><input class="inp" type="color" id="g-color" value="#0f172a"></label>
          <label class="lab grow"><span>…atau URL gambar latar</span><input class="inp" id="g-bgimg" placeholder="https://…/latar.jpg" value="${s.bg.type==='image'?esc(s.bg.value):''}"></label>
        </div>
      </div>
    </div>
    <div class="card" style="flex:2;min-width:320px">
      <h3 class="mb16" style="font-size:1rem">Default &amp; keamanan</h3>
      <div class="f2">
        <label class="lab"><span>Durasi default (menit)</span><input class="inp" type="number" id="g-dur" value="${s.durasiDefault}" min="5"></label>
        <label class="lab"><span>KKM default</span><input class="inp" type="number" id="g-kkm" value="${s.kkmDefault}" min="0" max="100"></label>
      </div>
      <div class="switchline"><div>Sistem anti-curang<small>deteksi pindah tab / keluar layar penuh / jendela tidak aktif → peringatan lalu diskualifikasi otomatis</small></div><div class="switch ${s.anticheat?'on':''}" id="g-ac"></div></div>
      <div class="mt16">
        <h3 style="font-size:1rem" class="mb8">Mata pelajaran</h3>
        <div class="checks" id="g-mapel">${DB.mapel.map((mp,i)=>`<span class="bdg s" style="font-size:.8rem;padding:6px 11px">${esc(mp)} <b data-rmmp="${i}" style="cursor:pointer;color:var(--bad)">×</b></span>`).join('')}
        <button class="btn xs ghost" id="g-addmp">${icon('plus',12)} tambah</button></div>
        <h3 style="font-size:1rem" class="mb8 mt16">Kelas</h3>
        <div class="checks" id="g-kelas">${DB.kelas.map((k,i)=>`<span class="bdg s" style="font-size:.8rem;padding:6px 11px">${esc(k)} <b data-rmkl="${i}" style="cursor:pointer;color:var(--bad)">×</b></span>`).join('')}
        <button class="btn xs ghost" id="g-addkl">${icon('plus',12)} tambah</button></div>
      </div>
    </div>
    <div class="card" style="flex:1.1;min-width:280px">
      <h3 style="font-size:1rem" class="mb8">Sinkronisasi Google Sheets</h3>
      <p class="small mut mb16">Simpan seluruh data (akun, bank soal, jadwal, hasil) ke backend <b>Google Apps Script + Spreadsheet</b>. Petunjuk pembuatan backend: lihat <code>apps-script/Code.gs</code> &amp; README.</p>
      <label class="lab"><span>URL Web App (…/exec)</span>
        <input class="inp" id="g-url" placeholder="https://script.google.com/macros/s/AKfycb…/exec" value="${esc(window.Remote?Remote.url:'')}"></label>
      <div class="row">
        <button class="btn sm pri" id="g-svon">${icon('check',14)} Simpan &amp; aktifkan</button>
        <button class="btn sm ghost" id="g-test">Tes koneksi</button>
        <button class="btn sm ghost" id="g-pull">${icon('download',14)} Tarik dari server</button>
        <button class="btn sm ghost" id="g-push">${icon('upload',14)} Unggah semua ke server</button>
        <button class="btn sm danger" id="g-off">Putuskan</button>
      </div>
      <div class="small mt8" id="g-sstat">Status: ${window.Remote&&Remote.on?(Remote._ok===false?'<span style=color:var(--bad)>● percobaan ulang berjalan — '+esc(Remote._lastErr)+'</span>':'<span style=color:var(--ok)>● aktif · rev '+(DB.rev||0)+'</span>'):'<span style=color:var(--mut)>● mode lokal (localStorage)</span>'}</div>
    </div>
  </div>
  <div class="row mt16"><button class="btn pri" id="g-save">${icon('check')} Simpan Pengaturan</button></div>
  <div class="dangerzone mt24">
    <b>Zona berbahaya</b><p class="small mut mb8">Cadangkan data sebelum melakukan perubahan besar. Cadangan berisi seluruh pengaturan, pengguna, soal, jadwal dan hasil.</p>
    <div class="row">
      <button class="btn sm ghost" id="g-exp">${icon('download',14)} Ekspor cadangan (JSON)</button>
      <button class="btn sm ghost" id="g-imp">${icon('upload',14)} Pulihkan dari cadangan</button>
      <button class="btn sm danger" id="g-reset">${icon('refresh',14)} Reset ke data demo</button>
      <input type="file" id="g-imp-f" accept="application/json" hidden>
    </div>
  </div>`;
  $$('.sw',v).forEach(sw=>sw.onclick=()=>{s.bg={type:'preset',idx:+sw.dataset.i,value:''};$$('.sw',v).forEach(x=>x.classList.remove('on'));sw.classList.add('on');applySettings();});
  $('#g-color',v).oninput=e=>{s.bg={type:'color',idx:-1,value:e.target.value};applySettings();};
  $('#g-bgimg',v).oninput=e=>{const u=e.target.value.trim(); if(u){s.bg={type:'image',idx:-1,value:u};applySettings();}};
  $('#g-ac',v).onclick=e=>e.currentTarget.classList.toggle('on');
  const logoFile=$('#g-logo-file',v);
  $('#g-logo',v).onclick=()=>logoFile.click();
  logoFile.onchange=()=>{const f=logoFile.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{s.logo=r.result;$('#g-logo',v).innerHTML=`<img src="${esc(r.result)}"><div class="small mt8">klik untuk ganti gambar</div>`;applySettings();};r.readAsDataURL(f);};
  $('#g-logo-clear',v).onclick=()=>{s.logo=DEFAULT_LOGO;applySettings();renderPengaturan(v);toast('Logo dikembalikan ke default','success');};
  $('#g-addmp',v).onclick=async()=>{const n=await promptBox('Nama mapel baru');if(n){DB.mapel.push(n);saveDB();renderPengaturan(v);}};
  $('#g-addkl',v).onclick=async()=>{const n=await promptBox('Nama kelas baru');if(n){DB.kelas.push(n);saveDB();renderPengaturan(v);}};
  $$('[data-rmmp]',v).forEach(b=>b.onclick=()=>{DB.mapel.splice(+b.dataset.rmmp,1);saveDB();renderPengaturan(v);});
  $$('[data-rmkl]',v).forEach(b=>b.onclick=()=>{DB.kelas.splice(+b.dataset.rmkl,1);saveDB();renderPengaturan(v);});
  $('#g-save',v).onclick=()=>{
    s.appTitle=$('#g-title',v).value.trim()||'Ujian Online';
    s.schoolName=$('#g-school',v).value.trim();
    s.durasiDefault=Math.max(5,num($('#g-dur',v).value,60));
    s.kkmDefault=Math.min(100,Math.max(0,num($('#g-kkm',v).value,75)));
    s.anticheat=$('#g-ac',v).classList.contains('on');
    saveDB(); applySettings(); toast('Pengaturan disimpan','success');
  };
  const setStat=t=>{const e=$('#g-sstat',v); if(e)e.innerHTML=t;};
  $('#g-svon',v).onclick=async()=>{
    const u=$('#g-url',v).value.trim();
    if(!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(u)&&!location.host.includes('127.0.0.1')) return toast('URL harus https://script.google.com/macros/s/…/exec','warn');
    Remote.url=u; Remote.stop(); Remote._ready=false; Remote._ok=null;
    setStat('Menghubungi backend…');
    try{ const r=await Remote._req('GET','?action=ping');
      if(!r||!r.ok) throw new Error('respons bukan JSON dari backend — cek hak akses deploy "Anyone"');
      await Remote.init();
      toast('Sinkronisasi diaktifkan ✔','success');
      setStat('<span style=color:var(--ok)>● aktif · rev '+(DB.rev||0)+'</span>');
      renderPengaturan(v);
    }catch(e){ setStat('<span style=color:var(--bad)>● '+esc(e.message)+'</span>'); toast('Koneksi gagal: '+e.message,'error'); }
  };
  $('#g-test',v).onclick=async()=>{
    setStat('Menguji…');
    try{ const r=await Remote._req('GET','?action=ping');
      setStat(r&&r.ok?`<span style=color:var(--ok)>● Backend hidup · server time ${esc(r.t)}</span>`:`Tidak valid: ${esc(JSON.stringify(r).slice(0,140))}`);
    }catch(e){ setStat(`<span style=color:var(--bad)>● ${esc(e.message)}</span>`); }
  };
  $('#g-pull',v).onclick=async()=>{ try{ await Remote.pullNow(); renderPengaturan(v); }catch(e){ toast('Tarik gagal: '+esc(e.message),'error'); } };
  $('#g-push',v).onclick=async()=>{
    if(await confirmBox('Seluruh data di server akan <b>digantikan</b> dengan data perangkat ini. Lanjutkan?',{danger:true,ok:'Unggah sekarang'}))
      { try{ await Remote.pushNow(); renderPengaturan(v); }catch(e){ toast('Unggah gagal: '+esc(e.message),'error'); } }
  };
  $('#g-off',v).onclick=async()=>{
    if(await confirmBox('Putuskan sinkronisasi? Data tetap tersimpan di server dan cache lokal.',{ok:'Putuskan'})){
      Remote.stop(); Remote.url=''; Remote._ready=false; Remote._ok=null;
      renderPengaturan(v); toast('Sinkronisasi dimatikan','success');
    }
  };
  $('#g-exp',v).onclick=()=>downloadText('cadangan-ujian-online.json', JSON.stringify(DB,null,2),'application/json');
  $('#g-imp',v).onclick=()=>$('#g-imp-f',v).click();
  $('#g-imp-f',v).onchange=e=>{
    const f=e.target.files[0]; if(!f) return;
    const r=new FileReader();
    r.onload=async()=>{
      try{ const d=JSON.parse(r.result);
        if(!d.jadwal||!d.users) throw 0;
        if(await confirmBox('Pulihkan cadangan? Data saat ini akan '+(window.Remote&&Remote.on?'<b>dan di server</b> ':'')+'digantikan.',{danger:true,ok:'Pulihkan'})){
          DB=d; saveDB(); applySettings();
          if(window.Remote&&Remote.on){ try{ await Remote.pushNow(); }catch(e){ toast('Cadangan dipulihkan lokal, tetapi server gagal: '+e.message,'warn'); } }
          go('pengaturan'); toast('Cadangan dipulihkan','success'); }
      }catch{ toast('Berkas cadangan tidak valid','error'); }
    };
    r.readAsText(f);
  };
  $('#g-reset',v).onclick=async()=>{
    if(await confirmBox('Reset seluruh data ke kondisi demo awal? Semua perubahan hilang.',{danger:true,ok:'Reset sekarang'})) resetDB();
  };
}
