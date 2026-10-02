import ExcelJS from 'exceljs';
import {authorized,database,illustrated} from '../../../../lib/server';
import {ownArt,type Word,type Work} from '../../../../lib/words';
export const dynamic='force-dynamic';
type Row=Word&{active:number;status:string;createdAt:number};
// Sözlükte yayında olan terimler (onaylı ve görünür; öneriler, reddedilenler ve arşivdekiler hariç) Excel (.xlsx) olarak: "Tüm terimler" sayfasında her sütunda filtre (çalışma grubu, kategori, ekleyen…),
// "Özet" sayfasında grup başına sayılar ve her çalışma grubu için ayrı, filtreli bir sayfa.
// Sütun adları içe aktarmadaki adlarla aynıdır; sayfadan kopyalanan satırlar "Excel / CSV → İçe aktar" alanına yapıştırılabilir.
const columns:{header:string;key:string;width:number}[]=[
{header:'Terim',key:'word',width:24},{header:'Çalışma grubu',key:'group',width:26},{header:'Karşılığı',key:'syllables',width:24},{header:'Kısa tanım',key:'oldMeaning',width:48},
{header:'Açıklama',key:'meaning',width:64},{header:'Örnek cümle',key:'example',width:56},{header:'Kategori',key:'category',width:16},{header:'Ekleyen',key:'addedBy',width:18},
{header:'Görsel',key:'image',width:10},{header:'Eklenme',key:'createdAt',width:12},{header:'Kimlik',key:'id',width:26}];
const brand='FF1F3A5F',light='FFE8EEF6';
// Excel sayfa adı en fazla 31 karakter olabilir ve : \ / ? * [ ] içeremez; aynı ad iki kez kullanılamaz.
function sheetName(title:string,used:Set<string>){let n=title.replace(/[:\\/?*[\]]/g,' ').slice(0,31).trim()||'Grup',i=2;while(used.has(n.toLocaleLowerCase('tr')))n=`${title.slice(0,27).trim()} (${i++})`;used.add(n.toLocaleLowerCase('tr'));return n;}
function table(ws:ExcelJS.Worksheet,cols:typeof columns,rows:Record<string,unknown>[]){ws.columns=cols;rows.forEach(r=>ws.addRow(r));
const head=ws.getRow(1);head.font={bold:true,color:{argb:'FFFFFFFF'}};head.fill={type:'pattern',pattern:'solid',fgColor:{argb:brand}};head.alignment={vertical:'middle'};head.height=22;
ws.views=[{state:'frozen',ySplit:1,xSplit:1}];ws.autoFilter={from:{row:1,column:1},to:{row:Math.max(1,rows.length+1),column:cols.length}};
ws.eachRow((row,i)=>{if(i===1)return;row.alignment={vertical:'top',wrapText:true};if(i%2===0)row.fill={type:'pattern',pattern:'solid',fgColor:{argb:light}};});
const date=cols.findIndex(c=>c.key==='createdAt')+1;if(date)ws.getColumn(date).numFmt='dd.mm.yyyy';}
export async function GET(request:Request){if(!authorized(request))return Response.json({error:'Oturum geçersiz. Yeniden giriş yapın.'},{status:401});
const db=database(),ill=illustrated();
const works=db.prepare('SELECT id,title,author,period,month,kind FROM works ORDER BY rowid').all() as Work[];
const words=db.prepare("SELECT w.* FROM words w LEFT JOIN works k ON k.id = w.work WHERE w.active = 1 AND w.status = 'approved' ORDER BY k.rowid,w.createdAt,w.rowid").all() as Row[];
const title=(id:string)=>works.find(k=>k.id===id)?.title??id;
// Başlangıç terimlerinin createdAt değeri sıra numarasıdır (tarih değil); onlarda Eklenme boş kalır.
const record=(w:Row)=>({word:w.word,group:title(w.work),syllables:w.syllables,oldMeaning:w.oldMeaning,meaning:w.meaning,example:w.example,category:w.category,addedBy:w.addedBy,image:ownArt(w,ill)?'Var':'Yok',createdAt:w.createdAt>1e12?new Date(w.createdAt):null,id:w.id});
const book=new ExcelJS.Workbook();book.creator='GençTek Bilişim Sözlüğü';book.created=new Date();
const used=new Set<string>(['tüm terimler','özet']);
table(book.addWorksheet('Tüm terimler',{properties:{tabColor:{argb:brand}}}),columns,words.map(record));
const summary=book.addWorksheet('Özet');
table(summary,[{header:'Çalışma grubu',key:'title',width:34},{header:'Kısa tanıtım',key:'author',width:50},{header:'Terim',key:'all',width:10},{header:'Görseli eksik',key:'missing',width:14}],
works.map(k=>{const ws=words.filter(w=>w.work===k.id);return {title:k.title,author:k.author,all:ws.length,missing:ws.filter(w=>!ownArt(w,ill)).length};}));
const total=summary.addRow({title:'TOPLAM',all:words.length,missing:words.filter(w=>!ownArt(w,ill)).length});total.font={bold:true};
for(const k of works){const list=words.filter(w=>w.work===k.id);if(!list.length)continue;table(book.addWorksheet(sheetName(k.title,used)),columns.filter(c=>c.key!=='group'),list.map(record));}
const buffer=await book.xlsx.writeBuffer();
return new Response(buffer as ArrayBuffer,{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':`attachment; filename="terimler-sozlugu-${new Date().toLocaleDateString('sv')}.xlsx"`,'Cache-Control':'no-store'}});}
