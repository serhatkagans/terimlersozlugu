'use client';
import {useId,useMemo,useState} from 'react';
import {emojiOf,workOf,type Word,type Work} from '../lib/words';
import {search} from '../lib/game';
import {hint} from './dict-ui';
// Başlıktaki genel arama: her bölümden terime ulaşılır. Ok tuşlarıyla gezilir, Enter ile terim açılır, Esc ile kapanır.
export default function SearchBox({words,works,onPick,onAdd}:{words:Word[];works:Work[];onPick:(w:Word)=>void;onAdd:()=>void}){
const id=useId(),[q,setQ]=useState(''),[open,setOpen]=useState(false),[at,setAt]=useState(0);
const results=useMemo(()=>q.trim()?search(words,q).slice(0,8):[],[q,words]);
const show=open&&!!q.trim();
function pick(w:Word){onPick(w);setQ('');setOpen(false);setAt(0);}
function key(e:React.KeyboardEvent){if(e.key==='Escape'){setOpen(false);return;}if(!results.length)return;
if(e.key==='ArrowDown'){e.preventDefault();setOpen(true);setAt(i=>(i+1)%results.length);}else if(e.key==='ArrowUp'){e.preventDefault();setAt(i=>(i-1+results.length)%results.length);}else if(e.key==='Enter'&&show){e.preventDefault();pick(results[Math.min(at,results.length-1)]);}}
return <div className="global-search" role="search"><span aria-hidden="true">⌕</span>
<input type="search" role="combobox" aria-label="Sözlükte terim ara" aria-expanded={show} aria-controls={`${id}-list`} aria-autocomplete="list" aria-activedescendant={show&&results.length?`${id}-${at}`:undefined} placeholder="Terim ara…" value={q} autoComplete="off"
 onChange={e=>{setQ(e.target.value);setOpen(true);setAt(0);}} onFocus={()=>setOpen(true)} onBlur={()=>setOpen(false)} onKeyDown={key}/>
{show&&<ul id={`${id}-list`} role="listbox" aria-label="Arama sonuçları">{results.map((w,i)=>{const k=workOf(works,w);return <li key={w.id} id={`${id}-${i}`} role="option" aria-selected={i===at} className={i===at?'active':''} onMouseDown={e=>{e.preventDefault();pick(w);}} onMouseEnter={()=>setAt(i)}>
<b>{w.word}{w.syllables&&w.syllables!==w.word&&<small> · {w.syllables}</small>}</b><span>{emojiOf(k.id)} {k.title} · {hint(w)}</span></li>;})}
{!results.length&&<li className="none" role="presentation">“{q.trim()}” sözlükte yok. <button type="button" className="text-button" onMouseDown={e=>{e.preventDefault();setQ('');setOpen(false);onAdd();}}>+ Terim öner</button></li>}</ul>}</div>;}
