// Hazır Kahoot soru setleri: terim havuzundan üretilmeyen, öğretmenin hazırladığı sabit sorular. Canlı yarışmada (live-game.tsx) "Tür" olarak seçilir.
// Bir soru iki şıklı (Doğru/Yanlış) ya da dört şıklı olabilir. Her satır: [soru, şıklar, doğru şık].
// Dört şıklı sorularda şıklar oyun açılırken karıştırılır; iki şıklılarda "Doğru, Yanlış" sırası korunur. Sorular yazıldığı sırayla gelir.
import {shuffle} from './game.ts';
import type {LiveQ} from './live.ts';
type Row=[string,string[],string];
const DY=['Doğru','Yanlış'];
export const KAHOOTS:Record<string,{title:string;emoji:string;rows:Row[]}>={
girisimcilik:{title:'Tekno Girişimcilik',emoji:'🚀',rows:[
["MVP'nin temel amacı pazara en kusursuz ürünü sunmaktır.",DY,'Yanlış'],
['Bir girişimin değer önerisi, müşteriye sunduğu benzersiz faydadır.',DY,'Doğru'],
["'Pivot' etmek, stratejide köklü değişiklik yapmaktır.",DY,'Doğru'],
["'Bootstrap' yöntemi, yatırım almadan öz sermaye ile büyümektir.",DY,'Doğru'],
['Ölçeklenebilirlik, geliri artırırken maliyetleri aynı oranda artırmamaktır.',DY,'Doğru'],
['Girişimci, risk almaktan her zaman kaçınan kişidir.',DY,'Yanlış'],
["Yalın Girişim felsefesinin temeli 'İnşa et-Ölç-Öğren' döngüsüdür.",DY,'Doğru'],
['Patent hakları ömür boyu geçerlidir.',DY,'Yanlış'],
['Pazar doğrulaması ürünün müşteri tarafından istendiğini kanıtlamaktır.',DY,'Doğru'],
['Tekno-Girişimcilikte çevresel etki önemli değildir.',DY,'Yanlış'],
["İş Modeli Kanvası'nda 'Maliyet Yapısı' nerede yer alır?",['Sol tarafta','Sağ tarafta','Gelirler tarafında','Ekip kısmında'],'Sol tarafta'],
['Yatırımcı sunumunda (Pitch Deck) hangisi yer almaz?',['Problem','Çözüm',"Şirket'in mutfak temizliği",'Gelir Modeli'],"Şirket'in mutfak temizliği"],
["Ekipte 'Hustler' rolü neyi temsil eder?",['Satış ve büyüme','Teknik geliştirme','Tasarım','Yatırımcı'],'Satış ve büyüme'],
['Seri A yatırımı öncesi ilk aşama hangisidir?',['Tohum (Seed)','Exit','Halka arz','Temettü'],'Tohum (Seed)'],
['Growth Hacking nedir?',['Kreatif büyüme','Sadece reklam','Pazarı kapatma','Maaş artışı'],'Kreatif büyüme'],
["'Problem Tanımı' girişimcilikte neden kritiktir?",['Çözümün doğruluğu için','Sadece para için','Zaman geçirmek için','Rakipleri korkutmak için'],'Çözümün doğruluğu için'],
["Fikri mülkiyet kapsamında 'Telif Hakkı' neyi korur?",['Sanat ve yazılı eserleri','Teknik cihazı','Ofis binasını','Müşteri listesini'],'Sanat ve yazılı eserleri'],
['Bir startup için en büyük risk nedir?',['Pazarın istemediği bir ürün yapmak','Çok çalışmak','Az çalışan olması','Ofisin küçük olması'],'Pazarın istemediği bir ürün yapmak'],
["'Hipster' rolü ekipte neyi yönetir?",['Tasarım ve kullanıcı deneyimi','Satış','Kodlama','Finans'],'Tasarım ve kullanıcı deneyimi'],
["İş Modeli Kanvası'nda 'Müşteri İlişkileri' neyi açıklar?",['İlişki kurma yollarını','Kira ödemelerini','Çalışan maaşlarını','Hukuki süreçleri'],'İlişki kurma yollarını'],
["'Hacker' rolü ekipte neyle ilgilenir?",['Ürünün teknik geliştirilmesi','Sunum yapma','Muhasebe','Yasal izinler'],'Ürünün teknik geliştirilmesi'],
["'Ölüm Vadisi' aşaması neyi ifade eder?",['Girişimin ilk zorlu dönemi','Şirket kapanışı','Yatırım sonrası kutlama','Pazarın doygunluğunu'],'Girişimin ilk zorlu dönemi'],
["MVP'nin amacı hangisidir?",['Hızlı geri bildirim','Kusursuz ürün','Şirketi kapatmak','Daha fazla borç almak'],'Hızlı geri bildirim'],
["Aşağıdakilerden hangisi bir 'Değer Önerisi' olabilir?",['Daha hızlı çözüm','Ofis rengi','Çalışan sayısı','Şirket kuruluşu'],'Daha hızlı çözüm'],
["'Melek Yatırımcı' kime destek verir?",['Erken aşama girişimlere','Büyük holdinglere','Devlet kurumlarına','Sadece kendi çocuklarına'],'Erken aşama girişimlere'],
]},
};
export function kahootQuestions(id:string,rnd=Math.random):LiveQ[]{const k=KAHOOTS[id];if(!k)return [];
return k.rows.map(([prompt,opts,answer])=>{const options=opts.length>2?shuffle(opts,rnd):opts;return {prompt,tag:`${k.emoji} ${k.title}`,options,correct:options.indexOf(answer),answer};});}
