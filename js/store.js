'use strict';
/* =========================================================
   store.js — model data, seed demo, penyimpanan (localStorage)
   dan mesin penilai otomatis.
   ========================================================= */

const LS_KEY = 'UJIAN_ONLINE_V3';

/* ---------- preset tampilan (login) ---------- */
const BG_PRESETS = [
  'linear-gradient(135deg,#0f2a5c,#0b1b33)',
  'linear-gradient(135deg,#1e3a8a,#0ea5e9)',
  'linear-gradient(135deg,#065f46,#10b981)',
  'linear-gradient(135deg,#4c1d95,#a78bfa)',
  'linear-gradient(135deg,#831843,#f472b6)',
  'linear-gradient(135deg,#7c2d12,#f59e0b)',
  'linear-gradient(135deg,#0f172a,#334155)',
  'linear-gradient(135deg,#155e75,#67e8f9)',
];
const DEFAULT_LOGO = "data:image/svg+xml;utf8," + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#1d4ed8"/><path d="M32 14 6 25l26 11 20-8.5V38h5V25z" fill="#fff"/><path d="M17 31.5V41c0 3.9 6.7 7 15 7s15-3.1 15-7v-9.5l-15 6.4z" fill="#bfdbfe"/></svg>`);
const SVG_SEGITIGA = "data:image/svg+xml;utf8," + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 170"><rect width="260" height="170" fill="#f8fafc"/><polygon points="40,140 220,140 130,30" fill="#eff6ff" stroke="#1d4ed8" stroke-width="3"/><text x="52" y="132" font-size="15" fill="#0f172a">60°</text><text x="192" y="132" font-size="15" fill="#0f172a">50°</text><text x="122" y="56" font-size="15" fill="#dc2626" font-weight="bold">x</text></svg>`);

