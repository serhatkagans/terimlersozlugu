import test from 'node:test';
import assert from 'node:assert/strict';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3000';
test('A card is durable, retrievable and private until approved',async()=>{
 const response=await fetch(base+'/api/cards',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({wordId:'shader',sentence:'Oyunumuzdaki su efektini yeni bir Shader ile yaptık.',nickname:'Test Kâşifi',scene:'Parlayan bir göl ve ekran başındaki öğrenciler',style:'Çizgi roman',mode:'demo'})});
 assert.equal(response.status,201);const {card}=await response.json();assert.equal(card.approved,0);
 const read=await fetch(base+'/api/cards?id='+card.id);assert.deepEqual((await read.json()).card,card);
 const gallery=await fetch(base+'/api/cards');assert.ok(!(await gallery.json()).cards.some(c=>c.id===card.id));
 const admin=await fetch(base+'/api/admin');assert.equal(admin.status,401);
});
test('A term suggestion stays hidden until approved',async()=>{
 const word='deneme'+Date.now().toString(36);
 const response=await fetch(base+'/api/words',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({word,work:'oyun-tasarimi',oldMeaning:'Test tanımı',example:`Bu bir ${word} cümlesidir.`,name:'Test Öğrenci',school:'Test Lisesi'})});
 assert.equal(response.status,201);const {word:saved}=await response.json();assert.equal(saved.status,'pending');
 assert.ok(!(await (await fetch(base+'/')).text()).includes(word),'onaysız öneri sayfada görünmemeli');
 const duplicate=await fetch(base+'/api/words',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({word:'Shader',work:'oyun-tasarimi',oldMeaning:'Görünüm hesabı',example:'Suyu bir Shader ile parlattık.',name:'Test Öğrenci',school:'Test Lisesi'})});assert.equal(duplicate.status,400);
 const missing=await fetch(base+'/api/words',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({word:'Raycast',work:'oyun-tasarimi',oldMeaning:'Işın gönderme',example:'Bu cümlede o terim hiç yok.',name:'Test Öğrenci',school:'Test Lisesi'})});assert.equal(missing.status,400);
});
test('Invalid input and cross-origin writes are refused',async()=>{
 const invalid=await fetch(base+'/api/cards',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({wordId:'unknown'})});assert.equal(invalid.status,400);
 const cross=await fetch(base+'/api/cards',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://untrusted.example'},body:'{}'});assert.equal(cross.status,403);
 const config=await fetch(base+'/api/config');const payload=await config.json();assert.deepEqual(Object.keys(payload).sort(),['admin','ai','teacher']);
});
test('A class gives each device and nickname one scored round',async()=>{
 const json=(body)=>({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const made=await fetch(base+'/api/classes',json({label:'9-B',mode:'word-kolay',group:''}));assert.equal(made.status,201);
 const {class:c}=await made.json();assert.match(c.code,/^\d{6}$/);assert.equal(c.label,'9-B');
 const name='Sınıf Testi '+Date.now().toString(36),token='a'.repeat(32),other='b'.repeat(32);
 assert.equal((await fetch(base+'/api/scores',json({mode:'word-kolay',score:900,class:c.code,token}))).status,409,'tura girmeden skor yazılmaz');
 assert.equal((await fetch(base+'/api/classes',json({code:c.code,name,token}))).status,201);
 const started=await (await fetch(base+'/api/classes?code='+c.code+'&token='+token)).json();assert.deepEqual(started,{class:c,top:[{name,score:null}],played:true});
 const again=await fetch(base+'/api/classes',json({code:c.code,name:'Başka Ad',token}));assert.equal(again.status,200);assert.equal((await again.json()).played,true,'aynı cihaz ikinci kez puanlı tura giremez');
 assert.equal((await fetch(base+'/api/classes',json({code:c.code,name:name.toLocaleUpperCase('tr'),token:other}))).status,409,'aynı rumuz başka cihazda kullanılamaz');
 assert.equal((await fetch(base+'/api/scores',json({mode:'word-zor',score:900,class:c.code,token}))).status,400,'sınıfın oyun türü dışında skor kabul edilmez');
 assert.equal((await fetch(base+'/api/scores',json({mode:'word-kolay',score:900,class:c.code,token}))).status,201);
 assert.equal((await fetch(base+'/api/scores',json({mode:'word-kolay',score:2000,class:c.code,token}))).status,409,'skor bir kez yazılır');
 assert.equal((await fetch(base+'/api/scores',json({mode:'word-kolay',score:900,class:'000000',token}))).status,404);
 const read=await (await fetch(base+'/api/classes?code='+c.code+'&token='+other)).json();assert.deepEqual(read,{class:c,top:[{name,score:900}],played:false});
 const general=await (await fetch(base+'/api/scores?mode=word-kolay')).json();assert.ok(!general.top.some(t=>t.name===name),'sınıf skoru genel tabloya karışmaz');
 assert.equal((await fetch(base+'/api/classes?code=abc')).status,404);
 assert.equal((await fetch(base+'/api/classes',json({label:'',mode:'word-kolay'}))).status,400);
});
