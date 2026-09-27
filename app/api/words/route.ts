import {entry,insertWord,limited,sameOrigin,uniqueId} from '../../../lib/server';
import {slug} from '../../../lib/words';
export const dynamic='force-dynamic';
const fail=(error:string,status=400)=>Response.json({error},{status});
// Öğrenci kelime önerisi: "pending" olarak kaydedilir, öğretmen onaylayana kadar hiçbir sözlükte görünmez.
export async function POST(request:Request){if(!sameOrigin(request))return fail('Geçersiz istek.',403);if(limited(request,'words',80,10*60_000))return fail('Çok fazla öneri gönderildi. Birkaç dakika sonra tekrar dene.',429);
try{if(Number(request.headers.get('content-length')||0)>8000)return fail('İstek çok uzun.',413);const p=await request.json();const e=entry(p&&typeof p==='object'?p:{});if(typeof e==='string')return fail(e);
const word={...e,id:uniqueId('words',slug(e.word)),status:'pending'};insertWord(word);return Response.json({word:{id:word.id,word:word.word,status:word.status}},{status:201});
}catch(e){console.error('Kelime önerisi kaydedilemedi',e);return fail('Önerin kaydedilemedi. Biraz sonra tekrar dene; yazdıkların burada duruyor.',503);}}