/* ---------- seed data demo ---------- */
function seedData(){
  const now = Date.now(), H=36e5, D=864e5;
  const dt = off => localInput(new Date(now+off));
  const users = [
    {id:'u_admin', nama:'Administrator', username:'admin', pass:'admin123', role:'admin', kelas:''},
    {id:'u_guru1', nama:'Budi Santoso, S.Pd', username:'guru', pass:'guru123', role:'guru', kelas:''},
    {id:'u_guru2', nama:'Siti Aminah, S.Pd', username:'siti', pass:'guru123', role:'guru', kelas:''},
    {id:'u_s1', nama:'Andi Saputra',  username:'andi',  pass:'siswa123', role:'siswa', kelas:'7A'},
    {id:'u_s2', nama:'Sari Wulandari',username:'sari',  pass:'siswa123', role:'siswa', kelas:'7A'},
    {id:'u_s3', nama:'Dewi Lestari',  username:'dewi',  pass:'siswa123', role:'siswa', kelas:'7A'},
    {id:'u_s4', nama:'Rudi Hartono',  username:'rudi',  pass:'siswa123', role:'siswa', kelas:'7B'},
    {id:'u_s5', nama:'Maya Anggraini',username:'maya',  pass:'siswa123', role:'siswa', kelas:'7B'},
    {id:'u_s6', nama:'Fitri Handayani',username:'fitri',pass:'siswa123', role:'siswa', kelas:'8A'},
  ];
  const bankSoal = [
    {id:'q_m1', mapel:'Matematika', tipe:'pg', bobot:10, gambar:'',
      teks:'Hasil dari 12 × 8 adalah …', opsi:['86','92','96','104'], kunci:2},
    {id:'q_m2', mapel:'Matematika', tipe:'pg', bobot:10, gambar:SVG_SEGITIGA,
      teks:'Perhatikan gambar! Besar sudut x pada segitiga tersebut adalah …', opsi:['60°','70°','80°','90°'], kunci:2},
    {id:'q_m3', mapel:'Matematika', tipe:'bs', bobot:5, gambar:'',
      teks:'KPK dari 12 dan 18 adalah 36.', kunci:'BENAR'},
    {id:'q_m4', mapel:'Matematika', tipe:'bs', bobot:5, gambar:'',
      teks:'Hasil dari −8 + 5 adalah 13.', kunci:'SALAH'},
    {id:'q_m5', mapel:'Matematika', tipe:'mj', bobot:20,
      teks:'Jodohkan operasi hitung di kiri dengan hasilnya di kanan!',
      pasangan:[
        {kiri:'25% dari 200', kanan:'50'},
        {kiri:'¼ + ½',        kanan:'¾'},
        {kiri:'7²',           kanan:'49'},
        {kiri:'√144',         kanan:'12'},
      ]},
    {id:'q_m6', mapel:'Matematika', tipe:'esai', bobot:50,
      teks:'Jelaskan langkah-langkah menghitung luas lingkaran beserta rumusnya!', kunci:'π × r² — disebut phi/radius/kuadrat'},
    {id:'q_i1', mapel:'IPA', tipe:'pg', bobot:10,
      teks:'Planet yang paling dekat dengan Matahari adalah …', opsi:['Merkurius','Venus','Bumi','Mars'], kunci:0},
    {id:'q_i2', mapel:'IPA', tipe:'bs', bobot:10,
      teks:'Cahaya merambat lurus.', kunci:'BENAR'},
    {id:'q_i3', mapel:'IPA', tipe:'esai', bobot:20,
      teks:'Sebutkan 3 wujud benda beserta masing-masing satu contohnya!', kunci:'padat, cair, gas'},
    {id:'q_b1', mapel:'B. Indonesia', tipe:'pg', bobot:10,
      teks:'Kata baku di bawah ini adalah …', opsi:['apotik','apotek','praktek','rubah'], kunci:1},
    {id:'q_b2', mapel:'B. Indonesia', tipe:'mj', bobot:20,
      teks:'Jodohkan kata berikut dengan lawan katanya (antonim)!',
      pasangan:[
        {kiri:'Pandai',   kanan:'Bodoh'},
        {kiri:'Gelap',    kanan:'Terang'},
        {kiri:'Panjang',  kanan:'Pendek'},
        {kiri:'Mahal',    kanan:'Murah'},
      ]},
    {id:'q_b3', mapel:'B. Indonesia', tipe:'esai', bobot:20,
      teks:'Tulislah ide pokok paragraf: "Hutan mangrove melindungi pantai dari abrasi, menjadi habitat biota laut, dan sumber ekonomi warga."',
      kunci:'perlindungan/manfaat hutan mangrove'},
    {id:'q_s1', mapel:'IPS', tipe:'pg', bobot:10,
      teks:'Gunung tertinggi di Indonesia adalah …', opsi:['Semeru','Rinjani','Puncak Jaya','Kerinci'], kunci:2},
    {id:'q_p1', mapel:'PPKN', tipe:'bs', bobot:10,
      teks:'Sila ke-2 Pancasila berbunyi "Kemanusiaan yang adil dan beradab".', kunci:'BENAR'},
  ];
  const jadwal = [
    {id:'j_1', judul:'Penilaian Harian — Lingkaran & Aritmetika', mapel:'Matematika', kelas:['7A'],
      pin:'1234', mulai:dt(-1*D), selesai:dt(+7*D), durasi:60, aktif:true,
      acakSoal:true, acakOpsi:false, tampilKunci:true, maxWarn:3, kkm:75,
      soal:['q_m1','q_m2','q_m3','q_m4','q_m5','q_m6'],
      dibuat:'u_guru1', dibuatPad:isoNow(),
      petunjuk:'Kerjakan dengan jujur. Jangan berpindah tab, keluar layar penuh, atau membuka aplikasi lain selama ujian — sistem mendiskualifikasi otomatis.'},
    {id:'j_2', judul:'Kuis IPA — Wujud Benda', mapel:'IPA', kelas:['7B'],
      pin:'2468', mulai:dt(+1*D), selesai:dt(+3*D), durasi:30, aktif:true,
      acakSoal:false, acakOpsi:false, tampilKunci:true, maxWarn:2, kkm:70,
      soal:['q_i1','q_i2','q_i3'], dibuat:'u_guru2', dibuatPad:isoNow(), petunjuk:''},
    {id:'j_3', judul:'PTS Gasal — Teks Eksplanasi', mapel:'B. Indonesia', kelas:['7A','8A'],
      pin:'1357', mulai:dt(-8*D), selesai:dt(-6*D), durasi:90, aktif:true,
      acakSoal:false, acakOpsi:false, tampilKunci:true, maxWarn:3, kkm:75,
      soal:['q_b1','q_b2','q_b3'], dibuat:'u_admin', dibuatPad:isoNow(), petunjuk:''},
  ];
  /* contoh hasil (ujian lalu j_3) */
  const jawabanAndi  = {q_b1:1, q_b2:{0:0,1:1,2:2,3:3}, q_b3:'Hutan mangrove sangat bermanfaat untuk melindungi pantai dari abrasi, menjadi habitat biota laut, dan sumber ekonomi warga.'};
  const jawabanFitri = {q_b1:0, q_b2:{0:1,1:0,2:2,3:3}, q_b3:'Mangrove itu penting.'};
  const hasil = [
    mkHasil({jadwalId:'j_3', userId:'u_s1', mulai:dt(-7*D-80*60e3), submit:dt(-7*D), jawaban:jawabanAndi,
      esaiNilai:{q_b3:{skor:18, catatan:'Ide pokok tepat, penjelasan ringkas.'}}, pelanggaran:[]}),
    mkHasil({jadwalId:'j_3', userId:'u_s6', mulai:dt(-7*D-70*60e3), submit:dt(-7*D), jawaban:jawabanFitri,
      esaiNilai:{}, pelanggaran:[{t:isoNow(), type:'tab'}]}),
  ];
  return {
    settings:{
      appTitle:'Ujian Online v3', schoolName:'SMP Nusantara',
      logo:DEFAULT_LOGO, bg:{type:'preset', idx:1, value:''},
      anticheat:true, kkmDefault:75, durasiDefault:60,
    },
    users, mapel:['Matematika','IPA','IPS','B. Indonesia','B. Inggris','PPKN'],
    kelas:['7A','7B','8A','8B'], bankSoal, jadwal, hasil, log:[]
  };
}
function mkHasil({jadwalId, userId, mulai, submit, jawaban, esaiNilai={}, pelanggaran=[], status='selesai'}){
  return {id:uid('h'), jadwalId, userId, mulai, submit, jawaban, esaiNilai, pelanggaran, status};
}

