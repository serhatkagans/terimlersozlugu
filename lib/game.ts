// Sözlük Kitabı, Çalışma Grupları ve Tahmin Oyunu'nun ortak yardımcıları. Bağımlılığı yoktur (testler doğrudan içe aktarır).
const plain:Record<string,string>={ç:'c',ğ:'g',ı:'i',ö:'o',ş:'s',ü:'u',â:'a',î:'i',û:'u',ñ:'n',ŋ:'n'};
// Serbest metin tahminini karşılaştırmak için: büyük/küçük harf, şapka, Türkçe harf ve eski harf (ñ, ŋ) farkı yok sayılır.
export const fold=(s:string)=>s.toLocaleLowerCase('tr').replace(/[çğıöşüâîûñŋ]/g,c=>plain[c]).replace(/[^a-z0-9]/g,'');
// Terim grubun adında geçiyorsa (Robotik → robot) ya da grubun adını bütünüyle içeriyorsa (Güvenli İnternet → Güvenli İnternet Günü) grup adı cevabı ele verir.
export const inTitle=(word:string,title:string)=>{const w=fold(word),t=fold(title);return w.length>=3&&!!t&&(t.includes(w)||w.includes(t));};
export const sameWord=(a:string,b:string)=>!!fold(a)&&fold(a)===fold(b);
const isLetter=(c:string)=>c.toLocaleLowerCase('tr')!==c.toLocaleUpperCase('tr');
// Terime bağlı sabit sözde rastgele sayı üreteci: aynı kelime her çizimde aynı biçimde maskelenir.
export function seeded(key:string){let h=2166136261;for(const c of key)h=Math.imul(h^c.charCodeAt(0),16777619);return ()=>{h=Math.imul(h^(h>>>15),2246822507);h=Math.imul(h^(h>>>13),3266489909);return ((h^=h>>>16)>>>0)/4294967296;};}
// Harflerin `ratio` kadarını gizler: en az bir harf gizli, (iki harften uzun kelimelerde) en az bir harf açık kalır.
export function mask(word:string,ratio:number,key=word){const chars=[...word.toLocaleUpperCase('tr')];const letters=chars.map((c,i)=>isLetter(c)?i:-1).filter(i=>i>=0);
const hide=Math.min(Math.max(1,Math.round(letters.length*ratio)),Math.max(1,letters.length-1));const rnd=seeded(key);const hidden=new Set(shuffle(letters,rnd).slice(0,hide));
return chars.map((c,i)=>hidden.has(i)?'_':c).join(' ');}
export function shuffle<T>(list:T[],rnd=Math.random){const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
// Çoktan seçmeli şıklar: doğru cevap + önce aynı çalışma grubu ve aynı kategoriden (en benzer, en zor), sonra aynı gruptan, en son havuzun geri kalanından çeldiriciler.
// `label` verilirse ("Anlamını Bul" için anlam) aynı etiketi taşıyan iki şık gösterilmez.
export function choices<T extends {id:string;word:string;work:string;category?:string}>(answer:T,pool:T[],count=4,rnd=Math.random,label:(w:T)=>string=w=>w.word){const seen=new Set([fold(label(answer))]);const others=pool.filter(w=>{const k=fold(label(w));if(w.id===answer.id||!k||seen.has(k))return false;seen.add(k);return true;});
const near=shuffle(others.filter(w=>w.work===answer.work),rnd),far=shuffle(others.filter(w=>w.work!==answer.work),rnd),like=(w:T)=>!!answer.category&&w.category===answer.category;
return shuffle([answer,...[...near.filter(like),...near.filter(w=>!like(w)),...far].slice(0,count-1)],rnd);}
function hideExpansion(text:string,init:string){const n=init.length,ws=[...text.matchAll(/[\p{L}\p{N}]+/gu)],cut:[number,number][]=[];
for(let i=0;i+n<=ws.length;i++){const w=ws.slice(i,i+n);if(fold(w.map(x=>x[0][0]).join(''))!==init)continue;
const from=w[0].index!,to=w[n-1].index!+w[n-1][0].length;if(/^[\p{L}\p{N}\s-]*$/u.test(text.slice(from,to))){cut.push([from,to]);i+=n-1;}}
for(const [from,to] of cut.reverse())text=text.slice(0,from)+'•••'+text.slice(to);return text;}
// Metinde terimin sözcüklerini (ve ekli hâllerini) ••• ile gizler: tanım ya da ipucu cevabı ele vermesin ("Yapay Zekâ Yasası" → "••• ••• sistemlerini…").
// Üç–altı harfli kısaltmalarda ("DOM", "API") baş harfleri kısaltmayı veren açılım da gizlenir ("Document Object Model").
export function hideWords(text:string,term:string){const parts=term.split(/[^\p{L}\p{N}]+/u).map(fold).filter(p=>p.length>=3);
if(/^[A-ZÇĞİÖŞÜ]{3,6}$/u.test(term.trim()))text=hideExpansion(text,fold(term));
if(!parts.length)return text;
return text.replace(/[\p{L}\p{N}]+/gu,t=>{const f=fold(t);return parts.some(p=>f.startsWith(p)||(p.length>=5&&f.startsWith(p.slice(0,-1))))?'•••':t;});}
// Listeyi `size` büyüklüğünde sayfalara böler; tek maddelik son sayfa bir önceki sayfaya eklenir (eşleştirme için en az iki terim).
export function pages<T>(list:T[],size:number){const out:T[][]=[];for(let i=0;i<list.length;i+=size)out.push(list.slice(i,i+size));if(out.length>1&&out.at(-1)!.length===1)out.at(-2)!.push(...out.pop()!);return out;}
// Arama için katlama: fold gibi harf farklarını yok sayar ama sözcük sınırlarını tek boşluk olarak korur (" yapay zeka ").
export const searchFold=(s:string)=>` ${s.toLocaleLowerCase('tr').replace(/[çğıöşüâîûñŋ]/g,c=>plain[c]).replace(/[^a-z0-9]+/g,' ').trim()} `;
// Terim araması: eşleşenler önce terimin kendisine, sonra karşılığına, en son tanımına göre sıralanır ("zeka" → "Yapay zekâ").
// Sorgu boşsa liste olduğu gibi döner.
export function search<T extends {word:string;syllables?:string;oldMeaning?:string|null;meaning:string}>(list:T[],query:string):T[]{
const q=searchFold(query).trim(),tight=q.replace(/ /g,'');if(!q)return list;
const rank=(w:T)=>{const word=searchFold(w.word),alt=searchFold(w.syllables||''),text=searchFold(`${w.oldMeaning??''} ${w.meaning}`),compact=word.replace(/ /g,'');
if(compact===tight)return 0;if(word.startsWith(' '+q)||compact.startsWith(tight))return 1;if(word.includes(' '+q)||alt.includes(' '+q))return 2;
if(compact.includes(tight)||alt.replace(/ /g,'').includes(tight))return 3;if(text.includes(' '+q))return 4;return -1;};
return list.map(w=>({w,r:rank(w)})).filter(x=>x.r>=0).sort((a,b)=>a.r-b.r||a.w.word.localeCompare(b.w.word,'tr')).map(x=>x.w);}
