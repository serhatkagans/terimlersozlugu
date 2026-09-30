'use client';
import {useEffect,useState} from 'react';
import {base,emojiOf,kindOf,usesWord,type Work} from '../lib/words';
const empty={word:'',syllables:'',oldMeaning:'',meaning:'',example:''};
// Önerilen görsel tarayıcıda en fazla 1200 px'e küçültülüp JPEG'e çevrilir (telefon fotoğrafları birkaç MB olabiliyor).
async function shrink(file:File):Promise<Blob>{const bmp=await createImageBitmap(file),k=Math.min(1,1200/Math.max(bmp.width,bmp.height));const c=document.createElement('canvas');c.width=Math.round(bmp.width*k);c.height=Math.round(bmp.height*k);
const g=c.getContext('2d')!;g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(bmp,0,0,c.width,c.height);bmp.close();return new Promise((ok,no)=>c.toBlob(b=>b?ok(b):no(Error('Görsel okunamadı.')),'image/jpeg',0.86));}
export function WorkOptions({works}:{works:Work[]}){return <>{works.map(k=><option key={k.id} value={k.id}>{emojiOf(k.id)} {k.title}</option>)}</>;}
// Terim önerme formu. Gönderilen terim (ve isteğe bağlı görseli) görevli onayına düşer; onaylanana kadar sözlükte görünmez.
export default function SuggestForm({works,initialWork}:{works:Work[];initialWork:string}){
const [f,setF]=useState({...empty,work:initialWork||works[0]?.id||'',addedBy:''}),[busy,setBusy]=useState(false),[error,setError]=useState(''),[sent,setSent]=useState<string[]>([]),[image,setImage]=useState<{blob:Blob;url:string}|null>(null),[drag,setDrag]=useState(false);
useEffect(()=>()=>{if(image)URL.revokeObjectURL(image.url);},[image]);
const set=(k:keyof typeof f)=>(e:{target:{value:string}})=>{setF({...f,[k]:e.target.value});setError('');};
const work=works.find(k=>k.id===f.work),l=kindOf(work);
const exampleOk=!f.word.trim()||!f.example.trim()||usesWord(f.example,f.word.trim());
async function pick(file?:File){setError('');if(!file)return;if(!/^image\/(png|jpeg|webp)$/.test(file.type)){setError('Görsel PNG, JPG ya da WEBP olmalı.');return;}try{const blob=await shrink(file);setImage({blob,url:URL.createObjectURL(blob)});}catch{setError('Bu görsel açılamadı. Başka bir dosya dene.');}}
async function submit(){setBusy(true);setError('');try{let body:BodyInit=JSON.stringify(f),headers:HeadersInit={'Content-Type':'application/json'};if(image){const fd=new FormData();fd.append('data',body);fd.append('image',image.blob,'oneri.jpg');body=fd;headers={};}
const r=await fetch(base+'/api/words',{method:'POST',headers,body});const d=await r.json();if(!r.ok)throw Error(d.error);setSent(s=>[f.word.trim(),...s]);setF({...f,...empty});setImage(null);}catch(e){setError(e instanceof Error?e.message:'Önerin gönderilemedi.');}finally{setBusy(false);}}
return <section className="standalone suggest"><div className="eyebrow">SÖZLÜĞÜ BİRLİKTE BÜYÜTÜYORUZ</div><h1>Sözlüğe <em>terim ekle.</em></h1><p>Çalışma grubunda karşılaştığın, sözlükte olmayan bir terim mi var? Grubu seç, terimin karşılığını, kısa tanımını ve bir örnek cümle yaz. Görevli onaylayınca sözlüğe, grup sayfasına ve oyunlara eklenir. İstersen terimi anlatan bir görsel de önerebilirsin.</p>
{!!sent.length&&<div className="notice suggest-sent" role="status">✓ <b>{sent[0]}</b> görevli onayına gönderildi. {sent.length>1&&<small>Bu oturumda {sent.length} öneri gönderdin: {sent.join(', ')}.</small>}</div>}
<form className="suggest-form" onSubmit={e=>{e.preventDefault();void submit();}}>
<label>Çalışma grubu *<select required value={f.work} onChange={set('work')}><WorkOptions works={works}/></select>{work&&<small>{work.author}</small>}</label>
<div className="form-row"><label>{l.word} *<input required maxLength={80} placeholder={l.wordHint} value={f.word} onChange={set('word')}/></label><label>Karşılığı <small>(isteğe bağlı)</small><input maxLength={60} placeholder="Örn. Gölgelendirici" value={f.syllables} onChange={set('syllables')}/><small>İngilizce terimse Türkçesi, Türkçe terimse İngilizcesi.</small></label></div>
<label>{l.old} *<textarea required rows={2} maxLength={300} placeholder={l.oldHint} value={f.oldMeaning} onChange={set('oldMeaning')}/><small>Tek cümle yeterli; oyunlarda ipucu olarak gösterilir, terimin kendisini yazma.</small></label>
<label>{l.now} <small>(isteğe bağlı)</small><textarea rows={3} maxLength={300} placeholder={l.nowHint} value={f.meaning} onChange={set('meaning')}/></label>
<label>Örnek cümle *<textarea required rows={3} minLength={10} maxLength={240} placeholder="Terimi içeren kendi cümleni yaz…" value={f.example} onChange={set('example')}/><small className={exampleOk?'':'field-error'}>{exampleOk?`${f.example.length}/240 · Cümlende terim geçmeli.`:'Cümlende “'+f.word.trim()+'” geçmiyor.'}</small></label>
<div className="suggest-image"><span className="suggest-image-title">Görsel önerisi <small>(isteğe bağlı)</small></span>
{image?<div className="image-drop chosen"><img src={image.url} alt="Önerdiğin görsel"/><div><b>✓ Görsel eklendi</b><small>Görevli terimle birlikte onaylarsa sözlükte kullanılır.</small><div className="button-row start"><label className="secondary image-change">Değiştir<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{void pick(e.target.files?.[0]);e.target.value='';}}/></label><button type="button" className="text-button" onClick={()=>setImage(null)}>Kaldır</button></div></div></div>
:<label className={`image-drop${drag?' over':''}`} onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);void pick(e.dataTransfer.files?.[0]);}}><span className="image-drop-icon" aria-hidden="true">🖼️</span><b>Görsel seç</b><span>ya da buraya sürükleyip bırak</span><small>PNG, JPG ya da WEBP · Terimi anlatan bir çizim ya da görsel</small><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{void pick(e.target.files?.[0]);e.target.value='';}}/></label>}
<small className="image-note">İnsan yüzü, kişisel bilgi ya da başkasına ait logolu görsel koyma.</small></div>
<label>Adın ve sınıfın <small>(isteğe bağlı)</small><input maxLength={40} placeholder="Örn. Elif, 10-B" value={f.addedBy} onChange={set('addedBy')}/><small>Soyadını, okulunu veya iletişim bilgini yazma.</small></label>
{error&&<p className="error" role="alert">{error}</p>}
<button className="primary wide" disabled={busy||!exampleOk}>{busy?'Gönderiliyor…':'Görevli onayına gönder ↗'}</button></form></section>;}
