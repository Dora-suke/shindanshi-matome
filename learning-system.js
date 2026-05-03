/* ===== 学習システム埋め込みモジュール（Phase1+2） =====
 * 使用: 各HTMLファイルで以下のように設定して読み込む
 *
 * <script>
 *   window.LS_CONFIG = {
 *     KEY: 'ls_106_11_super1',
 *     TOPICS: [{id:'tx1_zero',name:'ゼロから',tab:0}, ...],
 *     CURIOSITY: { hook:'...', hint:'...' },
 *     PRETEST: [{q:'...', a:'...'}, ...]
 *   };
 * </script>
 * <script src="learning-system.js"></script>
 */
(function(){
  const C = window.LS_CONFIG;
  if(!C){console.error('LS_CONFIG not defined');return;}
  const STAGE_DAYS=[0,1,3,7,14,30];

  /* CSS injection */
  const CSS = `
.ls-panel{position:fixed;right:0;bottom:14px;z-index:200;background:#fff;border:2px solid #1a5276;border-right:none;border-radius:10px 0 0 10px;box-shadow:-3px 3px 12px rgba(0,0,0,.15);padding:.45rem .3rem;width:41px;font-size:.7rem;line-height:1.4;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Kaku Gothic ProN','Hiragino Sans',Meiryo,sans-serif}
.ls-rate-btns{display:flex;flex-direction:column;gap:.25rem;margin:.3rem 0}
.ls-rate-btn{position:relative;border:2px solid #d6eaf8;background:#fff;border-radius:6px;padding:.4rem 0;font-size:1rem;font-weight:700;cursor:pointer;transition:all .12s;font-family:inherit;width:100%}
.ls-rate-btn:hover{transform:scale(1.05);box-shadow:0 2px 6px rgba(0,0,0,.12)}
.ls-rate-btn.b-ok{color:#1e8449;border-color:#a9dfbf}
.ls-rate-btn.b-mid{color:#bf8200;border-color:#fad7a0}
.ls-rate-btn.b-ng{color:#922b21;border-color:#f5b7b1}
.ls-rate-btn.flash{background:#fef9e7;transform:scale(.9)}
.ls-rate-count{position:absolute;right:2px;bottom:0;font-size:.52rem;font-weight:700;line-height:1;pointer-events:none}
.ls-rate-btn.b-ok .ls-rate-count{color:#1e8449}
.ls-rate-btn.b-mid .ls-rate-count{color:#bf8200}
.ls-rate-btn.b-ng .ls-rate-count{color:#922b21}
.ls-status{font-size:.62rem;color:#2c3e50;margin-top:.3rem;line-height:1.5;text-align:center;border-top:1px solid #d6eaf8;padding-top:.3rem;font-weight:700}
.ls-status .ls-row{display:block;padding:1px 0}
.ls-status .ls-stage{color:#1a5276}
.ls-status .ls-streak{color:#1e8449}
.ls-status .ls-today{color:#bf6900}
.ls-status .ls-due{color:#5d6d7e;font-size:.55rem;font-weight:400;margin-top:.15rem}
.ls-status.flash{animation:lsFlash .35s ease}
@keyframes lsFlash{0%{background:#fff9c4}100%{background:transparent}}
.ls-undo-btn{display:block;width:100%;margin-top:.3rem;padding:.25rem 0;font-size:.6rem;font-weight:700;background:#f4f6f7;color:#5d6d7e;border:1px solid #aeb6bf;border-radius:5px;cursor:pointer;font-family:inherit}
.ls-undo-btn:hover:not(:disabled){background:#e8ecef;color:#922b21}
.ls-undo-btn:disabled{opacity:.35;cursor:not-allowed}
.ls-mask-btn{display:inline-block;margin:.4rem 0 .9rem;background:#1a5276;color:#fff;border:none;border-radius:6px;padding:.45rem .9rem;font-size:.78rem;font-weight:600;cursor:pointer;font-family:inherit;box-shadow:0 1px 3px rgba(0,0,0,.15)}
.ls-mask-btn.on{background:#922b21}
.tab-panel.ls-masked .ls-mask-btn ~ *:not(.section-title){opacity:.04;filter:blur(7px);pointer-events:none;transition:.2s}
.ls-curiosity{background:linear-gradient(135deg,#1a1a2e 0%,#2c2c54 100%);color:#fff;border-radius:12px;padding:1.1rem 1.3rem;margin:0 0 1.1rem;box-shadow:0 4px 14px rgba(0,0,0,.25);position:relative;overflow:hidden}
.ls-curiosity::before{content:"❓";position:absolute;right:.7rem;top:.5rem;font-size:2.5rem;opacity:.18}
.ls-curiosity .ls-cur-label{font-size:.7rem;letter-spacing:.2em;color:#ffd700;font-weight:700;margin-bottom:.4rem}
.ls-curiosity .ls-cur-q{font-size:1rem;font-weight:700;line-height:1.7}
.ls-curiosity .ls-cur-hint{font-size:.78rem;opacity:.8;margin-top:.5rem;font-style:italic}
.ls-pretest{background:#fff;border:2px solid #b08a3e;border-radius:12px;padding:1rem 1.2rem;margin:0 0 1.2rem;box-shadow:0 2px 12px rgba(0,0,0,.08)}
.ls-pretest h3{color:#1a5276;font-size:.95rem;margin-bottom:.4rem;border-bottom:2px dashed #fad7a0;padding-bottom:.3rem}
.ls-pretest .ls-pre-intro{font-size:.78rem;color:#5d6d7e;margin-bottom:.7rem;line-height:1.65}
.ls-pretest details{background:#fef9f3;border-left:3px solid #e67e22;border-radius:6px;padding:.5rem .75rem;margin:.4rem 0}
.ls-pretest details[open]{background:#fef2e0}
.ls-pretest summary{cursor:pointer;font-weight:700;font-size:.88rem;color:#2c3e50;padding:.2rem 0;list-style:none}
.ls-pretest summary::-webkit-details-marker{display:none}
.ls-pretest summary::before{content:"▶ ";color:#e67e22;font-size:.75rem;transition:transform .15s;display:inline-block}
.ls-pretest details[open] summary::before{transform:rotate(90deg)}
.ls-pretest .ls-pre-a{margin-top:.5rem;padding:.55rem .75rem;background:#fff;border-radius:5px;font-size:.85rem;line-height:1.7;color:#1e8449;border-left:3px solid #1e8449}
.ls-scheduler{background:#fff;border:2px solid #b08a3e;border-radius:10px;padding:1rem 1.2rem;margin:1rem auto;box-shadow:0 2px 12px rgba(0,0,0,.08);font-family:-apple-system,BlinkMacSystemFont,'Hiragino Kaku Gothic ProN','Hiragino Sans',Meiryo,sans-serif}
.ls-scheduler h3{color:#1a5276;font-size:1rem;margin-bottom:.6rem;border-bottom:2px solid #fad7a0;padding-bottom:.3rem}
.ls-sched-row{display:flex;justify-content:space-between;align-items:center;padding:.5rem .7rem;border-radius:6px;margin:.32rem 0;background:#f4f6f7;font-size:.85rem;flex-wrap:wrap;gap:.3rem}
.ls-sched-row.due-today{background:#fef2f2;border-left:4px solid #dc2626}
.ls-sched-row.due-soon{background:#fef9e7;border-left:4px solid #f39c12}
.ls-sched-row.due-future{background:#e8f5e9;border-left:4px solid #27ae60}
.ls-sched-row.threshold{background:linear-gradient(90deg,#fff9c4,#e8f5e9)}
.ls-sched-meta{font-size:.74rem;color:#5d6d7e}
.ls-export{margin-top:.7rem;display:flex;gap:.4rem;flex-wrap:wrap}
.ls-export button{font-size:.74rem;padding:.35rem .7rem;border:1px solid #aeb6bf;background:#fff;border-radius:5px;cursor:pointer;font-family:inherit}
.ls-export button:hover{background:#f4f6f7}
.ls-wrong-count{display:inline-block;background:#e74c3c;color:#fff;padding:1px 7px;border-radius:10px;font-size:.7rem;margin-left:.4rem;font-weight:700}
.ls-legend{font-size:.72rem;color:#7f8c8d;margin-top:.4rem;line-height:1.6}
.ls-fill-rate{display:inline-flex;gap:.3rem;margin-left:.6rem;vertical-align:middle}
.ls-fill-rate button{border:1.5px solid #d6eaf8;background:#fff;border-radius:5px;padding:.18rem .55rem;font-size:.82rem;font-weight:700;cursor:pointer;font-family:inherit;line-height:1;transition:transform .1s}
.ls-fill-rate button:hover{transform:scale(1.1)}
.ls-fill-rate .fr-ok{color:#1e8449;border-color:#a9dfbf}
.ls-fill-rate .fr-undo{color:#5d6d7e;border-color:#aeb6bf;font-size:.78rem}
.ls-fill-rate .fr-undo:disabled{opacity:.3;cursor:not-allowed}
.ls-fill-streak{display:inline-block;margin-left:.5rem;font-size:.7rem;color:#5d6d7e;font-weight:600}
.ls-fill-streak .ok2{color:#1e8449}
.fill-card.ls-mastered .fill-body{display:none}
.fill-card.ls-mastered .fill-header::after{content:" ✅マスター済";font-size:.75rem;font-weight:400;opacity:.85}
.ls-fill-show{display:inline-block;margin:.5rem 0 0;font-size:.78rem;color:#1a5276;background:#fff;border:1px dashed #1a5276;border-radius:5px;padding:.25rem .7rem;cursor:pointer;font-family:inherit}
.fill-card:not(.ls-mastered) .ls-fill-show{display:none}
.ls-sticky-wrap{position:sticky;top:0;z-index:101;background:#fff;box-shadow:0 2px 6px rgba(0,0,0,.08)}
.ls-sticky-wrap .tab-nav{box-shadow:none;position:static!important}
.ls-mgmt-header{background:#fffbf2;border-top:1px solid #d8cfbb;border-bottom:1px solid #b08a3e;padding:.4rem .7rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.4rem;font-size:.78rem;line-height:1.4;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Kaku Gothic ProN','Hiragino Sans',Meiryo,sans-serif}
.ls-mgmt-info{display:flex;align-items:center;flex-wrap:wrap;gap:.35rem}
.ls-mgmt-label{font-size:.68rem;color:#6b6558;letter-spacing:.05em;font-weight:700;background:#fff;padding:.12rem .5rem;border-radius:8px;border:1px solid #d8cfbb;flex-shrink:0}
.ls-mgmt-chips{display:flex;flex-wrap:wrap;gap:.25rem}
.ls-chip{display:inline-flex;align-items:center;gap:.25rem;background:#fff;border:1px solid #d8cfbb;padding:.15rem .5rem;border-radius:11px;font-size:.74rem;color:#1e2a55;cursor:pointer;text-decoration:none;transition:.12s;font-family:inherit}
.ls-chip:hover{border-color:#b08a3e;background:#fff8e1;transform:translateY(-1px)}
.ls-chip.due-today{background:#fef2f2;border-color:#dc2626;color:#922b21;font-weight:700}
.ls-chip.due-soon{background:#fef9e7;border-color:#f39c12;color:#bf6900;font-weight:700}
.ls-chip.threshold{background:#f1f5f9;border-color:#cbd5e1;color:#64748b;opacity:.7}
.ls-chip.threshold:hover{opacity:1}
.ls-chip.unrated{border-style:dashed;color:#94a3b8}
.ls-chip-num{font-weight:800;background:rgba(255,255,255,.7);padding:0 4px;border-radius:5px;font-size:.7rem}
.ls-mgmt-actions{display:flex;gap:.25rem;flex-shrink:0}
.ls-mgmt-actions button{font-size:.7rem;padding:.2rem .5rem;border:1px solid #d8cfbb;background:#fff;border-radius:4px;cursor:pointer;font-family:inherit;color:#5d6d7e}
.ls-mgmt-actions button:hover{background:#fff8e1;color:#1e2a55}
.ls-mgmt-actions button.home{background:#1a5276;color:#fff;border-color:#1a5276}
.ls-mgmt-actions button.home:hover{background:#2980b9}
details.ls-scheduler{padding:0;overflow:hidden}
details.ls-scheduler summary{cursor:pointer;padding:.7rem 1.2rem;list-style:none;color:#1a5276;font-size:.95rem;font-weight:700;background:#fffaf2;border-bottom:1px solid #fad7a0;user-select:none}
details.ls-scheduler summary::-webkit-details-marker{display:none}
details.ls-scheduler summary::before{content:"▶ ";font-size:.7rem;color:#b08a3e;transition:transform .15s;display:inline-block;margin-right:.4rem}
details.ls-scheduler[open] summary::before{transform:rotate(90deg)}
details.ls-scheduler summary:hover{background:#fff4e0}
details.ls-scheduler .ls-sched-body{padding:1rem 1.2rem}
@media(max-width:600px){
  .ls-panel{width:38px;font-size:.66rem;bottom:8px}
  .ls-rate-btn{padding:.35rem 0;font-size:.95rem}
  .ls-mgmt-header{padding:.35rem .5rem;font-size:.72rem;gap:.3rem}
  .ls-chip{font-size:.7rem;padding:.12rem .4rem}
  .ls-mgmt-label{font-size:.62rem;padding:.1rem .35rem}
}
`;
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);

  /* localStorage helpers */
  function load(){try{return JSON.parse(localStorage.getItem(C.KEY))||{topics:{},wrongQueue:[],fillCards:{}};}catch(e){return {topics:{},wrongQueue:[],fillCards:{}};}}
  function save(d){localStorage.setItem(C.KEY,JSON.stringify(d));}
  function today(){return new Date().toISOString().slice(0,10);}
  function addDays(d,n){const t=new Date(d);t.setDate(t.getDate()+n);return t.toISOString().slice(0,10);}

  function currentTopic(){
    const idx=Array.from(document.querySelectorAll('.tab-btn')).findIndex(b=>b.classList.contains('active'));
    return C.TOPICS.find(t=>t.tab===idx);
  }

  function refreshPanel(flash){
    const t=currentTopic();
    const panel=document.getElementById('lsPanel');
    if(!panel)return;
    if(!t){panel.style.display='none';return;}
    panel.style.display='block';
    const data=load();
    const r=data.topics[t.id];
    const setCnt=(id,n)=>{const e=document.getElementById(id);if(e)e.textContent=n;};
    const h=(r&&r.history)||[];
    setCnt('lsCntOk',h.filter(x=>x.rate==='ok').length);
    setCnt('lsCntMid',h.filter(x=>x.rate==='mid').length);
    setCnt('lsCntNg',h.filter(x=>x.rate==='ng').length);
    const status=document.getElementById('lsStatus');
    if(!r){status.innerHTML='<span class="ls-row">未</span>';}
    else {
      const todayCount=h.filter(x=>x.ts===today()).length;
      const totalCount=h.length;
      const threshold=(r.streak||0)>=3?'<span class="ls-row" style="color:#b08a3e">✅</span>':'';
      status.innerHTML=
        '<span class="ls-row ls-stage">S'+r.stage+'</span>'+
        '<span class="ls-row ls-streak">◯'+(r.streak||0)+'</span>'+
        '<span class="ls-row ls-today">今'+todayCount+'</span>'+
        '<span class="ls-row" style="color:#7f8c8d">累'+totalCount+'</span>'+
        threshold+
        '<span class="ls-due">→'+r.due.slice(5)+'</span>';
    }
    if(flash){status.classList.remove('flash');void status.offsetWidth;status.classList.add('flash');}
    const ub=document.getElementById('lsUndoBtn');
    if(ub)ub.disabled=!(r&&r.history&&r.history.length>0);
  }

  function rate(rateVal,ev){
    const t=currentTopic();if(!t)return;
    const data=load();
    const r=data.topics[t.id]||{stage:1,streak:0,history:[]};
    if(rateVal==='ok'){r.stage=Math.min(5,(r.stage||1)+1);r.streak=(r.streak||0)+1;}
    else if(rateVal==='mid'){r.streak=0;}
    else {r.stage=1;r.streak=0;}
    r.due=addDays(today(),STAGE_DAYS[r.stage]);
    r.history=(r.history||[]).concat([{ts:today(),rate:rateVal}]).slice(-30);
    data.topics[t.id]=r;
    save(data);
    if(ev&&ev.target){
      document.querySelectorAll('.ls-rate-btn').forEach(b=>b.classList.remove('flash'));
      ev.target.classList.add('flash');
      setTimeout(()=>ev.target.classList.remove('flash'),300);
    }
    refreshPanel(true);
    renderScheduler();
  }

  function replay(history){
    let stage=1,streak=0,due=today();
    (history||[]).forEach(h=>{
      if(h.rate==='ok'){stage=Math.min(5,stage+1);streak++;}
      else if(h.rate==='mid'){streak=0;}
      else {stage=1;streak=0;}
      due=addDays(h.ts,STAGE_DAYS[stage]);
    });
    return {stage,streak,due};
  }

  function undo(){
    const t=currentTopic();if(!t)return;
    const data=load();
    const r=data.topics[t.id];
    if(!r||!r.history||r.history.length===0)return;
    r.history.pop();
    if(r.history.length===0)delete data.topics[t.id];
    else {const s=replay(r.history);r.stage=s.stage;r.streak=s.streak;r.due=s.due;data.topics[t.id]=r;}
    save(data);refreshPanel(true);renderScheduler();
  }

  function togglePanel(){document.getElementById('lsPanel').classList.toggle('collapsed');}

  function toggleMask(btn,tabId){
    const p=document.getElementById(tabId);
    p.classList.toggle('ls-masked');
    const on=p.classList.contains('ls-masked');
    btn.textContent=on?'👁 本文を表示する':'📵 本文を隠して想起する';
    btn.classList.toggle('on',on);
  }

  function renderScheduler(){
    const list=document.getElementById('lsSchedList');if(!list)return;
    const data=load();
    const t=today();
    const rows=C.TOPICS.map(tp=>{
      const r=data.topics[tp.id];
      if(!r)return '<div class="ls-sched-row"><span>📗 '+tp.name+'</span><span class="ls-sched-meta">未評定</span></div>';
      let cls='due-future';
      if(r.due<=t)cls='due-today';
      else if(r.due<=addDays(t,2))cls='due-soon';
      if((r.streak||0)>=3)cls+=' threshold';
      const badge=(r.streak||0)>=3?' ✅閾値':'';
      return '<div class="ls-sched-row '+cls+'"><span>📗 '+tp.name+badge+'</span><span class="ls-sched-meta">Stage'+r.stage+'／次回 '+r.due+'／連続◯'+(r.streak||0)+'</span></div>';
    }).join('');
    const wq=(data.wrongQueue||[]).filter(w=>w.ts>=addDays(t,-3));
    const wqHtml=wq.length?'<div class="ls-sched-row due-today"><span>❌ 誤答キュー(直近3日)<span class="ls-wrong-count">'+wq.length+'</span></span><span class="ls-sched-meta">クイズタブで再挑戦</span></div>':'';
    list.innerHTML=rows+wqHtml;
    renderMgmtChips();
  }
  function renderMgmtChips(){
    const wrap=document.getElementById('lsMgmtChips');if(!wrap)return;
    const data=load();const t=today();
    const chips=C.TOPICS.map(tp=>{
      const r=data.topics[tp.id];
      let cls='unrated',mark='⚪',extra='';
      if(!r){cls='unrated';mark='⚪';}
      else if((r.streak||0)>=3){cls='threshold';mark='✅';}
      else if(r.due<=t){cls='due-today';mark='🔴';extra='<span class="ls-chip-num">S'+r.stage+'</span>';}
      else if(r.due<=addDays(t,3)){cls='due-soon';mark='🟡';extra='<span class="ls-chip-num">S'+r.stage+'</span>';}
      else {cls='';mark='🟢';extra='<span class="ls-chip-num">S'+r.stage+'</span>';}
      const idx=tp.tab;
      const tt=r?'Stage'+r.stage+'／次回'+r.due+'／連続◯'+(r.streak||0):'未評定';
      return '<a href="javascript:void(0)" onclick="window.switchTab('+idx+')" class="ls-chip '+cls+'" title="'+tp.name+' - '+tt+'">'+mark+' '+tp.name+extra+'</a>';
    }).join('');
    wrap.innerHTML=chips;
  }

  function exportData(){
    const blob=new Blob([JSON.stringify(load(),null,2)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);
    a.download=C.KEY+'_'+today()+'.json';a.click();
  }
  function importData(e){
    const f=e.target.files[0];if(!f)return;
    const r=new FileReader();r.onload=ev=>{
      try{save(JSON.parse(ev.target.result));refreshPanel();renderScheduler();fillInit();alert('インポート完了');}
      catch(err){alert('JSON解析失敗: '+err.message);}
    };r.readAsText(f);
  }
  function clearWrong(){if(!confirm('誤答キューをクリアしますか？'))return;const d=load();d.wrongQueue=[];save(d);renderScheduler();}
  function resetAll(){if(!confirm('このノートの学習記録をすべて削除しますか？'))return;localStorage.removeItem(C.KEY);refreshPanel();renderScheduler();document.querySelectorAll('.fill-card.ls-mastered').forEach(c=>c.classList.remove('ls-mastered'));document.querySelectorAll('.ls-fill-streak').forEach(s=>s.textContent='連続◯ 0回');}
  function logWrong(qText){const d=load();d.wrongQueue=(d.wrongQueue||[]).concat([{ts:today(),q:(qText||'').slice(0,50)}]).slice(-50);save(d);renderScheduler();}

  /* fill cards */
  function fillRecompute(history){let streak=0;for(let i=(history||[]).length-1;i>=0;i--){if(history[i].rate==='ok')streak++;else break;}return {streak,mastered:streak>=2};}
  function fillRefreshCard(cardId){
    const d=load();const f=(d.fillCards||{})[cardId];
    const card=document.querySelector('.fill-card[data-ls-id="'+cardId+'"]');
    if(!card)return;
    const streak=(f&&f.streak)||0;
    const mastered=!!(f&&f.mastered);
    const ind=card.querySelector('.ls-fill-streak');
    if(ind)ind.innerHTML=streak>=2?'<span class="ok2">✅2連続◯</span>':'連続◯ '+streak+'回';
    const undoBtn=card.querySelector('.fr-undo');
    if(undoBtn)undoBtn.disabled=!(f&&f.history&&f.history.length>0);
    card.classList.toggle('ls-mastered',mastered);
  }
  function fillRate(cardId,r,btnEl){
    const d=load();d.fillCards=d.fillCards||{};
    const f=d.fillCards[cardId]||{streak:0,history:[],mastered:false};
    f.history=(f.history||[]).concat([{ts:today(),rate:r}]).slice(-20);
    const rec=fillRecompute(f.history);f.streak=rec.streak;f.mastered=rec.mastered;
    d.fillCards[cardId]=f;save(d);
    if(btnEl){btnEl.style.transform='scale(.85)';setTimeout(()=>btnEl.style.transform='',180);}
    if(f.mastered)setTimeout(()=>fillRefreshCard(cardId),350);
    else fillRefreshCard(cardId);
  }
  function fillUndo(cardId,btnEl){
    const d=load();d.fillCards=d.fillCards||{};
    const f=d.fillCards[cardId];
    if(!f||!f.history||f.history.length===0)return;
    f.history.pop();
    const rec=fillRecompute(f.history);f.streak=rec.streak;f.mastered=rec.mastered;
    if(f.history.length===0)delete d.fillCards[cardId];else d.fillCards[cardId]=f;
    save(d);fillRefreshCard(cardId);
    if(btnEl){btnEl.style.transform='scale(.85)';setTimeout(()=>btnEl.style.transform='',180);}
  }
  function fillUnmask(cid){
    const d=load();if(d.fillCards&&d.fillCards[cid]){d.fillCards[cid].mastered=false;d.fillCards[cid].streak=0;save(d);}
    fillRefreshCard(cid);
  }
  function fillInit(){
    const data=load();const fc=data.fillCards||{};
    document.querySelectorAll('.fill-card').forEach(card=>{
      const tab=card.closest('.tab-panel');
      if(!tab)return;
      if(card.dataset.lsId)return;
      const idx=Array.from(tab.querySelectorAll('.fill-card')).indexOf(card);
      const cid=tab.id+'_card'+idx;
      card.dataset.lsId=cid;
      const body=card.querySelector('.fill-body');
      if(body&&!body.dataset.lsHooked){
        body.dataset.lsHooked='1';
        const initStreak=(fc[cid]&&fc[cid].streak)||0;
        const hasHist=!!(fc[cid]&&fc[cid].history&&fc[cid].history.length>0);
        const wrap=document.createElement('div');
        wrap.className='ls-fill-rate';
        wrap.style.cssText='margin-top:.7rem;padding-top:.55rem;border-top:1px dashed #d0d0d0;display:flex;align-items:center;flex-wrap:wrap;gap:.4rem';
        wrap.innerHTML=
          '<span style="font-size:.78rem;color:#5d6d7e;font-weight:600">このカードの評定:</span>'+
          '<button class="fr-ok"   onclick="window.lsFillRate_(\''+cid+'\',\'ok\',this)" title="完璧">◯</button>'+
          '<button class="fr-undo" onclick="window.lsFillUndo_(\''+cid+'\',this)" title="直前を取消" '+(hasHist?'':'disabled')+'>↶</button>'+
          '<span class="ls-fill-streak">'+(initStreak>=2?'<span class="ok2">✅2連続◯</span>':'連続◯ '+initStreak+'回')+'</span>';
        body.appendChild(wrap);
        const showBack=document.createElement('button');
        showBack.className='ls-fill-show';
        showBack.textContent='🔓 再表示する';
        showBack.onclick=()=>fillUnmask(cid);
        const header=card.querySelector('.fill-header');
        if(header)header.appendChild(showBack);
      }
      if(fc[cid]&&fc[cid].mastered)card.classList.add('ls-mastered');
    });
  }

  /* expose */
  window.lsRate_=rate;
  window.lsUndo_=undo;
  window.lsTogglePanel_=togglePanel;
  window.lsToggleMask_=toggleMask;
  window.lsExport_=exportData;
  window.lsImport_=importData;
  window.lsClearWrong_=clearWrong;
  window.lsResetAll_=resetAll;
  window.lsFillRate_=fillRate;
  window.lsFillUndo_=fillUndo;

  /* DOM injection */
  function init(){
    /* 1. side panel（トグルなし） */
    const panel=document.createElement('aside');
    panel.className='ls-panel';
    panel.id='lsPanel';
    panel.innerHTML=
      '<div class="ls-panel-body">'+
        '<div class="ls-rate-btns">'+
          '<button class="ls-rate-btn b-ok"  onclick="lsRate_(\'ok\',event)"  title="完璧">◯<span class="ls-rate-count" id="lsCntOk">0</span></button>'+
          '<button class="ls-rate-btn b-mid" onclick="lsRate_(\'mid\',event)" title="部分">△<span class="ls-rate-count" id="lsCntMid">0</span></button>'+
          '<button class="ls-rate-btn b-ng"  onclick="lsRate_(\'ng\',event)"  title="不正解">✗<span class="ls-rate-count" id="lsCntNg">0</span></button>'+
        '</div>'+
        '<div class="ls-status" id="lsStatus">未</div>'+
        '<button class="ls-undo-btn" id="lsUndoBtn" onclick="lsUndo_()">↶取消</button>'+
      '</div>';
    document.body.appendChild(panel);

    /* 1b. management header above tab-nav (sticky together) */
    const tabNav=document.querySelector('.tab-nav');
    if(tabNav){
      const wrap=document.createElement('div');
      wrap.className='ls-sticky-wrap';
      const mgmt=document.createElement('div');
      mgmt.className='ls-mgmt-header';
      mgmt.innerHTML=
        '<div class="ls-mgmt-info">'+
          '<span class="ls-mgmt-label">📅 今日</span>'+
          '<div class="ls-mgmt-chips" id="lsMgmtChips"><span style="font-size:.72rem;color:#94a3b8;font-style:italic">読み込み中…</span></div>'+
        '</div>'+
        '<div class="ls-mgmt-actions">'+
          '<button onclick="lsExport_()" title="このノートのデータをJSON出力">📥 出力</button>'+
          '<button onclick="document.getElementById(\'lsImportInput\').click()" title="JSONインポート">📤 取込</button>'+
          '<button class="home" onclick="window.open(\'../index.html\',\'_blank\')" title="まとめindexを別タブで開く">🏠 index</button>'+
        '</div>';
      tabNav.parentNode.insertBefore(wrap,tabNav);
      wrap.appendChild(mgmt);
      wrap.appendChild(tabNav);
      tabNav.classList.remove('tab-nav-sticky');
    }

    /* 2. mask buttons in topic tabs */
    C.TOPICS.forEach(t=>{
      const tab=document.getElementById('tab'+t.tab);
      if(!tab)return;
      const btn=document.createElement('button');
      btn.className='ls-mask-btn';
      btn.textContent='📵 本文を隠して想起する';
      btn.onclick=function(){toggleMask(this,'tab'+t.tab);};
      tab.insertBefore(btn,tab.firstChild);
    });

    /* 3. curiosity + pretest in leftmost topic tab */
    const leftmost=C.TOPICS.reduce((a,b)=>a.tab<b.tab?a:b);
    const leftTab=document.getElementById('tab'+leftmost.tab);
    if(leftTab&&C.CURIOSITY){
      const cur=document.createElement('div');
      cur.className='ls-curiosity';
      cur.innerHTML=
        '<div class="ls-cur-label">CURIOSITY HOOK</div>'+
        '<div class="ls-cur-q">'+C.CURIOSITY.hook+'</div>'+
        '<div class="ls-cur-hint">'+C.CURIOSITY.hint+'</div>';
      leftTab.insertBefore(cur,leftTab.firstChild);
    }
    if(leftTab&&C.PRETEST&&C.PRETEST.length){
      const pre=document.createElement('div');
      pre.className='ls-pretest';
      pre.innerHTML=
        '<h3>🧪 学習前クイズ（Pretesting）— 答えられなくてOK</h3>'+
        '<div class="ls-pre-intro">読む前にまず挑戦。誤答前提で、答えを<strong>知りたいと思う</strong>状態を作るのが目的（ドーパミン放出で記憶定着が向上）。</div>'+
        C.PRETEST.map(qa=>'<details><summary>'+qa.q+'</summary><div class="ls-pre-a">'+qa.a+'</div></details>').join('');
      const cur=leftTab.querySelector('.ls-curiosity');
      if(cur)cur.after(pre);else leftTab.insertBefore(pre,leftTab.firstChild);
    }

    /* 4. scheduler as collapsible details before footer */
    const sched=document.createElement('details');
    sched.className='ls-scheduler';
    sched.style.maxWidth='920px';
    sched.style.margin='1rem auto';
    sched.innerHTML=
      '<summary>📅 詳細・誤答・操作（クリックで展開）</summary>'+
      '<div class="ls-sched-body">'+
        '<div id="lsSchedList"></div>'+
        '<div class="ls-legend">Stage1=1日 → Stage2=3日 → Stage3=7日 → Stage4=14日 → Stage5=30日。連続◯3回で閾値到達。</div>'+
        '<div class="ls-export">'+
          '<button onclick="lsExport_()">📥 エクスポート(JSON)</button>'+
          '<button onclick="document.getElementById(\'lsImportInput\').click()">📤 インポート</button>'+
          '<input type="file" id="lsImportInput" accept=".json" style="display:none" onchange="lsImport_(event)">'+
          '<button onclick="lsClearWrong_()">誤答キューをクリア</button>'+
          '<button onclick="lsResetAll_()" style="color:#922b21">🔄 全リセット</button>'+
        '</div>'+
      '</div>';
    const footer=document.querySelector('.footer');
    if(footer&&footer.parentElement)footer.parentElement.insertBefore(sched,footer);
    else document.body.appendChild(sched);

    /* 5. hook ans */
    if(typeof window.ans==='function'){
      const orig=window.ans;
      window.ans=function(li,correct,exp){
        orig(li,correct,exp);
        if(!correct){const qBox=li.closest('.quiz-item');const qText=qBox?(qBox.querySelector('.quiz-question')?.textContent||''):'';logWrong(qText);}
      };
    }
    /* 6. hook switchTab */
    if(typeof window.switchTab==='function'){
      const orig=window.switchTab;
      window.switchTab=function(i){orig(i);setTimeout(()=>refreshPanel(),30);};
    }

    fillInit();
    refreshPanel();
    renderScheduler();
    selfRegister();
  }
  function selfRegister(){
    let reg={};
    try{reg=JSON.parse(localStorage.getItem('ls_registry'))||{};}catch(e){}
    const m=C.KEY.match(/^ls_(\d{3})/);
    const subject=m?m[1]:'unknown';
    const pathParts=window.location.pathname.split('/').filter(Boolean);
    const fileRel=pathParts.length>=2?decodeURIComponent(pathParts.slice(-2).join('/')):decodeURIComponent(pathParts.join('/'));
    reg[C.KEY]={
      subject,
      title:(C.META&&C.META.title)||(document.title.split(' - ')[0]||document.title),
      file:(C.META&&C.META.file)||fileRel,
      topics:C.TOPICS.map(t=>({id:t.id,name:t.name,tab:t.tab})),
      lastSeen:today()
    };
    localStorage.setItem('ls_registry',JSON.stringify(reg));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
