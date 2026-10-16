import type {Rehearsal,WatchJournal} from "./watch-report.ts";
import {watchBlocked,watchLineClear,watchDetour,watchObstacle} from "./watch-obstacles.ts";
export {WATCH_PILLARS,watchBlocked} from "./watch-obstacles.ts";
import {OATHS,type OathId} from "./oaths.ts";
import {CLASSES,ITEMS,ATTRIBUTES,newGrowth,type ClassName,type Growth,type Attribute} from "./progression.ts";
import {beginAction,combatStage,COMBAT,OPENING_DAMAGE,inBackArc,type CombatAction} from "./combat.ts";
import {MIN_TRAVEL,dashVector} from "./input-motion.ts";
import {FrontierState,validateFrontierCommand,type FrontierCommand,type FrontierView} from "./frontier.ts";
import {inRiver,riverCenter,trunkBlocked} from "./frontier-land.ts";
import {SETTLEMENT_BUILDINGS} from "./settlement-layout.ts";
export type HeroClass = ClassName;

export type Point = { x: number; y: number };

export type Hero = Point & Growth & { id: string; name: string; heroClass: HeroClass; webUntil?:number; hp: number; maxHp: number; mp: number; maxMp: number; stamina: number; maxStamina: number; level: number; xp: number; awareness: number; floor: number; facing: number; kills: number; deaths: number; attackAt: number; dodgeUntil: number; respawnAt: number; cooldown: number; skillCooldown: number; portalCooldown: number; moving: boolean; dodgeAt:number; dodgeCooldown:number; attackStyle:number; mission:number; missionKills:number; missionClaimed:boolean; lodge:string; party:string; action:CombatAction|null };

export type Monster = Point & { id: string; kind: "wolf" | "slime" | "sentinel" | "boss"; floor: number; level: number; hp: number; maxHp: number; homeX: number; homeY: number; attackAt: number; nextAttack: number; tx: number; ty: number; deadAt: number; facing: number; recoveryUntil:number; lastContactAt?:number; slowUntil?:number; attackPhase?:number; attackCount?:number; attackKind?:"strike"|"sweep" };

export type Dragon = Point & { state: "sleeping" | "enraged" | "returning" | "defeated"; hp: number; maxHp: number; kills: number; facing: number; attackAt: number; nextAttack: number; tx: number; ty: number; defeatedAt: number };

// Natural motion remains observable; future strike coordinates stay private at every Awareness.
export type MonsterView = Omit<Monster,"homeX"|"homeY"|"nextAttack"|"tx"|"ty"|"attackPhase"|"attackCount">;
export type DragonView = Omit<Dragon,"nextAttack"|"tx"|"ty">;

export type Effect = Point & { id: number; floor: number; kind: "guard" | "crescent" | "slash" | "spell" | "starfall" | "hit" | "fire" | "heal" | "portal" | "parry" | "ward" | "interrupt" | "backstab" | "cleanse" | "practice" | "cover" | "defeat"; at: number; angle: number; value?: number; to?:Point; radius?:number; style?:HeroClass };

export type Watch=WatchJournal & {covers:number;oath:OathId;parries:number;cleanses:number;evades:number;interrupts:number;healing:number;stage:number;state:"forming"|"active"|"victory"|"defeat";startedAt:number;endedAt:number;hitsTaken:number;warnings:number};
export type Warning={name:string;relative:"ahead"|"left"|"right"|"behind";at:number;answeredBy?:string};
export type WorldView = { inputSequence:number;frontier?:FrontierView;rehearsal?:Rehearsal;ownCall?:{at:number;answeredBy?:string};hostId?:string;company?:{id:string;name:string;heroClass:HeroClass;online:boolean}[]; watch:Watch|null;warnings:Warning[]; selfId: string; time: number; heroes: Hero[]; monsters: MonsterView[]; dragon: DragonView | null; effects: Effect[]; cleared: number[]; villageDamage: number; population: number; floorRemaining: number; partyMembers: {id:string;x:number;y:number;floor:number}[] };

export const bossPhase=(m:Pick<Monster,"kind"|"hp"|"maxHp">)=>m.kind!=="boss"?0:m.hp/m.maxHp>2/3?1:m.hp/m.maxHp>1/3?2:3;
export const strikeRadius=(m:Pick<Monster,"kind"|"attackKind">)=>m.attackKind==="sweep"?145:m.kind==="boss"?110:58;

const nowForWarning=(now:number,last?:number)=>last===undefined||now-last>=2000;

export const WORLD_SIZE = 2400;

export const VILLAGE = { x: 920, y: 1500 };

export const residents=(now:number,fleeing=false)=>Array.from({length:4},(_,i)=>{const a=now/(fleeing?1500:11000)+i*2.4;return {id:`civilian-${i}`,x:VILLAGE.x+Math.cos(a)*(fleeing?190:70),y:VILLAGE.y+Math.sin(a)*(fleeing?150:65),facing:a+Math.PI/2};});
export const GATE = { x: 1440, y: 850 };

export const NEST = { x: 1900, y: 450 };

export const TOWNS = [
 {id:"emberveil",name:"Emberveil",x:920,y:1500,size:1,arena:{x:580,y:1250,r:115},guild:{x:770,y:1450},inn:{x:1100,y:1690}},
 {id:"highcrown",name:"Highcrown",x:550,y:530,size:1.65,arena:{x:320,y:760,r:170},guild:{x:390,y:420},inn:{x:710,y:610}}
];
export const arenaAt=(p:Point & {floor:number})=>p.floor===0?TOWNS.find(t=>distance(p,t.arena)<t.arena.r):undefined;
export const BUILDINGS = SETTLEMENT_BUILDINGS;
// Centered on the rendered house; includes the roof overhang and the hero capsule.
export const buildingContains=(point:Point,padding=8)=>BUILDINGS.some(([x,y,size])=>Math.abs(point.x-x)<65*size+padding&&Math.abs(point.y-y)<47*size+padding);
export const buildingEntrance=(point:Point):Point=>{const size=BUILDINGS.find(([x,y])=>x===point.x&&y===point.y)?.[2]??1;return {x:point.x,y:point.y+Math.max(75,47*size+24)};};



export const FLOOR_NAMES = ["The sunken garden", "Whispering roots", "The sapphire grotto", "Moonlit cloister", "The drowned archive", "Amber foundry", "Winterglass halls", "The crimson orchard", "The starless cathedral", "Throne of the eclipse"];

export const FLOOR_COLORS = ["#466852", "#384f45", "#315e73", "#515574", "#285a60", "#76503b", "#527482", "#683e50", "#3d365c", "#59415e"];

export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export const safe = (p: Point & { floor: number }) => p.floor === 0 && !arenaAt(p) && TOWNS.some(t=>distance(p,t)<320*t.size||distance(p,t.inn)<110||distance(p,t.guild)<110);

export const sight = (awareness: number) => {const value=Math.max(0,Math.min(100,awareness));return {range:420+value*1.8,halfAngle:(56+value*.24)*Math.PI/180,rearRange:value*1.2};};

export function faces(observer: Pick<Hero,"x"|"y"|"facing">,target:Point){const angle=Math.atan2(target.y-observer.y,target.x-observer.x)-observer.facing;return Math.abs(Math.atan2(Math.sin(angle),Math.cos(angle)))<=56*Math.PI/180;}

export function canSee(observer: Pick<Hero,"x"|"y"|"facing"|"awareness">, target: Point) {

 const dx=target.x-observer.x,dy=target.y-observer.y;const vision=sight(observer.awareness);
 if(Math.hypot(dx,dy)<.01)return true;
 if(Math.hypot(dx,dy)<=vision.rearRange)return true;

 const angle=Math.atan2(Math.sin(Math.atan2(dy,dx)-observer.facing),Math.cos(Math.atan2(dy,dx)-observer.facing));

 return Math.hypot(dx,dy)<=vision.range && Math.abs(angle)<=vision.halfAngle;

}

export const requiredXp = (level: number) => level * 65;

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

