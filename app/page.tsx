import Studio from './studio';
import {catalog,covers,illustrated} from '../lib/server';
export const dynamic='force-dynamic';
export default function Home() { const {words,works}=catalog(); return <Studio words={words} works={works} illustrated={illustrated()} covers={covers()} />; }
