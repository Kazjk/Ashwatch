import test from "node:test";
import assert from "node:assert/strict";
import {Rooms} from "../apps/web/app/ashwatch/rooms.ts";

test("duplicate and out-of-order authenticated actions acknowledge the current sequence without spending or redirecting",()=>{
 let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Runner","Knight","watch"),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!;rooms.start(s.room,s.id,s.token);
 w.input(s.id,s.token,{sequence:50,x:1,y:0,attack:true});const stamina=p.stamina,at=p.action?.at;
 for(const sequence of [50,49]){const v=w.input(s.id,s.token,{sequence,x:-1,y:0,skill:true,dodge:true});assert.equal(v.inputSequence,50);assert.equal(p.input.x,1);assert.equal(p.stamina,stamina);assert.equal(p.action?.at,at);assert.equal(p.dodgeAt,0);}
 assert.throws(()=>w.input(s.id,'forged',{sequence:50,x:0,y:0}),/SESSION_EXPIRED/);
 assert.throws(()=>w.input(s.id,s.token,{sequence:49,x:NaN,y:0}),/INVALID_INPUT/);
 now+=600;const v=w.input(s.id,s.token,{sequence:51,x:0,y:0,attack:true});assert.equal(v.inputSequence,51);assert.equal(p.action?.at,now);
});

test("read-only views retain a connected session without extending old movement indefinitely",()=>{
 let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Runner","Knight","watch"),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!;rooms.start(s.room,s.id,s.token);
 w.input(s.id,s.token,{sequence:1,x:1,y:0});for(let i=0;i<10;i++){now+=100;w.snapshot(s.id,s.token);}const x=p.x;
 for(let i=0;i<10;i++){now+=100;w.snapshot(s.id,s.token);}assert.equal(p.x,x);assert.equal(p.moving,false);assert.equal(p.lastSeen,now);
});
