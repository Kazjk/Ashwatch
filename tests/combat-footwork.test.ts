import test from "node:test";
import assert from "node:assert/strict";
import {preserveCombatFacing,playerInput,TravelIntent} from "../apps/web/app/ashwatch/player-controls.ts";
import {Rooms} from "../apps/web/app/ashwatch/rooms.ts";
import {COMBAT} from "../apps/web/app/ashwatch/combat.ts";

test("every class can release Strike and dash backward without turning away from its opponent",()=>{
 for(const cls of Object.keys(COMBAT) as (keyof typeof COMBAT)[]){
  let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Footwork",cls,"watch"),w=rooms.get(s.room).world;rooms.start(s.room,s.id,s.token);
  const p=w.heroes.get(s.id)!,e=w.monsters[0];e.nextAttack=now+10000;
  w.input(s.id,s.token,{sequence:1,x:0,y:0,facing:-Math.PI/2,attack:true});now+=COMBAT[cls].end+10;w.snapshot(s.id,s.token);const before=p.y;
  const input=playerInput(0,1,p.facing,undefined,p.facing,false,preserveCombatFacing(p.attackAt,now));
  w.input(s.id,s.token,{sequence:2,...input,dodge:true});now+=200;w.snapshot(s.id,s.token);
  assert.equal(p.facing,-Math.PI/2,cls);assert.ok(p.y>before+30,cls);assert.ok(p.dodgeUntil>now);
 }
});

test("combat footwork respects manual turns and expires into ordinary directional travel",()=>{
 let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Turn","Knight","watch"),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!;p.attackAt=now;
 assert.equal(preserveCombatFacing(p.attackAt,now-1),false);assert.equal(preserveCombatFacing(0,now),false);
 const manual=playerInput(0,1,0,0,p.facing,true,preserveCombatFacing(p.attackAt,now+500));w.input(s.id,s.token,{sequence:1,...manual});assert.equal(p.facing,0);
 now+=1800;w.input(s.id,s.token,{sequence:2,...playerInput(0,1,0,undefined,p.facing,false,preserveCombatFacing(p.attackAt,now))});assert.ok(Math.abs(Math.abs(p.facing)-Math.PI)<1e-9);
});

test("held backsteps keep their travel basis across the combat-facing expiry and following camera turn",()=>{
 const intent=new TravelIntent(),initial=intent.movement(0,1,-Math.PI/2);
 for(let i=0;i<80;i++)assert.deepEqual(intent.movement(0,1,-Math.PI/2+i*.04),initial);
 intent.reset();assert.notDeepEqual(intent.movement(0,1,Math.PI/2),initial);
});
