import test from "node:test";
import assert from "node:assert/strict";
import {Rooms} from "../apps/web/app/ashwatch/rooms.ts";
import {COMBAT} from "../apps/web/app/ashwatch/combat.ts";
import {CLASSES} from "../apps/web/app/ashwatch/progression.ts";

test("watch builds cannot acquire campaign upgrades or another class role",()=>{
 for(const cls of Object.keys(COMBAT) as (keyof typeof COMBAT)[]){
  const rooms=new Rooms(()=>100000),s=rooms.create("Fixed build",cls,"watch"),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!;
  p.abilityPoints=10;p.gold=1000;const hp=p.maxHp;
  for(const [kind,key] of [["upgrade","strength"],["buy","potion"],["wear","focus"],["equip","Survey"],["equip",cls==="Warden"?"Starfall":"Renew"]])assert.throws(()=>w.develop(s.id,s.token,kind,key),/fixed class builds/);
  assert.equal(p.maxHp,hp);assert.equal(p.abilityPoints,10);assert.equal(p.gold,1000);assert.equal(p.equippedSkill,CLASSES[cls].skill);
  w.develop(s.id,s.token,"equip",CLASSES[cls].skill);
 }
});

test("a watch never damages another company member even if party metadata differs",()=>{
 let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Cleave","Knight","watch"),a=rooms.join(s.room,"Ally","Warden"),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!,q=w.heroes.get(a.id)!;
 rooms.start(s.room,s.id,s.token);p.x=1200;p.y=1500;p.facing=0;q.x=1240;q.y=1500;q.party="different";const hp=q.hp;
 w.input(s.id,s.token,{sequence:1,x:0,y:0,attack:true});now+=COMBAT.Knight.contact;w.snapshot(s.id,s.token);assert.equal(p.action?.resolved,true);assert.equal(q.hp,hp);
});