type PrivateHero = Hero & { token: string; seq: number; lastSeen: number; inputAt:number; sprint?:boolean; input: Point; nextAttack: number; nextSkill: number; nextDodge: number; dodgeX:number; dodgeY:number; explored: Set<string>; };

export type Input = { frontier?:FrontierCommand;sequence: number; x: number; y: number; facing?: number; sprint?:boolean; attack?: boolean; skill?: boolean; dodge?: boolean; interact?: boolean; warn?:boolean; service?: "mission"|"claim"|"rest"|"party"; partyCode?:string };

export class LivingWorld {

  heroes = new Map<string, PrivateHero>();

  monsters: Monster[] = [];
  private detours=new Map<string,Point[]>();

  cleared = new Set<number>();

  effects: Effect[] = [];

  villageDamage = 0;

  dragon: Dragon = { ...NEST, state: "sleeping", hp: 28000, maxHp: 28000, kills: 0, facing: 2, attackAt: 0, nextAttack: 0, tx: 0, ty: 0, defeatedAt: 0 };

  frontier:FrontierState|null=null;
  configureFrontier(){this.frontier=new FrontierState(this.clock(),p=>buildingContains(p,0));}
  private frontierOccupied(q:Point,rotation?:number){return [...this.heroes.values()].some(h=>h.floor===0&&h.hp>0&&(rotation===undefined?distance(h,q)<30:rotation%2?Math.abs(h.y-q.y)<18&&Math.abs(h.x-q.x)<29:Math.abs(h.x-q.x)<18&&Math.abs(h.y-q.y)<29));}
  watch:Watch|null=null;
  private callouts:{caller:string;at:number;coveredBy?:string}[]=[];
  private warningCooldown=new Map<string,number>();
  private threatened=new Map<string,string[]>();
  private rehearsals=new Map<string,Rehearsal>();
  private chapterBase={hits:0,evades:0,openings:0,covers:0};
  configureWatch(oath:OathId="lantern",forming=false,attempt=1){this.watch={attempt,regroupUntil:0,stageStartedAt:forming?0:this.clock(),openings:0,misses:0,hitsByKind:{scout:0,sentinel:0,strike:0,sweep:0},chapters:[],covers:0,oath,parries:0,cleanses:0,evades:0,interrupts:0,healing:0,stage:0,state:forming?"forming":"active",startedAt:forming?0:this.clock(),endedAt:0,hitsTaken:0,warnings:0};this.monsters=[];this.detours.clear();this.watchWave();}
  startWatch(){
    if(!this.watch||this.watch.state!=="forming")throw Error("This company has already begun the watch.");
    this.watch.state="active";this.watch.startedAt=this.clock();this.watch.warnings=0;this.watch.covers=0;this.watch.stageStartedAt=this.clock();this.threatened.clear();this.callouts=[];this.warningCooldown.clear();this.effects=[];
    for(const [i,p] of [...this.heroes.values()].entries()){p.x=1200+i*32;p.y=1500;p.facing=-Math.PI/2;p.input={x:0,y:0};p.action=null;p.hp=p.maxHp;p.mp=p.maxMp;p.stamina=p.maxStamina;p.attackAt=0;p.dodgeAt=0;p.dodgeUntil=0;p.nextAttack=p.nextSkill=p.nextDodge=0;}
    for(const e of this.monsters){e.hp=e.maxHp;e.x=e.homeX;e.y=e.homeY;e.deadAt=0;e.slowUntil=undefined;e.attackAt=0;e.lastContactAt=0;e.recoveryUntil=0;e.nextAttack=this.clock()+700;}
  }

  private watchWave(){
    if(!this.watch)return;
    const stage=this.watch.stage,positions=stage===0?[[1200,1380]]:stage===1?(this.watch.attempt%2?[[1090,1280],[1300,1260]]:[[1300,1280],[1090,1260]]):[[1200,1110]];
    for(const [i,[x,y]] of positions.entries()){
      const kind=stage===2?"boss":stage===1?"sentinel":"wolf",hp=stage===2?900:stage===1?220:180;
      this.monsters.push({id:`watch-${stage}-${i}`,x,y,homeX:x,homeY:y,floor:1,level:stage+1,kind,hp:hp*(1+Math.max(0,this.heroes.size-1)*.85),maxHp:hp*(1+Math.max(0,this.heroes.size-1)*.85),attackAt:0,nextAttack:Math.max(this.clock(),this.watch.regroupUntil)+(stage===0?700:1800)+i*700,tx:x,ty:y,deadAt:0,facing:Math.PI/2,recoveryUntil:0,attackCount:stage===2?(this.watch.attempt-1)%2:0});
    }
  }
  private drill(p:PrivateHero){let drill=this.rehearsals.get(p.id);if(!drill){drill={contact:false,evaded:false,opening:false,called:false};this.rehearsals.set(p.id,drill);}return drill;}
  private finishChapter(now:number){
    const w=this.watch;if(!w)return;
    w.chapters.push({stage:w.stage,seconds:Math.max(0,Math.round((now-w.stageStartedAt)/1000)),hits:w.hitsTaken-this.chapterBase.hits,evades:w.evades-this.chapterBase.evades,openings:w.openings-this.chapterBase.openings,covers:w.covers-this.chapterBase.covers});
    this.chapterBase={hits:w.hitsTaken,evades:w.evades,openings:w.openings,covers:w.covers};
  }
  // Practice deals real target damage; players are safe and a defeated scout returns.
  private rehearsalTick(e:Monster,now:number){
    if(e.hp<=0){
      if(now-e.deadAt>=1500){e.hp=e.maxHp;e.x=e.homeX;e.y=e.homeY;e.deadAt=0;e.slowUntil=undefined;e.attackAt=0;e.lastContactAt=0;e.recoveryUntil=0;e.nextAttack=now+700;}
      return;
    }
    const targets=[...this.heroes.values()].filter(p=>p.hp>0&&p.floor===e.floor&&now-p.lastSeen<1500);
    if(e.attackAt){if(now<e.attackAt)return;
      for(const p of targets)if(this.threatened.get(e.id)?.includes(p.id)&&(distance(p,{x:e.tx,y:e.ty})>=strikeRadius(e)||p.dodgeUntil>now))this.drill(p).evaded=true;
      this.effect(e.tx,e.ty,e.floor,"practice",now,0);this.threatened.delete(e.id);e.lastContactAt=now;e.attackAt=0;e.recoveryUntil=now+1400;e.nextAttack=now+2900;return;
    }
    const target=targets.toSorted((a,b)=>distance(a,e)-distance(b,e)).find(p=>distance(p,e)<150&&watchLineClear(e,p));
    if(target&&now>=e.nextAttack){e.facing=Math.atan2(target.y-e.y,target.x-e.x);e.tx=target.x;e.ty=target.y;e.attackAt=now+1050;e.lastContactAt=0;e.recoveryUntil=0;e.attackKind="strike";this.threatened.set(e.id,targets.filter(p=>distance(p,{x:e.tx,y:e.ty})<strikeRadius(e)).map(p=>p.id));}
  }
  private effectId = 0;

  private last: number;

  private clock: () => number;

  constructor(clock: () => number = Date.now) {

    this.clock = clock;

    this.last = clock();

    for (let i = 0; i < 22; i++) {

      const angle = i * 2.399;

      const radius = 370 + (i % 4) * 105;

      this.spawn(0, i, 1080 + Math.cos(angle) * radius, 1300 + Math.sin(angle) * radius);

    }

    for (let floor = 1; floor <= 10; floor++) {

      const count = 4 + floor;

      for (let i = 0; i < count; i++) {

        const angle = i * 2.399;

        this.spawn(floor, i, 1200 + Math.cos(angle) * (220 + i % 3 * 145), 1100 + Math.sin(angle) * (200 + i % 3 * 120));

      }

    }

  }

