import test from "node:test";

import assert from "node:assert/strict";

import {LivingWorld,TOWNS,safe,VILLAGE,NEST,GATE,canSee,sight,type HeroClass} from "../apps/web/app/ashwatch/world.ts";

function fixture(){let now=100000;const world=new LivingWorld(()=>now);const enter=(name="Knight",cls:HeroClass="Knight")=>world.enter(name,cls);const advance=(ms:number)=>{for(let i=0;i<ms;i+=50){now+=Math.min(50,ms-i);world.advance();}};return {world,enter,advance,now:()=>now};}
test("dungeon movement and evasion leave clearance from the visible side walls",()=>{
 const f=fixture(),s=f.enter(),p=f.world.heroes.get(s.id)!;p.floor=1;p.x=690;p.y=1100;
 f.world.input(s.id,s.token,{sequence:1,x:-1,y:0,facing:Math.PI,dodge:true});f.advance(300);
 assert.ok(p.x>=675);assert.ok(p.x*.04-.32>26.6);
 p.x=1710;f.world.input(s.id,s.token,{sequence:2,x:1,y:0});f.advance(300);
 assert.ok(p.x<=1725);assert.ok(p.x*.04+.32<69.4);
});
test("unseen strikes disclose no warning, hidden enemy or target coordinate",()=>{
 const f=fixture(),s=f.enter(),p=f.world.heroes.get(s.id)!;
 p.x=100;p.y=100;p.facing=0;p.awareness=40;const e=f.world.monsters[0];e.x=30;e.y=100;e.tx=100;e.ty=100;e.attackAt=f.now()+1050;
 let view=f.world.snapshot(s.id,s.token);assert.ok(!("danger" in view));assert.ok(!view.monsters.some(m=>m.id===e.id));assert.ok(!JSON.stringify(view).includes('"homeX":'+e.homeX));
 p.facing=Math.PI;view=f.world.snapshot(s.id,s.token);assert.ok(!("danger" in view));assert.ok(view.monsters.some(m=>m.id===e.id));
 p.y=170;assert.ok(!("danger" in f.world.snapshot(s.id,s.token)));
 p.x=VILLAGE.x;p.y=VILLAGE.y;e.tx=p.x;e.ty=p.y;assert.ok(!("danger" in f.world.snapshot(s.id,s.token)));
});
test("hidden dragon and other floors stay omitted without oracle warnings",()=>{
 const f=fixture(),s=f.enter(),p=f.world.heroes.get(s.id)!;p.x=100;p.y=100;p.facing=0;p.awareness=40;
 const d=f.world.dragon;d.x=30;d.y=100;d.tx=p.x;d.ty=p.y;d.state="enraged";d.attackAt=f.now()+2300;
 assert.ok(!("danger" in f.world.snapshot(s.id,s.token)));p.floor=1;assert.ok(!("danger" in f.world.snapshot(s.id,s.token)));p.floor=0;p.hp=0;assert.ok(!("danger" in f.world.snapshot(s.id,s.token)));
});
test("malformed combat flags fail before mutating resources or input sequence",()=>{
 const f=fixture(),s=f.enter(),p=f.world.heroes.get(s.id)!;
 for(const key of ["attack","skill","dodge","interact"]){assert.throws(()=>f.world.input(s.id,s.token,{sequence:1,x:0,y:0,[key]:"true"} as never),/INVALID_INPUT/);}
 assert.equal(p.stamina,100);assert.equal(p.mp,100);f.world.input(s.id,s.token,{sequence:1,x:0,y:0,attack:true});assert.equal(p.stamina,90);
});
test("nearby party members share hunt credit, but strangers, distant allies and dungeon kills do not",()=>{
 const f=fixture(),a=f.enter(),b=f.enter("Ally"),c=f.enter("Stranger"),d=f.enter("Distant");const p=f.world.heroes.get(a.id)!,q=f.world.heroes.get(b.id)!,r=f.world.heroes.get(c.id)!,far=f.world.heroes.get(d.id)!;
 for(const hero of [p,q,r,far]){hero.mission=1;hero.x=100;hero.y=100;hero.facing=0;}p.party=q.party=far.party="WATCH";far.x=700;r.x=200;
 const enemy=f.world.monsters[0];enemy.x=125;enemy.y=100;enemy.hp=1;
 f.world.input(a.id,a.token,{sequence:1,x:0,y:0,attack:true});assert.equal(enemy.hp,1);f.advance(300);assert.equal(enemy.hp,0);assert.equal(p.missionKills,1);assert.equal(q.missionKills,1);assert.equal(r.missionKills,0);assert.equal(far.missionKills,0);
 p.floor=1;p.x=1000;p.y=1100;const dungeon=f.world.monsters.find(m=>m.floor===1)!;dungeon.x=1020;dungeon.y=1100;dungeon.hp=1;f.advance(600);
 f.world.input(a.id,a.token,{sequence:2,x:0,y:0,attack:true});f.advance(300);assert.equal(dungeon.hp,0);assert.equal(p.missionKills,1);
});
test("the hero capsule and return points stay outside the visible roof footprint",()=>{
 const f=fixture(),s=f.enter(),p=f.world.heroes.get(s.id)!;p.x=1100;p.y=1765;
 f.world.input(s.id,s.token,{sequence:1,x:0,y:-1});f.advance(300);assert.ok(p.y>=1737.95);
});
test("Renew restores the caster and visible nearby party, without healing rivals or rear allies",()=>{
 const f=fixture(),s=f.enter("Support","Warden"),a=f.enter("Ally"),b=f.enter("Rear"),c=f.enter("Rival");const p=f.world.heroes.get(s.id)!,ally=f.world.heroes.get(a.id)!,rear=f.world.heroes.get(b.id)!,rival=f.world.heroes.get(c.id)!;
 for(const hero of [p,ally,rear,rival]){hero.x=100;hero.y=100;hero.hp=50;hero.party="WATCH";}p.facing=0;p.awareness=100;ally.x=130;rear.x=80;rival.x=140;rival.party="OTHER";
 f.world.input(s.id,s.token,{sequence:1,x:0,y:0,skill:true});assert.equal(p.hp,50);assert.equal(p.mp,98);f.advance(350);assert.equal(p.hp,121);assert.equal(ally.hp,121);assert.equal(rear.hp,50);assert.equal(rival.hp,50);assert.ok(p.mp>=98&&p.mp<100);
});
test("awareness expands the forward cone and nearby rear perception without revealing distant rear threats",()=>{const p={x:0,y:0,facing:0,awareness:0};assert.ok(!canSee(p,{x:-1,y:0}));assert.ok(!canSee(p,{x:0,y:20}));assert.ok(canSee({...p,awareness:50},{x:-50,y:0}));assert.ok(canSee({...p,awareness:100},{x:-110,y:0}));assert.ok(!canSee({...p,awareness:100},{x:-130,y:0}));assert.ok(!canSee({...p,awareness:100},{x:700,y:0}));assert.ok(sight(100).halfAngle>sight(0).halfAngle);});
test("a rear rival can be perceived at high awareness but still cannot be attacked until faced",()=>{const f=fixture(),s=f.enter(),r=f.enter("Behind"),p=f.world.heroes.get(s.id)!,q=f.world.heroes.get(r.id)!;p.x=400;p.y=400;p.facing=0;p.awareness=100;q.x=380;q.y=400;assert.ok(f.world.snapshot(s.id,s.token).heroes.some(x=>x.id===r.id));f.world.input(s.id,s.token,{sequence:1,x:0,y:0,attack:true});assert.equal(q.hp,q.maxHp);q.x=270;assert.ok(!f.world.snapshot(s.id,s.token).heroes.some(x=>x.id===r.id));p.facing=Math.PI;assert.ok(f.world.snapshot(s.id,s.token).heroes.some(x=>x.id===r.id));});
test("MP and stamina are real resources with costs, exhaustion gates, and bounded regeneration",()=>{const f=fixture(),a=f.enter(),b=f.enter("Mage","Spellweaver"),p=f.world.heroes.get(a.id)!,q=f.world.heroes.get(b.id)!;f.world.input(a.id,a.token,{sequence:1,x:0,y:0,attack:true});assert.equal(p.stamina,90);f.world.input(b.id,b.token,{sequence:1,x:0,y:0,attack:true});assert.equal(q.mp,141);p.stamina=0;q.mp=0;f.advance(600);p.stamina=0;q.mp=0;const at=p.attackAt,spellAt=q.attackAt;f.world.input(a.id,a.token,{sequence:2,x:0,y:0,skill:true,dodge:true});f.world.input(b.id,b.token,{sequence:2,x:0,y:0,skill:true});assert.equal(p.attackAt,at);assert.equal(q.attackAt,spellAt);assert.equal(p.dodgeUntil,0);f.advance(40000);assert.equal(p.stamina,p.maxStamina);assert.equal(q.mp,q.maxMp);const v=f.world.snapshot(a.id,a.token);assert.equal(v.heroes.find(x=>x.id===a.id)!.stamina,100);});