/* ---------- load / save ---------- */
let DB;
function loadDB(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(raw){ DB = JSON.parse(raw); if(!DB.settings||!DB.jadwal) throw 0; }
    else { DB = seedData(); saveDB(); }
  }catch{ DB = seedData(); saveDB(); }
}
let _saveTimer=null;
function saveDB(){
  try{ localStorage.setItem(LS_KEY, JSON.stringify(DB)); }
  catch(e){ toast('Gagal menyimpan: penyimpanan penuh','error'); }
  if(window.Remote && !Remote._silent) Remote.push();   // sinkron ke Google Sheets (mode server)
}
/* tombstone penghapusan agar ikut ter-merge di server */
function markDeleted(coll,id){
  DB.deleted = DB.deleted||{};
  const arr = DB.deleted[coll]=DB.deleted[coll]||[];
  if(!arr.includes(id)) arr.push(id);
}
function saveSoon(){ clearTimeout(_saveTimer); _saveTimer=setTimeout(saveDB, 250); }
function resetDB(){ localStorage.removeItem(LS_KEY); location.reload(); }

/* ---------- lookup ---------- */
const getSoal   = id  => DB.bankSoal.find(s=>s.id===id);
const getJadwal = id  => DB.jadwal.find(j=>j.id===id);
const getUser   = id  => DB.users.find(u=>u.id===id);
const getHasil  = id  => DB.hasil.find(h=>h.id===id);
const TIPE_LABEL = {pg:'Pilihan Ganda', bs:'Benar–Salah', mj:'Menjodohkan', esai:'Esai'};
const opsiLabel  = i  => String.fromCharCode(65+i);

/* ---------- status jadwal berdasarkan waktu ---------- */
function statusJadwal(j){
  if(!j.aktif) return {key:'nonaktif', label:'Nonaktif', cls:'s'};
  const t=Date.now(), m=+toDate(j.mulai), s=+toDate(j.selesai);
  if(isNaN(m)||isNaN(s)) return {key:'error',label:'Jadwal salah',cls:'r'};
  if(t<m) return {key:'depan',label:'Belum dibuka',cls:'b'};
  if(t>s) return {key:'lalu',label:'Ditutup',cls:'s'};
  return {key:'aktif',label:'Berlangsung',cls:'g'};
}