  private spawn(floor: number, i: number, x: number, y: number) {

    const level = floor ? floor * 2 : 1 + i % 3;

    const kind = floor > 0 && i === 3 + floor ? "boss" : floor >= 4 && i % 3 === 0 ? "sentinel" : i % 2 ? "wolf" : "slime";

    const hp = (kind === "boss" ? 250 : 55) * (1 + level * .27);

    this.monsters.push({ id: `m-${floor}-${i}`, x, y, homeX: x, homeY: y, floor, level, kind, hp, maxHp: hp, attackAt: 0, nextAttack: this.last + 1500, tx: x, ty: y, deadAt: 0, facing: 0, recoveryUntil:0 });

  }

  enter(name: string, heroClass: HeroClass) {

    this.advance();

    if (this.watch?this.heroes.size>=5:[...this.heroes.values()].filter(p=>this.clock()-p.lastSeen<120000).length>=32) throw Error("This world is full. Try again shortly.");

    const id = crypto.randomUUID(), token = crypto.randomUUID(), now = this.clock();

    this.heroes.set(id, { id, token, name: name.replace(/[^\p{L}\p{N} _-]/gu, "").trim().slice(0, 18) || "Wanderer", heroClass,

      ...newGrowth(heroClass), x: VILLAGE.x + 85 + (this.heroes.size % 4) * 23, y: VILLAGE.y + 65, hp: CLASSES[heroClass].hp, maxHp: CLASSES[heroClass].hp, mp: CLASSES[heroClass].mp, maxMp: CLASSES[heroClass].mp, stamina: CLASSES[heroClass].stamina, maxStamina: CLASSES[heroClass].stamina, level: 1, xp: 0, awareness: 0, floor: 0, facing: -1.1,

      action:null,dodgeAt:0,dodgeCooldown:0,attackStyle:0,mission:0,missionKills:0,missionClaimed:false,lodge:"emberveil",party:"",kills: 0, deaths: 0, attackAt: 0, dodgeUntil: 0, respawnAt: 0, cooldown: 0, skillCooldown: 0, portalCooldown: now + 1000, moving: false,

      seq: -1, lastSeen: now, inputAt:now, input: { x: 0, y: 0 }, nextAttack: 0, nextSkill: 0, nextDodge: 0, dodgeX:0,dodgeY:0,explored: new Set() });

    if(this.watch){const oldScale=1+Math.max(0,this.heroes.size-2)*.85,newScale=1+Math.max(0,this.heroes.size-1)*.85;for(const enemy of this.monsters){enemy.hp*=newScale/oldScale;enemy.maxHp*=newScale/oldScale;}const p=this.heroes.get(id)!;p.floor=1;p.x=1200+(this.heroes.size-1)*32;p.y=1550;p.facing=-Math.PI/2;p.awareness=20+OATHS[this.watch.oath].awareness;p.maxHp=Math.round(p.maxHp*OATHS[this.watch.oath].health);p.hp=p.maxHp;p.weapon=p.heroClass==="Spellweaver"||p.heroClass==="Warden"?"watch-focus":"watch-sword";}
    if(this.frontier){const p=this.heroes.get(id)!;p.weapon=p.heroClass==="Spellweaver"||p.heroClass==="Warden"?"focus":"sword";p.inventory=[p.weapon];p.gold=0;p.awareness=20;p.facing=Math.atan2(1480-p.y,955-p.x);}
    return { id, token };

  }

  authenticate(id: string, token: string) {

    const p = this.heroes.get(id);

    if (!p || p.token !== token) throw Error("SESSION_EXPIRED");

    return p;

  }

  input(id: string, token: string, input: Input) {

    const p = this.authenticate(id, token);

    this.advance();

    if (!Number.isSafeInteger(input.sequence)) throw Error("INVALID_INPUT");

    if (![input.x, input.y].every(Number.isFinite) || (input.facing !== undefined && !Number.isFinite(input.facing))) throw Error("INVALID_INPUT");

    if ([input.attack,input.skill,input.dodge,input.interact,input.warn,input.sprint].some(value=>value!==undefined&&typeof value!=="boolean")) throw Error("INVALID_INPUT");

    const frontierCommand=input.frontier===undefined?undefined:validateFrontierCommand(input.frontier);if(frontierCommand&&!this.frontier)throw Error("Choose the wild frontier first.");
    if(input.sequence<=p.seq){p.lastSeen=this.clock();return this.view(p);}
    p.seq = input.sequence; p.lastSeen = p.inputAt = this.clock();

    const len = Math.max(1, Math.hypot(input.x, input.y));

    p.input = { x: clamp(input.x / len, -1, 1), y: clamp(input.y / len, -1, 1) };p.sprint=!!input.sprint;

    if (p.hp <= 0 || this.watch&&this.watch.state!=="active"&&this.watch.state!=="forming") {p.input={x:0,y:0};return this.view(p);}
    if(input.warn&&this.watch?.state==="forming")this.drill(p).called=true;
    if(input.warn&&p.party&&nowForWarning(this.clock(),this.warningCooldown.get(p.id))){this.warningCooldown.set(p.id,this.clock());this.callouts.push({caller:p.id,at:this.clock()});if(this.watch?.state==="active")this.watch.warnings++;}

    if (!p.action && input.facing !== undefined) p.facing = input.facing;

    else if (!p.action && (input.x || input.y)) p.facing = Math.atan2(input.y, input.x);

    if (input.dodge && (!p.action || p.action.stage === "intent" || p.action.stage === "recovery") && p.nextDodge <= this.clock() && p.stamina >= 25) {
      p.action=null;if(this.watch?.state!=="forming")p.stamina-=25;p.dodgeAt=this.clock();
      const direction=dashVector(p.input.x,p.input.y,p.facing);p.dodgeX=direction.x;p.dodgeY=direction.y;
      p.dodgeUntil=this.clock()+360;p.nextDodge=this.clock()+2200;
    }

    if(frontierCommand&&this.frontier){try{this.frontier.command(p,frontierCommand,this.clock(),q=>(frontierCommand.kind==="build"&&frontierCommand.piece==="roof"?canSee(p,q):this.visible(p,q))&&faces(p,q),q=>buildingContains(q,35)||trunkBlocked(q.x,q.y,35),(q,rotation)=>this.frontierOccupied(q,rotation));}catch(error){this.frontier.notice(p.id,error instanceof Error?error.message:"That craft could not be completed.",this.clock());}}
    if(input.service)this.service(p,input);
    if (input.skill) this.attack(p, true);
    if (input.attack && !p.action) this.attack(p, false);

    if(input.interact&&this.frontier&&!p.floor){
      const door=this.frontier.structures.find(s=>s.kind==="door"&&distance(p,s)<85&&this.visible(p,s)&&faces(p,s));
      if(door){try{this.frontier.command(p,{kind:"use",id:door.id},this.clock(),q=>canSee(p,q)&&faces(p,q),q=>buildingContains(q),(q,rotation)=>this.frontierOccupied(q,rotation));}catch(error){this.frontier.notice(p.id,error instanceof Error?error.message:"Step clear first.",this.clock());}}
      else if(Math.abs(p.x-riverCenter(p.y))<75)this.frontier.drink(p,this.clock());
      else if(!p.action)this.attack(p,false);
    }else if (input.interact) this.portal(p);

    return this.view(p);

  }

  snapshot(id: string, token: string) { const p = this.authenticate(id, token); this.advance(); p.lastSeen = this.clock(); return this.view(p); }

