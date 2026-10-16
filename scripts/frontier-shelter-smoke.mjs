import assert from 'node:assert/strict';
import {worldRequest} from '../apps/web/app/ashwatch/world-request.ts';

// Uses ordinary player requests and contact-time harvesting, never test-only stock or teleportation.
const base=process.env.ASHWATCH_URL??'http://127.0.0.1:3011';
const keep=process.env.ASHWATCH_KEEP_SHELTER==='1',started=Date.now(),timings=[];
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function request(body){const t=Date.now();const v=await worldRequest(body,(payload,signal)=>fetch(base+'/api/world',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),signal}),AbortSignal.timeout(10000));timings.push(Date.now()-t);return v;}
const host=await request({action:'enter',roomMode:'create',adventureKind:'frontier',name:'Shelter builder',heroClass:'Knight'});
let ally,seq=0,passed=false;
const snapshot=()=>request({action:'snapshot',...host});
const me=v=>v.heroes.find(p=>p.id===host.id);
const input=(extra={})=>request({action:'input',...host,input:{sequence:++seq,x:0,y:0,...extra}});
async function walk(x,y){for(let i=0;i<130;i++){const v=await snapshot(),p=me(v),d=Math.hypot(x-p.x,y-p.y);assert.ok(p.hp>0,'Builder survived the actual route');if(d<7){await input();return;}await input({x:(x-p.x)/d*.65,y:(y-p.y)/d*.65,facing:Math.atan2(y-p.y,x-p.x)});await wait(70);}throw Error(`Route blocked toward ${x},${y}`);}
async function harvest(kind,target,x,y){let v=await snapshot();for(let i=0;i<20&&v.frontier.supplies[kind]<target;i++){const p=me(v);v=await input({facing:Math.atan2(y-p.y,x-p.x)});assert.ok(v.frontier.nodes.some(n=>n.kind===kind&&Math.hypot(n.x-x,n.y-y)<3),'Harvest target is currently admitted');await input({facing:Math.atan2(y-p.y,x-p.x),attack:true});await wait(650);v=await snapshot();}assert.ok(v.frontier.supplies[kind]>=target,`Harvested ${target} ${kind}`);}
async function build(piece,x,y,rotation=0){await wait(360);const p=me(await snapshot());const v=await input({facing:Math.atan2(y-p.y,x-p.x),frontier:{kind:'build',piece,x,y,rotation}});assert.match(v.frontier.message,/raised/,`${piece}: ${v.frontier.message}`);return v;}
try{
 ally=await request({action:'enter',roomMode:'join',room:host.room,name:'Shelter companion',heroClass:'Ironbound'});
 await walk(985,1515);await harvest('timber',30,955,1480);await harvest('stone',30,1030,1555);
 let v=await input({frontier:{kind:'craft',recipe:'hatchet'}});assert.equal(v.frontier.hatchet,true);
 await walk(985,1585);await harvest('herb',4,960,1620);
 await walk(1010,1675);v=await input({facing:Math.PI/2});const second=v.frontier.nodes.find(n=>n.kind==='timber'&&n.remaining&&Math.hypot(n.x-1011,n.y-1727)<4);assert.ok(second,'Second timber is discovered by facing it');await harvest('timber',52,second.x,second.y);
 await walk(950,1660);await walk(910,1660);await walk(910,1720);await walk(885,1720);await walk(885,1750);v=await input({facing:Math.PI/2});const third=v.frontier.nodes.find(n=>n.kind==='timber'&&Math.hypot(n.x-854,n.y-1800)<4);assert.ok(third,'Third timber is discovered by facing it');await harvest('timber',72,third.x,third.y);
 await walk(885,1720);await walk(910,1720);await walk(910,1640);await walk(950,1640);await build('foundation',950,1750);await walk(975,1600);await build('hearth',950,1650);await walk(950,1640);
 await walk(910,1640);await walk(910,1720);await walk(885,1720);await walk(885,1750);await build('wall',925,1750);
 await walk(885,1850);await walk(950,1850);await build('door',950,1775,1);
 await walk(1020,1850);await walk(1020,1750);await build('wall',975,1750);
 await walk(1020,1640);await walk(950,1640);await build('wall',950,1725,1);v=await build('roof',950,1750);
 assert.equal(v.frontier.structures.length,7);assert.ok(v.frontier.structures.some(s=>s.kind==='roof'),'Company roof remains known behind the wall');
 await walk(910,1640);await walk(910,1720);await walk(885,1720);await walk(885,1850);await walk(950,1850);const door=v.frontier.structures.find(s=>s.kind==='door');await wait(360);v=await input({facing:-Math.PI/2,frontier:{kind:'use',id:door.id}});assert.ok(v.frontier.structures.find(s=>s.id===door.id).open);
 v=await build('bedroll',950,1750);await walk(950,1750);v=await snapshot();assert.ok(Math.hypot(me(v).x-950,me(v).y-1750)<8,'Builder physically entered through the door');
 await wait(360);v=await input({facing:Math.PI/2,frontier:{kind:'use',id:door.id}});assert.equal(v.frontier.structures.find(s=>s.id===door.id).open,false,'Door closes while the builder is inside');await wait(360);v=await input({interact:true});assert.equal(v.frontier.structures.find(s=>s.id===door.id).open,true,'The ordinary interact control reopens the door');const before=v.frontier.supplies;await wait(360);v=await input({frontier:{kind:'build',piece:'hearth',x:950,y:1750,rotation:0}});assert.deepEqual(v.frontier.supplies,before,'Rejected overlap spends nothing');
 const shared=await request({action:'snapshot',...ally});assert.equal(shared.frontier.structures.length,8);assert.deepEqual(shared.frontier.supplies,{timber:0,stone:0,herb:0,aether:0});
 passed=true;const sorted=timings.toSorted((a,b)=>a-b);console.log(JSON.stringify({result:'passed',base,room:keep?host.room:undefined,elapsedMs:Date.now()-started,requests:timings.length,medianMs:sorted[Math.floor(sorted.length*.5)],p95Ms:sorted[Math.floor(sorted.length*.95)],structures:8,checks:['real walking and harvesting','paid hatchet and full cabin','joined wall corners','roof above walls','known company structure visibility','opening the actual door','walking inside and closing/reopening the door','bedroll and hearth','private materials and shared company shelter','no payment for rejected overlap']},null,2));
}finally{if(!keep||!passed){if(ally)await request({action:'leave',...ally});await request({action:'leave',...host});}}
