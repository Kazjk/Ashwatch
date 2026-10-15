import test from "node:test";
import assert from "node:assert/strict";
import {Rooms} from "../apps/web/app/ashwatch/rooms.ts";

test("Knight parries a faced attack during anticipation, but the same strike behind deals damage",()=>{
 for(const rear of [false,true]){
  let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Knight","Knight","watch"),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!,e=w.monsters[0];rooms.start(s.room,s.id,s.token);
  e.x=p.x;e.y=p.y+(rear?30:-30);e.tx=p.x;e.ty=p.y;e.attackAt=now+120;
  w.input(s.id,s.token,{sequence:1,x:0,y:0,facing:-Math.PI/2,skill:true});const hp=p.hp;now+=120;const v=w.snapshot(s.id,s.token);
  if(rear){assert.ok(p.hp<hp);assert.equal(v.watch?.parries,0);}else{assert.equal(p.hp,hp);assert.equal(v.watch?.parries,1);assert.ok(v.effects.some(e=>e.kind==="parry"));}
 }
});

test("Starfall applies frost only at contact to a visible target; frost actually slows movement",()=>{
 let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Mage","Spellweaver","watch"),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!,e=w.monsters[0];rooms.start(s.room,s.id,s.token);
 e.x=p.x;e.y=p.y-160;e.hp=e.maxHp=1000;e.nextAttack=now+10000;
 w.input(s.id,s.token,{sequence:1,x:0,y:0,facing:-Math.PI/2,skill:true});assert.equal(e.slowUntil,undefined);now+=440;w.snapshot(s.id,s.token);assert.equal(e.slowUntil,now+2500);
 const y=e.y;now+=100;w.snapshot(s.id,s.token);const slowed=e.y-y;assert.ok(slowed>0&&slowed<3);e.slowUntil=0;const normalY=e.y;now+=100;w.snapshot(s.id,s.token);assert.ok(e.y-normalY>slowed*2);
});

test("Renew cleanses the caster and faced party members, leaves rear allies webbed, and reports actual cleanses",()=>{
 let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Warden","Warden","watch"),a=rooms.join(s.room,"Front","Rogue"),b=rooms.join(s.room,"Rear","Knight"),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!,front=w.heroes.get(a.id)!,rear=w.heroes.get(b.id)!;rooms.start(s.room,s.id,s.token);
 front.x=rear.x=p.x;front.y=p.y-60;rear.y=p.y+40;p.facing=-Math.PI/2;p.webUntil=front.webUntil=rear.webUntil=now+2000;
 w.input(s.id,s.token,{sequence:1,x:0,y:0,facing:p.facing,skill:true});now+=330;const v=w.snapshot(s.id,s.token);
 assert.equal(p.webUntil,0);assert.equal(front.webUntil,0);assert.ok(rear.webUntil>now);assert.equal(v.watch?.cleanses,2);assert.equal(v.watch?.healing,0);assert.equal(p.action?.hit,true);assert.equal(v.effects.filter(e=>e.kind==="cleanse").length,2);
});

test("sentinel contact webs a damaged hero, while a successful parry prevents both damage and web",()=>{
 for(const parry of [false,true]){
  let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Knight","Knight","watch"),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!,e=w.monsters[0];rooms.start(s.room,s.id,s.token);e.kind="sentinel";e.x=p.x;e.y=p.y-30;e.tx=p.x;e.ty=p.y;e.attackAt=now+120;
  w.input(s.id,s.token,{sequence:1,x:0,y:0,facing:-Math.PI/2,skill:parry});now+=120;w.snapshot(s.id,s.token);assert.equal((p.webUntil??0)>now,!parry);
 }
});

test("Bulwark's ward begins at authoritative contact rather than during anticipation",()=>{
 let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Tank","Ironbound","watch"),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!,e=w.monsters[0];rooms.start(s.room,s.id,s.token);e.x=p.x;e.y=p.y-30;e.tx=p.x;e.ty=p.y;e.attackAt=now+120;
 w.input(s.id,s.token,{sequence:1,x:0,y:0,facing:-Math.PI/2,skill:true});const hp=p.hp;now+=120;w.snapshot(s.id,s.token);const beforeContact=hp-p.hp;assert.ok(beforeContact>0);assert.equal(p.action?.resolved,false);
 now=100380;w.snapshot(s.id,s.token);assert.equal(p.action?.resolved,true);const wardHp=p.hp;e.attackAt=now+120;e.tx=p.x;e.ty=p.y;now+=120;w.snapshot(s.id,s.token);assert.ok(wardHp-p.hp<beforeContact*.4);
});

test("Bulwark restores modest self health at contact while Renew remains the stronger party heal",()=>{
 for(const cls of ["Ironbound","Warden"] as const){
  let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Support",cls,"watch"),a=rooms.join(s.room,"Ally","Knight"),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!,ally=w.heroes.get(a.id)!;
  rooms.start(s.room,s.id,s.token);for(const e of w.monsters)e.nextAttack=now+10000;p.hp-=100;ally.hp-=100;ally.x=p.x;ally.y=p.y-50;
  const before=p.hp,other=ally.hp;w.input(s.id,s.token,{sequence:1,x:0,y:0,facing:-Math.PI/2,skill:true});assert.equal(p.hp,before);
  now+=cls==="Ironbound"?380:330;w.snapshot(s.id,s.token);assert.equal(p.hp-before,cls==="Ironbound"?26:71);assert.equal(ally.hp-other,cls==="Ironbound"?0:71);
  const hp=p.hp;now+=50;w.input(s.id,s.token,{sequence:2,x:0,y:0,skill:true});assert.equal(p.hp,hp);assert.equal(w.watch!.healing,cls==="Ironbound"?26:142);
 }
});
