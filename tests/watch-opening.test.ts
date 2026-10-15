import test from "node:test";
import assert from "node:assert/strict";
import {Rooms} from "../apps/web/app/ashwatch/rooms.ts";
import {CLASSES} from "../apps/web/app/ashwatch/progression.ts";
import {COMBAT} from "../apps/web/app/ashwatch/combat.ts";
import {distance} from "../apps/web/app/ashwatch/world.ts";

test("a normal basic-attack approach meets a living scout's windup for every class",()=>{
 for(const cls of Object.keys(CLASSES) as (keyof typeof CLASSES)[]){let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Learner",cls,"watch"),w=rooms.get(s.room).world;rooms.start(s.room,s.id,s.token);let seen=false,seq=0;
  for(let i=0;i<120;i++){now+=50;const v=w.snapshot(s.id,s.token),p=v.heroes.find(p=>p.id===s.id)!,e=v.monsters[0];if(v.watch!.stage!==0)break;if(e?.attackAt&&e.hp>0){seen=true;break;}if(!e)continue;const d=distance(p,e),x=(e.x-p.x)/Math.max(1,d),y=(e.y-p.y)/Math.max(1,d);w.input(s.id,s.token,{sequence:++seq,x:d>COMBAT[cls].reach*.8?x:0,y:d>COMBAT[cls].reach*.8?y:0,facing:Math.atan2(y,x),attack:d<COMBAT[cls].reach});}
  assert.ok(seen,`${cls} must encounter an actual preparation before clearing the opener`);
 }
});
