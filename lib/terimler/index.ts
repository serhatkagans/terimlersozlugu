// Çalışma grupları ve başlangıç terimleri. Grup adları GençTek Bilgi Sistemi'ndeki çalışma grubu listesiyle aynıdır (prisma/seed.ts).
// Her satır: [terim, karşılığı, kısa tanım, açıklama, örnek cümle, kategori]
// - karşılığı: İngilizce terimde Türkçesi, Türkçe terimde İngilizcesi; yoksa boş.
// - kısa tanım oyunlarda ipucu ve eşleştirmede şık olarak kullanılır; terimin kendisini içermemeli.
// - örnek cümle terimi aynen (aynı büyük/küçük harfle) içermeli; öğrenci önerilerindeki kuralla aynı.
// - kategori: Temel kavram · Yazılım · Donanım · Güvenlik · Tasarım · İş ve toplum
export type TermRow=[term:string,equivalent:string,short:string,meaning:string,example:string,category:string];
export type Group={id:string;title:string;about:string;emoji:string;terms:TermRow[]};
import oyun from './oyun-tasarimi.ts';
import siber from './siber-guvenlik.ts';
import olimpiyat from './bilgisayar-olimpiyatlari.ts';
import mobil from './mobil-programlama.ts';
import web from './web-programlama.ts';
import havacilik from './havacilik-sistemleri.ts';
import robotik from './robotik.ts';
import yapayZeka from './yapay-zeka.ts';
import eticaret from './e-ticaret.ts';
import dijitalSanat from './dijital-sanatlar.ts';
import acikKaynak from './acik-kaynak.ts';
import espor from './espor.ts';
import hukuk from './bilisim-hukuku.ts';
import guvenliInternet from './guvenli-internet.ts';
import egitimTeknolojileri from './egitim-teknolojileri.ts';
// Bilişim Hukuku ve Güvenli İnternet tek çalışma grubudur; terimleri iki dosyada durur. Kimlik 'bilisim-hukuku' kalır (eski veritabanları lib/server.ts'te birleştirilir).
const hukukInternet:Group={...hukuk,title:'Bilişim Hukuku ve Güvenli İnternet',about:'Dijital dünyada haklar, sorumluluklar ve güvenli internet kullanımı',terms:[...hukuk.terms,...guvenliInternet.terms]};
export const groups:Group[]=[oyun,siber,olimpiyat,mobil,web,havacilik,robotik,yapayZeka,eticaret,dijitalSanat,acikKaynak,espor,hukukInternet,egitimTeknolojileri];
