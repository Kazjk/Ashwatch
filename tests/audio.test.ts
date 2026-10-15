import test from "node:test";
import assert from "node:assert/strict";
import {Feedback} from "../apps/web/app/ashwatch/feedback.ts";
import {LivingWorld} from "../apps/web/app/ashwatch/world.ts";
test("audio activation is idempotent, voices are bounded, mute and disposal disconnect them",()=>{
 const original=globalThis.AudioContext;const voices:{stopped:boolean;disconnected:boolean;onended:(()=>void)|null}[]=[],gains:{disconnected:boolean;peak:number}[]=[];
 class FakeContext{
  state="running";currentTime=0;destination={};
  resume(){return Promise.resolve();}suspend(){this.state="suspended";return Promise.resolve();}close(){this.state="closed";return Promise.resolve();}
  createOscillator(){const voice={stopped:false,disconnected:false,onended:null as (()=>void)|null,frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){this.disconnected=true;},start(){},stop(){this.stopped=true;}};voices.push(voice);return voice;}
  createGain(){const node={disconnected:false,peak:0,connect(){},disconnect(){this.disconnected=true;},gain:{setValueAtTime(){},exponentialRampToValueAtTime(value:number){node.peak=Math.max(node.peak,value);}}};gains.push(node);return node;}
 }
 globalThis.AudioContext=FakeContext as unknown as typeof AudioContext;
 try{
  const feedback=new Feedback();feedback.setVolume(.5);feedback.enable(true);feedback.enable(true);assert.equal(voices.length,1);
  const w=new LivingWorld(),s=w.enter("Audio","Knight"),v=w.snapshot(s.id,s.token);feedback.update(v);
  for(let i=0;i<12;i++){const next=structuredClone(v);next.heroes[0].hp=v.heroes[0].hp-i-1;feedback.update(next);}
  assert.equal(voices.length,5);assert.ok(gains.every(g=>g.peak<=.0225));feedback.enable(false);assert.ok(voices.every(v=>v.disconnected&&v.stopped));assert.ok(gains.every(g=>g.disconnected));
  feedback.enable(true);assert.equal(voices.length,6);feedback.setVolume(0);assert.ok(voices.every(v=>v.disconnected));feedback.dispose();
 }finally{globalThis.AudioContext=original;}
});
test("repeated contact events do not replay and a fresh room resets event identity",()=>{
 const original=globalThis.AudioContext;let count=0;
 class FakeContext{state="running";currentTime=0;destination={};resume(){return Promise.resolve();}close(){return Promise.resolve();}createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}createOscillator(){count++;return {frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){},start(){},stop(){},onended:null};}}
 globalThis.AudioContext=FakeContext as unknown as typeof AudioContext;
 try{const feedback=new Feedback();feedback.enable(true);const w=new LivingWorld(),s=w.enter("Tester","Knight"),v=w.snapshot(s.id,s.token);feedback.update(v);v.effects=[{id:1,x:0,y:0,floor:0,at:0,kind:"spell",angle:0}];feedback.update(v);const first=count;feedback.update(v);assert.equal(count,first);const next=structuredClone(v);next.selfId="another-session";feedback.update(next);feedback.update(next);feedback.dispose();}finally{globalThis.AudioContext=original;}
});
