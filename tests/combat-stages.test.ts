import test from "node:test";
import assert from "node:assert/strict";
import {LivingWorld,type HeroClass} from "../apps/web/app/ashwatch/world.ts";
import {COMBAT,combatPose} from "../apps/web/app/ashwatch/combat.ts";
import {readTarget} from "../apps/web/app/ashwatch/targeting.ts";
function fixture(cls:HeroClass="Knight"){
 let now=100000;const w=new LivingWorld(()=>now),s=w.enter("Tester",cls),p=w.heroes.get(s.id)!;
 p.floor=1;p.x=1200;p.y=1500;p.facing=-Math.PI/2;
 w.monsters=w.monsters.filter(e=>e.floor===1).slice(0,1);const enemy=w.monsters[0];enemy.x=1200;enemy.y=1460;enemy.hp=enemy.maxHp=500;enemy.nextAttack=now+10000;
 return {w,s,p,enemy,advance(ms:number){for(let t=0;t<ms;t+=10){now+=Math.min(10,ms-t);w.advance();}},now:()=>now};
}
test("all five classes resolve once at their authoritative contact, then recover",()=>{
 for(const cls of Object.keys(COMBAT) as HeroClass[]){const f=fixture(cls),{w,s,p,enemy}=f;
  const initial=w.input(s.id,s.token,{sequence:1,x:0,y:0,attack:true});assert.equal(initial.heroes[0].action?.stage,"intent");assert.equal(enemy.hp,500);
  f.advance(50);assert.equal(p.action?.stage,"commitment");assert.equal(enemy.hp,500);const at=p.action!.at,resource=p.mp;
  w.input(s.id,s.token,{sequence:2,x:0,y:0,facing:Math.PI,attack:true});assert.equal(p.action!.at,at);assert.equal(p.facing,-Math.PI/2);assert.equal(p.mp,resource);
  f.advance(COMBAT[cls].contact-50);assert.equal(p.action?.stage,"contact");assert.ok(enemy.hp<500);const hp=enemy.hp;
  f.advance(60);assert.equal(p.action?.stage,"consequence");assert.equal(enemy.hp,hp);f.advance(60);assert.equal(p.action?.stage,"recovery");
  assert.ok(combatPose(p.action,f.now()).strike>=0);f.advance(COMBAT[cls].end);assert.equal(p.action,null);assert.equal(enemy.hp,hp);
 }
});
test("contact rechecks range and a vanished opening cannot produce a phantom hit",()=>{
 const f=fixture();f.w.input(f.s.id,f.s.token,{sequence:1,x:0,y:0,attack:true});f.enemy.y=1100;f.advance(200);assert.equal(f.enemy.hp,500);assert.equal(f.p.action?.hit,false);
});

test("an enemy defeat produces one contact event and remains hidden from a recipient facing away",()=>{
 const f=fixture(),rear=f.w.enter("Rear witness","Knight"),witness=f.w.heroes.get(rear.id)!;
 witness.floor=1;witness.x=1200;witness.y=1700;witness.facing=Math.PI/2;witness.awareness=0;f.enemy.hp=1;
 const prior=f.w.snapshot(f.s.id,f.s.token).effects.filter(e=>e.kind==="defeat").length;
 f.w.input(f.s.id,f.s.token,{sequence:1,x:0,y:0,attack:true});f.advance(179);assert.equal(f.enemy.hp,1);
 f.advance(1);assert.equal(f.enemy.hp,0);const v=f.w.snapshot(f.s.id,f.s.token);assert.equal(v.effects.filter(e=>e.kind==="defeat").length,prior+1);
 f.advance(60);assert.equal(f.w.snapshot(f.s.id,f.s.token).effects.filter(e=>e.kind==="defeat").length,prior+1);
 assert.equal(f.w.snapshot(rear.id,rear.token).effects.filter(e=>e.kind==="defeat").length,0);
});
test("target hints use only the recipient snapshot and never promise a hit",()=>{
 const f=fixture();let view=f.w.snapshot(f.s.id,f.s.token);assert.equal(readTarget(view,view.heroes[0])?.inReach,true);
 f.p.facing=Math.PI/2;view=f.w.snapshot(f.s.id,f.s.token);assert.equal(view.monsters.length,0);assert.equal(readTarget(view,view.heroes[0]),null);
});

