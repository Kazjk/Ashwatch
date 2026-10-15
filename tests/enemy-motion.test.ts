import test from "node:test";
import assert from "node:assert/strict";
import {presentEnemyAction,combatPose,enemyMotion} from "../apps/web/app/ashwatch/combat.ts";
import {Rooms} from "../apps/web/app/ashwatch/rooms.ts";

test("a later windup remains visible even if the last recovery deadline is stale",()=>{
 const enemy={kind:"sentinel",attackAt:105050,recoveryUntil:102000,facing:0},shown=presentEnemyAction(enemy,104400,101000);assert.ok(shown.action);assert.ok(shown.action!.endsAt>enemy.attackAt);assert.ok(enemyMotion(shown.action!,104400).armX<-2);assert.equal(combatPose(shown.action!,enemy.attackAt).strike,1);
});
test("clearing a future contact cancels it permanently, including delayed rendering after that deadline",()=>{
 const pending={kind:"boss",attackAt:105000,recoveryUntil:0,facing:0};let state=presentEnemyAction(pending,104200);assert.ok(state.action);
 const interrupted={...pending,attackAt:0,recoveryUntil:105050};state=presentEnemyAction(interrupted,105010,state.contactAt,104200);assert.equal(state.action,null);assert.equal(state.contactAt,0);
 state=presentEnemyAction(interrupted,105030,state.contactAt,105030);assert.equal(state.action,null);
});
test("an actual contact retains its recovery pose and clears at the authoritative recovery deadline",()=>{
 const state=presentEnemyAction({kind:"boss",attackAt:0,recoveryUntil:106400,facing:0},105100,105000,105100);assert.ok(state.action);assert.equal(state.action!.endsAt,106400);assert.ok(combatPose(state.action!,105100).strike>0);assert.equal(presentEnemyAction({kind:"boss",attackAt:0,recoveryUntil:106400,facing:0},106400,state.contactAt).action,null);
});
test("an explicit server contact drives a fresh recipient's recovery and a cancelled attack never borrows a cached hit",()=>{
 const actual={kind:"boss",attackAt:0,lastContactAt:105000,recoveryUntil:106400,facing:0};assert.ok(presentEnemyAction(actual,105100).action);assert.equal(presentEnemyAction({...actual,lastContactAt:0},105100,105000,105100).action,null);
});
test("repeated rehearsal windups clear the expired recovery state while retaining real contact timing",()=>{
 let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Reader","Knight","watch"),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!,e=w.monsters[0];p.x=e.x;p.y=e.y+40;e.nextAttack=now;now++;w.snapshot(s.id,s.token);const first=e.attackAt;assert.ok(first>now);now=first;w.snapshot(s.id,s.token);assert.ok(e.recoveryUntil>now);
 let second=0;for(let i=0;i<10;i++){now+=500;w.snapshot(s.id,s.token);if(e.attackAt){second=e.attackAt;break;}}assert.ok(second>first);assert.equal(e.recoveryUntil,0);assert.ok(presentEnemyAction(e,now,first).action);
});
test("real enemy contact is recorded and restart recovery preserves its authoritative presentation time",()=>{
 let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Reader","Knight","watch"),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!,e=w.monsters[0];rooms.start(s.room,s.id,s.token);p.x=e.x;p.y=e.y+40;e.nextAttack=now;now++;w.snapshot(s.id,s.token);now=e.attackAt;w.snapshot(s.id,s.token);const contact=e.lastContactAt;assert.equal(contact,now);
 const saved=rooms.checkpoint();now+=5000;const restored=new Rooms(()=>now);restored.restore(saved);const view=restored.get(s.room).world.resume(s.id,s.token),enemy=view.monsters[0];assert.equal(enemy.lastContactAt,contact!+5000);assert.ok(presentEnemyAction(enemy,view.time).action);
});
