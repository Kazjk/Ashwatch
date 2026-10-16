import test from "node:test";
import assert from "node:assert/strict";
import {Rooms} from "../apps/web/app/ashwatch/rooms.ts";
import {COMBAT} from "../apps/web/app/ashwatch/combat.ts";
import {FrontierState,validateFrontierCommand,type Material,type FrontierCommand} from "../apps/web/app/ashwatch/frontier.ts";
import {terrainHeight,riverCenter,inRiver,FOREST} from "../apps/web/app/ashwatch/frontier-land.ts";
import {BUILDINGS} from "../apps/web/app/ashwatch/world.ts";

function fixture(){
 let now=100000,sequence=0;const rooms=new Rooms(()=>now),s=rooms.create("Frontier check","Knight","frontier"),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!;w.monsters=[];
 const advance=(ms:number)=>{now+=ms;return w.snapshot(s.id,s.token);};
 const input=(extra:object={})=>w.input(s.id,s.token,{sequence:++sequence,x:0,y:0,...extra});
 const command=(frontier:FrontierCommand)=>{advance(400);return input({frontier});};
 const farm=(kind:Material,want:number)=>{
  while(w.snapshot(s.id,s.token).frontier!.supplies[kind]<want){const n=w.frontier!.nodes.find(n=>n.kind===kind&&n.remaining>0)!;assert.ok(n);Object.assign(p,{x:n.x,y:n.y+50,facing:-Math.PI/2});input({attack:true});advance(COMBAT.Knight.contact);advance(850);}
 };
 return {rooms,s,w,p,advance,input,command,farm,now:()=>now};
}

test("frontier harvesting resolves at server contact, costs stamina once and ignores a duplicate sequence",()=>{
 const f=fixture(),n=f.w.frontier!.nodes.find(n=>n.kind==="timber")!;Object.assign(f.p,{x:n.x,y:n.y+50,facing:-Math.PI/2});
 const v=f.input({attack:true});assert.equal(v.frontier!.supplies.timber,0);assert.equal(f.advance(COMBAT.Knight.contact-1).frontier!.supplies.timber,0);
 assert.equal(f.advance(1).frontier!.supplies.timber,5);assert.equal(n.remaining,25);
 const duplicate=f.w.input(f.s.id,f.s.token,{sequence:1,x:0,y:0,attack:true});assert.equal(duplicate.frontier!.supplies.timber,5);assert.equal(n.remaining,25);
 assert.equal(f.p.gold,0);assert.ok(f.p.weapon);assert.equal(f.p.kills,0);
});

test("gather, craft a hatchet, raise a hearth and build a floor is a real paid loop",()=>{
 const f=fixture();f.farm("timber",30);f.farm("stone",30);
 let v=f.command({kind:"craft",recipe:"hatchet"});assert.equal(v.frontier!.hatchet,true);assert.equal(v.frontier!.supplies.timber,22);assert.equal(v.frontier!.supplies.stone,25);
 Object.assign(f.p,{x:925,y:1580,facing:Math.PI/2});
 v=f.command({kind:"build",piece:"hearth",x:950,y:1650,rotation:0});assert.match(v.frontier!.message,/raised/);assert.equal(f.w.frontier!.structures.length,1);assert.equal(v.frontier!.supplies.timber,12);
 v=f.command({kind:"build",piece:"foundation",x:950,y:1700,rotation:0});assert.match(v.frontier!.message,/raised/);assert.equal(f.w.frontier!.structures.length,2);assert.equal(v.frontier!.supplies.timber,4);assert.equal(v.frontier!.supplies.stone,13);
 const before={...v.frontier!.supplies};v=f.command({kind:"build",piece:"wall",x:1000,y:1700,rotation:0});assert.deepEqual(v.frontier!.supplies,before);assert.equal(f.w.frontier!.structures.length,2);
});

