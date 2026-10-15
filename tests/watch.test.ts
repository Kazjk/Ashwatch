import test from "node:test";
import assert from "node:assert/strict";
import {Rooms} from "../apps/web/app/ashwatch/rooms.ts";
test("cover calls are relative to each recipient, party-only, throttled and expire",()=>{
 let now=100000;const rooms=new Rooms(()=>now),host=rooms.create("Caller","Knight","watch"),ally=rooms.join(host.room,"Ally","Warden"),stranger=rooms.join(host.room,"Stranger","Rogue"),w=rooms.get(host.room).world;
 rooms.start(host.room,host.id,host.token);const p=w.heroes.get(host.id)!,q=w.heroes.get(ally.id)!,r=w.heroes.get(stranger.id)!;p.x=q.x;p.y=q.y+60;q.facing=-Math.PI/2;r.party="";
 w.input(host.id,host.token,{sequence:1,x:0,y:0,warn:true});assert.equal(w.snapshot(ally.id,ally.token).warnings[0]?.relative,"behind");assert.equal(w.snapshot(stranger.id,stranger.token).warnings.length,0);
 q.facing=Math.PI/2;assert.equal(w.snapshot(ally.id,ally.token).warnings[0]?.relative,"ahead");
 w.input(host.id,host.token,{sequence:2,x:0,y:0,warn:true});assert.equal(w.watch?.warnings,1);now+=2900;assert.equal(w.snapshot(ally.id,ally.token).warnings.length,0);
});
test("a short watch has real wave transitions, defeat, and credential-preserving host replay",()=>{
 let now=100000;const rooms=new Rooms(()=>now),host=rooms.create("Host","Knight","watch"),ally=rooms.join(host.room,"Healer","Warden"),room=rooms.get(host.room),w=room.world;
 rooms.start(host.room,host.id,host.token);assert.equal(w.monsters.length,1);assert.equal(w.heroes.get(host.id)?.floor,1);assert.ok(w.heroes.get(host.id)?.weapon);assert.throws(()=>rooms.restart(host.room,host.id,host.token),/Conquer/);
 w.monsters[0].hp=0;now+=50;w.advance();assert.equal(w.watch?.stage,1);assert.equal(w.monsters.filter(e=>e.hp>0).length,2);
 for(const p of w.heroes.values())p.hp=0;now+=50;w.advance();assert.equal(w.watch?.state,"defeat");assert.throws(()=>rooms.restart(host.room,ally.id,ally.token),/host/);
 const fresh=rooms.restart(host.room,host.id,host.token);assert.equal(fresh.watch?.state,"forming");assert.equal(fresh.watch?.stage,0);assert.equal(fresh.population,2);assert.equal(fresh.heroes[0].level,1);assert.doesNotThrow(()=>room.world.snapshot(ally.id,ally.token));
});
test("resuming a room watch preserves position and does not grant free health",()=>{
 let now=100000;const rooms=new Rooms(()=>now),host=rooms.create("Host","Knight","watch"),w=rooms.get(host.room).world,p=w.heroes.get(host.id)!;
 p.x=1300;p.y=1400;p.hp=50;now+=100;const view=w.resume(host.id,host.token);assert.equal(view.heroes[0].x,1300);assert.equal(view.heroes[0].y,1400);assert.equal(view.heroes[0].hp,50);assert.equal(view.heroes[0].floor,1);
});
