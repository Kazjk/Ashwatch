import test from "node:test";
import assert from "node:assert/strict";
import {playerInput} from "../apps/web/app/ashwatch/player-controls.ts";
import {Rooms} from "../apps/web/app/ashwatch/rooms.ts";

test("ordinary movement requests the character direction from the captured view",()=>{
 let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Travel","Knight","watch"),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!;
 w.input(s.id,s.token,{sequence:1,...playerInput(1,0,-Math.PI/2,undefined,p.facing,false,false)});assert.ok(Math.abs(p.facing)<1e-9);
 w.input(s.id,s.token,{sequence:2,...playerInput(0,-1,-Math.PI/2,undefined,p.facing,false,false)});assert.equal(p.facing,-Math.PI/2);
 now+=100;w.snapshot(s.id,s.token);assert.equal(p.facing,-Math.PI/2);
});
test("holding movement responds to deliberate orbit immediately and diagonal speed stays bounded",()=>{
 const before=playerInput(0,-1,-Math.PI/2,undefined,0,false,false),after=playerInput(0,-1,0,undefined,0,false,false);
 assert.ok(before.y<-.99);assert.equal(after.x,1);assert.equal(after.y,0);
 const diagonal=playerInput(1,-1,.7,undefined,0,false,false);assert.ok(Math.abs(Math.hypot(diagonal.x,diagonal.y)-1)<1e-9);
});
test("aiming and holding strike strafe while a committed server attack retains its facing",()=>{
 const rooms=new Rooms(()=>100000),s=rooms.create("Aim","Knight","watch"),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!;
 w.input(s.id,s.token,{sequence:1,...playerInput(1,0,-Math.PI/2,-Math.PI/2,p.facing,true,false)});assert.equal(p.facing,-Math.PI/2);
 w.input(s.id,s.token,{sequence:2,...playerInput(1,0,-Math.PI/2,undefined,p.facing,false,true),attack:true});const committed=p.action!.facing;
 w.input(s.id,s.token,{sequence:3,...playerInput(0,-1,0,0,p.facing,true,true)});assert.equal(p.action!.facing,committed);
});


test("frontier backpedalling and strafing retain facing instead of rotating the following camera",()=>{
 for(const [x,y] of [[0,1],[-1,0],[1,0],[1,1]]){
  let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Frontier controls","Knight","frontier"),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!;w.monsters=[];Object.assign(p,{x:950,y:1550,facing:-Math.PI/2});
  const before={x:p.x,y:p.y};w.input(s.id,s.token,{sequence:1,...playerInput(x,y,p.facing,undefined,p.facing,false,false,true)});now+=100;w.snapshot(s.id,s.token);
  assert.equal(p.facing,-Math.PI/2);assert.ok(Math.hypot(p.x-before.x,p.y-before.y)>0);assert.ok(Math.hypot(p.x-before.x,p.y-before.y)<=10.001);
 }
});

test("frontier walk and Shift-run speeds remain authoritative and malformed sprint flags fail before mutation",()=>{
 const distances=[];
 for(const sprint of [false,true]){let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Run","Knight","frontier"),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!;w.monsters=[];Object.assign(p,{x:950,y:1550,facing:0});w.input(s.id,s.token,{sequence:1,x:1,y:0,facing:0,sprint});now+=100;w.snapshot(s.id,s.token);distances.push(p.x-950);const sequence=p.seq;assert.throws(()=>w.input(s.id,s.token,{sequence:2,x:0,y:0,sprint:"yes" as unknown as boolean}),/INVALID_INPUT/);assert.equal(p.seq,sequence);}
 assert.ok(Math.abs(distances[0]-10)<.01);assert.ok(Math.abs(distances[1]-15.5)<.01);
});

test("frontier movement is not pushed by legacy villagers that are absent from its rendering",()=>{
 let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Clear path","Knight","frontier"),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!;w.monsters=[];const next=now+50,a=next/11000,tx=920+Math.cos(a)*70,ty=1500+Math.sin(a)*65;Object.assign(p,{x:tx-5,y:ty,facing:0});w.input(s.id,s.token,{sequence:1,x:1,y:0,facing:0});now=next;w.snapshot(s.id,s.token);assert.ok(Math.abs(p.x-tx)<.001);assert.ok(Math.abs(p.y-ty)<.001);
});
