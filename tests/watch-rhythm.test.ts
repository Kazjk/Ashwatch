import test from "node:test";
import assert from "node:assert/strict";
import {Rooms} from "../apps/web/app/ashwatch/rooms.ts";
import {COMBAT} from "../apps/web/app/ashwatch/combat.ts";
import {watchAdvice} from "../apps/web/app/ashwatch/watch-report.ts";

test("all five classes learn a real harmless mark, evade and recovery contact, isolated per recipient",()=>{
 for(const cls of Object.keys(COMBAT) as (keyof typeof COMBAT)[]){
  let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Learner",cls,"watch"),ally=rooms.join(s.room,"Observer","Warden"),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!,e=w.monsters[0];let seq=0;
  p.x=e.x;p.y=e.y+40;e.nextAttack=now;const hp=p.hp,mp=p.mp,stamina=p.stamina,enemyHP=e.hp;
  now+=10;let v=w.input(s.id,s.token,{sequence:++seq,x:0,y:0,warn:true});assert.ok(e.attackAt>now);const contact=e.attackAt;
  w.input(s.id,s.token,{sequence:++seq,x:1,y:0,dodge:true});now+=200;w.snapshot(s.id,s.token);
  now=contact;v=w.snapshot(s.id,s.token);assert.equal(v.rehearsal?.evaded,true);assert.equal(v.rehearsal?.called,true);assert.equal(v.watch?.evades,0);assert.equal(v.watch?.warnings,0);assert.equal(p.hp,hp);assert.equal(p.mp,mp);assert.equal(p.stamina,stamina);
  p.x=e.x;p.y=e.y+40;w.input(s.id,s.token,{sequence:++seq,x:0,y:0,facing:-Math.PI/2,attack:true});now+=COMBAT[cls].contact;v=w.snapshot(s.id,s.token);
  assert.equal(v.rehearsal?.contact,true);assert.equal(v.rehearsal?.opening,true);assert.ok(e.hp<enemyHP);assert.equal(v.watch?.openings,0);
  assert.equal(w.snapshot(ally.id,ally.token).rehearsal?.opening,false);assert.ok(!JSON.stringify(v).includes(ally.token));
  rooms.start(s.room,s.id,s.token);assert.equal(e.attackAt,0);assert.equal(e.recoveryUntil,0);assert.equal(w.snapshot(s.id,s.token).rehearsal,undefined);
 }
});

test("standing in a harmless mark cannot claim an evade, and facing away cannot claim contact",()=>{
 let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Learner","Knight","watch"),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!,e=w.monsters[0];p.x=e.x;p.y=e.y+40;e.nextAttack=now;now+=10;w.snapshot(s.id,s.token);now=e.attackAt;const v=w.snapshot(s.id,s.token);assert.equal(v.rehearsal?.evaded,false);assert.equal(p.hp,p.maxHp);
 w.input(s.id,s.token,{sequence:1,x:0,y:0,facing:Math.PI/2,attack:true});now+=180;assert.equal(w.snapshot(s.id,s.token).rehearsal?.contact,false);
});

test("wave regroup preserves health and admits movement, prevents attack skipping, and journals each encounter once",()=>{
 let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Leader","Knight","watch"),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!;rooms.start(s.room,s.id,s.token);p.hp=90;
 w.monsters[0].hp=0;now+=50;w.snapshot(s.id,s.token);assert.equal(w.watch?.chapters.length,1);assert.equal(w.watch?.chapters[0].stage,0);assert.equal(w.watch?.stage,1);const mark=w.watch!.regroupUntil;
 const e=w.monsters.find(e=>e.hp>0)!,start={x:e.x,y:e.y,hp:e.hp};w.input(s.id,s.token,{sequence:1,x:1,y:0,attack:true});assert.equal(p.action,null);const x=p.x;now+=200;w.snapshot(s.id,s.token);assert.ok(p.x>x);assert.equal(p.hp,90);assert.deepEqual({x:e.x,y:e.y,hp:e.hp},start);assert.equal(w.watch?.chapters.length,1);
 now=mark;w.input(s.id,s.token,{sequence:2,x:0,y:0,attack:true});assert.ok(p.action);for(const e of w.monsters)e.hp=0;now+=50;w.snapshot(s.id,s.token);assert.equal(w.watch?.chapters.length,2);
 now=w.watch!.regroupUntil;for(const e of w.monsters)e.hp=0;now+=50;const end=w.snapshot(s.id,s.token);assert.equal(end.watch?.state,"victory");assert.deepEqual(end.watch?.chapters.map(c=>c.stage),[0,1,2]);now+=50;w.snapshot(s.id,s.token);assert.equal(w.watch?.chapters.length,3);
 end.watch!.chapters[0].hits=100;assert.equal(w.watch!.chapters[0].hits,0);
});

test("contact, misses and failure advice are based on recorded authoritative outcomes",()=>{
 let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Leader","Knight","watch"),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!,e=w.monsters[0];rooms.start(s.room,s.id,s.token);e.x=p.x;e.y=p.y-40;e.nextAttack=now+10000;e.recoveryUntil=now+1400;e.hp=e.maxHp=1000;
 w.input(s.id,s.token,{sequence:1,x:0,y:0,facing:-Math.PI/2,attack:true});assert.equal(w.watch?.openings,0);now+=180;w.snapshot(s.id,s.token);assert.equal(w.watch?.openings,1);w.snapshot(s.id,s.token);assert.equal(w.watch?.openings,1);
 now+=600;w.input(s.id,s.token,{sequence:2,x:0,y:0,facing:Math.PI/2,attack:true});now+=180;w.snapshot(s.id,s.token);assert.equal(w.watch?.misses,1);assert.match(watchAdvice(w.watch!),/1 attack released/);
 e.attackAt=now+100;e.attackKind="sweep";e.kind="boss";e.tx=p.x;e.ty=p.y;now+=100;w.snapshot(s.id,s.token);assert.equal(w.watch?.hitsByKind.sweep,1);assert.match(watchAdvice(w.watch!),/1 wide sweep connected/);assert.equal(w.watch?.hitsByKind.strike,0);
});

test("replay varies the sentinel approach and guardian order without changing roster, health or credentials",()=>{
 let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Leader","Knight","watch"),w=rooms.get(s.room).world;rooms.start(s.room,s.id,s.token);w.monsters[0].hp=0;now+=50;w.snapshot(s.id,s.token);const first=w.monsters.filter(e=>e.hp>0).map(e=>({x:e.x,y:e.y,hp:e.maxHp}));w.watch!.state="defeat";
 const fresh=rooms.restart(s.room,s.id,s.token);assert.equal(fresh.watch?.attempt,2);const replay=rooms.get(s.room).world;rooms.start(s.room,s.id,s.token);replay.monsters[0].hp=0;now+=50;replay.snapshot(s.id,s.token);const next=replay.monsters.filter(e=>e.hp>0).map(e=>({x:e.x,y:e.y,hp:e.maxHp}));assert.notDeepEqual(first,next);assert.deepEqual(first.map(e=>e.hp),next.map(e=>e.hp));assert.deepEqual(first.map(e=>e.y),next.map(e=>e.y));assert.ok(replay.authenticate(s.id,s.token));
});
