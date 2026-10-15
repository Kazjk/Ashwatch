import assert from 'node:assert/strict';
const base=process.env.ASHWATCH_URL??'http://127.0.0.1:3011';
async function request(body){const r=await fetch(base+'/api/world',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});assert.equal(r.status,200);return r.json();}
const caller=await request({action:'enter',roomMode:'create',adventureKind:'watch',heroClass:'Knight',name:'Cover caller'});
const helper=await request({action:'enter',roomMode:'join',room:caller.room,heroClass:'Warden',name:'Cover medic'});
try{
 await request({action:'start',...caller});let hit=false;
 for(let i=0;i<100;i++){
  const v=await request({action:'snapshot',...caller}),p=v.heroes.find(p=>p.id===caller.id);await request({action:'snapshot',...helper});
  if(p.hp<p.maxHp){hit=true;break;}
  await new Promise(r=>setTimeout(r,80));
 }
 assert.ok(hit,'The caller must take an actual enemy hit before this healing test.');
 await request({action:'input',...caller,input:{sequence:1,x:0,y:0,warn:true}});
 const ally=await request({action:'snapshot',...helper}),q=ally.heroes.find(p=>p.id===helper.id),p=ally.partyMembers.find(p=>p.id===caller.id);
 assert.ok(p);await request({action:'input',...helper,input:{sequence:1,x:0,y:0,facing:Math.atan2(p.y-q.y,p.x-q.x),skill:true}});
 let verified;
 for(let i=0;i<15;i++){
  const v=await request({action:'snapshot',...caller});await request({action:'snapshot',...helper});
  if(v.ownCall?.answeredBy){verified=v;break;}await new Promise(r=>setTimeout(r,60));
 }
 assert.ok(verified);assert.equal(verified.ownCall.answeredBy,'Cover medic');assert.equal(verified.watch.covers,1);assert.ok(verified.watch.healing>0);
 for(const s of [caller,helper])assert.ok(!JSON.stringify(verified).includes(s.token));
 console.log(JSON.stringify({result:'passed',actualEnemyDamage:true,callsAnswered:verified.watch.covers,healthRestored:verified.watch.healing,acknowledgement:verified.ownCall.answeredBy,credentialSecrecy:'passed'},null,2));
}finally{await request({action:'leave',...helper});await request({action:'leave',...caller});}