test("players enter a shared running world without a lobby; private credentials never appear in snapshots",()=>{const f=fixture(),s=f.enter(),s2=f.enter("Second");f.world.heroes.get(s.id)!.facing=0;const v=f.world.snapshot(s.id,s.token);assert.equal(v.population,2);assert.equal(v.heroes.length,2);assert.ok(v.floorRemaining>0);assert.ok(!JSON.stringify(v).includes(s.token));assert.throws(()=>f.world.snapshot(s.id,s2.token),/SESSION_EXPIRED/);});

test("movement is time based, diagonal speed is normalized, stale sequences cannot overwrite movement",()=>{const f=fixture(),s=f.enter(),p=f.world.heroes.get(s.id)!;const start={x:p.x,y:p.y};for(let i=0;i<100;i++)f.world.input(s.id,s.token,{sequence:i,x:1,y:1});assert.equal(p.x,start.x);f.advance(200);assert.ok(Math.abs(Math.hypot(p.x-start.x,p.y-start.y)-31)<.01);assert.equal(f.world.input(s.id,s.token,{sequence:99,x:0,y:0}).inputSequence,99);assert.ok(Math.abs(p.input.x-Math.SQRT1_2)<1e-12);f.advance(1000);assert.equal(p.moving,false);});

test("PvP works in the wilderness, is blocked in the village, and awards a kill once",()=>{const f=fixture(),a=f.enter(),b=f.enter("Rival"),p=f.world.heroes.get(a.id)!,q=f.world.heroes.get(b.id)!;f.world.input(a.id,a.token,{sequence:1,x:0,y:0,attack:true});assert.equal(q.hp,q.maxHp);p.x=100;p.y=100;p.facing=0;q.x=130;q.y=100;q.hp=10;f.advance(600);p.facing=0;f.world.input(a.id,a.token,{sequence:2,x:0,y:0,attack:true});f.advance(250);assert.equal(q.hp,0);assert.equal(p.kills,1);assert.equal(q.deaths,1);f.advance(12000);assert.equal(q.floor,0);assert.equal(q.hp,q.maxHp);assert.ok(safe(q));});

