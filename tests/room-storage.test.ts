import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {Rooms} from "../apps/web/app/ashwatch/rooms.ts";
import {RoomStorage} from "../apps/web/app/ashwatch/room-storage.ts";

function temporary(run:(dir:string)=>void){const base=path.resolve(tmpdir()),dir=mkdtempSync(path.join(base,"ashwatch-storage-test-"));try{run(dir);}finally{assert.ok(path.resolve(dir).startsWith(base+path.sep)&&path.basename(dir).startsWith("ashwatch-storage-test-"));rmSync(dir,{recursive:true,force:true});}}

test("a private atomic checkpoint restores credentials, health, enemy health, sequences and pending contact exactly once",()=>temporary(dir=>{
 let now=100000;const old=new Rooms(()=>now),s=old.create("Leader","Knight","watch"),a=old.join(s.room,"Friend","Warden"),w=old.get(s.room).world,p=w.heroes.get(s.id)!,e=w.monsters[0];old.start(s.room,s.id,s.token);p.hp=73;e.x=p.x;e.y=p.y-40;e.hp=e.maxHp=1000;e.nextAttack=now+10000;
 w.input(s.id,s.token,{sequence:50,x:0,y:0,attack:true});now+=100;w.snapshot(s.id,s.token);const mana=p.mp,stamina=p.stamina;const storage=new RoomStorage(dir,()=>now);storage.save(old,true);const bytes=readFileSync(storage.file,"utf8");assert.ok(bytes.includes(s.token));assert.doesNotThrow(()=>JSON.parse(bytes));
 now+=5000;const fresh=new Rooms(()=>now);new RoomStorage(dir,()=>now).load(fresh);const restored=fresh.get(s.room).world,r=restored.heroes.get(s.id)!;const v=restored.resume(s.id,s.token);assert.equal(r.hp,73);assert.equal(r.mp,mana);assert.equal(r.stamina,stamina);assert.equal(v.inputSequence,50);assert.equal(r.input.x,0);assert.ok(r.action);assert.ok(!JSON.stringify(v).includes(s.token));assert.ok(!JSON.stringify(v).includes(a.token));assert.ok(fresh.get(s.room).world.authenticate(a.id,a.token));
 const before=restored.monsters[0].hp;restored.input(s.id,s.token,{sequence:50,x:0,y:0,attack:true});assert.equal(restored.monsters[0].hp,before);now=r.action!.contactAt;restored.snapshot(s.id,s.token);const after=restored.monsters[0].hp;assert.ok(after<before);restored.snapshot(s.id,s.token);assert.equal(restored.monsters[0].hp,after);
}));

test("already resolved contact survives restart without double damage, and replay preserves new journal state",()=>temporary(dir=>{
 let now=100000;const old=new Rooms(()=>now),s=old.create("Leader","Knight","watch"),w=old.get(s.room).world,p=w.heroes.get(s.id)!,e=w.monsters[0];old.start(s.room,s.id,s.token);e.x=p.x;e.y=p.y-40;e.hp=e.maxHp=1000;e.nextAttack=now+10000;e.recoveryUntil=now+1400;w.input(s.id,s.token,{sequence:1,x:0,y:0,attack:true});now+=180;w.snapshot(s.id,s.token);const hp=e.hp;new RoomStorage(dir,()=>now).save(old,true);
 now+=5000;const fresh=new Rooms(()=>now);new RoomStorage(dir,()=>now).load(fresh);const v=fresh.get(s.room).world.resume(s.id,s.token);assert.equal(v.watch?.openings,1);now+=50;fresh.get(s.room).world.snapshot(s.id,s.token);assert.equal(fresh.get(s.room).world.monsters[0].hp,hp);
 fresh.get(s.room).world.watch!.state="defeat";fresh.restart(s.room,s.id,s.token,"ember");const store=new RoomStorage(dir,()=>now);store.save(fresh,true);now+=2000;const again=new Rooms(()=>now);new RoomStorage(dir,()=>now).load(again);assert.equal(again.get(s.room).world.watch?.attempt,2);assert.equal(again.get(s.room).world.watch?.oath,"ember");assert.equal(again.get(s.room).world.watch?.openings,0);
}));

test("corrupt or unsupported checkpoint is preserved and never silently overwritten",()=>temporary(dir=>{
 let now=100000;const rooms=new Rooms(()=>now);rooms.create("Leader","Knight","watch");const storage=new RoomStorage(dir,()=>now);storage.save(rooms,true);const envelope=JSON.parse(readFileSync(storage.file,"utf8"));envelope.payload+="corrupt";writeFileSync(storage.file,JSON.stringify(envelope));const original=readFileSync(storage.file,"utf8"),freshStorage=new RoomStorage(dir,()=>now);
 assert.throws(()=>freshStorage.load(new Rooms(()=>now)),/preserved/);now+=5000;assert.throws(()=>freshStorage.save(rooms,true),/preserved/);assert.equal(readFileSync(storage.file,"utf8"),original);
}));

test("restart does not extend an expired company or restore held movement",()=>temporary(dir=>{
 let now=100000;const old=new Rooms(()=>now),s=old.create("Leader","Knight","watch");old.get(s.room).world.input(s.id,s.token,{sequence:1,x:1,y:0});const storage=new RoomStorage(dir,()=>now);storage.save(old,true);now+=21*60*1000;const fresh=new Rooms(()=>now);new RoomStorage(dir,()=>now).load(fresh);assert.throws(()=>fresh.get(s.room),/not found/);
}));
