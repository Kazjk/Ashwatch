import {watchLineClear} from "./watch-obstacles.ts";
import {COMBAT} from "./combat.ts";
import {enemyHealth} from "./enemy-health.ts";
import {distance,faces,type Hero,type WorldView} from "./world.ts";
// Only entities already admitted to this recipient's server snapshot can be candidates.
export function readTarget(view:WorldView,hero:Hero){
 const reach=COMBAT[hero.heroClass].reach;
 const candidates=view.monsters.filter(e=>e.hp>0&&faces(hero,e)).sort((a,b)=>distance(hero,a)-distance(hero,b));
 const target=candidates[0];if(!target)return null;
 return {id:target.id,kind:target.kind,health:enemyHealth(target.hp,target.maxHp),slowed:(target.slowUntil??0)>view.time,hp:target.hp,maxHp:target.maxHp,x:target.x,y:target.y,obstructed:!!view.watch&&!watchLineClear(hero,target),inReach:distance(hero,target)<reach&&(!view.watch||watchLineClear(hero,target))};
}

// Facing help selects only an enemy already supplied to this recipient.
export function visibleFacing(view:WorldView,hero:Hero){const target=view.monsters.filter(e=>e.hp>0).sort((a,b)=>distance(hero,a)-distance(hero,b))[0];return target?Math.atan2(target.y-hero.y,target.x-hero.x):null;}

// Support hints use admitted heroes, not the unrestricted party-map coordinates.
export function readSupport(view:WorldView,hero:Hero){
 if(hero.equippedSkill!=="Renew")return null;
 const allies=view.heroes.filter(p=>p.hp>0&&(p.id===hero.id||!!hero.party&&p.party===hero.party)&&p.floor===hero.floor&&(p.hp<p.maxHp||(p.webUntil??0)>view.time));
 const candidates=allies.toSorted((a,b)=>Number((b.webUntil??0)>view.time)-Number((a.webUntil??0)>view.time)||distance(hero,a)-distance(hero,b));
 const ally=candidates[0];if(!ally)return null;
 const self=ally.id===hero.id,obstructed=!self&&!!view.watch&&!watchLineClear(hero,ally),inReach=self||distance(hero,ally)<160,faced=self||faces(hero,ally);
 return {id:ally.id,name:self?"You":ally.name,x:ally.x,y:ally.y,webbed:(ally.webUntil??0)>view.time,obstructed,inReach,faced,ready:inReach&&faced&&!obstructed};
}
