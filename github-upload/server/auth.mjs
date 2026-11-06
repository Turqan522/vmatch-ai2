import {createServer} from 'node:http';
import {randomBytes, scryptSync, timingSafeEqual, createHash} from 'node:crypto';
import {mkdirSync, readFileSync, writeFileSync, renameSync, existsSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const hash = value => createHash('sha256').update(value).digest('hex');
const publicUser = ({id, name, email, title, bio, createdAt}) => ({id, name, email, title, bio, createdAt});
const fail = (status, message) => { throw Object.assign(new Error(message), {status}); };
export function createAuth(file = resolve('server/data/accounts.json')) {
  mkdirSync(dirname(file), {recursive:true});
  const db = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {users:[], sessions:[]};
  const save = () => {writeFileSync(file+'.tmp', JSON.stringify(db), {mode:0o600}); renameSync(file+'.tmp', file);};
  function register(data) {
    const name = String(data.name || '').trim(), email = String(data.email || '').trim().toLowerCase();
    const password = data.password;
    if (name.length < 2 || name.length > 100) fail(400, 'Ad 2–100 simvol olmalıdır.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) fail(400, 'Düzgün e-poçt ünvanı daxil edin.');
    if (typeof password !== 'string' || password.length < 10 || password.length > 128) fail(400, 'Şifrə 10–128 simvol olmalıdır.');
    if (db.users.some(u=>u.email===email)) fail(409, 'Bu e-poçt ilə hesab artıq mövcuddur.');
    const salt = randomBytes(16).toString('hex');
    const user = {id:randomBytes(16).toString('hex'), name, email, title:'', bio:'', createdAt:new Date().toISOString(), salt, passwordHash:scryptSync(password,salt,64).toString('hex')};
    db.users.push(user); save(); return publicUser(user);
  }
  const dummySalt = randomBytes(16).toString('hex');
  const attempts = new Map();
  const server = createServer(async (req,res)=>{
    const send = (status, body) => {res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}); res.end(JSON.stringify(body));};
    try {
      const path = new URL(req.url, 'http://localhost').pathname;
      if(!['/api/auth/me','/api/auth/register','/api/auth/login','/api/auth/logout','/api/profile'].includes(path)) fail(404,'Səhifə tapılmadı.');
      if (req.method !== 'GET') {
        const origin = req.headers.origin;
        if (origin && new URL(origin).host !== req.headers.host) fail(403, 'Sorğunun mənbəyi təsdiqlənmədi.');
        if (req.headers['content-type'] !== 'application/json') fail(415, 'JSON tələb olunur.');
      }
      let data = {};
      if (req.method !== 'GET') {
        let body='';
        for await (const chunk of req) {body+=chunk; if(Buffer.byteLength(body)>16384) fail(413,'Sorğu çox böyükdür.');}
        try {data=JSON.parse(body || '{}');} catch {fail(400,'Yanlış JSON.');}
        if (!data || typeof data!=='object' || Array.isArray(data)) fail(400,'Yanlış sorğu.');
      }
      const token = req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith('cvmatch_session='))?.slice(16);
      const session = token && db.sessions.find(s=>s.tokenHash===hash(token) && s.expires>Date.now());
      const user = session && db.users.find(u=>u.id===session.userId);
      const cookie = value => res.setHeader('Set-Cookie',`cvmatch_session=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${value?86400:0}${process.env.NODE_ENV==='production'?'; Secure':''}`);
      if (req.method==='GET' && path==='/api/auth/me') return send(200,{user:user?publicUser(user):null});
      if (req.method==='POST' && ['/api/auth/register','/api/auth/login'].includes(path)) {
        const now=Date.now();
        for (const [key,value] of attempts) if(value.until<now) attempts.delete(key);
        const key=req.socket.remoteAddress;
        const limit=attempts.get(key)||{count:0,until:now+600000};
        if(++limit.count>30) fail(429,'Çox sayda cəhd edildi. 10 dəqiqə sonra yenidən yoxlayın.');
        attempts.set(key,limit);
        let account;
        if(path.endsWith('/register')) account=register(data);
        else {
          const found=db.users.find(u=>u.email===String(data.email||'').trim().toLowerCase());
          const password=typeof data.password==='string' && data.password.length<=128?data.password:'';
          const candidate=scryptSync(password,found?.salt||dummySalt,64);
          if(!found || !timingSafeEqual(candidate,Buffer.from(found.passwordHash,'hex'))) fail(401,'E-poçt və ya şifrə yanlışdır.');
          account=publicUser(found);
        }
        const fresh=randomBytes(32).toString('hex');
        db.sessions=db.sessions.filter(s=>s.expires>Date.now() && (!token || s.tokenHash!==hash(token)));
        db.sessions.push({tokenHash:hash(fresh),userId:account.id,expires:Date.now()+86400000});save();cookie(fresh);
        return send(200,{user:account});
      }
      if(req.method==='POST' && path==='/api/auth/logout') {
        db.sessions=db.sessions.filter(s=>!token || s.tokenHash!==hash(token));save();cookie('');return send(200,{ok:true});
      }
      if(!user) fail(401,'Əvvəlcə hesabınıza daxil olun.');
      if(req.method==='PATCH' && path==='/api/profile') {
        for(const [key,max] of [['name',100],['title',120],['bio',2000]]) {
          if(typeof data[key]!=='string' || data[key].length>max || (key==='name' && data[key].trim().length<2)) fail(400,'Profil məlumatlarını düzgün doldurun.');
        }
        user.name=data.name.trim();user.title=data.title.trim();user.bio=data.bio.trim();save();return send(200,{user:publicUser(user)});
      }

      fail(404,'Səhifə tapılmadı.');
    } catch(error) {send(error.status||500,{error:error.status?error.message:'Server xətası. Yenidən cəhd edin.'});}
  });
  return {server,register};
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  createAuth().server.listen(Number(process.env.AUTH_PORT||3001),'127.0.0.1',()=>console.log('Account API: http://127.0.0.1:3001'));
}