test("resources and other satchels stay private when outside legitimate perception",()=>{
 const f=fixture(),ally=f.rooms.join(f.s.room,"Other player","Warden"),other=f.w.heroes.get(ally.id)!;f.farm("timber",10);
 Object.assign(f.p,{x:1200,y:2000,facing:Math.PI/2,awareness:0});const v=f.w.snapshot(f.s.id,f.s.token);
 assert.equal(v.frontier!.nodes.some(n=>n.kind==="timber"&&n.x===955),false);assert.equal(v.heroes.find(h=>h.id===other.id),undefined);
 assert.ok(!JSON.stringify(v).includes(ally.token));assert.deepEqual(f.w.snapshot(ally.id,ally.token).frontier!.supplies,{timber:0,stone:0,herb:0,aether:0});
 v.frontier!.supplies.timber=199;assert.equal(f.w.snapshot(f.s.id,f.s.token).frontier!.supplies.timber,10);
});

test("malformed, distant and occupied building requests cannot create free structures or consume materials",()=>{
 const f=fixture();f.farm("timber",30);f.farm("stone",20);const before=f.w.snapshot(f.s.id,f.s.token).frontier!.supplies;
 for(const command of [{kind:"build",piece:"castle",x:0,y:0,rotation:0},{kind:"build",piece:"wall",x:NaN,y:0,rotation:0},{kind:"craft",recipe:"gold"}])assert.throws(()=>validateFrontierCommand(command));
 const seq=f.p.seq;assert.throws(()=>f.input({frontier:{kind:"build",piece:"wall",x:Infinity,y:0,rotation:0}}),/INVALID_FRONTIER_COMMAND/);assert.equal(f.p.seq,seq);
 const v=f.command({kind:"build",piece:"hearth",x:2200,y:2200,rotation:0});assert.equal(f.w.frontier!.structures.length,0);assert.deepEqual(v.frontier!.supplies,before);
});

test("closed walls and doors obstruct movement and sight; another company cannot operate a door",()=>{
 const state=new FrontierState(100000),hero={id:"owner",party:"party",x:1450,y:1500,facing:0,floor:0,hp:100,maxHp:100,mp:100,maxMp:100};
 state.structures.push({id:"door",kind:"door",owner:hero.id,party:hero.party,x:1500,y:1500,rotation:0,hp:240,open:false});
 assert.equal(state.blocked(1500,1500),true);assert.equal(state.lineClear(hero,{x:1550,y:1500}),false);
 assert.throws(()=>state.command({...hero,id:"stranger",party:"other"},{kind:"use",id:"door"},101000,()=>true,()=>false,()=>false),/another company/);
 state.command(hero,{kind:"use",id:"door"},101000,()=>true,()=>false,()=>false);assert.equal(state.blocked(1500,1500),false);assert.equal(state.lineClear(hero,{x:1550,y:1500}),true);
 assert.throws(()=>state.command(hero,{kind:"use",id:"door"},102000,()=>true,()=>false,()=>true),/Step clear/);assert.equal(state.structures[0].open,true);
});

test("a friendly hearth restores warmth at night and a bedroll changes the real respawn point",()=>{
 const state=new FrontierState(100000),hero={id:"owner",party:"party",x:1600,y:1800,facing:0,floor:0,hp:70,maxHp:100,mp:50,maxMp:100};
 state.tick(hero,20,330000);const cold=state.view(hero,330000,()=>true).warmth;assert.ok(cold<85);
 state.structures.push({id:"fire",kind:"hearth",owner:hero.id,party:hero.party,x:1600,y:1800,rotation:0,hp:160,open:false},{id:"bed",kind:"bedroll",owner:hero.id,party:hero.party,x:1700,y:1800,rotation:0,hp:160,open:false});
 state.tick(hero,10,340000);assert.ok(state.view(hero,340000,()=>true).warmth>cold);assert.ok(hero.hp>70);state.respawn(hero);assert.deepEqual({x:hero.x,y:hero.y},{x:1700,y:1835});
});

