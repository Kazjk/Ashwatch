import test from "node:test";
import assert from "node:assert/strict";
import {Rooms} from "../apps/web/app/ashwatch/rooms.ts";
import {distance} from "../apps/web/app/ashwatch/world.ts";
import {COMBAT} from "../apps/web/app/ashwatch/combat.ts";

test("ordinary travel keeps a real strike distance from a living rehearsal opponent",()=>{
 let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Learner","Knight","watch"),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!,e=w.monsters[0];p.x=e.x;p.y=e.y+40;p.facing=-Math.PI/2;e.nextAttack=now+10000;
 for(let i=0;i<10;i++){w.input(s.id,s.token,{sequence:i+1,x:0,y:-1});now+=50;w.snapshot(s.id,s.token);}assert.ok(distance(p,e)>=38-.001);assert.ok(distance(p,e)<72);assert.equal(e.y,1380);assert.equal(p.hp,p.maxHp);
 w.input(s.id,s.token,{sequence:11,x:0,y:0,attack:true});now+=180;assert.equal(w.snapshot(s.id,s.token).rehearsal?.contact,true);
});

test("every class retains a clear legal melee opening and the heavy silhouette gets additional body room",()=>{
 for(const cls of Object.keys(COMBAT) as (keyof typeof COMBAT)[]){
  let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Spacing",cls,"watch"),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!,e=w.monsters[0];p.x=e.x;p.y=e.y+25;p.facing=-Math.PI/2;e.nextAttack=now+10000;
  w.input(s.id,s.token,{sequence:1,x:0,y:0});now+=50;w.snapshot(s.id,s.token);const d=distance(p,e);assert.ok(d>= (cls==="Ironbound"?46:38)-.001);assert.ok(d<COMBAT[cls].reach);
  w.input(s.id,s.token,{sequence:2,x:0,y:0,attack:true});now+=COMBAT[cls].contact;assert.equal(w.snapshot(s.id,s.token).rehearsal?.contact,true,cls);
 }
});
test("a legal dash crosses the opponent and settles outside its body without costing practice resources",()=>{
 let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Escape","Rogue","watch"),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!,e=w.monsters[0];p.x=e.x;p.y=e.y+40;p.facing=-Math.PI/2;e.nextAttack=now+10000;const stamina=p.stamina;
 w.input(s.id,s.token,{sequence:1,x:0,y:-1,dodge:true});now+=300;w.snapshot(s.id,s.token);assert.ok(p.y<e.y);now+=100;w.snapshot(s.id,s.token);assert.ok(distance(p,e)>=30);assert.equal(p.stamina,stamina);assert.equal(e.y,1380);
});
test("rehearsal retains the same locked attack facing as live combat",()=>{
 let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Commit","Knight","watch"),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!,e=w.monsters[0];p.x=e.x;p.y=e.y+40;p.facing=-Math.PI/2;e.nextAttack=now+10000;
 w.input(s.id,s.token,{sequence:1,x:0,y:0,attack:true});const facing=p.action!.facing;now+=50;w.input(s.id,s.token,{sequence:2,x:0,y:0,facing:Math.PI/2});assert.equal(p.facing,facing);assert.equal(p.action!.facing,facing);now+=130;assert.equal(w.snapshot(s.id,s.token).rehearsal?.contact,true);
});
