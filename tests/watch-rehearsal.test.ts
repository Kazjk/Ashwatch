import test from "node:test";
import assert from "node:assert/strict";
import {Rooms} from "../apps/web/app/ashwatch/rooms.ts";
import {COMBAT} from "../apps/web/app/ashwatch/combat.ts";
import {visibleFacing} from "../apps/web/app/ashwatch/targeting.ts";

test("all classes can rehearse actual contact timing with visible target damage and no resource cost",()=>{
 for(const cls of Object.keys(COMBAT) as (keyof typeof COMBAT)[]){let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Rehearsal",cls,"watch"),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!,e=w.monsters[0];p.y=e.y+40;p.facing=-Math.PI/2;
 const mp=p.mp,stamina=p.stamina,hp=e.hp;w.input(s.id,s.token,{sequence:1,x:0,y:0,skill:true,warn:true});assert.equal(p.action?.resolved,false);
 now+=COMBAT[cls].skillContact;const v=w.snapshot(s.id,s.token);assert.equal(p.action?.resolved,true);if(cls==="Warden"||cls==="Ironbound")assert.equal(e.hp,hp);else assert.ok(e.hp<hp);assert.equal(p.mp,mp);assert.equal(p.stamina,stamina);assert.equal(v.watch?.warnings,0);assert.ok(v.effects.some(e=>e.kind==="practice"));
 const start=rooms.start(s.room,s.id,s.token);assert.equal(p.action,null);assert.equal(p.x,1200);assert.equal(p.y,1500);assert.equal(p.mp,p.maxMp);assert.equal(p.stamina,p.maxStamina);assert.equal(e.hp,e.maxHp);assert.equal(start.effects.length,0);assert.equal(start.warnings.length,0);
 }
});

test("a company member can move and dash in rehearsal while enemies stay still",()=>{
 let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Rehearsal","Rogue","watch"),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!,e=w.monsters[0];const y=p.y,enemy={x:e.x,y:e.y,hp:e.hp};
 w.input(s.id,s.token,{sequence:1,x:0,y:-1});now+=200;w.snapshot(s.id,s.token);assert.ok(p.y<y);const moved=p.y;
 w.input(s.id,s.token,{sequence:2,x:0,y:-1,dodge:true,attack:true});now+=100;w.snapshot(s.id,s.token);assert.ok(p.y<moved-25);assert.equal(p.action,null);assert.equal(p.stamina,p.maxStamina);assert.deepEqual({x:e.x,y:e.y,hp:e.hp},enemy);
});

test("facing help cannot find an enemy omitted from the recipient snapshot",()=>{
 let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Scout","Knight","watch"),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!;
 let v=w.snapshot(s.id,s.token);assert.equal(visibleFacing(v,v.heroes[0]),-Math.PI/2);
 p.awareness=0;p.facing=Math.PI/2;v=w.snapshot(s.id,s.token);assert.equal(v.monsters.length,0);assert.equal(visibleFacing(v,v.heroes[0]),null);
 now+=1;
});

test("a dash owns its movement window and held attack cannot start another commitment inside it",()=>{
 let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Runner","Knight","watch"),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!;rooms.start(s.room,s.id,s.token);
 w.input(s.id,s.token,{sequence:1,x:0,y:-1,dodge:true,attack:true,skill:true});assert.equal(p.action,null);assert.equal(p.stamina,p.maxStamina-25);assert.equal(p.mp,p.maxMp);
 now+=200;w.input(s.id,s.token,{sequence:2,x:0,y:-1,attack:true});assert.equal(p.action,null);
 now+=200;const v=w.input(s.id,s.token,{sequence:3,x:0,y:0,attack:true});assert.equal(v.heroes.find(h=>h.id===s.id)?.action?.skill,false);
});