test("frontier checkpoint preserves paid structures, material privacy and a pending harvest exactly once",()=>{
 const f=fixture();f.farm("timber",20);f.farm("stone",15);Object.assign(f.p,{x:925,y:1580,facing:Math.PI/2});f.command({kind:"build",piece:"hearth",x:950,y:1650,rotation:0});
 const node=f.w.frontier!.nodes.find(n=>n.kind==="timber"&&n.remaining>0)!;Object.assign(f.p,{x:node.x,y:node.y+50,facing:-Math.PI/2});f.input({attack:true});
 const saved=f.rooms.checkpoint();let restoredNow=f.now()+5000;const restored=new Rooms(()=>restoredNow);restored.restore(saved);const room=restored.get(f.s.room),view=room.world.resume(f.s.id,f.s.token);
 assert.equal(room.world.frontier!.structures.length,1);assert.equal(view.frontier!.supplies.timber,10);assert.equal(view.frontier!.supplies.stone,7);assert.ok(!JSON.stringify(view).includes(f.s.token));
 assert.equal(room.world.heroes.get(f.s.id)!.input.x,0);restoredNow+=COMBAT.Knight.contact;assert.equal(room.world.snapshot(f.s.id,f.s.token).frontier!.supplies.timber,15);assert.equal(room.world.snapshot(f.s.id,f.s.token).frontier!.supplies.timber,15);
});

test("terrain remains flat under existing settlements and has actual hills and a river outside them",()=>{
 for(const [x,y] of BUILDINGS)assert.ok(Math.abs(terrainHeight(x,y))<.0001);
 const samples=Array.from({length:50},(_,i)=>terrainHeight(1400+i*15,1800));assert.ok(Math.max(...samples)-Math.min(...samples)>1);
 assert.equal(inRiver(riverCenter(2000),2000),true);assert.equal(inRiver(900,1500),false);
});

test("a wall itself is admitted while its hidden enemy and harvest remain concealed",()=>{
 const f=fixture();Object.assign(f.p,{x:920,y:1800,facing:0,awareness:90});
 f.w.frontier!.structures.push({id:"wall",kind:"wall",owner:f.p.id,party:f.p.party,x:980,y:1800,rotation:0,hp:240,open:false});
 f.w.frontier!.nodes.push({id:"hidden-stone",kind:"stone",x:1020,y:1800,remaining:30,resetAt:0});
 const v=f.w.snapshot(f.s.id,f.s.token);assert.ok(v.frontier!.structures.some(s=>s.id==="wall"));assert.ok(!v.frontier!.nodes.some(n=>n.id==="hidden-stone"));
 const seq=f.p.seq;const input={sequence:seq+1,x:1,y:0};f.w.input(f.s.id,f.s.token,input);f.advance(350);assert.ok(f.p.x<970);
});

test("roof placement requires a real paid floor, dry ground and cannot be duplicated",()=>{
 const f=fixture();f.farm("timber",30);f.farm("stone",30);Object.assign(f.p,{x:925,y:1580,facing:Math.PI/2});
 const before=f.w.snapshot(f.s.id,f.s.token).frontier!.supplies;let v=f.command({kind:"build",piece:"roof",x:950,y:1700,rotation:0});assert.deepEqual(v.frontier!.supplies,before);assert.match(v.frontier!.message,/floor/);
 f.command({kind:"build",piece:"foundation",x:950,y:1700,rotation:0});v=f.command({kind:"build",piece:"roof",x:950,y:1700,rotation:0});assert.equal(f.w.frontier!.structures.length,2);assert.equal(v.frontier!.supplies.timber,12);assert.ok(v.frontier!.milestones.includes("roof"));
 const paid={...v.frontier!.supplies};v=f.command({kind:"build",piece:"roof",x:950,y:1700,rotation:1});assert.deepEqual(v.frontier!.supplies,paid);assert.equal(f.w.frontier!.structures.length,2);
});

