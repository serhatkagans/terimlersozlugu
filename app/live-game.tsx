'use client';
import {useEffect,useMemo,useState} from 'react';
import QRCode from 'qrcode';
import {base,emojiOf,type Word,type Work} from '../lib/words';
import {AVATARS,type LiveView} from '../lib/live';
import {KAHOOTS} from '../lib/kahoot';
import {isMuted,music,setMuted,sfx} from './live-sound';
import {seeded} from '../lib/game';
import {readSession,writeSession} from './dict-ui';
// Canlı yarışma (Kahoot tarzı): öğretmen oyunu açar ve ekranını tahtaya yansıtır; öğrenciler PIN'i (ya da kare kodu) ve adını girerek bağlanır.
// Sorular öğretmenin düğmesiyle ilerler: soru → doğru cevap → ara skor tablosu (yükselenler, seriler) → … → podyum.
// Her soru önce tek başına görünür, birkaç saniye sonra şıklar açılır ve süre başlar. Sesler live-sound.ts'te üretilir; sahne tam ekran yapılabilir.
// Ekranlar sunucuyu saniyede bir yoklar (/api/live). PIN sekme oturumunda ve adreste (?bolum=oyun&canli=482913), öğretmenin oyun anahtarı bu tarayıcıda tutulur.
export const livePinKey='gt-canli';
const hostKey='gt-canli-sunucu',nameKey='gt-oyun-ad',avatarKey='gt-canli-avatar',SHAPES=['▲','◆','●','■'];
function hosts():Record<string,string>{try{const v=JSON.parse(localStorage.getItem(hostKey)||'{}');return v&&typeof v==='object'?v:{};}catch{return {};}}
const urlPin=()=>{const c=new URLSearchParams(location.search).get('canli')||'';return /^\d{6}$/.test(c)?c:'';};
const clock=()=>Date.now();
const spaced=(pin:string)=>`${pin.slice(0,3)} ${pin.slice(3)}`;
type Row=NonNullable<LiveView['board']>[number];
const Move=({n}:{n:number})=>n>0?<i className="up">▲{n}</i>:n<0?<i className="down">▼{-n}</i>:<i>–</i>;
// Puan, önceki değerinden yenisine hızlıca sayarak çıkar (satırın beliriş animasyonundan sonra başlar). Hareket azaltma tercihinde doğrudan son değer görünür.
function Count({from,to,delay=0}:{from:number;to:number;delay?:number}){const [n,setN]=useState(from);
useEffect(()=>{if(from===to)return;const still=matchMedia('(prefers-reduced-motion:reduce)').matches,t0=performance.now()+delay,
t=setInterval(()=>{const k=still?1:Math.min(1,Math.max(0,(performance.now()-t0)/1100));setN(Math.round(from+(to-from)*(1-(1-k)**3)));if(k>=1)clearInterval(t);},33);return()=>clearInterval(t);},[from,to,delay]);
return <>{n}</>;}
// Skor tablosu: satırlar önce soru öncesindeki sırasında görünür ve puanlar sayarak artar; sonra sırası değişenler kayarak yeni yerine geçer (ROW: satır yüksekliği + aralık, CSS ile aynı).
const ROW=60,SETTLE=2300;
function Board({rows,me}:{rows:Row[];me?:string}){const [settled,setSettled]=useState(()=>rows.every(r=>!r.move)||matchMedia('(prefers-reduced-motion:reduce)').matches);
useEffect(()=>{if(settled)return;const t=setTimeout(()=>setSettled(true),SETTLE);return()=>clearTimeout(t);},[settled]);
return <ol className={`live-board${settled?' settled':''}`}>{rows.map((r,i)=><li key={r.name} className={`${r.name===me?'me':''}${r.move>0?' rose':''}`} style={{animationDelay:`${Math.min(i,10)*60}ms`,transform:settled?undefined:`translateY(${r.move*ROW}px)`}}><span>{settled?i+1:i+1+r.move}</span><b><u aria-hidden="true">{r.avatar}</u> {r.name}{r.streak>=3&&<small> 🔥{r.streak}</small>}</b><Move n={r.move}/>{r.gain>0&&<em>+{r.gain}</em>}<strong className={r.gain>0?'up':''} style={{animationDelay:`${Math.min(i,10)*60+450}ms`}}><Count from={r.score-r.gain} to={r.score} delay={Math.min(i,10)*60+450}/></strong></li>)}</ol>;}
// Podyum sırayla açılır: önce üçüncü, sonra ikinci, davul sesinden sonra birinci (süreler CSS'teki gecikmelerle ve live-sound.ts'teki fanfarla aynıdır); birinciyle birlikte konfeti yağar.
const REVEAL=[4200,2200,600];
const CONFETTI=(()=>{const r=seeded('konfeti'),colors=['#e21b3c','#1368ce','#ffd166','#26890c','#ffffff'];return Array.from({length:70},()=>({left:r()*100,delay:r()*2.5,dur:2.6+r()*2.2,color:colors[Math.floor(r()*colors.length)],w:6+r()*8,rot:r()*360}));})();
const Confetti=()=><div className="live-confetti" aria-hidden="true">{CONFETTI.map((c,i)=><i key={i} style={{left:`${c.left}%`,width:c.w,height:c.w*1.6,background:c.color,rotate:`${c.rot}deg`,animationDelay:`${REVEAL[0]/1000+c.delay}s`,animationDuration:`${c.dur}s`}}/>)}</div>;
function Podium({rows}:{rows:Row[]}){return <div className="live-podium">{[1,0,2].map(i=>rows[i]&&<div key={i} className={`p${i+1}`}><span aria-hidden="true">{rows[i].avatar}</span><b>{['🥇','🥈','🥉'][i]} {rows[i].name}</b><small><Count from={0} to={rows[i].score} delay={REVEAL[i]+300}/> puan</small><div>{i+1}</div></div>)}</div>;}
// kahoot: oyun bölümündeki bağlantıyla gelinirse Tür'de baştan seçili olan hazır soru seti (lib/kahoot.ts).
export default function LiveGame({works,words,token,kahoot='',onExit}:{works:Work[];words:Word[];token:string;kahoot?:string;onExit:()=>void}){
const [pin,setPin]=useState(()=>urlPin()||readSession(livePinKey,'')),[code,setCode]=useState(''),[view,setView]=useState<LiveView|null>(null),[got,setGot]=useState(0),[now,setNow]=useState(0);
const [name,setName]=useState(()=>{try{return localStorage.getItem(nameKey)||'';}catch{return '';}}),[error,setError]=useState(''),[busy,setBusy]=useState(false),[qr,setQr]=useState('');
const [avatar,setAvatar]=useState(()=>{try{const a=localStorage.getItem(avatarKey)||'';return AVATARS.includes(a)?a:AVATARS[0];}catch{return AVATARS[0];}}),[muted,setMute]=useState(isMuted),[full,setFull]=useState(false);
const [label,setLabel]=useState(''),[ask,setAsk]=useState(()=>KAHOOTS[kahoot]?`kahoot:${kahoot}`:'word'),[group,setGroup]=useState(''),[count,setCount]=useState(10),[time,setTime]=useState(20);
const set=ask.startsWith('kahoot:')?ask.slice(7):'',kit=KAHOOTS[set];
const secret=useMemo(()=>pin?hosts()[pin]??'':'',[pin]);
function take(v:LiveView){const t=clock();setView(v);setGot(t);setNow(t);}
function leave(msg=''){setPin('');setView(null);setError(msg);writeSession(livePinKey,'');const p=new URLSearchParams(location.search);if(p.has('canli')){p.delete('canli');history.replaceState(null,'',`?${p}`);}}
async function post(body:Record<string,unknown>){const r=await fetch(base+'/api/live',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),d=await r.json();if(!r.ok)throw Object.assign(Error(d.error),{status:r.status});return d;}
async function act(body:Record<string,unknown>){if(busy)return;setBusy(true);setError('');try{take(await post({pin,...body}));}catch(e){const x=e as Error&{status?:number};if(x.status===404)leave(x.message);else setError(x.message||'İstek gönderilemedi. Tekrar dene.');}finally{setBusy(false);}}
async function create(){if(busy)return;setBusy(true);setError('');try{const d=await post({action:'create',label:label.trim()||kit?.title||'',ask,kahoot:set,group,count,time});try{localStorage.setItem(hostKey,JSON.stringify({...Object.fromEntries(Object.entries(hosts()).slice(-20)),[d.pin]:d.host}));}catch{}setPin(d.pin);}catch(e){setError(e instanceof Error?e.message:'Oyun açılamadı.');}finally{setBusy(false);}}
function join(){try{localStorage.setItem(nameKey,name.trim());localStorage.setItem(avatarKey,avatar);}catch{}void act({action:'join',name:name.trim(),avatar,token});}
useEffect(()=>{if(pin)writeSession(livePinKey,pin);},[pin]);
// Yoklama: oyun bulunamazsa (yanlış PIN, kapanmış oyun) giriş ekranına dönülür.
useEffect(()=>{if(!pin)return;let on=true;const load=()=>fetch(`${base}/api/live?pin=${pin}&${secret?`host=${secret}`:`token=${token}`}`).then(async r=>{const d=await r.json();if(!on)return;if(r.status===404)leave(d.error);else if(r.ok)take(d);}).catch(()=>{});
load();const t=setInterval(load,1000);return()=>{on=false;clearInterval(t);};},[pin,secret,token]);
const phase=view?.phase;
useEffect(()=>{if(phase!=='question')return;const t=setInterval(()=>setNow(clock()),200);return()=>clearInterval(t);},[phase]);
const link=pin?`${location.origin}${base}/?bolum=oyun&canli=${pin}`:'';
useEffect(()=>{let on=true;if(link&&secret)QRCode.toDataURL(link,{width:220,margin:2,color:{dark:'#1d0b40',light:'#ffffff'}}).then(u=>{if(on)setQr(u);}).catch(()=>{});return()=>{on=false;};},[link,secret]);
// Şıkların açılmasına (intro) ve sorunun kapanmasına (left) kalan saniye: sunucunun bildirdiği süreden bu cihazda geçen süre düşülür.
const isHost=!!view?.host,vq=phase==='question'?view?.q:undefined,spent=Math.max(now,got)-got,intro=vq?Math.max(0,vq.intro-spent)/1000:0,left=vq?Math.max(0,Math.min((view?.time??0)*1000,vq.left-spent))/1000:0;
const opened=!!vq&&!intro,beep=opened&&left>0&&left<=5?Math.ceil(left):0,ok=view?.me?.ok,joined=view?.count??0,at=view?.at;
// Sesler: tahtada (öğretmen ekranı) müzik çalar; herkes soru, cevap, tablo ve podyum seslerini kendi cihazında duyar.
useEffect(()=>{if(!phase){music(null);return;}if(isHost)music(phase==='lobby'?'lobby':phase==='question'?'think':null);
if(phase==='question')sfx.start();else if(phase==='reveal'){if(isHost)sfx.reveal();else if(ok)sfx.correct();else sfx.wrong();}else if(phase==='board')sfx.board();else if(phase==='end')sfx.fanfare();},[phase,isHost,at,ok]);
useEffect(()=>()=>music(null),[]);
useEffect(()=>{if(isHost&&phase==='lobby'&&joined)sfx.join();},[joined,isHost,phase]);
useEffect(()=>{if(opened)sfx.open();},[opened]);
useEffect(()=>{if(beep)sfx.tick();},[beep]);
useEffect(()=>{const h=()=>setFull(!!document.fullscreenElement);document.addEventListener('fullscreenchange',h);return()=>document.removeEventListener('fullscreenchange',h);},[]);
const toggleFull=()=>{if(document.fullscreenElement)void document.exitFullscreen();else void document.querySelector('.live-stage')?.requestFullscreen().catch(()=>{});};
const pool=words.filter(w=>!group||w.work===group),active=works.filter(k=>words.some(w=>w.work===k.id));
const err=error&&<p className="error" role="alert">{error}</p>;
// Giriş: öğrenci PIN yazar, öğretmen oyun açar.
if(!pin)return <section className="standalone game live"><header className="game-hero live-hero"><div><div className="eyebrow">CANLI YARIŞMA</div><h1>Birlikte <em>oyna.</em></h1><p>Öğretmen oyunu açar, herkes kendi cihazından PIN ile bağlanır. Sorular öğretmenin hızıyla ilerler; hızlı ve doğru cevap daha çok puan getirir.</p></div></header>
<div className="game-panel"><div className="class-forms">
<form onSubmit={e=>{e.preventDefault();setError('');setPin(code);}}><b>Öğrenci: oyuna katıl</b><small>Tahtadaki 6 haneli oyun PIN’ini yaz.</small><div className="guess-text"><label className="sr-only" htmlFor="live-pin">Oyun PIN’i</label><input id="live-pin" inputMode="numeric" autoComplete="off" maxLength={6} placeholder="Oyun PIN’i" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))}/><button className="primary" disabled={code.length!==6}>Katıl</button></div></form>
<form onSubmit={e=>{e.preventDefault();void create();}}><b>Öğretmen: oyun aç</b><small>Ayarları seç; açılan ekranı tahtaya yansıt.</small>
<div className="live-settings"><label>Oyun adı<input maxLength={40} placeholder="ör. 9-B" value={label} onChange={e=>setLabel(e.target.value)}/></label>
<label>Tür<select value={ask} onChange={e=>setAsk(e.target.value)}><option value="word">Terimi Bul (tanımdan terime)</option><option value="meaning">Tanımını Bul (terimden tanıma)</option>{Object.entries(KAHOOTS).map(([id,k])=><option key={id} value={`kahoot:${id}`}>{k.emoji} Kahoot: {k.title} ({k.rows.length} soru)</option>)}</select></label>
{!kit&&<>
<label>Çalışma grubu<select value={group} onChange={e=>setGroup(e.target.value)}><option value="">Bütün çalışma grupları</option>{active.map(k=><option key={k.id} value={k.id}>{emojiOf(k.id)} {k.title}</option>)}</select></label>
<label>Soru sayısı<select value={count} onChange={e=>setCount(Number(e.target.value))}>{[5,10,15,20].map(n=><option key={n} value={n}>{n} soru</option>)}</select></label></>}
<label>Süre<select value={time} onChange={e=>setTime(Number(e.target.value))}>{[10,20,30].map(n=><option key={n} value={n}>{n} saniye</option>)}</select></label></div>
<button className="primary" disabled={busy||(!kit&&pool.length<4)}>{!kit&&pool.length<4?'Bu grupta yeterli terim yok':'Oyunu aç ↗'}</button></form></div>
{err}<div className="button-row start"><button className="text-button" onClick={onExit}>← Tek kişilik oyuna dön</button></div></div></section>;
const stage=(body:React.ReactNode,cls='')=><section className="standalone game live"><div className={`live-stage ${cls}`}>{view&&<div className="live-top"><span>PIN <b>{spaced(view.pin)}</b></span><span>{view.label}</span>{view.at>=0&&<span>Soru <b>{view.at+1}</b>/{view.total}</span>}<span>👥 <b>{view.count}</b></span><button className="live-icon" title={muted?'Sesi aç':'Sesi kapat'} aria-label={muted?'Sesi aç':'Sesi kapat'} onClick={()=>{setMuted(!muted);setMute(!muted);}}><span aria-hidden="true">{muted?'🔇':'🔊'}</span> {muted?'Ses kapalı':'Ses açık'}</button><button className="live-icon" title={full?'Tam ekrandan çık':'Tam ekran'} aria-label={full?'Tam ekrandan çık':'Tam ekran'} onClick={toggleFull}><span aria-hidden="true">⛶</span> {full?'Tam ekrandan çık':'Tam ekran'}</button><button className="live-icon exit" onClick={()=>leave()}><span aria-hidden="true">✕</span> Çık</button></div>}{body}{err}</div></section>;
if(!view)return stage(<p className="live-wait">Bağlanılıyor…</p>);
const {q,result,me,board}=view,host=view.host,last=view.at+1>=view.total;
const next=(t:string)=><button className="live-next" disabled={busy} onClick={()=>void act({action:'next',host:secret})}>{t}</button>;
// Henüz katılmamış (ya da öğretmenin çıkardığı) öğrenci: ad sorulur.
if(!host&&!me)return stage(phase==='end'?<><h2 className="live-title">Bu oyun bitti.</h2>{board&&<Podium rows={board}/>}</>:<form className="live-join" onSubmit={e=>{e.preventDefault();join();}}><h2 className="live-title">Adın ne?</h2><p>Adın ve avatarın tahtada herkese görünür.</p><div className="live-avatars" role="radiogroup" aria-label="Avatar">{AVATARS.map(a=><button type="button" key={a} role="radio" aria-checked={avatar===a} className={avatar===a?'chosen':''} onClick={()=>setAvatar(a)}>{a}</button>)}</div><label className="sr-only" htmlFor="live-name">Adın</label><input id="live-name" autoFocus autoComplete="off" maxLength={20} placeholder="ör. Elif K." value={name} onChange={e=>setName(e.target.value)}/><button className="live-next" disabled={busy||name.trim().length<2}>Katıl ↗</button></form>);
const tiles=q&&(intro?<div className="live-intro" role="status"><b>Soru {view.at+1}</b><div><span style={{width:`${100-Math.min(100,intro/4*100)}%`}}/></div><small>Şıklar {Math.ceil(intro)} saniye sonra açılıyor</small></div>:<div className={`live-tiles${q.options.some(o=>o.length>40)?' long':''}${phase==='question'?' fresh':''}`}>{q.options.map((o,i)=>{const cls=`live-tile c${i}${result?i===result.correct?' correct':' faded':me&&me.choice!==null&&me.choice!==i?' faded':''}${me?.choice===i?' picked':''}`,
inner=<><i aria-hidden="true">{SHAPES[i]}</i><span>{o}</span>{result&&i===result.correct&&<em>✓</em>}</>;
return host||result?<div key={i} className={cls}>{inner}</div>:<button key={i} className={cls} disabled={busy||me?.choice!==null||left<=0} onClick={()=>void act({action:'answer',token,choice:i})}>{inner}</button>;})}</div>);
// Cevap dağılımı: her şık için aşağıdan yükselen çubuk.
const bars=q&&result&&<div className="live-bars" aria-label="Cevap dağılımı">{result.counts.map((c,i)=><div key={i} className={`c${i}${i===result.correct?' correct':''}`}><b>{i===result.correct&&'✓ '}{c}</b><span style={{height:6+c/Math.max(1,...result.counts)*90}}/><i aria-hidden="true">{SHAPES[i]}</i></div>)}</div>;
const question=q&&<div className="live-question" key={view.at}>{q.image&&<img src={q.image} alt=""/>}<div>{q.tag&&<small>{q.tag}</small>}<h2>{q.prompt}</h2></div></div>;
const timer=q&&phase==='question'&&!intro&&<div className={`live-timer${left<=5?' low':''}`} role="timer" aria-label={`${Math.ceil(left)} saniye kaldı`}><b>{Math.ceil(left)}</b><div><span style={{width:`${left/view.time*100}%`}}/></div><small>{q.answered}/{view.count} cevap</small></div>;
if(phase==='end'&&board)return stage(<><h2 className="live-title">{host?'🏆 Podyum':me&&me.rank<=3?'🎉 Podyumdasın!':`${me?.rank}. oldun`}</h2>{me&&<p className="live-sub">{me.name} · {me.score} puan</p>}<Podium rows={board}/>{board.length>3&&<div className="live-after"><Board rows={board} me={me?.name}/></div>}<button className="live-next" onClick={()=>leave()}>{host?'Yeni oyun':'Bitir'}</button><Confetti/></>);
if(phase==='board'&&board){const s=view.stars;return stage(<><h2 className="live-title">Skor tablosu</h2>
{s&&(s.riser||s.fastest||s.streak)&&<ul className="live-stars">{s.riser&&<li><span aria-hidden="true">🚀</span><small>En çok yükselen</small><b>{s.riser.name}</b><em>▲{s.riser.move} sıra</em></li>}{s.fastest&&<li><span aria-hidden="true">⚡</span><small>En hızlı doğru</small><b>{s.fastest.name}</b><em>{s.fastest.secs} sn</em></li>}{s.streak&&<li><span aria-hidden="true">🔥</span><small>Seride</small><b>{s.streak.name}</b><em>{s.streak.streak} doğru üst üste</em></li>}</ul>}
{me&&<p className="live-sub">{me.rank}. sıradasın · {me.score} puan{me.move>0?` · ▲ ${me.move} sıra yükseldin`:me.move<0?` · ▼ ${-me.move} sıra düştün`:''}</p>}
<Board rows={board} me={me?.name}/>{host?next('Sonraki soru →'):<p className="live-wait">Öğretmen sonraki soruya geçince devam edeceksin.</p>}</>);}
if(host){if(phase==='lobby')return stage(<><div className="live-lobby"><div><p>Oyun bölümündeki kod kutusuna bu PIN’i yaz ya da kare kodu okut</p><b className="live-pin">{spaced(view.pin)}</b><small>{link}</small></div>{qr&&<img src={qr} alt="Oyuna katılma kare kodu" width={220} height={220}/>}</div>
<h2 className="live-title">{view.count?`${view.count} oyuncu bağlandı`:'Oyuncular bekleniyor…'}</h2>
<ul className="live-names">{view.players?.map(p=><li key={p.name}><button title="Oyundan çıkar" onClick={()=>void act({action:'kick',host:secret,name:p.name})}><span aria-hidden="true">{p.avatar}</span> {p.name}</button></li>)}</ul>
{!!view.count&&<p className="live-wait">Uygunsuz bir adı çıkarmak için üstüne dokun.</p>}{next('Oyunu başlat ↗')}</>);
return stage(<>{question}{timer}{bars}{tiles}{result&&<p className="live-sub">Doğru cevap: <b>{result.answer}</b></p>}{next(phase==='question'?'Süreyi bitir, cevabı göster':last?'Podyuma geç 🏆':'Skor tablosu →')}</>);}
if(!me)return stage(null);
if(phase==='lobby')return stage(<><h2 className="live-title">İçeridesin!</h2><p className="live-me"><span aria-hidden="true">{me.avatar}</span> {me.name}</p><p className="live-wait">Adını tahtada görüyor musun? Öğretmen oyunu başlatınca soru burada açılır.</p></>);
if(phase==='question')return stage(<>{question}{timer}{tiles}{me.choice!==null&&<p className="live-wait">Cevabın alındı. Herkes cevaplayınca ya da süre bitince sonuç açılır.</p>}</>);
return stage(<><div className={`live-verdict ${me.ok?'ok':'no'}`} role="status"><b>{me.ok?'✓ Doğru!':me.choice===null?'⏱ Süre doldu':'✗ Yanlış'}</b>{me.ok?<span>+{me.points} puan</span>:<span>Seri sıfırlandı</span>}{me.ok&&me.streak>=2&&<em><i aria-hidden="true">🔥</i> {me.streak} doğru üst üste!</em>}</div>
{question}{bars}{tiles}<p className="live-sub">{me.rank}. sıradasın · {me.score} puan</p><p className="live-wait">Öğretmen ilerletince devam edeceksin.</p></>,me.ok?'ok':'no');}
