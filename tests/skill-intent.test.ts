import test from "node:test";
import assert from "node:assert/strict";
import {SkillIntent} from "../apps/web/app/ashwatch/skill-intent.ts";
import {Rooms} from "../apps/web/app/ashwatch/rooms.ts";

test("skill input survives a short recovery, but acknowledgement, timeout and focus reset stop retries",()=>{
 const input=new SkillIntent();input.press(1000);
 assert.equal(input.requested(1200,0),true);
 assert.equal(input.requested(1250,6500),false);
 assert.equal(input.requested(1300,0),false);
 input.press(2000);assert.equal(input.requested(2050,0,true),false);
 input.press(3000);assert.equal(input.requested(3600,0),false);
 input.press(4000);input.reset();assert.equal(input.requested(4100,0),false);
});

test("a deliberate skill takes priority over held strikes and a busy retry cannot spend twice",()=>{
 let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Tank","Ironbound","watch"),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!;rooms.start(s.room,s.id,s.token);
 const stamina=p.stamina,mp=p.mp;
 w.input(s.id,s.token,{sequence:1,x:0,y:0,attack:true,skill:true});
 assert.equal(p.action?.skill,true);assert.equal(p.stamina,stamina-28);assert.equal(p.mp,mp-12);
 w.input(s.id,s.token,{sequence:2,x:0,y:0,attack:true,skill:true});
 assert.equal(p.stamina,stamina-28);assert.equal(p.mp,mp-12);assert.equal(p.action?.at,now);
 now+=900;w.snapshot(s.id,s.token);
 w.input(s.id,s.token,{sequence:3,x:0,y:0,attack:true,skill:true});
 assert.equal(p.action?.skill,false);assert.equal(p.action?.at,now);
});

test("a skill pressed during a basic recovery starts when that recovery clears",()=>{
 let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Tank","Ironbound","watch"),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!;rooms.start(s.room,s.id,s.token);
 w.input(s.id,s.token,{sequence:1,x:0,y:0,attack:true});const input=new SkillIntent();now+=300;input.press(now);
 w.input(s.id,s.token,{sequence:2,x:0,y:0,attack:true,skill:input.requested(now,p.skillCooldown)});assert.equal(p.action?.skill,false);
 now+=250;w.snapshot(s.id,s.token);
 w.input(s.id,s.token,{sequence:3,x:0,y:0,attack:true,skill:input.requested(now,p.skillCooldown)});assert.equal(p.action?.skill,true);
 assert.equal(input.requested(now,0,!!p.action?.skill),false);
});
