'use strict';
/* =========================================================
   admin-jadwal.js — Beranda, Jadwal Ujian (CRUD + PIN +
   bank soal + impor) dan Generator Gambar Drive
   ========================================================= */

/* ================= BERANDA ================= */
function renderBeranda(v){
  const u = userAktif();
  const jam = new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const aktif = DB.jadwal.filter(j=>statusJadwal(j).key==='aktif');
  const berlangsung = DB.hasil.filter(h=>h.status==='berlangsung').length;
  const perluKoreksi = DB.hasil.filter(h=>{const n=nilaiHasil(h);return n&&n.perluKoreksi;}).length;
  const statistik = [
    ['Jadwal berlangsung', aktif.length, 'clock','tint-g'],
    ['Sedang dikerjakan', berlangsung, 'play','tint-y'],
    ['Total siswa', DB.users.filter(x=>x.role==='siswa').length, 'users','tint-b'],
    ['Soal di bank', DB.bankSoal.length, 'db','tint-v'],
    ['Menunggu koreksi esai', perluKoreksi, 'file','tint-r'],
  ];
  v.innerHTML = `
  <div class="hero">
    <div class="grow">
      <h2>Selamat datang, ${esc(u.nama.split(' ')[0])} 👋</h2>
      <p>${jam} · ${esc(DB.settings.schoolName)}. Kelola jadwal ujian, bank soal, PIN sesi, penilaian dan keamanan ujian dari satu tempat.</p>
    </div>
    <button class="btn" data-go="jadwal">${icon('plus')} Buat Jadwal Ujian</button>
  </div>
  <div class="grid stats mb16">
    ${statistik.map(([l,n,ic,t])=>`<div class="stat"><div class="si ${t}">${icon(ic,22)}</div><div><b>${n}</b><span>${l}</span></div></div>`).join('')}
  </div>
  <div class="wrap">
    <div class="card grow" style="min-width:320px;flex:2">
      <div class="row between mb8"><h3 style="font-size:1rem">Ujian sedang berlangsung</h3><a href="#" data-go="jadwal">kelola →</a></div>
      <div class="list">
        ${aktif.length?aktif.map(j=>{
          const selesai=pesertaSelesai(j.id), psg=DB.users.filter(s=>s.role==='siswa'&&j.kelas.includes(s.kelas)).length;
          const pct=psg?Math.round(selesai/psg*100):0;
          return `<div class="lrow">
            <div class="avsm" title="${esc(j.mapel)}">${icon('book',16)}</div>
            <div class="grow"><div class="lr-t">${esc(j.judul)}</div>
              <p>${esc(j.mapel)} · Kelas ${esc(j.kelas.join(', '))} · PIN <b class="pinchip">${esc(j.pin)}</b></p>
              <div class="bar mt8" style="max-width:260px"><i style="width:${pct}%"></i></div>
            </div>
            <div class="right"><b>${selesai}/${psg}</b><div class="mut small">peserta</div></div>
            <button class="btn sm ghost" data-hasil="${j.id}">Nilai</button>
          </div>`;}).join('')
        :`<div class="empty">${icon('calendar',26)}<div>Belum ada ujian yang sedang dibuka.</div></div>`}
      </div>
    </div>
    <div class="card" style="flex:1;min-width:280px">
      <h3 style="font-size:1rem" class="mb8">Langkah cepat</h3>
      <div class="list">
        ${[['bank','Siapkan bank soal (4 jenis: PG, Benar–Salah, Menjodohkan, Esai)'],
           ['jadwal','Buat jadwal + PIN sesi per mapel & kelas'],
           ['hasil','Koreksi esai & unduh PDF jawaban siswa'],
           ['pengaturan','Atur judul, logo & latar aplikasi']]
          .map(([r,t])=>`<button class="lrow" style="width:100%;text-align:left;font:inherit;cursor:pointer" data-go="${r}">
            <div class="avsm">${icon('check',15)}</div><div class="lr-t" style="font-size:.86rem">${t}</div></button>`).join('')}
      </div>
      <div class="note blue mt16">${icon('shield',18)}<div><b>Anti-curang aktif.</b> Siswa yang berpindah tab, membuka aplikasi lain, atau keluar dari layar penuh akan diperingati — melewati batas pelanggaran otomatis <b>didiskualifikasi</b>.</div></div>
    </div>
  </div>`;
  $$('[data-go]',v).forEach(b=>b.onclick=e=>{e.preventDefault();go(b.dataset.go);});
  $$('[data-hasil]',v).forEach(b=>b.onclick=()=>{hasilPilih=b.dataset.hasil;go('hasil');});
}

