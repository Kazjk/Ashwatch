import test from "node:test";
import assert from "node:assert/strict";
import {Feedback} from "../apps/web/app/ashwatch/feedback.ts";
import {Rooms} from "../apps/web/app/ashwatch/rooms.ts";
import {COMBAT} from "../apps/web/app/ashwatch/combat.ts";
type Tone={from:number;to:number;type:string};
function capture(run:(tones:Tone[])=>void){
 const original=globalThis.AudioContext,tones:Tone[]=[];
 class FakeContext{state="running";currentTime=0;destination={};resume(){return Promise.resolve();}close(){return Promise.resolve();}createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}
  createOscillator(){const voice={from:0,to:0,type:"sine",frequency:{setValueAtTime(v:number){voice.from=v;},exponentialRampToValueAtTime(v:number){voice.to=v;}},connect(){},disconnect(){},start(){tones.push({from:voice.from,to:voice.to,type:voice.type});},stop(){},onended:null};return voice;}}
 globalThis.AudioContext=FakeContext as unknown as typeof AudioContext;
 try{run(tones);}finally{globalThis.AudioContext=original;}
}
test("each class has a distinct preparation cue and contact is heard once after actual server resolution",()=>capture(tones=>{
 const preparations=[];
 for(const cls of Object.keys(COMBAT) as (keyof typeof COMBAT)[]){
  let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Audio",cls,"watch"),w=rooms.get(s.room).world,p=w.heroes.get(s.id)!,enemy=w.monsters[0];rooms.start(s.room,s.id,s.token);enemy.y=p.y-60;enemy.hp=enemy.maxHp=1000;enemy.nextAttack=now+10000;enemy.facing=Math.PI/2;if(cls==="Warden"||cls==="Ironbound")p.hp-=80;
  const f=new Feedback();try{f.enable(true);f.update(w.snapshot(s.id,s.token));const before=tones.length;
   const intent=w.input(s.id,s.token,{sequence:1,x:0,y:0,facing:-Math.PI/2,skill:true});f.update(intent);assert.equal(tones.length,before+1);preparations.push(tones.at(-1)!.from);f.update(intent);assert.equal(tones.length,before+1);
   now+=COMBAT[cls].skillContact-1;f.update(w.snapshot(s.id,s.token));assert.equal(tones.length,before+1);
   now++;const contact=w.snapshot(s.id,s.token);assert.equal(contact.heroes.find(h=>h.id===s.id)!.action?.resolved,true);f.update(contact);assert.equal(tones.length,before+2,cls);f.update(contact);assert.equal(tones.length,before+2);
   if(cls==="Spellweaver")assert.deepEqual(tones.at(-1),{from:420,to:1250,type:"sine"});
  }finally{f.dispose();}
 }
 assert.equal(new Set(preparations).size,5);
}));
test("restored already-resolved actions without fresh effects cannot replay contact audio",()=>capture(tones=>{
 let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Audio","Spellweaver","watch"),w=rooms.get(s.room).world;rooms.start(s.room,s.id,s.token);const f=new Feedback();
 try{f.enable(true);f.update(w.snapshot(s.id,s.token));f.update(w.input(s.id,s.token,{sequence:1,x:0,y:0,facing:-Math.PI/2,skill:true}));now+=440;const v=w.snapshot(s.id,s.token);f.update(v);const before=tones.length,restored=structuredClone(v),p=restored.heroes.find(h=>h.id===s.id)!;p.action!.at+=10000;p.action!.contactAt+=10000;restored.effects=[];f.update(restored);assert.equal(tones.length,before);}finally{f.dispose();}
}));
test("an actual Starfall event retains its release sound when a complete action fell between polls",()=>capture(tones=>{
 let now=100000;const rooms=new Rooms(()=>now),s=rooms.create("Audio","Spellweaver","watch"),w=rooms.get(s.room).world;rooms.start(s.room,s.id,s.token);const f=new Feedback();
 try{f.enable(true);f.update(w.snapshot(s.id,s.token));const before=tones.length;w.input(s.id,s.token,{sequence:1,x:0,y:0,facing:-Math.PI/2,skill:true});now+=440;f.update(w.snapshot(s.id,s.token));assert.equal(tones.length,before+1);assert.deepEqual(tones.at(-1),{from:420,to:1250,type:"sine"});}finally{f.dispose();}
}));
