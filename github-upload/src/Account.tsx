import {useEffect,useState,type FormEvent} from 'react';
import App from './App';
import './account.css';

type User={id:string;name:string;email:string;title:string;bio:string;createdAt:string};
async function api(path:string,method='GET',data?:unknown){
  let response:Response;
  try{response=await fetch(path,{method,credentials:'same-origin',headers:method==='GET'?{}:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});}catch{throw new Error('Serverə qoşulmaq mümkün olmadı. Yenidən cəhd edin.');}
  const result=await response.json().catch(()=>({error:'Hesab xidməti hazır deyil. Yenidən cəhd edin.'}));
  if(!response.ok)throw new Error(result.error||'Sorğu alınmadı.');return result;
}
export default function Account(){
  const [user,setUser]=useState<User|null>(null),[ready,setReady]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [page,setPage]=useState(location.pathname),[notice,setNotice]=useState('');
  useEffect(()=>{if(location.pathname.startsWith('/admin')){history.replaceState({},'','/login');setPage('/login');}},[]);
  const go=(path:string)=>{history.pushState({},'',path);setPage(path);setError('');setNotice('');};
  useEffect(()=>{const pop=()=>{setPage(location.pathname);setError('');};window.addEventListener('popstate',pop);void api('/api/auth/me').then(r=>setUser(r.user)).catch(e=>setError(e.message)).finally(()=>setReady(true));return()=>window.removeEventListener('popstate',pop);},[]);
  async function submit(event:FormEvent<HTMLFormElement>,kind:string){
    event.preventDefault();setBusy(true);setError('');setNotice('');const data=Object.fromEntries(new FormData(event.currentTarget));
    try{
      if(kind==='register' && data.password!==data.confirm)throw new Error('Şifrələr uyğun gəlmir.');
      const result=await api(kind==='profile'?'/api/profile':`/api/auth/${kind}`,kind==='profile'?'PATCH':'POST',data);
      setUser(result.user);if(kind==='profile')setNotice('Profiliniz yadda saxlanıldı.');else go('/');
    }catch(e){setError(e instanceof Error?e.message:'Xəta baş verdi.');}finally{setBusy(false);}
  }
  async function logout(){setBusy(true);setError('');try{await api('/api/auth/logout','POST',{});setUser(null);go('/login');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  if(!ready)return <div className="account-shell"><p role="status">Hesab yoxlanılır…</p></div>;
  const register=page==='/register';
  const authPage=!user||page==='/login'||page==='/register';
  return <><div className="account-bar"><a className="brand" href="/" onClick={e=>{e.preventDefault();go('/');}}>CVMatch <em>AI</em></a><nav aria-label="Hesab menyusu">{user?<><span>{user.name}</span><button onClick={()=>go('/')}>CV hazırla</button><button onClick={()=>go('/profile')}>Profilim</button><button disabled={busy} onClick={()=>void logout()}>Çıxış</button></>:<><button onClick={()=>go('/login')}>Daxil ol</button><button onClick={()=>go('/register')}>Hesab yarat</button></>}</nav></div>
    {error&&<div className="account-alert" role="alert">{error}</div>}
    {authPage?<main className="account-shell auth-layout"><section className="account-intro"><span className="eyebrow">KARYERANA NÖVBƏTİ ADDIM</span><h1>{register?'Yeni başlanğıc,\nyeni imkanlar.':'Xoş gəlmisiniz.'}</h1><p>{'Profilinizi yaradın, CV-nizi vakansiyaya uyğunlaşdırın və bacarıqlarınızı önə çıxarın.'}</p><div className="account-feature">01 — Şəxsi profil<br/>02 — CV və vakansiya analizi<br/>03 — Hazır CV ixracı</div></section><section className="work-card account-form"><h2>{register?'Hesab yarat':'Hesabına daxil ol'}</h2><p className="account-muted">{register?'Başlamaq üçün məlumatlarınızı daxil edin.':'E-poçt və şifrənizlə davam edin.'}</p><form key={page} onSubmit={e=>void submit(e,register?'register':'login')}>
      {register&&<label>Ad və soyad<input name="name" autoComplete="name" minLength={2} maxLength={100} required/></label>}
      <label>E-poçt<input name="email" type="email" autoComplete="username" maxLength={254} required/></label>
      <label>Şifrə<input name="password" type="password" autoComplete={register?'new-password':'current-password'} minLength={register?10:undefined} maxLength={128} required/></label>
      {register&&<><small>Ən azı 10 simvol istifadə edin.</small><label>Şifrəni təkrarla<input name="confirm" type="password" autoComplete="new-password" minLength={10} maxLength={128} required/></label></>}
      <button className="btn primary" disabled={busy}>{busy?'Gözləyin…':register?'Hesabımı yarat':'Daxil ol'}</button>
    </form><button className="text-button" onClick={()=>go(register?'/login':'/register')}>{register?'Hesabınız var? Daxil olun':'Hesabınız yoxdur? Qeydiyyatdan keçin'}</button></section></main>:page==='/profile'?<main className="account-shell"><section className="work-card account-form profile-form"><span className="eyebrow">ŞƏXSİ HESAB</span><h1>Profilim</h1><p className="account-muted">{user.email} · İstifadəçi</p>{notice&&<p role="status" className="info-box success">{notice}</p>}<form onSubmit={e=>void submit(e,'profile')}><label>Ad və soyad<input name="name" defaultValue={user.name} minLength={2} maxLength={100} autoComplete="name" required/></label><label>İxtisas / peşə<input name="title" defaultValue={user.title} maxLength={120} placeholder="Məsələn, Frontend developer"/></label><label>Haqqımda<textarea name="bio" defaultValue={user.bio} maxLength={2000} rows={5} placeholder="Təcrübə və karyera hədəfləriniz"/></label><button disabled={busy} className="btn primary">{busy?'Saxlanılır…':'Dəyişiklikləri saxla'}</button></form></section></main>:<App key={user.id} userId={user.id}/>}</>;
}
