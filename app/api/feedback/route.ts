import {findWord,limited,sameOrigin} from '../../../lib/server';
import {review,textEnabled} from '../../../lib/ai';
export const dynamic='force-dynamic';
// Öğrencinin cümlesine yapay zekâ öğretmen geri bildirimi (kart oluşturmadan önce, isteğe bağlı).
export async function POST(request:Request){if(!sameOrigin(request))return Response.json({error:'Geçersiz istek.'},{status:403});if(!textEnabled())return Response.json({error:'Yapay zekâ öğretmen şu anda kapalı.'},{status:503});if(limited(request,'feedback',120,10*60_000))return Response.json({error:'Biraz bekleyip tekrar dene.'},{status:429});
try{const p=await request.json();const found=findWord(p.wordId);if(!found||typeof p.sentence!=='string'||p.sentence.trim().length<3||p.sentence.length>240)return Response.json({error:'Önce kelimeyi kullanarak bir cümle yaz.'},{status:400});const r=await review(found.word,found.work,p.sentence.trim());return Response.json({ok:r.uygun&&r.dogruKullanim,feedback:r.geriBildirim});}catch{return Response.json({error:'Yapay zekâ öğretmen şu anda yanıt veremiyor. Cümleni kendin de gönderebilirsin.'},{status:503});}}
