import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {artDir,contentType} from '../../../../lib/server';
export const dynamic='force-dynamic';
export async function GET(_r:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;if(!/^[a-f0-9-]{36}$/.test(id))return new Response('Bulunamadı',{status:404});for(const ext of ['png','jpg','webp']){try{const file=await readFile(path.join(/*turbopackIgnore: true*/ artDir,`${id}.${ext}`));return new Response(new Uint8Array(file),{headers:{'Content-Type':contentType(ext),'Cache-Control':'public,max-age=31536000,immutable'}});}catch{}}return new Response('Bulunamadı',{status:404});}
