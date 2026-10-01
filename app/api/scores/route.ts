import {addScore,classScores,findClass,finishClass,limited,sameOrigin,scoreModes,text,topScores} from '../../../lib/server';
export const dynamic='force-dynamic';
const fail=(error:string,status=400)=>Response.json({error},{status});
// Bir turda en çok 10 soru × (100 + 20 sn × 5 + 50 seri bonusu) puan alınabilir.
const maxScore=2500;
// Oyun türünün en yüksek skorları (?mode=word-kolay).
export async function GET(request:Request){const mode=new URL(request.url).searchParams.get('mode')||'';if(!scoreModes.includes(mode))return fail('Geçersiz oyun türü.');
try{return Response.json({top:topScores(mode)});}catch(e){console.error('Skorlar okunamadı',e);return fail('Skorlar yüklenemedi.',503);}}
// Tur sonunda skor kaydı: üyelik yoktur, oyuncu yalnızca adını yazar.
// `class` (sınıf kodu) verilirse skor, puanlı tura `token` ile girmiş oyuncunun kaydına bir kez yazılır (0 puan da yazılır); ad o kayıttan gelir.
export async function POST(request:Request){if(!sameOrigin(request))return fail('Geçersiz istek.',403);
try{const p=await request.json() as Record<string,unknown>,inClass=p?.class!==undefined;
if(limited(request,inClass?'class-scores':'scores',inClass?900:120,10*60_000))return fail('Çok fazla skor gönderildi. Birkaç dakika sonra tekrar dene.',429);
const mode=typeof p?.mode==='string'&&scoreModes.includes(p.mode)?p.mode:undefined,score=p?.score;
if(!mode||typeof score!=='number'||!Number.isInteger(score)||score<(inClass?0:1)||score>maxScore)return fail('Geçersiz skor.');
if(inClass){const c=findClass(p.class);if(!c)return fail('Sınıf bulunamadı.',404);if(c.mode!==mode)return fail('Geçersiz skor.');
if(!finishClass(c.code,p.token,score))return fail('Bu sınıfta puanlı tur hakkın kullanılmış; skor yalnızca bir kez yazılır.',409);return Response.json({top:classScores(c.code)},{status:201});}
const name=text(p?.name,2,40);if(!name)return fail('Adını yaz.');
addScore(name,mode,score);return Response.json({top:topScores(mode)},{status:201});
}catch(e){console.error('Skor kaydedilemedi',e);return fail('Skorun kaydedilemedi. Biraz sonra tekrar dene.',503);}}