  // Private server checkpoint. Never expose this through a recipient snapshot.
  checkpoint(){return {frontier:this.frontier?.checkpoint()??null,savedAt:this.clock(),heroes:[...this.heroes.values()].map(p=>({...p,explored:[...p.explored]})),monsters:this.monsters.map(e=>({...e})),dragon:{...this.dragon},watch:this.watch?structuredClone(this.watch):null,cleared:[...this.cleared],villageDamage:this.villageDamage,effectId:this.effectId,callouts:this.callouts.map(c=>({...c})),warningCooldown:[...this.warningCooldown],threatened:[...this.threatened],rehearsals:[...this.rehearsals],chapterBase:{...this.chapterBase}};}
  restore(saved:ReturnType<LivingWorld["checkpoint"]>){
    const now=this.clock(),delta=Math.max(0,now-saved.savedAt),shift=(n:number|undefined)=>n?n+delta:0;
    if(!Number.isFinite(saved.savedAt)||!Array.isArray(saved.heroes)||saved.heroes.length>32||!Array.isArray(saved.monsters)||saved.monsters.length>256)throw Error("Invalid room checkpoint");
    this.heroes.clear();
    for(const row of saved.heroes){
      if(typeof row.id!=="string"||typeof row.token!=="string"||!CLASSES[row.heroClass]||!Number.isSafeInteger(row.seq))throw Error("Invalid adventurer checkpoint");
      const p={...row,explored:new Set(row.explored),input:{x:0,y:0},inputAt:0,lastSeen:Math.min(row.lastSeen,now-15001),moving:false};
      for(const key of ["webUntil","attackAt","dodgeAt","dodgeUntil","respawnAt","portalCooldown","nextAttack","nextSkill","nextDodge"] as const)p[key]=shift(p[key]);
      if(p.action){p.action={...p.action};for(const key of ["at","contactAt","recoveryAt","endsAt"] as const)p.action[key]=shift(p.action[key]);}
      this.heroes.set(p.id,p);
    }
    this.monsters=saved.monsters.map(row=>{const e={...row};for(const key of ["attackAt","nextAttack","deadAt","recoveryUntil","lastContactAt","slowUntil"] as const)e[key]=shift(e[key]);return e;});
    this.dragon={...saved.dragon};for(const key of ["attackAt","nextAttack","defeatedAt"] as const)this.dragon[key]=shift(this.dragon[key]);
    this.watch=saved.watch?structuredClone(saved.watch):null;if(this.watch)for(const key of ["startedAt","endedAt","stageStartedAt","regroupUntil"] as const)this.watch[key]=shift(this.watch[key]);
    this.frontier=null;if(saved.frontier){this.frontier=new FrontierState(now);this.frontier.restore(saved.frontier,delta);}
    this.cleared=new Set(saved.cleared);this.villageDamage=saved.villageDamage;this.effectId=saved.effectId;this.effects=[];
    this.callouts=saved.callouts.map(c=>({...c,at:shift(c.at)}));this.warningCooldown=new Map(saved.warningCooldown.map(([id,at])=>[id,shift(at)]));this.threatened=new Map(saved.threatened);this.rehearsals=new Map(saved.rehearsals);this.chapterBase={...saved.chapterBase};this.detours.clear();this.last=now;
  }

  advance() {

    const now = this.clock();

    const elapsed = Math.min(2000, Math.max(0, now - this.last));

    this.last = now;

    for (let remaining = elapsed; remaining > 0; remaining -= 50) this.tick(Math.min(50, remaining) / 1000, now - remaining + Math.min(50, remaining));

    this.effects = this.effects.filter(e => now - e.at < 1100);this.callouts=this.callouts.filter(c=>now-c.at<2800).slice(-64);

    // Profiles remain available for return visits; inactive heroes are omitted from live views.

  }

  private tick(dt: number, now: number) {

    for (const p of this.heroes.values()) {
      if(p.action){
        if(p.hp<=0)p.action=null;
        else {
          p.action.stage=combatStage(p.action,now);
          if(!p.action.resolved&&now>=p.action.contactAt){p.action.resolved=true;this.resolveAttack(p,p.action.skill,p.action.contactAt);}
          if(now>=p.action.endsAt)p.action=null;
        }
      }
      if(now-p.lastSeen>120000)continue;

      if (p.hp <= 0) {

        if (!this.watch && p.respawnAt <= now) { p.floor = 0; const inn=TOWNS.find(t=>t.id===p.lodge)!.inn;p.x=inn.x;p.y=buildingEntrance(inn).y; p.hp = p.maxHp; p.mp = p.maxMp; p.stamina = p.maxStamina; p.dodgeUntil = now + 8000; p.input = { x: 0, y: 0 };this.frontier?.respawn(p); }

        continue;

      }

      if(this.frontier&&!p.floor)this.frontier.tick(p,dt,now,inRiver(p.x,p.y));
      p.mp=Math.min(p.maxMp,p.mp+dt*4);

      p.stamina=Math.min(p.maxStamina,p.stamina+dt*(now-p.attackAt>800?18:3));

      const active = now - p.inputAt < 400 && (!this.watch||this.watch.state==="active"||this.watch.state==="forming");

      const dodging=p.dodgeAt>0 && now-p.dodgeAt<360;
      p.moving = dodging || active && Math.hypot(p.input.x, p.input.y) > MIN_TRAVEL;

      const speed = dodging ? CLASSES[p.heroClass].dash + p.agility*18 : (this.frontier&&!p.floor&&!p.sprint?100:155)*(this.frontier&&!p.floor&&inRiver(p.x,p.y)?.68:1)*((p.webUntil??0)>now?.65:1)*(this.watch?OATHS[this.watch.oath].speed:1)*(p.action?(p.action.stage==="intent"?1:p.action.stage==="recovery"?.75:.45):1);const mx=dodging?p.dodgeX:p.input.x,my=dodging?p.dodgeY:p.input.y;

      if (p.moving) {

        const blocked=(x:number,y:number)=>this.watch?watchBlocked({x,y}):!p.floor&&(buildingContains({x,y})||!!this.frontier?.blocked(x,y));

        const nx=clamp(p.x+mx*speed*dt,p.floor?675:60,p.floor?1725:2340);

        const ny=clamp(p.y+my*speed*dt,p.floor?530:60,p.floor?1780:2340);

        if(!blocked(nx,p.y))p.x=nx;

        if(!blocked(p.x,ny))p.y=ny;
        const bodies:Point[]=[...this.heroes.values()].filter(q=>q.id!==p.id&&q.floor===p.floor&&q.hp>0&&now-q.lastSeen<2000);if(!p.floor&&!this.frontier)bodies.push(...residents(now,this.dragon.state==="enraged"));
        for(const q of bodies){const d=distance(p,q);if(d>0&&d<22){const shift=(22-d)/2;p.x+=(p.x-q.x)/d*shift;p.y+=(p.y-q.y)/d*shift;}}


      }

      const tile = `${p.floor}:${Math.floor(p.x / 100)}:${Math.floor(p.y / 100)}`;

      if ((!this.watch||this.watch.state==="active")&&!p.explored.has(tile)) { p.explored.add(tile); p.awareness = Math.min(100, p.awareness + 1.3); }

      if (safe(p) && this.dragon.state !== "enraged") p.hp = Math.min(p.maxHp, p.hp + dt * 9);

      // Walking through an open doorway is enough. No ready or countdown gate.

      this.portal(p, true, now);

      // A living watch opponent occupies space; ordinary travel cannot walk through it.
      // A dash may cross the body during its existing escape window.
      if(this.watch&&p.dodgeUntil<=now)for(const e of this.monsters){
        if(e.hp<=0||e.floor!==p.floor)continue;
        const gap=p.heroClass==="Ironbound"?46:e.kind==="boss"?42:38,d=distance(p,e);if(d>=gap)continue;
        const nx=d>.001?(p.x-e.x)/d:-Math.cos(p.facing),ny=d>.001?(p.y-e.y)/d:-Math.sin(p.facing);
        const x=clamp(p.x+nx*(gap-d),675,1725),y=clamp(p.y+ny*(gap-d),530,1780);
        if(!watchBlocked({x,y})){p.x=x;p.y=y;}
      }

    }

    for (const e of this.monsters) {
      if(this.watch?.state==="forming"){this.rehearsalTick(e,now);continue;}
      if(this.watch&&(this.watch.state!=="active"||now<this.watch.regroupUntil))continue;

      if (e.hp <= 0) {

        if (e.floor === 0 && now - e.deadAt > 35000) { e.hp = e.maxHp; e.x = e.homeX; e.y = e.homeY; }

        continue;

      }

      const targets = [...this.heroes.values()].filter(p => p.hp > 0 && p.floor === e.floor && !safe(p) && now - p.lastSeen < 1500);

      const target = targets.sort((a,b) => distance(a,e) - distance(b,e))[0];

      if (e.attackAt) {

        if (now >= e.attackAt) {

          const radius = strikeRadius(e);

          if(this.watch&&e.attackPhase===3&&e.attackKind!=="sweep"&&!watchObstacle(e,{x:e.tx,y:e.ty},20)){e.x=e.tx;e.y=e.ty;}
          this.effect(e.tx,e.ty,e.floor,"hit",now,0);

          for (const p of targets) {const before=p.hp;if(distance(p,{x:e.tx,y:e.ty}) < radius&&(!this.watch||watchLineClear(e,p))&&(!this.frontier||e.floor>0||this.frontier.lineClear(e,p))&&this.hurt(p,(this.watch&&e.kind==="boss"?32:9+e.level*3)*(this.watch&&e.attackPhase===3?1.25:1),now,e)&&e.kind==="sentinel")p.webUntil=now+2000;if(this.watch&&this.threatened.get(e.id)?.includes(p.id)&&p.hp===before)this.watch.evades++;}
          this.threatened.delete(e.id);

          e.lastContactAt=now; e.attackAt = 0; e.recoveryUntil=now+(e.kind==="boss"?(this.watch?1400:950):650); e.nextAttack = now + Math.max(800,2000 - e.level * 45);

        }

      } else if (now < e.recoveryUntil) {
        // Committed enemy strikes leave a real opening; no chasing during recovery.
      } else if (target && distance(e,target) < (e.floor ? 600 : 255)) {

        e.facing = Math.atan2(target.y-e.y,target.x-e.x);

        if (distance(e,target) > 54 || this.watch&&!watchLineClear(e,target)) {
          const padding=e.kind==="boss"?20:10;let path=this.detours.get(e.id)??[];
          if(this.watch&&path.length&&distance(e,path[0])<8)path=path.slice(1);
          if(this.watch&&!path.length)path=watchDetour(e,target,padding);
          this.detours.set(e.id,path);const goal=path[0]??target;
          const direction=Math.atan2(goal.y-e.y,goal.x-e.x),speed=(45+e.level*2.4)*((e.slowUntil??0)>now?.45:1),travel=Math.min(speed*dt,distance(e,goal));
          const next={x:e.x+Math.cos(direction)*travel,y:e.y+Math.sin(direction)*travel};
          if((!this.watch||!watchObstacle(e,next,padding))&&(!this.frontier||e.floor>0||!this.frontier.blocked(next.x,next.y))){e.x=next.x;e.y=next.y;}
        }
        else if (now >= e.nextAttack) { const phase=this.watch?bossPhase(e):0;e.attackPhase=phase;e.attackKind=phase>=2&&(e.attackCount??0)%2===0?"sweep":"strike";e.attackCount=(e.attackCount??0)+1;e.tx=e.attackKind==="sweep"?e.x:target.x;e.ty=e.attackKind==="sweep"?e.y:target.y;e.attackAt=now+(e.kind === "boss" ? 1400 : 1050);e.lastContactAt=0;e.recoveryUntil=0;this.threatened.set(e.id,targets.filter(p=>distance(p,{x:e.tx,y:e.ty})<strikeRadius(e)).map(p=>p.id)); }

      } else {

        e.x += Math.sin(now / 2100 + e.homeY) * dt * 7; e.y += Math.cos(now / 2400 + e.homeX) * dt * 7;

        if (distance(e,{x:e.homeX,y:e.homeY}) > 80) {e.x+=(e.homeX-e.x)*dt*.2; e.y+=(e.homeY-e.y)*dt*.2;}

      }

    }

    if(this.watch&&this.watch.state==="active"&&this.heroes.size){
      if([...this.heroes.values()].some(p=>now-p.lastSeen<10000)&&[...this.heroes.values()].filter(p=>now-p.lastSeen<10000).every(p=>p.hp<=0)){this.finishChapter(now);this.watch.state="defeat";this.watch.endedAt=now;}
      else if(this.monsters.every(e=>e.hp<=0)){
        this.finishChapter(now);
        if(this.watch.stage===2){this.watch.state="victory";this.watch.endedAt=now;this.cleared.add(1);}
        else {this.watch.stage++;this.watch.regroupUntil=now+2400;this.watch.stageStartedAt=this.watch.regroupUntil;this.callouts=[];this.threatened.clear();for(const p of this.heroes.values()){p.action=null;p.input={x:0,y:0};}this.watchWave();}
      }
    }
    if(!this.watch)this.tickDragon(dt,now);

  }

