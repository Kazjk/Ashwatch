"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";

import {useRouter} from "next/navigation";
import { TUTORIAL_STEPS, nextTutorialStep } from "./navigation";

import {DEFAULTS,PREFERENCE_KEY,parsePreferences,lookDelta,stick,turnRate,type Preferences} from "./controls";
import {CLASSES,hasSurvey,type ClassName} from "./progression";
import {CharacterPanel} from "./character-panel";
import {Rebirth} from "./rebirth";
import {roomFromSearch,inviteUrl} from "./invite";
import {ENCOUNTERS,watchAdvice} from "./watch-report";
import {OATHS,type OathId} from "./oaths";
import {watchEnemy} from "./watch-enemies";
import {readTarget,readSupport,visibleFacing} from "./targeting";
import {playerInput,TravelIntent,FacingIntent,preserveCombatFacing} from "./player-controls";
import { SkillIntent } from "./skill-intent";
import { GamepadInput } from "./gamepad";
import { Scene } from "./scene3d";
import { Feedback } from "./feedback";
import { ResponseOrder,nextSequence,repeatStrike } from "./client-state";
import {readSavedSession,restoreSession,type Session} from "./session-recovery";
import {worldRequest} from "./world-request";
import {riverCenter,canopyOverlaps} from "./frontier-land";
import {FrontierPanel} from "./frontier-panel";
import {buildPoint,frontierNight,type FrontierCommand,type StructureKind} from "./frontier";
import "./frontier/frontier.css";

import { TOWNS, BUILDINGS, buildingEntrance, GATE, distance, requiredXp, type HeroClass, type WorldView } from "./world";

const FREE_PLAYTEST=process.env.NEXT_PUBLIC_ASHWATCH_HOSTING==="free";

function store(key:string,value:string|null){try{if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value);}catch{}}

async function request<T>(body:object,signal?:AbortSignal):Promise<T>{const deadline=signal?AbortSignal.any([signal,AbortSignal.timeout(4000)]):AbortSignal.timeout(4000);return worldRequest<T>(body,(payload,attemptSignal)=>fetch("/api/world",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload),signal:attemptSignal}),deadline);}

function classIcon(cls:HeroClass){return {Knight:"sword",Spellweaver:"star",Ironbound:"hammer",Rogue:"daggers",Warden:"leaf"}[cls];}

function Icon({kind}:{kind:string}){return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">{kind==="sword"?<><path d="m5 20 4-4m-3-3 5 5M9 15 19 3l2 1-2 5-8 8M4 18l2 2"/></>:kind==="hammer"?<path d="M6 3h12v7H6ZM11 10v11h2V10M3 5h3m12 0h3"/>:kind==="daggers"?<path d="m4 3 7 8-2 2-8-7 3-3Zm16 0-7 8 2 2 8-7-3-3ZM7 12l5 5m-9-1 4-4m10 0-5 5m9-1-4-4"/>:kind==="leaf"?<path d="M12 21V9m0 6C4 16 3 10 4 5c5 0 8 3 8 8m0 3c8 0 9-5 8-10-5 0-8 3-8 8"/>:kind==="star"?<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/>:kind==="dodge"?<><path d="m11 4 8 8-8 8M4 5l7 7-7 7"/></>:kind==="map"?<><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3ZM9 3v15m6-12v15"/></>:<><circle cx="12" cy="12" r="9"/><path d="m16 7-2 7-6 3 2-7Z"/></>}</svg>;}

