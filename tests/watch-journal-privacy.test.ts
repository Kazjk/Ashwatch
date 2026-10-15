import test from "node:test";
import assert from "node:assert/strict";
import {Rooms} from "../apps/web/app/ashwatch/rooms.ts";

test("live journals cannot disclose the attack pattern of an unseen guardian; the ending reveals only recorded summaries",()=>{
 let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Observer","Knight","watch"),a=rooms.join(s.room,"Caller","Warden"),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!,q=w.heroes.get(a.id)!,e=w.monsters[0];rooms.start(s.room,s.id,s.token);
 p.x=1200;p.y=1500;p.facing=Math.PI/2;p.awareness=0;q.x=1200;q.y=1350;e.x=1200;e.y=1340;e.kind="boss";e.attackKind="sweep";e.tx=q.x;e.ty=q.y;e.attackAt=now+100;
 now+=100;const live=w.snapshot(s.id,s.token);assert.equal(live.monsters.length,0);assert.ok(w.watch!.hitsByKind.sweep>0);assert.deepEqual(live.watch!.hitsByKind,{scout:0,sentinel:0,strike:0,sweep:0});assert.ok(!JSON.stringify(live).includes(a.token));
 p.hp=q.hp=0;now+=50;const ending=w.snapshot(s.id,s.token);assert.equal(ending.watch?.state,"defeat");assert.ok(ending.watch!.hitsByKind.sweep>0);assert.equal(ending.monsters.length,0);
});