/* ================= JADWAL UJIAN ================= */
function renderJadwal(v){
  v.innerHTML = `
  <div class="page-head">
    <div><h1>Jadwal Ujian</h1><p>Buat jadwal per mapel &amp; kelas, tentukan waktu mulai/berakhir dan PIN sesi.</p></div>
    <button class="btn pri" id="btn-add">${icon('plus')} Tambah Jadwal</button>
  </div>
  <div class="tblwrap"><table class="tbl">
    <thead><tr><th>Ujian</th><th>Kelas</th><th>PIN</th><th>Jendela waktu</th><th>Durasi</th><th>Soal</th><th>Status</th><th>Peserta</th><th class="right">Aksi</th></tr></thead>
    <tbody>
    ${DB.jadwal.slice().sort((a,b)=>+toDate(b.mulai)-+toDate(a.mulai)).map(j=>{
      const st=statusJadwal(j), psg=DB.users.filter(s=>s.role==='siswa'&&j.kelas.includes(s.kelas)).length;
      return `<tr>
        <td><div class="row" style="gap:8px"><div><b>${esc(j.judul)}</b><div class="mut small">${esc(j.mapel)}</div></div></div></td>
        <td>${esc(j.kelas.join(', '))}</td>
        <td><span class="pinchip">${esc(j.pin)}</span></td>
        <td class="small">${fmtTgl(j.mulai)}<br><span class="mut">s/d ${fmtTgl(j.selesai)}</span></td>
        <td>${j.durasi} mnt</td>
        <td>${(j.soal||[]).length}</td>
        <td><span class="bdg ${st.cls}">${st.label}</span></td>
        <td>${pesertaSelesai(j.id)}/${psg}</td>
        <td class="acts">
          <button class="btn xs ghost" data-pratinjau="${j.id}" title="Pratinjau soal">${icon('eye',14)}</button>
          <button class="btn xs ghost" data-salin="${j.id}" title="Salin link ujian">${icon('link',14)}</button>
          <button class="btn xs ghost" data-nilai="${j.id}" title="Hasil & nilai">${icon('award',14)}</button>
          <button class="btn xs ghost" data-edit="${j.id}" title="Ubah">${icon('pencil',14)}</button>
          <button class="btn xs ghost" data-hapus="${j.id}" title="Hapus">${icon('trash',14)}</button>
        </td></tr>`;}).join('') || `<tr><td colspan="9"><div class="empty">Belum ada jadwal ujian.</div></td></tr>`}
    </tbody>
  </table></div>`;
  $('#btn-add',v).onclick=()=>openJadwalForm(null);
  $$('[data-edit]',v).forEach(b=>b.onclick=()=>openJadwalForm(getJadwal(b.dataset.edit)));
  $$('[data-hapus]',v).forEach(b=>b.onclick=async()=>{
    const j=getJadwal(b.dataset.hapus);
    if(await confirmBox(`Hapus jadwal <b>"${esc(j.judul)}"</b> beserta hasil ujian peserta?`,{danger:true,ok:'Hapus'})){
      markDeleted('jadwal',j.id); DB.jadwal=DB.jadwal.filter(x=>x.id!==j.id); DB.hasil.filter(h=>h.jadwalId===j.id).forEach(h=>markDeleted('hasil',h.id)); DB.hasil=DB.hasil.filter(h=>h.jadwalId!==j.id);
      saveDB(); renderJadwal(v); toast('Jadwal dihapus','success');
    }});
  $$('[data-salin]',v).forEach(b=>b.onclick=()=>{
    const url = location.href.split('#')[0].split('?')[0]+'?ujian='+b.dataset.salin;
    copyText(url); toast('Link ujian disalin — bagikan ke siswa','success');
  });
  $$('[data-nilai]',v).forEach(b=>b.onclick=()=>{hasilPilih=b.dataset.nilai;go('hasil');});
  $$('[data-pratinjau]',v).forEach(b=>b.onclick=()=>pratinjauSoal(getJadwal(b.dataset.pratinjau)));
}

function pratinjauSoal(j){
  const list=(j.soal||[]).map((sid,i)=>soalHTML(getSoal(sid), i+1, null, {review:true, tampilKunci:true, showLabel:true})).join('');
  modal({title:`Pratinjau — ${esc(j.judul)}`, size:'lg',
    body: list || '<div class="empty">Belum ada soal pada jadwal ini.</div>',
    footer:[{label:'Tutup',cls:'pri'}]});
}

