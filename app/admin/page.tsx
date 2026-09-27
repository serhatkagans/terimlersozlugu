import type {Metadata} from 'next';
import AdminApp from '../admin-panel';
export const metadata:Metadata={title:'Görevli paneli | GençTek Terimler Sözlüğü',robots:{index:false,follow:false}};
export default function Admin(){return <AdminApp/>;}