  private tickDragon(dt:number, now:number) {

    const d=this.dragon;

    if (d.state === "defeated") { if(now-d.defeatedAt>180000) {d.state="sleeping";d.hp=d.maxHp;d.x=NEST.x;d.y=NEST.y;} return; }

    if (d.state === "sleeping") return;

    if (d.kills >= 10) {d.state="returning";d.attackAt=0;}

    if (d.state === "returning") {

      d.facing=Math.atan2(NEST.y-d.y,NEST.x-d.x); d.x+=Math.cos(d.facing)*130*dt;d.y+=Math.sin(d.facing)*130*dt;

      if(distance(d,NEST)<12) {d.state="sleeping";d.x=NEST.x;d.y=NEST.y;d.hp=d.maxHp;d.kills=0;}

      return;

    }

    const players=[...this.heroes.values()].filter(p=>p.floor===0&&p.hp>0&&now-p.lastSeen<2000);

    const nearest=players.sort((a,b)=>distance(a,d)-distance(b,d))[0];

    // The village draws its rampage whenever no adventurer is close enough to distract it.

    const target=nearest&&distance(nearest,d)<420 ? nearest : VILLAGE;

    d.facing=Math.atan2(target.y-d.y,target.x-d.x);

    if(d.attackAt) {

      if(now>=d.attackAt) {

        this.effect(d.tx,d.ty,0,"fire",now,d.facing);

        for(const p of players) if(d.kills<10&&distance(p,{x:d.tx,y:d.ty})<175) { const wasAlive=p.hp>0;this.hurt(p,150,now);if(wasAlive&&p.hp<=0)d.kills++; }

        if(distance({x:d.tx,y:d.ty},VILLAGE)<310)this.villageDamage=Math.min(100,this.villageDamage+25);

        d.attackAt=0;d.nextAttack=now+2200;

      }

    } else if(distance(d,target)>180) {d.x+=Math.cos(d.facing)*105*dt; d.y+=Math.sin(d.facing)*105*dt;}

    else if(now>=d.nextAttack) {d.tx=target.x;d.ty=target.y;d.attackAt=now+2300;}

  }

  private hurt(p:PrivateHero,damage:number,now:number,source?:Point & {kind?:Monster["kind"];attackKind?:Monster["attackKind"]}) {

    if(p.hp<=0||p.dodgeUntil>now)return false;
    if(p.heroClass==="Knight"&&p.action?.skill&&now-p.action.at<=260&&source&&distance(p,source)<120&&faces(p,source)){p.action.hit=true;if(this.watch)this.watch.parries++;this.effect(p.x,p.y,p.floor,"parry",now,p.facing);return false;}
    if(p.heroClass==="Ironbound"&&p.action?.skill&&p.action.resolved&&now>=p.action.contactAt)damage*=.35;
    if(this.watch)damage*=OATHS[this.watch.oath].incoming;

    if(this.watch){this.watch.hitsTaken++;const kind=source?.kind==="boss"?(source.attackKind==="sweep"?"sweep":"strike"):source?.kind==="sentinel"?"sentinel":"scout";this.watch.hitsByKind[kind]++;}
    p.hp=Math.max(0,p.hp-damage*(p.heroClass==="Ironbound"?.8:1));this.effect(p.x,p.y,p.floor,"hit",now,0,Math.round(damage));

    if(p.hp===0) {p.deaths++;p.respawnAt=now+12000;p.input={x:0,y:0};}return true;

  }

