import test from "node:test";
import assert from "node:assert/strict";
import {Rooms} from "../apps/web/app/ashwatch/rooms.ts";
import {readSupport} from "../apps/web/app/ashwatch/targeting.ts";

test("Renew hints distinguish webbed, hurt, out-of-reach, unfaced and hidden teammates using admitted heroes",()=>{
 let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Medic","Warden","watch"),a=rooms.join(s.room,"Caller","Knight"),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!,q=w.heroes.get(a.id)!;rooms.start(s.room,s.id,s.token);w.monsters[0].nextAttack=now+10000;p.awareness=0;p.x=1200;p.y=1500;p.facing=-Math.PI/2;q.x=1200;q.y=1400;q.hp-=30;q.webUntil=now+2000;
 let v=w.snapshot(s.id,s.token);assert.equal(readSupport(v,p)?.ready,true);assert.equal(readSupport(v,p)?.webbed,true);assert.equal(readSupport(v,p)?.name,"Caller");
 q.y=1310;v=w.snapshot(s.id,s.token);assert.equal(readSupport(v,p)?.inReach,false);
 p.facing=Math.PI/2;v=w.snapshot(s.id,s.token);assert.equal(v.heroes.some(h=>h.id===q.id),false);assert.equal(readSupport(v,p),null);assert.ok(v.partyMembers.some(h=>h.id===q.id));
 p.hp-=10;v=w.snapshot(s.id,s.token);assert.equal(readSupport(v,p)?.name,"You");assert.equal(readSupport(v,p)?.ready,true);
 now+=1;
});

test("Renew cannot heal or cleanse through courtyard stone and the hint agrees with server contact",()=>{
 let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Medic","Warden","watch"),a=rooms.join(s.room,"Caller","Knight"),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!,q=w.heroes.get(a.id)!;rooms.start(s.room,s.id,s.token);w.monsters[0].nextAttack=now+10000;
 p.x=900;p.y=1375;p.facing=0;q.x=1000;q.y=1375;q.hp-=30;q.webUntil=now+2000;const hp=q.hp;
 const v=w.snapshot(s.id,s.token);assert.equal(readSupport(v,p)?.obstructed,true);assert.equal(readSupport(v,p)?.ready,false);
 w.input(s.id,s.token,{sequence:1,x:0,y:0,skill:true});now+=330;w.snapshot(s.id,s.token);assert.equal(q.hp,hp);assert.ok(q.webUntil>now);assert.equal(w.watch?.healing,0);assert.equal(w.watch?.cleanses,0);
});
