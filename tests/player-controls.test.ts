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
