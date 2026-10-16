import {trunkBlocked,inRiver,terrainHeight,canopyOverlaps} from "./frontier-land.ts";
export type Material="timber"|"stone"|"herb"|"aether";
export type Supplies=Record<Material,number>;
export type StructureKind="hearth"|"foundation"|"wall"|"door"|"roof"|"bedroll"|"ward";
export type FrontierCommand={kind:"craft";recipe:"hatchet"|"meal"}|{kind:"build";piece:StructureKind;x:number;y:number;rotation:number}|{kind:"use";id:string};
export type FrontierHero={id:string;party:string;x:number;y:number;facing:number;floor:number;hp:number;maxHp:number;mp:number;maxMp:number};
export type ResourceNode={id:string;kind:Material;x:number;y:number;remaining:number;resetAt:number};
export type Structure={id:string;kind:StructureKind;owner:string;party:string;x:number;y:number;rotation:number;hp:number;open:boolean};
type Needs={supplies:Supplies;hatchet:boolean;milestones:string[];hunger:number;thirst:number;warmth:number;lastGather:number;lastCommand:number;message:string;messageAt:number};
export type FrontierView={nodes:ResourceNode[];structures:Structure[];supplies:Supplies;hatchet:boolean;milestones:string[];hunger:number;thirst:number;warmth:number;day:number;message:string;messageAt:number;sheltered:boolean};
export const RECIPES={
 hatchet:{name:"Stone hatchet",cost:{timber:8,stone:5}},meal:{name:"Foraged meal",cost:{herb:2}},
 hearth:{name:"Hearth",cost:{timber:10,stone:8}},foundation:{name:"Timber floor",cost:{timber:8,stone:4}},wall:{name:"Timber wall",cost:{timber:6,stone:2}},door:{name:"Doorway",cost:{timber:8,stone:2}},roof:{name:"Timber roof",cost:{timber:10,stone:4}},bedroll:{name:"Bedroll",cost:{timber:5,herb:4}},ward:{name:"Aether ward",cost:{stone:8,aether:3}}
} as const;
export const frontierDay=(now:number,began:number)=>((now-began)/480000+.34)%1;
export const frontierNight=(day:number)=>day>.68||day<.16;
const dist=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);
const supplies=():Supplies=>({timber:0,stone:0,herb:0,aether:0});
const rnd=(i:number)=>{const n=Math.sin(i*91.7+13.2)*43758.5453;return n-Math.floor(n);};
const kinds:Material[]=["timber","stone","herb","aether"];
const pieces:StructureKind[]=["hearth","foundation","wall","door","roof","bedroll","ward"];
export function buildPoint(hero:{x:number;y:number;facing:number},piece:StructureKind){const grid=piece==="wall"||piece==="door"?25:50;return {x:Math.round((hero.x+Math.cos(hero.facing)*95)/grid)*grid,y:Math.round((hero.y+Math.sin(hero.facing)*95)/grid)*grid};}
type Footprint={kind:StructureKind;x:number;y:number;rotation:number};
const wallPiece=(s:Footprint)=>s.kind==="wall"||s.kind==="door";
function pieceOverlap(a:Footprint,b:Footprint){
 if(a.kind==="roof"||b.kind==="roof"||a.kind==="foundation"||b.kind==="foundation")return false;
 const dx=Math.abs(a.x-b.x),dy=Math.abs(a.y-b.y);
 if(wallPiece(a)&&wallPiece(b)&&a.rotation%2!==b.rotation%2&&dx>=25&&dy>=25)return false;
 const half=(s:Footprint)=>{const size=wallPiece(s)?{x:2.7,y:25}:s.kind==="bedroll"?{x:11,y:22}:s.kind==="hearth"?{x:15,y:15}:{x:13,y:13};return s.rotation%2?{x:size.y,y:size.x}:size;};
 const aa=half(a),bb=half(b);return dx<aa.x+bb.x-.25&&dy<aa.y+bb.y-.25;
}
export function validateFrontierCommand(value:unknown):FrontierCommand{
 if(!value||typeof value!=="object"||Array.isArray(value))throw Error("INVALID_FRONTIER_COMMAND");const v=value as Record<string,unknown>;
 if(v.kind==="craft"&&(v.recipe==="hatchet"||v.recipe==="meal"))return {kind:"craft",recipe:v.recipe};
 if(v.kind==="use"&&typeof v.id==="string"&&v.id.length<80)return {kind:"use",id:v.id};
 if(v.kind==="build"&&pieces.includes(v.piece as StructureKind)&&[v.x,v.y,v.rotation].every(n=>typeof n==="number"&&Number.isFinite(n))&&Number.isInteger(v.rotation)&&Number(v.rotation)>=0&&Number(v.rotation)<4)return {kind:"build",piece:v.piece as StructureKind,x:Number(v.x),y:Number(v.y),rotation:Number(v.rotation)};
 throw Error("INVALID_FRONTIER_COMMAND");
}

