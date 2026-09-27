import {authorized,database,sameOrigin,saveCover,text,uniqueId} from '../../../../lib/server';
import {slug} from '../../../../lib/words';
export const dynamic='force-dynamic';
const fail=(error:string,status=400)=>Response.json({error},{status});
// action:'create' yeni çalışma grubu ekler; aksi hâlde grubun adını ya da kısa tanıtımını günceller.
export async function POST(request:Request){if(!authorized(request)||!sameOrigin(request))return fail('Yetkisiz.',403);const p=await request.json().catch(()=>({}));const db=database();
if(p.action==='create'){const title=text(p.title,2,80),author=text(p.author,2,120);if(!title||!author)return fail('Grup adı en az 2, kısa tanıtım en az 2 karakter olmalı.');if(db.prepare('SELECT 1 FROM works WHERE lower(title) = lower(?)').get(title))return fail('Bu adla bir çalışma grubu zaten var.');const id=uniqueId('works',slug(title));db.prepare('INSERT INTO works (id,title,author,period,month,kind) VALUES (?,?,?,?,?,?)').run(id,title,author,'','','terim');return Response.json({ok:true,id});}
const old=typeof p.id==='string'&&db.prepare('SELECT title,author FROM works WHERE id = ?').get(p.id) as {title:string;author:string}|undefined;if(!old)return fail('Çalışma grubu bulunamadı.',404);
const title=p.title===undefined?old.title:text(p.title,2,80),author=p.author===undefined?old.author:text(p.author,2,120);if(!title||!author)return fail('Grup adı ve kısa tanıtım boş olamaz.');
db.prepare('UPDATE works SET title = ?,author = ? WHERE id = ?').run(title,author,p.id);return Response.json({ok:true});}
// Kapak yükleme: gövde doğrudan resim dosyasıdır (PNG, JPG veya WEBP; en fazla 8 MB).
export async function PUT(request:Request){if(!authorized(request)||!sameOrigin(request))return fail('Yetkisiz.',403);const id=new URL(request.url).searchParams.get('id');if(!id||!database().prepare('SELECT 1 FROM works WHERE id = ?').get(id))return fail('Çalışma grubu bulunamadı.');if(Number(request.headers.get('content-length')||0)>8_000_000)return fail('Resim 8 MB’tan büyük olamaz.',413);const bytes=Buffer.from(await request.arrayBuffer());if(bytes.length>8_000_000)return fail('Resim 8 MB’tan büyük olamaz.',413);try{await saveCover(id,bytes);return Response.json({ok:true});}catch(e){return fail(e instanceof Error?e.message:'Resim kaydedilemedi.');}}
