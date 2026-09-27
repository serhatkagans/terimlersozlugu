'use client';
import {useState} from 'react';
import {coverOf,emojiOf,kindOf,type Word,type Work} from '../lib/words';
import {inTitle,mask} from '../lib/game';
import {Guess,hint,Meanings,ModeToggle,Pic,useSessionSet,type GuessMode} from './dict-ui';
function Cover({k,covers,small=false}:{k:Work;covers:Record<string,number>;small?:boolean}){const src=coverOf(k.id,covers);return src?<img className="work-cover" src={src} alt={`${k.title} kapağı`}/>:<div className={`work-cover work-cover-empty${small?' small':''}`} role="img" aria-label={`${k.title} simgesi`}><span className="group-emoji" aria-hidden="true">{emojiOf(k.id)}</span><b>{k.title}</b></div>;}
// Çalışma grubu kartları: kapak/simge + tanıtım + terim sayısı. Gruba girilince terimler maskeli gelir, doğru tahminle açılır (oturum boyunca açık kalır).
// Adı grubun adında geçen terimler (Robotik → robot) bilmece olamayacağı için baştan açık gelir.
export default function WorksView({words,works,ill,covers,onAdd}:{words:Word[];works:Work[];ill:Record<string,number>;covers:Record<string,number>;onAdd:(work:string)=>void}){
const [open,setOpen]=useState(''),[active,setActive]=useState(''),[mode,setMode]=useState<GuessMode>('choice'),[opened,markOpened]=useSessionSet('gt-grup-acilan');
const title=(id:string)=>works.find(x=>x.id===id)?.title??'',isOpen=(w:Word)=>opened.has(w.id)||inTitle(w.word,title(w.work));
const of=(id:string)=>words.filter(w=>w.work===id),solved=(id:string)=>of(id).filter(isOpen).length,riddles=(id:string)=>of(id).some(w=>!inTitle(w.word,title(id)));
const k=works.find(x=>x.id===open);
if(!k)return <section className="standalone"><div className="eyebrow">GENÇTEK ÇALIŞMA GRUPLARI</div><h1>Çalışma <em>grupları.</em></h1><p>Her çalışma grubunun kendi terim hazinesi var. Bir grubu seç; terimler gizli gelir. Kısa tanımından yola çıkarak her terimi tahmin et ve grubun bütün kartlarını aç.</p>
<div className="works-grid">{works.map(x=>{const n=of(x.id).length,s=solved(x.id),complete=riddles(x.id)&&s===n;return <button key={x.id} className={`work-card${complete?' complete':''}`} onClick={()=>{setOpen(x.id);setActive('');scrollTo({top:0,behavior:'smooth'});}}>
<Cover k={x} covers={covers} small/>{complete&&<span className="done-badge">✓ Tamamlandı</span>}<div><h2>{x.title}</h2><p>{x.author}</p><div className="work-meta"><span>{n} terim</span>{n>0&&<span>{s}/{n} açıldı</span>}</div>{n>0&&<progress max={n} value={s} aria-label={`${s} / ${n} terim açıldı`}/>}</div></button>;})}</div></section>;
const list=of(k.id),count=solved(k.id),complete=riddles(k.id)&&count===list.length;
return <section className="standalone work-detail"><button className="text-button" onClick={()=>setOpen('')}>← Bütün çalışma grupları</button>
<header className={`work-hero${complete?' complete':''}`}><Cover k={k} covers={covers}/><div><div className="eyebrow">ÇALIŞMA GRUBU</div><h1>{emojiOf(k.id)} {k.title}</h1><p>{k.author}</p><div className="work-meta"><span>{list.length} terim</span><span>{count}/{list.length} açıldı</span></div>{list.length>0&&<progress max={list.length} value={count}/>}{complete&&<p className="complete-banner" role="status"><span>✦</span> Tamamlandı! Bu grubun bütün terimlerini açtın.</p>}</div></header>
{!list.length?<div className="empty"><h2>Bu grubun sözlüğü henüz boş.</h2><p>Grubun çalışmalarında karşılaştığın bir terimi tanımı ve örnek cümlesiyle gönder. Görevli onaylayınca burada görünür.</p><button className="primary" onClick={()=>onAdd(k.id)}>+ İlk terimi sen ekle</button></div>:<>
<div className="work-tools"><ModeToggle mode={mode} setMode={setMode}/><button className="text-button" onClick={()=>onAdd(k.id)}>+ Bu gruba terim ekle</button></div>
<div className="mask-grid">{list.map(w=>{const shown=isOpen(w);return <article key={w.id} className={`mask-card${shown?' opened':''}${active===w.id?' active':''}`}>
{shown?<><Pic w={w} ill={ill}/><div><h3>{w.word}{w.syllables&&w.syllables!==w.word&&<small> · {w.syllables}</small>}</h3><Meanings w={w} k={k}/><p className="entry-example">“{w.example}”</p></div></>
:<><button className="mask-face" aria-expanded={active===w.id} onClick={()=>setActive(active===w.id?'':w.id)}><span className="masked" aria-label={`${[...w.word].length} karakterli gizli terim`}>{mask(w.word,.5,w.id)}</span><span className="mask-hint"><small>{kindOf(k).oldShort.toLocaleUpperCase('tr')}</small>{hint(w)}</span>{active!==w.id&&<span className="mask-cta">Tahmin et ↗</span>}</button>
{active===w.id&&<Guess key={mode} w={w} pool={words} mode={mode} retry onDone={()=>{markOpened(w.id);setActive('');}}/>}</>}</article>;})}</div></>}</section>;}
