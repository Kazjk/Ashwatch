import type {ClassName} from "./progression.ts";
export type BodySize={height:number;width:number};
// Put a heavy hammer or staff away from the sightline; keep the Knight's shield away.
export const combatCameraSide=(cls:ClassName)=>cls==="Knight"||cls==="Rogue"?1:-1;

// Physical framing only: callers may supply a distance from an admitted target.
// No windup, contact time, future target or perception permission is consulted.
export function combatFraming(size:BodySize,targetDistance:number|undefined,narrow:boolean){
 const near=targetDistance!==undefined&&Number.isFinite(targetDistance)?Math.max(0,Math.min(1,(4-targetDistance)/2.8)):0;
 const eased=near*near*(3-2*near);
 const bodyLift=Math.max(0,size.height-1)*3.2;
 return {lift:bodyLift+eased*.55,shoulder:(narrow?1.35:1.45)+Math.max(0,size.width-1)*.3+eased*(narrow?.65:.8)};
}
