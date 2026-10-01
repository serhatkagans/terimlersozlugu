import {entry,imageType,insertWord,limited,sameOrigin,saveProposal,text,uniqueId} from '../../../lib/server';
import {slug} from '../../../lib/words';
export const dynamic='force-dynamic';
const fail=(error:string,status=400)=>Response.json({error},{status});
const maxImage=3_000_000;
// Öğrenci kelime önerisi: "pending" olarak kaydedilir, öğretmen onaylayana kadar hiçbir sözlükte görünmez.
// Gövde JSON ya da (görsel önerisiyle) form verisidir: "data" alanında terim JSON'u, isteğe bağlı "image" alanında resim (PNG, JPG veya WEBP; en fazla 3 MB).
export async function POST(request:Request){if(!sameOrigin(request))return fail('Geçersiz istek.',403);if(limited(request,'words',80,10*60_000))return fail('Çok fazla öneri gönderildi. Birkaç dakika sonra tekrar dene.',429);
try{const form=(request.headers.get('content-type')||'').startsWith('multipart/form-data');if(Number(request.headers.get('content-length')||0)>(form?maxImage+10_000:8000))return fail(form?'Görsel 3 MB’tan büyük olamaz.':'İstek çok uzun.',413);
let p:unknown,image:Buffer|undefined;if(form){const fd=await request.formData(),data=fd.get('data'),file=fd.get('image');if(typeof data!=='string'||data.length>8000)return fail('İstek çok uzun.',413);p=JSON.parse(data);
if(file instanceof Blob&&file.size){if(file.size>maxImage)return fail('Görsel 3 MB’tan büyük olamaz.',413);image=Buffer.from(await file.arrayBuffer());if(!imageType(image))return fail('Görsel PNG, JPG ya da WEBP olmalı.');}}else p=await request.json();
// Üyelik yoktur; ekleyenin adı soyadı ve okulu zorunludur ve sözlükte "Ekleyen" olarak görünür.
const o=p&&typeof p==='object'?p as Record<string,unknown>:{},name=text(o.name,5,50),school=text(o.school,3,60);if(!name||!/\S\s+\S/.test(name)||!school)return fail('Adını soyadını ve okulunu yaz.');
const e=entry({...o,addedBy:`${name} · ${school}`});if(typeof e==='string')return fail(e);
const word={...e,id:uniqueId('words',slug(e.word)),status:'pending'};insertWord(word);if(image)await saveProposal(word.id,image);return Response.json({word:{id:word.id,word:word.word,status:word.status,image:!!image}},{status:201});
}catch(e){console.error('Kelime önerisi kaydedilemedi',e);return fail('Önerin kaydedilemedi. Biraz sonra tekrar dene; yazdıkların burada duruyor.',503);}}
