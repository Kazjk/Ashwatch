import test from "node:test";
import assert from "node:assert/strict";
import {Rooms} from "../apps/web/app/ashwatch/rooms.ts";
import {COMBAT,OPENING_DAMAGE} from "../apps/web/app/ashwatch/combat.ts";

function strike(cls:keyof typeof COMBAT,mode:"ready"|"recovering"|"closing"|"preparing",skill=false){
 let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Timing",cls,"watch","bastion"),w=rooms.get(s.room).world;
 rooms.start(s.room,s.id,s.token);const p=w.heroes.get(s.id)!,e=w.monsters[0],delay=skill?COMBAT[cls].skillContact:COMBAT[cls].contact;
 e.x=p.x;e.y=p.y-60;e.hp=e.maxHp=10000;e.nextAttack=now+10000;e.facing=Math.PI/2;
 if(mode!=="ready")e.recoveryUntil=now+(mode==="closing"?delay:2000);
 if(mode==="preparing")e.attackAt=now+4000;
 const before=e.hp,intent=w.input(s.id,s.token,{sequence:1,x:0,y:0,facing:-Math.PI/2,attack:!skill,skill});
 assert.equal(intent.heroes.find(h=>h.id===s.id)!.action?.opening,undefined);assert.equal(e.hp,before);
 now+=delay;const view=w.snapshot(s.id,s.token),action=view.heroes.find(h=>h.id===s.id)!.action;
 const lost=before-e.hp;w.snapshot(s.id,s.token);assert.equal(e.hp,before-lost);
 return {lost,action,view,w,p,e};
}

test("all five classes earn the recovery reward only when authoritative contact lands in an opening",()=>{
 for(const cls of Object.keys(COMBAT) as (keyof typeof COMBAT)[]){
  const normal=strike(cls,"ready"),rewarded=strike(cls,"recovering"),closing=strike(cls,"closing"),preparing=strike(cls,"preparing");
  assert.ok(Math.abs(rewarded.lost-normal.lost*OPENING_DAMAGE)<1e-8,cls);
  assert.equal(rewarded.action?.opening,true);assert.equal(rewarded.view.watch?.openings,1);
  assert.equal(closing.lost,normal.lost);assert.equal(preparing.lost,normal.lost);
  assert.ok(!normal.action?.opening&&!closing.action?.opening&&!preparing.action?.opening);
 }
});

test("offensive skills receive the same contact reward without support healing receiving it",()=>{
 for(const cls of ["Knight","Spellweaver","Rogue"] as const){
  const normal=strike(cls,"ready",true),opening=strike(cls,"recovering",true);
  assert.ok(Math.abs(opening.lost-normal.lost*OPENING_DAMAGE)<1e-8);assert.equal(opening.action?.opening,true);
 }
 for(const cls of ["Warden","Ironbound"] as const){const result=strike(cls,"recovering",true);assert.equal(result.lost,0);assert.ok(!result.action?.opening);assert.equal(result.view.watch?.openings,0);}
});

test("a multi-target cleave rewards each recovering target independently and counts one action",()=>{
 let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Cleave","Knight","watch"),w=rooms.get(s.room).world;rooms.start(s.room,s.id,s.token);
 const p=w.heroes.get(s.id)!,e=w.monsters[0];Object.assign(e,{x:p.x,y:p.y-70,hp:10000,maxHp:10000,recoveryUntil:now+2000,nextAttack:now+10000});
 const other={...e,id:"second",x:p.x+20,recoveryUntil:0};w.monsters.push(other);
 w.input(s.id,s.token,{sequence:1,x:0,y:0,facing:-Math.PI/2,skill:true});now+=COMBAT.Knight.skillContact;w.snapshot(s.id,s.token);
 assert.ok(Math.abs((10000-e.hp)-(10000-other.hp)*OPENING_DAMAGE)<1e-8);assert.equal(w.watch?.openings,1);
});

test("a teammate's confirmed opening cannot reveal the recovery of an unseen enemy",()=>{
 let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Striker","Knight","watch"),observer=rooms.join(s.room,"Watcher","Warden"),w=rooms.get(s.room).world;rooms.start(s.room,s.id,s.token);
 const p=w.heroes.get(s.id)!,q=w.heroes.get(observer.id)!,e=w.monsters[0];Object.assign(p,{x:1200,y:1500,facing:-Math.PI/2});Object.assign(q,{x:1200,y:1470,facing:Math.PI/2,awareness:0});Object.assign(e,{x:1200,y:1440,hp:1000,maxHp:1000,recoveryUntil:now+2000,nextAttack:now+10000});
 w.input(s.id,s.token,{sequence:1,x:0,y:0,attack:true});now+=COMBAT.Knight.contact;
 assert.equal(w.snapshot(s.id,s.token).heroes.find(h=>h.id===s.id)!.action?.opening,true);
 const other=w.snapshot(observer.id,observer.token);assert.equal(other.monsters.length,0);assert.equal(other.heroes.find(h=>h.id===s.id)!.action?.opening,undefined);
 assert.ok(!other.effects.some(effect=>effect.to?.x===e.x&&effect.to?.y===e.y));
});
