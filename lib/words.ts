// GençTek Terimler Sözlüğü: her çalışma grubunun temel terimleri. Veritabanı boşken bir kez yüklenir; sonrasında terimler görevli panelinden yönetilir.
// Veri modeli ilk sürümden (Kelimeden Hayale) geliyor; iç adlar korunmuştur: Work = çalışma grubu, Word = terim.
// Terime özel resim DATA_DIR/art/kelimeler/<id>.png olarak durur; yoksa `image` alanındaki ortak resim kullanılır.
import {groups,type TermRow} from './terimler/index.ts';
import {bundledArt,bundledCovers} from './terimler/gorseller.ts';
// title: grup adı · author: grubun kısa tanıtımı · period ve month artık kullanılmıyor (eski veritabanı uyumu için duruyor).
export type Work = {id:string;title:string;author:string;period:string;month:string;kind?:string};
// word: terim · syllables: karşılığı (İngilizce terimde Türkçesi, Türkçe terimde İngilizcesi) · oldMeaning: kısa tanım (oyunlarda ipucu) · meaning: açıklama.
// status: pending (öğrenci önerisi) · approved · rejected.
export type Word = {id:string;word:string;syllables:string;meaning:string;category:string;color:string;emoji:string;example:string;scene:string;image:string;work:string;quote?:string|null;note?:string|null;oldMeaning?:string|null;addedBy?:string|null;status?:string};
export const categories=['Temel kavram','Yazılım','Donanım','Güvenlik','Tasarım','İş ve toplum'];
export const colors=['lilac','peach','yellow','sage'];
export const fallbackArt=['clouds','forest','sunrise','stars'];
// Alan adları. Tek tür vardır (terim); `kind` sütunu eski veritabanı uyumu için duruyor.
export const kinds={
terim:{label:'Terim sözlüğü',word:'Terim',old:'Kısa tanımı',now:'Açıklama',oldShort:'Tanım',nowShort:'Açıklama',wordHint:'Örn. Shader',oldHint:'Örn. Yüzeyin ekranda nasıl görüneceğini hesaplayan program',nowHint:'Ne işe yarar? Nerede kullanılır? Bir örnek ver.'}};
export type Kind=keyof typeof kinds;
export const kindOf=(_k?:{kind?:string}|null)=>kinds.terim;
export const seedWorks: Work[] = groups.map(g=>({id:g.id,title:g.title,author:g.about,period:'',month:'',kind:'terim'}));
export type {TermRow};
// Grubun simgesi; panelden eklenen yeni gruplar için genel simge.
export const emojiOf=(id:string)=>groups.find(g=>g.id===id)?.emoji??'📘';
export type Card = {id:string;wordId:string;sentence:string;nickname:string;scene:string;style:string;image:string;mode:string;createdAt:number;approved:number};
// Alt adreste yayında (BASE_PATH) bütün yerel adreslerin önüne eklenir; next.config.ts derlemede doldurur.
export const base=process.env.NEXT_PUBLIC_BASE_PATH||'';
export const art=(name:string)=>name.includes('.')?`${base}/art/${name}`:`${base}/art/${name}.png`;
// Kelimeye özel resim: yüklenmiş dosya ya da public/art altındaki çizim. Yoksa null ("Görsel bekleniyor").
export const ownArt=(w:Word,illustrated:Record<string,number>)=>illustrated[w.id]?wordArt(w.id,illustrated[w.id]):w.image.includes('.')?art(w.image):null;
export const cover=(id:string,version:number)=>`${base}/api/cover/${id}?v=${version}`;
// Grup kapağı: panelden yüklenen kapak, yoksa public/art/kapaklar altındaki hazır kapak. İkisi de yoksa null (grup simgesi gösterilir).
export const coverOf=(id:string,covers:Record<string,number>)=>covers[id]?cover(id,covers[id]):bundledCovers.has(id)?`${base}/art/kapaklar/${id}.webp`:null;
export const wordArt=(id:string,version:number)=>`${base}/api/word-art/${id}?v=${version}`;
export const workOf=(works:Work[],w:Word)=>works.find(x=>x.id===w.work)??{id:w.work,title:'',author:'',period:'',month:'',kind:'eser'};
// Türkçe harfleri sadeleştirip adres dostu kimlik üretir: "Çalıkuşu" → "calikusu".
const ascii:Record<string,string>={ç:'c',ğ:'g',ı:'i',ö:'o',ş:'s',ü:'u',â:'a',î:'i',û:'u',ñ:'n',ŋ:'n'};
export const slug=(s:string)=>s.toLocaleLowerCase('tr').replace(/[çğıöşüâîûñŋ]/g,c=>ascii[c]).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40);
// Cümlede kelime aranırken şapka işaretleri (â, î, û), ünsüz yumuşaması (şafak → şafağı) ve ünlü düşmesi (gönül → gönlü) dikkate alınır.
const fold=(s:string)=>s.toLocaleLowerCase('tr').replace(/â/g,'a').replace(/î/g,'i').replace(/û/g,'u');
const soft:Record<string,string>={k:'ğ',p:'b',t:'d',ç:'c'};
const vowel=/[aeıioöuü]/;
// Çok sözcüklü terimlerde her sözcük ayrı aranır ("A/B testi", "Node.js" işaretlerden bölünür); sondaki fiilin -mak/-mek eki atılır.
export function usesWord(sentence:string,word:string):boolean{const parts=word.trim().split(/[^\p{L}\p{N}-]+/u).filter(Boolean);if(!parts.length)return false;if(parts.length<2)return usesOne(sentence,parts[0]);const last=parts.at(-1)!,verb=/m[ae]k$/.test(last)?last.slice(0,-3):last;return [...parts.slice(0,-1),verb].every(p=>usesOne(sentence,p));}
// Kelime cümledeki bir sözcüğün başında aranır (Türkçede ekler sona gelir): "şafak" içindeki "afak" âfâk sayılmaz.
function usesOne(sentence:string,word:string){const tokens=fold(sentence).split(/[^\p{L}\p{N}-]+/u),w=fold(word),last=w.at(-1)!;const drop=w.length>=4&&!vowel.test(last)&&vowel.test(w.at(-2)!)&&!vowel.test(w.at(-3)!)?w.slice(0,-2)+last:'';
const forms=[w,soft[last]?w.slice(0,-1)+soft[last]:'',drop].filter(Boolean);return tokens.some(t=>forms.some(f=>t.startsWith(f)));}
// Görseli hazırlanmış terimler (resimler/ → scripts/gorselleri-hazirla.mjs) public/art/terimler/<kimlik>.webp ile başlar.
// Aynı terim iki grupta geçerse (ör. "API") ikinci kimliğe grup adı eklenir.
const used=new Set<string>();
export const seedWords: Word[] = groups.flatMap(g=>g.terms.map(t=>({g,t}))).map(({g,t:[word,equivalent,short,meaning,example,category]},i)=>{let id=slug(word);if(used.has(id))id=slug(`${word}-${g.id}`);used.add(id);
return {id,word,syllables:equivalent,meaning,oldMeaning:short,category,color:colors[i%colors.length],emoji:g.emoji,example,scene:`“${word}” kavramını anlatan bir sahne: ${short}`,image:bundledArt.has(id)?`terimler/${id}.webp`:fallbackArt[i%fallbackArt.length],work:g.id,status:'approved',quote:null,note:null};});