test("settlement walls conceal frontier resources rather than exposing them through a house",()=>{
 const f=fixture();Object.assign(f.p,{x:1040,y:1250,facing:Math.PI/2,awareness:90});f.w.frontier!.nodes.push({id:"behind-house",kind:"stone",x:1040,y:1480,remaining:30,resetAt:0});
 assert.equal(f.w.snapshot(f.s.id,f.s.token).frontier!.nodes.some(n=>n.id==="behind-house"),false);
 Object.assign(f.p,{x:1200,y:1480,facing:Math.PI});assert.equal(f.w.snapshot(f.s.id,f.s.token).frontier!.nodes.some(n=>n.id==="behind-house"),true);
});

test("the river is a bounded wading channel rather than a deep invisible walking trench",()=>{
 for(let y=100;y<2300;y+=100){const floor=terrainHeight(riverCenter(y),y);assert.ok(floor>=-1.45);assert.ok(-.8-floor<.9);}
});

test("frontier cover calls acknowledge real help and cannot be answered by an ineffective Renew",()=>{
 const f=fixture(),ally=f.rooms.join(f.s.room,"Frontier medic","Warden"),medic=f.w.heroes.get(ally.id)!;Object.assign(f.p,{x:1000,y:1500,facing:Math.PI});Object.assign(medic,{x:950,y:1500,facing:0});
 f.input({warn:true});f.w.input(ally.id,ally.token,{sequence:1,x:0,y:0,skill:true});f.advance(COMBAT.Warden.skillContact);assert.equal(f.w.snapshot(f.s.id,f.s.token).ownCall?.answeredBy,undefined);
 f.advance(6600);f.p.hp-=30;f.input({warn:true});f.w.input(ally.id,ally.token,{sequence:2,x:0,y:0,skill:true});f.advance(COMBAT.Warden.skillContact);const v=f.w.snapshot(f.s.id,f.s.token);assert.equal(f.p.hp,f.p.maxHp);assert.equal(v.ownCall?.answeredBy,"Frontier medic");assert.ok(v.effects.some(e=>e.kind==="cover"));
});

test("a complete paid shelter accepts joined corners, a roof above walls and a bedroll through its open door",()=>{
 const f=fixture();f.farm("timber",80);f.farm("stone",30);f.farm("herb",4);const before=f.w.snapshot(f.s.id,f.s.token).frontier!.supplies;Object.assign(f.p,{x:950,y:1640,facing:Math.PI/2});
 const parts=[{piece:"foundation",x:950,y:1750,rotation:0},{piece:"wall",x:950,y:1725,rotation:1},{piece:"wall",x:925,y:1750,rotation:0},{piece:"wall",x:975,y:1750,rotation:0},{piece:"door",x:950,y:1775,rotation:1},{piece:"roof",x:950,y:1750,rotation:0}] as const;
 for(const part of parts){if(part.piece==="wall"||part.piece==="door"){if(part.rotation%2)Object.assign(f.p,{x:part.x,y:part.y+(part.y<1750?-90:90)});else Object.assign(f.p,{x:part.x+(part.x<950?-90:90),y:part.y});}f.p.facing=Math.atan2(part.y-f.p.y,part.x-f.p.x);const v=f.command({kind:"build",...part});assert.match(v.frontier!.message,/raised/,`${part.piece} at ${part.x},${part.y}`);}
 let v=f.w.snapshot(f.s.id,f.s.token);assert.ok(v.frontier!.structures.some(s=>s.kind==="roof"),"Known company architecture remains complete behind its own wall.");
 f.w.frontier!.nodes.push({id:"inside-cabin",kind:"aether",x:950,y:1750,remaining:4,resetAt:0});assert.equal(f.w.snapshot(f.s.id,f.s.token).frontier!.nodes.some(n=>n.id==="inside-cabin"),false);f.w.frontier!.nodes.pop();
 Object.assign(f.p,{x:950,y:1850,facing:-Math.PI/2});const door=f.w.frontier!.structures.find(s=>s.kind==="door")!;f.command({kind:"use",id:door.id});assert.equal(door.open,true);
 v=f.command({kind:"build",piece:"bedroll",x:950,y:1750,rotation:0});assert.match(v.frontier!.message,/raised/);assert.equal(f.w.frontier!.structures.length,7);assert.equal(v.frontier!.supplies.timber,before.timber-49);assert.equal(v.frontier!.supplies.stone,before.stone-16);assert.equal(v.frontier!.supplies.herb,before.herb-4);
 const materials={...v.frontier!.supplies};v=f.command({kind:"build",piece:"hearth",x:950,y:1750,rotation:0});assert.deepEqual(v.frontier!.supplies,materials);assert.match(v.frontier!.message,/occupied/);
});

