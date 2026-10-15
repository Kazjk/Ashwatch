import { buildingContains, type Point } from "./world.ts";

export function routeTo(from:Point,to:Point):Point[]{
 const cell=40,size=60,key=(x:number,y:number)=>y*size+x;
 const pos=(id:number)=>({x:(id%size)*cell+20,y:Math.floor(id/size)*cell+20});
 const start=key(Math.max(0,Math.min(59,Math.floor(from.x/cell))),Math.max(0,Math.min(59,Math.floor(from.y/cell))));
 const end=key(Math.max(0,Math.min(59,Math.floor(to.x/cell))),Math.max(0,Math.min(59,Math.floor(to.y/cell))));
 const blocked=(id:number)=>buildingContains(pos(id),16);
 const open=[start],came=new Map<number,number>(),cost=new Map([[start,0]]),closed=new Set<number>();
 while(open.length){open.sort((a,b)=>(cost.get(a)!+Math.hypot(pos(a).x-to.x,pos(a).y-to.y)/cell)-(cost.get(b)!+Math.hypot(pos(b).x-to.x,pos(b).y-to.y)/cell));const current=open.shift()!;if(current===end){const out:Point[]=[to];let node=current;while(node!==start){out.unshift(pos(node));node=came.get(node)!;}return out;}
  closed.add(current);const x=current%size,y=Math.floor(current/size);
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=size||ny>=size)continue;const next=key(nx,ny);if(closed.has(next)||blocked(next))continue;const g=cost.get(current)!+1;if(g<(cost.get(next)??Infinity)){came.set(next,current);cost.set(next,g);if(!open.includes(next))open.push(next);}}
 }
 return [];
}

export const TUTORIAL_STEPS=[
 {title:"Find your footing",desktop:"Use W A S D to walk a few steps.",phone:"Drag the movement stick to walk a few steps."},
 {title:"Make room to breathe",desktop:"Press Space to dash. It works while standing still.",phone:"Tap Dash. It works while standing still."},
 {title:"Keep the watch",desktop:"Hold Q / R or right-drag to scan. Awareness grows as you explore: a wider view and nearby rear sight. Distant rear danger stays hidden.",phone:"Drag the world or tap Turn left / right to scan. Exploration grows Awareness: a wider view and nearby rear sight. Watch enemy movement and call for cover."},
 {title:"Draw your blade",desktop:"Press J or click to attack. K uses your special move.",phone:"Tap your attack button. The star button uses your special move."},
 {title:"Your first contract",desktop:"Follow the gold trail to the Guild. Accept the beast hunt.",phone:"Follow the gold trail to the Guild. Accept the beast hunt."},
 {title:"Beyond the lanterns",desktop:"Hunt three beasts outside town. Dash the warning circles.",phone:"Hunt three beasts outside town. Dash the warning circles."},
 {title:"Bring back your story",desktop:"Return to the Guild and claim your reward.",phone:"Return to the Guild and claim your reward."},
 {title:"A place to return",desktop:"Follow the trail to the Lodge and book a room.",phone:"Follow the trail to the Lodge and book a room."}
];

export type TutorialAnchor = Point & {facing:number;attackAt:number;dodgeAt:number};
export function nextTutorialStep(step:number,anchor:TutorialAnchor,hero:TutorialAnchor & {mission:number;missionKills:number},rested=false){
 const turned=Math.abs(Math.atan2(Math.sin(hero.facing-anchor.facing),Math.cos(hero.facing-anchor.facing)))>.65;
 const complete=[Math.hypot(hero.x-anchor.x,hero.y-anchor.y)>45,hero.dodgeAt>anchor.dodgeAt,turned,hero.attackAt>anchor.attackAt,hero.mission>0,hero.missionKills>=3,hero.mission>=2,rested][step];
 return complete?Math.min(TUTORIAL_STEPS.length,step+1):step;
}
