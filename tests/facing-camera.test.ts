import test from "node:test";
import assert from "node:assert/strict";
import {TravelIntent,FacingIntent} from "../apps/web/app/ashwatch/player-controls.ts";
import {angleDelta,followFacing} from "../apps/web/app/ashwatch/controls.ts";
import {combatPose,beginAction,enemyMotion} from "../apps/web/app/ashwatch/combat.ts";

test("a following camera takes the shortest turn and reaches the same facing across frame rates",()=>{
 for(const fps of [30,60,120]){let h=3.1;for(let i=0;i<fps;i++)h=followFacing(h,-3.1,6,1/fps);assert.ok(h>3.1);assert.ok(Math.abs(angleDelta(h,-3.1))<.001);}
});
test("turning the following camera cannot curve or reverse a held travel direction",()=>{
 for(const [x,y] of [[1,0],[0,1],[-1,-1]]){const intent=new TravelIntent(),initial=intent.movement(x,y,-Math.PI/2);for(let i=0;i<40;i++)assert.deepEqual(intent.movement(x,y,-Math.PI/2+i*.15),initial);intent.movement(0,0,0);assert.notDeepEqual(intent.movement(x,y,0),initial);}
});
test("manual looking steers held movement and a changed direction uses the new view",()=>{
 const intent=new TravelIntent();intent.movement(0,-1,-Math.PI/2);assert.deepEqual(intent.movement(0,-1,0,true),{x:1,y:0});const changed=intent.movement(1,0,0);assert.ok(Math.abs(changed.x)<1e-9);assert.equal(changed.y,1);
});
test("all five class poses remain continuous at authoritative contact",()=>{
 for(const cls of ["Knight","Spellweaver","Ironbound","Rogue","Warden"] as const){const a=beginAction(cls,false,0,100000),before=combatPose(a,a.contactAt-.01),at=combatPose(a,a.contactAt);assert.ok(Math.abs(before.windup-at.windup)<.001);assert.ok(Math.abs(before.strike-at.strike)<.001);assert.equal(at.strike,1);assert.equal(at.windup,0);assert.deepEqual(combatPose(a,a.endsAt),{windup:0,strike:0,recovery:0});}
});
test("natural overhead and sweep motion stay distinct with a continuous contact and settled recovery",()=>{
 const a={...beginAction("Ironbound",false,0,100000),contactAt:101400,recoveryAt:101510,endsAt:102800},over=enemyMotion(a,101250),sweep=enemyMotion({...a,skill:true},101250);assert.ok(over.armX<sweep.armX-1);assert.ok(Math.abs(sweep.bodyY)>.8);const before=enemyMotion(a,101399.99),at=enemyMotion(a,101400);assert.ok(Math.abs(before.armX-at.armX)<.001);const settled=enemyMotion(a,a.endsAt);assert.equal(settled.bodyX,0);assert.equal(settled.bodyY,0);
});
test("enemy weapon preparation reaches a readable stance well before contact",()=>{
 const a={...beginAction("Knight",false,0,100000),contactAt:101050,recoveryAt:101160,endsAt:102450};assert.ok(enemyMotion(a,100400).armX<-2);assert.equal(combatPose(a,101050).strike,1);
});
test("an explicit facing request waits through commitment and remains pending until acknowledged",()=>{
 const facing=new FacingIntent();facing.request(1);assert.equal(facing.sample(true),undefined);assert.equal(facing.sample(false),1);facing.acknowledge(0);assert.equal(facing.sample(false),1);facing.acknowledge(1);assert.equal(facing.sample(false),undefined);
});
test("forward travel honours explicit facing even while the previous camera turn is settling",()=>{
 const facing=new FacingIntent(),travel=new TravelIntent();travel.movement(0,-1,-Math.PI/2);facing.request(0);const requested=facing.sample(false)!;assert.deepEqual(travel.movement(0,-1,requested,true),{x:1,y:0});facing.acknowledge(0);assert.deepEqual(travel.movement(0,-1,-1),{x:1,y:0});
});
test("new facing commands supersede old ones, wrapped angles acknowledge, and menus release intent",()=>{
 const facing=new FacingIntent();facing.request(0);facing.request(-Math.PI+.01);facing.acknowledge(Math.PI+.01);assert.equal(facing.sample(false),undefined);facing.request(1);facing.reset();assert.equal(facing.sample(false),undefined);
});
