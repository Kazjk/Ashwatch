import type {ClassName} from "./progression.ts";

export type CombatAction={at:number;contactAt:number;recoveryAt:number;endsAt:number;facing:number;skill:boolean;resolved:boolean;stage:CombatStage;hit:boolean;opening?:boolean};
export const OPENING_DAMAGE=1.3;
export type CombatStage="intent"|"commitment"|"contact"|"consequence"|"recovery";
export const COMBAT={
 Knight:{contact:180,end:460,skillContact:330,skillEnd:800,reach:72},
 Spellweaver:{contact:240,end:520,skillContact:440,skillEnd:900,reach:180},
 Ironbound:{contact:280,end:540,skillContact:380,skillEnd:850,reach:78},
 Rogue:{contact:100,end:310,skillContact:170,skillEnd:540,reach:65},
 Warden:{contact:200,end:480,skillContact:330,skillEnd:780,reach:180}
} as const;
export function combatStage(action:Pick<CombatAction,"at"|"contactAt"|"recoveryAt"|"endsAt">,now:number):CombatStage {
 if(now<action.at+40)return "intent";
 if(now<action.contactAt)return "commitment";
 if(now<action.contactAt+55)return "contact";
 if(now<action.recoveryAt)return "consequence";
 return "recovery";
}
export function beginAction(cls:ClassName,skill:boolean,facing:number,now:number):CombatAction {
 const profile=COMBAT[cls],contact=skill?profile.skillContact:profile.contact,end=skill?profile.skillEnd:profile.end;
 return {at:now,contactAt:now+contact,recoveryAt:now+contact+110,endsAt:now+end,facing,skill,resolved:false,stage:"intent",hit:false};
}
// Presentation uses the server's schedule. It never selects an outcome.
export function combatPose(action:CombatAction|null|undefined,now:number) {
 if(!action||now>=action.endsAt)return {windup:0,strike:0,recovery:0};
 const windupTime=action.contactAt-action.at,releaseTime=Math.min(100,windupTime*.35),releaseAt=action.contactAt-releaseTime;
 if(now<releaseAt)return {windup:Math.max(0,Math.min(1,(now-action.at)/(releaseAt-action.at))),strike:0,recovery:0};
 if(now<action.contactAt){const release=(now-releaseAt)/releaseTime;return {windup:1-release,strike:Math.sin(release*Math.PI/2),recovery:0};}
 const settle=Math.max(0,Math.min(1,(now-action.recoveryAt)/(action.endsAt-action.recoveryAt)));
 return {windup:0,strike:1-settle,recovery:settle};
}
// A raised overhead weapon and a sideways coil describe different physical attacks.
// No target point, damage or attack-area indicator is involved in this presentation.
export function enemyMotion(action:CombatAction,now:number){
 const pose=combatPose(action,now),w=Math.min(1,pose.windup*2.6),h=pose.strike,sweep=action.skill;
 return {bodyX:sweep?-.07*w+.07*h:-.16*w+.23*h,bodyY:sweep?-1.05*w+1.35*h:.08*w,
  armX:sweep?-.65*w-.85*h:-2.25*w-.35*h,armY:sweep?-.75*w+.95*h:0,
  armZ:sweep?.65*w-1.2*h:.10*w,elbowX:-.1-.45*w,braceX:sweep?-.4*w:-1.25*w-.25*h};
}
export function presentEnemyAction(enemy:{kind:string;attackAt:number;lastContactAt?:number;recoveryUntil:number;facing:number;attackKind?:"strike"|"sweep"},now:number,lastContactAt=0,observedAt=now):{contactAt:number;action:CombatAction|null}{
 let contactAt=enemy.attackAt||(enemy.lastContactAt??lastContactAt);
 // The server cleared a still-future contact: it was cancelled, not a successful swing.
 if(!enemy.attackAt&&contactAt>observedAt)contactAt=0;
 if(!contactAt||!enemy.attackAt&&(enemy.recoveryUntil<=now||now<contactAt))return {contactAt,action:null};
 const action:CombatAction={at:contactAt-(enemy.kind==="boss"?1400:1050),contactAt,recoveryAt:contactAt+110,
  endsAt:enemy.attackAt?contactAt+1400:enemy.recoveryUntil,facing:enemy.facing,skill:enemy.attackKind==="sweep",resolved:now>=contactAt,stage:"commitment",hit:false};
 action.stage=combatStage(action,now);return {contactAt,action};
}
export function inBackArc(target:{x:number;y:number;facing:number},attacker:{x:number;y:number}){
 const dx=attacker.x-target.x,dy=attacker.y-target.y,length=Math.hypot(dx,dy);
 return length>0&&(dx*Math.cos(target.facing)+dy*Math.sin(target.facing))/length<-.5;
}
