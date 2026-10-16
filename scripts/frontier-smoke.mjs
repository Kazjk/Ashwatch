import assert from 'node:assert/strict';
import {worldRequest} from '../apps/web/app/ashwatch/world-request.ts';
const base=process.env.ASHWATCH_URL??'http://127.0.0.1:3011';
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const timings=[],began=Date.now();let retries=0;
async function request(body){const at=Date.now();let attempts=0;const result=await worldRequest(body,async(payload,signal)=>{attempts++;return fetch(base+'/api/world',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),signal});},AbortSignal.timeout(10000));timings.push(Date.now()-at);retries+=attempts-1;return result;}
const host=await request({action:'enter',roomMode:'create',adventureKind:'frontier',name:'Frontier network check',heroClass:'Knight'});
let ally;const sequence=new Map();
const snapshot=s=>request({action:'snapshot',...s});
async function input(s,extra={}){const n=(sequence.get(s.id)??0)+1;sequence.set(s.id,n);return request({action:'input',...s,input:{sequence:n,x:0,y:0,...extra}});}
const self=(v,s=host)=>v.heroes.find(p=>p.id===s.id);
async function walk(x,y){for(let i=0;i<90;i++){const v=await snapshot(host),p=self(v),d=Math.hypot(x-p.x,y-p.y);assert.ok(p.hp>0,'The test must survive its route.');if(d<10){await input(host);return;}await input(host,{x:(x-p.x)/d*.7,y:(y-p.y)/d*.7,facing:Math.atan2(y-p.y,x-p.x)});await snapshot(ally);await wait(75);}throw Error('Frontier route blocked');}
async function gather(kind,amount,x,y){let v=await snapshot(host);for(let i=0;i<20&&v.frontier.supplies[kind]<amount;i++){const p=self(v);v=await input(host,{facing:Math.atan2(y-p.y,x-p.x),attack:true});const accepted=v.inputSequence;const duplicate=await request({action:'input',...host,input:{sequence:accepted,x:0,y:0,attack:true}});assert.equal(duplicate.inputSequence,accepted);await snapshot(ally);await wait(850);v=await snapshot(host);}assert.ok(v.frontier.supplies[kind]>=amount,`Harvest ${kind} at contact`);return v;}
try{
 ally=await request({action:'enter',roomMode:'join',room:host.room,name:'Frontier companion',heroClass:'Warden'});
 assert.ok((await snapshot(ally)).frontier);await walk(985,1515);
 await gather('timber',30,955,1480);await gather('stone',25,1030,1555);await walk(985,1585);await gather('herb',4,960,1620);
 let v=await input(host,{frontier:{kind:'craft',recipe:'hatchet'}});assert.equal(v.frontier.hatchet,true);assert.equal(v.frontier.supplies.timber,22);await wait(400);
 await walk(975,1600);v=await input(host,{facing:Math.atan2(50,-25),frontier:{kind:'build',piece:'hearth',x:950,y:1650,rotation:0}});assert.match(v.frontier.message,/raised/);assert.equal(v.frontier.supplies.timber,12);await wait(400);
 v=await input(host,{facing:Math.atan2(100,-25),frontier:{kind:'build',piece:'bedroll',x:950,y:1700,rotation:0}});assert.match(v.frontier.message,/raised/);assert.equal(v.frontier.supplies.timber,7);assert.equal(v.frontier.supplies.herb,0);assert.ok(v.frontier.milestones.includes('bedroll'));
 const p=self(v),friend=(await snapshot(ally)).heroes.find(p=>p.id===ally.id);const shared=await input(ally,{facing:Math.atan2(1650-friend.y,950-friend.x)});assert.ok(shared.frontier.structures.some(s=>s.kind==='hearth'));assert.deepEqual(shared.frontier.supplies,{timber:0,stone:0,herb:0,aether:0});
 const resumed=await request({action:'resume',...host}),returned=self(resumed);assert.equal(returned.x,p.x);assert.equal(returned.y,p.y);assert.equal(returned.hp,p.hp);assert.equal(resumed.frontier.supplies.timber,7);assert.ok(resumed.frontier.sheltered);
 for(const credential of [host.token,ally.token])assert.ok(!JSON.stringify(resumed).includes(credential));
 const forged=await fetch(base+'/api/world',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'snapshot',...host,token:'forged-credential'})});assert.equal(forged.status,401);
 const sorted=timings.toSorted((a,b)=>a-b);console.log(JSON.stringify({result:'passed',base,elapsedMs:Date.now()-began,requests:timings.length,medianMs:sorted[Math.floor(sorted.length*.5)],p95Ms:sorted[Math.floor(sorted.length*.95)],retries,checks:['two independent credentials','real contact harvests','duplicate action rejection','paid hatchet','paid hearth and bedroll','shared nearby structures','private satchels','same-position resume','hearth warmth','forged credential rejection']},null,2));
}finally{if(ally)await request({action:'leave',...ally});await request({action:'leave',...host});}
