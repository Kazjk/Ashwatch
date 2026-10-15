type Point={x:number;y:number};
export const WATCH_PILLARS=[950,1450].flatMap(x=>[675,1025,1375,1700].map(y=>({x,y})));
export function watchObstacle(from:Point,to:Point,padding=0){
 const dx=to.x-from.x,dy=to.y-from.y,length=dx*dx+dy*dy;
 return WATCH_PILLARS.find(p=>{const t=length?Math.max(0,Math.min(1,((p.x-from.x)*dx+(p.y-from.y)*dy)/length)):0;return Math.hypot(p.x-from.x-dx*t,p.y-from.y-dy*t)<14+padding;});
}
export const watchLineClear=(from:Point,to:Point)=>!watchObstacle(from,to);
export const watchBlocked=(point:Point)=>!!watchObstacle(point,point,7);
export function watchDetour(from:Point,to:Point,padding=10):Point[]{
 const obstacle=watchObstacle(from,to,padding);if(!obstacle)return [];
 const length=Math.max(1,Math.hypot(to.x-from.x,to.y-from.y)),dx=(to.x-from.x)/length,dy=(to.y-from.y)/length,r=(14+padding)*1.9;
 const routes=[-1,1].map(side=>[-1,1].map(along=>({x:obstacle.x+dx*r*along-dy*r*side,y:obstacle.y+dy*r*along+dx*r*side})));
 return routes.sort((a,b)=>Math.hypot(from.x-a[0].x,from.y-a[0].y)-Math.hypot(from.x-b[0].x,from.y-b[0].y))[0];
}
