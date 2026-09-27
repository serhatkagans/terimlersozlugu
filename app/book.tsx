'use client';
import {useMemo,useState} from 'react';
import {emojiOf,workOf,type Word,type Work} from '../lib/words';
import {pages,seeded,shuffle} from '../lib/game';
import {hint,Meanings,Pic,useSessionSet} from './dict-ui';
type Page={key:string;group:string;title:string;sub:string;emoji:string;words:Word[];part:number;parts:number};
const perPage=5;
// Onaylı terimler çalışma grubu sırasıyla dizilir; her grup kendi bölümüdür ve 4–6 maddelik sayfalara bölünür.
export function bookPages(words:Word[],works:Work[]):Page[]{
return works.flatMap(k=>{const list=pages(words.filter(w=>w.work===k.id),perPage);return list.map((ws,i)=>({group:k.id,title:k.title,sub:k.author,emoji:emojiOf(k.id),key:`${k.id}:${i}`,words:ws,part:i+1,parts:list.length}));});}
// Sayfa sonu eşleştirme: soldaki terime, sonra sağdaki tanımına tıklanır.
function Matching({page,done,complete}:{page:Page;done:boolean;complete:()=>void}){
const left=useMemo(()=>shuffle(page.words,seeded(page.key+'k')),[page]),right=useMemo(()=>shuffle(page.words,seeded(page.key+'a')),[page]);
const [pick,setPick]=useState(''),[matched,setMatched]=useState<string[]>(()=>done?page.words.map(w=>w.id):[]),[miss,setMiss]=useState(''),[msg,setMsg]=useState('');
function choose(id:string){if(matched.includes(id))return;if(!pick){setMsg('Önce soldan bir terim seç.');return;}
if(id===pick){const next=[...matched,id];setMatched(next);setPick('');setMsg('Doğru eşleşme!');if(next.length===page.words.length)complete();}
else{setMiss(id);setMsg('Bu tanım o terime ait değil. Tekrar dene.');setTimeout(()=>setMiss(''),600);}}
const all=matched.length===page.words.length;
return <section className={`matching${all?' matching-done':''}`} aria-label="Sayfa sonu eşleştirme"><header><h3>Eşleştir</h3><small>Terime, sonra tanımına dokun.</small>{all&&<span className="done-badge">✓ Tamamlandı</span>}</header>
<div className="match-cols"><div>{left.map(w=><button key={w.id} className={matched.includes(w.id)?'matched':pick===w.id?'picked':''} disabled={matched.includes(w.id)} aria-pressed={pick===w.id} onClick={()=>{setPick(w.id);setMsg('');}}>{w.word}</button>)}</div>
<div>{right.map(w=><button key={w.id} className={matched.includes(w.id)?'matched':miss===w.id?'missed':''} disabled={matched.includes(w.id)} onClick={()=>choose(w.id)}>{hint(w)}</button>)}</div></div>
<p className="match-msg" role="status">{all?'Harika! Bu sayfanın bütün terimlerini eşleştirdin.':msg}</p></section>;}
export default function Book({words,works,ill,onAdd}:{words:Word[];works:Work[];ill:Record<string,number>;onAdd:()=>void}){
const list=useMemo(()=>bookPages(words,works),[words,works]);
const [at,setAt]=useState(0),[dir,setDir]=useState<'next'|'prev'>('next'),[done,markDone]=useSessionSet('gt-kitap-tamam');
const go=(i:number)=>{if(i<0||i>=list.length)return;setDir(i>at?'next':'prev');setAt(i);};
if(!list.length)return <section className="standalone"><h1>Terimler <em>sözlüğü.</em></h1><div className="empty"><h2>Sözlük henüz boş.</h2><p>Görevli onayından geçen terimler burada sayfa sayfa dizilir.</p><button className="primary" onClick={onAdd}>+ İlk terimi ekle</button></div></section>;
const page=list[Math.min(at,list.length-1)];
return <section className="standalone book-view"><div className="eyebrow">GRUP GRUP, SAYFA SAYFA</div><h1>Terimler <em>sözlüğü.</em></h1><p>GençTek çalışma gruplarının temel terimleri. Her sayfada terimin karşılığı, kısa tanımı, açıklaması ve örnek kullanımı var; sayfa sonunda terimleri tanımlarıyla eşleştir.</p>
<nav className="chips book-toc" aria-label="İçindekiler">{list.map((p,i)=>p.part===1&&<button key={p.key} className={page.group===p.group?'chosen':''} onClick={()=>go(i)}>{p.emoji} {p.title}{list.filter(x=>x.group===p.group).every(x=>done.has(x.key))&&' ✓'}</button>)}</nav>
<div className="book-stage"><article key={page.key} className={`book-page turn-${dir}`}>
<header className="book-head"><span>{page.emoji} {page.title}{page.parts>1&&` · ${page.part}/${page.parts}`}</span><span>{page.sub}</span><b>{at+1}</b></header>
<ol className="entries">{page.words.map(w=>{const k=workOf(works,w);return <li key={w.id}><div><h2>{w.word}{w.syllables&&w.syllables!==w.word&&<small>{w.syllables}</small>}</h2><Meanings w={w} k={k}/><p className="entry-example">“{w.example}”</p>{w.addedBy&&<small className="entry-by">Ekleyen: {w.addedBy}</small>}</div><Pic w={w} ill={ill}/></li>;})}</ol>
<Matching key={page.key} page={page} done={done.has(page.key)} complete={()=>markDone(page.key)}/>
<div className="book-foot">— {at+1} —</div></article></div>
<div className="book-nav"><button className="secondary" disabled={at===0} onClick={()=>go(at-1)}>← Önceki sayfa</button><span>Sayfa {at+1} / {list.length}{done.has(page.key)&&' · ✓'}</span><button className="primary" disabled={at===list.length-1} onClick={()=>go(at+1)}>Sonraki sayfa →</button></div>
<p className="source-note">Sözlükte olmayan bir terim mi var? <button className="text-button" onClick={onAdd}>+ Sözlüğe terim ekle</button></p></section>;}
