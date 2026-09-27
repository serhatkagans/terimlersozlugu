import {adminSession,checkLogin,limited,sameOrigin} from '../../../../lib/server';
export const dynamic='force-dynamic';
// Görevli girişi: kullanıcı adı ve şifre doğruysa oturum anahtarını döndürür. Deneme sayısı IP başına sınırlıdır.
export async function POST(request:Request){if(!sameOrigin(request))return Response.json({error:'Yetkisiz.'},{status:403});if(limited(request,'login',10,10*60_000))return Response.json({error:'Çok fazla deneme yapıldı. Birkaç dakika sonra tekrar deneyin.'},{status:429});
const p=await request.json().catch(()=>({}));const token=adminSession();if(!token)return Response.json({error:'Görevli kullanıcısı sunucuda henüz tanımlanmadı.'},{status:503});
if(!checkLogin(p.username,p.password))return Response.json({error:'Kullanıcı adı veya şifre hatalı.'},{status:401});return Response.json({token});}
