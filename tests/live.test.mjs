import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceLive,answerLive,createLive,findLive,joinLive,kickLive,viewLive} from '../lib/live.ts';
const qs=[0,1,2].map(i=>({prompt:`soru ${i}`,tag:'',options:['a','b','c','d'],correct:i,answer:'abcd'[i]}));
const A='a'.repeat(32),B='b'.repeat(32),C='c'.repeat(32);
test('Canlı yarışma: katılım, öğretmenin ilerletmesi, puan, sıra değişimi ve podyum',()=>{
 const g=createLive({pin:'111111',host:'h',label:'9-B',time:20,qs,intro:0},0);assert.ok(g);assert.equal(createLive({pin:'111111',host:'x',label:'',time:20,qs},0),undefined,'aynı PIN ikinci kez açılmaz');
 assert.equal(advanceLive(g,0),false,'oyuncu yokken başlamaz');
 assert.equal(joinLive(g,'Elif',A),'ok');assert.equal(joinLive(g,' elif ',B),'taken');assert.equal(joinLive(g,'Can',B),'ok');assert.equal(joinLive(g,'Başka',A),'ok','aynı cihaz geri gelir');assert.equal(joinLive(g,'Uygunsuz',C),'ok');
 kickLive(g,'Uygunsuz');assert.deepEqual(viewLive(g,null,true,0).players.map(p=>p.name),['Elif','Can']);assert.equal(viewLive(g,C,false,0).me,undefined);
 // 1. soru: Can hemen doğru, Elif yanlış.
 assert.ok(advanceLive(g,1000));assert.equal(g.phase,'question');
 assert.ok(answerLive(g,B,0,1000));assert.ok(!answerLive(g,B,1,1500),'tek cevap');
 let v=viewLive(g,B,false,2000);assert.equal(v.result,undefined,'soru kapanmadan doğru cevap gitmez');assert.equal(v.me.score,0);assert.equal(v.me.ok,null);assert.equal(v.me.choice,0);assert.equal(v.q.answered,1);
 assert.ok(answerLive(g,A,3,11000));assert.equal(g.phase,'reveal','herkes cevaplayınca soru kapanır');
 v=viewLive(g,B,false,11000);assert.equal(v.me.points,1000);assert.equal(v.me.rank,1);assert.deepEqual(v.result.counts,[1,0,0,1]);assert.equal(v.result.correct,0);
 assert.ok(advanceLive(g,12000));assert.equal(g.phase,'board');assert.equal(viewLive(g,null,true,12000).board[0].name,'Can');
 // 2. soru: Elif hemen doğru, Can cevap vermez; süre bitince soru kapanır.
 assert.ok(advanceLive(g,20000));assert.ok(answerLive(g,A,1,20000));
 assert.equal(findLive('111111',41000).phase,'reveal');assert.ok(!answerLive(g,B,1,41000));
 advanceLive(g,42000);v=viewLive(g,A,false,42000);assert.equal(v.me.score,1000);assert.equal(v.board[0].name,'Elif','eşit puanda önce katılan üstte');assert.equal(v.me.move,1);assert.equal(v.stars.riser.name,'Elif');assert.equal(v.stars.fastest.name,'Elif');
 // 3. soru: Elif yine hemen doğru (seri bonusu), Can yanlış.
 advanceLive(g,50000);answerLive(g,A,2,50000);answerLive(g,B,0,51000);assert.equal(g.phase,'reveal');
 advanceLive(g,60000);assert.equal(g.phase,'end');v=viewLive(g,A,false,60000);assert.equal(v.board[0].name,'Elif');assert.equal(v.board[0].score,2100,'hız 1000 + seri bonusu 100');assert.equal(v.board.length,2);
 assert.equal(advanceLive(g,61000),false);assert.equal(joinLive(g,'Geç',C),'ended');
});
test('Canlı yarışma: şıklar açılmadan cevap alınmaz, avatar ve görsel kuralları',()=>{
 const pic=[{...qs[0],image:'/a.png'},{...qs[1],image:'/b.png',hint:true}],g=createLive({pin:'222222',host:'h',label:'',time:10,qs:pic},0);
 joinLive(g,'Elif',A,'🐼');joinLive(g,'Can',B,'yok');let v=viewLive(g,A,false,0);assert.equal(v.me.avatar,'🐼');assert.ok(v.players[1].avatar,'geçersiz avatar yerine sıradaki verilir');
 advanceLive(g,0);v=viewLive(g,A,false,1000);assert.equal(v.q.intro,3000);assert.equal(v.q.left,13000);assert.equal(v.q.image,null,'cevabı ele veren görsel soru açıkken gitmez');
 assert.ok(!answerLive(g,A,0,3999));assert.ok(answerLive(g,A,0,4000));assert.equal(viewLive(g,A,false,4000).me.score,0);
 advanceLive(g,5000);v=viewLive(g,A,false,5000);assert.equal(v.q.image,'/a.png');assert.equal(v.me.score,1000);
 advanceLive(g,6000);advanceLive(g,7000);assert.equal(viewLive(g,A,false,7000).q.image,'/b.png','ipucu görseli soruyla birlikte gider');
});
