'use client';
import {useState} from 'react';
import {kindOf,ownArt,type Word,type Work} from '../lib/words';
import {choices,sameWord} from '../lib/game';
// Sözlük, Çalışma Grupları ve Tahmin Oyunu'nun ortak parçaları.
export const hint=(w:Word)=>w.oldMeaning||w.meaning;
// Terime özel görsel; yoksa nötr "Görsel bekleniyor" alanı (ortak hazır resimler burada kullanılmaz).
export function Pic({w,ill,className=''}:{w:Word;ill:Record<string,number>;className?:string}){const src=ownArt(w,ill);
return src?<img className={`dict-pic ${className}`} src={src} alt={`${w.word} terimini anlatan görsel`} loading="lazy"/>:<span className={`dict-pic dict-pic-empty ${className}`} role="img" aria-label="Görsel bekleniyor"><span>✎</span>Görsel bekleniyor</span>;}
// Tanım satırları: kısa tanım ve (farklıysa) açıklama.
export function Meanings({w,k}:{w:Word;k?:Work}){const l=kindOf(k);return <dl className="meanings">{w.oldMeaning&&<><dt>{l.oldShort}</dt><dd>{w.oldMeaning}</dd></>}{w.meaning!==w.oldMeaning&&<><dt>{l.nowShort}</dt><dd>{w.meaning}</dd></>}</dl>;}
// Oturum boyunca (sekme kapanana dek) hatırlanan değer. Bu bölümler yalnızca istemcide, sekme açılınca çizildiği için ilk değer doğrudan okunur.
export function readSession<T>(key:string,fallback:T):T{try{const v=sessionStorage.getItem(key);return v?JSON.parse(v) as T:fallback;}catch{return fallback;}}
export function writeSession(key:string,value:unknown){try{sessionStorage.setItem(key,JSON.stringify(value));}catch{}}
// Oturum boyunca hatırlanan küme: açılan kartlar, tamamlanan sayfalar.
export function useSessionSet(key:string){const [set,setSet]=useState<Set<string>>(()=>{const v=readSession<unknown>(key,[]);return new Set(Array.isArray(v)?v.filter(x=>typeof x==='string'):[]);});
const add=(id:string)=>setSet(s=>{if(s.has(id))return s;const n=new Set(s).add(id);writeSession(key,[...n]);return n;});return [set,add] as const;}
export type GuessMode='choice'|'text';
export function ModeToggle({mode,setMode}:{mode:GuessMode;setMode:(m:GuessMode)=>void}){return <div className="chips mode-toggle" role="radiogroup" aria-label="Tahmin şekli">{([['choice','Şıklardan seç'],['text','Yazarak tahmin et']] as const).map(([k,t])=><button key={k} role="radio" aria-checked={mode===k} className={mode===k?'chosen':''} onClick={()=>setMode(k)}>{t}</button>)}</div>;}
// Tek terimlik tahmin: şıklar ya da serbest metin. `retry` açıkken yanlış cevapta tekrar denenir; kapalıyken ilk cevap sonuçtur.
// ask="meaning" ("Tanımını Bul"): terim görünür, şıklar tanımlardır; bu yönde yalnızca şıklı cevap vardır.
export function Guess({w,pool,mode:asked,retry,onDone,ask='word'}:{w:Word;pool:Word[];mode:GuessMode;retry:boolean;onDone:(ok:boolean)=>void;ask?:'word'|'meaning'}){
const mode:GuessMode=ask==='meaning'?'choice':asked;
const [options]=useState(()=>choices(w,pool,4,Math.random,ask==='meaning'?hint:undefined)),[text,setText]=useState(''),[wrong,setWrong]=useState<string[]>([]),[msg,setMsg]=useState(''),[shake,setShake]=useState(0);
function answer(ok:boolean,id=''){if(ok||!retry)return onDone(ok);setWrong(x=>[...x,id]);setShake(n=>n+1);setMsg(['Olmadı, bir daha dene!','Yaklaştın mı? Tanımı tekrar oku.','Harflere dikkat et, tekrar dene.'][wrong.length%3]);}
return <div className={`guess${shake?' shake':''}`} key={shake}>{mode==='choice'?<div className="guess-options">{options.map(o=><button key={o.id} className={`secondary${ask==='meaning'?' meaning-option':''}`} disabled={wrong.includes(o.id)} onClick={()=>answer(o.id===w.id,o.id)}>{ask==='meaning'?hint(o):o.word}</button>)}</div>
:<form className="guess-text" onSubmit={e=>{e.preventDefault();if(text.trim())answer(sameWord(text,w.word),text);setText('');}}><label className="sr-only" htmlFor={`g-${w.id}`}>Tahminin</label><input id={`g-${w.id}`} autoFocus autoComplete="off" maxLength={40} placeholder="Terimi yaz…" value={text} onChange={e=>setText(e.target.value)}/><button className="primary" disabled={!text.trim()}>Tahmin et</button></form>}
{msg&&<p className="guess-msg" role="status">{msg}</p>}{mode==='text'&&<small className="guess-note">Büyük/küçük harf, boşluk ve işaretler önemsenmez: “ab testi”, “nodejs” de doğru sayılır.</small>}</div>;}
