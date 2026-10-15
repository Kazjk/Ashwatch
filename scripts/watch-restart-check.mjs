import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
const base=process.env.ASHWATCH_URL??'http://127.0.0.1:3011',dir=process.env.ASHWATCH_SAVE_DIR??path.join(process.cwd(),'.ashwatch-saves'),file=path.join(dir,'restart-verifier-private.json');
async function request(body,expected=200){const r=await fetch(base+'/api/world',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});assert.equal(r.status,expected);return r.json();}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
if(process.argv[2]==='prepare'){
 const host=await request({action:'enter',roomMode:'create',adventureKind:'watch',oath:'bastion',name:'Restart verifier',heroClass:'Knight'}),ally=await request({action:'enter',roomMode:'join',room:host.room,name:'Restart support',heroClass:'Warden'});
 await request({action:'start',...host});let seq=0;
 for(let i=0;i<30;i++){const v=await request({action:'snapshot',...host}),p=v.heroes.find(p=>p.id===host.id),e=v.monsters[0];if(e&&Math.hypot(e.x-p.x,e.y-p.y)<55)break;await request({action:'input',...host,input:{sequence:++seq,x:0,y:-1}});await sleep(50);}
 await request({action:'input',...host,input:{sequence:++seq,x:0,y:0,facing:-Math.PI/2,attack:true}});await sleep(230);
 const first=await request({action:'snapshot',...host});assert.ok(first.monsters[0].hp<first.monsters[0].maxHp);
 await request({action:'input',...host,input:{sequence:++seq,x:0,y:0}});await sleep(2100);await request({action:'snapshot',...ally});
 await request({action:'resume',...host});await sleep(4100);
 // Wait until both test clients are offline; inspect the last private committed checkpoint.
 // Combat can legitimately continue after an HTTP response and before disconnection.
 const envelope=JSON.parse(readFileSync(path.join(dir,'companies-v1.json'),'utf8')),saved=JSON.parse(envelope.payload).find(r=>r.code===host.room).world,me=saved.heroes.find(p=>p.id===host.id),enemy=saved.monsters.find(e=>e.hp>0);
 mkdirSync(dir,{recursive:true,mode:0o700});writeFileSync(file,JSON.stringify({host,ally,sequence:seq,self:{x:me.x,y:me.y,hp:me.hp},enemy:{id:enemy.id,hp:enemy.hp},stage:saved.watch.stage}),{mode:0o600});
 console.log(JSON.stringify({result:'prepared',room:host.room,players:2,sequence:seq,enemyDamaged:true,instruction:'Restart the local server, then run this script with verify. Private credentials stay in the save directory.'}));
}else if(process.argv[2]==='verify'){
 assert.ok(existsSync(file),'Run prepare before restarting the server.');const fixture=JSON.parse(readFileSync(file,'utf8'));
 const v=await request({action:'resume',...fixture.host}),p=v.heroes.find(p=>p.id===fixture.host.id);assert.equal(v.inputSequence,fixture.sequence);assert.equal(p.x,fixture.self.x);assert.equal(p.y,fixture.self.y);assert.equal(p.hp,fixture.self.hp);assert.equal(v.monsters.find(e=>e.id===fixture.enemy.id).hp,fixture.enemy.hp);assert.equal(v.watch.stage,fixture.stage);
 const duplicate=await request({action:'input',...fixture.host,input:{sequence:fixture.sequence,x:0,y:0,attack:true}});assert.equal(duplicate.inputSequence,fixture.sequence);assert.equal(duplicate.heroes.find(p=>p.id===fixture.host.id).action,null);
 await request({action:'resume',...fixture.ally});await request({action:'snapshot',...fixture.host,token:'forged'},401);for(const s of [fixture.host,fixture.ally])assert.ok(!JSON.stringify(v).includes(s.token));
 await request({action:'leave',...fixture.ally});await request({action:'leave',...fixture.host});
 console.log(JSON.stringify({result:'passed',players:2,credentialsReused:true,healthPreserved:true,enemyHealthPreserved:true,sequencePreserved:true,duplicateRejected:true,privateStateFiltered:true,cleanup:'test company left'}));
}else throw Error('Usage: node scripts/watch-restart-check.mjs prepare | verify');