/* ---------- form tambah/ubah jadwal ---------- */
function openJadwalForm(j){
  const isNew = !j;
  j = j ? JSON.parse(JSON.stringify(j)) : {
    id:uid('j'), judul:'', mapel:DB.mapel[0]||'', kelas:[], pin:String(Math.floor(1000+Math.random()*9000)),
    mulai:localInput(new Date(Date.now()+1*36e5)), selesai:localInput(new Date(Date.now()+2*36e5)),
    durasi:DB.settings.durasiDefault||60, aktif:true, acakSoal:false, acakOpsi:false,
    tampilKunci:false, maxWarn:3, kkm:DB.settings.kkmDefault||75, soal:[], petunjuk:''
  };
  let selected = new Set(j.soal||[]);
  const m = modal({
    title: isNew?'Tambah Jadwal Ujian':'Ubah Jadwal Ujian', size:'xl',
    body:`<div id="jf">
      <fieldset class="fs"><legend>Informasi</legend>
        <label class="lab"><span>Judul ujian</span><input class="inp" id="j-judul" value="${esc(j.judul)}" placeholder="cth: Penilaian Harian Bab 3"></label>
        <div class="f3">
          <label class="lab"><span>Mata pelajaran</span><select class="inp" id="j-mapel">${DB.mapel.map(mp=>`<option ${mp===j.mapel?'selected':''}>${esc(mp)}</option>`).join('')}</select></label>
          <label class="lab"><span>PIN sesi</span>
            <div class="row"><input class="inp" id="j-pin" value="${esc(j.pin)}" maxlength="8" style="font-family:ui-monospace,monospace;letter-spacing:.15em">
            <button class="btn sm ghost" id="j-genpin" type="button" title="Acak PIN">${icon('refresh',14)}</button></div></label>
          <label class="lab"><span>Durasi (menit)</span><input class="inp" type="number" id="j-durasi" value="${j.durasi}" min="5" max="600"></label>
        </div>
        <div class="lab"><span>Kelas peserta</span><div class="checks" id="j-kelas">
          ${DB.kelas.map(k=>`<label class="check ${j.kelas.includes(k)?'on':''}"><input type="checkbox" value="${esc(k)}" ${j.kelas.includes(k)?'checked':''}> ${esc(k)}</label>`).join('')}
        </div></div>
        <div class="f2">
          <label class="lab"><span>Waktu mulai</span><input class="inp" type="datetime-local" id="j-mulai" value="${esc(j.mulai)}"></label>
          <label class="lab"><span>Waktu berakhir</span><input class="inp" type="datetime-local" id="j-selesai" value="${esc(j.selesai)}"></label>
        </div>
        <div class="f3">
          <label class="lab"><span>KKM / target nilai</span><input class="inp" type="number" id="j-kkm" value="${j.kkm}" min="0" max="100"></label>
          <label class="lab"><span>Maks. pelanggaran sebelum diskualifikasi</span><input class="inp" type="number" id="j-maxwarn" value="${j.maxWarn}" min="1" max="10"></label>
          <div class="lab"><span>Status</span><div class="row"><div class="switch ${j.aktif?'on':''}" id="j-aktif"></div><span class="small mut">Ujian diaktifkan</span></div></div>
        </div>
        <label class="lab"><span>Petunjuk ujian (diperlihatkan ke siswa sebelum mengerjakan)</span><textarea class="inp" id="j-petunjuk" rows="2">${esc(j.petunjuk||'')}</textarea></label>
      </fieldset>
      <fieldset class="fs"><legend>Pengacakan &amp; keamanan</legend>
        <div class="f2">
          <div class="switchline"><div>Acak urutan soal<small>soal tampil berbeda untuk tiap siswa</small></div><div class="switch ${j.acakSoal?'on':''}" data-sw="acakSoal"></div></div>
          <div class="switchline"><div>Acak urutan opsi PG<small>hanya untuk pilihan ganda</small></div><div class="switch ${j.acakOpsi?'on':''}" data-sw="acakOpsi"></div></div>
        </div>
        <div class="switchline" style="border:0"><div>Tampilkan pembahasan &amp; kunci ke siswa<small>setelah ujian dikumpulkan</small></div><div class="switch ${j.tampilKunci?'on':''}" data-sw="tampilKunci"></div></div>
      </fieldset>
      <fieldset class="fs"><legend>Soal ujian <span id="j-count" style="color:var(--pri)">(${selected.size} dipilih)</span></legend>
        <div class="row mb8">
          <input class="inp grow" id="j-cari" placeholder="Cari soal di bank…">
          <button class="btn sm ghost" id="j-all" type="button">Pilih semua hasil</button>
          <button class="btn sm ghost" id="j-non" type="button">Bersihkan</button>
        </div>
        <div id="j-soallist" style="max-height:260px;overflow:auto;border:1px solid var(--line);border-radius:12px"></div>
      </fieldset>
    </div>`,
    footer:[
      {label:'Batal', cls:'ghost', onClick:()=>m.close()},
      {label: isNew?'Simpan Jadwal':'Perbarui Jadwal', cls:'pri', icon:'check', onClick:()=>simpanJadwal()}
    ],
    onMount(el, api){
      $$('#j-kelas .check input',el).forEach(cb=>cb.onchange=()=>cb.closest('.check').classList.toggle('on',cb.checked));
      $$('.switch',el).forEach(s=>s.onclick=()=>s.classList.toggle('on'));
      $('#j-genpin',el).onclick=()=>$('#j-pin',el).value=String(Math.floor(1000+Math.random()*9000));
      const list=(cari='')=>{
        const arr = DB.bankSoal.filter(s=>!cari || (s.teks+' '+s.mapel).toLowerCase().includes(cari.toLowerCase()));
        $('#j-soallist',el).innerHTML = arr.map(s=>`
          <label class="lrow" style="border-radius:0;border:0;border-bottom:1px solid var(--line);cursor:pointer">
            <input type="checkbox" class="jsoal" value="${s.id}" ${selected.has(s.id)?'checked':''} style="accent-color:var(--pri);width:17px">
            <span class="bdg ${s.tipe==='pg'?'b':s.tipe==='bs'?'v':s.tipe==='mj'?'y':'g'}">${TIPE_LABEL[s.tipe]}</span>
            <span class="grow small">${esc(s.teks)}</span><span class="mut small">${esc(s.mapel)} · ${s.bobot} p</span>
          </label>`).join('') || '<div class="empty small">Tidak ada soal. Tambahkan di menu Bank Soal.</div>';
        $$('.jsoal',el).forEach(cb=>cb.onchange=()=>{
          cb.checked?selected.add(cb.value):selected.delete(cb.value);
          $('#j-count',el).textContent=`(${selected.size} dipilih)`;
        });
      };
      list();
      $('#j-cari',el).oninput=e=>list(e.target.value.trim());
      $('#j-all',el).onclick=()=>{$$('.jsoal',el).forEach(cb=>{cb.checked=true;selected.add(cb.value);});$('#j-count',el).textContent=`(${selected.size} dipilih)`;};
      $('#j-non',el).onclick=()=>{selected.clear();list($('#j-cari',el).value.trim());};
      window._simpanJadwal = ()=>{
        const get=id=>$('#'+id,el), on=id=>$('#'+id,el).classList.contains('on');
        const data = {
          ...j, judul:get('j-judul').value.trim(), mapel:get('j-mapel').value,
          kelas:$$('#j-kelas input:checked',el).map(c=>c.value),
          pin:get('j-pin').value.trim(), durasi:Math.max(1,num(get('j-durasi').value)),
          mulai:get('j-mulai').value, selesai:get('j-selesai').value,
          kkm:num(get('j-kkm').value), maxWarn:Math.max(1,num(get('j-maxwarn').value,3)),
          aktif:on('j-aktif'), acakSoal:on('acakSoal'), acakOpsi:on('acakOpsi'), tampilKunci:on('tampilKunci'),
          petunjuk:get('j-petunjuk').value.trim(), soal:[...selected]
        };
        if(!data.judul) return toast('Judul ujian wajib diisi','warn');
        if(!data.kelas.length) return toast('Pilih minimal satu kelas','warn');
        if(!data.pin) return toast('PIN sesi wajib diisi','warn');
        if(toDate(data.mulai)>=toDate(data.selesai)) return toast('Waktu berakhir harus setelah waktu mulai','warn');
        if(!data.soal.length && !confirm('Belum ada soal dipilih. Lanjutkan simpan?')) return;
        if(isNew){ DB.jadwal.push(data); } else { const i=DB.jadwal.findIndex(x=>x.id===j.id); DB.jadwal[i]=data; }
        saveDB(); api.close(); renderJadwal($('#view')); toast('Jadwal "'+data.judul+'" disimpan','success');
      };
    }
  });
  function simpanJadwal(){ window._simpanJadwal(); }
}