for(const cls of ["Knight","Spellweaver","Ironbound","Rogue","Warden"] as const)test(`${cls} harvests at both accepted contacts without dropping the next strike and stays in the frontier`,()=>{
 let now=100000;const rooms=new Rooms(()=>now),session=rooms.create("Class harvest",cls,"frontier"),w=rooms.get(session.room).world,p=w.heroes.get(session.id)!;w.monsters=[];const node=w.frontier!.nodes.find(n=>n.kind==="timber")!;Object.assign(p,{x:node.x,y:node.y+50,facing:-Math.PI/2});w.input(p.id,p.token,{sequence:1,x:0,y:0,attack:true});now+=COMBAT[cls].contact-1;assert.equal(w.snapshot(p.id,p.token).frontier!.supplies.timber,0);now++;assert.equal(w.snapshot(p.id,p.token).frontier!.supplies.timber,5);now=100550;w.snapshot(p.id,p.token);w.input(p.id,p.token,{sequence:2,x:0,y:0,attack:true});now+=COMBAT[cls].contact;assert.equal(w.snapshot(p.id,p.token).frontier!.supplies.timber,10);now+=2000;Object.assign(p,{x:1440,y:850});w.snapshot(p.id,p.token);assert.equal(p.floor,0);
});

test("both door controls let a player close from inside a small cabin but never onto an occupied doorway",()=>{
 for(const rotation of [0,1])for(const interact of [false,true]){
  const f=fixture(),door={id:"cabin-door",kind:"door" as const,owner:f.p.id,party:f.p.party,x:950,y:1750,rotation,hp:240,open:true};f.w.frontier!.structures.push(door);
  const clear=()=>Object.assign(f.p,{x:rotation?950:925,y:rotation?1725:1750,facing:rotation?Math.PI/2:0});
  const use=()=>{f.advance(400);return f.input(interact?{interact:true}:{frontier:{kind:"use",id:door.id}});};
  clear();use();assert.equal(door.open,false,"Standing inside the floor is clear of the actual door.");use();assert.equal(door.open,true);
  Object.assign(f.p,{x:rotation?950:947,y:rotation?1747:1750});const v=use();assert.equal(door.open,true);assert.match(v.frontier!.message,/Step clear/);
  clear();use();assert.equal(door.open,false);
 }
});


test("new paid floors reject overhanging tree crowns without spending the satchel",()=>{
 const f=fixture();f.farm("timber",20);f.farm("stone",10);const tree=FOREST[0],x=Math.round(tree.x/50)*50,y=Math.round(tree.y/50)*50;Object.assign(f.p,{x:x-80,y,facing:0});const before=f.w.snapshot(f.s.id,f.s.token).frontier!.supplies;const v=f.command({kind:"build",piece:"foundation",x,y,rotation:0});assert.match(v.frontier!.message,/overhanging branches/);assert.deepEqual(v.frontier!.supplies,before);assert.equal(f.w.frontier!.structures.length,0);
});
