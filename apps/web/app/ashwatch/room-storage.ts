import {mkdirSync,readFileSync,writeFileSync,renameSync,existsSync,statSync} from "node:fs";
import {createHash} from "node:crypto";
import path from "node:path";
import type {Rooms} from "./rooms.ts";

// One Node process and one persistent directory. No multi-instance coordination.
export class RoomStorage {
 private lastAttempt=0;
 private healthy=true;
 readonly file:string;
 private clock:()=>number;
 constructor(directory:string,clock:()=>number=Date.now){this.clock=clock;this.file=path.join(directory,"companies-v1.json");}
 load(rooms:Rooms){
  try{
   if(!existsSync(this.file))return;
   if(statSync(this.file).size>8*1024*1024)throw Error("Checkpoint exceeds size limit");
   const envelope=JSON.parse(readFileSync(this.file,"utf8"));
   if(envelope.version!==1||typeof envelope.payload!=="string"||envelope.checksum!==createHash("sha256").update(envelope.payload).digest("hex"))throw Error("Invalid checkpoint checksum or version");
   rooms.restore(JSON.parse(envelope.payload));
  }catch{this.healthy=false;throw Error("Company storage needs recovery. The existing checkpoint was preserved.");}
 }
 save(rooms:Rooms,force=false){
  if(!this.healthy)throw Error("Company storage needs recovery. The existing checkpoint was preserved.");
  if(!force&&this.clock()-this.lastAttempt<2000)return;
  this.lastAttempt=this.clock();
  try{
   const payload=JSON.stringify(rooms.checkpoint());if(Buffer.byteLength(payload)>8*1024*1024)throw Error("Checkpoint exceeds size limit");
   mkdirSync(path.dirname(this.file),{recursive:true,mode:0o700});
   const envelope={version:1,checksum:createHash("sha256").update(payload).digest("hex"),payload};
   writeFileSync(this.file+".tmp",JSON.stringify(envelope),{mode:0o600});renameSync(this.file+".tmp",this.file);
  }catch(error){throw Error("Company storage is unavailable. Please retry after storage is restored.",{cause:error});}
 }
}
