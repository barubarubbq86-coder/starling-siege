// Starling Siege: Pages edition. Enemy files are imported locally, never hosted.
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const color = ['#f2be79','#88dcb5','#a4b4f5','#e597c2','#b89a76','#f97f70'];
  const rarity = ['ノーマル','レア','激レア','超激レア'];
  const names = ['モチ','イワ','ピコ','ハリ','ランタン','カゼ','コロ','シダ','コバルト','スイセイ','ヌマ','クオーツ','オーロラ','メテオ','タイタン'];
  const roles = [
    {name:'バランス',hp:110,atk:26,speed:105,range:45,cost:110,interval:1.0},
    {name:'壁',hp:380,atk:11,speed:68,range:35,cost:100,interval:1.25},
    {name:'遠距離',hp:92,atk:43,speed:85,range:145,cost:180,interval:1.7},
    {name:'俊足',hp:75,atk:18,speed:165,range:36,cost:90,interval:.7},
    {name:'範囲',hp:160,atk:33,speed:82,range:90,cost:230,interval:1.6,area:true},
    {name:'重量',hp:510,atk:76,speed:60,range:48,cost:370,interval:2.1}
  ];
  const baseAllies = names.map((name,i) => ({
    name,hp:90+i*30,atk:13+i*7,speed:80+(i%4)*16,
    range:40+(i%5)*22,cost:60+i*38,rarity:Math.min(3,Math.floor(i/4)),
    interval:.8+(i%4)*.26,area:i===4||i===8||i>=12,color:color[i%6]
  }));

  // Indices stay fixed after publication; IDs and file names are not inferred from display names.
  const mobs = [
    [1,'M-01.png'],[2,'M-02.png'],[3,'M-03.png'],[4,'M-04.png'],
    [5,'M-05.png'],[6,'M-06.png'],[7,'M-07.png'],[8,'M-08.png'],
    [9,'M-09.png'],[10,'M-10.png'],[11,'M-11.png'],[12,'M-12.png'],
    [14,'M-14.png'],[15,'M-15.png'],[20,'M-20.png']
  ];
  const bosses = [[1,'B-1.png'],[4,'B-04.png'],[10,'B-10.png'],
    [15,'B-15.png'],[20,'B-20.png']];
  const enemies = [
    ...mobs.map(([rank,file]) => ({
      id:'M-'+String(rank).padStart(2,'0'),file,rank,type:'M',
      hp:85+rank*48,atk:9+rank*5,speed:78+rank*1.7,range:35+rank*1.5,
      interval:1.05,color:color[(rank+2)%6],size:48+Math.min(rank,20)*1.2
    })),
    ...bosses.map(([rank,file]) => ({
      id:'B-'+String(rank).padStart(2,'0'),file,rank,type:'B',
      hp:380+rank*122,atk:28+rank*9,speed:69+rank*.8,range:60+rank*2,
      interval:1.38,color:'#bd83d8',size:81+Math.min(rank,20)*1.6,area:rank>=15
    }))
  ];
  const baseStages = [
    ['草原の門',1,[0,1,2],15],['黄昏街道',1.17,[2,3,4],16],
    ['石壁要塞',1.3,[4,5,6],16],['深緑迷宮',1.46,[6,7,8],17],
    ['灰の頂',1.65,[8,9,10],17],['嵐の砦',1.85,[9,10,11],18],
    ['黒雲の城',2.08,[11,12,13],18],['夜の王城',2.35,[12,13,14],19]
  ].map(([name,diff,pool,boss],theme) => ({name,diff,pool,boss,theme:theme%6}));
  const stateKey = 'starlingSiege';
  const fresh = () => ({
    version:3,xp:0,cans:150,cleared:0,levels:Array(35).fill(1),
    plus:Array(35).fill(0),owned:[0,1,2,3,4],deck:[0,1,2,3,4],
    customChars:[],customStages:[],enemyNames:{},lastLogin:''
  });
  let state;
  try { state = {...fresh(),...JSON.parse(localStorage.getItem(stateKey)||'{}')}; }
  catch { state=fresh(); }
  const priorVersion=Number(state.version)||0;
  if (priorVersion<2) {
    // Convert stages from the oldest placeholder-enemy release.
    state.customStages = (Array.isArray(state.customStages)?state.customStages:[]).map(s => ({
      ...s,pool:(s.pool||[0]).map(n => Math.min(14,Math.round(n/21*14))),
      boss:15+Math.min(7,Math.round((s.boss||0)/21*7))
    }));
  }
  if (priorVersion<3) {
    // The previous release had eight boss slots. Preserve the nearest surviving rank.
    const oldRanks=[1,4,5,6,9,10,15,20],newRanks=[1,4,10,15,20];
    state.customStages=(Array.isArray(state.customStages)?state.customStages:[]).map(stage=>{
      const oldRank=oldRanks[Number(stage.boss)-15]||1;
      const newSlot=newRanks.reduce((best,rank,i)=>
        Math.abs(rank-oldRank)<Math.abs(newRanks[best]-oldRank)?i:best,0);
      return {...stage,boss:15+newSlot};
    });
    state.version=3;
  }
  state.customChars=Array.isArray(state.customChars)?state.customChars.slice(0,20):[];
  state.customStages=Array.isArray(state.customStages)?state.customStages.slice(0,20):[];
  state.owned=Array.isArray(state.owned)?[...new Set(state.owned.filter(n=>Number.isInteger(n)&&n>=0&&n<15+state.customChars.length))]:[0,1,2,3,4];
  if (!state.owned.length) state.owned=[0];
  state.deck=Array.isArray(state.deck)?[...new Set(state.deck.filter(n=>state.owned.includes(n)))].slice(0,8):[0,1,2,3,4];
  if (!state.deck.length) state.deck=[state.owned[0]];
  state.levels=Array.isArray(state.levels)?state.levels:Array(35).fill(1);
  state.plus=Array.isArray(state.plus)?state.plus:Array(35).fill(0);
  state.enemyNames=state.enemyNames&&typeof state.enemyNames==='object'?state.enemyNames:{};

  function save() {
    try { localStorage.setItem(stateKey,JSON.stringify(state)); wallet(); return true; }
    catch { $('homeLog').textContent='保存領域がいっぱいです。端末の空き容量を確認してください。'; return false; }
  }
  function wallet() {
    $('xp').textContent='XP '+Math.floor(state.xp);
    $('cans').textContent='★ '+Math.floor(state.cans);
  }
  const today=new Date().toLocaleDateString('sv-SE');
  if (state.lastLogin!==today) {
    state.lastLogin=today;state.cans+=10;save();
    $('homeLog').textContent='ログインボーナス：★10！';
  }
  function enemyName(i) { return state.enemyNames[enemies[i].id]||enemies[i].id; }
  function allies() {
    return baseAllies.concat(state.customChars.map(s => {
      const r=roles[Number.isInteger(s.role)&&roles[s.role]?s.role:0];
      return {...r,name:s.name||'バディ',rarity:1,color:color[s.color%6]||color[0],legacyImage:s.image||''};
    }));
  }
  function stages() { return baseStages.concat(state.customStages); }
  function log(message) { $('homeLog').textContent=message; }
  function page(id) {
    if (battle && id!=='battle') { battle=null;cancelAnimationFrame(frame); }
    document.querySelectorAll('.screen').forEach(el=>el.classList.toggle('show',el.id===id));
    if (id==='stages') renderStages();
    if (id==='squad') renderSquad();
    if (id==='roster') renderRoster();
    if (id==='workshop') refreshAllyTargets();
    wallet();
  }
  $('nav').addEventListener('click',e=>{const id=e.target.dataset.page;if(id)page(id);});
  $('quickPlay').onclick=()=>startBattle(0);

  // Browser-owned imported drawings live in IndexedDB, not in the hosted files.
  const art=new Map(), images=new Map(), enemyFallbacks=new Map();
  let database=null;
  function openDatabase() {
    return new Promise((resolve,reject)=>{
      const request=indexedDB.open('starlingSiegeArt',1);
      request.onupgradeneeded=()=>request.result.createObjectStore('art');
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
  }
  async function loadArt() {
    try {
      database=await openDatabase();
      const tx=database.transaction('art','readonly'),store=tx.objectStore('art');
      const entries=await new Promise((resolve,reject)=>{
        const req=store.openCursor(),items=[];
        req.onsuccess=()=>{const c=req.result;if(c){items.push([c.key,c.value]);c.continue();}else resolve(items);};
        req.onerror=()=>reject(req.error);
      });
      for (const [key,blob] of entries) art.set(key,blobImage(blob));
      renderSquad();
      renderStages();
      renderRoster();
      $('enemyImportStatus').textContent='この端末に保存済みの敵画像：'+enemies.filter(e=>art.has('enemy:'+e.id)).length+' / 20枚';
      const draft=art.get('paint:draft');
      if(draft){
        const restore=()=>paintContext.drawImage(draft,0,0,512,512);
        if(imageReady(draft))restore();
        else draft.addEventListener('load',restore,{once:true});
      }
    } catch { $('importStatus').textContent='このブラウザでは画像の保存を使えません。通常のブラウザで開いてください。'; }
  }
  function blobImage(blob) {
    const url=URL.createObjectURL(blob),img=new Image();
    img.src=url;img.onload=()=>{if ($('squad').classList.contains('show')) renderSquad();};
    img._localUrl=url;
    return img;
  }
  function putArt(key,blob) {
    if (!database) return Promise.reject(new Error('画像保存を利用できません'));
    return new Promise((resolve,reject)=>{
      const tx=database.transaction('art','readwrite');
      tx.objectStore('art').put(blob,key);
      tx.oncomplete=()=>{
        const previous=art.get(key);if(previous?._localUrl)URL.revokeObjectURL(previous._localUrl);
        art.set(key,blobImage(blob));resolve();
      };
      tx.onerror=()=>reject(tx.error);
    });
  }
  function removeArt(key) {
    if (!database) return Promise.reject(new Error('画像保存を利用できません'));
    return new Promise((resolve,reject)=>{
      const tx=database.transaction('art','readwrite');
      tx.objectStore('art').delete(key);
      tx.oncomplete=()=>{
        const old=art.get(key);if(old?._localUrl)URL.revokeObjectURL(old._localUrl);
        art.delete(key);resolve();
      };
      tx.onerror=()=>reject(tx.error);
    });
  }
  function getImage(source) {
    // Old saves contain locally uploaded data URLs; never treat an old URL as a network image.
    if (typeof source!=='string'||!/^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(source))return null;
    if (!images.has(source)) {const img=new Image();img.src=source;images.set(source,img);}
    return images.get(source);
  }
  function allyArt(i) {
    const saved=art.get('ally:'+i);
    if (saved) return saved;
    return i>=15?getImage(state.customChars[i-15]?.image||''):null;
  }
  // Twenty deterministic, original creatures keep all stages playable before import.
  function drawEnemyFallback(i) {
    const e=enemies[i],c=document.createElement('canvas');c.width=c.height=160;
    const g=c.getContext('2d');
    const palette=['#ee8e8c','#f2bf6e','#8ed6b9','#abaddf','#dba4cf','#8fc4e8'];
    const body=palette[(e.rank+i)%palette.length],boss=e.type==='B';
    g.lineWidth=5;g.strokeStyle='#243951';g.lineJoin='round';
    g.fillStyle='#304961';
    for(let n=0;n<3;n++){
      g.beginPath();g.ellipse(51+n*25,124,8,18,(n-1)*.35,0,7);g.fill();
    }
    if (i%3===0 || boss) {
      g.fillStyle=boss?'#ffe398':'#83c9b4';
      for(let n=0;n<(boss?5:3);n++){
        const x=47+n*19;
        g.beginPath();g.moveTo(x-10,70);g.lineTo(x-4,31-(n%2)*12);
        g.lineTo(x+11,70);g.closePath();g.fill();g.stroke();
      }
    } else if (i%3===1) {
      g.fillStyle=body;
      for(const x of [51,105]){
        g.beginPath();g.ellipse(x,56,13,27,(x===51?-.5:.5),0,7);g.fill();g.stroke();
      }
    }
    g.fillStyle=body;
    g.beginPath();
    if(i%4===1){g.moveTo(41,65);g.lineTo(119,64);g.lineTo(126,126);g.lineTo(43,124);g.closePath();}
    else if(i%4===2){g.moveTo(42,116);g.quadraticCurveTo(36,38,84,55);g.quadraticCurveTo(133,38,122,116);g.closePath();}
    else {g.ellipse(82,95,43+(i%3)*3,39,0,0,7);}
    g.fill();g.stroke();
    g.fillStyle=boss?'#623e79':'#fff3dc';
    g.beginPath();g.ellipse(57,83,12,14,0,0,7);g.fill();
    g.fillStyle='#202c42';g.beginPath();g.arc(53,82,5,0,7);g.fill();
    g.lineWidth=3;g.beginPath();g.moveTo(42,105);g.quadraticCurveTo(53,116,65,105);g.stroke();
    g.fillStyle=boss?'#ffe593':'#324a61';g.font='bold 22px sans-serif';
    g.textAlign='center';g.fillText(String(e.rank),96,111);
    if(boss){g.strokeStyle='#ffe593';g.lineWidth=3;g.beginPath();
      g.arc(83,92,51,-.8,1.1);g.stroke();}
    const image=new Image();image.src=c.toDataURL('image/png');return image;
  }
  function enemyArt(i) {
    const saved=art.get('enemy:'+enemies[i].id);
    if(saved)return saved;
    if(!enemyFallbacks.has(i))enemyFallbacks.set(i,drawEnemyFallback(i));
    return enemyFallbacks.get(i);
  }
  const artReady=loadArt();

  function renderStages() {
    const wrap=$('stageCards');wrap.replaceChildren();
    stages().forEach((stage,i)=>{
      const card=document.createElement('article');card.className='card stagecard';
      const title=document.createElement('h3');title.textContent=(i+1)+'. '+stage.name;
      const desc=document.createElement('p');
      desc.textContent='難易度 ×'+Number(stage.diff).toFixed(2)+' / ボス '+enemyName(stage.boss);
      const img=document.createElement('img');img.src=enemyArt(stage.boss).src;img.alt='';
      const button=document.createElement('button');button.textContent=i>state.cleared?'未解放':'出撃';
      button.disabled=i>state.cleared;button.onclick=()=>startBattle(i);
      card.append(title,img,desc,button);wrap.append(card);
    });
  }
  function renderSquad() {
    const wrap=$('allyCards'),list=allies();wrap.replaceChildren();
    state.owned.forEach(i=>{
      const a=list[i];if(!a)return;
      const lv=state.levels[i]||1,cost=50*lv*lv,card=document.createElement('article');
      card.className='card';
      const pic=allyArt(i);
      if (pic) {
        const im=document.createElement('img');im.src=pic.src;im.alt=a.name+'の画像';
        card.append(im);
      } else {
        const swatch=document.createElement('div');
        swatch.style.cssText='height:58px;border-radius:10px;background:'+a.color;
        card.append(swatch);
      }
      const title=document.createElement('h3');title.textContent=a.name+' Lv.'+lv+' +'+(state.plus[i]||0);
      const details=document.createElement('p');details.textContent='HP '+a.hp+' / 攻撃 '+a.atk+' / '+rarity[a.rarity];
      const equip=document.createElement('button');equip.textContent=state.deck.includes(i)?'編成から外す':'編成に入れる';
      equip.onclick=()=>{
        if (state.deck.includes(i)) {if(state.deck.length>1)state.deck=state.deck.filter(n=>n!==i);}
        else if(state.deck.length<8)state.deck.push(i);
        save();renderSquad();
      };
      const upgrade=document.createElement('button');upgrade.textContent='レベルUP '+cost+' XP';
      upgrade.disabled=state.xp<cost||lv>=30;
      upgrade.onclick=()=>{
        if(state.xp>=cost&&lv<30){state.xp-=cost;state.levels[i]=lv+1;save();renderSquad();}
      };
      card.append(title,details,equip,upgrade);wrap.append(card);
    });
  }
  function renderRoster() {
    const wrap=$('enemyRoster');wrap.replaceChildren();
    enemies.forEach((e,i)=>{
      const card=document.createElement('div');card.className='card';
      const img=document.createElement('img');img.src=enemyArt(i).src;img.alt=e.id+'の画像';
      const box=document.createElement('div'),label=document.createElement('label'),input=document.createElement('input');
      label.textContent=e.id+'（'+(e.type==='M'?'モブ':'ボス')+'）';
      input.value=enemyName(i);input.maxLength=24;input.setAttribute('aria-label',e.id+'の名前');
      input.onchange=()=>{
        const name=input.value.trim();
        if(name&&name!==e.id)state.enemyNames[e.id]=name;
        else delete state.enemyNames[e.id];
        input.value=enemyName(i);save();renderStageBuilder();
      };
      const choose=document.createElement('button');choose.textContent='画像を設定';
      const fileInput=document.createElement('input');fileInput.type='file';
      fileInput.accept='image/png,image/jpeg,image/webp';fileInput.className='hide';
      choose.onclick=()=>fileInput.click();
      fileInput.onchange=async()=>{
        const file=fileInput.files?.[0];if(!file)return;
        try{
          await artReady;await saveEnemyImage(file,i);
          $('enemyImportStatus').textContent=e.id+'に画像を設定しました（この端末だけ）。';
          renderRoster();renderStages();
        }catch(error){$('enemyImportStatus').textContent=e.id+'：'+error.message;}
      };
      const clear=document.createElement('button');clear.textContent='仮キャラに戻す';
      clear.disabled=!art.has('enemy:'+e.id);
      clear.onclick=async()=>{
        try{await artReady;await removeArt('enemy:'+e.id);
          $('enemyImportStatus').textContent=e.id+'を仮キャラに戻しました。';
          renderRoster();renderStages();
        }catch(error){$('enemyImportStatus').textContent=e.id+'：'+error.message;}
      };
      box.append(label,input,choose,clear,fileInput);card.append(img,box);wrap.append(card);
    });
  }
  // Decode and redraw user files: this strips metadata and limits stored image size.
  function saveEnemyImage(file,i) {
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>8*1024*1024)
      return Promise.reject(new Error('PNG・JPEG・WebPの8MB以下を選んでください。'));
    return new Promise((resolve,reject)=>{
      const url=URL.createObjectURL(file),image=new Image();
      image.onload=()=>{
        URL.revokeObjectURL(url);
        if(!image.naturalWidth||!image.naturalHeight||image.naturalWidth>4000||
          image.naturalHeight>4000||image.naturalWidth*image.naturalHeight>16_000_000){
          reject(new Error('画像は4000×4000以下にしてください。'));return;
        }
        try{
          const canvas=document.createElement('canvas');
          const scale=Math.min(1,512/Math.max(image.naturalWidth,image.naturalHeight));
          canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));
          canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
          canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
          canvas.toBlob(blob=>{
            if(!blob){reject(new Error('画像を変換できませんでした。'));return;}
            putArt('enemy:'+enemies[i].id,blob).then(resolve,reject);
          },'image/png');
        }catch(error){reject(error);}
      };
      image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('画像を読み込めませんでした。'));};
      image.src=url;
    });
  }
  $('enemyBatchUpload').onchange=async event=>{
    const files=[...(event.target.files||[])];event.target.value='';
    await artReady;
    let done=0;const skipped=[];
    for(const file of files){
      const match=/^([mb])[-_ ]?0*(\d+)\.(png|jpe?g|webp)$/i.exec(file.name);
      const index=match?enemies.findIndex(e=>e.type===match[1].toUpperCase()&&e.rank===Number(match[2])):-1;
      if(index<0){skipped.push(file.name+'（名前不一致）');continue;}
      try{await saveEnemyImage(file,index);done++;}
      catch(error){skipped.push(file.name+'（'+error.message+'）');}
    }
    renderRoster();renderStages();
    $('enemyImportStatus').textContent=done+'枚を保存しました。'+(skipped.length?' 対象外：'+skipped.join('、'):'');
  };
  function pull(premium) {
    const cost=premium?100:30;if(state.cans<cost){$('gachaLog').textContent='星缶が足りません';return;}
    state.cans-=cost;
    const roll=Math.random();
    const level=premium?(roll<.13?3:roll<.45?2:roll<.9?1:0)
      :(roll<.02?3:roll<.1?2:roll<.35?1:0);
    const choices=baseAllies.map((a,i)=>[a,i]).filter(([a])=>a.rarity===level);
    const i=choices[Math.floor(Math.random()*choices.length)][1];
    if(state.owned.includes(i)){state.plus[i]=(state.plus[i]||0)+1;$('gachaLog').textContent=baseAllies[i].name+'：重複で+1';}
    else{state.owned.push(i);$('gachaLog').textContent='新しい仲間：'+baseAllies[i].name+'！';}
    save();
  }
  $('pull30').onclick=()=>pull(false);$('pull100').onclick=()=>pull(true);

  const cp={head:0,body:0,mark:0,color:0,role:0};
  const options={
    head:['まる','トゲ','しかく','耳','王冠'],body:['まる','しかく','たて長','よこ長'],
    mark:['★','○','Z','V','☾','なし'],color:['夕日','若葉','空','桜','土','炎'],
    role:roles.map(r=>r.name)
  };
  const labels={head:'頭',body:'胴体',mark:'飾り',color:'色',role:'役割'};
  function stepper(parent,label,value,back,forward) {
    const el=document.createElement('div');el.className='control';
    const l=document.createElement('label');l.textContent=label;
    const row=document.createElement('div');row.className='stepper';
    const left=document.createElement('button');left.textContent='◀';left.onclick=back;
    const middle=document.createElement('span');middle.textContent=value;
    const right=document.createElement('button');right.textContent='▶';right.onclick=forward;
    row.append(left,middle,right);el.append(l,row);parent.append(el);
  }
  function renderChar() {
    const wrap=$('partControls');wrap.replaceChildren();
    for (const key of Object.keys(options)) {
      stepper(wrap,labels[key],options[key][cp[key]],
        ()=>{cp[key]=(cp[key]-1+options[key].length)%options[key].length;renderChar();},
        ()=>{cp[key]=(cp[key]+1)%options[key].length;renderChar();});
    }
    const creature=$('creaturePreview');
    creature.className='custom-creature '+(['','square','tall','wide'][cp.body]||'')+(cp.head===3?' ears':'');
    creature.style.background=color[cp.color];
    creature.querySelector('.mark').textContent=cp.mark===5?'':options.mark[cp.mark];
    const r=roles[cp.role];
    $('roleStats').textContent='HP '+r.hp+'　攻撃 '+r.atk+'　速さ '+r.speed+'　射程 '+r.range;
    refreshAllyTargets();
  }
  function createCharacter() {
    if(state.customChars.length>=20){$('importStatus').textContent='自作キャラは20体までです';return null;}
    const number=state.customChars.length,idx=15+number;
    state.customChars.push({...cp,name:'バディ'+(number+1)});
    state.owned.push(idx);
    if(state.deck.length<8)state.deck.push(idx);
    save();refreshAllyTargets();
    return idx;
  }
  $('createChar').onclick=()=>{
    const i=createCharacter();
    if(i!==null){log('バディ'+(i-14)+'を作りました');page('squad');}
  };

  const sp={difficulty:0,boss:15,theme:0,pool:[0,1,2]};
  function renderStageBuilder() {
    const wrap=$('stageControls');wrap.replaceChildren();
    for(const [key,label,max] of [['difficulty','難易度',6],['boss','ボス',5],['theme','背景色',6]]) {
      const shown=key==='boss'?enemyName(sp.boss):String(sp[key]+1);
      stepper(wrap,label,shown,
        ()=>{sp[key]=key==='boss'?15+(sp.boss-15+4)%5:(sp[key]-1+max)%max;renderStageBuilder();},
        ()=>{sp[key]=key==='boss'?15+(sp.boss-15+1)%5:(sp[key]+1)%max;renderStageBuilder();});
    }
    $('stagePreview').style.background='radial-gradient(circle,'+color[sp.theme]+',#0e192a 70%)';
    $('stageSummary').textContent='難易度 '+(sp.difficulty+1)+'・敵'+sp.pool.length+'種・ボス '+enemyName(sp.boss);
    const grid=$('enemyGrid');grid.replaceChildren();
    mobs.forEach((_,i)=>{
      const button=document.createElement('button');button.textContent=enemyName(i);
      if(sp.pool.includes(i))button.classList.add('active');
      button.onclick=()=>{
        if(sp.pool.includes(i)){if(sp.pool.length>1)sp.pool=sp.pool.filter(n=>n!==i);}
        else if(sp.pool.length<8)sp.pool.push(i);
        renderStageBuilder();
      };
      grid.append(button);
    });
  }
  $('createStage').onclick=()=>{
    if(state.customStages.length>=20){$('stageSummary').textContent='自作ステージは20個までです';return;}
    const n=state.customStages.length+1;
    state.customStages.push({
      name:'工房ステージ'+n,diff:1+sp.difficulty*.35,
      boss:sp.boss,theme:sp.theme,pool:[...sp.pool]
    });
    save();log('工房ステージ'+n+'を作りました');page('stages');
  };
  function selectTab(tab) {
    const character=tab==='character';
    $('charBuilder').classList.toggle('hide',!character);
    $('stageBuilder').classList.toggle('hide',character);
    $('importPanel').classList.toggle('hide',!character);
    $('charTab').classList.toggle('active',character);
    $('stageTab').classList.toggle('active',!character);
    if(!character)renderStageBuilder();
  }
  $('charTab').onclick=()=>selectTab('character');
  $('stageTab').onclick=()=>selectTab('stage');
  renderChar();renderStageBuilder();

  function refreshAllyTargets() {
    for(const target of [$('allyTarget'),$('paintTarget')]){
      const selected=target.value;target.replaceChildren();
      const newOne=document.createElement('option');newOne.value='new';
      newOne.textContent='新しいキャラとして作る';target.append(newOne);
      allies().forEach((a,i)=>{
        const option=document.createElement('option');option.value=String(i);
        option.textContent=a.name+'（'+(state.owned.includes(i)?'所持':'未所持')+'）';
        target.append(option);
      });
      target.value=[...target.options].some(o=>o.value===selected)?selected:'new';
    }
  }

  // Chroma-key only background-connected green pixels to preserve isolated green details.
  let uploadedImage=null,processed=false;
  function isGreen(data,p,threshold) {
    const r=data[p],g=data[p+1],b=data[p+2],a=data[p+3];
    return a>8&&g>48&&(g-Math.max(r,b))/255>threshold;
  }
  function processGreen() {
    if(!uploadedImage)return;
    const image=uploadedImage,source=document.createElement('canvas');
    const scale=Math.min(1,640/Math.max(image.naturalWidth,image.naturalHeight));
    source.width=Math.max(1,Math.round(image.naturalWidth*scale));
    source.height=Math.max(1,Math.round(image.naturalHeight*scale));
    const sc=source.getContext('2d',{willReadFrequently:true});
    sc.drawImage(image,0,0,source.width,source.height);
    const pixels=sc.getImageData(0,0,source.width,source.height);
    const d=pixels.data,w=source.width,h=source.height,n=w*h;
    const strength=Number($('greenStrength').value)/100;
    const threshold=.31-strength*.28;
    const visited=new Uint8Array(n),queue=new Int32Array(n);
    let tail=0,head=0;
    function push(pos) {
      if(pos<0||pos>=n||visited[pos])return;
      if(!isGreen(d,pos*4,threshold))return;
      visited[pos]=1;queue[tail++]=pos;
    }
    for(let x=0;x<w;x++){push(x);push((h-1)*w+x);}
    for(let y=0;y<h;y++){push(y*w);push(y*w+w-1);}
    while(head<tail){
      const pos=queue[head++],x=pos%w;
      if(x>0)push(pos-1);if(x<w-1)push(pos+1);
      if(pos>=w)push(pos-w);if(pos<n-w)push(pos+w);
    }
    for(let i=0;i<n;i++){
      const p=i*4;if(visited[i]){d[p+3]=0;continue;}
      // Fade a one-pixel green fringe where drawing meets the backdrop.
      if(d[p+3]&&isGreen(d,p,threshold*.48)){
        const x=i%w,near=(x>0&&visited[i-1])||(x<w-1&&visited[i+1])||
          (i>=w&&visited[i-w])||(i<n-w&&visited[i+w]);
        if(near)d[p+3]=Math.round(d[p+3]*.28);
      }
    }
    sc.putImageData(pixels,0,0);
    let minX=w,minY=h,maxX=-1,maxY=-1;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      if(d[(y*w+x)*4+3]>12){
        minX=Math.min(minX,x);maxX=Math.max(maxX,x);
        minY=Math.min(minY,y);maxY=Math.max(maxY,y);
      }
    }
    const preview=$('chromaPreview'),pc=preview.getContext('2d');
    pc.clearRect(0,0,320,320);processed=false;$('applyArt').disabled=true;
    if(maxX<0){$('importStatus').textContent='全体が消えました。除去強度を下げてください。';return;}
    const sw=maxX-minX+1,sh=maxY-minY+1,ratio=Math.min(280/sw,280/sh);
    const dw=sw*ratio,dh=sh*ratio;
    pc.drawImage(source,minX,minY,sw,sh,(320-dw)/2,(320-dh)/2,dw,dh);
    processed=true;$('applyArt').disabled=!database;
    $('importStatus').textContent='プレビューを確認し、よければ「適用」を押してください。';
  }
  $('drawUpload').onchange=e=>{
    const file=e.target.files?.[0];
    if(!file)return;
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>8*1024*1024){
      $('importStatus').textContent='PNG・JPEG・WebPの8MB以下の画像を選んでください。';return;
    }
    const url=URL.createObjectURL(file),image=new Image();
    image.onload=()=>{
      URL.revokeObjectURL(url);
      if(image.naturalWidth>4000||image.naturalHeight>4000||
         image.naturalWidth*image.naturalHeight>16_000_000){
        $('importStatus').textContent='画像が大きすぎます。4000×4000以下にしてください。';return;
      }
      uploadedImage=image;processGreen();
    };
    image.onerror=()=>{URL.revokeObjectURL(url);$('importStatus').textContent='画像を読み込めませんでした。';};
    image.src=url;
  };
  $('greenStrength').oninput=()=>{
    $('strengthValue').textContent=$('greenStrength').value;
    if(uploadedImage)processGreen();
  };
  $('applyArt').onclick=async()=>{
    if(!processed||!database)return;
    const blob=await new Promise(resolve=>$('chromaPreview').toBlob(resolve,'image/png'));
    if(!blob){$('importStatus').textContent='画像処理に失敗しました。';return;}
    try{
      const index=await saveCharacterArt(blob,$('allyTarget').value);
      $('importStatus').textContent=allies()[index].name+'の手描き画像を保存しました。';
      renderSquad();
    }catch{
      $('importStatus').textContent='画像を保存できませんでした。ブラウザの空き容量を確認してください。';
    }
  };
  async function saveCharacterArt(blob,target){
    if(!blob||!database)throw new Error('保存できません');
    const isNew=target==='new';
    if(isNew&&state.customChars.length>=20)throw new Error('キャラ数の上限');
    const index=isNew?15+state.customChars.length:Number(target);
    if(!Number.isInteger(index)||index<0||index>=allies().length+(isNew?1:0))
      throw new Error('適用先が不正');
    await putArt('ally:'+index,blob);
    if(isNew)createCharacter();
    return index;
  }

  // One-sheet drawing desk: pen, eraser, palette, history, and a transparent canvas.
  const paintCanvas=$('paintCanvas'),paintContext=paintCanvas.getContext('2d',{willReadFrequently:true});
  const paintColors=['#222b36','#f8f7ed','#ec515e','#ffb347','#f8dc58','#63c489','#51a5e6','#9a73c8'];
  let paintColor=paintColors[0],tool='pen',stroke=null,draftTimer=0;
  const undoHistory=[],redoHistory=[];
  function paintControls(){
    $('undoPaint').disabled=undoHistory.length===0;
    $('redoPaint').disabled=redoHistory.length===0;
    $('penTool').classList.toggle('active',tool==='pen');
    $('eraserTool').classList.toggle('active',tool==='eraser');
    $('penTool').setAttribute('aria-pressed',String(tool==='pen'));
    $('eraserTool').setAttribute('aria-pressed',String(tool==='eraser'));
    [...$('paintPalette').children].forEach(b=>b.classList.toggle('active',b.dataset.paint===paintColor));
  }
  function remember(){
    undoHistory.push(paintContext.getImageData(0,0,512,512));
    if(undoHistory.length>15)undoHistory.shift();
    redoHistory.length=0;paintControls();
  }
  function saveDraftSoon(){
    clearTimeout(draftTimer);
    draftTimer=setTimeout(()=>{
      if(!database)return;
      paintCanvas.toBlob(blob=>{if(blob)putArt('paint:draft',blob).catch(()=>{});},'image/png');
    },350);
  }
  function canvasPoint(e){
    const rect=paintCanvas.getBoundingClientRect();
    return {x:(e.clientX-rect.left)*512/rect.width,y:(e.clientY-rect.top)*512/rect.height};
  }
  function paintLine(from,to,pressure=1){
    paintContext.save();
    paintContext.globalCompositeOperation=tool==='eraser'?'destination-out':'source-over';
    paintContext.strokeStyle=tool==='eraser'?'#000':paintColor;
    paintContext.fillStyle=tool==='eraser'?'#000':paintColor;
    paintContext.lineWidth=Number($('brushSize').value)*(tool==='eraser'?1.5:pressure);
    paintContext.lineCap='round';paintContext.lineJoin='round';
    paintContext.beginPath();paintContext.moveTo(from.x,from.y);
    paintContext.lineTo(to.x,to.y);paintContext.stroke();
    if(from.x===to.x&&from.y===to.y){
      paintContext.beginPath();
      paintContext.arc(to.x,to.y,paintContext.lineWidth/2,0,Math.PI*2);paintContext.fill();
    }
    paintContext.restore();
  }
  paintCanvas.onpointerdown=e=>{
    e.preventDefault();paintCanvas.setPointerCapture(e.pointerId);
    remember();const point=canvasPoint(e);stroke={id:e.pointerId,last:point};
    paintLine(point,point,e.pointerType==='pen'?Math.max(.45,e.pressure):1);
  };
  paintCanvas.onpointermove=e=>{
    if(!stroke||e.pointerId!==stroke.id)return;
    e.preventDefault();const point=canvasPoint(e);
    paintLine(stroke.last,point,e.pointerType==='pen'?Math.max(.45,e.pressure):1);
    stroke.last=point;
  };
  function stopStroke(e){
    if(!stroke||e.pointerId!==stroke.id)return;
    stroke=null;saveDraftSoon();
  }
  paintCanvas.onpointerup=stopStroke;paintCanvas.onpointercancel=stopStroke;
  $('penTool').onclick=()=>{tool='pen';paintControls();};
  $('eraserTool').onclick=()=>{tool='eraser';paintControls();};
  $('brushSize').oninput=()=>$('brushValue').textContent=$('brushSize').value;
  $('undoPaint').onclick=()=>{
    if(!undoHistory.length)return;
    redoHistory.push(paintContext.getImageData(0,0,512,512));
    paintContext.putImageData(undoHistory.pop(),0,0);
    paintControls();saveDraftSoon();
  };
  $('redoPaint').onclick=()=>{
    if(!redoHistory.length)return;
    undoHistory.push(paintContext.getImageData(0,0,512,512));
    paintContext.putImageData(redoHistory.pop(),0,0);
    paintControls();saveDraftSoon();
  };
  $('clearPaint').onclick=()=>{
    if(!confirm('キャンバスの絵を全部消しますか？'))return;
    remember();paintContext.clearRect(0,0,512,512);saveDraftSoon();
  };
  const palette=$('paintPalette');
  paintColors.forEach(value=>{
    const button=document.createElement('button');button.className='paint-swatch';
    button.dataset.paint=value;button.style.background=value;button.title='色 '+value;
    button.setAttribute('aria-label','色 '+value);
    button.onclick=()=>{paintColor=value;tool='pen';$('customColor').value=value;paintControls();};
    palette.append(button);
  });
  $('customColor').oninput=e=>{paintColor=e.target.value;tool='pen';paintControls();};
  function paintedBlob(){
    const data=paintContext.getImageData(0,0,512,512).data;
    let minX=512,minY=512,maxX=-1,maxY=-1;
    for(let y=0;y<512;y++)for(let x=0;x<512;x++){
      if(data[(y*512+x)*4+3]>10){
        minX=Math.min(minX,x);maxX=Math.max(maxX,x);
        minY=Math.min(minY,y);maxY=Math.max(maxY,y);
      }
    }
    if(maxX<0)return Promise.resolve(null);
    const output=document.createElement('canvas');output.width=320;output.height=320;
    const sw=maxX-minX+1,sh=maxY-minY+1,scale=Math.min(280/sw,280/sh);
    const dw=sw*scale,dh=sh*scale;
    output.getContext('2d').drawImage(paintCanvas,minX,minY,sw,sh,(320-dw)/2,(320-dh)/2,dw,dh);
    return new Promise(resolve=>output.toBlob(resolve,'image/png'));
  }
  $('savePaint').onclick=async()=>{
    const blob=await paintedBlob();
    if(!blob){$('paintStatus').textContent='まず絵を描いてください。';return;}
    try{
      const index=await saveCharacterArt(blob,$('paintTarget').value);
      $('paintStatus').textContent=allies()[index].name+'に絵を設定しました！';
      renderSquad();
    }catch{
      $('paintStatus').textContent='画像を保存できませんでした。端末の空き容量を確認してください。';
    }
  };
  $('openPaint').onclick=()=>page('paint');
  paintControls();

  // Battle: 2200-unit world, with a drag-controlled 1100-unit camera.
  const canvas=$('game'),ctx=canvas.getContext('2d');
  const WORLD=2200,VIEW=1100,GROUND=412,STAGGER_TIME=.74;
  let battle=null,frame=0,last=0,camera=0,drag=null;
  function startBattle(index) {
    const stage=stages()[index];if(!stage||index>state.cleared)return;
    cancelAnimationFrame(frame);camera=0;
    battle={
      index,stage,money:150,cap:1000,worker:1,home:1250,homeMax:1250,
      enemy:Math.round(900*stage.diff),enemyMax:Math.round(900*stage.diff),
      units:[],spawn:2.3,time:0,bossSpawned:false,result:null,cool:{}
    };
    $('worker').textContent='働き手 Lv.1';
    $('battleTitle').textContent=stage.name;
    buildUnitButtons();
    page('battle');
    last=performance.now();frame=requestAnimationFrame(loop);
  }
  function buildUnitButtons() {
    const box=$('unitButtons');box.replaceChildren();
    const list=allies();
    state.deck.forEach((i,slot)=>{
      const a=list[i],b=document.createElement('button');
      b.className='unitbtn';b.dataset.slot=slot;
      b.textContent=a.name+' ';
      const cost=document.createElement('small');cost.textContent=a.cost+'円';b.append(cost);
      b.onclick=()=>spawnAlly(i,slot);
      box.append(b);
    });
  }
  function spawnAlly(i,slot) {
    if(!battle||battle.result)return;
    const a=allies()[i];if(!a||battle.money<a.cost||battle.cool[slot]>0)return;
    battle.money-=a.cost;
    battle.cool[slot]=Math.max(2,2.2+a.cost/190);
    const level=(state.levels[i]||1)+(state.plus[i]||0)-1;
    const max=Math.round(a.hp*(1+.085*level));
    battle.units.push({
      a,x:105,hp:max,max,ally:true,allyId:i,
      cd:0,hit:0,attackAnim:0,staggerLeft:0,staggerBank:0
    });
  }
  function spawnEnemy(i) {
    const a=enemies[i];if(!a)return;
    const max=Math.round(a.hp*battle.stage.diff);
    battle.units.push({
      a,x:WORLD-105,hp:max,max,ally:false,enemyId:i,
      cd:0,hit:0,attackAnim:0,staggerLeft:0,staggerBank:0
    });
  }
  $('worker').onclick=()=>{
    if(!battle||battle.result)return;
    const cost=100*battle.worker;
    if(battle.worker<8&&battle.money>=cost){
      battle.money-=cost;battle.worker++;battle.cap+=500;
      $('worker').textContent='働き手 Lv.'+battle.worker;
    }
  };
  $('retreat').onclick=()=>endBattle(false);
  function damageUnit(target,amount) {
    const actual=Math.min(target.hp,amount);
    target.hp-=actual;target.hit=.13;
    target.staggerBank+=actual;
    const threshold=target.max*.2;
    if(target.hp>0&&target.staggerBank+1e-6>=threshold){
      target.staggerBank%=threshold;
      target.staggerLeft=STAGGER_TIME; // Tilt and bounce twice for either team.
    }
  }
  function update(dt) {
    const b=battle;if(!b||b.result)return;
    b.time+=dt;
    b.money=Math.min(b.cap,b.money+(28+15*b.worker)*dt);
    for(const key of Object.keys(b.cool))b.cool[key]=Math.max(0,b.cool[key]-dt);
    b.spawn-=dt;
    if(b.spawn<=0){
      spawnEnemy(b.stage.pool[Math.floor(Math.random()*b.stage.pool.length)]);
      b.spawn=Math.max(1.5,4.4-b.index*.28)*(.8+Math.random()*.4);
    }
    if(!b.bossSpawned&&(b.time>=31||b.enemy<=b.enemyMax*.58)){
      spawnEnemy(b.stage.boss);b.bossSpawned=true;
    }
    for(const u of b.units) {
      if(u.hp<=0)continue;
      u.cd=Math.max(0,u.cd-dt);u.hit=Math.max(0,u.hit-dt);
      u.attackAnim=Math.max(0,u.attackAnim-dt);
      u.staggerLeft=Math.max(0,u.staggerLeft-dt);
      const direction=u.ally?1:-1,castle=u.ally?WORLD-105:105;
      const foes=b.units.filter(v=>v.ally!==u.ally&&v.hp>0&&direction*(v.x-u.x)>=-9);
      let target=null,dist=Infinity;
      for(const v of foes){const gap=Math.abs(v.x-u.x);if(gap<dist){dist=gap;target=v;}}
      const goal=target?target.x:castle;
      const distance=Math.abs(goal-u.x),reach=u.a.range+18;
      if(distance<=reach){
        if(u.cd<=0){
          u.cd=u.a.interval||1.1;u.attackAnim=.24;
          const level=u.ally?(state.levels[u.allyId]||1)+(state.plus[u.allyId]||0)-1:0;
          const power=u.a.atk*(u.ally?1+.085*level:b.stage.diff);
          if(target){
            const victims=u.a.area?foes.filter(v=>Math.abs(v.x-u.x)<=reach+25):[target];
            victims.forEach(v=>damageUnit(v,power));
          }else if(u.ally)b.enemy-=power;
          else b.home-=power;
        }
      }else{
        const step=Math.min(u.a.speed*dt,Math.max(0,distance-reach));
        u.x+=direction*step;
      }
    }
    b.units=b.units.filter(u=>u.hp>0);
    if(b.enemy<=0)endBattle(true);
    else if(b.home<=0)endBattle(false);
  }
  function endBattle(win) {
    const b=battle;if(!b||b.result)return;
    b.result=win?'勝利！':'敗北…';
    if(win){
      const xp=110+b.index*65,stars=20+(b.index>=state.cleared?25:0);
      state.xp+=xp;state.cans+=stars;
      state.cleared=Math.max(state.cleared,b.index+1);
      log('勝利！ XP'+xp+'・★'+stars+'を獲得');
    }else{state.xp+=25;log('敗北。XP25を獲得');}
    save();
    const ended=b;
    setTimeout(()=>{
      if(battle===ended){
        battle=null;cancelAnimationFrame(frame);
        page('stages');
      }
    },1700);
  }
  function imageReady(img){return img&&img.complete&&img.naturalWidth>0;}
  function renderCastle(x,hp,max,label,tint) {
    const px=(x-camera)*canvas.width/VIEW;
    if(px<-90||px>canvas.width+90)return;
    ctx.fillStyle=tint;ctx.fillRect(px-34,GROUND-103,68,103);
    ctx.fillStyle='#f6d590';
    ctx.beginPath();ctx.moveTo(px-42,GROUND-103);ctx.lineTo(px,GROUND-140);
    ctx.lineTo(px+42,GROUND-103);ctx.fill();
    ctx.fillStyle='#182c45';ctx.fillRect(px-42,GROUND-164,84,9);
    ctx.fillStyle='#78e7b2';ctx.fillRect(px-42,GROUND-164,84*Math.max(0,hp/max),9);
    ctx.fillStyle='#fff';ctx.font='16px sans-serif';
    ctx.fillText(label,px-40,GROUND-177);
  }
  function renderActor(u) {
    const x=(u.x-camera)*canvas.width/VIEW,baseY=GROUND;
    if(x<-100||x>canvas.width+100)return;
    const size=u.ally?(u.a.hp>=450?76:58):u.a.size;
    const img=u.ally?allyArt(u.allyId):enemyArt(u.enemyId);
    const phase=u.staggerLeft>0?1-u.staggerLeft/STAGGER_TIME:0;
    // abs(sin(2πt)) peaks twice over one complete stagger.
    const hop=u.staggerLeft>0?17*Math.abs(Math.sin(2*Math.PI*phase)):0;
    const tilt=u.staggerLeft>0?(u.ally?-1:1)*.27*Math.sin(2*Math.PI*phase):0;
    const lunge=u.attackAnim>0?(u.ally?1:-1)*8*Math.sin(Math.PI*u.attackAnim/.24):0;
    ctx.fillStyle='#13253a88';ctx.beginPath();
    ctx.ellipse(x,baseY+2,size*.32,7,0,0,Math.PI*2);ctx.fill();
    ctx.save();ctx.translate(x+lunge,baseY-hop);ctx.rotate(tilt);
    if(imageReady(img)){
      const ratio=img.naturalWidth/img.naturalHeight;
      const h=size,w=Math.min(size*1.25,size*ratio);
      const actualH=w/ratio;
      if(u.hit>0)ctx.filter='brightness(1.5)';
      ctx.drawImage(img,-w/2,-actualH,w,actualH);
      ctx.filter='none';
    }else{
      ctx.fillStyle=u.hit>0?'#fff':u.a.color;
      ctx.beginPath();ctx.arc(0,-size*.52,size*.34,0,2*Math.PI);ctx.fill();
      ctx.fillStyle='#16283c';
      ctx.beginPath();ctx.arc(-7,-size*.59,3,0,7);ctx.arc(7,-size*.59,3,0,7);ctx.fill();
    }
    if(u.attackAnim>0){
      ctx.strokeStyle='#ffe1a3';ctx.lineWidth=4;ctx.beginPath();
      const side=u.ally?1:-1;
      ctx.moveTo(side*size*.28,-size*.54);
      ctx.lineTo(side*(size*.6+8),-size*.72);ctx.stroke();
    }
    ctx.restore();
    const barWidth=Math.max(42,size*.8),barY=baseY-size-26-hop;
    ctx.fillStyle='#101c30';ctx.fillRect(x-barWidth/2,barY,barWidth,6);
    ctx.fillStyle=u.ally?'#7eeab3':'#ff8f95';
    ctx.fillRect(x-barWidth/2,barY,barWidth*Math.max(0,u.hp/u.max),6);
  }
  function draw() {
    const b=battle;if(!b)return;
    const w=canvas.width,h=canvas.height;
    ctx.fillStyle='#233b60';ctx.fillRect(0,0,w,h);
    ctx.fillStyle=color[b.stage.theme%6]+'77';ctx.beginPath();
    ctx.arc(230-camera*.12,143,115,0,2*Math.PI);ctx.fill();
    for(let i=0;i<12;i++){
      const x=i*180-camera*.28;
      ctx.fillStyle='#365d79';ctx.beginPath();ctx.ellipse(x,395,92,48,0,0,7);ctx.fill();
    }
    ctx.fillStyle='#577d66';ctx.fillRect(0,GROUND,w,h-GROUND);
    ctx.fillStyle='#add58e';ctx.fillRect(0,GROUND,w,5);
    renderCastle(105,b.home,b.homeMax,'味方城','#6fd5b2');
    renderCastle(WORLD-105,b.enemy,b.enemyMax,'敵城','#e37780');
    [...b.units].sort((a,c)=>a.x-c.x).forEach(renderActor);
    ctx.fillStyle='#101c30d9';ctx.fillRect(0,0,w,51);
    ctx.fillStyle='#f8f5e8';ctx.font='20px sans-serif';
    ctx.fillText(b.stage.name+'　'+Math.floor(b.time)+'秒',17,32);
    if(b.result){
      ctx.fillStyle='#07111ddd';ctx.fillRect(0,0,w,h);
      ctx.fillStyle='#8cf0c1';ctx.font='bold 64px sans-serif';
      ctx.textAlign='center';ctx.fillText(b.result,w/2,h/2);ctx.textAlign='left';
    }
    $('battleMoney').textContent='お金 '+Math.floor(b.money)+' / '+b.cap;
    $('battleHp').textContent='味方 '+Math.max(0,Math.ceil(b.home))+' ｜ 敵 '+Math.max(0,Math.ceil(b.enemy));
    document.querySelectorAll('.unitbtn').forEach(btn=>{
      const slot=Number(btn.dataset.slot),i=state.deck[slot];
      btn.disabled=!!b.result||b.money<allies()[i].cost||b.cool[slot]>0;
    });
  }
  function loop(now) {
    if(!battle)return;
    const dt=Math.min(.05,(now-last)/1000);last=now;
    update(dt);draw();
    frame=requestAnimationFrame(loop);
  }
  canvas.onpointerdown=e=>{drag={x:e.clientX,camera};canvas.setPointerCapture(e.pointerId);};
  canvas.onpointermove=e=>{
    if(drag)camera=Math.max(0,Math.min(WORLD-VIEW,drag.camera-(e.clientX-drag.x)*VIEW/canvas.clientWidth));
  };
  canvas.onpointerup=()=>{drag=null;};
  canvas.onpointercancel=()=>{drag=null;};
  document.addEventListener('keydown',e=>{
    if(!battle||document.activeElement?.matches('input'))return;
    if(e.code.startsWith('Digit')){
      const slot=Number(e.code.slice(-1))-1;
      if(slot>=0&&slot<state.deck.length)spawnAlly(state.deck[slot],slot);
    }else if(e.code==='KeyW')$('worker').click();
    else if(e.code==='ArrowLeft'||e.code==='KeyA')camera=Math.max(0,camera-120);
    else if(e.code==='ArrowRight'||e.code==='KeyD')camera=Math.min(WORLD-VIEW,camera+120);
  });
  wallet();renderStages();renderSquad();renderRoster();refreshAllyTargets();
  // The first online visit caches only our own game code for later offline visits.
  if(typeof navigator!=='undefined'&&'serviceWorker' in navigator&&
      typeof location!=='undefined'&&location.protocol==='https:'){
    window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
  }
})();
