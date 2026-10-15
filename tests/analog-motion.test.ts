import test from "node:test";
import assert from "node:assert/strict";
import {stick} from "../apps/web/app/ashwatch/controls.ts";
import {TravelIntent} from "../apps/web/app/ashwatch/player-controls.ts";
import {dashVector} from "../apps/web/app/ashwatch/input-motion.ts";
import {Rooms} from "../apps/web/app/ashwatch/rooms.ts";

test("a gentle deliberate stick produces slow authoritative travel instead of being discarded twice",()=>{
 let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Slow travel","Knight","watch"),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!,intent=new TravelIntent(),raw=stick(.22,0),movement=intent.movement(raw.x,raw.y,-Math.PI/2),x=p.x;
 assert.ok(Math.hypot(movement.x,movement.y)>.005&&Math.hypot(movement.x,movement.y)<.1);w.input(s.id,s.token,{sequence:1,...movement});now+=100;w.snapshot(s.id,s.token);assert.ok(p.moving);assert.ok(p.x-x>.1&&p.x-x<5);
 const before=p.x;w.input(s.id,s.token,{sequence:2,...intent.movement(...Object.values(stick(.1,0)) as [number,number],-Math.PI/2)});now+=100;w.snapshot(s.id,s.token);assert.equal(p.moving,false);assert.equal(p.x,before);
});
test("all classes dash fully in a deliberate analog direction, even while facing somewhere else",()=>{
 for(const cls of ["Knight","Spellweaver","Ironbound","Rogue","Warden"] as const){
  const travel=(amount:number)=>{let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Dash",cls,"watch"),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!,start={x:p.x,y:p.y};w.input(s.id,s.token,{sequence:1,x:amount,y:0,facing:-Math.PI/2,dodge:true});for(let i=0;i<6;i++){now+=50;w.snapshot(s.id,s.token);}return {x:p.x-start.x,y:p.y-start.y};};
  const gentle=travel(.02),full=travel(1);assert.ok(gentle.x>90);assert.ok(Math.abs(gentle.x-full.x)<.001,cls);assert.ok(Math.abs(gentle.y)<.001);
 }
});
test("dash diagonals are unit length and releasing travel restores a full faced dash",()=>{
 const diagonal=dashVector(.03,-.04,0);assert.ok(Math.abs(Math.hypot(diagonal.x,diagonal.y)-1)<1e-9);assert.ok(diagonal.y<0&&diagonal.x>0);assert.deepEqual(dashVector(0,0,Math.PI),{x:Math.cos(Math.PI),y:Math.sin(Math.PI)});
});
