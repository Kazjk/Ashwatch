import assert from 'node:assert/strict';
const base=process.env.ASHWATCH_URL??'http://127.0.0.1:3000';
async function call(body,status=200){const r=await fetch(base+'/api/world',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});assert.equal(r.status,status);return r.json();}
for(const cls of ['Knight','Spellweaver','Ironbound','Rogue','Warden']){
 const s=await call({action:'enter',roomMode:'create',name:'Development verifier',heroClass:cls});
 let v=await call({action:'snapshot',...s}),p=v.heroes.find(h=>h.id===s.id);assert.equal(p.gold,100000);assert.equal(p.weapon,'');
 const key=['Spellweaver','Warden'].includes(cls)?'focus':'sword';v=await call({action:'develop',...s,kind:'buy',key,price:-100000});p=v.heroes.find(h=>h.id===s.id);assert.equal(p.gold,80000);assert.equal(p.weapon,key);
 await call({action:'develop',...s,kind:'buy',key},400);await call({action:'develop',...s,kind:'upgrade',key:'agility',abilityPoints:1000},400);await call({action:'develop',...s,kind:'equip',key:'Survey'},400);
 const after=await call({action:'snapshot',...s});assert.equal(after.heroes.find(h=>h.id===s.id).gold,80000);assert.ok(!JSON.stringify(after).includes(s.token));
 await call({action:'leave',...s});
}
console.log('PASS: all five classes, unarmed start, fixed purchase prices, duplicate purchase protection, upgrade and Survey gates, private credentials.');
