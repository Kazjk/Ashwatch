import {oathId,type OathId} from "./oaths.ts";
import {LivingWorld,type HeroClass} from "./world.ts";
export type Room={world:LivingWorld;host:string;run:number};
export class Rooms {
 readonly entries=new Map<string,Room>();
 private clock:()=>number;
 constructor(clock:()=>number=Date.now){this.clock=clock;}
 checkpoint(){this.expire();return [...this.entries].map(([code,room])=>({code,host:room.host,run:room.run,world:room.world.checkpoint()}));}
 restore(saved:ReturnType<Rooms["checkpoint"]>){
  if(!Array.isArray(saved)||saved.length>64)throw Error("Invalid rooms checkpoint");
  const restored=new Map<string,Room>();for(const row of saved){if(!/^[A-F0-9]{6}$/.test(row.code)||typeof row.host!=="string"||!Number.isSafeInteger(row.run)||row.run<1)throw Error("Invalid company checkpoint");const world=new LivingWorld(this.clock);world.restore(row.world);if(!world.heroes.has(row.host))throw Error("Missing company leader");restored.set(row.code,{world,host:row.host,run:row.run});}
  this.entries.clear();for(const [code,room] of restored)this.entries.set(code,room);this.expire();
 }

 private expire(){for(const [code,room] of this.entries)if([...room.world.heroes.values()].every(p=>this.clock()-p.lastSeen>20*60*1000))this.entries.delete(code);}
 tick(){this.expire();for(const room of this.entries.values())if([...room.world.heroes.values()].some(p=>this.clock()-p.lastSeen<2000))room.world.advance();}
 create(name:string,heroClass:HeroClass,mode:"watch"|"world"|"frontier"="world",oath:OathId="lantern"){
  this.expire();
  if(this.entries.size>=64)throw Error("Room capacity reached. Use an existing code.");
  let code:string;do{code=crypto.randomUUID().replaceAll("-","").slice(0,6).toUpperCase();}while(this.entries.has(code));
  const world=new LivingWorld(this.clock);if(mode==="watch")world.configureWatch(oathId(oath),true);if(mode==="frontier")world.configureFrontier();const session=world.enter(name,heroClass);world.heroes.get(session.id)!.party=code;this.entries.set(code,{world,host:session.id,run:1});return {...session,room:code,host:true};
 }
 get(code:unknown){this.expire();if(typeof code!=="string"||!/^[A-F0-9]{6}$/.test(code))throw Error("Use a six-character adventure code.");const room=this.entries.get(code);if(!room)throw Error("Adventure not found. Check the code or create a room.");const host=room.world.heroes.get(room.host);if(!host||this.clock()-host.lastSeen>15000){const next=[...room.world.heroes.values()].find(p=>this.clock()-p.lastSeen<15000);if(next)room.host=next.id;}return room;}
 start(code:string,id:string,token:string){const room=this.get(code);room.world.authenticate(id,token);if(room.host!==id)throw Error("Only the company leader can begin the watch.");room.world.startWatch();return room.world.snapshot(id,token);}
 join(code:string,name:string,heroClass:HeroClass){const room=this.get(code);const session=room.world.enter(name,heroClass);room.world.heroes.get(session.id)!.party=code;return {...session,room:code,host:false};}
 leave(code:string,id:string,token:string){const room=this.get(code),w=room.world;w.authenticate(id,token);const count=w.heroes.size;w.heroes.delete(id);w.frontier?.forget(id);if(w.watch){const oldScale=1+Math.max(0,count-1)*.85,newScale=1+Math.max(0,w.heroes.size-1)*.85;for(const e of w.monsters){e.hp*=newScale/oldScale;e.maxHp*=newScale/oldScale;}}}
 restart(code:string,id:string,token:string,oath?:unknown){const room=this.get(code);room.world.authenticate(id,token);if(room.host!==id)throw Error("Only the host can start the next watch.");if(room.world.watch?(room.world.watch.state==="active"||room.world.watch.state==="forming"):!room.world.cleared.has(10))throw Error("Conquer the Spire before starting the next watch.");
  const fresh=new LivingWorld(this.clock);if(room.world.watch)fresh.configureWatch(oathId(oath??room.world.watch.oath),true,room.run+1);for(const hero of room.world.heroes.values()){const session=fresh.enter(hero.name,hero.heroClass),next=fresh.heroes.get(session.id)!;fresh.heroes.delete(session.id);next.id=hero.id;next.token=hero.token;next.party=hero.party;fresh.heroes.set(hero.id,next);}room.world=fresh;room.run++;return fresh.snapshot(id,token);
 }
}
