import test from "node:test";
import assert from "node:assert/strict";
import {Rooms} from "../apps/web/app/ashwatch/rooms.ts";
import {playerInput} from "../apps/web/app/ashwatch/player-controls.ts";
import {travelVector} from "../apps/web/app/ashwatch/controls.ts";

test("explicit strafing and retreat preserve sight without attacking, and deliberate looking still hides rear foes",()=>{
 let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Watcher","Knight","watch"),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!;let seq=0;
 for(const [x,y] of [[1,0],[-1,0],[0,1],[0,-1]]){
  const motion=travelVector(x,y,-Math.PI/2);w.input(s.id,s.token,{sequence:++seq,...motion,facing:playerInput(0,0,-Math.PI/2,undefined,p.facing,true,false).facing});now+=150;const view=w.snapshot(s.id,s.token);
  assert.equal(p.facing,-Math.PI/2);assert.equal(p.action,null);assert.equal(view.monsters.length,1);
 }
 const v=w.input(s.id,s.token,{sequence:++seq,x:0,y:0,facing:playerInput(0,0,-Math.PI/2,Math.PI/2,p.facing,true,false).facing});assert.equal(v.monsters.length,0);assert.equal(p.facing,Math.PI/2);
});

test("open-world travel retains its normal facing unless striking or explicitly looking",()=>{
 assert.equal(playerInput(0,0,0,undefined,1,false,false).facing,undefined);assert.equal(playerInput(0,0,0,undefined,1,false,true).facing,1);assert.equal(playerInput(0,0,0,0,1,false,true).facing,0);
});
