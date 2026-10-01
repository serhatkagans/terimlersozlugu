import {classPlayed,classScores,createClass,database,findClass,joinClass,limited,sameOrigin,scoreModes,text} from '../../../lib/server';
export const dynamic='force-dynamic';
const fail=(error:string,status=400)=>Response.json({error},{status});
// Sınıfın ayarları ve skor tablosu (?code=482913). Öğretmenin ekranı bu adresi birkaç saniyede bir yoklar.
// `token` (cihaz anahtarı) verilirse o cihazın puanlı tur hakkını kullanıp kullanmadığı da döner.
export async function GET(request:Request){try{const q=new URL(request.url).searchParams,c=findClass(q.get('code'));if(!c)return fail('Bu kodla açılmış bir sınıf yok.',404);
return Response.json({class:c,top:classScores(c.code),played:classPlayed(c.code,q.get('token'))});}catch(e){console.error('Sınıf okunamadı',e);return fail('Sınıf yüklenemedi.',503);}}
// `code` varsa puanlı tura giriş (rumuz + cihaz anahtarı; tek hak), yoksa sınıf açma: üyelik yoktur; öğretmen sınıf adını ve oyun ayarlarını gönderir, 6 haneli kodu alır.
export async function POST(request:Request){if(!sameOrigin(request))return fail('Geçersiz istek.',403);
try{const p=await request.json() as Record<string,unknown>;
if(p?.code!==undefined){if(limited(request,'class-joins',900,10*60_000))return fail('Çok fazla giriş yapıldı. Birkaç dakika sonra tekrar dene.',429);
const c=findClass(p.code),name=text(p.name,2,40);if(!c)return fail('Bu kodla açılmış bir sınıf yok.',404);if(!name)return fail('Rumuzunu yaz.');
const r=joinClass(c.code,name,p.token);if(r==='invalid')return fail('Geçersiz istek.');
if(r==='taken')return fail('Bu rumuz sınıfta kullanılmış; başka bir rumuz yaz (ör. soyadının baş harfini ekle).',409);
return Response.json({played:r==='played',top:classScores(c.code)},{status:r==='ok'?201:200});}
if(limited(request,'classes',30,10*60_000))return fail('Çok fazla sınıf açıldı. Birkaç dakika sonra tekrar dene.',429);
const label=text(p?.label,1,40),mode=typeof p?.mode==='string'&&scoreModes.includes(p.mode)?p.mode:undefined,group=p?.group??'';
if(!label)return fail('Sınıf adını yaz.');if(!mode)return fail('Geçersiz oyun türü.');
if(typeof group!=='string'||(group&&!database().prepare('SELECT 1 FROM works WHERE id = ?').get(group)))return fail('Geçersiz çalışma grubu.');
return Response.json({class:createClass(label,mode,group),top:[]},{status:201});
}catch(e){console.error('Sınıf açılamadı',e);return fail('Sınıf açılamadı. Biraz sonra tekrar dene.',503);}}