test("all ten floors grow stronger, each has a guardian and only clears after its last enemy",()=>{const f=fixture(),s=f.enter(),p=f.world.heroes.get(s.id)!;let hp=0;for(let floor=1;floor<=10;floor++){const enemies=f.world.monsters.filter(m=>m.floor===floor);assert.ok(enemies.length===4+floor);const boss=enemies.find(m=>m.kind==="boss")!;assert.ok(boss.maxHp>hp);hp=boss.maxHp;p.floor=floor;p.x=1200;p.y=1100;p.level=20;p.facing=0;for(const m of enemies){m.hp=0;m.attackAt=0;}boss.hp=1;boss.x=1220;boss.y=1100;assert.ok(!f.world.cleared.has(floor));f.advance(600);f.world.input(s.id,s.token,{sequence:floor,x:0,y:0,attack:true});f.advance(250);assert.ok(f.world.cleared.has(floor));}});

test("walking into dungeon portal transitions automatically; locked descent cannot be crossed",()=>{const f=fixture(),s=f.enter(),p=f.world.heroes.get(s.id)!;f.advance(1100);p.x=GATE.x;p.y=GATE.y;f.advance(50);assert.equal(p.floor,1);p.x=1200;p.y=650;f.advance(3000);assert.equal(p.floor,1);f.world.cleared.add(1);f.advance(50);assert.equal(p.floor,2);});

test("exploration raises awareness and caps it",()=>{const f=fixture(),s=f.enter(),p=f.world.heroes.get(s.id)!;for(let i=0;i<120;i++){p.x=100+i%20*100;p.y=100+Math.floor(i/20)*100;f.advance(50);}assert.equal(p.awareness,100);});

test("dragon sleeps until struck, threatens village and returns to sleep after ten player kills",()=>{const f=fixture(),s=f.enter(),p=f.world.heroes.get(s.id)!;f.advance(2000);assert.equal(f.world.dragon.state,"sleeping");p.x=NEST.x+90;p.y=NEST.y;p.facing=Math.PI;f.world.input(s.id,s.token,{sequence:1,x:0,y:0,attack:true});f.advance(250);assert.equal(f.world.dragon.state,"enraged");assert.ok(f.world.dragon.hp<f.world.dragon.maxHp);for(let i=0;i<10;i++){const victim=f.enter(`Victim${i}`),q=f.world.heroes.get(victim.id)!;q.x=VILLAGE.x;q.y=VILLAGE.y;q.hp=1;q.dodgeUntil=0;const d=f.world.dragon;d.tx=q.x;d.ty=q.y;d.attackAt=f.now()+1;f.advance(50);assert.equal(q.hp,0);assert.equal(d.kills,i+1);}assert.ok(f.world.villageDamage>0);f.advance(100);assert.equal(f.world.dragon.state,"sleeping");assert.equal(f.world.dragon.kills,0);assert.equal(f.world.dragon.hp,f.world.dragon.maxHp);});