/* ================= BANK SOAL ================= */
let bankFilter = {mapel:'', tipe:'', cari:''};
function renderBank(v){
  v.innerHTML = `
  <div class="page-head">
    <div><h1>Bank Soal</h1><p>Bank soal terintegrasi — 4 jenis: Pilihan Ganda, Benar–Salah, Menjodohkan &amp; Esai. Bisa digabung dalam satu ujian.</p></div>
    <div class="row">
      <button class="btn ghost" id="b-impor">${icon('upload')} Impor</button>
      <button class="btn ghost" id="b-ekspor">${icon('download')} Ekspor TSV</button>
      <button class="btn ghost" id="b-drive">${icon('image')} Generator Gambar Drive</button>
      <button class="btn pri" id="b-add">${icon('plus')} Tambah Soal</button>
    </div>
  </div>
  <div class="filters">
    <select class="inp" id="f-mapel"><option value="">Semua mapel</option>${DB.mapel.map(x=>`<option ${bankFilter.mapel===x?'selected':''}>${esc(x)}</option>`).join('')}</select>
    <select class="inp" id="f-tipe"><option value="">Semua tipe</option>${Object.entries(TIPE_LABEL).map(([k,t])=>`<option value="${k}" ${bankFilter.tipe===k?'selected':''}>${t}</option>`).join('')}</select>
    <div class="search">${icon('search',17)}<input class="inp" id="f-cari" placeholder="Cari pertanyaan…" value="${esc(bankFilter.cari)}"></div>
    <span class="mut small" id="f-jumlah"></span>
  </div>
  <div id="bank-list"></div>`;
  const refresh=()=>{
    let arr = DB.bankSoal.slice();
    if(bankFilter.mapel) arr=arr.filter(s=>s.mapel===bankFilter.mapel);
    if(bankFilter.tipe) arr=arr.filter(s=>s.tipe===bankFilter.tipe);
    if(bankFilter.cari){ const c=bankFilter.cari.toLowerCase(); arr=arr.filter(s=>(s.teks+' '+s.mapel).toLowerCase().includes(c)); }
    $('#f-jumlah',v).textContent = arr.length+' soal';
    $('#bank-list',v).innerHTML = `<div class="tblwrap"><table class="tbl">
      <thead><tr><th style="width:44px">#</th><th>Tipe</th><th>Pertanyaan</th><th>Mapel</th><th>Bobot</th><th class="right">Aksi</th></tr></thead>
      <tbody>${arr.map((s,i)=>`<tr>
        <td class="mut">${i+1}</td>
        <td><span class="bdg ${s.tipe==='pg'?'b':s.tipe==='bs'?'v':s.tipe==='mj'?'y':'g'}">${TIPE_LABEL[s.tipe]}</span></td>
        <td class="qcell"><div class="t">${esc(s.teks)} ${s.gambar?icon('image',13):''}</div></td>
        <td class="small">${esc(s.mapel)}</td><td>${s.bobot}</td>
        <td class="acts">
          <button class="btn xs ghost" data-edit="${s.id}">${icon('pencil',14)}</button>
          <button class="btn xs ghost" data-cpy="${s.id}" title="Duplikat">${icon('copy',14)}</button>
          <button class="btn xs ghost" data-del="${s.id}">${icon('trash',14)}</button>
        </td></tr>`).join('') || `<tr><td colspan="6"><div class="empty">${icon('db',26)}<div>Belum ada soal pada filter ini.</div></div></td></tr>`}
      </tbody></table></div>`;
    $$('[data-edit]',v).forEach(b=>b.onclick=()=>openSoalForm(getSoal(b.dataset.edit), refresh));
    $$('[data-del]',v).forEach(b=>b.onclick=async()=>{
      if(await confirmBox('Hapus soal ini dari bank?',{danger:true,ok:'Hapus'})){
        markDeleted('bankSoal',b.dataset.del); DB.bankSoal=DB.bankSoal.filter(s=>s.id!==b.dataset.del); saveDB(); refresh(); toast('Soal dihapus','success');
      }});
    $$('[data-cpy]',v).forEach(b=>b.onclick=()=>{
      const s=JSON.parse(JSON.stringify(getSoal(b.dataset.cpy))); s.id=uid('q'); s.teks+=' (salinan)';
      DB.bankSoal.unshift(s); saveDB(); refresh(); toast('Soal diduplikasi','success');
    });
  };
  $('#b-add',v).onclick=()=>openSoalForm(null, refresh);
  $('#b-impor',v).onclick=()=>openImportModal(refresh);
  $('#b-ekspor',v).onclick=()=>{
    const rows = DB.bankSoal.map(soalToTSV);
    downloadText('bank-soal.tsv', ['TIPE\tMAPEL\tPERTANYAAN\tISI\tKUNCI/GAMBAR'].concat(rows).join('\n'),'text/tab-separated-values');
  };
  $('#b-drive',v).onclick=()=>openDriveModal(url=>{ openSoalForm(null, refresh, {gambar:url}); });
  $('#f-mapel',v).onchange=e=>{bankFilter.mapel=e.target.value;refresh();};
  $('#f-tipe',v).onchange=e=>{bankFilter.tipe=e.target.value;refresh();};
  $('#f-cari',v).oninput=e=>{bankFilter.cari=e.target.value;refresh();};
  refresh();
}