test("a legitimately visible distant foe retains a closing hint without being in strike reach",()=>{
 const f=fixture();f.enemy.y=f.p.y-350;const view=f.w.snapshot(f.s.id,f.s.token);assert.equal(view.monsters.length,1);
 const hint=readTarget(view,view.heroes[0]);assert.equal(hint?.id,f.enemy.id);assert.equal(hint?.inReach,false);
 f.p.facing=Math.PI/2;const rear=f.w.snapshot(f.s.id,f.s.token);assert.equal(rear.monsters.length,0);assert.equal(readTarget(rear,rear.heroes[0]),null);
});
test("enemy recovery is stationary and Rogue interrupts a committed strike",()=>{
 const f=fixture("Rogue");f.enemy.attackAt=f.now()+1000;f.enemy.tx=f.p.x;f.enemy.ty=f.p.y;
 f.w.input(f.s.id,f.s.token,{sequence:1,x:0,y:0,skill:true});f.advance(200);assert.equal(f.enemy.attackAt,0);assert.ok(f.enemy.recoveryUntil>f.now());const pos={x:f.enemy.x,y:f.enemy.y};f.advance(400);assert.deepEqual({x:f.enemy.x,y:f.enemy.y},pos);
});
test("Rogue positional success deals more damage than a frontal Ambush",()=>{
 function damage(back:boolean){const f=fixture("Rogue");f.enemy.facing=back?-Math.PI/2:Math.PI/2;f.enemy.attackAt=f.now()+10000;f.w.input(f.s.id,f.s.token,{sequence:1,x:0,y:0,skill:true});f.advance(200);return 500-f.enemy.hp;}
 assert.ok(damage(true)>damage(false));
});
test("walls still block a committed melee strike at contact",()=>{
 const f=fixture();f.p.floor=f.enemy.floor=0;f.p.x=f.enemy.x=685;f.p.y=1590;f.enemy.y=1640;f.p.facing=Math.PI/2;
 f.w.input(f.s.id,f.s.token,{sequence:1,x:0,y:0,attack:true});f.advance(250);assert.equal(f.enemy.hp,500);
});

test("a resolved spell connects to its actual target, and other recipients cannot see a hidden endpoint",()=>{
 const f=fixture("Spellweaver");f.w.input(f.s.id,f.s.token,{sequence:1,x:0,y:0,attack:true});f.advance(240);
 const effect=f.w.effects.find(e=>e.kind==="spell")!;assert.deepEqual(effect.to,{x:f.enemy.x,y:f.enemy.y});assert.equal(effect.style,"Spellweaver");
 const observer=f.w.enter("Observer","Knight"),p=f.w.heroes.get(observer.id)!;p.floor=1;p.x=f.p.x;p.y=f.p.y+75;p.facing=-Math.PI/2;p.awareness=0;
 // The effect source is in sight, but a target behind the observer is not.
 effect.to={x:p.x,y:p.y+200};const view=f.w.snapshot(observer.id,observer.token);
 assert.equal(view.effects.find(e=>e.id===effect.id)?.to,undefined);
 assert.deepEqual(effect.to,{x:p.x,y:p.y+200});
});

test("an equipped skill cannot be changed after the server commits its cast",()=>{
 const f=fixture("Spellweaver");f.w.input(f.s.id,f.s.token,{sequence:1,x:0,y:0,skill:true});
 assert.throws(()=>f.w.develop(f.s.id,f.s.token,"equip","Renew"),/Finish your current action/);assert.equal(f.p.equippedSkill,"Starfall");
 f.advance(1000);f.w.develop(f.s.id,f.s.token,"equip","Renew");assert.equal(f.p.equippedSkill,"Renew");
});
