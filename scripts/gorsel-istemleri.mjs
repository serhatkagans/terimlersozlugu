// Terim ve grup görselleri için GPT / Gemini istemlerini Excel'e yazar: node scripts/gorsel-istemleri.mjs
// Üretilen resmi "Dosya adı" sütunundaki adla kaydedip panelde Görseller → Toplu görsel yükle ile yükleyin (ad, terim kimliğiyle eşleşir).
import ExcelJS from 'exceljs';
import {seedWords,seedWorks} from '../lib/words.ts';
// lib/ai.ts'teki houseStyle ile aynı çizim dili: bütün kartlar tek bir setin parçası gibi görünsün.
const style='Square 1:1 image. Clean, modern editorial tech illustration with soft depth and gentle gradients; deep navy, teal and a warm red (#c4161c) accent on a light background; one clear focal idea; friendly and school-appropriate; any people are teenagers or adults. Absolutely no text, letters, numbers, logos, brand marks or watermarks.';
const title=id=>seedWorks.find(k=>k.id===id)?.title??id;
const termPrompt=w=>`${style}\n\nIllustrate the technical term "${w.word}"${w.syllables&&w.syllables!==w.word?` (${w.syllables})`:''} from the field of "${title(w.work)}". Meaning (Turkish): ${w.oldMeaning}. More context (Turkish): ${w.meaning}\nShow a concrete, easy-to-read scene that lets a high school student guess the concept, rather than abstract symbols.`;
const coverPrompt=k=>`Landscape 4:3 cover image. Clean, modern editorial tech illustration with soft depth; deep navy, teal and a warm red (#c4161c) accent; no text, letters, logos or watermarks.\n\nA cover for the "${k.title}" working group of a youth technology program (${k.author}). Show teenagers working together on a typical project of this field, with the key tools and objects of the field clearly visible.`;
const book=new ExcelJS.Workbook();
function sheet(name,cols,rows){const ws=book.addWorksheet(name);ws.columns=cols;rows.forEach(r=>ws.addRow(r));ws.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};ws.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFC4161C'}};ws.views=[{state:'frozen',ySplit:1}];ws.autoFilter={from:{row:1,column:1},to:{row:rows.length+1,column:cols.length}};ws.eachRow((r,i)=>{if(i>1)r.alignment={vertical:'top',wrapText:true};});}
sheet('Terim görselleri',[{header:'Dosya adı',key:'file',width:30},{header:'Terim',key:'word',width:24},{header:'Çalışma grubu',key:'group',width:26},{header:'Kategori',key:'category',width:14},{header:'İstem (kopyalayıp yapıştırın)',key:'prompt',width:110}],
 seedWords.map(w=>({file:`${w.id}.png`,word:w.word,group:title(w.work),category:w.category,prompt:termPrompt(w)})));
sheet('Grup kapakları',[{header:'Grup',key:'group',width:30},{header:'Yükleme yeri',key:'where',width:36},{header:'İstem (kopyalayıp yapıştırın)',key:'prompt',width:110}],
 seedWorks.map(k=>({group:k.title,where:'Panel → Çalışma grupları → Kapak yükle',prompt:coverPrompt(k)})));
sheet('Ortak stil',[{header:'Her isteme eklenen ortak stil',key:'s',width:140}],[{s:style}]);
await book.xlsx.writeFile('gorsel-istemleri.xlsx');
console.log(`${seedWords.length} terim, ${seedWorks.length} grup kapağı → gorsel-istemleri.xlsx`);
