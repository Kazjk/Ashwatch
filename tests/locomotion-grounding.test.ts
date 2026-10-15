import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {adventurer,PHYSIQUE} from "../apps/web/app/ashwatch/watch-adventurer.ts";

function withCanvas(run:()=>void){const original=Object.getOwnPropertyDescriptor(globalThis,"document");Object.defineProperty(globalThis,"document",{configurable:true,value:{createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillStyle:""})})}});try{run();}finally{if(original)Object.defineProperty(globalThis,"document",original);else Reflect.deleteProperty(globalThis,"document");}}
test("all actual class meshes keep a boot on the floor throughout slow travel and running",()=>withCanvas(()=>{
 for(const cls of Object.keys(PHYSIQUE) as (keyof typeof PHYSIQUE)[])for(const movement of [.025,1]){
  const a=adventurer(cls,{weapon:"watch-sword"}),bounds=new THREE.Box3();a.group.position.y=.18;a.animate(100,0);
  try{for(let frame=1;frame<=90;frame++){a.animate(100+frame/60,movement);a.group.updateMatrixWorld(true);const lowest=Math.min(bounds.setFromObject(a.left).min.y,bounds.setFromObject(a.right).min.y)-.18;assert.ok(lowest>=-.004&&lowest<.014,`${cls}, movement${movement}, frame${frame}: sole ${lowest}`);}}finally{a.dispose();}
 }
}));
test("the actual walk cycle settles consistently at thirty and one hundred twenty frames per second",()=>withCanvas(()=>{
 const outcomes=[];
 for(const fps of [30,120]){const a=adventurer("Knight",{weapon:"watch-sword"});try{a.animate(100,0);for(let frame=1;frame<=fps;frame++)a.animate(100+frame/fps,.2);outcomes.push(a.left.rotation.x);}finally{a.dispose();}}
 assert.ok(Math.abs(outcomes[0]-outcomes[1])<.015,`pose difference ${Math.abs(outcomes[0]-outcomes[1])}`);
}));
