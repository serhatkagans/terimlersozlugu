import {readFile} from 'node:fs/promises';
import {coverFile} from '../../../../lib/server';
export const dynamic='force-dynamic';
// Adres ?v=<sürüm> taşıdığı için kapak değişince yeni adres oluşur; uzun önbellek güvenlidir.
export async function GET(_r:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;const found=coverFile(id);if(!found)return new Response('Bulunamadı',{status:404});return new Response(new Uint8Array(await readFile(found.file)),{headers:{'Content-Type':found.type,'Cache-Control':'public,max-age=31536000,immutable'}});}
