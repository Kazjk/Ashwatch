import test from "node:test";
import assert from "node:assert/strict";
import {Rooms} from "../apps/web/app/ashwatch/rooms.ts";
import {COMBAT} from "../apps/web/app/ashwatch/combat.ts";
import {readTarget} from "../apps/web/app/ashwatch/targeting.ts";
import {enemyHealth} from "../apps/web/app/ashwatch/enemy-health.ts";

function fixture(cls:keyof typeof COMBAT="Rogue",live=false){
 let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Damage check",cls,"watch"),w=rooms.get(s.room).world;if(live)rooms.start(s.room,s.id,s.token);
 const p=w.heroes.get(s.id)!,e=w.monsters[0];Object.assign(p,{x:1200,y:1500,facing:-Math.PI/2});Object.assign(e,{x:1200,y:1440,homeX:1200,homeY:1440,nextAttack:now+10000,facing:Math.PI/2});
 return {rooms,s,w,p,e,now:()=>now,advance:(ms:number)=>{now+=ms;return w.snapshot(s.id,s.token);}};
}

test("every class's practice hit lowers real health at contact and reveals the same bar as live combat",()=>{
 for(const cls of Object.keys(COMBAT) as (keyof typeof COMBAT)[])for(const skill of [false,true]){
  const practice=fixture(cls),live=fixture(cls,true),support=skill&&(cls==="Warden"||cls==="Ironbound");
  const damage=[];
  for(const f of [practice,live]){
   const before=f.e.hp,resources={mp:f.p.mp,stamina:f.p.stamina,hp:f.p.hp};
   assert.equal(readTarget(f.w.snapshot(f.s.id,f.s.token),f.p)!.health.visible,false);
   f.w.input(f.s.id,f.s.token,{sequence:1,x:0,y:0,attack:!skill,skill});
   const delay=skill?COMBAT[cls].skillContact:COMBAT[cls].contact;f.advance(delay-1);assert.equal(f.e.hp,before);
   const after=f.advance(1),target=readTarget(after,f.p)!;damage.push(before-f.e.hp);
   assert.equal(target.health.visible,!support);assert.equal(target.health.remaining,Math.ceil(f.e.hp));
   if(f===practice){assert.deepEqual({mp:f.p.mp,stamina:f.p.stamina,hp:f.p.hp},resources);assert.equal(after.watch?.state,"forming");assert.equal(after.watch?.chapters.length,0);}
  }
  assert.equal(damage[0],damage[1],`${cls} ${skill?"skill":"basic"}`);
 }
});

test("practice defeats reset the target without advancing the run, and live start restores a clean encounter",()=>{
 const f=fixture();f.e.hp=5;f.w.input(f.s.id,f.s.token,{sequence:1,x:0,y:0,attack:true});let v=f.advance(COMBAT.Rogue.contact);
 assert.equal(f.e.hp,0);assert.equal(v.monsters.length,0);assert.ok(v.effects.some(e=>e.kind==="hit"&&e.value===5));
 assert.equal(f.p.kills,0);assert.equal(f.p.xp,0);assert.equal(v.watch?.stage,0);assert.equal(v.watch?.state,"forming");
 f.advance(1499);assert.equal(f.e.hp,0);v=f.advance(1);assert.equal(f.e.hp,f.e.maxHp);assert.equal(v.monsters.length,1);assert.equal(enemyHealth(f.e.hp,f.e.maxHp).visible,false);
 f.e.hp=0;f.e.deadAt=f.now();f.e.slowUntil=f.now()+5000;
 v=f.rooms.start(f.s.room,f.s.id,f.s.token);assert.equal(f.e.hp,f.e.maxHp);assert.equal(f.e.deadAt,0);assert.equal(f.e.slowUntil,undefined);assert.equal(f.e.attackAt,0);assert.equal(v.watch?.state,"active");assert.equal(v.effects.length,0);
});

test("misses cannot reveal health, and a damaged target is still removed when perception is lost",()=>{
 const f=fixture();f.p.facing=Math.PI/2;f.w.input(f.s.id,f.s.token,{sequence:1,x:0,y:0,attack:true});let v=f.advance(COMBAT.Rogue.contact);
 assert.equal(f.e.hp,f.e.maxHp);assert.equal(v.monsters.length,0);assert.equal(readTarget(v,f.p),null);
 f.advance(500);f.w.input(f.s.id,f.s.token,{sequence:2,x:0,y:0,facing:-Math.PI/2,attack:true});v=f.advance(COMBAT.Rogue.contact);assert.ok(readTarget(v,f.p)!.health.visible);
 f.advance(500);v=f.w.input(f.s.id,f.s.token,{sequence:3,x:0,y:0,facing:Math.PI/2});assert.equal(v.monsters.length,0);assert.equal(readTarget(v,f.p),null);
});

test("repeated snapshots cannot deal practice damage again",()=>{
 const f=fixture("Knight");f.w.input(f.s.id,f.s.token,{sequence:1,x:0,y:0,attack:true});f.advance(COMBAT.Knight.contact);const hp=f.e.hp;
 for(let i=0;i<8;i++)f.w.snapshot(f.s.id,f.s.token);assert.equal(f.e.hp,hp);assert.equal(f.w.effects.filter(e=>e.kind==="hit"&&e.value).length,1);
});
