// resimler/ klasöründeki terim görsellerini sözlüğe hazırlar: node scripts/gorselleri-hazirla.mjs
// - Dosya adı terim kimliğidir (core-loop.jpg); "core-loop.png.jpg" gibi çift uzantılar da tanınır. Eşleşmeyen dosya raporlanır, kopyalanmaz.
// - Her görsel 800×800 WebP olur (sitede en büyük gösterim ~400 px; 2× ekranlar için yeterli, dosya ~50-120 KB).
// - Kare olmayan görseller kırpılmaz: karşılaştırma anlatan yatay görsellerde yarısı kaybolurdu. Kendi köşe rengiyle kareye tamamlanır.
// - public/art/terimler/<kimlik>.webp yazılır ve lib/terimler/gorseller.ts listesi yeniden üretilir.
import fs from 'node:fs';
import sharp from 'sharp';
import {seedWords} from '../lib/words.ts';
const src='resimler',out='public/art/terimler',size=800;
fs.mkdirSync(out,{recursive:true});
const ids=new Set(seedWords.map(w=>w.id)),done=[],skipped=[];
for(const f of fs.readdirSync(src).sort()){
 const id=f.toLowerCase().replace(/(\.(png|jpe?g|webp))+$/,'');
 if(!/\.(png|jpe?g|webp)$/i.test(f))continue;
 if(!ids.has(id)){skipped.push(f);continue;}
 const img=sharp(`${src}/${f}`),m=await img.metadata();
 let pipe=sharp(`${src}/${f}`).rotate();
 if(m.width!==m.height){const {data}=await sharp(`${src}/${f}`).extract({left:0,top:0,width:8,height:8}).raw().toBuffer({resolveWithObject:true});
  const background={r:data[0],g:data[1],b:data[2]};pipe=pipe.resize(size,size,{fit:'contain',background});}
 else pipe=pipe.resize(size,size,{fit:'cover'});
 await pipe.webp({quality:82}).toFile(`${out}/${id}.webp`);
 done.push(id);console.log(`✓ ${f} → ${out}/${id}.webp (${m.width}×${m.height}${m.width!==m.height?', kareye tamamlandı':''})`);}
// Listede olup resimler/ içinde artık bulunmayan eski dosyalar da korunur (klasörden silinse bile görsel kaybolmasın).
const all=fs.readdirSync(out).filter(f=>f.endsWith('.webp')).map(f=>f.slice(0,-5)).filter(id=>ids.has(id)).sort();
fs.writeFileSync('lib/terimler/gorseller.ts',`// Bu dosya scripts/gorselleri-hazirla.mjs tarafından üretilir; elle düzenlemeyin.\n// public/art/terimler/<kimlik>.webp görseli olan başlangıç terimleri.\nexport const bundledArt=new Set<string>(${JSON.stringify(all)});\n`);
console.log(`\n${done.length} görsel hazırlandı, toplam ${all.length} terimin görseli var.`);
if(skipped.length)console.log(`Eşleşmeyen (terim kimliği bulunamadı): ${skipped.join(', ')}`);
