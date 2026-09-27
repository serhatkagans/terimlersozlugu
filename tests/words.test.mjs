import test from 'node:test';
import assert from 'node:assert/strict';
import {categories,seedWords,seedWorks,slug,usesWord} from '../lib/words.ts';
import {groups} from '../lib/terimler/index.ts';
import {fold} from '../lib/game.ts';
test('Terim kullanımı ekleri ve işaretli terimleri tanır',()=>{
 assert.ok(usesWord('Shader\'ı yeniden yazdık.','Shader'));
 assert.ok(usesWord('Sunucuyu Node.js ile kurduk.','Node.js'));
 assert.ok(usesWord('Bir A/B testi yaptık.','A/B testi'));
 assert.ok(usesWord('Güvenlik duvarının kurallarını yazdık.','Güvenlik duvarı'));
 assert.ok(usesWord('Ağacı dengeledik.','Ağaç'));
 assert.ok(!usesWord('Bu cümlede terim yok.','Raycast'));
});
test('Çalışma grupları GençTek listesindeki adlarla ve tek kimlikle tanımlı',()=>{
 const ids=seedWorks.map(k=>k.id);assert.equal(new Set(ids).size,ids.length);
 for(const k of seedWorks){assert.ok(k.title&&k.author,k.id);assert.equal(k.month,'');assert.equal(k.kind,'terim');}
 for(const g of groups)if(g.id!=='oyun-tasarimi')assert.ok(g.terms.length>=30,`${g.title}: ${g.terms.length} terim`);
});
test('Başlangıç terimleri tutarlı',()=>{
 const ids=seedWords.map(w=>w.id);assert.equal(new Set(ids).size,ids.length,'terim kimlikleri benzersiz olmalı');
 for(const w of seedWords){
  assert.ok(seedWorks.some(k=>k.id===w.work),`${w.word}: grubu yok`);
  assert.ok(categories.includes(w.category),`${w.word}: kategori “${w.category}” geçersiz`);
  assert.ok(w.oldMeaning&&w.meaning&&w.example,`${w.word}: alan eksik`);
  assert.ok(usesWord(w.example,w.word),`${w.word}: örnek cümlede terim geçmiyor → ${w.example}`);
  // Kısa tanım oyunlarda ipucudur; terimi içerirse cevabı ele verir (tek sözcüklü ve 3 harften uzun terimlerde denetlenir).
  if(fold(w.word).length>3&&!/\s/.test(w.word))assert.ok(!fold(w.oldMeaning).includes(fold(w.word)),`${w.word}: kısa tanım terimi içeriyor → ${w.oldMeaning}`);
  assert.ok(w.example.length<=240&&w.oldMeaning.length<=300&&w.meaning.length<=300,`${w.word}: metin sınırı aşıldı`);
 }
 assert.equal(slug('Güvenlik duvarı'),'guvenlik-duvari');
});
test('Aynı grupta aynı terim iki kez yok',()=>{
 for(const g of groups){const seen=new Set();for(const [t] of g.terms){const k=fold(t);assert.ok(!seen.has(k),`${g.title}: “${t}” tekrar ediyor`);seen.add(k);}}
});
