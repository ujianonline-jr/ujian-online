'use strict';
/* =========================================================
   remote.js — Jembatan sinkronisasi ke backend Google Apps
   Script + Google Sheets (opsional).

   Mode aktif bila URL Web App tersimpan di localStorage
   (diatur lewat menu Pengaturan ▸ Sinkronisasi Google Sheets).

   Protokol (POST body = JSON string, text/plain agar tidak
   kena preflight CORS Apps Script):
     GET  ?action=rev|load|ping
     POST {action:'save',   baseRev, data}
     POST {action:'replace', data}
     POST {action:'wipe'}
   ========================================================= */

const Remote = {
  URL_KEY:'UO_REMOTE_URL',
  POLL_MS : 30000,
  GAP_MS  : 2500,           // jeda minimum antar-push agar hemat kuota
  _silent : false,          // true = jangan memicu push saat DB diganti dari server
  _ready  : false, _busy:false, _again:false, _dirty:false, _timer:null,
  _pollT  : null, _ok:null, _lastErr:'', _lastSent:0,

  get url(){ try{ return localStorage.getItem(this.URL_KEY)||''; }catch{ return ''; } },
  set url(v){ try{ v?localStorage.setItem(this.URL_KEY,v.trim()):localStorage.removeItem(this.URL_KEY);}catch{} },
  get on(){ return !!this.url; },
  get inExam(){ return typeof EXAM!=='undefined' && EXAM && EXAM.h && EXAM.h.status==='berlangsung'; },

  /* ---------- init ---------- */
  async init(){
    if(!this.on) return;
    try{
      const res = await this._req('GET','?action=load');
      if(res && res.ok){
        if(res.data){ this._applyServer(res.data,res.rev); toast('Tersambung ke Google Sheets ✔ · data server dimuat','success'); }
        else { toast('Server kosong. Unggah data awal lewat Pengaturan ▸ Sinkronisasi, atau data ini otomatis terunggah saat perubahan pertama.','info',6000); DB.rev=0; }
        this._ready=true; this._ok=true; this.chip();
        this._startPoll();
      }
    }catch(e){
      this._ok=false; this._lastErr=e.message; this.chip();
      toast('Mode server aktif, tetapi backend belum dapat dihubungi — memakai cache lokal.','warn',6000);
      this._ready=true; this._startPoll();   // tetap coba di belakang
    }
  },
  /* simpan lokal → apply tanpa memicu push balik */
  _applyServer(data,rev){
    this._silent=true;
    DB = data; DB.rev = rev ?? 0;
    saveDB();
    this._silent=false;
    this.chip();
    if(typeof view!=='undefined' && !document.getElementById('view').classList.contains('hidden') && !this.inExam){
      try{ go(RUTE_AKTIF); }catch{}
    }
  },

  /* ---------- push (debounce + throttle) ---------- */
  push(force=false){
    if(!this.on || !this._ready) return;
    this._dirty=true;
    clearTimeout(this._timer);
    const wait = force ? 150 : Math.max(400, this._lastSent+this.GAP_MS-Date.now());
    this._timer=setTimeout(()=>this._send(), wait);
  },
  async _send(){
    if(this._busy){ this._again=true; return; }
    if(!this._dirty) return;
    this._busy=true;
    try{
      const res = await this._req('POST','', {action:'save', baseRev:(DB.rev||0), data:DB});
      if(res && res.ok){
        DB.rev = res.rev;
        if(res.data){ this._silent=true; DB=res.data; DB.rev=res.rev;
          try{ localStorage.setItem(LS_KEY, JSON.stringify(DB)); }catch{}
          this._silent=false; }
        this._dirty=false; this._ok=true; this._lastErr='';
        this.chip();
        if(typeof view!=='undefined' && !document.getElementById('view').classList.contains('hidden') && !this.inExam){
          try{ go(RUTE_AKTIF); }catch{}
        }
      }else{
        this._fail((res&&res.error)||'Server menolak penyimpanan');
      }
    }catch(e){ this._fail(e.message||String(e)); }
    this._busy=false; this._lastSent=Date.now();
    if(this._again){ this._again=false; if(this._dirty) this.push(true); }
  },
  _fail(msg){
    this._ok=false; this._lastErr=msg; this.chip();
    toast('Sinkronisasi gagal: '+esc(msg)+' — perubahan disimpan lokal dulu','warn',6000);
    if(this._dirty) { clearTimeout(this._timer); this._timer=setTimeout(()=>this._send(), 12000); }
  },

  /* ---------- tombol manual di Pengaturan ---------- */
  async pullNow(){
    const res = await this._req('GET','?action=load');
    if(!res||!res.ok) throw new Error(res&&res.error||'respons tidak valid');
    if(!res.data) throw new Error('Server belum berisi data.');
    this._applyServer(res.data,res.rev);
    toast('Data terbaru ditarik dari server ✔','success');
    try{ go(RUTE_AKTIF); }catch{}
  },
  async pushNow(){
    DB.rev = DB.rev||0;
    const res = await this._req('POST','', {action:'replace', data:DB});
    if(!res||!res.ok) throw new Error(res&&res.error||'gagal');
    DB.rev=res.rev; saveDB(); this._ok=true; this.chip();
    toast('Seluruh data diunggah ke Google Sheets ✔ (rev '+res.rev+')','success');
  },

  /* ---------- polling perubahan ---------- */
  _startPoll(){
    clearInterval(this._pollT);
    this._pollT=setInterval(async()=>{
      if(!this.on) return;
      try{
        const res = await this._req('GET','?action=rev');
        if(res&&res.ok&&typeof res.rev==='number'&&res.rev!==(DB.rev||0)){
          if(this.inExam) return;              // jangan injak data saat siswa sedang ujian
          const full = await this._req('GET','?action=load');
          if(full&&full.ok&&full.data) this._applyServer(full.data, full.rev);
        }
      }catch{ /* offline — biarkan chip merah */ }
    }, this.POLL_MS);
  },
  stop(){ clearInterval(this._pollT); this._pollT=null; this._ok=null; },

  /* ---------- HTTP ---------- */
  async _req(method, query, body){
    const ctl = new AbortController();
    const to  = setTimeout(()=>ctl.abort(), 15000);
    try{
      const r = await fetch(this.url+query, {
        method, signal:ctl.signal,
        ...(body!==undefined ? {headers:{'Content-Type':'text/plain;charset=utf-8'}, method:'POST', body:JSON.stringify(body)} : {})
      });
      const txt = await r.text();
      try{ return JSON.parse(txt); }
      catch{ throw new Error('Respons bukan JSON (URL salah / akses deployment bukan "Anyone"). Cuplikan: '+txt.slice(0,120)); }
    }finally{ clearTimeout(to); }
  },

  /* ---------- chip status di sidebar ---------- */
  chip(){
    const el=document.getElementById('sync-chip');
    if(!el) return;
    if(!this.on){ el.style.display='none'; return; }
    el.style.display='';
    const st = this._ok===null?['sync','#64748b','menyiapkan…']
            : this._ok===false?['sync-off','#dc2626','terputus — data lokal']
            : (this._dirty?['sync-warn','#d97706','menunggu kirim…']:['sync-ok','#059669','tersinkron · rev '+(DB.rev||0)]);
    el.innerHTML = `<span class="sdot" style="background:${st[1]}"></span><span>${st[2]}</span>`;
    el.title = this._lastErr?('Error terakhir: '+this._lastErr):'Google Apps Script: '+this.url;
  }
};
