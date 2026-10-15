import assert from 'node:assert/strict';
import {Rooms} from '../apps/web/app/ashwatch/rooms.ts';
import {distance,strikeRadius} from '../apps/web/app/ashwatch/world.ts';
import {COMBAT} from '../apps/web/app/ashwatch/combat.ts';
const results=[];
// Authenticated ordinary actions and recipient-filtered snapshots only. No health or enemy edits.
for(const oath of ['lantern','bastion','ember'])for(const classes of [['Knight'],['Spellweaver'],['Ironbound'],['Rogue'],['Warden'],['Knight','Warden'],['Knight','Spellweaver','Warden'],['Knight','Spellweaver','Ironbound','Warden'],['Knight','Spellweaver','Ironbound','Rogue','Warden']]){
 let now=100000;const rooms=new Rooms(()=>now),host=rooms.create('Verifier',classes[0],'watch',oath),sessions=[host,...classes.slice(1).map(c=>rooms.join(host.room,c,c))],room=rooms.get(host.room),sequences=sessions.map(()=>0);rooms.start(host.room,host.id,host.token);
 for(let step=0;step<3000;step++){
  now+=100;
  for(const [index,s] of sessions.entries()){
   const v=room.world.snapshot(s.id,s.token),p=v.heroes.find(p=>p.id===s.id);
   if(v.watch.state!=='active')break;
   if(p.hp<=0)continue;
   const target=v.monsters.toSorted((a,b)=>distance(p,a)-distance(p,b))[0];let x=0,y=0,facing=p.facing;
   if(target){const d=distance(p,target),dx=(target.x-p.x)/Math.max(1,d),dy=(target.y-p.y)/Math.max(1,d),reach=COMBAT[p.heroClass].reach;
    facing=Math.atan2(dy,dx);if(d>reach*.8){x=dx;y=dy;}
    if(target.attackAt>now){
     const awayX=p.x-target.x,awayY=p.y-target.y,away=Math.hypot(awayX,awayY);x=away>1?awayX/away:-dy;y=away>1?awayY/away:dx;if(p.x>1630)x=-Math.abs(x);if(p.x<770)x=Math.abs(x);if(p.y>1610)y=-Math.abs(y);
    }
   }else facing+=.18;
   const support=p.heroClass==='Warden'||p.heroClass==='Ironbound';
   room.world.input(s.id,s.token,{sequence:++sequences[index],x,y,facing,attack:!!target&&distance(p,target)<COMBAT[p.heroClass].reach&&!target.attackAt&&(p.heroClass!=="Warden"||p.mp>=45),skill:support?p.hp<p.maxHp-30:!!target&&distance(p,target)<COMBAT[p.heroClass].reach+10,dodge:(!!target&&target.attackAt>now&&distance(p,target)<strikeRadius(target)+25)&&p.dodgeCooldown===0,warn:!!target&&target.attackAt>v.time&&distance(p,target)<strikeRadius(target)+25});
  }
  const v=room.world.snapshot(host.id,host.token);
  if(v.watch.state!=='active'){
   assert.equal(v.watch.state,'victory',`${classes.join('+')} ended in defeat: ${JSON.stringify(v.watch)}`);
   const replay=rooms.restart(host.room,host.id,host.token);assert.equal(replay.watch.stage,0);assert.equal(replay.watch.state,'forming');assert.equal(replay.heroes.find(p=>p.id===host.id).level,1);
   results.push({oath,classes,seconds:(now-100000)/1000,hitsTaken:v.watch.hitsTaken,warnings:v.watch.warnings,chapters:v.watch.chapters,replay:'passed'});break;
  }
  if(step===2999)throw Error(`${classes.join('+')} timed out`);
 }
}
console.log(JSON.stringify({result:'passed',runs:results},null,2));
