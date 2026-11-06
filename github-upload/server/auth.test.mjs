import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createAuth} from './auth.mjs';
import {createServer as createViteServer, loadConfigFromFile} from 'vite';

test('browser registration and profile requests work through the Vite proxy',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'cvmatch-proxy-'));
  const auth=createAuth(join(dir,'accounts.json'));
  let vite;
  try {
    await new Promise(r=>auth.server.listen(0,'127.0.0.1',r));
    const loaded=await loadConfigFromFile({command:'serve',mode:'test'});
    const proxy=Object.fromEntries(Object.entries(loaded.config.server.proxy).map(([route,options])=>[route,{...options,target:`http://127.0.0.1:${auth.server.address().port}`} ]));
    // Proxy tests must not invalidate the running site's optimized PDF dependencies.
    vite=await createViteServer({configFile:false,cacheDir:join(dir,'vite-cache'),optimizeDeps:{noDiscovery:true},logLevel:'silent',server:{host:'127.0.0.1',port:0,proxy}});
    await vite.listen();
    const origin=`http://127.0.0.1:${vite.httpServer.address().port}`;
    const request=(path,body,cookie='',source=origin,method='POST')=>fetch(origin+path,{method,headers:{Origin:source,'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(body)});
    const credentials={name:'Proxy Test',email:'proxy@example.com',password:'proxy-test-secret'};
    const registered=await request('/api/auth/register',credentials);
    assert.equal(registered.status,200,await registered.text());
    const cookie=registered.headers.get('set-cookie').split(';')[0];
    assert.equal((await request('/api/profile',{name:'Updated Proxy',title:'Student',bio:''},cookie,origin,'PATCH')).status,200);
    assert.equal((await request('/api/auth/login',credentials,'','https://evil.example')).status,403);
    assert.equal((await request('/api/auth/logout',{},cookie)).status,200);
    assert.equal((await request('/api/auth/login',credentials)).status,200);
  } finally {
    if(vite)await vite.close();
    await new Promise(r=>auth.server.close(r));
    rmSync(dir,{recursive:true,force:true});
  }
});

test('registration, profile ownership, removed admin routes and persistent sessions',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'cvmatch-auth-')),file=join(dir,'accounts.json');
  let auth=createAuth(file);
  auth.register({name:'Other User',email:'other@example.com',password:'other-test-secret'});
  await new Promise(r=>auth.server.listen(0,'127.0.0.1',r));
  let base=`http://127.0.0.1:${auth.server.address().port}`;
  async function call(path,method='GET',body,cookie='',origin){
    const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',Cookie:cookie,...(origin?{Origin:origin}:{})},body:body===undefined?undefined:JSON.stringify(body)});
    return {status:response.status,body:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0],headers:response.headers};
  }
  try{
    assert.equal((await call('/api/admin/users')).status,404);
    const credentials={name:'User Test',email:'user@example.com',password:'user-test-secret',role:'admin'};
    const registered=await call('/api/auth/register','POST',credentials);
    assert.equal(registered.status,200);assert.equal(registered.body.user.role,undefined);assert.match(registered.headers.get('set-cookie'),/HttpOnly/);
    assert.equal((await call('/api/auth/register','POST',credentials)).status,409);
    assert.equal((await call('/api/auth/login','POST',{...credentials,password:'wrong'})).status,401);
    assert.equal((await call('/api/auth/admin/login','POST',credentials)).status,404);
    assert.equal((await call('/api/admin/users','GET',undefined,registered.cookie)).status,404);
    assert.equal((await call('/api/profile','PATCH',{name:'Updated User',title:'Developer',bio:'My profile',role:'admin'},registered.cookie)).body.user.role,undefined);
    assert.equal((await call('/api/profile','PATCH',{name:'Changed',title:'',bio:''},registered.cookie,'https://evil.example')).status,403);
    const other=await call('/api/auth/login','POST',{email:'other@example.com',password:'other-test-secret'});
    assert.equal((await call('/api/auth/me','GET',undefined,other.cookie)).body.user.name,'Other User');
    await new Promise(r=>auth.server.close(r));auth=createAuth(file);await new Promise(r=>auth.server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${auth.server.address().port}`;
    assert.equal((await call('/api/auth/me','GET',undefined,registered.cookie)).body.user.name,'Updated User');
    await call('/api/auth/logout','POST',{},registered.cookie);
    assert.equal((await call('/api/auth/me','GET',undefined,registered.cookie)).body.user,null);
    const stored=readFileSync(file,'utf8');assert.ok(!stored.includes('user-test-secret'));assert.ok(!stored.includes(registered.cookie.split('=')[1]));
  }finally{await new Promise(r=>auth.server.close(r));rmSync(dir,{recursive:true,force:true});}
});
