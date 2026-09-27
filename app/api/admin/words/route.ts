import {authorized,covers,database,entry,findWord,illustrated,insertWord,removeWordArt,sameOrigin,saveWordArt,text,uniqueId} from '../../../../lib/server';
import {generateImage,imageBudget,imageEnabled,wordPrompt} from '../../../../lib/ai';
import {slug} from '../../../../lib/words';
export const dynamic='force-dynamic';
const fail=(error:string,status=400)=>Response.json({error},{status});
const json=(p:unknown)=>Response.json(p);
// Görevli için bütün terimler (öneriler ve gizlenenler dahil), çalışma grupları, terim resimleri ve kapaklar.
export async function GET(request:Request){if(!authorized(request))return fail('Görevli anahtarı geçersiz.',401);const db=database();return json({words:db.prepare('SELECT * FROM words ORDER BY createdAt,rowid').all(),works:db.prepare('SELECT * FROM works ORDER BY rowid').all(),illustrated:illustrated(),covers:covers(),ai:imageEnabled()});}
export async function POST(request:Request){if(!authorized(request)||!sameOrigin(request))return fail('Yetkisiz.',403);const db=database();try{const p=await request.json();
// Toplu işlemler tek kimlik (id) ya da kimlik listesi (ids, en fazla 500) alır.
const ids:string[]=(Array.isArray(p.ids)?p.ids:[p.id]).filter((x:unknown)=>typeof x==='string').slice(0,500);
if(p.action==='toggle'){if(!ids.length)return fail('Geçersiz kelime.');const q=db.prepare('UPDATE words SET active = ? WHERE id = ?');db.transaction(()=>ids.forEach(id=>q.run(p.active?1:0,id)))();return json({ok:true,changed:ids.length});}
// Öğrenci önerisini onaylar / reddeder (reddedilen kayıt silinmez, geri alınabilir).
if(p.action==='status'){if(!ids.length||!['approved','rejected','pending'].includes(p.status))return fail('Geçersiz işlem.');const q=db.prepare('UPDATE words SET status = ? WHERE id = ?');let changed=0;db.transaction(()=>ids.forEach(id=>changed+=q.run(p.status,id).changes))();return changed?json({ok:true,changed}):fail('Kelime bulunamadı.',404);}
// Kalıcı silme: terim kartı bağlı terimler silinmez (kart bozulur), onlar gizlenmelidir.
if(p.action==='delete'){const used=db.prepare('SELECT COUNT(*) n FROM cards WHERE wordId = ?'),del=db.prepare('DELETE FROM words WHERE id = ?');const deleted:string[]=[],kept:string[]=[];
db.transaction(()=>{for(const id of ids){if((used.get(id) as {n:number}).n){kept.push(id);continue;}if(del.run(id).changes)deleted.push(id);}})();deleted.forEach(removeWordArt);return json({ok:true,deleted,kept});}
// Toplu içe aktarma (CSV / Excel): her satır ayrı doğrulanır; çalışma grubu adı ya da kimliğiyle eşleşir. Görevlinin aktardığı terimler onaylı girer.
if(p.action==='import'){if(!Array.isArray(p.rows)||!p.rows.length||p.rows.length>500)return fail('1–500 satır gönderin.');const works=db.prepare('SELECT id,title FROM works').all() as {id:string;title:string}[];const status=p.pending?'pending':'approved';
const results=p.rows.map((r:Record<string,unknown>,i:number)=>{const name=String(r?.work??'').trim();const work=works.find(k=>k.id===name||slug(k.title)===slug(name));if(!work)return {row:i+1,ok:false,error:`Çalışma grubu bulunamadı: “${name||'—'}”`};
const e=entry({...r,work:work.id});if(typeof e==='string')return {row:i+1,ok:false,error:e};const word={...e,id:uniqueId('words',slug(e.word)),status};insertWord(word);return {row:i+1,ok:true,word:word.word};});return json({results});}
if(p.action==='generate'){const found=findWord(p.id);if(!found)return fail('Terim bulunamadı, gizli ya da henüz onaylanmadı.');if(!imageEnabled())return fail('Yapay zekâ bağlantısı tanımlı değil.',503);if(!imageBudget())return fail('Bugünkü görsel üretim sınırı doldu.',429);await saveWordArt(found.word.id,await generateImage(wordPrompt(found.word,found.work)));return json({ok:true});}
// Düzenleme: kimlik (ve dolayısıyla resim dosyası adı) değişmez.
if(p.action==='update'){const old=typeof p.id==='string'&&db.prepare('SELECT * FROM words WHERE id = ?').get(p.id) as Record<string,unknown>|undefined;if(!old)return fail('Terim bulunamadı.',404);const e=entry({...old,...p.word,addedBy:p.word?.addedBy??old.addedBy},p.id);if(typeof e==='string')return fail(e);
db.prepare('UPDATE words SET word=?,oldMeaning=?,meaning=?,example=?,work=?,syllables=?,category=?,emoji=?,scene=?,quote=?,note=?,addedBy=? WHERE id = ?').run(e.word,e.oldMeaning,e.meaning,e.example,e.work,e.syllables,e.category,e.emoji,e.scene,e.quote,e.note,e.addedBy,p.id);return json({ok:true});}
if(p.action!=='create')return fail('Bilinmeyen işlem.');
let work=p.word?.work;if(work==='__new'){const title=text(p.newWork?.title,2,80),author=text(p.newWork?.author,2,120);if(!title||!author)return fail('Bir çalışma grubu seçin ya da yeni grubun adını ve kısa tanıtımını yazın.');work=uniqueId('works',slug(title));db.prepare('INSERT INTO works (id,title,author,period,month,kind) VALUES (?,?,?,?,?,?)').run(work,title,author,'','','terim');}
const e=entry({...p.word,work});if(typeof e==='string')return fail(e);const word={...e,id:uniqueId('words',slug(e.word)),status:'approved'};insertWord(word);return json({word});
}catch(e){console.error('Kelime işlemi başarısız',e);return fail('İşlem tamamlanamadı. Yapay zekâ kullanıldıysa biraz sonra tekrar deneyin.',503);}}
// Kelime resmi yükleme: gövde doğrudan resim dosyasıdır (PNG, JPG veya WEBP; en fazla 8 MB).
export async function PUT(request:Request){if(!authorized(request)||!sameOrigin(request))return fail('Yetkisiz.',403);const id=new URL(request.url).searchParams.get('id');if(!id||!database().prepare('SELECT 1 FROM words WHERE id = ?').get(id))return fail('Kelime bulunamadı.');if(Number(request.headers.get('content-length')||0)>8_000_000)return fail('Resim 8 MB’tan büyük olamaz.',413);const bytes=Buffer.from(await request.arrayBuffer());if(bytes.length>8_000_000)return fail('Resim 8 MB’tan büyük olamaz.',413);try{await saveWordArt(id,bytes);return json({ok:true});}catch(e){return fail(e instanceof Error?e.message:'Resim kaydedilemedi.');}}