/* ---------- rendering satu soal (dipakai ujian & review) ---------- */
function soalHTML(s, no, nilai, {review=false, tampilKunci=false, jawab, prefixId='', opsiUrut=null}={}){
  const ans  = jawab!==undefined ? jawab : (review? undefined : nilai);
  const bObj = (nilai && typeof nilai==='object') ? nilai : null;
  let body='';
  if(s.tipe==='pg'){
    const urut = opsiUrut || s.opsi.map((_,i)=>i);
    body = urut.map(i=>{
      const sel = ans!=null && ans!=='' && +ans===i;
      const kunci = review && tampilKunci && s.kunci===i;
      let style='';
      if(kunci) style='border-color:var(--ok);background:var(--ok-soft)';
      else if(sel&&bObj&&bObj.benar===false) style='border-color:var(--bad);background:var(--bad-soft)';
      return `<div class="opt ${sel?'sel':''}" data-pg="${i}" style="${style}">
        <span class="ok-letter">${opsiLabel(i)}</span><span>${nl2br(s.opsi[i]??'')}</span>
        ${kunci?`<span class="grow right bdg g">${icon('check',12)} kunci</span>`:
          (sel&&bObj&&bObj.benar===false?`<span class="grow right bdg r">jawabanmu</span>`:'')}</div>`;
    }).join('');
  }else if(s.tipe==='bs'){
    const sel=v=>ans===v;
    let style=v=>{ let st='';
      if(review&&tampilKunci&&s.kunci===v) st+='border-color:var(--ok);background:var(--ok-soft);';
      if(sel(v)&&bObj&&bObj.benar===false) st+='border-color:var(--bad);background:var(--bad-soft);';
      return st;};
    body = `<div class="bsrow">
      <div class="bsopt ${sel('BENAR')?'sel':''}" data-bs="BENAR" style="${style('BENAR')}">✔ BENAR${review&&tampilKunci&&s.kunci==='BENAR'?' — kunci':''}</div>
      <div class="bsopt ${sel('SALAH')?'sel':''}" data-bs="SALAH" style="${style('SALAH')}">✘ SALAH${review&&tampilKunci&&s.kunci==='SALAH'?' — kunci':''}</div></div>`;
  }else if(s.tipe==='mj'){
    const opsiKanan = `<option value="">— pilih pasangan —</option>`+(s.pasangan||[]).map((p,i)=>`<option value="${i}">${esc(p.kanan)}</option>`).join('');
    body = `<div class="mjwrap"><div class="mjrow small mut" style="border:0"><span>KIRI</span><span></span><span>KANAN</span></div>`+
      (s.pasangan||[]).map((p,i)=>{
        const t = (ans&&ans[i]!=null&&ans[i]!=='')? +ans[i] : null;
        const ops = t==null? opsiKanan : opsiKanan.replace(`<option value="${t}"`,`<option value="${t}" selected`);
        return `<div class="mjrow"><div class="mjk"><b>${i+1}.</b> ${esc(p.kiri)}</div><div class="mut">↔</div>
          <select class="inp mj-sel" data-i="${i}" ${review?'disabled':''}>${ops}</select></div>`;
      }).join('')+`</div>`;
  }else if(s.tipe==='esai'){
    if(!review){
      body = `<textarea class="inp" id="esai-${prefixId}${s.id}" rows="6" maxlength="4000" placeholder="Tulis jawabanmu di sini…">${esc(typeof ans==='string'?ans:'')}</textarea>
              <div class="small mut mt8" id="escount-${prefixId}${s.id}"></div>`;
    }
  }
  let extra='';
  if(review && bObj){
    const teksJwb = ans!=null&&ans!==''? ringkasJawaban(s,ans):'';
    const cls = bObj.benar?'ok':(teksJwb?'no':'');
    extra = `<div class="ans ${cls}" style="white-space:pre-wrap;margin-top:12px"><b>Jawabanmu:</b> ${esc(teksJwb)||'<i class="mut">tidak dijawab</i>'}${
      tampilKunci?`<br><b>Kunci:</b> ${esc(bObj.kunci||kunciTeks(s))}`:''} · <b>Skor ${bObj.skor??0}/${bObj.maks??(s.bobot||1)}</b></div>`;
  }
  return `<div class="ex-card tipe-${{pg:'b',bs:'h',mj:'m',esai:'e'}[s.tipe]}" data-soal="${s.id}">
    <div class="qhead"><div class="qnum">${no}</div>
      <span class="bdg ${s.tipe==='pg'?'b':s.tipe==='bs'?'v':s.tipe==='mj'?'y':'g'}">${TIPE_LABEL[s.tipe]}</span>
      <span class="mut small">bobot ${s.bobot} poin</span></div>
    <div class="qteks">${nl2br(s.teks)}</div>
    ${s.gambar?`<img class="qimg" src="${esc(s.gambar)}" alt="gambar soal">`:''}
    ${body}${extra}</div>`;
}

