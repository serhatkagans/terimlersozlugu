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
// Çoktan seçmeli şıklar: doğru cevap + önce aynı çalışma grubundan, sonra havuzun geri kalanından çeldiriciler.
// `label` verilirse ("Anlamını Bul" için anlam) aynı etiketi taşıyan iki şık gösterilmez.
export function choices<T extends {id:string;word:string;work:string}>(answer:T,pool:T[],count=4,rnd=Math.random,label:(w:T)=>string=w=>w.word){const seen=new Set([fold(label(answer))]);const others=pool.filter(w=>{const k=fold(label(w));if(w.id===answer.id||!k||seen.has(k))return false;seen.add(k);return true;});
const near=shuffle(others.filter(w=>w.work===answer.work),rnd),far=shuffle(others.filter(w=>w.work!==answer.work),rnd);return shuffle([answer,...[...near,...far].slice(0,count-1)],rnd);}
// Listeyi `size` büyüklüğünde sayfalara böler; tek maddelik son sayfa bir önceki sayfaya eklenir (eşleştirme için en az iki terim).
export function pages<T>(list:T[],size:number){const out:T[][]=[];for(let i=0;i<list.length;i+=size)out.push(list.slice(i,i+size));if(out.length>1&&out.at(-1)!.length===1)out.at(-2)!.push(...out.pop()!);return out;}