  private reward(p:PrivateHero,amount:number) {

    if(this.watch)return;
    p.xp+=amount; p.gold+=Math.floor(amount*25); p.awareness=Math.min(100,p.awareness+2);

    while(p.level<20&&p.xp>=requiredXp(p.level)) {p.xp-=requiredXp(p.level);p.level++;p.abilityPoints+=2;p.maxHp=CLASSES[p.heroClass].hp+(p.level-1)*22+p.training.strength*6;p.hp=p.maxHp;}

  }

  private attack(p:PrivateHero,skill:boolean) {

    const now=this.clock(); if(this.watch&&now<this.watch.regroupUntil&&!(skill&&(p.heroClass==="Ironbound"||p.equippedSkill==="Renew")))return; if(p.action||p.dodgeAt>0&&now<p.dodgeAt+360||now<(skill?p.nextSkill:p.nextAttack))return;

    if(skill&&p.equippedSkill==="Survey")return;
    const caster=p.heroClass==="Spellweaver"||p.heroClass==="Warden";
    const manaCost=caster? (skill?32:9):skill?12:0;

    const staminaCost=!caster?(skill?28:10):0;

    if(p.mp<manaCost||p.stamina<staminaCost)return;

    if(this.watch?.state!=="forming"){p.mp-=manaCost;p.stamina-=staminaCost;}

    if(skill)p.nextSkill=now+6500;else p.nextAttack=now+550;

    p.attackAt=now;p.attackStyle=skill?2:(p.attackStyle===0?1:0);
    p.action=beginAction(p.heroClass,skill,p.facing,now);
  }

  private cover(helper:PrivateHero,protectedIds:string[],now:number){
    if(this.watch?.state!=="active"&&!this.frontier)return;
    for(const id of new Set(protectedIds)){
      const ally=this.heroes.get(id);if(!ally||ally.hp<=0||id===helper.id||!helper.party||ally.party!==helper.party||ally.floor!==helper.floor)continue;
      const call=this.callouts.findLast(c=>c.caller===id&&now-c.at<2800);if(!call||call.coveredBy)continue;
      call.coveredBy=helper.id;if(this.watch)this.watch.covers++;this.effect(ally.x,ally.y,ally.floor,"cover",now,0);
    }
  }

  private attackDamage(p:PrivateHero,skill:boolean,positional:boolean,opening:boolean){
    const caster=p.heroClass==="Spellweaver"||p.heroClass==="Warden";
    const damage=(caster?(p.heroClass==="Warden"?14:23):p.weapon?28:12)+p.level*7+(caster?p.intelligence*3:p.strength*3)+(p.weapon?8:0);
    return damage*(this.watch?OATHS[this.watch.oath].damage:1)*(opening?OPENING_DAMAGE:1)*(skill?(p.heroClass==="Rogue"?(positional?3.2:1.35):1.8):1);
  }

  private resolveAttack(p:PrivateHero,skill:boolean,now:number){
    const caster=p.heroClass==="Spellweaver"||p.heroClass==="Warden";
    // Facing is locked until recovery; contact rechecks range, line of sight and life state.
    if(!p.action||p.hp<=0)return;
    p.facing=p.action.facing;
    if(this.watch?.state==="forming"){
      const range=caster?(skill?230:COMBAT[p.heroClass].reach):skill?95:COMBAT[p.heroClass].reach;
      const target=this.monsters.find(e=>e.hp>0&&canSee(p,e)&&faces(p,e)&&watchLineClear(p,e)&&distance(p,e)<range);
      const support=skill&&(p.heroClass==="Ironbound"||p.equippedSkill==="Renew");p.action.hit=!!target||support;
      this.effect(p.x,p.y,p.floor,support?(p.heroClass==="Ironbound"?"ward":"heal"):caster?(skill?"starfall":"spell"):skill?"crescent":"slash",now,p.facing,undefined,!support&&target?{x:target.x,y:target.y}:undefined,range,p.heroClass);
      if(target&&!support){
        const opening=!target.attackAt&&target.recoveryUntil>now,positional=p.heroClass==="Rogue"&&skill&&inBackArc(target,p);
        this.drill(p).contact=true;if(opening){this.drill(p).opening=true;p.action.opening=true;}
        const dealt=Math.min(target.hp,this.attackDamage(p,skill,positional,opening));target.hp-=dealt;
        this.effect(target.x,target.y,target.floor,"hit",now,0,Math.round(dealt));
        if(skill&&p.heroClass==="Spellweaver")target.slowUntil=now+2500;
        if(positional)this.effect(target.x,target.y,target.floor,"backstab",now,p.facing);
        if(skill&&p.heroClass==="Rogue"&&target.attackAt){target.attackAt=0;target.lastContactAt=0;target.recoveryUntil=now+850;target.nextAttack=now+1400;this.threatened.delete(target.id);this.effect(target.x,target.y,target.floor,"interrupt",now,0);}
        if(target.hp<=0){target.deadAt=now;target.attackAt=0;target.lastContactAt=0;target.recoveryUntil=0;this.threatened.delete(target.id);this.effect(target.x,target.y,target.floor,"defeat",now,p.facing);}
      }
      this.effect(target?.x??p.x,target?.y??p.y,p.floor,"practice",now,0);return;
    }


    if(skill&&(p.equippedSkill==="Renew"||p.heroClass==="Ironbound")) {if(p.heroClass==="Ironbound"){p.action.hit=true;this.effect(p.x,p.y,p.floor,"ward",now,p.facing);}for(const ally of this.heroes.values())if(ally.hp>0&&ally.floor===p.floor&&now-ally.lastSeen<2000&&(ally.id===p.id||p.equippedSkill==="Renew"&&p.party&&ally.party===p.party&&distance(p,ally)<160&&canSee(p,ally)&&faces(p,ally)&&(!this.watch||watchLineClear(p,ally))&&(!this.frontier||p.floor>0||this.frontier.lineClear(p,ally)))){if(p.equippedSkill==="Renew"&&(ally.webUntil??0)>now){ally.webUntil=0;p.action.hit=true;if(this.watch)this.watch.cleanses++;this.cover(p,[ally.id],now);this.effect(ally.x,ally.y,ally.floor,"cleanse",now,0,undefined,{x:p.x,y:p.y});}const restored=Math.min(ally.maxHp-ally.hp,p.heroClass==="Ironbound"?24+p.level*2:65+p.level*6);ally.hp+=restored;if(restored>0){p.action.hit=true;if(this.watch)this.watch.healing+=restored;this.cover(p,[ally.id],now);this.effect(ally.x,ally.y,ally.floor,"heal",now,0,restored,{x:p.x,y:p.y});}}return;}

    const range=caster? (skill?230:COMBAT[p.heroClass].reach):skill?95:COMBAT[p.heroClass].reach;

    const clearHit=(target:Point)=>this.watch?watchLineClear(p,target):p.floor>0||(!this.frontier||this.frontier.lineClear(p,target))&&!Array.from({length:6},(_,i)=>(i+1)/7).some(t=>buildingContains({x:p.x+(target.x-p.x)*t,y:p.y+(target.y-p.y)*t},0));
    const monsters=this.monsters.filter(e=>e.floor===p.floor&&e.hp>0&&canSee(p,e)&&faces(p,e)&&clearHit(e)&&distance(p,e)<range);

    const rivals=this.watch?[]:[...this.heroes.values()].filter(q=>q.id!==p.id&&q.floor===p.floor&&q.hp>0&&now-q.lastSeen<2000&&!(p.party&&p.party===q.party)&&!safe(q)&&!safe(p)&&canSee(p,q)&&faces(p,q)&&clearHit(q)&&distance(p,q)<range);

    const dragon=p.floor===0&&this.dragon.hp>0&&this.dragon.state!=="returning"&&canSee(p,this.dragon)&&faces(p,this.dragon)&&distance(p,this.dragon)<range+85?this.dragon:null;

    const targets=[...monsters,...rivals,...(dragon?[dragon]:[])].sort((a,b)=>distance(a,p)-distance(b,p));

    if(!targets.length&&!p.floor){const protectedPerson=[...(this.frontier?[]:residents(now,this.dragon.state==="enraged")),...[...this.heroes.values()].filter(q=>q.id!==p.id&&q.floor===0&&(safe(q)||safe(p)))].find(q=>distance(p,q)<range&&canSee(p,q));if(protectedPerson)this.effect(protectedPerson.x,protectedPerson.y,0,"guard",now,0);}
    if(!skill&&!targets.length&&this.frontier&&!p.floor){const node=this.frontier.gather(p,now,q=>canSee(p,q)&&faces(p,q)&&clearHit(q));if(node){p.action.hit=true;this.effect(node.x,node.y,0,"hit",now,p.facing);return;}}
    p.action.hit=targets.length>0;
    if(this.watch?.state==="active"){if(!targets.length)this.watch.misses++;else if((skill?targets:targets.slice(0,1)).some(t=>"recoveryUntil" in t&&!t.attackAt&&t.recoveryUntil>now)){p.action.opening=true;this.watch.openings++;}}

    this.effect(p.x,p.y,p.floor,caster?(skill?"starfall":"spell"):skill?"crescent":"slash",now,p.facing,p.attackStyle,targets[0]?{x:targets[0].x,y:targets[0].y}:undefined,range,p.heroClass);

    for(const target of skill?targets:targets.slice(0,1)) {

      const positional=p.heroClass==="Rogue"&&skill&&"facing" in target&&inBackArc(target,p);
      // Evaluate each actual contact independently, including multi-target skills.
      // A new preparation closes the opening even if an old recovery deadline remains.
      const opening=this.watch?.state==="active"&&"recoveryUntil" in target&&!target.attackAt&&target.recoveryUntil>now;
      const hit=this.attackDamage(p,skill,positional,!!opening);

      if(target===this.dragon) {

        if(this.dragon.state==="sleeping") {this.dragon.state="enraged";this.dragon.kills=0;this.dragon.nextAttack=now+1800;}

        this.dragon.hp=Math.max(0,this.dragon.hp-hit);this.effect(target.x,target.y,0,"hit",now,0,Math.round(hit));

        if(this.dragon.hp===0) {this.dragon.state="defeated";this.dragon.defeatedAt=now; for(const ally of this.heroes.values())if(ally.floor===0&&distance(ally,this.dragon)<650)this.reward(ally,1800);}

      } else if("token" in target) {

        const hp=target.hp;this.hurt(target as PrivateHero,hit,now,p);if(hp>0&&target.hp<=0){p.kills++;this.reward(p,50);}

      } else {

        const e=target as Monster;if(skill&&p.heroClass==="Spellweaver")e.slowUntil=now+2500;if(positional)this.effect(e.x,e.y,e.floor,"backstab",now,p.facing);if(p.heroClass==="Rogue"&&skill&&e.attackAt){this.cover(p,this.threatened.get(e.id)??[],now);e.attackAt=0;e.lastContactAt=0;this.threatened.delete(e.id);if(this.watch)this.watch.interrupts++;this.effect(e.x,e.y,e.floor,"interrupt",now,0);e.recoveryUntil=now+850;e.nextAttack=now+1400;}e.hp=Math.max(0,e.hp-hit);this.effect(e.x,e.y,e.floor,"hit",now,0,Math.round(hit));

        if(e.hp===0) {if(e.attackAt)this.cover(p,this.threatened.get(e.id)??[],now);e.deadAt=now;e.attackAt=0;this.effect(e.x,e.y,e.floor,"defeat",now,p.facing);if(e.floor===0)for(const ally of this.heroes.values())if(ally.mission===1&&ally.hp>0&&ally.floor===0&&now-ally.lastSeen<2000&&distance(ally,e)<300&&(ally.id===p.id||p.party&&ally.party===p.party))ally.missionKills++;this.reward(p,20+e.level*12+(e.kind==="boss"?100:0));}

      }

    }

    if(!this.watch&&p.floor>0&&this.monsters.filter(e=>e.floor===p.floor).every(e=>e.hp<=0))this.cleared.add(p.floor);

  }