/* ---------- form tambah/ubah soal ---------- */
function openSoalForm(s, after, preset={}){
  const isNew=!s;
  s = s ? JSON.parse(JSON.stringify(s)) : {id:uid('q'), mapel:(bankFilter.mapel||DB.mapel[0]||'Matematika'), tipe:'pg', teks:'', bobot:10, gambar:preset.gambar||'', opsi:['','','',''], kunci:0, pasangan:[{kiri:'',kanan:''},{kiri:'',kanan:''},{kiri:'',kanan:''}], kunciEsai:''};
  const m = modal({
    title: isNew?'Tambah Soal':'Ubah Soal', size:'lg',
    body:`
    <div class="row mb16">
      <select class="inp" id="s-tipe" style="width:210px">${Object.entries(TIPE_LABEL).map(([k,t])=>`<option value="${k}" ${s.tipe===k?'selected':''}>${t}</option>`).join('')}</select>
      <select class="inp" id="s-mapel" style="width:200px">${DB.mapel.map(mp=>`<option ${mp===s.mapel?'selected':''}>${esc(mp)}</option>`).join('')}<option value="__new">＋ Mapel baru…</option></select>
      <div class="grow"></div>
      <label class="lab" style="margin:0;width:110px"><span>Bobot</span><input class="inp" type="number" id="s-bobot" value="${s.bobot}" min="1" max="100"></label>
    </div>
    <label class="lab"><span>Pertanyaan</span><textarea class="inp" id="s-teks" rows="3" placeholder="Tulis soal di sini…">${esc(s.teks)}</textarea></label>
    <div id="s-area"></div>
    <fieldset class="fs"><legend>Gambar soal (opsional)</legend>
      <div class="row">
        <input class="inp grow" id="s-gambar" placeholder="Tempel URL gambar / data URI" value="${esc(s.gambar||'')}">
        <button class="btn sm ghost" id="s-pick" type="button">${icon('folder',15)} Ambil dari Drive</button>
        <button class="btn sm ghost" id="s-clearimg" type="button">Hapus</button>
      </div>
      <div class="thumbbox mt8" id="s-preview" style="${s.gambar?'':'display:none'}"><img id="s-pvimg" src="${esc(s.gambar)}"><span class="small mut">Pratinjau gambar soal</span></div>
    </fieldset>`,
    footer:[
      {label:'Batal', cls:'ghost', onClick:()=>m.close()},
      {label: isNew?'Simpan Soal':'Perbarui Soal', cls:'pri', icon:'check', onClick:()=>simpan()}
    ],
    onMount(el,api){
      const area=$('#s-area',el);
      const gambarInput=$('#s-gambar',el);
      gambarInput.oninput=()=>{const g=gambarInput.value.trim(); $('#s-pvimg',el).src=g; $('#s-preview',el).style.display=g?'':'none';};
      $('#s-clearimg',el).onclick=()=>{gambarInput.value='';gambarInput.oninput();};
      $('#s-pick',el).onclick=()=>openDriveModal(url=>{gambarInput.value=url;gambarInput.oninput();toast('Link gambar dimasukkan','success');});

      function renderArea(){
        const tipe=$('#s-tipe',el).value;
        if(tipe==='pg'){
          area.innerHTML = `<fieldset class="fs"><legend>Opsi jawaban — klik huruf untuk menandai kunci</legend><div id="pg-rows"></div>
            <button class="btn sm ghost" type="button" id="pg-add">${icon('plus',14)} Tambah opsi</button></fieldset>`;
          const rows=$('#pg-rows',el);
          const draw=()=>{
            rows.innerHTML=s.opsi.map((o,i)=>`<div class="opt-row">
              <div class="opt-key ${s.kunci===i?'sel':''}" title="Jadikan kunci" data-k="${i}">${opsiLabel(i)}</div>
              <input class="inp" data-o="${i}" value="${esc(o)}" placeholder="Opsi ${opsiLabel(i)}">
              <button class="icon-btn" data-del="${i}" title="Hapus opsi">${icon('x',14)}</button></div>`).join('');
            $$('[data-o]',rows).forEach(inp=>inp.oninput=()=>s.opsi[+inp.dataset.o]=inp.value);
            $$('.opt-key',rows).forEach(k=>k.onclick=()=>{s.kunci=+k.dataset.k;draw();});
            $$('[data-del]',rows).forEach(b=>b.onclick=()=>{if(s.opsi.length<=2)return toast('Minimal 2 opsi','warn');s.opsi.splice(+b.dataset.del,1);if(s.kunci>=s.opsi.length)s.kunci=0;draw();});
          };
          draw();
          $('#pg-add',el).onclick=()=>{if(s.opsi.length>=8)return toast('Maksimal 8 opsi','warn');s.opsi.push('');draw();};
        }else if(tipe==='bs'){
          area.innerHTML=`<fieldset class="fs"><legend>Kunci jawaban</legend><div class="bsrow" style="max-width:360px">
            <div class="bsopt ${s.kunci==='BENAR'?'sel':''}" data-v="BENAR">BENAR</div>
            <div class="bsopt ${s.kunci==='SALAH'?'sel':''}" data-v="SALAH">SALAH</div></div></fieldset>`;
          $$('[data-v]',area).forEach(b=>b.onclick=()=>{s.kunci=b.dataset.v;renderArea();});
        }else if(tipe==='mj'){
          area.innerHTML=`<fieldset class="fs"><legend>Pasangan kiri ↔ kanan</legend><div id="mj-rows"></div>
            <button class="btn sm ghost" type="button" id="mj-add">${icon('plus',14)} Tambah baris</button></fieldset>`;
          const draw=()=>{
            $('#mj-rows',el).innerHTML=s.pasangan.map((p,i)=>`<div class="opt-row">
              <span class="mut" style="width:20px">${i+1}</span>
              <input class="inp" data-k="${i}" value="${esc(p.kiri)}" placeholder="Soal kiri (cth: Pandai)">
              <span class="mut">↔</span>
              <input class="inp" data-r="${i}" value="${esc(p.kanan)}" placeholder="Pasangan (cth: Bodoh)">
              <button class="icon-btn" data-del="${i}">${icon('x',14)}</button></div>`).join('');
            $$('[data-k]',el).forEach(i2=>i2.oninput=()=>s.pasangan[+i2.dataset.k].kiri=i2.value);
            $$('[data-r]',el).forEach(i2=>i2.oninput=()=>s.pasangan[+i2.dataset.r].kanan=i2.value);
            $$('[data-del]',el).forEach(b=>b.onclick=()=>{if(s.pasangan.length<=2)return toast('Minimal 2 baris','warn');s.pasangan.splice(+b.dataset.del,1);draw();});
          };
          draw();
          $('#mj-add',el).onclick=()=>{if(s.pasangan.length>=10)return toast('Maksimal 10 baris','warn');s.pasangan.push({kiri:'',kanan:''});draw();};
        }else{
          area.innerHTML=`<fieldset class="fs"><legend>Pedoman penilaian esai (untuk koreksi)</legend>
            <label class="lab"><span>Kata kunci / poin yang diharapkan — pisahkan dengan koma</span>
            <input class="inp" id="s-kunci" value="${esc(s.kunciEsai||'')}" placeholder="cth: phi, rumus, radius, kuadrat"></label>
            <p class="small mut">Esai dinilai manual oleh guru. Saat mengoreksi, tombol <b>"Isi dari kata kunci"</b> dapat membantu memberi skor otomatis per kata kunci yang ditemukan.</p></fieldset>`;
        }
      }
      $('#s-tipe',el).onchange=()=>{s.tipe=$('#s-tipe',el).value;renderArea();};
      renderArea();
      $('#s-mapel',el).onchange=async e=>{
        if(e.target.value==='__new'){
          const nm=await promptBox('Nama mata pelajaran baru');
          if(nm){ DB.mapel.push(nm); e.target.innerHTML=DB.mapel.map(mp=>`<option>${esc(mp)}</option>`).join('')+'<option value="__new">＋ Mapel baru…</option>'; e.target.value=nm; saveDB(); }
          else e.target.value=s.mapel;
        }
      };
      function simpan(){
        const tipe=$('#s-tipe',el).value;
        const data={...s, tipe, mapel:$('#s-mapel',el).value, bobot:Math.max(1,num($('#s-bobot',el).value,10)),
          teks:$('#s-teks',el).value.trim(), gambar:$('#s-gambar',el).value.trim(),
          kunciEsai: ($('#s-kunci',el)?$('#s-kunci',el).value:'').trim()};
        if(!data.teks) return toast('Pertanyaan wajib diisi','warn');
        if(tipe==='pg'){
          data.opsi=data.opsi.map(o=>o.trim()).filter(o=>o!=='');
          if(data.opsi.length<2) return toast('Isi minimal 2 opsi','warn');
          data.kunci=Math.min(data.kunci,data.opsi.length-1);
          delete data.pasangan; delete data.kunciEsai;
        }else if(tipe==='bs'){ delete data.opsi; delete data.pasangan;
          if(data.kunci!=='BENAR'&&data.kunci!=='SALAH') data.kunci='BENAR';
        }else if(tipe==='mj'){
          data.pasangan=data.pasangan.filter(p=>p.kiri.trim()&&p.kanan.trim());
          if(data.pasangan.length<2) return toast('Isi minimal 2 baris pasangan','warn');
          delete data.opsi; delete data.kunci;
        }else{ delete data.opsi; delete data.kunci; delete data.pasangan; }
        if(isNew) DB.bankSoal.unshift(data); else DB.bankSoal[DB.bankSoal.findIndex(x=>x.id===data.id)]=data;
        saveDB(); api.close(); after&&after(); toast('Soal disimpan','success');
      }
    }
  });
}

