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