  service(p:PrivateHero,input:Input){
    if(this.watch||p.floor||p.hp<=0)return;
    const town=TOWNS.find(t=>distance(p,input.service==="rest"?t.inn:t.guild)<115);
    if(!town)throw Error("Approach the building entrance first.");
    if(input.service==="mission"&&!p.mission){p.mission=1;p.missionKills=0;p.missionClaimed=false;}
    if(input.service==="claim"&&p.mission===1&&p.missionKills>=3&&!p.missionClaimed){p.missionClaimed=false;p.mission=2;this.reward(p,120);}
    else if(input.service==="claim"&&p.mission===2&&this.cleared.has(1)&&!p.missionClaimed){p.missionClaimed=true;this.reward(p,200);}

    if(input.service==="rest"){p.lodge=town.id;p.hp=p.maxHp;p.mp=p.maxMp;p.stamina=p.maxStamina;}
    if(input.service==="party"){const code=(input.partyCode??"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,8);p.party=code;}
  }

  develop(id:string,token:string,kind:unknown,key:unknown){
    const p=this.authenticate(id,token);if(p.hp<=0)throw Error("Return to life first.");
    if(this.watch&&(kind!=="equip"||key!==CLASSES[p.heroClass].skill))throw Error("Company watches use fixed class builds. Choose another class for a new company.");
    if(typeof key!=="string")throw Error("Invalid selection");
    if(kind==="upgrade"){
      if(!ATTRIBUTES.includes(key as Attribute))throw Error("Unknown attribute");
      const attr=key as Attribute;if(p.abilityPoints<1)throw Error("Earn ability points by leveling up.");
      if(p.training[attr]>=20)throw Error("This attribute is fully trained.");
      p.abilityPoints--;p.training[attr]++;
      if(attr==="strength"){p.strength++;const gain=Math.round(6*(this.watch?OATHS[this.watch.oath].health:1));p.maxHp+=gain;p.hp+=gain;}
      if(attr==="stamina"){p.maxStamina+=8;p.stamina+=8;}
      if(attr==="mp"){p.maxMp+=10;p.mp+=10;}
      if(attr==="awareness")p.awareness=Math.min(100,p.awareness+4);
      if(attr==="agility")p.agility++;if(attr==="intelligence")p.intelligence++;
    }else if(kind==="equip"){
      if(p.action)throw Error("Finish your current action before changing skills.");
      if(key!==CLASSES[p.heroClass].skill&&!(key==="Renew"&&p.heroClass==="Spellweaver")&&!(key==="Survey"&&p.heroClass==="Rogue"&&p.level>=5))throw Error("That skill is locked for this build.");
      p.equippedSkill=key;
    }else if(kind==="buy"||kind==="wear"){
      if(p.floor||!TOWNS.some(t=>distance(p,t)<320*t.size))throw Error("Visit a town atelier to shop.");
      const item=ITEMS.find(i=>i.id===key);if(!item)throw Error("Unknown item");
      if(item.type==="weapon"&&((key==="focus")!==(p.heroClass==="Spellweaver"||p.heroClass==="Warden")))throw Error("Choose the weapon for your build.");
      if(kind==="buy"){
        if(item.type!=="consumable"&&p.inventory.includes(key))throw Error("You already own this item. Equip it instead.");
        if(p.gold<item.price)throw Error("You need more coin.");
        if(item.type==="consumable"&&p.hp>=p.maxHp)throw Error("Your health is already full.");
        p.gold-=item.price;if(item.type!=="consumable")p.inventory.push(key);
      }else if(!p.inventory.includes(key)||item.type==="consumable")throw Error("Purchase this item first.");
      if(item.type==="weapon")p.weapon=key;if(item.type==="hair")p.hair=key;if(item.type==="accessory")p.accessory=key;
      if(item.type==="consumable")p.hp=Math.min(p.maxHp,p.hp+70);
    }else throw Error("Unknown character action");
    return this.view(p);
  }
  resume(id:string,token:string){const p=this.authenticate(id,token);const town=TOWNS.find(t=>t.id===p.lodge)??TOWNS[0];if(!this.watch&&!this.frontier){p.floor=0;p.x=town.inn.x;p.y=buildingEntrance(town.inn).y;}if(!this.watch&&!this.frontier)p.facing=-Math.PI*.85;p.input={x:0,y:0};p.inputAt=this.clock();if(!this.watch&&!this.frontier)p.action=null;p.lastSeen=this.clock();if(!this.watch&&!this.frontier){p.hp=p.maxHp;p.mp=p.maxMp;p.stamina=p.maxStamina;}return this.view(p);}
  saveProfiles(){return [...this.heroes.values()].map(p=>({...p,explored:[...p.explored]}));}
  loadProfiles(rows:ReturnType<LivingWorld["saveProfiles"]>){for(const row of rows){this.heroes.set(row.id,{...newGrowth(row.heroClass),...row,training:row.training??newGrowth(row.heroClass).training,action:null,input:{x:0,y:0},inputAt:0,lastSeen:0,explored:new Set(row.explored)});}}
  private portal(p:PrivateHero,automatic=false,now=this.clock()) {
    if(this.frontier)return;

    if(p.hp<=0||p.portalCooldown>now)return;

    const radius=automatic?32:105;

    let next:number|null=null;

    if(!p.floor&&distance(p,GATE)<radius)next=1;

    if(p.floor&&distance(p,{x:1200,y:1650})<radius)next=p.floor===1?0:p.floor-1;

    if(p.floor&&this.cleared.has(p.floor)&&distance(p,{x:1200,y:650})<radius)next=p.floor===10?0:p.floor+1;

    if(this.watch||next===null||p.action)return;

    const descending=next>p.floor;p.floor=next;

    p.x=next?1200:GATE.x;p.y=next?(descending?1550:750):GATE.y+110;p.facing=descending?-Math.PI/2:Math.PI/2;

    p.portalCooldown=now+2500;p.input={x:0,y:0};p.dodgeUntil=now+2500;

    this.effect(p.x,p.y,p.floor,"portal",now,0);

  }

  private effect(x:number,y:number,floor:number,kind:Effect["kind"],at:number,angle:number,value?:number,to?:Point,radius?:number,style?:HeroClass){this.effects.push({id:++this.effectId,x,y,floor,kind,at,angle,value,to:to?{...to}:undefined,radius,style});if(this.effects.length>160)this.effects.shift();}

  private publicHero(p:PrivateHero):Hero { const {dodgeAt,attackStyle,mission,missionKills,missionClaimed,lodge,party,id,name,heroClass,x,y,hp,maxHp,mp,maxMp,stamina,maxStamina,level,xp,awareness,floor,facing,kills,deaths,attackAt,dodgeUntil,respawnAt,portalCooldown,moving}=p;return {webUntil:p.webUntil??0,action:p.action?{...p.action,stage:combatStage(p.action,this.clock())}:null,gold:p.gold,abilityPoints:p.abilityPoints,strength:p.strength,agility:p.agility,intelligence:p.intelligence,training:{...p.training},weapon:p.weapon,hair:p.hair,accessory:p.accessory,equippedSkill:p.equippedSkill,inventory:[...p.inventory],dodgeAt,dodgeCooldown:Math.max(0,p.nextDodge-this.clock()),attackStyle,mission,missionKills,missionClaimed,lodge,party,id,name,heroClass,x,y,hp,maxHp,mp,maxMp,stamina,maxStamina,level,xp,awareness,floor,facing,kills,deaths,attackAt,dodgeUntil,respawnAt,portalCooldown,moving,cooldown:Math.max(0,p.nextAttack-this.clock()),skillCooldown:Math.max(0,p.nextSkill-this.clock())}; }

  private visible(p:PrivateHero,q:Point){return canSee(p,q)&&(!this.frontier||p.floor>0||this.frontier.lineClear(p,q));}
  private view(p:PrivateHero):WorldView {return {
    ...(this.frontier&&!p.floor?{frontier:this.frontier.view(p,this.clock(),q=>this.visible(p,q),q=>distance(p,q)<sight(p.awareness).range)}:{}),


    company:p.party?[...this.heroes.values()].filter(q=>q.party===p.party).map(q=>({id:q.id,name:q.name,heroClass:q.heroClass,online:this.clock()-q.lastSeen<15000})):[],
    watch:this.watch?{...this.watch,hitsByKind:this.watch.state==="victory"||this.watch.state==="defeat"?{...this.watch.hitsByKind}:{scout:0,sentinel:0,strike:0,sweep:0},chapters:this.watch.chapters.map(c=>({...c}))}:null,
    rehearsal:this.watch?.state==="forming"?{...this.drill(p)}:undefined,
    ownCall:this.callouts.filter(c=>c.caller===p.id&&this.clock()-c.at<2800).map(c=>({at:c.at,answeredBy:c.coveredBy?this.heroes.get(c.coveredBy)?.name:undefined})).at(-1),
    warnings:this.callouts.filter(c=>this.clock()-c.at<2800&&c.caller!==p.id).flatMap(c=>{const ally=this.heroes.get(c.caller);if(!ally||!p.party||ally.party!==p.party||ally.floor!==p.floor)return [];const a=Math.atan2(Math.sin(Math.atan2(ally.y-p.y,ally.x-p.x)-p.facing),Math.cos(Math.atan2(ally.y-p.y,ally.x-p.x)-p.facing));return [{name:ally.name,at:c.at,answeredBy:c.coveredBy?this.heroes.get(c.coveredBy)?.name:undefined,relative:(Math.abs(a)>Math.PI*.75?"behind":Math.abs(a)<Math.PI*.25?"ahead":a<0?"left":"right") as Warning["relative"]}];}),

    selfId:p.id,inputSequence:p.seq,time:this.clock(),heroes:[...this.heroes.values()].filter(q=>this.clock()-q.lastSeen<120000&&q.floor===p.floor&&(q.id===p.id||this.visible(p,q))).map(q=>{const hero=this.publicHero(q);if(q.id!==p.id&&hero.action)delete hero.action.opening;return hero;}),

    monsters:this.monsters.filter(e=>e.floor===p.floor&&e.hp>0&&this.visible(p,e)).map(e=>({id:e.id,x:e.x,y:e.y,kind:e.kind,floor:e.floor,level:e.level,hp:e.hp,maxHp:e.maxHp,attackAt:e.attackAt,lastContactAt:e.lastContactAt??0,deadAt:e.deadAt,facing:e.facing,recoveryUntil:e.recoveryUntil,slowUntil:e.slowUntil,attackKind:e.attackKind})),

    dragon:p.floor===0&&this.visible(p,this.dragon)?{x:this.dragon.x,y:this.dragon.y,state:this.dragon.state,hp:this.dragon.hp,maxHp:this.dragon.maxHp,kills:this.dragon.kills,facing:this.dragon.facing,attackAt:this.dragon.attackAt,defeatedAt:this.dragon.defeatedAt}:null,

    effects:this.effects.filter(e=>e.floor===p.floor&&this.visible(p,e)).map(e=>({...e,to:e.to&&this.visible(p,e.to)?{...e.to}:undefined})),

    cleared:[...this.cleared],villageDamage:p.floor===0&&this.visible(p,VILLAGE)?this.villageDamage:0,population:[...this.heroes.values()].filter(q=>this.clock()-q.lastSeen<120000).length,
    partyMembers:p.party?[...this.heroes.values()].filter(q=>q.id!==p.id&&q.party===p.party&&this.clock()-q.lastSeen<120000).map(q=>({id:q.id,x:q.x,y:q.y,floor:q.floor})):[],

    floorRemaining:this.monsters.filter(e=>e.floor===p.floor&&e.hp>0).length

  };}



}


