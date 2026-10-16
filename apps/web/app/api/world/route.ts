import {oathId} from "../../ashwatch/oaths";
import {RoomStorage} from "../../ashwatch/room-storage";
import {Rooms} from "../../ashwatch/rooms";
import { LivingWorld, type Input } from "../../ashwatch/world";
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import path from "node:path";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const globalWorld = globalThis as unknown as { ashwatchLivingWorldV2?: LivingWorld;ashwatchRoomsV2?:Rooms;ashwatchApiActiveV3?:boolean;ashwatchTickV3?:ReturnType<typeof setInterval>;ashwatchRoomStorageV1?:RoomStorage;ashwatchRoomStorageErrorV1?:string };
const world = globalWorld.ashwatchLivingWorldV2 ??= new LivingWorld();
const saveDir=process.env.ASHWATCH_SAVE_DIR??path.join(process.cwd(),".ashwatch-saves");
const saveFile=path.join(saveDir,"profiles.json");
if(world.heroes.size===0&&existsSync(saveFile))world.loadProfiles(JSON.parse(readFileSync(saveFile,"utf8")));
const rooms=globalWorld.ashwatchRoomsV2??=new Rooms();
const freshStorage=!globalWorld.ashwatchRoomStorageV1;
const roomStorage=globalWorld.ashwatchRoomStorageV1??=new RoomStorage(saveDir);
if(freshStorage)try{roomStorage.load(rooms);}catch(error){globalWorld.ashwatchRoomStorageErrorV1=error instanceof Error?error.message:"Company storage needs recovery.";}
let checkpointWarning=false;
// One clock per long-lived Node process. Slow browser requests do not slow combat contact.
globalWorld.ashwatchTickV3??=setInterval(()=>{if(!globalWorld.ashwatchApiActiveV3)return;world.advance();if(globalWorld.ashwatchRoomStorageErrorV1)return;rooms.tick();try{roomStorage.save(rooms);checkpointWarning=false;}catch{if(!checkpointWarning)console.error("[Ashwatch] Company checkpoint could not be saved.");checkpointWarning=true;}},50);
globalWorld.ashwatchTickV3.unref();
function roomResponse(value:unknown,force=false){roomStorage.save(rooms,force);return Response.json(value);}
let lastSave=0;
function save(force=false){if(!force&&Date.now()-lastSave<5000)return;mkdirSync(saveDir,{recursive:true});writeFileSync(saveFile+".tmp",JSON.stringify(world.saveProfiles()));renameSync(saveFile+".tmp",saveFile);lastSave=Date.now();}
export async function POST(request: Request) {
  globalWorld.ashwatchApiActiveV3=true;
  try {
    const raw=await request.text();
    if(raw.length>2048)return Response.json({error:"Request too large"},{status:413});
    const body=JSON.parse(raw);
    if((body.room||body.roomMode)&&globalWorld.ashwatchRoomStorageErrorV1)throw Error(globalWorld.ashwatchRoomStorageErrorV1);
    let selected=null;
    if(body.room){try{selected=rooms.get(body.room);}catch(error){if(body.action!=="enter")throw Error("SESSION_EXPIRED");throw error;}}
    if(body.action==="enter"&&body.roomMode==="create")selected=null;
    const active=selected?.world??world;
    if(body.action==="enter") {
      if(typeof body.name!=="string"||!["Knight","Spellweaver","Ironbound","Rogue","Warden"].includes(body.heroClass))throw Error("Invalid adventurer");
      const session=body.roomMode==="create"?rooms.create(body.name,body.heroClass,body.adventureKind==="watch"?"watch":body.adventureKind==="frontier"?"frontier":"world",oathId(body.oath??"lantern")):body.roomMode==="join"?rooms.join(body.room,body.name,body.heroClass):world.enter(body.name,body.heroClass);if(!body.roomMode)save(true);return body.roomMode?roomResponse(session,true):Response.json(session);
    }
    if(typeof body.id!=="string"||typeof body.token!=="string")throw Error("SESSION_EXPIRED");
    if(body.action==="leave"){if(selected){rooms.leave(body.room,body.id,body.token);return roomResponse({left:true},true);}const hero=active.authenticate(body.id,body.token);hero.input={x:0,y:0};hero.lastSeen=0;return Response.json({left:true});}
    if(body.action==="start")return roomResponse({...rooms.start(body.room,body.id,body.token),hostId:rooms.get(body.room).host},true);
    if(body.action==="restart")return roomResponse(rooms.restart(body.room,body.id,body.token,body.oath),true);
    if(body.action==="resume"){const value={...active.resume(body.id,body.token),hostId:selected?.host};return selected?roomResponse(value,true):Response.json(value);}
    if(body.action==="service"){
      if(!["mission","claim","rest","party"].includes(body.service)||body.partyCode!==undefined&&typeof body.partyCode!=="string")throw Error("Invalid service");
      const p=active.authenticate(body.id,body.token);
      active.service(p,{sequence:0,x:0,y:0,service:body.service,partyCode:body.partyCode});const view=active.snapshot(body.id,body.token);if(!selected)save(true);return Response.json(view);
    }
    if(body.action==="develop"){const view=active.develop(body.id,body.token,body.kind,body.key);if(!selected)save(true);return Response.json(view);}
    if(body.action==="snapshot"){const value={...active.snapshot(body.id,body.token),hostId:selected?.host};return selected?roomResponse(value):Response.json(value);}
    if(body.action!=="input"||!body.input||typeof body.input!=="object")throw Error("Invalid action");
    const hero=active.authenticate(body.id,body.token),before={sequence:hero.seq,attackAt:hero.attackAt,dodgeAt:hero.dodgeAt,warnings:active.watch?.warnings,state:active.watch?.state};
    const view=active.input(body.id,body.token,body.input as Input);if(!selected)save();
    const value={...view,hostId:selected?.host};return selected?roomResponse(value,hero.attackAt!==before.attackAt||hero.dodgeAt!==before.dodgeAt||active.watch?.warnings!==before.warnings||active.watch?.state!==before.state||!!active.frontier&&(!!body.input.frontier||body.input.interact===true)&&hero.seq!==before.sequence):Response.json(value);
  } catch(error) {
    const message=error instanceof Error?error.message:"Request failed";
    return Response.json({error:message},{status:message.includes("storage")?503:message==="SESSION_EXPIRED"?401:400});
  }
}

