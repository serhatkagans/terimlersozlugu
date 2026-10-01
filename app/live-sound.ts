// Canlı yarışmanın sesleri: ses dosyası yoktur, notalar Web Audio ile üretilir. Sessize alma tercihi bu tarayıcıda saklanır.
const key='gt-canli-ses';
let ctx:AudioContext|undefined,loop:ReturnType<typeof setInterval>|undefined,mode:string|null=null,muted=false;
try{muted=localStorage.getItem(key)==='0';}catch{}
// Tarayıcı, kullanıcı sayfaya dokunmadan ses başlatmaz: bağlam askıdaysa nota atlanır (biriken notalar sonradan üst üste çalmasın).
function audio(){if(muted||typeof AudioContext==='undefined')return undefined;ctx??=new AudioContext();if(ctx.state!=='running'){void ctx.resume();return undefined;}return ctx;}
function note(f:number,at=0,dur=.18,vol=.1,type:OscillatorType='triangle'){const c=audio();if(!c)return;const o=c.createOscillator(),g=c.createGain(),t=c.currentTime+at;o.type=type;o.frequency.value=f;
g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g).connect(c.destination);o.start(t);o.stop(t+dur+.02);}
const seq=(fs:number[],step:number,dur?:number,vol?:number,type?:OscillatorType)=>fs.forEach((f,i)=>note(f,i*step,dur,vol,type));
export const sfx={join:()=>seq([660,880],.07,.12,.08),start:()=>seq([392,523,659,784],.09,.2),open:()=>seq([784,1047],.08,.15),tick:()=>note(880,0,.08,.06,'square'),
correct:()=>seq([523,659,784,1047],.08,.25,.12),wrong:()=>seq([311,233],.16,.3,.1,'sawtooth'),reveal:()=>seq([784,988,1175],.1,.3),board:()=>seq([440,554,659],.08,.2),
fanfare:()=>seq([523,523,523,659,784,659,784,1047],.14,.4,.13)};
// Arka plan müziği: bekleme salonunda neşeli bir arpej, soru sırasında düşünme ritmi.
const tunes={lobby:{notes:[262,330,392,523,392,330,294,349,440,587,440,349],step:260,dur:.22},think:{notes:[196,0,196,247,0,196,0,294],step:300,dur:.12}};
export function music(m:'lobby'|'think'|null){if(m===mode)return;mode=m;clearInterval(loop);loop=undefined;if(!m)return;const t=tunes[m];let i=0;
loop=setInterval(()=>{const f=t.notes[i++%t.notes.length];if(f)note(f,0,t.dur,.05,m==='lobby'?'triangle':'sine');},t.step);}
export const isMuted=()=>muted;
export function setMuted(v:boolean){muted=v;try{localStorage.setItem(key,v?'0':'1');}catch{}if(v)void ctx?.suspend();else audio();}
