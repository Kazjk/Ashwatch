import assert from 'node:assert/strict';
import {Rooms} from '../apps/web/app/ashwatch/rooms.ts';
import {GATE,distance} from '../apps/web/app/ashwatch/world.ts';
import {routeTo} from '../apps/web/app/ashwatch/navigation.ts';
// Accelerated simulated time, ordinary entry and authenticated inputs only.
// The policy uses filtered views; it does not inspect or mutate hidden world state.
let now=100000,sequence=0,entered=false,search=0;
const rooms=new Rooms(()=>now),session=rooms.create('Campaign verifier','Spellweaver');
const room=rooms.get(session.room),floors=[];
room.world.develop(session.id,session.token,"equip","Renew");
room.world.develop(session.id,session.token,"buy","focus");
const patrol=[{x:850,y:800},{x:1550,y:800},{x:1550,y:1400},{x:850,y:1400}];
const direction=(dx,dy)=>{const n=Math.hypot(dx,dy)||1;return {x:dx/n,y:dy/n};};
for(let step=0;step<60000;step++){
 now+=100;
 const v=room.world.snapshot(session.id,session.token),me=v.heroes.find(p=>p.id===session.id);
 if(me.deaths||me.hp<=0)throw Error(`Defeat on depth ${me.floor} after ${(now-100000)/1000}s`);
 while(me.abilityPoints>0){const key=me.training.intelligence<10?"intelligence":me.training.strength<14?"strength":"mp";const updated=room.world.develop(session.id,session.token,"upgrade",key);Object.assign(me,updated.heroes.find(p=>p.id===session.id));}
 if(me.floor)entered=true;
 if(entered&&!me.floor){
  assert.ok(v.cleared.includes(10));
  const ending={result:'victory',simulatedSeconds:(now-100000)/1000,level:me.level,hp:Math.round(me.hp),deaths:me.deaths,floors};
  const replay=rooms.restart(session.room,session.id,session.token);
  assert.equal(replay.cleared.length,0);assert.equal(replay.heroes[0].level,1);assert.equal(room.run,2);
  console.log(JSON.stringify({...ending,replay:'passed: same credentials and room, level one, uncleared floors'},null,2));process.exit(0);
 }
 let move={x:0,y:0},facing=me.facing,attack=false,skill=false,dodge=false;
 if(!entered){const waypoint=routeTo(me,GATE).find(p=>distance(me,p)>20)??GATE;move=direction(waypoint.x-me.x,waypoint.y-me.y);facing=Math.atan2(move.y,move.x);}
 else if(v.cleared.includes(me.floor)){
  if(!floors.some(f=>f.depth===me.floor))floors.push({depth:me.floor,seconds:(now-100000)/1000,hp:Math.round(me.hp),level:me.level});
  move=direction(1200-me.x,650-me.y);facing=Math.atan2(move.y,move.x);
 }else{
  const enemies=v.monsters.toSorted((a,b)=>distance(me,a)-distance(me,b)),enemy=enemies[0];
  if(enemy){
   const d=distance(me,enemy),toward=direction(enemy.x-me.x,enemy.y-me.y);
   facing=Math.atan2(toward.y,toward.x);
   // Maintain ranged spacing, circling away from arena edges.
   const orbit=me.x<780||me.x>1620?-1:1;
   move=d<135?{x:-toward.x,y:-toward.y}:d>165?toward:{x:-toward.y*orbit,y:toward.x*orbit};
   attack=d<178&&me.mp>=42;
  }else{const point=patrol[search%4];if(distance(me,point)<40)search++;move=direction(point.x-me.x,point.y-me.y);facing+=.18;}
  let rx=0,ry=0;
  for(const e of enemies)if(e.attackAt>now){const r=e.kind==='boss'?135:85,d=distance(me,e);if(d<r){const a=direction(me.x-e.x,me.y-e.y);rx+=a.x*(r-d+1);ry+=a.y*(r-d+1);}}
  if(rx||ry)move=direction(rx,ry);
  // Turn while retreating; attacks retain the facing requirement.
  skill=me.hp<me.maxHp-80&&me.mp>=32&&me.skillCooldown===0;
  dodge=enemies.some(e=>e.attackAt>now&&distance(me,e)<160)&&me.stamina>=25&&me.dodgeCooldown===0;
  // Do not retreat into the return portal or keep pressing into side walls.
  if(me.x<710&&move.x<0||me.x>1690&&move.x>0)move={x:0,y:me.y>1100?-1:1};
  if(me.y>1530&&move.y>0)move={x:me.x>1200?-1:1,y:-.3};
  if(me.y<580&&move.y<0)move={x:me.x>1200?-1:1,y:.3};
 }
 room.world.input(session.id,session.token,{sequence:++sequence,...move,facing,attack,skill,dodge});
}
throw Error('Campaign timed out after 6000 simulated seconds');
