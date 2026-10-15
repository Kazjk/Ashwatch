import test from "node:test";
import assert from "node:assert/strict";
import {worldRequest,readWorldResponse,WorldResponseError} from "../apps/web/app/ashwatch/world-request.ts";
import {Rooms} from "../apps/web/app/ashwatch/rooms.ts";

test("world responses keep explicit expiry distinct from malformed proxy output",async()=>{
 assert.deepEqual(await readWorldResponse(Response.json({selfId:"player"})),{selfId:"player"});
 await assert.rejects(readWorldResponse(Response.json({error:"SESSION_EXPIRED"},{status:401})),e=>e instanceof WorldResponseError&&e.message==="SESSION_EXPIRED"&&!e.transient);
 for(const text of ["","<html>gateway credential must not be printed</html>","null","[]"]){
  await assert.rejects(readWorldResponse(new Response(text)),e=>e instanceof WorldResponseError&&e.transient&&!e.message.includes("credential")&&e.message!=="SESSION_EXPIRED");
 }
});

test("a transient input response retries the exact sequence once without queuing another attack",async()=>{
 const input={action:"input",id:"player",token:"test-only",input:{sequence:7,x:0,y:0,attack:true}},seen:unknown[]=[];let retries=0;
 const result=await worldRequest(input,async body=>{seen.push(body);return seen.length===1?new Response(""):Response.json({inputSequence:7});},undefined,()=>retries++);
 assert.deepEqual(result,{inputSequence:7});assert.equal(retries,1);assert.equal(seen.length,2);assert.equal(seen[0],seen[1]);assert.equal(seen[1],input);
});

test("uncertain mutations never retry and safe requests cannot retry indefinitely",async()=>{
 for(const action of ["enter","start","restart","leave","service","develop"]){let calls=0;await assert.rejects(worldRequest({action},async()=>{calls++;return new Response("");}));assert.equal(calls,1,action);}
 let calls=0;await assert.rejects(worldRequest({action:"snapshot"},async()=>{calls++;return new Response("",{status:503});}));assert.equal(calls,2);
 let expired=0;await assert.rejects(worldRequest({action:"resume"},async()=>{expired++;return Response.json({error:"SESSION_EXPIRED"},{status:401});}),/SESSION_EXPIRED/);assert.equal(expired,1);
});

test("cancelling a page cannot retry or apply a late response",async()=>{
 const controller=new AbortController();let calls=0;
 await assert.rejects(worldRequest({action:"input"},async()=>{calls++;controller.abort();return Response.json({inputSequence:1});},controller.signal),{name:"AbortError"});assert.equal(calls,1);
});

test("retry after a lost contact response cannot spend or deal damage twice",async()=>{
 let now=100000;const rooms=new Rooms(()=>now),session=rooms.create("Retry check","Knight","watch");rooms.start(session.room,session.id,session.token);
 const world=rooms.get(session.room).world,hero=world.heroes.get(session.id)!,enemy=world.monsters[0];
 Object.assign(hero,{x:1200,y:1500,facing:-Math.PI/2});Object.assign(enemy,{x:1200,y:1440,nextAttack:now+10000});
 const stamina=hero.stamina;let calls=0;const body={action:"input",input:{sequence:7,x:0,y:0,attack:true}};
 await worldRequest(body,async()=>{
  const view=world.input(session.id,session.token,body.input);calls++;
  if(calls===1){now+=180;world.snapshot(session.id,session.token);return new Response("");}
  return Response.json(view);
 });
 assert.equal(calls,2);assert.equal(enemy.maxHp-enemy.hp,43);assert.equal(world.effects.filter(e=>e.kind==="hit"&&e.value).length,1);
 assert.ok(stamina-hero.stamina<=10);assert.equal(hero.action?.at,100000);assert.equal(hero.seq,7);
});
