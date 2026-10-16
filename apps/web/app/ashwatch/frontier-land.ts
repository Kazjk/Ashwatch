import {SETTLEMENT_BUILDINGS,distanceToBuilding} from "./settlement-layout.ts";
const smooth=(a:number,b:number,v:number)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
export const riverCenter=(z:number)=>1535+Math.sin(z*.0038)*78+Math.sin(z*.009)*25;
export const RIVER_LEVEL=-.8;
export function terrainHeight(x:number,z:number){
 const clearing=Math.min(smooth(310,450,Math.hypot(x-920,z-1500)),smooth(500,650,Math.hypot(x-550,z-530)));
 const hills=Math.sin(x*.007)*1.5+Math.cos(z*.006)*1.15+Math.sin((x+z)*.012)*.48;
 const channel=1-smooth(22,75,Math.abs(x-riverCenter(z)));
 return (Math.max(-.25,hills)*(1-channel)-1.45*channel)*clearing;
}
export const inRiver=(x:number,z:number)=>Math.abs(x-riverCenter(z))<75&&terrainHeight(x,z)<RIVER_LEVEL-.05;
const random=(n:number)=>{const v=Math.sin(n*83.7+41.3)*43758.5453;return v-Math.floor(v);};
// Shared landmarks: the server collides with the same trunks the renderer draws.
// Includes the widest branch/card corner, not merely a narrow trunk collider.
export const canopyRadius=(size:number)=>140*size;
export const FOREST=Array.from({length:180},(_,i)=>({x:80+random(i)*2240,y:80+random(i+405)*2240,size:.8+random(i+230)*.65,seed:i})).filter(t=>Math.hypot(t.x-920,t.y-1500)>330&&Math.hypot(t.x-550,t.y-530)>660&&Math.abs(t.x-riverCenter(t.y))>90&&SETTLEMENT_BUILDINGS.every(b=>distanceToBuilding(t.x,t.y,b)>canopyRadius(t.size)));
export const trunkBlocked=(x:number,y:number,padding=12)=>FOREST.some(t=>Math.hypot(x-t.x,y-t.y)<t.size*6+padding);

export const canopyOverlaps=(x:number,y:number,halfX=30,halfY=30)=>FOREST.some(t=>Math.hypot(Math.max(0,Math.abs(t.x-x)-halfX),Math.max(0,Math.abs(t.y-y)-halfY))<canopyRadius(t.size));