/* ---------- generator gambar drive (dipakai di form & toolbar) ---------- */
function openDriveModal(onPick){
  const m = modal({
    title: icon('image',18)+' Generator Link Gambar Google Drive', size:'lg',
    body:`<div class="note blue mb16">${icon('info',18)}<div>Tempel <b>link folder Google Drive</b> yang tersedia publik, semua gambar di dalamnya otomatis menjadi link siap pakai untuk soal. Ketik nama file untuk menyaring.</div></div>
      <div class="row">
        <input class="inp grow" id="dv-url" placeholder="https://drive.google.com/drive/folders/… atau ID folder">
        <button class="btn pri sm" id="dv-load">${icon('download',14)} Muat</button>
      </div>
      <div class="row mt8"><input class="inp grow" id="dv-cari" placeholder="Ketik nama file gambar… (cth: grafik)" disabled>
        <span class="small mut" id="dv-jml"></span></div>
      <div id="dv-out" class="mt16"><div class="empty small">Folder belum dimuat.</div></div>`,
    footer:[{label:'Tutup',cls:'ghost'}],
    onMount(el,api){
      let items=[];
      const out=$('#dv-out',el);
      const draw=(f='')=>{
        const arr=f?items.filter(x=>x.name.toLowerCase().includes(f.toLowerCase())):items;
        $('#dv-jml',el).textContent=arr.length+' gambar';
        out.innerHTML=`<div class="drive-grid">${arr.map(x=>`<div class="drive-item" data-id="${x.id}" title="${esc(x.name)}">
          <img loading="lazy" src="${driveThumb(x.id)}" onerror="this.style.opacity=.25"><span>${esc(x.name)}</span></div>`).join('')}</div>`;
        $$('.drive-item',out).forEach(d=>d.onclick=async()=>{
          const x=items.find(i=>i.id===d.dataset.id);
          const url=driveLink(x.id);
          const ok=await confirmBox(`<div>Gunakan gambar <b>${esc(x.name)}</b>?<div class="small mut mt8" style="word-break:break-all">${esc(url)}</div></div>`,{title:'Link gambar',ok:'Gunakan'});
          if(ok){ api.close(); onPick&&onPick(url); }
        });
      };
      const load=async()=>{
        out.innerHTML='<div class="empty small">Menghubungi Google Drive…</div>';
        try{
          const r=await fetchDriveFolder($('#dv-url',el).value.trim());
          items=r.items;
          $('#dv-cari',el).disabled=false; $('#dv-cari',el).focus(); draw();
          toast(items.length+' gambar dimuat dari folder','success');
        }catch(e){ out.innerHTML=`<div class="note red">${icon('flag',18)}<div>${esc(e.message)}<br><span class="small">Alternatif: unggar gambar ke hosting mana pun lalu tempel URL-nya langsung di kolom "Gambar soal".</span></div></div>`; }
      };
      $('#dv-load',el).onclick=load;
      $('#dv-url',el).onkeydown=e=>{if(e.key==='Enter')load();};
      $('#dv-cari',el).oninput=e=>draw(e.target.value.trim());
    }
  });
}

