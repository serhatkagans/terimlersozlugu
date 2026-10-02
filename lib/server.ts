import Database from 'better-sqlite3';
import {createHmac,randomInt,timingSafeEqual} from 'node:crypto';
import {mkdirSync,readdirSync,renameSync,statSync,unlinkSync} from 'node:fs';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {art,categories,colors,emojiOf,fallbackArt,seedWords,seedWorks,slug,usesWord,wordArt,type Word,type Work} from './words';
// Veriler DATA_DIR altında tutulur: terimler-sozlugu.db (kartlar, terimler, çalışma grupları), art/ (kart resimleri), art/kelimeler/ (terim resimleri), art/kapaklar/ (grup kapakları) ve art/oneriler/ (öğrencinin önerdiği, onay bekleyen terim resimleri).
const dataDir=path.resolve(/*turbopackIgnore: true*/ process.env.DATA_DIR||'data');
export const artDir=path.join(dataDir,'art');
export const wordArtDir=path.join(artDir,'kelimeler');
export const coverDir=path.join(artDir,'kapaklar');
export const proposalDir=path.join(artDir,'oneriler');
export const runtime={get IMAGE_SERVICE_URL(){return process.env.IMAGE_SERVICE_URL;},get IMAGE_SERVICE_TOKEN(){return process.env.IMAGE_SERVICE_TOKEN;},get ADMIN_USER(){return process.env.ADMIN_USER;},get ADMIN_PASSWORD(){return process.env.ADMIN_PASSWORD;}};
let db:Database.Database|undefined;
export function database(){if(!db){mkdirSync(wordArtDir,{recursive:true});mkdirSync(coverDir,{recursive:true});mkdirSync(proposalDir,{recursive:true});db=new Database(path.join(dataDir,'terimler-sozlugu.db'));db.pragma('journal_mode = WAL');db.exec(`CREATE TABLE IF NOT EXISTS cards (id TEXT PRIMARY KEY, wordId TEXT NOT NULL, sentence TEXT NOT NULL, nickname TEXT NOT NULL, scene TEXT NOT NULL, style TEXT NOT NULL, image TEXT NOT NULL, mode TEXT NOT NULL, createdAt INTEGER NOT NULL, approved INTEGER NOT NULL DEFAULT 0); CREATE INDEX IF NOT EXISTS cards_gallery ON cards(approved,createdAt);
CREATE TABLE IF NOT EXISTS works (id TEXT PRIMARY KEY, title TEXT NOT NULL, author TEXT NOT NULL, period TEXT NOT NULL DEFAULT '', month TEXT NOT NULL DEFAULT '', kind TEXT NOT NULL DEFAULT 'terim');
CREATE TABLE IF NOT EXISTS words (id TEXT PRIMARY KEY, word TEXT NOT NULL, syllables TEXT NOT NULL DEFAULT '', meaning TEXT NOT NULL, category TEXT NOT NULL, color TEXT NOT NULL, emoji TEXT NOT NULL, example TEXT NOT NULL, scene TEXT NOT NULL DEFAULT '', image TEXT NOT NULL, work TEXT NOT NULL, quote TEXT, note TEXT, active INTEGER NOT NULL DEFAULT 1, createdAt INTEGER NOT NULL DEFAULT 0, oldMeaning TEXT, addedBy TEXT, status TEXT NOT NULL DEFAULT 'approved');
CREATE TABLE IF NOT EXISTS scores (id INTEGER PRIMARY KEY, name TEXT NOT NULL, mode TEXT NOT NULL, score INTEGER NOT NULL, createdAt INTEGER NOT NULL, class TEXT NOT NULL DEFAULT ''); CREATE INDEX IF NOT EXISTS scores_mode ON scores(mode,score);
CREATE TABLE IF NOT EXISTS classes (code TEXT PRIMARY KEY, label TEXT NOT NULL, mode TEXT NOT NULL, grp TEXT NOT NULL DEFAULT '', createdAt INTEGER NOT NULL);`);migrate(db);seed(db);}return db;}
// Eski veritabanlarına yeni sütunları ekler (veri kaybı olmadan).
function migrate(d:Database.Database){const has=(t:string,c:string)=>(d.prepare(`PRAGMA table_info(${t})`).all() as {name:string}[]).some(x=>x.name===c);if(!has('works','month'))d.exec("ALTER TABLE works ADD COLUMN month TEXT NOT NULL DEFAULT ''");if(!has('works','kind'))d.exec("ALTER TABLE works ADD COLUMN kind TEXT NOT NULL DEFAULT 'eser'");for(const [c,def] of [['oldMeaning','TEXT'],['addedBy','TEXT'],['status',"TEXT NOT NULL DEFAULT 'approved'"]])if(!has('words',c))d.exec(`ALTER TABLE words ADD COLUMN ${c} ${def}`);d.exec('CREATE INDEX IF NOT EXISTS words_status ON words(status,active)');if(!has('scores','class'))d.exec("ALTER TABLE scores ADD COLUMN class TEXT NOT NULL DEFAULT ''");d.exec('CREATE INDEX IF NOT EXISTS scores_class ON scores(class)');d.exec('CREATE TABLE IF NOT EXISTS class_players (class TEXT NOT NULL, token TEXT NOT NULL, name TEXT NOT NULL, score INTEGER, createdAt INTEGER NOT NULL, PRIMARY KEY(class,token))');}
// Başlangıç verisi sürümlüdür ve her sürüm bir kez yüklenir; sonrasında terimler görevli panelinden yönetilir.
// Yeni sürümde yalnızca eksik gruplar ve terimler eklenir; görevlinin düzenlemeleri, gizledikleri ve sildikleri korunur (silinen başlangıç terimi yeni sürümde arşive geri gelir).
// Sürüm 3: Güvenli İnternet grubu Bilişim Hukuku ile birleşti (terimleri, sınıfları ve onay bekleyen öneriler taşınır), Eğitim Teknolojileri eklendi.
// Sürüm 4: hazır terimler (ekleyeni boş olanlar) arşive alındı: gizlenir, silinmez; sözlükte ve oyunlarda yalnızca öğrencilerin eklediği terimler kalır.
// Bölümü denemek için uydurma adlarla girilmiş üç örnek kayıt (speedrun, respawn, ragdoll) da arşive alınır.
// Arşivdeki terimler görevli panelinde "Gizli" olarak durur ve oradan "Göster" ile geri açılır.
const seedVersion=4;
function mergeGroups(d:Database.Database){const from='guvenli-internet',k=seedWorks.find(k=>k.id==='bilisim-hukuku');if(!k||!d.prepare('SELECT 1 FROM works WHERE id = ?').get(from))return;
d.prepare("INSERT INTO works (id,title,author,period,month,kind) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,author=excluded.author").run(k.id,k.title,k.author,k.period,k.month,k.kind??'terim');
d.prepare('UPDATE words SET work = ? WHERE work = ?').run(k.id,from);d.prepare('UPDATE classes SET grp = ? WHERE grp = ?').run(k.id,from);d.prepare('DELETE FROM works WHERE id = ?').run(from);}
function seed(d:Database.Database){syncArt(d);const v=d.pragma('user_version',{simple:true}) as number;if(v>=seedVersion)return;d.transaction(()=>{mergeGroups(d);
const work=d.prepare("INSERT INTO works (id,title,author,period,month,kind) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING");
for(const k of seedWorks)work.run(k.id,k.title,k.author,k.period,k.month,k.kind??'terim');
seedWords.forEach((w,i)=>insertWord(w,i,d,'ignore'));if(v<4)d.exec("UPDATE words SET active = 0 WHERE addedBy IS NULL OR trim(addedBy) = '' OR (id IN ('speedrun','respawn','ragdoll') AND createdAt < 1790900000000)");d.pragma(`user_version = ${seedVersion}`);})();syncArt(d);}
// Sonradan hazırlanan terim görselleri (public/art/terimler) her açılışta eşitlenir; yeni görsel için sunucuyu yeniden başlatmak yeter.
// Yalnızca hâlâ ortak hazır resmi (uzantısız ad) kullanan terimlere verilir; görevlinin değişikliği korunur.
function syncArt(d:Database.Database){const art=d.prepare("UPDATE words SET image = ? WHERE id = ? AND instr(image,'.') = 0");d.transaction(()=>{for(const w of seedWords)if(w.image.includes('.'))art.run(w.image,w.id);})();}
const wordColumns=['id','word','syllables','meaning','category','color','emoji','example','scene','image','work','quote','note','oldMeaning','addedBy','status'] as const;
export function insertWord(w:Word,order=Date.now(),d=database(),mode:'insert'|'upsert'|'ignore'='insert'){const update=mode==='upsert'?` ON CONFLICT(id) DO UPDATE SET ${wordColumns.slice(1).map(c=>`${c}=excluded.${c}`).join(',')},active=1`:mode==='ignore'?' ON CONFLICT(id) DO NOTHING':'';d.prepare(`INSERT INTO words (${wordColumns.join(',')},createdAt) VALUES (${wordColumns.map(()=>'?').join(',')},?)${update}`).run(...wordColumns.map(c=>w[c]??(c==='status'?'approved':null)),order);}
export function catalog(){const d=database();const works=d.prepare('SELECT id,title,author,period,month,kind FROM works ORDER BY rowid').all() as Work[];const words=d.prepare("SELECT id,word,syllables,meaning,category,color,emoji,example,scene,image,work,quote,note,oldMeaning,addedBy FROM words WHERE active = 1 AND status = 'approved' ORDER BY createdAt,rowid").all() as Word[];return {works,words};}
export function findWord(id:unknown){if(typeof id!=='string')return undefined;const d=database();const word=d.prepare("SELECT * FROM words WHERE id = ? AND active = 1 AND status = 'approved'").get(id) as Word|undefined;if(!word)return undefined;const work=(d.prepare('SELECT * FROM works WHERE id = ?').get(word.work) as Work|undefined)??{id:word.work,title:'',author:'',period:'',month:'',kind:'terim'};return {word,work};}
// Terim resimleri (art/kelimeler) ve grup kapakları (art/kapaklar): <id>.<png|jpg|webp>. Sürüm (değişme zamanı) önbellek kırmak için adrese eklenir.
const exts:Record<string,string>={png:'image/png',jpg:'image/jpeg',webp:'image/webp'};
function versions(dir:string){database();const out:Record<string,number>={};for(const f of readdirSync(dir)){const [id,ext]=f.split('.');if(ext in exts)out[id]=Math.round(statSync(path.join(dir,f)).mtimeMs);}return out;}
function imageFile(dir:string,id:string){if(!/^[a-z0-9-]{1,40}$/.test(id))return undefined;database();const f=readdirSync(dir).find(f=>f.split('.')[0]===id&&f.split('.')[1] in exts);return f?{file:path.join(dir,f),type:exts[f.split('.')[1]]}:undefined;}
async function saveImage(dir:string,id:string,bytes:Buffer){const ext=imageType(bytes);if(!ext)throw Error('Desteklenmeyen resim biçimi. PNG, JPG veya WEBP yükleyin.');database();for(const f of readdirSync(dir))if(f.split('.')[0]===id)unlinkSync(path.join(dir,f));await writeFile(path.join(dir,`${id}.${ext}`),bytes);}
export const illustrated=()=>versions(wordArtDir),covers=()=>versions(coverDir);
export const wordArtFile=(id:string)=>imageFile(wordArtDir,id),coverFile=(id:string)=>imageFile(coverDir,id);
export const saveWordArt=(id:string,bytes:Buffer)=>saveImage(wordArtDir,id,bytes),saveCover=(id:string,bytes:Buffer)=>saveImage(coverDir,id,bytes);
function removeImage(dir:string,id:string){database();for(const f of readdirSync(dir))if(f.split('.')[0]===id)unlinkSync(path.join(dir,f));}
export const removeWordArt=(id:string)=>removeImage(wordArtDir,id);
// Öğrencinin terim önerisiyle gönderdiği resim sözlükte görünmez; görevli terimi onaylayınca terim resmi olur (görevli kendisi resim yüklediyse onunki kalır).
export const proposals=()=>versions(proposalDir),proposalFile=(id:string)=>imageFile(proposalDir,id);
export const saveProposal=(id:string,bytes:Buffer)=>saveImage(proposalDir,id,bytes),removeProposal=(id:string)=>removeImage(proposalDir,id);
export function acceptProposal(id:string){const p=proposalFile(id);if(!p)return;if(wordArtFile(id)){unlinkSync(p.file);return;}renameSync(p.file,path.join(wordArtDir,path.basename(p.file)));}
export function wordImage(w:Word){const v=illustrated()[w.id];return v?wordArt(w.id,v):art(w.image);}
export function imageType(b:Buffer){if(b[0]===0x89&&b[1]===0x50&&b[2]===0x4e&&b[3]===0x47)return 'png';if(b[0]===0xff&&b[1]===0xd8&&b[2]===0xff)return 'jpg';if(b.subarray(0,4).toString()==='RIFF'&&b.subarray(8,12).toString()==='WEBP')return 'webp';return undefined;}
export function contentType(ext:string){return exts[ext];}
// Görevli girişi kullanıcı adı + şifreyle yapılır (kullanıcı adında büyük/küçük harf ve baştaki/sondaki boşluklar önemsenmez; telefon ilk harfi büyütüyor); tarayıcıya şifre yerine ondan türetilen oturum anahtarı verilir. Şifre değişince eski oturumlar geçersiz olur.
const same=(a:string,b:string)=>{const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);};
// Ek görevli hesapları ADMIN_USER_2 / ADMIN_PASSWORD_2 … ADMIN_USER_9 / ADMIN_PASSWORD_9 ile tanımlanır; her hesabın oturum anahtarı ayrıdır.
export function adminAccounts(){const out:{user:string;password:string}[]=[];for(const n of ['','_2','_3','_4','_5','_6','_7','_8','_9']){const u=process.env[`ADMIN_USER${n}`],p=process.env[`ADMIN_PASSWORD${n}`];if(u?.trim()&&p?.trim())out.push({user:u,password:p});}return out;}
const sessionOf=(a:{user:string;password:string})=>createHmac('sha256',a.password).update(`genctek-terimler:${a.user}`).digest('hex');
// Kullanıcı adı ve şifre doğruysa o hesabın oturum anahtarını döndürür.
export function checkLogin(user:unknown,password:unknown){if(typeof user!=='string'||typeof password!=='string')return undefined;const a=adminAccounts().find(a=>same(user.trim().toLowerCase(),a.user.trim().toLowerCase())&&same(password.trim(),a.password.trim()));return a?sessionOf(a):undefined;}
export function authorized(request:Request){const h=request.headers.get('authorization')||'';return adminAccounts().some(a=>same(h,`Bearer ${sessionOf(a)}`));}
// nginx arkasında request.url iç adresi gösterebilir; bu yüzden Origin, istemcinin gördüğü host ile karşılaştırılır.
export function sameOrigin(request:Request){const origin=request.headers.get('origin');if(!origin)return true;const host=request.headers.get('x-forwarded-host')||request.headers.get('host');try{return new URL(origin).host===host;}catch{return false;}}
// Basit bellek içi sınırlayıcı. Etkinlikte öğrenciler aynı ağdan (aynı IP) geldiği için sınırlar geniş tutulur.
const hits=new Map<string,number[]>();
export function limited(request:Request,name:string,max:number,windowMs:number){const ip=(request.headers.get('x-forwarded-for')||'').split(',')[0].trim()||'yerel';const key=`${name}:${ip}`,now=Date.now();const list=(hits.get(key)||[]).filter(t=>now-t<windowMs);list.push(now);hits.set(key,list);return list.length>max;}
export const text=(v:unknown,min:number,max:number)=>typeof v==='string'&&v.trim().length>=min&&v.trim().length<=max?v.trim():undefined;
export function uniqueId(table:'words'|'works',base:string){const db=database();let id=base||'terim',n=2;while(db.prepare(`SELECT 1 FROM ${table} WHERE id = ?`).get(id))id=`${base}-${n++}`;return id;}
// Öğrenci önerisi ve görevli kaydı için ortak doğrulama. Hata metni ya da (kimliği henüz verilmemiş) terim döndürür.
// Kısa tanım zorunludur; açıklama boşsa kısa tanım kullanılır.
export function entry(w:Record<string,unknown>,except=''):string|Omit<Word,'id'>{const db=database();
const word=text(w.word,1,80),oldMeaning=text(w.oldMeaning,2,300),meaning=text(w.meaning,0,300)||oldMeaning,example=text(w.example,10,240);
if(!word||!oldMeaning||!meaning||!example)return 'Terim, kısa tanımı ve 10–240 karakterlik örnek cümle zorunludur.';
if(!usesWord(example,word))return 'Örnek cümle terimin kendisini içermeli.';
const work=typeof w.work==='string'&&db.prepare('SELECT 1 FROM works WHERE id = ?').get(w.work)?w.work:undefined;if(!work)return 'Listeden bir çalışma grubu seçin.';
// Arşivdeki (gizli) terimler engel sayılmaz: öğrenci aynı terimi kendi tanımıyla yeniden önerebilir.
const same=(db.prepare("SELECT id,word FROM words WHERE work = ? AND status != 'rejected' AND active = 1 AND id != ?").all(work,except) as {word:string}[]).some(x=>slug(x.word)===slug(word));if(same)return `“${word}” bu çalışma grubunun sözlüğünde zaten var ya da onay bekliyor.`;
const n=(db.prepare('SELECT COUNT(*) n FROM words').get() as {n:number}).n;
return {word,oldMeaning,meaning,example,work,syllables:text(w.syllables,0,60)??'',category:categories.includes(w.category as string)?w.category as string:categories[0],color:colors[n%colors.length],emoji:text(w.emoji,1,4)??emojiOf(work),scene:text(w.scene,0,400)??'',image:fallbackArt[n%fallbackArt.length],quote:text(w.quote,1,300)??null,note:text(w.note,1,400)??null,addedBy:text(w.addedBy,1,120)??null};}
// Oyun skorları: üyelik yoktur, oyuncu tur sonunda adını yazar. Her oyun türü (mode) için kişi başına en yüksek skor listelenir.
export const scoreModes=['word-kolay','word-zor','meaning-kolay','meaning-zor'];
export function topScores(mode:string,n=10){return database().prepare("SELECT name,MAX(score) score FROM scores WHERE mode = ? AND class = '' GROUP BY name ORDER BY score DESC,MIN(createdAt) LIMIT ?").all(mode,n) as {name:string;score:number}[];}
export function addScore(name:string,mode:string,score:number){database().prepare('INSERT INTO scores (name,mode,score,createdAt) VALUES (?,?,?,?)').run(name,mode,score,Date.now());}
// Sınıf modu: üyelik yoktur. Öğretmen oyun ayarlarıyla bir sınıf açar ve 6 haneli kodu paylaşır; koda giren herkes aynı soruları çözer.
// Sınıf skorları genel tabloya karışmaz. Tek hak: oyuncu "Oyunu başlat"a basınca rumuzu ve cihaz anahtarıyla (tarayıcıda saklanan rastgele değer) sınıfa yazılır;
// aynı cihaz ya da aynı rumuz ikinci kez puanlı tura giremez (soruları görüp baştan başlamak işe yaramaz). Skor, tur bitince o kayda bir kez yazılır.
export type GameClass={code:string;label:string;mode:string;group:string};
export function createClass(label:string,mode:string,group:string):GameClass{const d=database(),add=d.prepare('INSERT INTO classes (code,label,mode,grp,createdAt) VALUES (?,?,?,?,?) ON CONFLICT(code) DO NOTHING');
for(let i=0;i<20;i++){const code=String(randomInt(100000,1000000));if(add.run(code,label,mode,group,Date.now()).changes)return {code,label,mode,group};}throw Error('Sınıf kodu üretilemedi.');}
export function findClass(code:unknown){if(typeof code!=='string'||!/^\d{6}$/.test(code))return undefined;return database().prepare('SELECT code,label,mode,grp "group" FROM classes WHERE code = ?').get(code) as GameClass|undefined;}
export type ClassPlayer={name:string;score:number|null};
const validToken=(t:unknown):t is string=>typeof t==='string'&&/^[a-f0-9]{16,64}$/.test(t);
// Sınıf tablosu: bitirenler puana göre, turu süren oyuncular (score = null) en sonda.
export function classScores(code:string){return database().prepare('SELECT name,score FROM class_players WHERE class = ? ORDER BY score IS NULL,score DESC,createdAt LIMIT 300').all(code) as ClassPlayer[];}
export function classPlayed(code:string,token:unknown){return validToken(token)&&!!database().prepare('SELECT 1 FROM class_players WHERE class = ? AND token = ?').get(code,token);}
// Puanlı tura giriş. 'played': bu cihaz hakkını kullanmış; 'taken': rumuz sınıfta başkasında (büyük/küçük harf farkı sayılmaz).
export function joinClass(code:string,name:string,token:unknown):'ok'|'played'|'taken'|'invalid'{if(!validToken(token))return 'invalid';const d=database(),key=(s:string)=>s.toLocaleLowerCase('tr').replace(/\s+/g,' ');
return d.transaction(()=>{const all=d.prepare('SELECT name,token FROM class_players WHERE class = ?').all(code) as {name:string;token:string}[];if(all.some(x=>x.token===token))return 'played';if(all.some(x=>key(x.name)===key(name)))return 'taken';
d.prepare('INSERT INTO class_players (class,token,name,createdAt) VALUES (?,?,?,?)').run(code,token,name,Date.now());return 'ok';})();}
// Skor yalnızca puanlı tura girmiş ve henüz skoru yazılmamış kayda işlenir.
export function finishClass(code:string,token:unknown,score:number){return validToken(token)&&database().prepare('UPDATE class_players SET score = ? WHERE class = ? AND token = ? AND score IS NULL').run(score,code,token).changes>0;}
