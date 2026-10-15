import test from "node:test";
import assert from "node:assert/strict";
import {Rooms} from "../apps/web/app/ashwatch/rooms.ts";
import {watchLineClear,watchObstacle,watchDetour} from "../apps/web/app/ashwatch/watch-obstacles.ts";
import {readTarget} from "../apps/web/app/ashwatch/targeting.ts";

test("pillar obstruction checks the entire segment and gives a traversable detour",()=>{
 const a={x:950,y:1435},b={x:950,y:1315};assert.equal(watchLineClear(a,b),false);
 const path=watchDetour(a,b);assert.equal(path.length,2);
 for(const [from,to] of [[a,path[0]],[path[0],path[1]],[path[1],b]])assert.equal(watchObstacle(from,to,10),undefined);
 assert.equal(watchLineClear({x:1000,y:1435},{x:1000,y:1315}),true);
});

test("stone stops melee and spell contact while recipient targeting explains the obstruction",()=>{
 for(const cls of ["Knight","Spellweaver"] as const){let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Tester",cls,"watch"),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!,e=w.monsters[0];rooms.start(s.room,s.id,s.token);
 p.x=e.x=950;p.y=1405;e.y=1345;p.facing=-Math.PI/2;e.hp=e.maxHp=1000;e.nextAttack=now+10000;
 const view=w.snapshot(s.id,s.token),hint=readTarget(view,view.heroes.find(h=>h.id===s.id)!);assert.equal(hint?.obstructed,true);assert.equal(hint?.inReach,false);
 w.input(s.id,s.token,{sequence:1,x:0,y:0,attack:true});for(let i=0;i<30;i++){now+=10;w.snapshot(s.id,s.token);}assert.equal(e.hp,1000);assert.equal(p.action?.hit,false);
 }
});

test("a committed enemy strike cannot damage through stone and pursuit goes around it",()=>{
 let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Tester","Knight","watch"),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!,e=w.monsters[0];rooms.start(s.room,s.id,s.token);
 p.x=e.x=950;p.y=1345;e.y=1405;e.attackAt=now+100;e.tx=p.x;e.ty=p.y;const hp=p.hp;now+=100;w.snapshot(s.id,s.token);assert.equal(p.hp,hp);
 for(let i=0;i<140;i++){now+=50;w.snapshot(s.id,s.token);assert.equal(!!watchObstacle(e,e,10),false);}
 assert.equal(watchLineClear(e,p),true);assert.ok(Math.hypot(e.x-p.x,e.y-p.y)<60);
});
