import {randomBytes,randomInt} from 'node:crypto';
import {catalog,illustrated,limited,sameOrigin,text} from '../../../lib/server';
import {choices,hideWords,inTitle,shuffle} from '../../../lib/game';
import {emojiOf,ownArt,type Word} from '../../../lib/words';
import {kahootQuestions} from '../../../lib/kahoot';
import {advanceLive,answerLive,createLive,findLive,joinLive,kickLive,viewLive,type LiveQ} from '../../../lib/live';
export const dynamic='force-dynamic';
const fail=(error:string,status=400)=>Response.json({error},{status});
const gone=()=>fail('Bu PIN ile açık bir oyun yok.',404);
const hint=(w:Word)=>w.oldMeaning||w.meaning;
// Sorular sunucuda hazırlanır ve istemciye yalnızca metin gider: doğru şık soru kapanana dek öğrencinin cihazına ulaşmaz.
// Terim görseli "Tanımını Bul"da soruyla birlikte (terim zaten yazıyor), "Terimi Bul"da cevabı ele vermemek için cevap açılınca gösterilir.
function questions(ask:string,group:string,count:number):LiveQ[]{const {words,works}=catalog(),ill=illustrated(),pool=words.filter(w=>!group||w.work===group);if(pool.length<4)return [];
return shuffle(pool).slice(0,count).map(w=>{const o=choices(w,words,4,Math.random,ask==='meaning'?hint:undefined),k=works.find(x=>x.id===w.work),correct=o.findIndex(x=>x.id===w.id),image=ownArt(w,ill);
const tag=k&&(ask==='meaning'||!inTitle(w.word,k.title))?`${emojiOf(k.id)} ${k.title}`:'';
return ask==='meaning'?{prompt:w.word,tag,options:o.map(x=>hideWords(hint(x),w.word)),correct,answer:hint(w),image,hint:true}:{prompt:hideWords(hint(w),w.word),tag,options:o.map(x=>x.word),correct,answer:w.word,image};});}
// Oyunun o anki görünümü (?pin=482913&token=… ya da &host=…). Ekranlar bu adresi saniyede bir yoklar; bu yüzden hız sınırı yoktur.
export async function GET(request:Request){const q=new URL(request.url).searchParams,g=findLive(q.get('pin'));if(!g)return gone();
return Response.json(viewLive(g,q.get('token'),q.get('host')===g.host));}
// action: create (öğretmen oyunu açar; kahoot verilirse lib/kahoot.ts'teki hazır soru seti kullanılır), join (öğrenci adıyla katılır), answer (şık seçer), next (öğretmen ilerletir), kick (öğretmen bir adı çıkarır).
export async function POST(request:Request){if(!sameOrigin(request))return fail('Geçersiz istek.',403);
try{const p=await request.json() as Record<string,unknown>;
if(p?.action==='create'){if(limited(request,'live',30,10*60_000))return fail('Çok fazla oyun açıldı. Birkaç dakika sonra tekrar dene.',429);
const ask=p.ask==='meaning'?'meaning':'word',group=typeof p.group==='string'?p.group:'',count=[5,10,15,20].includes(p.count as number)?p.count as number:10,time=[10,20,30].includes(p.time as number)?p.time as number:20;
const qs=typeof p.kahoot==='string'&&p.kahoot?kahootQuestions(p.kahoot):questions(ask,group,count);if(!qs.length)return fail(p.kahoot?'Bu soru seti bulunamadı.':'Bu grupta oyun için yeterli terim yok.');
const host=randomBytes(16).toString('hex'),label=text(p.label,1,40)??'Canlı yarışma';
for(let i=0;i<20;i++){const g=createLive({pin:String(randomInt(100000,1000000)),host,label,time,qs});if(g)return Response.json({pin:g.pin,host},{status:201});}
return fail('Oyun açılamadı. Biraz sonra tekrar dene.',503);}
const g=findLive(p?.pin);if(!g)return gone();
if(p.action==='next'||p.action==='kick'){if(p.host!==g.host)return fail('Bu oyunu yalnızca açan öğretmen yönetebilir.',403);
if(p.action==='kick'){if(typeof p.name==='string')kickLive(g,p.name);}else if(!advanceLive(g))return fail(g.phase==='lobby'?'Başlatmak için en az bir oyuncu bağlanmalı.':'Oyun bitti.',409);
return Response.json(viewLive(g,null,true));}
const token=typeof p.token==='string'&&/^[a-f0-9]{16,64}$/.test(p.token)?p.token:undefined;if(!token)return fail('Geçersiz istek.');
if(p.action==='join'){if(limited(request,'live-joins',900,10*60_000))return fail('Çok fazla giriş yapıldı. Birkaç dakika sonra tekrar dene.',429);
const name=text(p.name,2,20);if(!name)return fail('Adını yaz (2–20 karakter).');const r=joinLive(g,name,token,typeof p.avatar==='string'?p.avatar:undefined);
if(r==='taken')return fail('Bu ad oyunda kullanılıyor; başka bir ad yaz (ör. soyadının baş harfini ekle).',409);if(r==='ended')return fail('Bu oyun bitti.',409);if(r==='full')return fail('Oyun dolu.',409);
return Response.json(viewLive(g,token,false),{status:201});}
if(p.action==='answer'){answerLive(g,token,p.choice);return Response.json(viewLive(g,token,false));}
return fail('Geçersiz istek.');
}catch(e){console.error('Canlı oyun isteği işlenemedi',e);return fail('İstek işlenemedi. Tekrar dene.',503);}}
