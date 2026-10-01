// Canlı yarışma (Kahoot tarzı): öğretmen oyunu açar, öğrenciler PIN ile bağlanır, sorular öğretmenin hızıyla ilerler.
// Akış: lobby (bekleme salonu) → question (önce yalnızca soru, sonra şıklar) → reveal (doğru cevap ve dağılım) → board (ara skor tablosu) → … → end (podyum).
// Oyunlar sunucu belleğinde tutulur (tek süreç); sunucu yeniden başlarsa süren oyunlar kapanır. Bağımlılığı yoktur (testler doğrudan içe aktarır).
// image: terimin görseli. hint: görsel cevabı ele vermiyorsa (terim zaten soruda yazıyorsa) soruyla birlikte, yoksa yalnızca cevap açılınca gösterilir.
export type LiveQ={prompt:string;tag:string;options:string[];correct:number;answer:string;image?:string|null;hint?:boolean};
export type LivePhase='lobby'|'question'|'reveal'|'board'|'end';
export const AVATARS=['🦊','🐼','🐯','🐸','🐵','🦄','🐙','🐧','🦁','🐨','🐲','🤖'];
type Ans={choice:number;ok:boolean;points:number;ms:number};
// prev: soru başlamadan önceki sıra (ara tabloda kimin yükseldiğini göstermek için).
type Player={token:string;name:string;avatar:string;score:number;streak:number;prev:number;answers:(Ans|undefined)[];joined:number};
// intro: şıklar açılmadan önce sorunun tek başına göründüğü süre (ms); cevap süresi şıklar açılınca (opensAt) başlar.
export type Live={pin:string;host:string;label:string;time:number;intro:number;qs:LiveQ[];phase:LivePhase;at:number;opensAt:number;endsAt:number;players:Map<string,Player>;seq:number;updatedAt:number};
// Next, rotaları ayrı paketleyebildiği için depo globalThis üzerinde tutulur.
const store=():Map<string,Live>=>((globalThis as {__gtLive?:Map<string,Live>}).__gtLive??=new Map());
const idle=3*60*60_000,maxGames=300,maxPlayers=300;
export function createLive(o:{pin:string;host:string;label:string;time:number;qs:LiveQ[];intro?:number},now=Date.now()):Live|undefined{const s=store();for(const [k,g] of s)if(now-g.updatedAt>idle)s.delete(k);
if(s.has(o.pin)||s.size>=maxGames)return undefined;const g:Live={intro:4000,...o,phase:'lobby',at:-1,opensAt:0,endsAt:0,players:new Map(),seq:0,updatedAt:now};s.set(o.pin,g);return g;}
export function findLive(pin:unknown,now=Date.now()){if(typeof pin!=='string')return undefined;const g=store().get(pin);if(g&&g.phase==='question'&&now>=g.endsAt)close(g);return g;}
const key=(s:string)=>s.trim().toLocaleLowerCase('tr').replace(/\s+/g,' ');
const ranked=(g:Live)=>[...g.players.values()].sort((a,b)=>b.score-a.score||a.joined-b.joined);
// Oyun başladıktan sonra da katılınabilir; aynı cihaz (token) geri gelirse kaldığı yerden sürer.
export function joinLive(g:Live,name:string,token:string,avatar?:string,now=Date.now()):'ok'|'taken'|'ended'|'full'{if(g.players.has(token))return 'ok';if(g.phase==='end')return 'ended';
if([...g.players.values()].some(p=>key(p.name)===key(name)))return 'taken';if(g.players.size>=maxPlayers)return 'full';
g.players.set(token,{token,name,avatar:avatar&&AVATARS.includes(avatar)?avatar:AVATARS[g.seq%AVATARS.length],score:0,streak:0,prev:g.players.size,answers:[],joined:g.seq++});g.updatedAt=now;return 'ok';}
export function kickLive(g:Live,name:string){for(const p of g.players.values())if(p.name===name)g.players.delete(p.token);}
function ask(g:Live,i:number,now:number){ranked(g).forEach((p,r)=>{p.prev=r;});g.at=i;g.phase='question';g.opensAt=now+g.intro;g.endsAt=g.opensAt+g.time*1000;}
// Soru kapanır: cevap vermeyenlerin serisi sıfırlanır.
function close(g:Live){for(const p of g.players.values())if(!p.answers[g.at])p.streak=0;g.phase='reveal';}
// Puan: doğru cevap 500–1000 (hız), seri bonusu ardışık her doğru için +100 (en çok +500). Herkes cevaplayınca soru kendiliğinden kapanır.
// Şıklar açılmadan (intro) cevap alınmaz.
export function answerLive(g:Live,token:string,choice:unknown,now=Date.now()){const p=g.players.get(token),q=g.qs[g.at];
if(!p||!q||g.phase!=='question'||now<g.opensAt||now>=g.endsAt||p.answers[g.at]||typeof choice!=='number'||!Number.isInteger(choice)||choice<0||choice>=q.options.length)return false;
const left=g.endsAt-now,ok=choice===q.correct,points=ok?Math.round(500+500*left/(g.time*1000))+Math.min(p.streak,5)*100:0;
p.answers[g.at]={choice,ok,points,ms:g.time*1000-left};p.streak=ok?p.streak+1:0;p.score+=points;g.updatedAt=now;
if([...g.players.values()].every(x=>x.answers[g.at]))close(g);return true;}
// Öğretmenin "ilerlet" düğmesi: her basışta bir sonraki aşamaya geçilir.
export function advanceLive(g:Live,now=Date.now()){g.updatedAt=now;
if(g.phase==='lobby'){if(!g.players.size)return false;ask(g,0,now);}
else if(g.phase==='question')close(g);
else if(g.phase==='reveal')g.phase=g.at+1<g.qs.length?'board':'end';
else if(g.phase==='board')ask(g,g.at+1,now);
else return false;return true;}
// İstemciye giden görünüm. Doğru cevap ve puanlar soru kapanmadan gönderilmez (cevaplayanın puanı da soru bitene dek eski hâliyle görünür).
// q.intro: şıkların açılmasına kalan süre; q.left: sorunun kapanmasına kalan süre (ikisi de ms).
export function viewLive(g:Live,token:string|null,host:boolean,now=Date.now()){const list=ranked(g),q=g.phase==='end'?undefined:g.qs[g.at],open=g.phase==='question',shown=!!q&&!open;
const row=(p:Player,i:number)=>({name:p.name,avatar:p.avatar,score:p.score,gain:p.answers[g.at]?.points??0,move:g.at>0?p.prev-i:0,streak:p.streak});
const i=token?list.findIndex(p=>p.token===token):-1,p=list[i],a=p?.answers[g.at];
const done=list.filter(x=>x.answers[g.at]),best=<T,>(xs:T[],v:(x:T)=>number)=>xs.reduce<T|undefined>((m,x)=>!m||v(x)>v(m)?x:m,undefined);
const riser=best(list.map(row).filter(r=>r.move>0),r=>r.move),fast=best(done.filter(x=>x.answers[g.at]!.ok),x=>-x.answers[g.at]!.ms),hot=best(list.filter(x=>x.streak>=2),x=>x.streak);
return {pin:g.pin,label:g.label,phase:g.phase,at:g.at,total:g.qs.length,time:g.time,count:list.length,host,
players:g.phase==='lobby'?list.map(x=>({name:x.name,avatar:x.avatar})):undefined,
q:q?{prompt:q.prompt,tag:q.tag,options:q.options,image:q.hint||shown?q.image??null:null,intro:open?Math.max(0,g.opensAt-now):0,left:open?Math.max(0,g.endsAt-now):0,answered:done.length}:undefined,
result:shown?{correct:q.correct,answer:q.answer,counts:q.options.map((_,n)=>done.filter(x=>x.answers[g.at]!.choice===n).length)}:undefined,
board:g.phase==='board'?list.slice(0,10).map(row):g.phase==='end'?list.map(row):undefined,
stars:g.phase==='board'?{riser:riser&&{name:riser.name,move:riser.move},fastest:fast&&{name:fast.name,secs:Math.round(fast.answers[g.at]!.ms/100)/10},streak:hot&&{name:hot.name,streak:hot.streak}}:undefined,
me:p?{name:p.name,avatar:p.avatar,score:open?p.score-(a?.points??0):p.score,rank:(open?p.prev:i)+1,choice:a?a.choice:null,ok:!open&&a?a.ok:null,points:!open&&a?a.points:0,streak:open?0:p.streak,move:!open&&g.at>0?p.prev-i:0}:undefined};}
export type LiveView=ReturnType<typeof viewLive>;
