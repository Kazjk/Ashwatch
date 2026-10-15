import assert from 'node:assert/strict';
import {COMBAT} from '../apps/web/app/ashwatch/combat.ts';
import {distance,strikeRadius} from '../apps/web/app/ashwatch/world.ts';
import {worldRequest} from '../apps/web/app/ashwatch/world-request.ts';
const base=process.env.ASHWATCH_URL??'http://127.0.0.1:3011';
const responseTimes=[];let transientRetries=0;
async function request(body,expected=200){
 const transport=async(payload,signal)=>{const began=performance.now();const response=await fetch(base+'/api/world',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),signal});responseTimes.push(performance.now()-began);return response;};
 if(expected!==200){const r=await transport(body,AbortSignal.timeout(4000));assert.equal(r.status,expected);return r.json();}
 return worldRequest(body,transport,AbortSignal.timeout(4000),()=>{transientRetries++;console.log(JSON.stringify({event:'transient-response-retried',action:body.action}));});
}
const host=await request({action:'enter',roomMode:'create',adventureKind:'watch',oath:'lantern',name:'Watch verifier',heroClass:'Knight'});
const coverCheck=process.argv.includes('--cover');
const ally=await request({action:'enter',roomMode:'join',room:host.room,name:'Support verifier',heroClass:coverCheck?'Rogue':'Warden'});
await request({action:'start',...ally},400);await request({action:'snapshot',...host,token:'forged'},401);
await request({action:'start',...host});
const sessions=[host,ally],sequences=[0,0],phases=new Set(),began=Date.now();let reportAt=0;
console.log(JSON.stringify({room:host.room,event:'started',players:2}));
for(let step=0;step<2000;step++){
 for(const [i,s] of sessions.entries()){
  const v=await request({action:'snapshot',...s}),p=v.heroes.find(p=>p.id===s.id);
  assert.ok(!JSON.stringify(v).includes(s.token));
  if(v.watch.state!=='active'){
   assert.equal(v.watch.state,'victory',JSON.stringify(v.watch));if(coverCheck)assert.ok(v.watch.covers>0&&v.watch.interrupts>0,'A real call must be answered through an authoritative interruption');
   const result={result:'passed',seconds:(Date.now()-began)/1000,watch:v.watch,phases:[...phases],players:sessions.length};
   const replay=await request({action:'restart',...host,oath:'ember'});assert.equal(replay.watch.state,'forming');assert.equal(replay.watch.oath,'ember');await request({action:'resume',...ally});
   const fresh=await request({action:'snapshot',...host});assert.equal(fresh.watch.stage,0);assert.ok(fresh.heroes.find(p=>p.id===host.id));
   const sorted=responseTimes.toSorted((a,b)=>a-b),network={requests:sorted.length,medianResponseMs:Math.round(sorted[Math.floor(sorted.length*.5)]),p95ResponseMs:Math.round(sorted[Math.floor(sorted.length*.95)]),transientRetries};
   console.log(JSON.stringify({...result,network,replay:'passed: Ember oath, same company and credentials'},null,2));process.exit(0);
  }
  if(p.hp<=0)continue;
  const target=v.monsters.toSorted((a,b)=>distance(p,a)-distance(p,b))[0];let x=0,y=0,facing=p.facing;
  if(target){const d=distance(p,target),dx=(target.x-p.x)/Math.max(1,d),dy=(target.y-p.y)/Math.max(1,d);facing=Math.atan2(dy,dx);if(d>COMBAT[p.heroClass].reach*.8){x=dx;y=dy;}
   if(target.kind==='boss')phases.add(target.hp/target.maxHp>2/3?1:target.hp/target.maxHp>1/3?2:3);
   if(target.attackAt>v.time){const ax=p.x-target.x,ay=p.y-target.y,a=Math.hypot(ax,ay);x=a>1?ax/a:-dy;y=a>1?ay/a:dx;if(p.x>1630)x=-Math.abs(x);if(p.x<770)x=Math.abs(x);if(p.y>1610)y=-Math.abs(y);}
   if(p.heroClass==='Rogue'&&target.attackAt>v.time&&d<85&&(p.skillCooldown===0||p.action?.skill)){x=0;y=0;}
  }else facing+=.18;
  const interrupt=p.heroClass==='Rogue'&&!!target&&target.attackAt>v.time&&distance(p,target)<85;
  await request({action:'input',...s,input:{sequence:++sequences[i],x,y,facing,attack:!!target&&!target.attackAt&&distance(p,target)<COMBAT[p.heroClass].reach&&(p.heroClass!=="Warden"||p.mp>=45),skill:p.heroClass==='Warden'?p.hp<p.maxHp-30:interrupt||p.heroClass!=='Rogue'&&!!target&&!target.attackAt&&distance(p,target)<COMBAT[p.heroClass].reach+10,dodge:!interrupt&&(!!target&&target.attackAt>v.time&&distance(p,target)<strikeRadius(target)+25)&&p.dodgeCooldown===0,warn:!!target&&target.attackAt>v.time&&distance(p,target)<strikeRadius(target)+25}});
  if(Date.now()-reportAt>10000){reportAt=Date.now();console.log(JSON.stringify({event:'progress',seconds:Math.round((Date.now()-began)/1000),stage:v.watch.stage+1}));}
 }
 await new Promise(r=>setTimeout(r,100));
}
throw Error('Watch timed out after ordinary network actions');
