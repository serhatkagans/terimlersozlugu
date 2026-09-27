'use client';
import {useState} from 'react';
import {emojiOf,kindOf,workOf,type Word,type Work} from '../lib/words';
import {fold,inTitle,mask} from '../lib/game';
import {Guess,hint,Meanings,ModeToggle,Pic,readSession,writeSession,type GuessMode} from './dict-ui';
const levels={kolay:{label:'Kolay',ratio:.3},zor:{label:'Zor',ratio:.7}};
type Level=keyof typeof levels;type Ask='word'|'meaning';type Score={right:number;total:number;streak:number;best:number};
const scoreKey='gt-tahmin-skor',zero:Score={right:0,total:0,streak:0,best:0};
// Önce bu turda görülmemiş terimler; hepsi görüldüyse (az önce sorulan hariç) baştan.
// Karşılık ipucu, terimin 3 harften uzun bir sözcüğünü içeriyorsa cevabı ele verir ("Dijkstra algoritması" → "Dijkstra's algorithm").
const leaks=(w:Word)=>!w.syllables||w.word.split(/[^p{L}p{N}]+/u).some(p=>fold(p).length>=3&&fold(w.syllables).includes(fold(p)));
function pick(list:Word[],history:string[],last:string){const fresh=list.filter(w=>!history.includes(w.id)&&w.id!==last),others=list.filter(w=>w.id!==last);const from=fresh.length?fresh:others.length?others:list;return from.length?from[Math.floor(Math.random()*from.length)]:null;}
// Genel tahmin oyunu: bütün sözlükten (isteğe göre çalışma grubuna göre süzülmüş) rastgele terim; skor yalnızca bu oturumda tutulur.
// İki yön: "Terimi Bul" (tanımdan maskeli terime) ve "Tanımını Bul" (terimden tanıma, şıklı).
export default function GuessGame({words,works,ill}:{words:Word[];works:Work[];ill:Record<string,number>}){
const [ask,setAsk]=useState<Ask>('word'),[group,setGroup]=useState(''),[level,setLevel]=useState<Level>('kolay'),[mode,setMode]=useState<GuessMode>('choice');
const [current,setCurrent]=useState<Word|null>(()=>pick(words,[],'')),[result,setResult]=useState<boolean|null>(null),[seen,setSeen]=useState<string[]>(()=>current?[current.id]:[]),[score,setScore]=useState<Score>(()=>({...zero,...readSession<Partial<Score>>(scoreKey,{})})),[round,setRound]=useState(0);
const pool=words.filter(w=>!group||w.work===group),active=works.filter(k=>words.some(w=>w.work===k.id));
function next(list=pool,history=seen){const w=pick(list,history,current?.id??'');const fresh=!!w&&!history.includes(w.id);setSeen(w?fresh?[...history,w.id]:[w.id]:[]);setCurrent(w);setResult(null);setRound(r=>r+1);}
function save(s:Score){setScore(s);writeSession(scoreKey,s);}
function done(ok:boolean){setResult(ok);const streak=ok?score.streak+1:0;save({right:score.right+(ok?1:0),total:score.total+1,streak,best:Math.max(score.best,streak)});}
function filter(id:string){setGroup(id);next(words.filter(w=>!id||w.work===id),[]);}
const k=current&&workOf(works,current),l=kindOf(k);
return <section className="standalone game"><div className="eyebrow">{group?`${emojiOf(group)} ${workOf(works,{work:group} as Word).title.toLocaleUpperCase('tr')}`:'TÜM SÖZLÜKTEN RASTGELE'}</div><h1>{ask==='word'?<>Terimi <em>bul.</em></>:<>Tanımını <em>bul.</em></>}</h1>
<div className="chips game-type" role="radiogroup" aria-label="Oyun">{([['word','Terimi Bul','Tanımı ver, terimi bul'],['meaning','Tanımını Bul','Terimi gör, tanımını seç']] as const).map(([a,t,d])=><button key={a} role="radio" aria-checked={ask===a} className={ask===a?'chosen':''} onClick={()=>{setAsk(a);next();}}><b>{t}</b><small>{d}</small></button>)}</div>
<p>{ask==='word'?'Harflerin bir kısmı gizli. Kısa tanımı ve çalışma grubunu ipucu olarak kullan, terimi bul.':'Terimi oku, dört tanımdan doğrusunu seç. Çeldiriciler çoğunlukla aynı çalışma grubundan gelir.'}</p>
<div className="game-bar"><div className="scoreboard" aria-live="polite"><span><b>{score.right}</b>/{score.total} doğru</span><span>🔥 Seri <b>{score.streak}</b></span><span>En iyi <b>{score.best}</b></span>{score.total>0&&<button className="text-button" onClick={()=>save(zero)}>Sıfırla</button>}</div></div>
<div className="game-filters"><label className="search group-select"><span aria-hidden="true">▦</span><select aria-label="Çalışma grubuna göre süz" value={group} onChange={e=>filter(e.target.value)}><option value="">Bütün çalışma grupları</option>{active.map(k=><option key={k.id} value={k.id}>{emojiOf(k.id)} {k.title}</option>)}</select></label>
{ask==='word'&&<><div className="chips" role="radiogroup" aria-label="Zorluk">{(Object.keys(levels) as Level[]).map(l=><button key={l} role="radio" aria-checked={level===l} className={level===l?'chosen':''} onClick={()=>setLevel(l)}>{levels[l].label} <small>%{levels[l].ratio*100} gizli</small></button>)}</div><ModeToggle mode={mode} setMode={setMode}/></>}</div>
{!current||!k?<div className="empty"><h2>Bu grupta henüz terim yok.</h2><button className="secondary" onClick={()=>filter('')}>Bütün gruplardan oyna</button></div>:
<article className={`game-card${result===true?' right':result===false?' wrong':''}`} key={round}>
{ask==='word'?<div className="masked big" aria-label={`${[...current.word].length} karakterli gizli terim`}>{result===null?mask(current.word,levels[level].ratio,current.id+level):[...current.word.toLocaleUpperCase('tr')].join(' ')}</div>:<div className="shown-word">{current.word}</div>}
<div className="game-hints">{ask==='word'?<p><small>{l.oldShort.toLocaleUpperCase('tr')}</small>{hint(current)}</p>:<p><small>SORU</small>Bu terimin tanımı hangisi?</p>}<p><small>ÇALIŞMA GRUBU</small>{ask==='word'&&result===null&&inTitle(current.word,k.title)?mask(k.title,1,k.id):`${emojiOf(k.id)} ${k.title}`}</p>{ask==='word'&&result===null&&!leaks(current)&&<p><small>KARŞILIĞI</small>{current.syllables}</p>}</div>
{result===null?<Guess key={ask+mode+round} w={current} pool={words} mode={mode} ask={ask} retry={false} onDone={done}/>:<div className="game-result"><p className="verdict" role="status">{result?'✓ Doğru bildin!':`✗ Olmadı. Doğru cevap: ${ask==='word'?current.word:hint(current)}`}</p>
<div className="game-explain"><Pic w={current} ill={ill}/><div><h2>{current.word}{current.syllables&&current.syllables!==current.word&&<small> · {current.syllables}</small>}</h2><Meanings w={current} k={k}/><p className="entry-example">“{current.example}”</p><small>{emojiOf(k.id)} {k.title}</small></div></div>
<button className="primary" autoFocus onClick={()=>next()}>Sonraki terim →</button></div>}</article>}</section>;}
