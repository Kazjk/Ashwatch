// Shared public architecture footprint, independent of simulation and rendering imports.
export const SETTLEMENT_BUILDINGS = [[770,1450,1.1],[1040,1370,1],[820,1640,.9],[1100,1690,.85],[685,1630,.75],[390,420,1.65],[710,610,1.5],[470,660,1.2],[740,370,1.35],[530,300,1.6]];
export function distanceToBuilding(x:number,y:number,b:number[]){
 return Math.hypot(Math.max(0,Math.abs(x-b[0])-80*b[2]),Math.max(0,Math.abs(y-b[1])-55*b[2]));
}
