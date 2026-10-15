import test from "node:test";
import assert from "node:assert/strict";
import {Rooms} from "../apps/web/app/ashwatch/rooms.ts";
import {bossPhase,strikeRadius} from "../apps/web/app/ashwatch/world.ts";
import {OATHS,type OathId} from "../apps/web/app/ashwatch/oaths.ts";

test("gathering safely rehearses actions without resource costs; only the authenticated leader can start",()=>{
 let now=100000;const rooms=new Rooms(()=>now),host=rooms.create("Leader","Knight","watch"),ally=rooms.join(host.room,"Friend","Warden"),w=rooms.get(host.room).world,p=w.heroes.get(host.id)!,e=w.monsters[0];
 const start={x:e.x,y:e.y,hp:p.hp,mp:p.mp};
 now+=6000;w.input(host.id,host.token,{sequence:1,x:0,y:-1,attack:true,skill:true});
 assert.equal(w.watch?.state,"forming");assert.equal(p.action?.skill,true);assert.equal(p.hp,start.hp);assert.equal(p.mp,start.mp);assert.equal(e.x,start.x);assert.equal(e.y,start.y);
 assert.throws(()=>rooms.start(host.room,ally.id,ally.token),/leader/);assert.throws(()=>rooms.start(host.room,host.id,"forged"),/SESSION_EXPIRED/);
 const v=rooms.start(host.room,host.id,host.token);assert.equal(v.watch?.state,"active");assert.equal(v.watch?.startedAt,now);assert.throws(()=>rooms.start(host.room,host.id,host.token),/already/);
 assert.ok(!JSON.stringify(v).includes(ally.token));
});

test("company oaths apply their health, perception, damage and movement tradeoffs on server and replay",()=>{
 const outcomes=[];
 for(const oath of Object.keys(OATHS) as OathId[]){
  let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Leader","Knight","watch",oath),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!,e=w.monsters[0];rooms.start(s.room,s.id,s.token);
  const hp=p.maxHp,awareness=p.awareness; e.x=p.x;e.y=p.y-45;e.hp=e.maxHp=1000;e.nextAttack=now+10000;
  w.input(s.id,s.token,{sequence:1,x:0,y:0,facing:-Math.PI/2,attack:true});now+=200;w.snapshot(s.id,s.token);const damage=1000-e.hp;
  // Measure oath speed along free ground, not against an occupied enemy body.
  p.action=null;const x=p.x;w.input(s.id,s.token,{sequence:2,x:1,y:0});now+=100;w.snapshot(s.id,s.token);outcomes.push({oath,hp,awareness,damage,travel:p.x-x});
  w.watch!.state="defeat";const replay=rooms.restart(s.room,s.id,s.token,"ember");assert.equal(replay.watch?.oath,"ember");assert.equal(replay.watch?.state,"forming");assert.equal(replay.heroes[0].id,s.id);
 }
 const [lantern,bastion,ember]=outcomes;assert.ok(lantern.awareness>bastion.awareness);assert.ok(lantern.hp<ember.hp&&bastion.hp>ember.hp);assert.ok(ember.damage>lantern.damage);assert.ok(bastion.travel<lantern.travel);
 const rooms=new Rooms();assert.throws(()=>rooms.create("Bad","Knight","watch","invented" as OathId),/oath/);
});

test("guardian phases alternate locked ground strikes and wider sweeps with long punish windows",()=>{
 let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Leader","Knight","watch"),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!;rooms.start(s.room,s.id,s.token);
 w.monsters.forEach(e=>e.hp=0);now+=10;w.advance();w.monsters.forEach(e=>e.hp=0);now+=10;w.advance();const e=w.monsters.find(e=>e.hp>0)!;
 assert.equal(bossPhase(e),1);e.hp=e.maxHp*.5;assert.equal(bossPhase(e),2);now=w.watch!.regroupUntil;w.snapshot(s.id,s.token);p.x=e.x;p.y=e.y+40;e.nextAttack=now;now+=10;w.snapshot(s.id,s.token);
 assert.equal(e.attackKind,"sweep");assert.equal(e.tx,e.x);assert.equal(e.ty,e.y);assert.equal(strikeRadius(e),145);
 const mark={x:e.tx,y:e.ty};p.x+=200;now=e.attackAt;w.snapshot(s.id,s.token);assert.equal(w.watch?.evades,1);assert.equal(e.tx,mark.x);assert.equal(e.ty,mark.y);assert.equal(e.recoveryUntil,now+1400);
 now=e.recoveryUntil+1;p.x=e.x;p.y=e.y+40;e.nextAttack=now;w.snapshot(s.id,s.token);assert.equal(e.attackKind,"strike");assert.equal(strikeRadius(e),110);
 e.hp=e.maxHp*.3;assert.equal(bossPhase(e),3);
});

