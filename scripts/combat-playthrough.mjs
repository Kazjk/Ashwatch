import {LivingWorld,distance} from '../apps/web/app/ashwatch/world.ts';
let now=100000;const world=new LivingWorld(()=>now);
const session=world.enter('Combat verifier','Knight');
const player=world.heroes.get(session.id);
// Encounter fixture starts at depth one. All subsequent damage, movement, resources,
// deaths, rewards and portals are resolved through real simulation inputs.
player.floor=1;player.x=1200;player.y=1480;player.facing=-Math.PI/2;player.portalCooldown=now+2000;
const supportSession=process.argv.includes('--party')?world.enter('Support verifier','Spellweaver'):null;
const support=supportSession?world.heroes.get(supportSession.id):null;
if(support){support.floor=1;support.x=1240;support.y=1480;support.portalCooldown=now+2000;support.party=player.party='VERIFY';}
let sequence=0,retreatUntil=0,search=0;const floors=[];const patrol=[{x:850,y:800},{x:1550,y:800},{x:1550,y:1450},{x:850,y:1450}];
for(let step=0;step<40000;step++){
 now+=100;const view=world.snapshot(session.id,session.token),me=view.heroes.find(p=>p.id===session.id);
 if(me.hp<=0||me.floor===0){console.log(JSON.stringify({result:'defeat',simulatedSeconds:(now-100000)/1000,floors,deaths:me.deaths,level:me.level},null,2));process.exit(1);}
 const target=view.monsters.toSorted((a,b)=>distance(me,a)-distance(me,b))[0];
 let x=0,y=0,facing=me.facing,attack=false,skill=false,dodge=false;
 if(target&&target.attackAt>now&&distance(me,target)<160){retreatUntil=now+900;dodge=me.dodgeCooldown===0;}
 if(world.cleared.has(me.floor)){
  if(!floors.some(f=>f.depth===me.floor))floors.push({depth:me.floor,simulatedSeconds:(now-100000)/1000,hp:Math.round(me.hp),level:me.level});
  if(me.floor===10){console.log(JSON.stringify({result:'victory',floors,deaths:me.deaths},null,2));process.exit(0);}
  const dx=1200-me.x,dy=650-me.y,len=Math.hypot(dx,dy);x=dx/len;y=dy/len;facing=Math.atan2(dy,dx);
 }else if(target){
  const dx=target.x-me.x,dy=target.y-me.y,len=Math.hypot(dx,dy);facing=Math.atan2(dy,dx);
  if(now<retreatUntil){x=-dx/len;y=-dy/len;}
  else if(len>55){x=dx/len;y=dy/len;}
  attack=len<72;skill=len<86&&me.skillCooldown===0;
 }else {const point=patrol[search%patrol.length],dx=point.x-me.x,dy=point.y-me.y,len=Math.hypot(dx,dy);if(len<40)search++;else {x=dx/len;y=dy/len;}facing+=.35;}
 world.input(session.id,session.token,{sequence:++sequence,x,y,facing,attack,skill,dodge});
 if(support&&supportSession&&support.hp>0){
  const sv=world.snapshot(supportSession.id,supportSession.token),q=sv.heroes.find(p=>p.id===supportSession.id);
  const ally=sv.heroes.find(p=>p.id===session.id);const enemy=sv.monsters.toSorted((a,b)=>distance(q,a)-distance(q,b))[0];
  const destination=q.floor===player.floor?{x:player.x+35,y:player.y}:{x:1200,y:650};
  const dx=destination.x-q.x,dy=destination.y-q.y,len=Math.hypot(dx,dy);
  let sx=len>65?dx/len:0,sy=len>65?dy/len:0;
  if(enemy&&enemy.attackAt>now&&distance(q,enemy)<160){const away=Math.max(1,distance(q,enemy));sx=(q.x-enemy.x)/away;sy=(q.y-enemy.y)/away;}
  const heal=q.hp<q.maxHp-50||ally&&ally.hp<ally.maxHp-50;
  const facing=heal&&ally?Math.atan2(ally.y-q.y,ally.x-q.x):enemy?Math.atan2(enemy.y-q.y,enemy.x-q.x):q.facing;
  world.input(supportSession.id,supportSession.token,{sequence,x:sx,y:sy,facing,attack:!heal&&!!enemy&&distance(q,enemy)<155,skill:!!heal,dodge:!!enemy&&enemy.attackAt>now&&distance(q,enemy)<160&&q.dodgeCooldown===0});
 }
}
console.log(JSON.stringify({result:'timeout',floors,simulatedSeconds:4000,player:{hp:player.hp,x:player.x,y:player.y,level:player.level},remaining:world.monsters.filter(m=>m.floor===player.floor&&m.hp>0).map(m=>({kind:m.kind,hp:m.hp,x:m.x,y:m.y}))},null,2));process.exit(1);
