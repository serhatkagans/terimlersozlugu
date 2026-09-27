import {authorized,database,sameOrigin} from '../../../lib/server';
export const dynamic='force-dynamic';
export async function GET(request:Request){if(!authorized(request))return Response.json({error:'Görevli anahtarı geçersiz veya henüz tanımlanmadı.'},{status:401});const db=database();const cards=db.prepare('SELECT * FROM cards WHERE approved = 0 ORDER BY createdAt DESC LIMIT 60').all();
// Kelime başına kart sayısı: kartı olan kelime kalıcı olarak silinemez.
const counts=Object.fromEntries((db.prepare('SELECT wordId,COUNT(*) n FROM cards GROUP BY wordId').all() as {wordId:string;n:number}[]).map(r=>[r.wordId,r.n]));return Response.json({cards,counts});}
export async function POST(request:Request){if(!authorized(request)||!sameOrigin(request))return new Response(null,{status:403});const {id,action}=await request.json();if(typeof id!=='string'||!['approve','reject'].includes(action))return new Response(null,{status:400});database().prepare('UPDATE cards SET approved = ? WHERE id = ?').run(action==='approve'?1:-1,id);return Response.json({ok:true});}
