import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {artDir,database,findWord,imageType,limited,sameOrigin,wordImage} from '../../../lib/server';
import {cardPrompt,cardStyles,generateImage,imageBudget,imageEnabled,review,textEnabled,type Review} from '../../../lib/ai';
import {base,usesWord} from '../../../lib/words';
export const dynamic='force-dynamic';
const busy=(error:string,status=503)=>Response.json({error},{status});
export async function GET(request:Request){try{const db=database();const q=new URL(request.url).searchParams;const id=q.get('id'),ids=q.get('ids');
if(id){const card=db.prepare('SELECT * FROM cards WHERE id = ?').get(id)??null;return Response.json({card},{status:card?200:404,headers:{'Cache-Control':'no-store'}});}
// "Sözlüğüm": öğrencinin tarayıcısında saklanan kart kimlikleri (en fazla 60).
if(ids!==null){const list=ids.split(',').filter(x=>/^[a-f0-9-]{36}$/.test(x)).slice(0,60);const cards=list.length?db.prepare(`SELECT * FROM cards WHERE id IN (${list.map(()=>'?').join(',')}) ORDER BY createdAt`).all(...list):[];return Response.json({cards},{headers:{'Cache-Control':'no-store'}});}
const cards=db.prepare('SELECT * FROM cards WHERE approved = 1 ORDER BY createdAt DESC LIMIT 120').all();return Response.json({cards},{headers:{'Cache-Control':'no-store'}});}catch{return busy('Sözlüğe şu anda ulaşılamıyor. Lütfen tekrar deneyin.');}}
export async function POST(request:Request){
if(!sameOrigin(request))return busy('Geçersiz istek.',403);
if(limited(request,'cards',60,10*60_000))return busy('Çok fazla kart oluşturuldu. Birkaç dakika sonra tekrar dene.',429);
try{if(Number(request.headers.get('content-length')||0)>10000)return busy('İstek çok uzun.',413);const p=await request.json();const found=findWord(p.wordId);
if(!found||typeof p.sentence!=='string'||p.sentence.trim().length<10||p.sentence.length>240||!usesWord(p.sentence,found.word.word)||typeof p.scene!=='string'||p.scene.trim().length<5||p.scene.length>400||typeof p.nickname!=='string'||p.nickname.length>24||!(p.style in cardStyles)||!['demo','ai'].includes(p.mode))return busy('Kelimeyi içeren 10–240 karakterlik bir cümle ve kısa bir görsel tarifi yaz.',400);
const {word,work}=found,sentence=p.sentence.trim(),scene=p.scene.trim();
// Yapay zekâ bağlıysa her kart önce içerik denetiminden geçer. Denetim servisine ulaşılamazsa hazır görselli kart yine oluşur; görevli onayı ikinci güvencedir.
let checked:Review|undefined;if(textEnabled()){try{checked=await review(word,work,sentence,scene);}catch{if(p.mode==='ai')return busy('Yapay zekâ şu anda yanıt vermiyor. Hazır görselle deneyebilirsin.');}if(checked&&!checked.uygun)return busy(checked.geriBildirim||'Bu cümle ya da tarif sözlüğümüze uygun görünmüyor. Başka bir hayal dener misin?',422);}
const db=database();const id=crypto.randomUUID();let image=wordImage(word);
if(p.mode==='ai'){if(!imageEnabled())return busy('Yapay zekâ bağlantısı henüz açılmadı. Hazır görselle deneyebilirsin.');if(!imageBudget())return busy('Bugünkü yapay zekâ görsel hakkı doldu. Hazır görselle devam edebilirsin.',429);
const bytes=await generateImage(cardPrompt(word,work,p.style,sentence,scene,checked?.gorselTarifi));await writeFile(path.join(/*turbopackIgnore: true*/ artDir,`${id}.${imageType(bytes)}`),bytes);image=`${base}/api/art/${id}`;}
const card={id,wordId:word.id,sentence,nickname:p.nickname.trim()||'Bir kelime kâşifi',scene,style:p.style,image,mode:p.mode,createdAt:Date.now(),approved:0};db.prepare('INSERT INTO cards (id,wordId,sentence,nickname,scene,style,image,mode,createdAt,approved) VALUES (?,?,?,?,?,?,?,?,?,?)').run(...Object.values(card));return Response.json({card},{status:201});
}catch(e){console.error('Kart oluşturulamadı',e);return busy('Kart oluşturulamadı. Biraz sonra tekrar dene; yazdıkların burada duruyor.');}}