test("defeating the dragon rewards nearby players and persists until its respawn",()=>{const f=fixture(),s=f.enter(),p=f.world.heroes.get(s.id)!;p.x=NEST.x+90;p.y=NEST.y;p.facing=Math.PI;f.world.dragon.hp=1;f.world.input(s.id,s.token,{sequence:1,x:0,y:0,attack:true});f.advance(250);assert.equal(f.world.dragon.state,"defeated");assert.ok(p.level>1);f.advance(1000);assert.equal(f.world.dragon.state,"defeated");});


test("stationary evade travels and cooldown prevents repeated rolls",()=>{const f=fixture(),s=f.enter(),p=f.world.heroes.get(s.id)!;p.x=1300;p.y=1900;p.facing=0;f.world.input(s.id,s.token,{sequence:1,x:0,y:0,dodge:true});f.advance(300);assert.ok(p.x>1400);const at=p.dodgeAt;f.world.input(s.id,s.token,{sequence:2,x:0,y:0,dodge:true});assert.equal(p.dodgeAt,at);});
test("party map reveals allies only, and arena allows PvP within town boundaries",()=>{const f=fixture(),a=f.enter(),b=f.enter("Ally"),c=f.enter("Stranger"),p=f.world.heroes.get(a.id)!,q=f.world.heroes.get(b.id)!,r=f.world.heroes.get(c.id)!;p.party=q.party="TEAM";q.x=1800;q.y=2200;r.x=2000;r.y=2000;const v=f.world.snapshot(a.id,a.token);assert.deepEqual(v.partyMembers.map(m=>m.id),[b.id]);p.x=TOWNS[1].arena.x;p.y=TOWNS[1].arena.y;p.facing=0;r.x=p.x+25;r.y=p.y;r.hp=10;assert.equal(safe(p),false);f.world.input(a.id,a.token,{sequence:1,x:0,y:0,attack:true});f.advance(250);assert.equal(r.hp,0);});
test("guild rewards cannot be repeatedly claimed and lodge profile survives reload",()=>{const f=fixture(),s=f.enter(),p=f.world.heroes.get(s.id)!;p.x=TOWNS[0].guild.x;p.y=TOWNS[0].guild.y+70;f.world.service(p,{sequence:0,x:0,y:0,service:"mission"});assert.equal(p.mission,1);p.missionKills=3;f.world.service(p,{sequence:0,x:0,y:0,service:"claim"});assert.equal(p.mission,2);f.world.cleared.add(1);f.world.service(p,{sequence:0,x:0,y:0,service:"claim"});const xp=p.xp,level=p.level;f.world.service(p,{sequence:0,x:0,y:0,service:"claim"});assert.equal(p.xp,xp);assert.equal(p.level,level);p.x=TOWNS[1].inn.x;p.y=TOWNS[1].inn.y+70;f.world.service(p,{sequence:0,x:0,y:0,service:"rest"});const restored=new LivingWorld(f.now);restored.loadProfiles(JSON.parse(JSON.stringify(f.world.saveProfiles())));const v=restored.resume(s.id,s.token),hero=v.heroes.find(h=>h.id===s.id)!;assert.equal(hero.lodge,"highcrown");assert.equal(hero.x,TOWNS[1].inn.x);assert.equal(hero.level,level);assert.ok(safe(hero));});
test("basic attacks alternate while special carries a distinct attack style",()=>{const f=fixture(),s=f.enter(),p=f.world.heroes.get(s.id)!;f.world.input(s.id,s.token,{sequence:1,x:0,y:0,attack:true});const first=p.attackStyle;f.advance(600);f.world.input(s.id,s.token,{sequence:2,x:0,y:0,attack:true});assert.notEqual(p.attackStyle,first);f.advance(550);f.world.input(s.id,s.token,{sequence:3,x:0,y:0,skill:true});assert.equal(p.attackStyle,2);f.advance(400);assert.ok(f.world.effects.some(e=>e.kind==="crescent"));});

test("melee cannot strike a monster through a building even in town",()=>{const f=fixture(),a=f.enter(),p=f.world.heroes.get(a.id)!,q=f.world.monsters[0];p.floor=q.floor=0;p.x=685;p.y=1590;p.facing=Math.PI/2;q.x=685;q.y=1640;const hp=q.hp;f.world.input(a.id,a.token,{sequence:1,x:0,y:0,attack:true});assert.equal(q.hp,hp);});


