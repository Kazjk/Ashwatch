import assert from 'node:assert/strict';
const base=process.env.ASHWATCH_URL??'http://127.0.0.1:3000';
async function request(body,expected=200){const response=await fetch(base+'/api/world',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});assert.equal(response.status,expected);return response.json();}
const host=await request({action:'enter',roomMode:'create',name:'Room verifier',heroClass:'Knight'});
const ally=await request({action:'enter',roomMode:'join',room:host.room,name:'Friend verifier',heroClass:'Spellweaver'});
const other=await request({action:'enter',roomMode:'create',name:'Separate verifier',heroClass:'Knight'});
const view=await request({action:'snapshot',...host}),separate=await request({action:'snapshot',...other});
assert.equal(view.population,2);assert.equal(separate.population,1);assert.ok(!JSON.stringify(view).includes(ally.token));
await request({action:'snapshot',...host,room:other.room},401);
await request({action:'enter',roomMode:'join',room:'../bad',name:'Invalid',heroClass:'Knight'},400);
await request({action:'snapshot',...host,room:'000000'},401);
await request({action:'restart',...ally},400);await request({action:'restart',...host},400);
const input=await request({action:'input',...ally,input:{sequence:1,x:0,y:0,facing:.5,skill:true}});assert.equal(input.population,2);
console.log(JSON.stringify({checks:['create and join room','separate world population','credential isolation','safe invalid code rejection','unauthorized and premature replay rejection','room-authoritative input'],result:'passed'},null,2));
