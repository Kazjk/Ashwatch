import assert from 'node:assert/strict';
import {routeTo} from '../apps/web/app/ashwatch/navigation.ts';
import {TOWNS,buildingEntrance,distance} from '../apps/web/app/ashwatch/world.ts';
const base=process.env.ASHWATCH_TEST_URL??'http://127.0.0.1:3000';
const times=[];
async function post(body){const at=performance.now();const response=await fetch(base+'/api/world',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(5000)});times.push(performance.now()-at);const data=await response.json();assert.equal(response.status,200,data.error);return data;}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const clients=await Promise.all(['Knight','Spellweaver'].map(heroClass=>post({action:'enter',name:'Smoke '+heroClass,heroClass}).then(session=>({session,sequence:Date.now(),heroClass,view:null}))));
const snapshot=async c=>c.view=await post({action:'snapshot',...c.session});
const input=async(c,fields)=>c.view=await post({action:'input',...c.session,input:{sequence:++c.sequence,x:0,y:0,...fields}});
const hero=c=>c.view.heroes.find(p=>p.id===c.session.id);
await Promise.all(clients.map(snapshot));
for(const c of clients){assert.ok(!JSON.stringify(c.view).includes(c.session.token));assert.ok(!JSON.stringify(c.view).includes(clients.find(p=>p!==c).session.token));}
async function walk(c,target){let path=routeTo(hero(c),target),index=0;const deadline=Date.now()+20000;while(Date.now()<deadline&&distance(hero(c),target)>22){const p=hero(c);while(index<path.length-1&&distance(p,path[index])<22)index++;const point=path[index]??target,dx=point.x-p.x,dy=point.y-p.y,len=Math.hypot(dx,dy);await input(c,{x:dx/len,y:dy/len,facing:Math.atan2(dy,dx)});await sleep(70);}await input(c,{});assert.ok(distance(hero(c),target)<30,'Failed to reach destination');}
for(const c of clients){await walk(c,buildingEntrance(TOWNS[0].guild));c.view=await post({action:'service',...c.session,service:'party',partyCode:'SMOKE'});c.view=await post({action:'service',...c.session,service:'mission'});assert.equal(hero(c).mission,1);}
await Promise.all(clients.map(snapshot));assert.equal(clients[0].view.partyMembers.length>=1,true);
await walk(clients[0],buildingEntrance(TOWNS[0].inn));clients[0].view=await post({action:'service',...clients[0].session,service:'rest'});assert.equal(hero(clients[0]).hp,hero(clients[0]).maxHp);
const id=clients[0].session.id;clients[0].view=await post({action:'resume',...clients[0].session});assert.equal(hero(clients[0]).id,id);assert.equal(hero(clients[0]).party,'SMOKE');
const forged=await fetch(base+'/api/world',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'snapshot',...clients[0].session,token:clients[1].session.token})});assert.equal(forged.status,401);
for(let i=0;i<100;i++)await snapshot(clients[i%2]);
times.sort((a,b)=>a-b);console.log(JSON.stringify({checks:['two authenticated clients','real movement through town','guild contracts','party joining','lodge recovery','resume','credential isolation','forged credential rejection'],requests:times.length,medianMs:+times[Math.floor(times.length*.5)].toFixed(2),p95Ms:+times[Math.floor(times.length*.95)].toFixed(2),maxMs:+times.at(-1).toFixed(2)},null,2));