/* ---------- impor soal ---------- */
function soalToTSV(s){
  const t=(x)=>String(x??'').replace(/[\t\n]+/g,' ');
  if(s.tipe==='pg')   return ['PILIHAN_GANDA',s.mapel,t(s.teks),s.opsi.map(t).join('|'),s.kunci+''].join('\t');
  if(s.tipe==='bs')   return ['BENAR_SALAH',s.mapel,t(s.teks),s.kunci].join('\t');
  if(s.tipe==='mj')   return ['MENJODOHKAN',s.mapel,t(s.teks),(s.pasangan||[]).map(p=>`${t(p.kiri)}=${t(p.kanan)}`).join('|'),''].join('\t');
  return ['ESAI',s.mapel,t(s.teks),'',t(s.kunciEsai||'')].join('\t');
}
function parseImportTSV(text){
  const out=[], err=[];
  text.split(/\r?\n/).forEach((line,ln)=>{
    const L=line.trim(); if(!L||L.toUpperCase().startsWith('TIPE')) return;
    const p=L.split('\t').map(x=>x.trim());
    const tipeRaw=(p[0]||'').toUpperCase().replace(/[\s_-]/g,'');
    const mk=(o)=>({id:uid('q'), mapel:p[1]||'', teks:p[2]||'', bobot:10, gambar:'', ...o});
    try{
      if(tipeRaw==='PILIHANGANDA'||tipeRaw==='PG'){
        const opsi=(p[3]||'').split('|').map(x=>x.trim()).filter(Boolean);
        let k=p[4]!=null&&p[4]!==''?p[4]:opsi[opsi.length-1];
        let ki = typeof k==='string'&&/^[A-Ha-h]$/.test(k)? k.toUpperCase().charCodeAt(0)-65 : parseInt(k);
        if(isNaN(ki)) ki=opsi.length-1;
        if(opsi.length<2) throw 'opsi < 2';
        out.push(mk({tipe:'pg', opsi, kunci:Math.max(0,Math.min(opsi.length-1,ki))}));
      }else if(tipeRaw==='BENARSALAH'||tipeRaw==='BS'){
        const b=/^(S|SALAH|FALSE|0)$/i.test(p[3]||'')?'SALAH':'BENAR';
        out.push(mk({tipe:'bs', kunci:b}));
      }else if(tipeRaw==='MENJODOHKAN'||tipeRaw==='MJ'){
        const pasangan=(p[3]||'').split('|').map(x=>{const [a,b]=x.split('=');return {kiri:(a||'').trim(),kanan:(b||'').trim()};}).filter(x=>x.kiri&&x.kanan);
        if(pasangan.length<2) throw 'pasangan < 2';
        out.push(mk({tipe:'mj', pasangan}));
      }else if(tipeRaw==='ESAI'){
        out.push(mk({tipe:'esai', kunciEsai:p[3]||''}));
      }else throw 'tipe tidak dikenal: '+(p[0]||'');
    }catch(e){ err.push(`Baris ${ln+1}: ${e==='opsi < 2'?'opsi kurang dari 2':e==='pasangan < 2'?'pasangan kurang dari 2':e.message||e}`); }
  });
  return {out, err};
}
function openImportModal(after){
  const contoh = ['PILIHAN_GANDA\tMatematika\tHasil dari 15 + 27 adalah …\t32|42|41|45\tB',
    'BENAR_SALAH\tMatematika\tSemua bilangan genap habis dibagi 2.\tBENAR',
    'MENJODOHKAN\tIPA\tJodohkan hewan dengan makanannya!\tKucing=Ikan|Sapi=Rumput|Elang=Daging',
    'ESAI\tIPA\tJelaskan perbedaan mendaur ulang dan menggunakan kembali!'].join('\n');
  const m=modal({
    title:'Impor Soal (TSV)',
    body:`<div class="note blue mb16">${icon('info',18)}<div>Satu baris = satu soal, kolom dipisah <b>TAB</b> (bisa langsung di-copy dari Google Sheets):<br>
      <code>PILIHAN_GANDA</code> → TIPE · mapel · pertanyaan · opsi (pisah dengan |) · kunci (huruf/angka)<br>
      <code>BENAR_SALAH</code> → TIPE · mapel · pertanyaan · kunci (BENAR/SALAH)<br>
      <code>MENJODOHKAN</code> → TIPE · mapel · pertanyaan · pasangan kiri=kanan dipisah |<br>
      <code>ESAI</code> → TIPE · mapel · pertanyaan · kata kunci (opsional)</div></div>
      <label class="lab"><span>Tujuan mapel untuk semua soal (kosongkan untuk ikuti kolom mapel)</span>
      <select class="inp" id="im-mapel"><option value="">— ikuti file —</option>${DB.mapel.map(x=>`<option>${esc(x)}</option>`).join('')}</select></label>
      <label class="lab"><span>Tempel isi file / baris soal</span><textarea class="inp" id="im-text" rows="8" style="font-family:ui-monospace,monospace;font-size:.8rem" placeholder="${esc(contoh)}"></textarea></label>
      <div id="im-msg" class="small"></div>`,
    footer:[
      {label:'Isi contoh', cls:'ghost', icon:'file', onClick:()=>{$('#im-text',m.el).value=contoh; $('#im-text',m.el).dispatchEvent(new Event('input'));}},
      {label:'Batal', cls:'ghost', onClick:()=>m.close()},
      {label:'Impor', cls:'pri', icon:'upload', onClick:()=>jalan()}
    ],
    onMount(el){
      $('#im-text',el).oninput=()=>{
        const {out,err}=parseImportTSV($('#im-text',el).value);
        $('#im-msg',el).innerHTML = (out.length?`<span style="color:var(--ok);font-weight:700">✔ ${out.length} soal terbaca</span>`:'') +
          (err.length?` <span style="color:var(--bad)"> · ${err.length} baris gagal: ${esc(err.join('; '))}</span>`:'');
      };
    }
  });
  function jalan(){
    const {out,err}=parseImportTSV($('#im-text',m.el).value);
    if(!out.length) return toast('Tidak ada soal valid untuk diimpor','warn');
    const mp=$('#im-mapel',m.el).value;
    out.forEach(q=>{ if(mp) q.mapel=mp; if(q.mapel&&!DB.mapel.includes(q.mapel)) DB.mapel.push(q.mapel); DB.bankSoal.unshift(q); });
    saveDB(); m.close(); after&&after();
    toast(`${out.length} soal berhasil diimpor${err.length?` · ${err.length} baris dilewati`:''}`, err.length?'warn':'success');
  }
}
