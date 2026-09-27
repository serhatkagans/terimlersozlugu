'use client';
import {useState} from 'react';
import {base,emojiOf,kindOf,usesWord,type Work} from '../lib/words';
const empty={word:'',syllables:'',oldMeaning:'',meaning:'',example:''};
export function WorkOptions({works}:{works:Work[]}){return <>{works.map(k=><option key={k.id} value={k.id}>{emojiOf(k.id)} {k.title}</option>)}</>;}
// Terim önerme formu. Gönderilen terim görevli onayına düşer; onaylanana kadar sözlükte görünmez.
export default function SuggestForm({works,initialWork}:{works:Work[];initialWork:string}){
const [f,setF]=useState({...empty,work:initialWork||works[0]?.id||'',addedBy:''}),[busy,setBusy]=useState(false),[error,setError]=useState(''),[sent,setSent]=useState<string[]>([]);
const set=(k:keyof typeof f)=>(e:{target:{value:string}})=>{setF({...f,[k]:e.target.value});setError('');};
const work=works.find(k=>k.id===f.work),l=kindOf(work);
const exampleOk=!f.word.trim()||!f.example.trim()||usesWord(f.example,f.word.trim());
async function submit(){setBusy(true);setError('');try{const r=await fetch(base+'/api/words',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(f)});const d=await r.json();if(!r.ok)throw Error(d.error);setSent(s=>[f.word.trim(),...s]);setF({...f,...empty});}catch(e){setError(e instanceof Error?e.message:'Önerin gönderilemedi.');}finally{setBusy(false);}}
return <section className="standalone suggest"><div className="eyebrow">SÖZLÜĞÜ BİRLİKTE BÜYÜTÜYORUZ</div><h1>Sözlüğe <em>terim ekle.</em></h1><p>Çalışma grubunda karşılaştığın, sözlükte olmayan bir terim mi var? Grubu seç, terimin karşılığını, kısa tanımını ve bir örnek cümle yaz. Görevli onaylayınca sözlüğe, grup sayfasına ve oyunlara eklenir.</p>
{!!sent.length&&<div className="notice suggest-sent" role="status">✓ <b>{sent[0]}</b> görevli onayına gönderildi. {sent.length>1&&<small>Bu oturumda {sent.length} öneri gönderdin: {sent.join(', ')}.</small>}</div>}
<form className="suggest-form" onSubmit={e=>{e.preventDefault();void submit();}}>
<label>Çalışma grubu *<select required value={f.work} onChange={set('work')}><WorkOptions works={works}/></select>{work&&<small>{work.author}</small>}</label>
<div className="form-row"><label>{l.word} *<input required maxLength={80} placeholder={l.wordHint} value={f.word} onChange={set('word')}/></label><label>Karşılığı <small>(isteğe bağlı)</small><input maxLength={60} placeholder="Örn. Gölgelendirici" value={f.syllables} onChange={set('syllables')}/><small>İngilizce terimse Türkçesi, Türkçe terimse İngilizcesi.</small></label></div>
<label>{l.old} *<textarea required rows={2} maxLength={300} placeholder={l.oldHint} value={f.oldMeaning} onChange={set('oldMeaning')}/><small>Tek cümle yeterli; oyunlarda ipucu olarak gösterilir, terimin kendisini yazma.</small></label>
<label>{l.now} <small>(isteğe bağlı)</small><textarea rows={3} maxLength={300} placeholder={l.nowHint} value={f.meaning} onChange={set('meaning')}/></label>
<label>Örnek cümle *<textarea required rows={3} minLength={10} maxLength={240} placeholder="Terimi içeren kendi cümleni yaz…" value={f.example} onChange={set('example')}/><small className={exampleOk?'':'field-error'}>{exampleOk?`${f.example.length}/240 · Cümlende terim geçmeli.`:'Cümlende “'+f.word.trim()+'” geçmiyor.'}</small></label>
<label>Adın ve sınıfın <small>(isteğe bağlı)</small><input maxLength={40} placeholder="Örn. Elif, 10-B" value={f.addedBy} onChange={set('addedBy')}/><small>Soyadını, okulunu veya iletişim bilgini yazma.</small></label>
{error&&<p className="error" role="alert">{error}</p>}
<button className="primary wide" disabled={busy||!exampleOk}>{busy?'Gönderiliyor…':'Görevli onayına gönder ↗'}</button></form></section>;}