export class FrontierState{
 readonly nodes:ResourceNode[]=[];
 readonly structures:Structure[]=[];
 private people=new Map<string,Needs>();
 private began:number;
 private staticBlocked:(p:{x:number;y:number})=>boolean;
 constructor(now:number,blocked:(p:{x:number;y:number})=>boolean=()=>false){
  this.began=now;this.staticBlocked=blocked;
  const add=(x:number,y:number,kind:Material)=>{if(!inRiver(x,y)&&!blocked({x,y})&&![-25,25].some(dx=>[-25,25].some(dy=>blocked({x:x+dx,y:y+dy})))&&!trunkBlocked(x,y,30))this.nodes.push({id:`resource-${this.nodes.length}`,kind,x,y,remaining:kind==="aether"?4:kind==="herb"?8:30,resetAt:0});};
  add(955,1480,"timber");add(1030,1555,"stone");add(960,1620,"herb");add(1125,1570,"aether");
  for(let i=0;i<155;i++)add(100+rnd(i)*2200,100+rnd(i+501)*2200,i%17===0?"aether":kinds[i%3]);
 }
 private person(id:string){let p=this.people.get(id);if(!p){p={supplies:supplies(),hatchet:false,milestones:[],hunger:100,thirst:100,warmth:85,lastGather:0,lastCommand:0,message:"Gather timber and stone. Craft a hatchet, then raise a hearth.",messageAt:0};this.people.set(id,p);}return p;}
 private say(id:string,message:string,now:number){const p=this.person(id);p.message=message;p.messageAt=now;}
 notice(id:string,message:string,now:number){this.say(id,message.slice(0,160),now);}
 forget(id:string){this.people.delete(id);}
 private friendly(h:FrontierHero,s:Structure){return s.owner===h.id||!!h.party&&s.party===h.party;}
 private pay(h:FrontierHero,cost:Partial<Supplies>){const bag=this.person(h.id).supplies;for(const [key,n] of Object.entries(cost))if(bag[key as Material]<n)throw Error(`Need ${n} ${key}.`);for(const [key,n] of Object.entries(cost))bag[key as Material]-=n;}
 gather(h:FrontierHero,now:number,visible:(p:{x:number;y:number})=>boolean){
  if(h.floor||h.hp<=0)return null;const p=this.person(h.id);if(now-p.lastGather<500)return null;
  const node=this.nodes.filter(n=>n.remaining>0&&dist(h,n)<76&&visible(n)).sort((a,b)=>dist(h,a)-dist(h,b))[0];if(!node)return null;
  const amount=Math.min(node.remaining,node.kind==="aether"?1:node.kind==="herb"?2:p.hatchet?10:5,200-p.supplies[node.kind]);if(amount<=0){this.say(h.id,"Your satchel is full of this material.",now);return null;}
  node.remaining-=amount;node.resetAt=node.remaining?0:now+180000;p.supplies[node.kind]+=amount;p.lastGather=now;this.say(h.id,`+${amount} ${node.kind}`,now);return node;
 }
 command(h:FrontierHero,command:FrontierCommand,now:number,visible:(p:{x:number;y:number})=>boolean,blocked:(p:{x:number;y:number})=>boolean,occupied:(p:{x:number;y:number},doorRotation?:number)=>boolean){
  if(h.floor||h.hp<=0)throw Error("Return to the frontier first.");const p=this.person(h.id);if(now-p.lastCommand<350)throw Error("Let the last craft settle.");
  if(command.kind==="craft"){
   if(command.recipe==="hatchet"&&p.hatchet)throw Error("Your stone hatchet is already equipped.");if(command.recipe==="meal"&&p.hunger>=100)throw Error("You are already well fed.");this.pay(h,RECIPES[command.recipe].cost);
   if(command.recipe==="hatchet"){p.hatchet=true;if(!p.milestones.includes("hatchet"))p.milestones.push("hatchet");}else p.hunger=Math.min(100,p.hunger+40);this.say(h.id,command.recipe==="hatchet"?"Stone hatchet equipped · larger harvests.":"Foraged meal eaten · hunger restored.",now);
  }else if(command.kind==="use"){
   const s=this.structures.find(s=>s.id===command.id);if(!s||dist(h,s)>85||!visible(s))throw Error("Face your structure and move closer.");if(!this.friendly(h,s))throw Error("This belongs to another company.");
   if(s.kind!=="door")throw Error("This structure works while you stay nearby.");if(s.open&&occupied(s,s.rotation))throw Error("Step clear before closing the door.");s.open=!s.open;this.say(h.id,s.open?"Door opened.":"Door closed.",now);
  }else{
   const grid=command.piece==="wall"||command.piece==="door"?25:50;const point={x:Math.round(command.x/grid)*grid,y:Math.round(command.y/grid)*grid};
   if(command.piece==="foundation"&&canopyOverlaps(point.x,point.y))throw Error("Choose a clearing away from overhanging branches.");
   if(inRiver(point.x,point.y)||Math.max(...[-25,25].flatMap(dx=>[-25,25].map(dy=>terrainHeight(point.x+dx,point.y+dy))))-Math.min(...[-25,25].flatMap(dx=>[-25,25].map(dy=>terrainHeight(point.x+dx,point.y+dy))))>.65)throw Error("Find dry, gently sloping ground for your shelter.");
   if(command.piece==="roof"&&!this.structures.some(s=>s.kind==="foundation"&&dist(s,point)<8&&this.friendly(h,s)))throw Error("A roof needs your timber floor beneath it.");
   if(point.x<80||point.y<80||point.x>2320||point.y>2320||dist(h,point)>145||!visible(point)||blocked(point)||command.piece!=="roof"&&occupied(point))throw Error("Choose clear ground within reach and in front of you.");
   if(this.structures.length>=96||this.structures.filter(s=>s.owner===h.id).length>=24)throw Error("This company has reached its building limit.");
   if(this.structures.some(s=>dist(s,point)<8&&s.kind===command.piece||pieceOverlap({kind:command.piece,...point,rotation:command.rotation},s)))throw Error("That place is occupied.");
   if(this.structures.some(s=>!this.friendly(h,s)&&dist(s,point)<120))throw Error("Leave space around another company's shelter.");
   if(this.nodes.some(n=>n.remaining>0&&dist(n,point)<30))throw Error("Leave the resource and path clear.");
   this.pay(h,RECIPES[command.piece].cost);
   this.structures.push({id:crypto.randomUUID(),kind:command.piece,owner:h.id,party:h.party,...point,rotation:command.rotation,hp:command.piece==="wall"||command.piece==="door"?240:160,open:false});if(!p.milestones.includes(command.piece))p.milestones.push(command.piece);this.say(h.id,`${RECIPES[command.piece].name} raised.`,now);
  }
  p.lastCommand=now;
 }
 blocked(x:number,y:number,ignore?:string){return trunkBlocked(x,y)||this.structures.some(s=>s.id!==ignore&&s.hp>0&&(s.kind==="wall"||s.kind==="door"&&!s.open)&&(s.rotation%2?Math.abs(y-s.y)<10&&Math.abs(x-s.x)<29:Math.abs(x-s.x)<10&&Math.abs(y-s.y)<29));}
 lineClear(a:{x:number;y:number},b:{x:number;y:number;id?:string}){const steps=Math.max(2,Math.ceil(dist(a,b)/8)),from=terrainHeight(a.x,a.y)+1.5,to=terrainHeight(b.x,b.y)+1.5;for(let i=1;i<steps;i++){const t=i/steps,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;if(this.staticBlocked({x,y})||this.blocked(x,y,b.id)||terrainHeight(x,y)>from+(to-from)*t)return false;}return true;}
 tick(h:FrontierHero,dt:number,now:number,wet=false){
  const p=this.person(h.id),night=frontierNight(frontierDay(now,this.began)),heated=this.structures.some(s=>s.kind==="hearth"&&s.hp>0&&dist(h,s)<145&&this.friendly(h,s)),warded=this.structures.some(s=>s.kind==="ward"&&s.hp>0&&dist(h,s)<120&&this.friendly(h,s));
  p.hunger=Math.max(0,p.hunger-dt*.045);p.thirst=Math.max(0,p.thirst-dt*(wet?.03:.07));p.warmth=Math.max(0,Math.min(100,p.warmth+dt*(heated?3:wet?-.65:night?-.22:.14)));
  if(p.hunger===0||p.thirst===0||p.warmth===0)h.hp=Math.max(1,h.hp-dt*1.5);
  if(heated&&p.hunger>20&&p.thirst>20)h.hp=Math.min(h.maxHp,h.hp+dt*1.5);if(warded)h.mp=Math.min(h.maxMp,h.mp+dt*2);
  for(const n of this.nodes)if(n.resetAt&&n.resetAt<=now){n.remaining=n.kind==="aether"?4:n.kind==="herb"?8:30;n.resetAt=0;}
 }
 drink(h:FrontierHero,now:number){this.person(h.id).thirst=100;this.say(h.id,"Drank from the river · thirst restored.",now);}
 respawn(h:FrontierHero){const bed=this.structures.find(s=>s.owner===h.id&&s.kind==="bedroll"&&s.hp>0);if(bed){h.x=bed.x;h.y=bed.y+35;}const p=this.person(h.id);p.hunger=Math.max(50,p.hunger);p.thirst=Math.max(50,p.thirst);p.warmth=Math.max(65,p.warmth);}
 view(h:FrontierHero,now:number,visible:(p:{x:number;y:number})=>boolean,known=visible):FrontierView{const p=this.person(h.id);return {nodes:this.nodes.filter(n=>n.remaining>0&&visible(n)).map(n=>({...n})),structures:this.structures.filter(s=>s.hp>0&&(this.friendly(h,s)?known(s):visible(s))).map(s=>({...s})),supplies:{...p.supplies},hatchet:p.hatchet,milestones:[...p.milestones],hunger:p.hunger,thirst:p.thirst,warmth:p.warmth,day:frontierDay(now,this.began),message:p.message,messageAt:p.messageAt,sheltered:this.structures.some(s=>s.kind==="hearth"&&dist(h,s)<145&&this.friendly(h,s))};}
 checkpoint(){return {began:this.began,nodes:this.nodes.map(n=>({...n})),structures:this.structures.map(s=>({...s})),people:[...this.people].map(([id,p])=>[id,{...p,milestones:[...p.milestones],supplies:{...p.supplies}}] as const)};}
 restore(data:ReturnType<FrontierState["checkpoint"]>,delta=0){
  if(!data||!Array.isArray(data.nodes)||data.nodes.length>200||!Array.isArray(data.structures)||data.structures.length>96||!Array.isArray(data.people)||data.people.length>32)throw Error("Invalid frontier checkpoint");
  if(data.nodes.some(n=>!kinds.includes(n.kind)||![n.x,n.y,n.remaining,n.resetAt].every(Number.isFinite)||n.remaining<0)||data.structures.some(s=>!pieces.includes(s.kind)||![s.x,s.y,s.rotation,s.hp].every(Number.isFinite)))throw Error("Invalid frontier checkpoint");
  for(const [id,p] of data.people)if(typeof id!=="string"||!p||![p.hunger,p.thirst,p.warmth,...Object.values(p.supplies)].every(n=>Number.isFinite(n)&&n>=0))throw Error("Invalid frontier supplies");
  this.began=data.began+delta;this.nodes.splice(0,this.nodes.length,...data.nodes.map(n=>({...n,resetAt:n.resetAt?n.resetAt+delta:0})));this.structures.splice(0,this.structures.length,...data.structures.map(s=>({...s})));this.people=new Map(data.people.map(([id,p])=>[id,{...p,milestones:[...(p.milestones??[])],supplies:{...p.supplies},lastGather:p.lastGather+delta,lastCommand:p.lastCommand+delta,messageAt:p.messageAt+delta}]));
 }
}
