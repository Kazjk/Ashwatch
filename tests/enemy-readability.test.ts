import test from "node:test";
import assert from "node:assert/strict";
import {Rooms} from "../apps/web/app/ashwatch/rooms.ts";
import {LivingWorld,canSee} from "../apps/web/app/ashwatch/world.ts";
import {readTarget} from "../apps/web/app/ashwatch/targeting.ts";

test("enemy warnings and future ground targets stay absent at every Awareness",()=>{
 for(const awareness of [0,20,40,45,100]){const rooms=new Rooms(()=>100000),s=rooms.create("Reader","Knight","watch"),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!,e=w.monsters[0];rooms.start(s.room,s.id,s.token);p.awareness=awareness;p.x=1200;p.y=1500;p.facing=-Math.PI/2;e.x=1200;e.y=1460;e.tx=p.x;e.ty=p.y;e.attackAt=101000;e.recoveryUntil=102000;
 const v=w.snapshot(s.id,s.token),m=v.monsters[0],t=readTarget(v,v.heroes[0])!;assert.ok(m);assert.equal(m.attackAt,e.attackAt);assert.equal(m.facing,e.facing);
 for(const key of ["tx","ty","homeX","homeY","nextAttack","attackCount","attackPhase","telegraph"])assert.ok(!(key in m));for(const key of ["danger","combatCues"])assert.ok(!(key in v));for(const key of ["committing","recovering","attackKind","phase"])assert.ok(!(key in t));
 }
});
test("removing signs retains recipient-relative cover calls and hidden-state protection",()=>{
 const rooms=new Rooms(()=>100000),s=rooms.create("Reader","Knight","watch"),ally=rooms.join(s.room,"Caller","Warden"),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!,q=w.heroes.get(ally.id)!,e=w.monsters[0];rooms.start(s.room,s.id,s.token);p.awareness=0;p.facing=Math.PI/2;q.x=p.x-100;e.y=p.y-100;
 w.input(ally.id,ally.token,{sequence:1,x:0,y:0,warn:true});const v=w.snapshot(s.id,s.token);assert.equal(v.monsters.length,0);assert.equal(v.warnings.length,1);assert.equal(v.warnings[0].relative,"right");assert.ok(!JSON.stringify(v).includes(ally.token));
});
test("removing warnings never changes authoritative strike damage or timing",()=>{
 const outcomes=[];for(const awareness of [20,100]){let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Reader","Knight","watch"),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!,e=w.monsters[0];rooms.start(s.room,s.id,s.token);p.awareness=awareness;e.x=p.x;e.y=p.y-40;e.tx=p.x;e.ty=p.y;e.attackAt=now+1000;const hp=p.hp;now+=999;w.snapshot(s.id,s.token);assert.equal(p.hp,hp);now++;w.snapshot(s.id,s.token);outcomes.push(hp-p.hp);}assert.ok(outcomes[0]>0);assert.equal(outcomes[0],outcomes[1]);
});
test("Awareness still expands legitimate perception and earned training survives checkpoints",()=>{
 const low={x:0,y:0,facing:0,awareness:0};assert.equal(canSee(low,{x:-30,y:0}),false);assert.equal(canSee({...low,awareness:50},{x:-30,y:0}),true);
 const rooms=new Rooms(()=>100000),s=rooms.create("Learner","Knight","world"),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!;p.awareness=36;p.abilityPoints=1;w.develop(s.id,s.token,"upgrade","awareness");const restored=new Rooms(()=>100000);restored.restore(rooms.checkpoint());assert.equal(restored.get(s.room).world.snapshot(s.id,s.token).heroes[0].awareness,40);
 const world=new LivingWorld(()=>100000),d=world.enter("Dragon observer","Knight"),hero=world.heroes.get(d.id)!;hero.awareness=100;hero.x=world.dragon.x+40;hero.y=world.dragon.y;hero.facing=Math.PI;world.dragon.attackAt=101000;const v=world.snapshot(d.id,d.token);assert.ok(v.dragon);assert.ok(!("tx" in v.dragon!));assert.ok(!("telegraph" in v.dragon!));
});