test("an absent leader passes leadership to a connected company member",()=>{
 let now=100000;const rooms=new Rooms(()=>now),host=rooms.create("Leader","Knight","watch"),ally=rooms.join(host.room,"Friend","Warden");now+=16000;
 rooms.get(host.room).world.snapshot(ally.id,ally.token);assert.equal(rooms.get(host.room).host,ally.id);assert.doesNotThrow(()=>rooms.start(host.room,ally.id,ally.token));
});

test("empty rooms expire, active credentials retain the room, and watch parties cap at five",()=>{
 let now=100000;const rooms=new Rooms(()=>now),a=rooms.create("Quiet","Knight","watch"),b=rooms.create("Active","Knight","watch");
 for(let i=0;i<4;i++)rooms.join(a.room,`Friend ${i}`,"Rogue");assert.throws(()=>rooms.join(a.room,"Sixth","Warden"),/full/);
 now+=19*60*1000;rooms.get(b.room).world.snapshot(b.id,b.token);now+=2*60*1000;
 assert.throws(()=>rooms.get(a.room),/not found/);assert.doesNotThrow(()=>rooms.get(b.room));
});

test("room clock resolves commitment without a new player request, and resume cannot cancel it",()=>{
 let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Leader","Knight","watch"),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!,e=w.monsters[0];rooms.start(s.room,s.id,s.token);
 e.x=p.x;e.y=p.y-40;e.hp=e.maxHp=1000;e.nextAttack=now+10000;
 w.input(s.id,s.token,{sequence:100,x:0,y:0,attack:true,facing:-Math.PI/2});const action=p.action!;now+=50;w.resume(s.id,s.token);assert.equal(p.action,action);assert.equal(p.facing,-Math.PI/2);assert.equal(w.input(s.id,s.token,{sequence:100,x:0,y:0,attack:true}).inputSequence,100);assert.equal(p.action,action);
 now=action.contactAt;rooms.tick();assert.ok(e.hp<1000);const hp=e.hp;rooms.tick();assert.equal(e.hp,hp);
});

test("the courtyard pillars block actual player movement",()=>{
 let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Leader","Knight","watch"),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!;rooms.start(s.room,s.id,s.token);p.x=950;p.y=1400;
 for(let i=0;i<10;i++){w.input(s.id,s.token,{sequence:i+1,x:0,y:-1});now+=100;rooms.tick();}
 assert.ok(p.y>1395);assert.equal(p.x,950);
});

test("disconnect retains a resumable slot; explicit leave frees it and preserves enemy health percentage",()=>{
 let now=100000;const rooms=new Rooms(()=>now),host=rooms.create("Leader","Knight","watch"),allies=Array.from({length:4},(_,i)=>rooms.join(host.room,`Friend ${i}`,"Rogue")),w=rooms.get(host.room).world;
 w.monsters[0].hp=w.monsters[0].maxHp*.6;now+=121000;w.snapshot(host.id,host.token);
 assert.throws(()=>rooms.join(host.room,"Sixth","Warden"),/full/);assert.doesNotThrow(()=>w.resume(allies[0].id,allies[0].token));
 assert.throws(()=>rooms.leave(host.room,allies[0].id,"forged"),/SESSION_EXPIRED/);rooms.leave(host.room,allies[0].id,allies[0].token);
 assert.ok(Math.abs(w.monsters[0].hp/w.monsters[0].maxHp-.6)<1e-9);assert.throws(()=>w.resume(allies[0].id,allies[0].token),/SESSION_EXPIRED/);
 const newMember=rooms.join(host.room,"Replacement","Warden");assert.equal(w.heroes.size,5);assert.ok(w.heroes.get(newMember.id)!.x<=1328);
});
