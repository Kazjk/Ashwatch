import {angleDelta,travelVector} from "./controls.ts";
import {MIN_TRAVEL} from "./input-motion.ts";

// A short, authoritative action grace lets a released strike flow into a backstep/dash.
// Deliberate look still turns immediately; ordinary travel returns after the grace.
export const preserveCombatFacing=(attackAt:number,serverTime:number)=>attackAt>0&&Number.isFinite(attackAt)&&serverTime>=attackAt&&serverTime-attackAt<1800;

// Camera-relative travel is evaluated against today's orbit, never a stale key-down angle.
// Facing is an input request only; the server still locks a committed action's direction.
export function playerInput(x:number,y:number,orbit:number,look:number|undefined,current:number,aiming:boolean,striking:boolean){
 const length=Math.max(1,Math.hypot(x,y));
 const movement=travelVector(x/length,y/length,orbit);
 return {...movement,facing:aiming||striking?look??current:x||y?undefined:look};
}

// A following camera must not rotate a held movement command back into itself.
// Starting/changing travel captures the visible heading; deliberate look can steer it.
export class TravelIntent {
 private basis:number|null=null;
 private direction=0;
 reset(){this.basis=null;}
 movement(x:number,y:number,heading:number,steering=false){
  if(Math.hypot(x,y)<=MIN_TRAVEL){this.reset();return {x:0,y:0};}
  const direction=Math.atan2(y,x);
  if(this.basis===null||steering||Math.abs(angleDelta(direction,this.direction))>.3)this.basis=heading;
  this.direction=direction;
  const length=Math.max(1,Math.hypot(x,y));
  return travelVector(x/length,y/length,this.basis);
 }
}

// Explicit facing survives movement and commitment until the server accepts it.
export class FacingIntent {
 private angle:number|undefined;
 request(angle:number){if(Number.isFinite(angle))this.angle=angle;}
 sample(busy:boolean){return busy?undefined:this.angle;}
 acknowledge(facing:number){if(this.angle!==undefined&&Math.abs(angleDelta(facing,this.angle))<.05)this.angle=undefined;}
 reset(){this.angle=undefined;}
}