export default function Game({initialAdventure="watch"}:{initialAdventure?:"watch"|"frontier"}={}){
 const router=useRouter();
 const sessionKey=initialAdventure==="frontier"?"ashwatch-frontier-v1":"ashwatch-world-v1";
 const [crafting,setCrafting]=useState(false),[building,setBuilding]=useState<StructureKind|null>(null),[buildRotation,setBuildRotation]=useState(0);
 const frontierPending=useRef<FrontierCommand|undefined>(undefined),buildingRef=useRef<StructureKind|null>(null),rotationRef=useRef(0);

 const canvas=useRef<HTMLCanvasElement>(null), scene=useRef<Scene|null>(null), live=useRef<WorldView|null>(null);

 const [restoring,setRestoring]=useState(true);
 const [view,setView]=useState<WorldView|null>(null),[session,setSession]=useState<Session|null>(null),[name,setName]=useState(""),[heroClass,setHeroClass]=useState<HeroClass>("Knight"),[entering,setEntering]=useState(false),[error,setError]=useState(""),[help,setHelp]=useState(false),[stats,setStats]=useState(false),[map,setMap]=useState(false),[online,setOnline]=useState(true),[journal,setJournal]=useState(false),[destination,setDestination]=useState("guild"),[partyCode,setPartyCode]=useState(""),[notice,setNotice]=useState(""),[thumb,setThumb]=useState({x:0,y:0}),[tutorial,setTutorial]=useState(0);

 const previewClassRef=useRef(heroClass);useEffect(()=>{previewClassRef.current=heroClass;},[heroClass]);
 const [rebirth,setRebirth]=useState(false);const introActive=useRef(false);
 useEffect(()=>{introActive.current=rebirth;},[rebirth]);
 useEffect(()=>{let seen=false;try{seen=!!localStorage.getItem("ashwatch-rebirth-v1")||!!localStorage.getItem(sessionKey);}catch{}queueMicrotask(()=>setRebirth(false));void seen;},[sessionKey]);
 const [adventureKind,setAdventureKind]=useState<string>(initialAdventure),[rehearsing,setRehearsing]=useState(false);const previewKind=useRef<string>(initialAdventure);useEffect(()=>{previewKind.current=adventureKind;},[adventureKind]);
 const [companyOath,setCompanyOath]=useState<OathId>("lantern");
 const [roomMode,setRoomMode]=useState("create"),[roomCode,setRoomCode]=useState("");
 useEffect(()=>{const room=roomFromSearch(window.location.search);if(room)queueMicrotask(()=>{setRoomMode("join");setRoomCode(room);});},[]);
 const keys=useRef(new Set<string>()), touch=useRef({x:0,y:0}), pending=useRef({attack:false,skill:false,dodge:false,interact:false,warn:false}), heldAttack=useRef(false),sequence=useRef(0),aim=useRef<number|undefined>(undefined),cameraOrbit=useRef(-Math.PI/2);

 const [runMode,setRunMode]=useState(false),runHeld=useRef(false);
 const toggleRun=()=>{if(blocked.current)return;runHeld.current=!runHeld.current;setRunMode(runHeld.current);};
 const facingIntent=useRef(new FacingIntent()),travelIntent=useRef(new TravelIntent()),skillIntent=useRef(new SkillIntent()),dashIntent=useRef(new SkillIntent());
 const queueSkill=()=>skillIntent.current.press(Date.now());
 const queueDash=()=>dashIntent.current.press(Date.now());
 const faceCall=()=>{const call=live.current?.warnings.at(-1),hero=live.current?.heroes.find(p=>p.id===live.current?.selfId);if(blocked.current||!call||!hero)return;aim.current=hero.facing+({ahead:0,left:-Math.PI/2,right:Math.PI/2,behind:Math.PI}[call.relative]);cameraOrbit.current=aim.current;facingIntent.current.request(aim.current);travelIntent.current.reset();};
 const faceThreat=(orbit=true)=>{if(!orbit&&live.current?.frontier)return;if(blocked.current||!live.current)return;const hero=live.current.heroes.find(p=>p.id===live.current?.selfId);if(!hero)return;const angle=visibleFacing(live.current,hero);if(angle!==null){aim.current=angle;if(orbit){cameraOrbit.current=angle;facingIntent.current.request(angle);travelIntent.current.reset();}}};
 const faceSupport=()=>{const v=live.current,p=v?.heroes.find(h=>h.id===v.selfId);if(blocked.current||!v||!p)return;const ally=readSupport(v,p);if(ally&&ally.id!==p.id){aim.current=Math.atan2(ally.y-p.y,ally.x-p.x);cameraOrbit.current=aim.current;facingIntent.current.request(aim.current);travelIntent.current.reset();}};
 const controllerInput=useRef(new GamepadInput()),controllerMove=useRef({x:0,y:0}),controllerAttack=useRef(false),controllerTurning=useRef(false);
 const feedback=useRef<Feedback|null>(null), blocked=useRef(false), quality=useRef(false), reduced=useRef(false), order=useRef(new ResponseOrder()), requests=useRef(0);
 const [sound,setSound]=useState(false),[lowQuality,setLowQuality]=useState(false),[reduceMotion,setReduceMotion]=useState(false);
 const [preferences,setPreferences]=useState<Preferences>({...DEFAULTS});const preferenceRef=useRef<Preferences>({...DEFAULTS}),lookPointer=useRef<{id:number;x:number}|null>(null);
 const changePreferences=(patch:Partial<Preferences>)=>{const value={...preferenceRef.current,...patch};preferenceRef.current=value;setPreferences(value);quality.current=value.performance;reduced.current=value.reducedMotion;setLowQuality(value.performance);setReduceMotion(value.reducedMotion);setSound(value.sound);feedback.current?.setVolume(value.volume);store(PREFERENCE_KEY,JSON.stringify(value));};
 useEffect(()=>{let raw=null;try{raw=localStorage.getItem(PREFERENCE_KEY);}catch{}const value=parsePreferences(raw);if(!raw)value.reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches;preferenceRef.current=value;quality.current=value.performance;reduced.current=value.reducedMotion;queueMicrotask(()=>{setPreferences(value);setLowQuality(value.performance);setReduceMotion(value.reducedMotion);setSound(value.sound);});},[]);
 const resetInput=()=>{runHeld.current=false;setRunMode(false);frontierPending.current=undefined;if(document.pointerLockElement===canvas.current)document.exitPointerLock();facingIntent.current.reset();travelIntent.current.reset();controllerInput.current.reset();controllerMove.current={x:0,y:0};controllerAttack.current=false;lookPointer.current=null;keys.current.clear();aim.current=undefined;touch.current={x:0,y:0};setThumb({x:0,y:0});heldAttack.current=false;pending.current={attack:false,skill:false,dodge:false,interact:false,warn:false};skillIntent.current.reset();dashIntent.current.reset();};
 const faceResource=()=>{const v=live.current,p=v?.heroes.find(h=>h.id===v.selfId);if(!p||!v?.frontier)return;const n=v.frontier.nodes.toSorted((a,b)=>distance(p,a)-distance(p,b))[0];if(n){const angle=Math.atan2(n.y-p.y,n.x-p.x);aim.current=angle;cameraOrbit.current=angle;facingIntent.current.request(angle);travelIntent.current.reset();}};
 const queueInteraction=()=>{const v=live.current,p=v?.heroes.find(h=>h.id===v.selfId);if(!v?.frontier||!p){pending.current.interact=true;return;}const door=v.frontier.structures.filter(s=>s.kind==="door"&&distance(p,s)<85).toSorted((a,b)=>distance(p,a)-distance(p,b))[0];if(door){const angle=Math.atan2(door.y-p.y,door.x-p.x);aim.current=angle;cameraOrbit.current=angle;facingIntent.current.request(angle);travelIntent.current.reset();pending.current.interact=true;return;}if(Math.abs(p.x-riverCenter(p.y))<75){pending.current.interact=true;return;}const n=v.frontier.nodes.toSorted((a,b)=>distance(p,a)-distance(p,b))[0];faceResource();if(n&&distance(p,n)<76)pending.current.interact=true;else setNotice(n?"Move closer to the resource you face.":"Turn and explore to find a resource.");};
 const interactFromEffect=useEffectEvent(()=>queueInteraction());
 const rotateBuild=()=>{rotationRef.current=(rotationRef.current+1)%4;setBuildRotation(rotationRef.current);};
 const cancelBuild=()=>{buildingRef.current=null;setBuilding(null);};
 const placeBuild=()=>{const p=live.current?.heroes.find(h=>h.id===live.current?.selfId),piece=buildingRef.current;if(p&&piece)frontierPending.current={kind:"build",piece,...buildPoint(p,piece),rotation:rotationRef.current};};
 const toggleCraft=()=>{resetInput();cancelBuild();setCrafting(v=>!v);};
 const turn=(direction:number)=>{if(blocked.current)return;cameraOrbit.current+=direction*.35*preferenceRef.current.mouse;aim.current=cameraOrbit.current;facingIntent.current.request(cameraOrbit.current);travelIntent.current.reset();};
 const tutorialProgress=useRef<{id:string;step:number;x:number;y:number;facing:number;attackAt:number;dodgeAt:number}|null>(null);
 const guidePoint=useRef<{x:number;y:number}|null>(null);
 const me=view?.heroes.find(p=>p.id===view.selfId);
 const target=me&&view?readTarget(view,me):null;const support=me&&view?readSupport(view,me):null;const rallyToEye=!!me&&!!view?.watch&&!target&&!view.monsters.length&&distance(me,{x:1200,y:1200})>260;const canAct=!!me&&me.hp>0&&(!view?.watch||view.watch.state==="active"||view.watch.state==="forming");const regrouping=!!view?.watch&&view.watch.regroupUntil>view.time;const canAttack=canAct&&!regrouping&&!!me&&(me.heroClass==="Spellweaver"||me.heroClass==="Warden"?me.mp>=9:me.stamina>=10);

 const drillCount=view?.rehearsal?Object.values(view.rehearsal).filter(Boolean).length:0;
 const drillInstruction=!view?.rehearsal?.contact?"Face the scout and land a strike.":!view.rehearsal.evaded?"Walk closer. Hold Strike while moving and dashing to keep the scout in view.":!view.rehearsal.opening?"Face and strike during the scout’s recovery.":!view.rehearsal.called?"Call for cover. Teammates receive your direction.":"Drill complete. Begin when your company is ready.";
 const moveTouch=(point:{x:number;y:number})=>{if(blocked.current)return;if(Math.hypot(point.x,point.y)<.05)travelIntent.current.reset();touch.current=point;setThumb(point);};
 const actorId=me?.id;
 useEffect(()=>{cameraOrbit.current=live.current?.heroes.find(p=>p.id===actorId)?.facing??-Math.PI/2;},[actorId]);


 useEffect(()=>{
  const controller=new AbortController();
  const resume=async()=>{
   try{
    const saved=readSavedSession(localStorage.getItem(sessionKey),roomFromSearch(window.location.search));
    if(!saved)return;
    const next=await restoreSession(saved,(s,signal)=>request<WorldView>({action:"resume",...s},signal),controller.signal,()=>{setOnline(false);setError("Reconnecting to your company… Your saved place is kept.");});
    if(controller.signal.aborted)return;
    live.current=Object.assign(next,{received:Date.now()});setView(next);setSession(saved);setOnline(true);setError("");
   }catch(e){if(controller.signal.aborted)return;if(e instanceof Error&&e.message==="SESSION_EXPIRED"){store(sessionKey,null);setError("This company has expired. Create or join a company to continue.");}}
   finally{if(!controller.signal.aborted)setRestoring(false);}
  };
  void resume();return()=>controller.abort();
 },[sessionKey]);

 useEffect(()=>{blocked.current=map||help||stats||journal||rebirth||crafting;if(blocked.current&&document.pointerLockElement===canvas.current)document.exitPointerLock();facingIntent.current.reset();travelIntent.current.reset();controllerInput.current.reset();controllerMove.current={x:0,y:0};controllerAttack.current=false;lookPointer.current=null;keys.current.clear();aim.current=undefined;touch.current={x:0,y:0};heldAttack.current=false;pending.current={attack:false,skill:false,dodge:false,interact:false,warn:false};skillIntent.current.reset();dashIntent.current.reset();runHeld.current=false;queueMicrotask(()=>{setThumb({x:0,y:0});setRunMode(false);});if(!blocked.current)return;const previous=document.activeElement as HTMLElement|null;const panel=document.querySelector<HTMLElement>(".rebirth, .overlay section");const focusable=()=>Array.from(panel?.querySelectorAll<HTMLElement>("button:not(:disabled),input,select,a[href]")??[]);focusable()[0]?.focus();const trap=(event:KeyboardEvent)=>{if(event.key!=="Tab")return;const items=focusable();const first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}};document.addEventListener("keydown",trap);return()=>{document.removeEventListener("keydown",trap);previous?.focus();};},[map,help,stats,journal,rebirth,crafting]);

 const runAt=view?.watch?.startedAt??0;
 useEffect(()=>{cameraOrbit.current=-Math.PI/2;if(runAt)queueMicrotask(resetInput);},[runAt]);

 useEffect(()=>{if(!canvas.current)return;let frame=0,previous=performance.now();try{scene.current=new Scene(canvas.current);const animate=()=>{const now=performance.now(),dt=(now-previous)/1000;previous=now;
 const pad=typeof navigator.getGamepads==="function"?Array.from(navigator.getGamepads()).find(p=>p?.connected&&p.mapping==="standard")??null:null;
 const active=!!live.current&&!document.hidden&&document.hasFocus();
 const sample=controllerInput.current.sample(pad,active&&!blocked.current,preferenceRef.current.controller,dt);
 controllerMove.current={x:sample.x,y:sample.y};controllerAttack.current=sample.attack;controllerTurning.current=!!sample.turn;
 if(active&&sample.menu){setMap(false);setStats(false);setJournal(false);setHelp(v=>!v);controllerMove.current={x:0,y:0};controllerAttack.current=false;}
 if(active&&sample.map)setMap(v=>!v);
 if(sample.turn){cameraOrbit.current+=sample.turn;aim.current=cameraOrbit.current;}
 if(sample.skill)queueSkill();if(sample.dodge)queueDash();if(sample.focus)faceThreat();
 if(sample.runToggle&&live.current?.frontier&&!blocked.current){runHeld.current=!runHeld.current;setRunMode(runHeld.current);}if(sample.interact)interactFromEffect();if(sample.warn)pending.current.warn=true;
 if(!blocked.current&&!document.hidden){const axis=Number(keys.current.has("r"))-Number(keys.current.has("q"));if(axis){cameraOrbit.current+=turnRate(axis,preferenceRef.current.mouse,dt);aim.current=cameraOrbit.current;}}const observed=live.current?.heroes.find(p=>p.id===live.current?.selfId);if(observed&&aim.current===undefined&&!lookPointer.current&&!controllerTurning.current&&!keys.current.has("q")&&!keys.current.has("r"))cameraOrbit.current=observed.facing;if(canvas.current){scene.current?.setPreviewClass(previewClassRef.current);scene.current?.setPreviewWatch(previewKind.current==="watch");scene.current?.setFrontier(live.current?!!live.current.frontier:previewKind.current==="frontier");scene.current?.setBuildPlan(buildingRef.current?{piece:buildingRef.current,rotation:rotationRef.current}:null);scene.current?.setPreferences(preferenceRef.current);scene.current?.setQuality(quality.current);scene.current?.setReducedMotion(reduced.current);scene.current?.setGuide(guidePoint.current);if(!introActive.current)scene.current?.draw(canvas.current,live.current,Date.now(),!live.current);}frame=requestAnimationFrame(animate);};animate();}catch{queueMicrotask(()=>setError("3D graphics could not start. Please open this page in a browser with hardware acceleration enabled."));}return()=>{cancelAnimationFrame(frame);scene.current?.dispose();feedback.current?.dispose();};},[]);





 useEffect(()=>{

  const reset=()=>{resetInput();if(document.hidden)feedback.current?.suspend();};
  const unlock=()=>{if(preferenceRef.current.sound){feedback.current??=new Feedback();feedback.current.setVolume(preferenceRef.current.volume);try{feedback.current.enable(true);}catch{}}};

  const mouseLook=(e:MouseEvent)=>{if(document.pointerLockElement!==canvas.current||!(e.buttons&2)||blocked.current)return;cameraOrbit.current+=lookDelta(e.movementX,preferenceRef.current.mouse,"mouse");aim.current=cameraOrbit.current;facingIntent.current.request(cameraOrbit.current);travelIntent.current.reset();};
  const unlockLook=()=>{if(document.pointerLockElement!==canvas.current)lookPointer.current=null;};
  const down=(e:KeyboardEvent)=>{
   unlock();const k=e.key.toLowerCase();
   if(k==="escape"){e.preventDefault();if(buildingRef.current){cancelBuild();return;}setCrafting(false);const opening=!blocked.current;setMap(false);setHelp(opening);setStats(false);setJournal(false);reset();return;}
   if((e.target as HTMLElement)?.closest("input,textarea,select"))return;
   if(k==="b"&&live.current?.frontier){e.preventDefault();if(!e.repeat){reset();cancelBuild();setCrafting(v=>!v);}return;}
   if(k==="r"&&buildingRef.current){e.preventDefault();if(!e.repeat)rotateBuild();return;}
   if(blocked.current)return;
   if(k==="enter")return;
   if(["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"," ","j","k","e","1","2","m","q","r","g","f"].includes(k))e.preventDefault();

   keys.current.add(k);if(e.repeat)return;
   if(k==="j"||k==="1"){faceThreat(false);pending.current.attack=true;}
   if(k===" ")queueDash();
   if(k==="k"||k==="2")queueSkill();if(k==="h")faceSupport();
   if(k==="f")faceThreat();
   if(k==="e"){if(live.current?.watch)queueSkill();else interactFromEffect();}
   if(k==="m")setMap(v=>!v);if(k==="g")pending.current.warn=true;
  };

  const up=(e:KeyboardEvent)=>{const key=e.key.toLowerCase();keys.current.delete(key);if(["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"].includes(key))travelIntent.current.reset();};window.addEventListener("mousemove",mouseLook);document.addEventListener("pointerlockchange",unlockLook);window.addEventListener("keydown",down);window.addEventListener("keyup",up);window.addEventListener("pointerdown",unlock);window.addEventListener("blur",reset);document.addEventListener("visibilitychange",reset);return()=>{window.removeEventListener("mousemove",mouseLook);document.removeEventListener("pointerlockchange",unlockLook);window.removeEventListener("keydown",down);window.removeEventListener("keyup",up);window.removeEventListener("pointerdown",unlock);window.removeEventListener("blur",reset);document.removeEventListener("visibilitychange",reset);};

 },[]);

 useEffect(()=>{

  if(!session)return;sequence.current=Date.now();let cancelled=false,timer=0;const controller=new AbortController();let failures=0;

  const update=async()=>{

   try{

    const x=Number(keys.current.has("d")||keys.current.has("arrowright"))-Number(keys.current.has("a")||keys.current.has("arrowleft"))+touch.current.x+controllerMove.current.x;

    const y=Number(keys.current.has("s")||keys.current.has("arrowdown"))-Number(keys.current.has("w")||keys.current.has("arrowup"))+touch.current.y+controllerMove.current.y;

    const requestNumber=++requests.current;
    const current=live.current?.heroes.find(p=>p.id===live.current?.selfId),repeating=heldAttack.current||controllerAttack.current||keys.current.has("j")||keys.current.has("1");
    const combatFacing=preserveCombatFacing(current?.attackAt??0,live.current?.time??0);
    const looking=!!lookPointer.current||keys.current.has("q")||keys.current.has("r")||controllerTurning.current,frontierTravel=!!live.current?.frontier,strafing=frontierTravel||looking;
    const wantsSkill=skillIntent.current.requested(Date.now(),current?.skillCooldown??0,!!current?.action?.skill);
    if(wantsSkill&&current&&!current.action&&current.heroClass!=="Warden"&&live.current&&!live.current.frontier)aim.current=visibleFacing(live.current,current)??aim.current;
    if(looking)facingIntent.current.reset();const requestedFacing=facingIntent.current.sample(!!current?.action);const vector=travelIntent.current.movement(x,y,requestedFacing??(strafing?cameraOrbit.current:current?.facing??cameraOrbit.current),strafing||requestedFacing!==undefined);
    const movement={...vector,facing:requestedFacing??playerInput(0,0,cameraOrbit.current,aim.current,current?.facing??cameraOrbit.current,strafing,repeating||wantsSkill||combatFacing,frontierTravel).facing};
    if((x||y)&&!strafing&&!repeating&&!wantsSkill&&!combatFacing&&requestedFacing===undefined)movement.facing=undefined;
    if((x||y)&&!strafing&&!repeating&&!wantsSkill&&!combatFacing)aim.current=undefined;
    const inReach=!!(current&&live.current&&(readTarget(live.current,current)?.inReach||live.current.frontier?.nodes.some(n=>distance(current,n)<76&&Math.abs(Math.atan2(Math.sin(Math.atan2(n.y-current.y,n.x-current.x)-current.facing),Math.cos(Math.atan2(n.y-current.y,n.x-current.x)-current.facing)))<1)));
    const deferInteract=!!(live.current?.frontier&&pending.current.interact&&current?.action);
    const input={...pending.current,sprint:!!live.current?.frontier&&(keys.current.has("shift")||runHeld.current),interact:pending.current.interact&&!deferInteract,frontier:frontierPending.current,skill:wantsSkill,dodge:dashIntent.current.requested(Date.now(),current?.dodgeCooldown??0),sequence:sequence.current=nextSequence(sequence.current),...movement,attack:repeatStrike(pending.current.attack,repeating,inReach)};pending.current={attack:false,skill:false,dodge:false,interact:deferInteract,warn:false};frontierPending.current=undefined;
    if(live.current?.watch?.state==="forming"&&(input.attack||input.skill||input.dodge))setRehearsing(true);

    const next=await request<WorldView>(document.hidden||!document.hasFocus()?{action:"snapshot",...session}:{action:"input",...session,input},controller.signal);

    if(cancelled)return;failures=0;if(Number.isSafeInteger(next.inputSequence))sequence.current=Math.max(sequence.current,next.inputSequence);if(!order.current.accept(requestNumber)){timer=window.setTimeout(update,33);return;}feedback.current?.update(next);live.current=Object.assign(next,{received:Date.now()});setView(next);setOnline(true);setError("");
    const hero=(next as WorldView).heroes.find(p=>p.id===next.selfId);
    if(hero){facingIntent.current.acknowledge(hero.facing);if(tutorialProgress.current?.id!==hero.id){let step=0;try{step=Number(localStorage.getItem(`ashwatch-tutorial-v2-${hero.id}`)||0);}catch{}tutorialProgress.current={id:hero.id,step:Number.isInteger(step)&&step>=0&&step<=TUTORIAL_STEPS.length?step:0,x:hero.x,y:hero.y,facing:hero.facing,attackAt:hero.attackAt,dodgeAt:hero.dodgeAt};setTutorial(tutorialProgress.current.step);}
     const progress=tutorialProgress.current;
     const nextStep=nextTutorialStep(progress.step,progress,hero);
     if(nextStep!==progress.step){Object.assign(progress,{step:nextStep,x:hero.x,y:hero.y,facing:hero.facing,attackAt:hero.attackAt,dodgeAt:hero.dodgeAt});setTutorial(nextStep);try{localStorage.setItem(`ashwatch-tutorial-v2-${hero.id}`,String(nextStep));}catch{}}

    }


   }catch(e){if(cancelled)return;const message=e instanceof Error?e.message:"Connection interrupted";if(message==="SESSION_EXPIRED"){store(sessionKey,null);setSession(null);live.current=null;setView(null);setError("This room expired or is unavailable. Create or join a room to continue.");return;}failures++;resetInput();setOnline(false);setError(message.includes("storage")?"The server cannot save your company right now. Controls stopped; reconnecting…":"Reconnecting… controls stopped. Your character is still in the shared world.");}

   if(!cancelled)timer=window.setTimeout(update,failures?Math.min(2000,250*2**Math.min(failures,3)):33);

  };update();return()=>{cancelled=true;controller.abort();clearTimeout(timer);};

 },[session,sessionKey]);

 async function develop(kind:string,key:string){if(!session)return;resetInput();const n=++requests.current;try{const v=await request<WorldView>({action:"develop",...session,kind,key});if(!order.current.accept(n))return;live.current=Object.assign(v,{received:Date.now()});setView(v);setNotice(kind==="upgrade"?"Attribute upgraded.":kind==="equip"?"Skill equipped.":"Purchase complete.");}catch(e){setNotice(e instanceof Error?e.message:"Please try again.");}}
 async function enter(){setEntering(true);setError("");try{const s=await request<Session>({action:"enter",name,heroClass,adventureKind,oath:companyOath,roomMode,room:roomMode==="join"?roomCode.toUpperCase().trim():undefined});store(sessionKey,JSON.stringify(s));setSession(s);}catch(e){setError(e instanceof Error?e.message:"Could not enter the world");}finally{setEntering(false);}}

 async function copyInvite(){if(!session?.room)return;try{await navigator.clipboard.writeText(inviteUrl(window.location.origin,session.room).replace("/ashwatch?",view?.frontier?"/ashwatch/frontier?":"/ashwatch?"));setNotice("Join link copied. Your friends can choose a class and join this company.");}catch{setNotice(`Share this page and company code ${session.room}.`);}}
 async function beginWatch(){if(!session)return;resetInput();try{const next=await request<WorldView>({action:"start",...session});live.current=Object.assign(next,{received:Date.now()});setView(next);}catch(e){setNotice(e instanceof Error?e.message:"Please try again.");}}
 async function replayWatch(){if(!session)return;resetInput();const requestNumber=++requests.current;try{const next=await request<WorldView>({action:"restart",...session,oath:companyOath});if(!order.current.accept(requestNumber))return;live.current=Object.assign(next,{received:Date.now()});setView(next);}catch(e){setNotice(e instanceof Error?e.message:"Please try again.");}}
 const floor=me?.floor??0;

 const nearbyGate=me&&(floor?distance(me,{x:1200,y:1650})<115||distance(me,{x:1200,y:650})<115&&view?.cleared.includes(floor):distance(me,GATE)<115);

 const remaining=view?.floorRemaining??0;

 const dragon=view?.dragon;
 const town=me?TOWNS.reduce((a,b)=>distance(me,a)<distance(me,b)?a:b):TOWNS[0];
 const currentDestination=tutorial<TUTORIAL_STEPS.length?(tutorial===7?"inn":tutorial===5?"hunt":"guild"):destination;
 const destinationPoint=currentDestination==="hunt"?{x:1200,y:1070}:currentDestination==="dungeon"?{x:GATE.x,y:GATE.y+40}:currentDestination==="arena"?town.arena:currentDestination==="inn"?buildingEntrance(town.inn):buildingEntrance(town.guild);
 useEffect(()=>{guidePoint.current=view?.frontier?null:me&&!floor?destinationPoint:rallyToEye?{x:1200,y:1200}:null;});
 function finishTutorial(){if(!me)return;setTutorial(TUTORIAL_STEPS.length);if(tutorialProgress.current)tutorialProgress.current.step=TUTORIAL_STEPS.length;try{localStorage.setItem(`ashwatch-tutorial-v2-${me.id}`,String(TUTORIAL_STEPS.length));}catch{}}
 function restartTutorial(){if(!me)return;setTutorial(0);tutorialProgress.current={id:me.id,step:0,x:me.x,y:me.y,facing:me.facing,attackAt:me.attackAt,dodgeAt:me.dodgeAt};store(`ashwatch-tutorial-v2-${me.id}`,"0");setHelp(false);}

 const nearGuild=me&&!floor&&distance(me,town.guild)<115,nearInn=me&&!floor&&distance(me,town.inn)<115;
 async function service(action:"mission"|"claim"|"rest"|"party"){
  if(!session)return;resetInput();const requestNumber=++requests.current;try{const v=await request<WorldView>({action:"service",...session,service:action,partyCode});if(!order.current.accept(requestNumber))return;feedback.current?.update(v);live.current=Object.assign(v,{received:Date.now()});setView(v);if(action==="rest"&&tutorial===7)finishTutorial();setNotice(action==="rest"?"Room booked. Your next visit starts here.":action==="party"?"Party updated. Blue map markers are party members only.":action==="claim"?"Guild reward received.":"Contract accepted. Hunt three beasts, then return.");}catch(e){setNotice(e instanceof Error?e.message:"Please try again.");}
 }
 function chart(compact=false){return <svg viewBox={floor?"600 480 1200 1350":"0 0 2400 2400"} role="img" aria-label="Terrain map: you and party members only">
  <rect width="2400" height="2400" fill="#e6d3a3"/>
  {!floor?<><path d="M1480 2450C1900 1550 1170 1460 1570 1020S1250 250 1600-80" stroke="#547e80" strokeWidth="90" fill="none"/><path d="M690 1930Q1080 1480 1110 1240T1440 850M920 1500L740 970 550 530" stroke="#b3a383" strokeWidth="25" fill="none"/>{BUILDINGS.map(([x,y,z],i)=><rect key={i} x={x-55*z} y={y-35*z} width={110*z} height={70*z} fill="#92836a"/>)}{TOWNS.map(t=><g key={t.id}><circle cx={t.arena.x} cy={t.arena.y} r={t.arena.r} fill="#bd9f6866" stroke="#d7bc85" strokeWidth="15"/><text x={t.guild.x} y={t.guild.y} fill="#564528" fontSize="100">⚑</text><text x={t.inn.x} y={t.inn.y} fill="#ebd5a3" fontSize="100">⌂</text>{!compact&&<text x={t.x} y={t.y+260} fill="#493c2a" fontSize="90">{t.name}</text>}</g>)}<circle cx={GATE.x} cy={GATE.y} r="45" fill="#97ced0"/></>:<><rect x="650" y="530" width="1100" height="1250" fill="#726b55" stroke="#aaa085" strokeWidth="20"/><path d="M1200 1650V650" stroke="#a49a80" strokeWidth="30"/><circle cx="1200" cy="1650" r="45" fill="#cebf8b"/><circle cx="1200" cy="650" r="45" fill="#97ced0"/></>}
  {!floor&&<circle cx={destinationPoint.x} cy={destinationPoint.y} r="75" fill="none" stroke="#ffe3a4" strokeWidth="18"/>}
  {view?.partyMembers.filter(p=>p.floor===floor).map(p=><circle key={p.id} cx={p.x} cy={p.y} r="40" fill="#87cbe5"/>)}
  {me&&<g><circle cx={me.x} cy={me.y} r="32" fill="#a52825" stroke="#fff5d6" strokeWidth="10"/>{!compact&&<><path d={`M${me.x+190} ${me.y-180} L${me.x+35} ${me.y-35}`} stroke="#b12727" strokeWidth="18"/><path d={`M${me.x+35} ${me.y-35} l65 -15 -40 -40 Z`} fill="#b12727"/><text x={me.x>1750?me.x-440:me.x+110} y={me.y-210} fill="#9e2624" fontSize="85" fontWeight="bold">You are here</text></>}</g>}
 </svg>;}


 return <main className={`aw ${view?.frontier?"frontier-mode":""} ${session?"playing":"landing"} ${view?.watch?.state==="forming"?"gathering":""} ${!view?.frontier&&tutorial<TUTORIAL_STEPS.length&&!(nearGuild||nearInn)?"tutorial-active":""}`}>

  <canvas ref={canvas} onContextMenu={e=>e.preventDefault()} aria-label="Medieval Ashwatch world; drag with right mouse button or touch to look" onPointerDown={e=>{if(!session||blocked.current)return;e.currentTarget.setPointerCapture(e.pointerId);if(e.pointerType==="mouse"&&e.button===0){if(buildingRef.current){placeBuild();return;}heldAttack.current=true;aim.current=scene.current?.aimAt(e.clientX,e.clientY,e.currentTarget);pending.current.attack=true;}else{lookPointer.current={id:e.pointerId,x:e.clientX};if(e.pointerType==="mouse"&&e.button===2){try{const target=e.currentTarget;target.dataset.mouseCapture="requesting";void target.requestPointerLock()?.then(()=>target.dataset.mouseCapture="accepted").catch(err=>target.dataset.mouseCapture=err instanceof Error?err.name:"unavailable");}catch{e.currentTarget.dataset.mouseCapture="unavailable";}}}if(preferenceRef.current.sound){feedback.current??=new Feedback();feedback.current.setVolume(preferenceRef.current.volume);feedback.current.enable(true);}}} onPointerUp={()=>{if(document.pointerLockElement===canvas.current)document.exitPointerLock();heldAttack.current=false;lookPointer.current=null;}} onPointerCancel={()=>{if(document.pointerLockElement===canvas.current)document.exitPointerLock();heldAttack.current=false;lookPointer.current=null;}} onLostPointerCapture={()=>{if(document.pointerLockElement===canvas.current)return;heldAttack.current=false;lookPointer.current=null;}} onPointerMove={e=>{const pointer=lookPointer.current;if(pointer?.id===e.pointerId&&!blocked.current&&document.pointerLockElement!==canvas.current){const device=e.pointerType==="mouse"?"mouse":"touch";cameraOrbit.current+=lookDelta(e.clientX-pointer.x,preferenceRef.current[device],device)*(device==="mouse"?2:1.4);aim.current=cameraOrbit.current;pointer.x=e.clientX;}}}/>

  {restoring?<div className="loading-world" role="status">Returning to your company…{error&&<p>{error}</p>}</div>:!session?<>

   <div className="landing-shade"/>

   <header className="landing-header"><a className="wordmark" href="/ashwatch"><span>✦</span> ASHWATCH</a><button className="entry-sound" aria-pressed={sound} onClick={()=>{const enabled=!sound;feedback.current??=new Feedback();feedback.current.setVolume(preferences.volume);try{feedback.current.enable(enabled);setSound(enabled);changePreferences({sound:enabled});}catch{setError("Sound could not start. Read combat through movement and on-screen status.");}}}>Sound · {sound?"On":"Off"}</button></header>

   <section className="welcome">

    <p className="overline"><span/> CHARACTER CREATION</p>

    <h1>{initialAdventure==="frontier"?<>Claim a<br/><em>foothold.</em></>:<>Keep the<br/><em>watch.</em></>}</h1>

    <p className="intro">{initialAdventure==="frontier"?<>Gather. Craft. Raise a hearth.<br/>Explore a medieval frontier alive with magic.</>:<>Read the threat. Commit your strike. Cover your company.<br/>Three encounters for you and your friends.</>}</p>

    <div className="hero-choices" aria-label="Choose your adventurer">

     {(Object.keys(CLASSES) as ClassName[]).map(cls=><button key={cls} aria-pressed={heroClass===cls} className={heroClass===cls?"selected":""} onClick={()=>setHeroClass(cls)}><Icon kind={classIcon(cls)}/><span>{cls}<small>{CLASSES[cls].skill}</small></span></button>)}
    </div>

    <button className="entry-preview" onClick={()=>setRebirth(true)}>✧ Preview your rebirth & builds</button>
    <p className="class-description">{CLASSES[heroClass].description}</p>{initialAdventure!=="frontier"&&<a className="frontier-entry-link" href="/ashwatch/frontier">Enter the wild frontier · survival & building →</a>}<div className="room-entry"><label>Run<select aria-label="Run length" value={adventureKind} onChange={e=>{if(e.target.value==="frontier"&&initialAdventure!=="frontier"){router.push("/ashwatch/frontier");return;}setAdventureKind(e.target.value);}}><option value="watch">Company watch · three encounters</option><option value="frontier">Wild frontier · gather & build</option><option value="world">Open world</option></select></label></div><div className="room-entry"><label>Adventure<select aria-label="Adventure" value={roomMode} onChange={e=>setRoomMode(e.target.value)}><option value="create">Create a new room</option><option value="join">Join friends by code</option></select></label>{roomMode==="join"&&<label>Room code<input aria-label="Room code" value={roomCode} maxLength={6} onChange={e=>setRoomCode(e.target.value.toUpperCase())} placeholder="Six-character code"/></label>}</div>
    {adventureKind==="watch"&&roomMode==="create"&&<label className="oath-entry">Company oath<select aria-label="Company oath" value={companyOath} onChange={e=>setCompanyOath(e.target.value as OathId)}>{Object.entries(OATHS).map(([id,o])=><option key={id} value={id}>{o.name} · {o.promise}</option>)}</select><small>{OATHS[companyOath].tradeoff}</small></label>}
    <form onSubmit={e=>{e.preventDefault();enter();}}><label className="sr-only" htmlFor="adventurer-name">Adventurer name</label><input id="adventurer-name" placeholder="Your name, wanderer" value={name} maxLength={18} onChange={e=>setName(e.target.value)}/><button className="enter-world" disabled={entering}>{entering?"Opening the gate…":adventureKind==="watch"?(roomMode==="join"?"Join company":"Create company"):"Enter the wilds"}<span>→</span></button></form>

    <div className="world-promise"><span>5 distinct classes</span><span>Room-code co-op</span><span>Third-person 3D</span></div>
    {FREE_PLAYTEST&&<p className="playtest-hosting">Free public playtest · Rooms reset when the server sleeps or restarts.</p>}

    {error&&<p className="entry-error" role="alert">{error}</p>}

   </section>

   <div className="landmark"><span>01 / THE BORDERLANDS</span><b>The frontier remembers.</b><p>Choose your role. Bring your company home.</p></div>

   <footer className="landing-footer"><span>EXPLORE · CLASH · DESCEND</span><span className="desktop-instructions">WASD to move <i/> Hold right mouse to look</span><span className="phone-instructions">Drag to move · tap to fight</span></footer>

  </>:!me?<div className="loading-world">{adventureKind==="watch"?"Gathering your company…":"Crossing into Emberveil…"}{error&&<p>{error}</p>}</div>:<>

   <div className="watch-header"><span>ASHWATCH</span><small>{view?.watch?`FRONTIER WATCH · ${view.watch.state==="forming"?"PRACTICE":["READ","COVER","COMMIT"][view.watch.stage]}`:view?.frontier?`THE WILD FRONTIER · ${frontierNight(view.frontier.day)?"NIGHTFALL":"DAYLIGHT"}`:floor?`THE HOLLOW SPIRE · DEPTH ${floor}`:"EMBERVEIL"}</small>{session.room&&<b>ROOM {session.room}</b>}</div>
   <button className="game-menu" aria-label="Open menu" onClick={()=>setHelp(true)}>☰ <span>Menu</span></button>


   <section className="hero-hud" aria-label="Your adventurer"><button className="hero-emblem" aria-label={view?.watch?"Class and controls":"Character stats"} onClick={()=>view?.watch?setHelp(true):setStats(v=>!v)}><Icon kind={classIcon(me.heroClass)}/><b>{me.level}</b></button><div className="hero-vitals"><div><b>{me.name}</b><small>{me.heroClass}</small></div><div className="health-track"><i style={{width:`${me.hp/me.maxHp*100}%`}}/><span>Health · {Math.ceil(me.hp)} / {me.maxHp}</span></div><div className="health-track mp-track"><i style={{width:`${me.mp/me.maxMp*100}%`}}/><span>MP · {Math.floor(me.mp)} / {me.maxMp}</span></div><div className="health-track stamina-track"><i style={{width:`${me.stamina/me.maxStamina*100}%`}}/><span>Stamina · {Math.floor(me.stamina)} / {me.maxStamina}</span></div><div className="xp-track"><i style={{width:`${me.xp/requiredXp(me.level)*100}%`}}/></div></div></section>



   {hasSurvey(me)&&<button className="mini-map" aria-label="Expand minimap" onClick={()=>setMap(true)}>{chart(true)}<span>SURVEY · TERRAIN & PARTY</span></button>}
   {!view?.frontier&&(nearGuild||nearInn)&&<div className="town-service">{nearGuild?<><b>Adventurers Guild</b><span>{me.mission===0?"A hunter’s first contract":me.mission===1?`Beasts defeated ${Math.min(3,me.missionKills)} / 3`:me.missionClaimed?"Contracts complete":"Clear the first dungeon depth"}</span>{!me.mission?<button onClick={()=>service("mission")}>Accept beast hunt · 120 XP</button>:<button disabled={me.mission===1?me.missionKills<3:me.missionClaimed||!view?.cleared.includes(1)} onClick={()=>service("claim")}>Claim guild reward</button>}<details><summary>Play with friends</summary><label>Party code<input aria-label="Party code" value={partyCode} maxLength={8} onChange={e=>setPartyCode(e.target.value)}/></label><button onClick={()=>service("party")}>Join / create party</button><small>Share the same code. Empty code leaves party.</small></details></>:<><b>The Ember Lodge</b><span>Recover and return here next visit.</span><button onClick={()=>service("rest")}>Book room & rest</button></>}</div>}
   {view?.frontier&&<FrontierPanel placementIssue={building==="foundation"&&canopyOverlaps(buildPoint(me,building).x,buildPoint(me,building).y)?"Branches overhang this spot. Find a clearing.":undefined} view={view.frontier} open={crafting} building={building} rotation={buildRotation} onToggle={toggleCraft} onClose={()=>setCrafting(false)} onCraft={command=>{setCrafting(false);frontierPending.current=command;}} onPlan={piece=>{resetInput();setCrafting(false);buildingRef.current=piece;rotationRef.current=0;setBuilding(piece);setBuildRotation(0);}} onPlace={placeBuild} onRotate={rotateBuild} onCancel={cancelBuild}/>}
   {view?.frontier&&(()=>{const door=view.frontier.structures.find(s=>s.kind==="door"&&distance(me,s)<85),water=Math.abs(me.x-riverCenter(me.y))<75,n=view.frontier.nodes.toSorted((a,b)=>distance(me,a)-distance(me,b))[0];return door||water||n&&distance(me,n)<210?<div className="frontier-resource">{door?"Company doorway":water?"River water":n&&distance(me,n)<76?`Strike to gather ${n.kind}`:`Approach ${n?.kind}`}<button onClick={queueInteraction}>{door?`${door.open?"Close":"Open"} door · E`:water?"Drink · E":n&&distance(me,n)<76?"Face & gather · E":"Face resource · E"}</button></div>:null;})()}
   {notice&&<button className="town-notice" onClick={()=>setNotice("")}>{notice} ×</button>}
   {floor>0&&!view?.watch&&<div className="depth-progress"><span>DEPTH {floor} / 10</span><b>{remaining?`${remaining} presences stir below` :floor===10?"The eclipse has fallen":"The seal has broken"}</b><div>{Array.from({length:10},(_,i)=><i key={i} className={i+1===floor?"current":view?.cleared.includes(i+1)?"cleared":""}/>)}</div></div>}

   {!floor&&dragon&&dragon.state!=="sleeping"&&dragon.state!=="defeated"&&<section className="dragon-hud"><small>{dragon.state==="returning"?"THE ANCIENT RETURNS TO ITS NEST":"THE ANCIENT HAS AWAKENED"}</small><b>Vaelthorn, the Ashen Sovereign</b><div><i style={{width:`${dragon.hp/dragon.maxHp*100}%`}}/></div><span>{dragon.kills} / 10 lives claimed {view!.villageDamage>0?"· Emberveil is burning":""}</span></section>}

   {!floor&&dragon?.state==="sleeping"&&distance(me,dragon)<350&&<div className="quiet-caption">An ancient breath moves the grass.</div>}

   {nearbyGate&&!view?.watch&&!view?.frontier&&<button className="gate-action" onClick={()=>pending.current.interact=true}><kbd>E</kbd>{floor===10&&me.y<900?"Return to the daylight":floor&&me.y>1300?"Ascend":"Enter the archway"}<span>→</span></button>}

   {view?.frontier&&<button className="frontier-run" aria-pressed={runMode} onClick={toggleRun}>{runMode?"Walk":"Run"}</button>}
   {me.hp<=0&&!view?.watch&&<div className="death-veil"><p className="overline">THE EMBERS REMEMBER</p><h2>Not your last chapter.</h2><p>Returning to {view?.frontier?.milestones.includes("bedroll")?"your bedroll":"Emberveil"} in {Math.max(0,Math.ceil((me.respawnAt-view!.time)/1000))}s</p></div>}

   <div className="movement" aria-label="Movement control" role="group" onPointerDown={e=>{if(blocked.current)return;e.currentTarget.setPointerCapture(e.pointerId);const r=e.currentTarget.getBoundingClientRect();moveTouch(stick(e.clientX-r.left-r.width/2,e.clientY-r.top-r.height/2,48));}} onPointerMove={e=>{if(!e.currentTarget.hasPointerCapture(e.pointerId))return;const r=e.currentTarget.getBoundingClientRect();moveTouch(stick(e.clientX-r.left-r.width/2,e.clientY-r.top-r.height/2,48));}} onPointerUp={()=>moveTouch({x:0,y:0})} onPointerCancel={()=>moveTouch({x:0,y:0})} onLostPointerCapture={()=>moveTouch({x:0,y:0})}><i style={{transform:`translate(${thumb.x*20}px,${thumb.y*20}px)`}}/></div>

   <div className="turn-controls" aria-label="Look around"><button aria-label="Turn left" onClick={()=>turn(-1)}>↶ <span>Q</span></button><button aria-label="Turn right" onClick={()=>turn(1)}>↷ <span>R</span></button><button className="face-threat" disabled={!view?.monsters.length} onClick={()=>faceThreat()}><span>F</span> Face threat</button></div>
   <div className="combat-readout" data-stage={me.action?.stage??"ready"}><span>{me.action?({intent:"Preparing",commitment:me.heroClass==="Spellweaver"||me.heroClass==="Warden"?"Casting":"Winding up",contact:"Contact",consequence:"Following through",recovery:"Recovering"}[me.action.stage]):regrouping?"Regroup":view?.watch?.state==="forming"?"Practice":canAct?"Ready":"Rest"}</span><b>{regrouping?"NEXT ENCOUNTER · RECOVER & REPOSITION":me.action?me.action.resolved?(me.action.hit?(view?.watch?.state==="forming"?(me.action.skill&&(me.heroClass==="Warden"||me.heroClass==="Ironbound")?"PRACTICE SUPPORT":"PRACTICE HIT · SCOUT RESETS"):me.action.skill&&me.heroClass==="Warden"?"RENEWED":me.action.skill&&me.heroClass==="Ironbound"?"WARD RAISED":me.action.opening?"OPENING STRUCK · +30%":"CONTACT"):"NO CONTACT"):"COMMITTED":!canAct?(view?.watch?.state==="forming"?"WAIT FOR YOUR COMPANY":me.hp<=0?"REGROUP WITH YOUR COMPANY":"WATCH COMPLETE"):!canAttack?(me.heroClass==="Spellweaver"||me.heroClass==="Warden"?"RECOVER MANA":"RECOVER STAMINA"):target?(target.obstructed?"Blocked by stone · move around the pillar":target.inReach?"IN REACH":"CLOSE THE DISTANCE"):rallyToEye?"RALLY AT THE EYE":view?.monsters.length?"TURN TOWARD A VISIBLE THREAT":"FACE A THREAT"}</b></div>
   {support&&<section className="support-readout" aria-label="Renew target"><small>{support.webbed?"CLEANSE + HEAL":"HEAL"} · {support.name}</small><b>{support.obstructed?"Blocked by stone":!support.inReach?"Close the distance":!support.faced?"Turn toward your teammate":"In Renew reach · E skill"}</b>{support.id!==me.id&&!support.faced&&<button onClick={faceSupport}>H · Face {support.name}</button>}</section>}
   {target&&(!view?.frontier||target.inReach||target.health.visible)&&<section className="target-readout" aria-label={target.slowed?"Facing target, frostbound":"Facing target"}><small>{view?.watch?watchEnemy(target.kind).name.toUpperCase():target.kind.toUpperCase()}</small><b>{target.obstructed?"Blocked by stone · move around the pillar":target.inReach?"Within strike reach":"Outside basic strike reach"}</b>{target.slowed&&<em className="target-status">Frostbound · movement slowed</em>}{target.health.visible&&<><div role="progressbar" aria-label="Enemy health" aria-valuemin={0} aria-valuemax={target.health.maximum} aria-valuenow={target.health.remaining} aria-valuetext={`${target.health.remaining} of ${target.health.maximum} health`}><i style={{width:`${target.health.fraction*100}%`}}/></div><span className="enemy-health-number">{target.health.remaining} / {target.health.maximum} HP</span></>}</section>}
   {view?.watch?.state==="forming"&&<section className={`watch-lobby ${rehearsing?"rehearsing":""}`} aria-label="Company gathering"><small>GATHER YOUR COMPANY · 1–5 PLAYERS</small><h2>Practice. Then start the watch.</h2><p className="lobby-intro">Share this page and code <strong>{session.room}</strong>.<br/>Friends choose “Join friends by code” at the gate.</p><ul className="lobby-roster">{view.company?.map(p=><li key={p.id}><b>{p.name}</b><span>{p.heroClass}{p.online?"":" · offline"}</span></li>)}</ul><button className="rehearsal-toggle" aria-pressed={rehearsing} onClick={()=>setRehearsing(v=>!v)}>{rehearsing?"Show company · finish rehearsal":"Try your controls safely"}</button><p className="rehearsal-copy">{rehearsing?"Approach the scout. Hold Strike to keep facing it while sidestepping or dashing. Read the raised weapon, evade, then strike as it settles. Recovery contacts deal 30% more damage in the watch. You take no damage or resource cost; the defeated scout resets.":"Practice hits damage the scout, which resets after defeat. Start the live watch when ready; everyone begins rested."}</p>{rehearsing&&<p className="rehearsal-next"><small>{drillCount} / 4 learned · practice scout resets</small>{drillInstruction}</p>}
   {rehearsing&&<ol className="drill-progress" aria-label="Live combat drill">{([{key:"contact",label:"Face & land a strike"},{key:"evaded",label:"Evade a prepared strike"},{key:"opening",label:"Strike in recovery"},{key:"called",label:"Send a cover call · G"}] as const).map(step=><li key={step.key} data-complete={!!view.rehearsal?.[step.key]}><span aria-hidden="true">{view.rehearsal?.[step.key]?"✓":"○"}</span>{step.label}<small>{view.rehearsal?.[step.key]?"Done":"Try it"}</small></li>)}</ol>}
   <button className="copy-invite" onClick={copyInvite}>Copy company invite</button><p className="lobby-oath">{OATHS[view.watch.oath].name} oath · {OATHS[view.watch.oath].tradeoff}</p>{(view.hostId?view.hostId===me.id:session.host)?<button className="begin-watch" onClick={beginWatch}>Start live watch →</button>:<p>Practice while your leader prepares the live watch.</p>}<small><span className="desktop-instructions">Face threats · J strike · Space dash · E skill · F face threat · G call for cover</span><span className="phone-instructions">Drag to face threats · Strike · Dash · Skill · Call for cover</span></small></section>}
   {view?.watch&&view.watch.state==="active"&&!regrouping&&<div className="watch-objective"><small>0{view.watch.stage+1} / 03 · {OATHS[view.watch.oath].name}</small><b>{["Hold the scouting ground","Cover your company","Break the guardian"][view.watch.stage]}</b></div>}
   {regrouping&&<section className="watch-regroup" role="status"><small>ENCOUNTER {view!.watch!.stage} HELD</small><b>{ENCOUNTERS[view!.watch!.stage]} awaits</b><span>Catch your breath. Reposition together. {Math.max(1,Math.ceil((view!.watch!.regroupUntil-view!.time)/1000))}s</span></section>}
   {(me.webUntil??0)>(view?.time??0)&&<div className="web-status" role="status">WEBBED · movement slowed · Renew can cleanse</div>}
   {view?.ownCall?.answeredBy?<div className="company-warning answered-call" role="status">{view.ownCall.answeredBy} answered your call · Covered</div>:view?.warnings?.at(-1)?<div className={`company-warning ${view.warnings.at(-1)!.answeredBy?"answered-call":""}`} role="status">{view.warnings.at(-1)!.answeredBy?`${view.warnings.at(-1)!.answeredBy} covered ${view.warnings.at(-1)!.name}`:`${view.warnings.at(-1)!.name} needs cover · ${view.warnings.at(-1)!.relative} of you`}{!view.warnings.at(-1)!.answeredBy&&<button onClick={faceCall}>Turn toward call</button>}</div>:view?.ownCall&&<div className="company-warning" role="status">{view.company?.some(p=>p.id!==me.id&&p.online)?"Your company has your call · Hold for cover":"Cover call sent · no teammate connected"}</div>}
   <button disabled={!canAct} className="warn-control" onClick={()=>pending.current.warn=true}><kbd>G</kbd> Call for cover</button>
   {view?.watch&&(view.watch.state==="victory"||view.watch.state==="defeat")&&<section className="watch-ending" role="status"><small>{view.watch.state==="victory"?"THE WATCH HOLDS":"THE WATCH HAS FALLEN"}</small><h2>{view.watch.state==="victory"?"Company, stand down.":"Regroup at the fire."}</h2><p>{view.watch.state==="victory"?"Three encounters survived. The frontier is quiet again.":`Your company fell at ${ENCOUNTERS[view.watch.stage].toLowerCase()}.`}</p><div><span>{Math.ceil((view.watch.endedAt-view.watch.startedAt)/1000)}s elapsed</span><span>{view.watch.hitsTaken} hits taken</span><span>{view.watch.evades} strikes evaded</span><span>{view.watch.warnings} cover calls</span><span>{view.watch.covers} calls answered</span><span>{view.watch.openings} recovery contacts</span></div><ol className="watch-chronicle" aria-label="Your watch, encounter by encounter">{view.watch.chapters.map(c=><li key={c.stage}><b>{ENCOUNTERS[c.stage]}</b><span>{c.seconds}s · {c.hits} hits · {c.openings} openings{c.covers>0?` · ${c.covers} covered`:""}</span></li>)}</ol><p className="ending-advice">{watchAdvice(view.watch)}</p>{(view.watch.interrupts>0||view.watch.healing>0||view.watch.parries>0||view.watch.cleanses>0)&&<p className="watch-contribution">{view.watch.interrupts} interrupts · {view.watch.parries} parries · {view.watch.cleanses} cleanses · {Math.round(view.watch.healing)} health restored</p>}{(view.hostId?view.hostId===me.id:session.host)?<><div className="replay-oaths" aria-label="Next company oath">{Object.entries(OATHS).map(([id,o])=><button key={id} aria-pressed={companyOath===id} onClick={()=>setCompanyOath(id as OathId)}><b>{o.name}</b><small>{o.tradeoff}</small></button>)}</div><button onClick={replayWatch}>Begin another watch →</button></>:<p>Your company leader can begin another watch.</p>}</section>}

   <div className="desktop-controls-hint"><b>WASD</b> {view?.frontier?<>move / strafe · <b>Shift</b> run · </>:<>move · </>}<b>Right drag</b> look · <b>Click / J</b> strike · <b>F</b> face threat · <b>{view?.frontier?"K":"E"}</b> skill · {view?.frontier&&<><b>E</b> gather · <b>B</b> build · </>}<b>Space</b> dash</div><div className="combat-controls"><button disabled={!canAct||me.dodgeCooldown>0||me.stamina<25} className="dodge-button" onPointerDown={()=>{if(!blocked.current)queueDash();}} onClick={e=>{if(e.detail===0&&!blocked.current)queueDash();}}><kbd>SPACE</kbd><Icon kind="dodge"/><span>{me.dodgeCooldown>0?`${(me.dodgeCooldown/1000).toFixed(1)}s`:"Dash"}</span></button><button disabled={!canAct||me.equippedSkill==="Survey"||me.skillCooldown>0||me.mp<(me.heroClass==="Spellweaver"||me.heroClass==="Warden"?32:12)||(me.heroClass!=="Spellweaver"&&me.heroClass!=="Warden"&&me.stamina<28)} onPointerDown={()=>{if(!blocked.current)queueSkill();}} onClick={e=>{if(e.detail===0&&!blocked.current)queueSkill();}}><kbd>{view?.frontier?"K / 2":"E / K"}</kbd><Icon kind="star"/><span>{me.skillCooldown>0?`${(me.skillCooldown/1000).toFixed(1)}s`:me.equippedSkill}</span></button><button className="attack-button" disabled={!canAttack} onClick={e=>{if(e.detail===0&&!blocked.current){faceThreat(false);pending.current.attack=true;}}} onPointerDown={e=>{if(blocked.current)return;e.currentTarget.setPointerCapture(e.pointerId);faceThreat(false);heldAttack.current=true;pending.current.attack=true;}} onPointerUp={()=>heldAttack.current=false} onPointerCancel={()=>heldAttack.current=false} onLostPointerCapture={()=>heldAttack.current=false}><kbd>J / 1</kbd><Icon kind={classIcon(me.heroClass)}/><span>{me.heroClass==="Spellweaver"||me.heroClass==="Warden"?"Arc bolt":me.weapon?"Strike":"Unarmed"}</span></button></div>



   {error&&<div className="connection-error" role="status">{error}</div>}

   {map&&<div className="overlay"><section className="map-panel" role="dialog" aria-modal="true" aria-label="World map"><button className="close" aria-label="Close map" onClick={()=>setMap(false)}>×</button><p className="overline">MAP</p><h2>{floor?`The Hollow Spire · ${floor}`:"The Borderlands"}</h2><div className="world-map">{chart()}</div><p>Red arrow: You are here · Blue: your party. Rings: arenas · Flags: guilds · Houses: lodges. No enemies or strangers appear on this map.</p></section></div>}

   {journal&&<div className="overlay"><section className="help-panel" role="dialog" aria-modal="true" aria-label="Adventure information"><button className="close" aria-label="Close adventure guide" onClick={()=>setJournal(false)}>×</button><p className="overline">ADVENTURE</p><h2>Beyond the gate.</h2><div className="mode-list">{[["guild","Guild contracts","Hunt three beasts, earn 120 XP; then clear dungeon depth one for 200 XP."],["arena","Town arena · PvP","Walk onto the sand to fight other adventurers. Town streets remain safe."],["dungeon","Hollow Spire · PvE","Ten depths. Defeat every guardian and creature to open the next descent."],["inn","Lodge · return point","Book a room to recover. Next time you open the game, start at your chosen lodge."]].map(([key,title,body])=><button key={key} onClick={()=>{setDestination(key);finishTutorial();setJournal(false);}}><b>{title}</b><span>{body}</span><small>Mark on map →</small></button>)}</div><p>Emberveil has a village ring. Highcrown, northwest along the road, has a larger arena. Residents are protected; fight rivals on arena sand or in the wilderness.</p></section></div>}
   {view?.cleared.includes(10)&&me.floor===0&&<div className="ending" role="status"><strong>The Hollow Spire is conquered.</strong><p>Your watch is complete. Return to the wilds, or begin again together.</p>{session?.host&&session.room&&<button onClick={async()=>{if(!session)return;resetInput();const requestNumber=++requests.current;try{const next=await request<WorldView>({action:"restart",...session});if(!order.current.accept(requestNumber))return;live.current=Object.assign(next,{received:Date.now()});setView(next);setNotice("A new watch begins. Everyone starts at level one; your party stays together.");}catch(e){setNotice(e instanceof Error?e.message:"Please try again.");}}}>Begin the next watch · reset this room</button>}</div>}
   {stats&&<div className="overlay"><section className="help-panel character-panel" role="dialog" aria-modal="true" aria-label="Character and atelier"><button className="close" aria-label="Close character" onClick={()=>{setStats(false);setHelp(true);}}>×</button><CharacterPanel hero={me} act={develop}/></section></div>}

   {help&&<div className="overlay"><section className="help-panel" role="dialog" aria-modal="true" aria-label="Adventure information"><button className="close" aria-label="Close controls" onClick={()=>setHelp(false)}>×</button><p className="overline">MENU</p><h2>Ashwatch</h2><a className="frontier-entry-link" href={view?.frontier?"/ashwatch":"/ashwatch/frontier"}>{view?.frontier?"Play a company watch":"Explore the new wild frontier"} →</a>{view?.frontier&&<p>WASD moves, strafes and backpedals without swinging the camera. Right drag or Q/R turns your character and view. Hold Shift to run, tap Run on touch, or click the left controller stick to toggle running. Gather fallen timber, stone, herbs and aether. E faces the nearest visible resource and gathers within reach; hold Strike to harvest again. K uses your class skill. B opens your satchel. Plan a structure, turn toward clear ground, then click to place it. R rotates your plan; Escape cancels it. Drink from the river with E. Your bedroll binds your return point. Food, water and warmth matter as day turns to night.</p>}{FREE_PLAYTEST&&<p className="playtest-hosting">Free public playtest. The server sleeps after 15 idle minutes and can take about a minute to wake. Rooms and progress reset on sleep, restart or redeploy. Create a new company if your code expires.</p>}{!view?.watch&&!view?.frontier&&<nav className="menu-tabs"><button onClick={()=>{setHelp(false);setMap(true);}}>Unroll paper map</button><button onClick={()=>{setHelp(false);setStats(true);}}>Character · skills · shop</button><button onClick={()=>{setHelp(false);setJournal(true);}}>Adventure guide ?</button><button onClick={()=>{setHelp(false);setRebirth(true);}}>Revisit rebirth</button></nav>}{view?.watch&&<div className="watch-help"><h3>{me.heroClass} · {me.equippedSkill}</h3><p>{CLASSES[me.heroClass].description}</p><p>WASD moves relative to your camera and turns your character. Movement keeps combat facing briefly after an attack, so you can backstep or dash without holding Strike. Hold Strike to keep strafing for longer. Right drag or Q / R turns your character and camera. E uses your skill; Space dashes. A Warden can use H to face an injured teammate already in sight.</p><p>A cover call locates a teammate relative to you. Turn toward the call, then heal, cleanse, or stop an attack threatening them. A real response is marked Covered.</p><p>Read the raised weapon, keep room to evade, then commit as the stance settles. A strike that lands during enemy recovery deals 30% more damage. Choose a new company oath after victory or defeat.</p></div>}<p>{me.name} · {me.heroClass} · {view?.population} adventurers · {online?"Connected":"Reconnecting"}<br/>{view?.watch?`Frontier watch · encounter ${view.watch.stage+1} of 3`:floor?`Hollow Spire · depth ${floor}`:town.name}</p><details className="menu-report"><summary>Report an issue</summary><p>Copy this report when describing a problem: {me.heroClass}, level {me.level}, depth {floor}, room {session.room??"local"}, graphics {lowQuality?"performance":"full"}. No account or private token is included.</p><button onClick={async()=>{try{await navigator.clipboard.writeText(`Ashwatch · ${me.heroClass} · level ${me.level} · depth ${floor} · room ${session.room??"local"} · graphics ${lowQuality?"performance":"full"}`);setNotice("Report details copied.");}catch{setNotice("Select and copy the report text above.");}}}>Copy report details</button></details><h3>Controls & sensitivity</h3>{session?.room&&<button onClick={copyInvite}>Copy company invite · {session.room}</button>}{session?.room&&<p className="room-code">Adventure code: <strong>{session.room}</strong><br/>Share this code and server address with friends. Room members begin in the same party. Frontier watches support one to five players. Each room has its own enemies and dungeon progress. Rooms expire after 20 minutes without a connected company. Rejoin after a brief interruption using this browser.</p>}<dl><dt><span className="desktop-instructions">W A S D / arrows</span><span className="phone-instructions">Movement stick</span></dt><dd>Move · or drag the thumb pad</dd><dt><span className="desktop-instructions">J / 1 / hold click</span><span className="phone-instructions">Attack</span></dt><dd>Attack a visible foe in reach</dd><dt><span className="desktop-instructions">E / K / 2</span><span className="phone-instructions">Skill</span></dt><dd>{`${me.equippedSkill}: ${me.equippedSkill==="Renew"?"restore yourself and nearby party members you face":CLASSES[me.heroClass].description}`}</dd><dt><span className="desktop-instructions">Space</span><span className="phone-instructions">Dash</span></dt><dd>Directional dash · costs 25 stamina · briefly avoids damage</dd>{view?.watch?<><dt>F / Face threat</dt><dd>Face a foe already in sight</dd><dt>G / Call cover</dt><dd>Ask your company to turn, heal, cleanse or interrupt</dd></>:<><dt>Open archway</dt><dd>Cross an open archway</dd><dt>Map</dt><dd>Unfold your map</dd></>}</dl><div className="preferences"><button aria-pressed={sound} onClick={()=>{const value=!sound;setSound(value);feedback.current??=new Feedback();feedback.current.setVolume(preferenceRef.current.volume);try{feedback.current.enable(value);changePreferences({sound:value});}catch{setSound(false);}}}>Sound · {sound?"On":"Off"}</button><button aria-pressed={lowQuality} onClick={()=>{changePreferences(preferences.automaticGraphics?{performance:false,automaticGraphics:false}:lowQuality?{performance:false,automaticGraphics:true}:{performance:true,automaticGraphics:false});}}>Graphics · {preferences.automaticGraphics?"Auto":lowQuality?"Performance":"Full"}</button><button aria-pressed={reduceMotion} onClick={()=>{changePreferences({reducedMotion:!reduceMotion});}}>Reduced motion · {reduceMotion?"On":"Off"}</button></div><div className="control-settings">{([{key:"volume",label:"Sound volume",min:0,max:1,step:.05},{key:"mouse",label:"Mouse & keyboard sensitivity",min:.2,max:1.8,step:.05},{key:"touch",label:"Touch look sensitivity",min:.2,max:1.8,step:.05},{key:"controller",label:"Controller look sensitivity",min:.2,max:1.8,step:.05},{key:"distance",label:"Camera distance",min:3.5,max:6.5,step:.1},{key:"response",label:"Camera response",min:3,max:12,step:.5}] as const).map(setting=><label key={setting.key}>{setting.label}<output>{setting.key==="mouse"||setting.key==="touch"?`${Math.round(lookDelta(100,preferences[setting.key],setting.key)*(setting.key==="mouse"?2:1.4)*180/Math.PI)}° / 100px drag${setting.key==="mouse"?` · ${Math.round(2.2*preferences.mouse*180/Math.PI)}°/s Q/R`:""}`:setting.key==="controller"?`${Math.round(2.2*preferences.controller*180/Math.PI)}° / second`:preferences[setting.key].toFixed(2)}</output><input aria-label={setting.label} type="range" min={setting.min} max={setting.max} step={setting.step} value={preferences[setting.key]} onChange={e=>changePreferences({[setting.key]:Number(e.target.value)})}/></label>)}<button onClick={()=>{changePreferences({...DEFAULTS});feedback.current?.enable(false);}}>Reset controls and camera</button></div><p>Hold the right mouse button to look freely; release it to restore the cursor. If mouse capture is unavailable, drag to turn. Drag the world on touch to look. Standard controllers: press the right stick to face a visible threat; left stick moves, right stick turns; X / Square or right trigger attacks, Y / Triangle uses your skill, A / Cross or B / Circle dashes, LB / L1 interacts, RB / R1 calls for cover, View / Share opens the map, and Start / Options opens or closes Controls. Release combat buttons after closing a menu. Use keyboard, touch or mouse to navigate menus. Movement follows the current camera direction. {view?.frontier?"In the frontier, movement keeps your facing: A/D strafe and S backpedals. Turn with right drag or Q/R.":"Your character turns toward travel."} For 1.8 seconds after an accepted attack, movement preserves combat facing; holding Strike or right drag extends it. Q / R, right mouse drag, touch look, or the right stick turns; F or Face threat faces an enemy already in sight. In the open world, hold Strike while moving to preserve facing. The camera follows your character’s facing. A held movement direction stays steady while the view turns; release and press again to move relative to the new view. Looking deliberately turns your character; the camera follows the accepted facing, including committed combat direction. The sensitivity readout shows directional swing; Q / R uses the mouse setting. Q / R or the turn buttons look around without moving. Menus stop your controls; other players and enemies keep moving.</p><p>You have a broad forward view. Awareness widens your forward sight, pulls the camera back, and gradually reveals a small nearby area behind you. Attacks and party healing still require you to face their targets. Distant rear threats stay hidden. Read enemies through their visible motion. There are no incoming-strike signs, countdowns or attack-area rings; teammates can still call for cover. {view?.watch?"Your company is cooperative. Cover one another through the three encounters.":"Clear each dungeon floor to break its seal. Beyond the village, every adventurer can be a rival."}</p><button onClick={async()=>{if(!session)return;resetInput();try{await request({action:"leave",...session});}catch{}store(sessionKey,null);setSession(null);live.current=null;setView(null);setHelp(false);}}>Leave adventure · return to entry</button>{!view?.watch&&!view?.frontier&&<button className="tutorial-restart" onClick={restartTutorial}>Restart first-adventure tutorial</button>}<small>{session.room?"Room progress expires after 20 minutes without a connected company. Keep browser data to resume. Restart recovery requires the server’s saved company data.":"Your character is saved on this computer’s server. Keep browser data to return to your character."}</small></section></div>}

  </>}

 {rebirth&&<Rebirth reduced={reduceMotion} onChoose={cls=>{setHeroClass(cls);setRebirth(false);store("ashwatch-rebirth-v1","seen");}}/>}
 </main>;

}