/* =========================================================
   MESIN PENILAI
   jawaban: {soalId: nilai}
     pg  -> index opsi (number)
     bs  -> 'BENAR' | 'SALAH'
     mj  -> {idxKiri: idxKananPilihan}
     esai-> string teks
   esaiNilai: {soalId: {skor, catatan}}
   ========================================================= */
function nilaiSoalObjektif(soal, ans){
  const b = num(soal.bobot,1);
  if(soal.tipe==='pg'){
    const benar = ans!=null && ans!=='' && +ans===+soal.kunci;
    return {skor: benar?b:0, maks:b, benar};
  }
  if(soal.tipe==='bs'){
    const benar = ans===soal.kunci;
    return {skor: benar?b:0, maks:b, benar:!!benar};
  }
  if(soal.tipe==='mj'){
    const ps = soal.pasangan||[];
    if(!ps.length) return {skor:0, maks:b, benar:false};
    let benar=0;
    ps.forEach((p,i)=>{ if(ans && Number(ans[i])===i) benar++; });
    const terisi = ans ? Object.values(ans).filter(v=>v!=null&&v!=='').length : 0;
    return {skor: r1(b*benar/ps.length), maks:b, benar: benar===ps.length, pasanganBenar:benar, terisi};
  }
  return {skor:0, maks:b, benar:false};
}
function hitungNilai(jadwal, jawaban, esaiNilai={}){
  let total=0, maks=0, perluKoreksi=false;
  const detail=[];
  for(const sid of jadwal.soal||[]){
    const s = getSoal(sid); if(!s) continue;
    if(s.tipe==='esai'){
      const m = esaiNilai[s.id];
      if(m==null || m.skor==null) perluKoreksi=true;
      const sk = m&&m.skor!=null ? num(m.skor) : 0;
      total+=sk; maks+=num(s.bobot,1);
      detail.push({soalId:s.id, tipe:'esai', skor:sk, maks:num(s.bobot,1), dinilaiManual:true, terkoreksi:m!=null&&m.skor!=null});
    }else{
      const r = nilaiSoalObjektif(s, jawaban?jawaban[s.id]:undefined);
      total+=r.skor; maks+=r.maks;
      detail.push(Object.assign({soalId:s.id, tipe:s.tipe}, r));
    }
  }
  const persen = maks>0 ? r1(total/maks*100) : 0;
  return {total:r1(total), maks, persen, perluKoreksi, detail};
}
function nilaiHasil(h){
  const j = getJadwal(h.jadwalId); if(!j) return null;
  const n = hitungNilai(j, h.jawaban, h.esaiNilai||{});
  n.diskual = h.status==='didiskualifikasi';
  n.nilaiAkhir = n.diskual ? 0 : n.persen;
  n.lulus = !n.diskual && n.persen >= num(j.kkm,75) && !n.perluKoreksi;
  n.perluKoreksi = n.perluKoreksi && !n.diskual;
  return n;
}
function hasilJadwal(jadwalId){ return DB.hasil.filter(h=>h.jadwalId===jadwalId); }
function pesertaSelesai(jadwalId){ return hasilJadwal(jadwalId).filter(h=>h.status!=='berlangsung').length; }
function hasilSiswa(userId){ return DB.hasil.filter(h=>h.userId===userId); }

/* ---------- sesi ---------- */
function sesiGet(){ try{ return JSON.parse(sessionStorage.getItem('UO_SESI')||'null'); }catch{ return null; } }
function sesiSet(u){ sessionStorage.setItem('UO_SESI', JSON.stringify({id:u.id})); }
function sesiClear(){ sessionStorage.removeItem('UO_SESI'); }
function userAktif(){ const s=sesiGet(); return s?getUser(s.id):null; }

/* catatan: teks → aman untuk multiline */
function nl2br(s){ return esc(s).replace(/\n/g,'<br>'); }
