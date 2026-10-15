// Device deadzones are already applied before transmission. Preserve deliberate
// slow travel instead of imposing another large deadzone on the accepted vector.
export const MIN_TRAVEL=.005;
export function dashVector(x:number,y:number,facing:number){
 const length=Math.hypot(x,y);
 return length>MIN_TRAVEL?{x:x/length,y:y/length}:{x:Math.cos(facing),y:Math.sin(facing)};
}
