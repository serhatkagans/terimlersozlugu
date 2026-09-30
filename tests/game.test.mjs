import test from 'node:test';
import assert from 'node:assert/strict';
import {choices,fold,hideWords,inTitle,mask,pages,sameWord,search,shuffle} from '../lib/game.ts';
test('Serbest metin tahmini harf farklarını tolere eder',()=>{
 assert.ok(sameWord('yalnuk','yalŋuk'));assert.ok(sameWord('MUN','muñ'));assert.ok(sameWord('edgu','edgü'));assert.ok(sameWord(' Nigah ','nigâh'));assert.ok(sameWord('KÖRKLÜG','körklüg'));
 assert.ok(!sameWord('kutlu','kut'));assert.ok(!sameWord('','kut'));assert.equal(fold('Tuğyan'),'tugyan');
});
test('Maskeleme oranı uygular, en az bir harf gizler ve açık bırakır',()=>{
 const hidden=m=>m.split(' ').filter(c=>c==='_').length;
 assert.equal(hidden(mask('kut',.3)),1);assert.equal(hidden(mask('kut',.7)),2);assert.equal(hidden(mask('öd',.7)),1);
 assert.equal(hidden(mask('tahassür',.3)),2);assert.equal(hidden(mask('tahassür',.7)),6);
 assert.equal(mask('yalŋuk',.5),mask('yalŋuk',.5),'aynı kelime her seferinde aynı maskelenir');
 assert.ok(/^[A-ZÇĞİÖŞÜÂŊ_ ]+$/u.test(mask('yalŋuk',.5)));
});
test('Şıklar doğru cevabı içerir ve tekrar etmez',()=>{
 const pool=['kut','bilig','edgü','yablak','öd','hikmet'].map((w,i)=>({id:w,word:w,work:i<5?'kb':'h'}));
 for(let i=0;i<20;i++){const c=choices(pool[0],pool,4);assert.equal(c.length,4);assert.ok(c.some(x=>x.id==='kut'));assert.equal(new Set(c.map(x=>x.id)).size,4);assert.ok(!c.some(x=>x.work==='h'),'önce aynı çalışma grubundan çeldirici');}
 assert.deepEqual(shuffle([1,2,3]).sort(),[1,2,3]);
});
test('Sayfalama tek maddelik son sayfa bırakmaz',()=>{
 assert.deepEqual(pages([1,2,3,4,5,6],5),[[1,2,3,4,5,6]]);assert.deepEqual(pages([1,2,3,4,5,6,7,8],5),[[1,2,3,4,5],[6,7,8]]);assert.deepEqual(pages([1],5),[[1]]);
});
test('CSV: Excel ayraçları, tırnaklar ve başlık eşleme',async()=>{
 const {parseCsv,rowsToEntries,toCsv}=await import('../lib/csv.ts');
 const semi='﻿Terim;Çalışma grubu;Kısa tanım;Örnek cümle\r\nShader;Oyun Tasarımı;"Işık, renk hesabı";"Suyu ""Shader"" ile; parlattık."\r\n';
 assert.deepEqual(rowsToEntries(parseCsv(semi))[0],{word:'Shader',work:'Oyun Tasarımı',syllables:'',oldMeaning:'Işık, renk hesabı',meaning:'',example:'Suyu "Shader" ile; parlattık.',category:'',addedBy:''});
 const tab='Bug\tOyun Tasarımı\tHata\tBeklenmeyen davranış\t\tBug düzeldi.\tYazılım\tElif, 10-B\n';
 assert.deepEqual(rowsToEntries(parseCsv(tab))[0],{word:'Bug',work:'Oyun Tasarımı',syllables:'Hata',oldMeaning:'Beklenmeyen davranış',meaning:'',example:'Bug düzeldi.',category:'Yazılım',addedBy:'Elif, 10-B'});
 const exported='Terim\tÇalışma grubu\tKarşılığı\tKısa tanım\tAçıklama\tÖrnek cümle\tKategori\tEkleyen\tDurum\nVPN\tSiber Güvenlik\tSanal özel ağ\tŞifreli tünel\t\tVPN ile bağlandık.\tGüvenlik\t\tOnaylı\n';
 assert.equal(rowsToEntries(parseCsv(exported))[0].syllables,'Sanal özel ağ','dışa aktarılan Excel sütunları da tanınmalı');
 const back=parseCsv(toCsv([['a;b','c"d','e\nf']]));assert.deepEqual(back,[['a;b','c"d','e\nf']]);
});
test('Grup adında geçen (ya da grup adını içeren) terim bilmece sayılmaz',()=>{
 assert.ok(inTitle('Robot','Robotik'));assert.ok(inTitle('E-ticaret','E-Ticaret ve E-İhracat'));assert.ok(inTitle('Güvenli İnternet Günü','Güvenli İnternet'));
 assert.ok(!inTitle('Shader','Oyun Tasarımı'));assert.ok(!inTitle('VPN','Siber Güvenlik'));assert.ok(!inTitle('UI','Oyun Tasarımı'));
});
test('arama Türkçe harf ve şapka farkını yok sayar, terimi tanımdan önce sıralar',()=>{
 const list=[{word:'Yapay zekâ',syllables:'Artificial intelligence',meaning:'Makinelerin öğrenmesi'},{word:'Açık kaynak',syllables:'Open source',meaning:'Kaynak kodu herkese açık yazılım'},{word:'Kod',syllables:'Code',meaning:'Açık kaynak projelerde paylaşılan metin'}];
 assert.deepEqual(search(list,'yapay zeka').map(w=>w.word),['Yapay zekâ']);
 assert.deepEqual(search(list,'ZEKA').map(w=>w.word),['Yapay zekâ']);
 assert.deepEqual(search(list,'acik').map(w=>w.word),['Açık kaynak','Kod']);
 assert.deepEqual(search(list,'open').map(w=>w.word),['Açık kaynak']);
 assert.equal(search(list,'  ').length,3);
});
test('Şıklarda önce aynı gruptan aynı kategorideki terimler gelir; tanımda terim gizlenir',()=>{
 const pool=[['a','Donanım'],['b','Donanım'],['c','Donanım'],['d','Donanım'],['e','Yazılım'],['f','Yazılım']].map(([id,category])=>({id,word:id,work:'g',category}));
 for(let i=0;i<20;i++)assert.ok(!choices(pool[0],pool,4).some(x=>x.category==='Yazılım'));
 assert.equal(hideWords('Avrupa Birliği’nin yapay zekâ sistemlerini düzenleyen yasası','Yapay Zekâ Yasası'),'Avrupa Birliği’nin ••• ••• sistemlerini düzenleyen •••');
 assert.equal(hideWords('Verilerin saklandığı yer','Veri tabanı'),'••• saklandığı yer');
 assert.equal(hideWords('Document Object Model. JavaScript sayfayı DOM üzerinden değiştirir.','DOM'),'•••. JavaScript sayfayı ••• üzerinden değiştirir.');
 assert.equal(hideWords('Ağ üzerinden gelen istek','Ağ'),'Ağ üzerinden gelen istek','üç harften kısa sözcük gizlenmez');
});
