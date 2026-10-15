import test from "node:test";
import assert from "node:assert/strict";
import {Rooms} from "../apps/web/app/ashwatch/rooms.ts";

test("actual party healing answers a recent cover call once, and acknowledges both participants without credentials",()=>{
 let now=100000;const rooms=new Rooms(()=>now),caller=rooms.create("Caller","Knight","watch"),helper=rooms.join(caller.room,"Medic","Warden"),w=rooms.get(caller.room).world;rooms.start(caller.room,caller.id,caller.token);
 const p=w.heroes.get(caller.id)!,q=w.heroes.get(helper.id)!;p.hp-=40;q.x=p.x;q.y=p.y+60;q.facing=-Math.PI/2;w.monsters[0].nextAttack=now+10000;
 w.input(caller.id,caller.token,{sequence:1,x:0,y:0,warn:true});assert.ok(w.snapshot(caller.id,caller.token).ownCall);assert.equal(w.watch?.covers,0);
 w.input(helper.id,helper.token,{sequence:1,x:0,y:0,skill:true});now+=330;const recipient=w.snapshot(caller.id,caller.token),support=w.snapshot(helper.id,helper.token);
 assert.equal(p.hp,p.maxHp);assert.equal(recipient.ownCall?.answeredBy,"Medic");assert.equal(support.warnings[0]?.answeredBy,"Medic");assert.equal(w.watch?.covers,1);
 assert.ok(recipient.effects.some(e=>e.kind==="cover"));w.snapshot(caller.id,caller.token);w.snapshot(helper.id,helper.token);assert.equal(w.watch?.covers,1);
 for(const token of [caller.token,helper.token])assert.ok(!JSON.stringify(recipient).includes(token));
});

test("empty healing, self healing and an expired call cannot manufacture a cover response",()=>{
 for(const mode of ["full","self","expired"]){let now=100000;const rooms=new Rooms(()=>now),caller=rooms.create("Caller","Knight","watch"),helper=rooms.join(caller.room,"Medic","Warden"),w=rooms.get(caller.room).world;rooms.start(caller.room,caller.id,caller.token);
 const p=w.heroes.get(caller.id)!,q=w.heroes.get(helper.id)!;q.x=p.x;q.y=p.y+60;q.facing=-Math.PI/2;w.monsters[0].nextAttack=now+10000;
 if(mode==="expired")p.hp-=40;if(mode==="self")q.hp-=40;
 const s=mode==="self"?helper:caller;w.input(s.id,s.token,{sequence:1,x:0,y:0,warn:true});if(mode==="expired"){now+=2900;w.snapshot(caller.id,caller.token);}
 w.input(helper.id,helper.token,{sequence:2,x:0,y:0,skill:true});now+=330;w.snapshot(helper.id,helper.token);assert.equal(w.watch?.covers,0);
 }
});

test("interrupting an actual windup threatening a caller answers the call without requiring damage",()=>{
 let now=100000;const rooms=new Rooms(()=>now),caller=rooms.create("Caller","Knight","watch"),helper=rooms.join(caller.room,"Scout","Rogue"),w=rooms.get(caller.room).world;rooms.start(caller.room,caller.id,caller.token);
 const p=w.heroes.get(caller.id)!,q=w.heroes.get(helper.id)!,e=w.monsters[0];e.x=p.x;e.y=p.y-30;e.nextAttack=now;q.x=p.x+40;q.y=p.y+10;q.facing=Math.atan2(e.y-q.y,e.x-q.x);
 now+=50;w.snapshot(caller.id,caller.token);assert.ok(e.attackAt>now);
 w.input(caller.id,caller.token,{sequence:1,x:0,y:0,warn:true});w.input(helper.id,helper.token,{sequence:1,x:0,y:0,skill:true,facing:q.facing});now+=170;const v=w.snapshot(caller.id,caller.token);
 assert.equal(e.attackAt,0);assert.equal(v.ownCall?.answeredBy,"Scout");assert.equal(v.watch?.covers,1);assert.equal(v.watch?.interrupts,1);assert.equal(p.hp,p.maxHp);
});
