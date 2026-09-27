// resimler/ klasöründeki terim görsellerini ve grup kapaklarını sözlüğe hazırlar: node scripts/gorselleri-hazirla.mjs
// - Terim görseli: dosya adı terim kimliğidir (core-loop.jpg); "core-loop.png.jpg" gibi çift uzantılar da tanınır.
// - Grup kapağı: dosya adı grubun adı ("Oyun Tasarımı.jpg") ya da kimliğidir (oyun-tasarimi.jpg). Eşleşmeyen dosya raporlanır, kopyalanmaz.
// - Terim görseli 800×800 WebP olur (sitede en büyük gösterim ~400 px; 2× ekranlar için yeterli, dosya ~50-120 KB).
//   Kare olmayan görseller kırpılmaz: karşılaştırma anlatan yatay görsellerde yarısı kaybolurdu. Kendi köşe rengiyle kareye tamamlanır.
// - Kapak 1200×900 (4:3, grup kartının oranı) WebP olur; oran farklıysa ortadan kırpılır.
// - public/art/terimler/<kimlik>.webp ve public/art/kapaklar/<grup>.webp yazılır, lib/terimler/gorseller.ts listesi yeniden üretilir.
// - Panelden yüklenen terim resmi ve kapak (DATA_DIR) bunlardan önce gelir.
import fs from 'node:fs';
import sharp from 'sharp';
import {seedWords,slug} from '../lib/words.ts';
import {groups} from '../lib/terimler/index.ts';
const src='resimler',out='public/art/terimler',coverOut='public/art/kapaklar',size=800;
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(coverOut,{recursive:true});
const ids=new Set(seedWords.map(w=>w.id)),groupOf=new Map(groups.flatMap(g=>[[g.id,g.id],[slug(g.title),g.id]])),done=[],coversDone=[],skipped=[];
for(const f of fs.readdirSync(src).sort()){
 if(!/\.(png|jpe?g|webp)$/i.test(f))continue;
 const name=f.normalize('NFC').replace(/(\.(png|jpe?g|webp))+$/i,''),id=name.toLowerCase(),group=groupOf.get(slug(name));
 if(!ids.has(id)&&group){await sharp(`${src}/${f}`).rotate().resize(1200,900,{fit:'cover'}).webp({quality:82}).toFile(`${coverOut}/${group}.webp`);
  coversDone.push(group);console.log(`✓ ${f} → ${coverOut}/${group}.webp (kapak)`);continue;}
 if(!ids.has(id)){skipped.push(f);continue;}
 const img=sharp(`${src}/${f}`),m=await img.metadata();
 let pipe=sharp(`${src}/${f}`).rotate();
 if(m.width!==m.height){const {data}=await sharp(`${src}/${f}`).extract({left:0,top:0,width:8,height:8}).raw().toBuffer({resolveWithObject:true});
  const background={r:data[0],g:data[1],b:data[2]};pipe=pipe.resize(size,size,{fit:'contain',background});}
 else pipe=pipe.resize(size,size,{fit:'cover'});
 await pipe.webp({quality:82}).toFile(`${out}/${id}.webp`);
 done.push(id);console.log(`✓ ${f} → ${out}/${id}.webp (${m.width}×${m.height}${m.width!==m.height?', kareye tamamlandı':''})`);}
// Listede olup resimler/ içinde artık bulunmayan eski dosyalar da korunur (klasörden silinse bile görsel kaybolmasın).
const list=(dir,known)=>fs.readdirSync(dir).filter(f=>f.endsWith('.webp')).map(f=>f.slice(0,-5)).filter(id=>known.has(id)).sort();
const all=list(out,ids),allCovers=list(coverOut,new Set(groups.map(g=>g.id)));
fs.writeFileSync('lib/terimler/gorseller.ts',`// Bu dosya scripts/gorselleri-hazirla.mjs tarafından üretilir; elle düzenlemeyin.\n// public/art/terimler/<kimlik>.webp görseli olan başlangıç terimleri.\nexport const bundledArt=new Set<string>(${JSON.stringify(all)});\n// public/art/kapaklar/<grup>.webp kapağı olan çalışma grupları.\nexport const bundledCovers=new Set<string>(${JSON.stringify(allCovers)});\n`);
console.log(`\n${done.length} görsel ve ${coversDone.length} kapak hazırlandı; toplam ${all.length} terimin görseli, ${allCovers.length} grubun kapağı var.`);
if(skipped.length)console.log(`Eşleşmeyen (terim ya da grup bulunamadı): ${skipped.join(', ')}`);
