'use client';
import {useEffect,useRef,useState} from 'react';
import QRCode from 'qrcode';
import {base,emojiOf,workOf,type Word,type Work} from '../lib/words';
import {choices,fold,hideWords,inTitle,mask,sameWord,seeded,shuffle} from '../lib/game';
import {hint,Meanings,Pic,readSession,writeSession} from './dict-ui';
import LiveGame,{livePinKey} from './live-game';
// Terim oyunu: 10 soruluk, süreli, puanlı tur. İki yön: "Terimi Bul" (tanımdan terime) ve "Tanımını Bul" (terimden tanıma).
// Kolay: 4 şık. Zor: Terimi Bul'da terim yazılır, Tanımını Bul'da 6 şık vardır. Rekorlar bu tarayıcıda saklanır.
// Cevabı ele veren her şey gizlenir: şıklı soruda harf deseni gösterilmez, tanım ve şıklarda terimin sözcükleri ••• olur,
// terimi içeren karşılık ve grup adı ipucu olarak verilmez.
// Sınıf modu: öğretmen seçtiği ayarlarla sınıf açar, 6 haneli kodu (ya da bağlantıyı, kare kodu) paylaşır. Koda giren herkes aynı 10 soruyu aynı sırayla çözer;
// skorlar yalnızca o sınıfın tablosuna yazılır. Tek hak: "Oyunu başlat"a basınca rumuz ve cihaz anahtarı sunucuya yazılır; aynı cihaz ya da rumuz ikinci kez
// puanlı tura giremez, sonraki turlar rastgele sorularla alıştırmadır (soruları görüp baştan başlamak işe yaramaz). Kod sekme oturumunda ve adreste (?bolum=oyun&sinif=482913) tutulur.
const ROUND=10,TIME=20,FIFTY=1,LETTERS=3;
type Ask='word'|'meaning';type Level='kolay'|'zor';type Phase='setup'|'play'|'end';
type Q={w:Word;options:Word[]};type Answer={w:Word;ok:boolean;points:number};type Klass={code:string;label:string;mode:string;group:string};type Top={name:string;score:number}[];type ClassTop={name:string;score:number|null}[];
const recordKey='gt-oyun-rekor',nameKey='gt-oyun-ad',classKey='gt-oyun-sinif',deviceKey='gt-oyun-cihaz';
// Öğretmen ekranı: sınıfı açan tarayıcı o sınıfın kodunu saklar; bu tarayıcıda oyun başlatılmaz, yalnızca kod, kare kod ve sınıf tablosu görünür.
const ownerKey='gt-oyun-ogretmen';
function ownedClasses():string[]{try{const v=JSON.parse(localStorage.getItem(ownerKey)||'[]');return Array.isArray(v)?v.filter(x=>typeof x==='string'):[];}catch{return [];}}
// Cihaz anahtarı: bu tarayıcıda saklanan rastgele değer. Sınıfta puanlı tur hakkı cihaza (ve rumuza) bağlanır.
let memoryToken='';
function deviceToken(){const make=()=>[...crypto.getRandomValues(new Uint8Array(16))].map(b=>b.toString(16).padStart(2,'0')).join('');
try{let t=localStorage.getItem(deviceKey)||'';if(!/^[a-f0-9]{32}$/.test(t)){t=make();localStorage.setItem(deviceKey,t);}return t;}catch{return memoryToken||=make();}}
function readRecords():Record<string,number>{try{const v=JSON.parse(localStorage.getItem(recordKey)||'{}');return v&&typeof v==='object'?v:{};}catch{return {};}}
function saveRecord(key:string,score:number){try{localStorage.setItem(recordKey,JSON.stringify({...readRecords(),[key]:score}));}catch{}}
// Karşılık terimin 3 harften uzun bir sözcüğünü içeriyorsa cevabı ele verir ("Dijkstra algoritması" → "Dijkstra's algorithm").
const leaks=(w:Word)=>!w.syllables||fold(w.syllables)===fold(w.word)||w.word.split(/[^\p{L}\p{N}]+/u).some(p=>fold(p).length>=3&&fold(w.syllables).includes(fold(p)));
const isLetter=(c:string)=>c.toLocaleLowerCase('tr')!==c.toLocaleUpperCase('tr');
export default function GuessGame({words,works,ill,onOpen}:{words:Word[];works:Work[];ill:Record<string,number>;onOpen?:(w:Word)=>void}){
const [ask,setAsk]=useState<Ask>('word'),[level,setLevel]=useState<Level>('kolay'),[group,setGroup]=useState(''),[phase,setPhase]=useState<Phase>('setup');
const [qs,setQs]=useState<Q[]>([]),[at,setAt]=useState(0),[answers,setAnswers]=useState<Answer[]>([]),[picked,setPicked]=useState<string|null>(null),[text,setText]=useState('');
const [deadline,setDeadline]=useState(0),[now,setNow]=useState(0),[removed,setRemoved]=useState<string[]>([]),[shown,setShown]=useState(0),[pairShown,setPairShown]=useState(false);
const [fifty,setFifty]=useState(FIFTY),[letters,setLetters]=useState(LETTERS),[record,setRecord]=useState<{best:number;isNew:boolean}>({best:0,isNew:false});
// En yüksek skorlar veritabanında tutulur (/api/scores); üyelik yoktur, oyuncu tur sonunda adını yazarak skorunu kaydeder.
const [top,setTop]=useState<{name:string;score:number}[]>([]),[player,setPlayer]=useState(()=>{try{return localStorage.getItem(nameKey)||'';}catch{return '';}}),[saved,setSaved]=useState(false),[saving,setSaving]=useState(false),[scoreError,setScoreError]=useState('');
const mode=`${ask}-${level}`;
// Canlı yarışma (Kahoot tarzı, live-game.tsx): adreste ?canli=PIN varsa ya da sekme oturumunda süren oyun varsa doğrudan açılır.
const [live,setLive]=useState(()=>/^\d{6}$/.test(new URLSearchParams(location.search).get('canli')||'')||!!readSession(livePinKey,''));
const [klass,setKlass]=useState<Klass|null>(null),[classTop,setClassTop]=useState<ClassTop>([]),[classPlayed,setClassPlayed]=useState(''),[counted,setCounted]=useState(false),[code,setCode]=useState(''),[label,setLabel]=useState(''),[classBusy,setClassBusy]=useState(false),[classError,setClassError]=useState(''),[qr,setQr]=useState('');
// played: bu cihaz bu sınıftaki puanlı tur hakkını kullandı. counted: süren/biten tur sınıf tablosuna yazılan tur.
const played=!!klass&&classPlayed===klass.code,done=saved,teacher=!!klass&&ownedClasses().includes(klass.code);
function enter(c:Klass,list:ClassTop,used=false){if(used)setClassPlayed(c.code);const [a,l]=c.mode.split('-') as [Ask,Level];setAsk(a);setLevel(l);setGroup(c.group);setKlass(c);setClassTop(list);setClassError('');setCode('');writeSession(classKey,c.code);}
async function openClass(body?:{label:string;mode:string;group:string},join=code){if(classBusy)return;setClassBusy(true);setClassError('');try{
// Yazılan kod süren bir canlı yarışmanın PIN'i ise o açılır.
if(!body&&(await fetch(`${base}/api/live?pin=${encodeURIComponent(join)}`).catch(()=>null))?.ok){writeSession(livePinKey,join);setCode('');setLive(true);return;}
const r=await (body?fetch(base+'/api/classes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}):fetch(`${base}/api/classes?code=${encodeURIComponent(join)}&token=${deviceToken()}`));const d=await r.json();if(!r.ok)throw Error(d.error);if(body)try{localStorage.setItem(ownerKey,JSON.stringify([...ownedClasses(),d.class.code].slice(-50)));}catch{}enter(d.class,Array.isArray(d.top)?d.top:[],!!d.played);}catch(e){setClassError(e instanceof Error?e.message:'Sınıfa girilemedi.');writeSession(classKey,'');}finally{setClassBusy(false);}}
function leaveClass(){setKlass(null);setClassTop([]);writeSession(classKey,'');const p=new URLSearchParams(location.search);if(p.has('sinif')){p.delete('sinif');history.replaceState(null,'',`?${p}`);}}
const nameOf=(s:string)=>s.trim().toLocaleLowerCase('tr').replace(/\s+/g,' '),taken=!played&&classTop.some(t=>nameOf(t.name)===nameOf(player));
const classLink=klass?`${location.origin}${base}/?bolum=oyun&sinif=${klass.code}`:'';
// Adresteki ya da oturumdaki sınıf koduyla sınıfa geri girilir.
useEffect(()=>{const c=new URLSearchParams(location.search).get('sinif')||readSession(classKey,'');if(typeof c!=='string'||!c)return;let on=true;
fetch(`${base}/api/classes?code=${encodeURIComponent(c)}&token=${deviceToken()}`).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);if(on)enter(d.class,Array.isArray(d.top)?d.top:[],!!d.played);}).catch(e=>{if(!on)return;setClassError(e instanceof Error?e.message:'Sınıfa girilemedi.');writeSession(classKey,'');});return()=>{on=false;};},[]);
// Sınıf tablosu soru çözülmediği sürece 5 saniyede bir yenilenir (öğretmenin tahtaya yansıttığı ekran).
useEffect(()=>{if(!klass||phase==='play')return;let on=true;const load=()=>fetch(`${base}/api/classes?code=${klass.code}`).then(r=>r.json()).then(d=>{if(on&&Array.isArray(d.top))setClassTop(d.top);}).catch(()=>{});load();const t=setInterval(load,5000);return()=>{on=false;clearInterval(t);};},[klass,phase]);
useEffect(()=>{let on=true;if(classLink)QRCode.toDataURL(classLink,{width:180,margin:2,color:{dark:'#243130',light:'#ffffff'}}).then(u=>{if(on)setQr(u);}).catch(()=>{});return()=>{on=false;};},[classLink]);
useEffect(()=>{let on=true;fetch(`${base}/api/scores?mode=${mode}`).then(r=>r.json()).then(d=>{if(on)setTop(Array.isArray(d.top)?d.top:[]);}).catch(()=>{});return()=>{on=false;};},[mode]);
async function saveScore(total:number){if(saving||done||(!klass&&player.trim().length<2))return;setSaving(true);setScoreError('');try{const r=await fetch(base+'/api/scores',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(klass?{mode,score:total,class:klass.code,token:deviceToken()}:{name:player.trim(),mode,score:total})});const d=await r.json();if(!r.ok)throw Error(d.error);if(klass)setClassTop(d.top);else{setTop(d.top);try{localStorage.setItem(nameKey,player.trim());}catch{}}setSaved(true);}catch(e){setScoreError(e instanceof Error?e.message:'Skorun kaydedilemedi.');}finally{setSaving(false);}}
const modeName=`${ask==='word'?'Terimi Bul':'Tanımını Bul'}, ${level==='kolay'?'Kolay':'Zor'}`;
const board=klass?<div className="game-field"><h2 className="game-label"><span aria-hidden="true">🏆</span>{klass.label} · sınıf tablosu{classTop.length?` · ${classTop.length} oyuncu`:''}</h2>{classTop.length?<ol className="game-review">{classTop.map((t,i)=><li key={i}><span aria-hidden="true">{t.score===null?'…':i+1}</span><div><b>{t.name}</b></div><em>{t.score??'oynuyor'}</em></li>)}</ol>:<p>Henüz kimse başlamadı. Oyuna başlayanlar burada görünür.</p>}</div>
:<div className="game-field"><h2 className="game-label"><span aria-hidden="true">🏆</span>En yüksek skorlar · {ask==='word'?'Terimi Bul':'Tanımını Bul'}, {level==='kolay'?'Kolay':'Zor'}</h2>{top.length?<ol className="game-review">{top.map((t,i)=><li key={t.name}><span aria-hidden="true">{i+1}</span><div><b>{t.name}</b></div><em>{t.score}</em></li>)}</ol>:<p>Henüz kayıtlı skor yok. İlk sen ol!</p>}</div>;
const pool=words.filter(w=>!group||w.work===group),active=works.filter(k=>words.some(w=>w.work===k.id));
const typing=ask==='word'&&level==='zor',count=ask==='meaning'&&level==='zor'?6:4,key=`${ask}-${level}`;
const q=qs[at],k=q&&workOf(works,q.w);
const left=Math.max(0,(deadline-now)/1000),streak=answers.length?answers.slice().reverse().findIndex(a=>!a.ok):0,run=streak<0?answers.length:streak;
const score=answers.reduce((s,a)=>s+a.points,0),answered=picked!==null;
// Sınıfta puanlı tur: önce rumuz ve cihaz sunucuya yazılır (tek hak), sonra sınıf koduyla tohumlanan tur başlar: herkes aynı soruları ve şıkları aynı sırayla görür.
// Hakkını kullanan cihazın sonraki turları rastgele sorularla alıştırmadır ve tabloya yazılmaz.
async function start(list?:Word[]){if(teacher)return;if(!klass||list||played){begin(list,false);return;}if(classBusy)return;setClassBusy(true);setClassError('');
try{const r=await fetch(base+'/api/classes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:klass.code,name:player.trim(),token:deviceToken()})}),d=await r.json();if(!r.ok)throw Error(d.error);
if(Array.isArray(d.top))setClassTop(d.top);setClassPlayed(klass.code);try{localStorage.setItem(nameKey,player.trim());}catch{}
if(d.played)setClassError('Bu cihazdan bu sınıfta puanlı tur oynanmış. Bundan sonraki turlar alıştırmadır.');else begin(undefined,true);
}catch(e){setClassError(e instanceof Error?e.message:'Tur başlatılamadı. Tekrar dene.');}finally{setClassBusy(false);}}
function begin(list:Word[]|undefined,count1:boolean){const rnd=count1&&klass?seeded('sinif-'+klass.code):Math.random,chosen=shuffle(list??pool,rnd).slice(0,ROUND);setCounted(count1);
setQs(chosen.map(w=>({w,options:choices(w,words,count,rnd,ask==='meaning'?hint:undefined)})));
setAnswers([]);setSaved(false);setScoreError('');setFifty(FIFTY);setLetters(LETTERS);setPhase('play');ask0(0);}
function ask0(i:number){setAt(i);setPicked(null);setText('');setRemoved([]);setShown(0);setPairShown(false);const t=Date.now();setNow(t);setDeadline(t+TIME*1000);}
// Puan: 100 + kalan saniye × 5 + seri bonusu (her ardışık doğru +10, en çok +50). Açılan harf −25, karşılık ipucu −30; en az 20.
function answer(id:string|null){if(!q||answered)return;const ok=id!==null&&(typing?sameWord(id,q.w.word):id===q.w.id);
const secs=Math.max(0,(deadline-Date.now())/1000),points=ok?Math.max(20,Math.round(100+secs*5+Math.min(run,5)*10-shown*25-(pairShown?30:0))):0;
setPicked(id??'');setAnswers(a=>[...a,{w:q.w,ok,points}]);}
function next(){if(at+1<qs.length){ask0(at+1);return;}const total=score,best=readRecords()[key]??0;if(total>best)saveRecord(key,total);setRecord({best:Math.max(best,total),isNew:total>best&&total>0});setPhase('end');
// Sınıfta puanlı turun skoru kendiliğinden kaydedilir (0 puan da); alıştırma turları tabloya yazılmaz.
if(klass&&counted)void saveScore(total);}
// Süre: her 200 ms'de ilerler; bitince soru boş cevapla kapanır.
const timeout=useRef(answer);useEffect(()=>{timeout.current=answer;});
useEffect(()=>{if(phase!=='play'||answered)return;const t=setInterval(()=>{const n=Date.now();setNow(n);if(n>=deadline){clearInterval(t);timeout.current(null);}},200);return()=>clearInterval(t);},[phase,answered,deadline]);
// Klavye: 1–6 şık seçer, Enter sonraki soruya geçer.
useEffect(()=>{if(phase!=='play')return;const h=(e:KeyboardEvent)=>{if(e.target instanceof HTMLInputElement)return;if(e.key==='Enter'){if(answered&&!(e.target instanceof HTMLButtonElement)){e.preventDefault();next();}return;}
const n=Number(e.key);if(!answered&&!typing&&q&&n>=1&&n<=q.options.length&&!removed.includes(q.options[n-1].id))answer(q.options[n-1].id);};addEventListener('keydown',h);return()=>removeEventListener('keydown',h);});
function takeFifty(){if(!q||!fifty||answered)return;setFifty(f=>f-1);setRemoved(shuffle(q.options.filter(o=>o.id!==q.w.id)).slice(0,Math.floor((q.options.length-1)/2+.5)).map(o=>o.id));}
function takeLetter(){if(!q||!letters||answered)return;setLetters(n=>n-1);setShown(n=>n+1);}
const order=q?shuffle([...q.w.word].map((c,i)=>isLetter(c)?i:-1).filter(i=>i>=0),seeded(q.w.id)):[];
const open=new Set(order.slice(0,Math.min(shown,Math.max(0,order.length-1))));
const tiles=q?[...q.w.word.toLocaleUpperCase('tr')].map((c,i)=>({c,letter:isLetter(c),open:answered||open.has(i)})):[];
const settings=<div className="game-setup">
<div className="game-field"><h2 className="game-label"><span>1</span>Oyun türü</h2><div className="game-type" role="radiogroup" aria-label="Oyun">{([['word','🎯','Terimi Bul','Tanımı oku, terimi bul'],['meaning','📖','Tanımını Bul','Terimi oku, tanımını seç']] as const).map(([a,i,t,d])=><button key={a} role="radio" aria-checked={ask===a} className={ask===a?'chosen':''} onClick={()=>setAsk(a)}><i aria-hidden="true">{i}</i><span><b>{t}</b><small>{d}</small></span></button>)}</div></div>
<div className="game-field"><h2 className="game-label"><span>2</span>Zorluk</h2><div className="game-type" role="radiogroup" aria-label="Zorluk">{([['kolay','🌱','Kolay',ask==='word'?'4 şıktan seç':'4 tanımdan seç'],['zor','🔥','Zor',ask==='word'?'Terimi kendin yaz':'6 tanımdan seç']] as const).map(([v,i,t,d])=><button key={v} role="radio" aria-checked={level===v} className={level===v?'chosen':''} onClick={()=>setLevel(v)}><i aria-hidden="true">{i}</i><span><b>{t}</b><small>{d}</small></span></button>)}</div></div>
<div className="game-field"><h2 className="game-label"><span>3</span>Çalışma grubu</h2><label className="search group-select"><span aria-hidden="true">▦</span><select aria-label="Çalışma grubu" value={group} onChange={e=>setGroup(e.target.value)}><option value="">Bütün çalışma grupları</option>{active.map(k=><option key={k.id} value={k.id}>{emojiOf(k.id)} {k.title}</option>)}</select></label></div>
<div className="game-field"><h2 className="game-label"><span>4</span>Sınıf modu <small>isteğe bağlı</small></h2><div className="class-forms">
<form onSubmit={e=>{e.preventDefault();void openClass();}}><b>Öğrenci: sınıfa katıl</b><small>Öğretmeninin verdiği 6 haneli kodu (sınıf kodu ya da canlı yarışma PIN’i) yaz.</small><div className="guess-text"><label className="sr-only" htmlFor="class-code">Sınıf kodu</label><input id="class-code" inputMode="numeric" autoComplete="off" maxLength={6} placeholder="Sınıf kodu" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))}/><button className="primary" disabled={classBusy||code.length!==6}>Katıl</button></div></form>
<form onSubmit={e=>{e.preventDefault();void openClass({label:label.trim(),mode,group});}}><b>Öğretmen: sınıf aç</b><small>Yukarıda seçtiğin tür, zorluk ve grupla açılır; herkes aynı soruları çözer.</small><div className="guess-text"><label className="sr-only" htmlFor="class-label">Sınıf adı</label><input id="class-label" maxLength={40} placeholder="Sınıf adı (ör. 9-B)" value={label} onChange={e=>setLabel(e.target.value)}/><button className="secondary" disabled={classBusy||!label.trim()||pool.length<2}>Sınıf aç</button></div></form></div>
{classError&&<p className="error" role="alert">{classError}</p>}
<button className="live-cta" onClick={()=>setLive(true)}><i aria-hidden="true">▲◆●■</i><span><b>Kahoot tarzı canlı oyna</b><small>Öğrenciler PIN ile bağlanır, adları tahtada görünür; sorular öğretmenin hızıyla ilerler, sonunda podyum.</small></span><em aria-hidden="true">↗</em></button></div></div>;
const room=klass&&<div className="class-room"><div><div className="eyebrow">SINIF MODU · {klass.label}</div><p>Sınıf kodu</p><b className="class-code">{klass.code}</b><ul className="game-facts"><li>{modeName}</li><li>{group?`${emojiOf(group)} ${works.find(k=>k.id===group)?.title??group}`:'Bütün çalışma grupları'}</li><li>Herkese aynı sorular</li></ul>
<p className="class-link">Oyun bölümünde bu kodu yaz ya da kare kodu okut: <span>{classLink}</span></p><button className="secondary class-leave" onClick={leaveClass}>✕ Sınıftan çık</button></div>{qr&&<img src={qr} alt="Sınıfa katılma kare kodu" width={180} height={180}/>}</div>;
if(live)return <LiveGame words={words} works={works} token={deviceToken()} onExit={()=>setLive(false)}/>;
if(phase==='setup')return <section className="standalone game"><header className="game-hero"><div><div className="eyebrow">TERİM OYUNU</div><h1>Oyna, <em>öğren.</em></h1>
<p>Hızlı cevap daha çok puan getirir; art arda doğrular seri bonusu kazandırır.</p>
<ul className="game-facts"><li><b>{ROUND}</b> soru</li><li>Soru başına <b>{TIME}</b> saniye</li><li><b>3</b> joker</li></ul></div>
<div className="game-record"><span aria-hidden="true">🏆</span><b>{readRecords()[key]??0}</b><small>Rekorun · {modeName}</small></div></header>
<div className="game-panel">{room||settings}
{!teacher&&<ul className="joker-info" aria-label="Jokerler"><li><b>½ Yarı yarıya</b><small>İki yanlış şıkkı eler</small></li><li><b>🔤 Harf aç</b><small>Terimden bir harf gösterir</small></li><li><b>🌐 Karşılık</b><small>İngilizce ya da Türkçe karşılığı gösterir</small></li></ul>}
{teacher&&<p className="notice" role="status">Öğretmen ekranı: bu ekranı tahtaya yansıt. Öğrenciler kodla ya da kare kodla girer; başlayanlar ve skorları aşağıda kendiliğinden görünür. Bu tarayıcıdan oyun oynanmaz.</p>}
{klass&&!teacher&&played&&<p className="notice" role="status">Bu sınıftaki puanlı tur hakkını kullandın. Bundan sonraki turlar farklı sorularla alıştırmadır; sınıf tablosuna yazılmaz.</p>}
{klass&&!teacher&&!played&&<div className="game-field class-name"><label className="game-label" htmlFor="class-player">Rumuzun</label><input id="class-player" autoComplete="off" maxLength={40} placeholder="Sınıf tablosunda görünecek adın (ör. Elif K.)" value={player} onChange={e=>setPlayer(e.target.value)}/>
<small>{taken?'Bu rumuz sınıfta kullanılmış; başka bir rumuz yaz (ör. soyadının baş harfini ekle).':'Rumuzunu yaz. Puanlı tur için tek hakkın var: turu yarıda bitirirsen o ana kadarki puanın sayılır; sayfayı yenilersen ya da kapatırsan puanın yazılmaz ve tekrar giremezsin.'}</small></div>}
{klass&&classError&&<p className="error" role="alert">{classError}</p>}
{!teacher&&<div className="game-start">{pool.length<2?<p>Bu grupta oyun için yeterli terim yok.</p>:<button className="primary" disabled={!!klass&&(classBusy||(!played&&(player.trim().length<2||taken)))} onClick={()=>void start()}>{klass&&played?'Alıştırma turu başlat ↗':'Oyunu başlat ↗'}</button>}</div>}{board}</div></section>;
if(phase==='end'){const right=answers.filter(a=>a.ok).length,missed=answers.filter(a=>!a.ok).map(a=>a.w);
return <section className="standalone game game-end"><header className="game-hero"><div><div className="eyebrow">TUR BİTTİ</div><h1>{right>=8?<>Harika <em>iş!</em></>:right>=5?<>İyi <em>gidiyor.</em></>:<>Tekrar <em>dene.</em></>}</h1>
<p>{answers.length} sorudan {right} tanesini doğru bildin.</p></div>
<div className="game-record"><span aria-hidden="true">{record.isNew?'🏆':'⭐'}</span><b>{score}</b><small>{record.isNew?'puan · ✦ Yeni rekor!':'puan'}</small></div></header>
<div className="game-summary"><div className="ok"><b>{right}</b><small>doğru</small></div><div className="no"><b>{answers.length-right}</b><small>yanlış</small></div><div><b>{record.best}</b><small>rekor</small></div></div>
{klass?<p className="notice" role="status">{!counted?'Alıştırma turu: sınıf tablosuna yazılmaz.':done?'✓ Skorun sınıf tablosunda. Puanlı tur hakkını kullandın; sonraki turlar alıştırmadır.':saving?'Skorun kaydediliyor…':<>Skorun kaydedilemedi. <button className="link" onClick={()=>void saveScore(score)}>Tekrar dene</button></>}</p>:score>0&&(done?<p className="notice" role="status">✓ Skorun kaydedildi.</p>:<form className="guess-text" onSubmit={e=>{e.preventDefault();void saveScore(score);}}><label className="sr-only" htmlFor="score-name">Adın</label><input id="score-name" required minLength={2} maxLength={40} placeholder="Skorunu kaydetmek için adını yaz…" value={player} onChange={e=>setPlayer(e.target.value)}/><button className="primary" disabled={saving||player.trim().length<2}>{saving?'Kaydediliyor…':'Skoru kaydet'}</button></form>)}
{scoreError&&<p className="error" role="alert">{scoreError}</p>}
{board}
<div className="button-row start">{missed.length>1&&<button className="primary" onClick={()=>void start(missed)}>Yanlışlarımı tekrar oyna</button>}<button className={missed.length>1?'secondary':'primary'} onClick={()=>void start()}>{klass?'Alıştırma turu ↗':'Yeni tur ↗'}</button>{klass?<><button className="text-button" onClick={()=>setPhase('setup')}>Sınıf ekranı</button><button className="text-button class-leave" onClick={()=>{leaveClass();setPhase('setup');}}>✕ Sınıftan çık</button></>:<button className="text-button" onClick={()=>setPhase('setup')}>Ayarları değiştir</button>}</div>
<ol className="game-review">{answers.map((a,i)=><li key={i} className={a.ok?'ok':'no'}><span aria-label={a.ok?'Doğru':'Yanlış'}>{a.ok?'✓':'✗'}</span><div><b>{onOpen?<button className="link" onClick={()=>onOpen(a.w)}>{a.w.word}</button>:a.w.word}</b><small>{hint(a.w)}</small></div><em>{a.ok?`+${a.points}`:'0'}</em></li>)}</ol></section>;}
return <section className="standalone game"><div className="game-top"><span>Soru <b>{at+1}</b>/{qs.length}</span><span>Puan <b>{score}</b></span><span>🔥 Seri <b>{run}</b></span><button className="text-button" onClick={()=>{if(klass&&counted)void saveScore(score);setPhase('setup');}}>Turu bitir</button></div>
<div className={`game-timer${left<=5&&!answered?' low':''}`} role="timer" aria-label={`${Math.ceil(left)} saniye kaldı`}><div><span style={{width:`${answered?0:left/TIME*100}%`}}/></div><b>{answered?'':Math.ceil(left)}</b></div>
{q&&k&&<article className={`game-card${!answered?'':answers.at(-1)?.ok?' right':' wrong'}`} key={at}>
{ask==='word'?<>{typing?<div className="tiles" aria-label={`${[...q.w.word].length} karakterli gizli terim`}>{tiles.map((t,i)=>t.letter?<span key={i} className={t.open?'open':''}>{t.open?t.c:''}</span>:t.c===' '?<i key={i}/>:<span key={i} className="mark">{t.c}</span>)}</div>:null}
<div className="game-question"><span className="eyebrow">{typing?'TANIMI OKU, TERİMİ YAZ':'BU TANIM HANGİ TERİMİN?'}</span><p className="q-main">{hideWords(hint(q.w),q.w.word)}</p>{q.w.meaning!==hint(q.w)&&<p className="q-extra">{hideWords(q.w.meaning,q.w.word)}</p>}</div>
<div className="game-meta"><span>{inTitle(q.w.word,k.title)?mask(k.title,1,k.id):`${emojiOf(k.id)} ${k.title}`}</span>{pairShown&&<span><b>Karşılığı:</b> {q.w.syllables}</span>}</div></>
:<><div className="game-question"><span className="eyebrow">BU TERİMİN TANIMI HANGİSİ?</span><div className="shown-word">{q.w.word}</div></div><div className="game-meta"><span>{emojiOf(k.id)} {k.title}</span></div></>}
{!answered&&<div className="jokers" aria-label="Jokerler">{typing?<button className="secondary" disabled={!letters||shown>=order.length-1} onClick={takeLetter}>🔤 Harf aç <small>{letters} hak · −25</small></button>:<button className="secondary" disabled={!fifty} onClick={takeFifty}>½ Yarı yarıya <small>{fifty} hak</small></button>}{ask==='word'&&!leaks(q.w)&&<button className="secondary" disabled={pairShown} onClick={()=>setPairShown(true)}>🌐 Karşılık <small>−30</small></button>}</div>}
{typing?<form className="guess-text" onSubmit={e=>{e.preventDefault();if(text.trim())answer(text);}}><label className="sr-only" htmlFor="game-answer">Terim</label><input id="game-answer" autoFocus autoComplete="off" maxLength={40} placeholder="Terimi yaz…" value={text} disabled={answered} onChange={e=>setText(e.target.value)}/>{!answered&&<button className="primary" disabled={!text.trim()}>Cevapla</button>}</form>
:<div className={`guess-options${ask==='meaning'?' meanings-list':''}`}>{q.options.map((o,i)=>{const cls=answered?o.id===q.w.id?' correct':o.id===picked?' picked-wrong':' faded':removed.includes(o.id)?' removed':'';
return <button key={o.id} className={`secondary option${ask==='meaning'?' meaning-option':''}${cls}`} disabled={answered||removed.includes(o.id)} onClick={()=>answer(o.id)}><kbd aria-hidden="true">{i+1}</kbd><span>{ask==='meaning'?hideWords(hint(o),q.w.word):o.word}</span></button>;})}</div>}
{answered&&<div className="game-result"><p className="verdict" role="status">{answers.at(-1)?.ok?`✓ Doğru! +${answers.at(-1)?.points} puan`:picked===''?`⏱ Süre doldu. Doğru cevap: ${q.w.word}`:`✗ Olmadı. Doğru cevap: ${q.w.word}`}</p>
<div className="game-explain"><Pic w={q.w} ill={ill}/><div><h2>{q.w.word}{q.w.syllables&&q.w.syllables!==q.w.word&&<small> · {q.w.syllables}</small>}</h2><Meanings w={q.w} k={k}/><p className="entry-example">“{q.w.example}”</p></div></div>
<button className="primary" autoFocus onClick={next}>{at+1<qs.length?'Sonraki soru →':'Sonucu gör →'}</button></div>}
</article>}</section>;}
