import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'GençTek Terimler Sözlüğü',description:'GençTek çalışma gruplarının temel terimleri: karşılıkları, tanımları, örnek kullanımları, oyunları ve terim kartlarıyla.',openGraph:{title:'GençTek Terimler Sözlüğü',description:'Her çalışma grubunun ortak dili.'}};
export default function Layout({children}:{children:React.ReactNode}) {return <html lang="tr"><body>{children}</body></html>;}
