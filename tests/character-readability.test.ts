import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {adventurer,PHYSIQUE} from "../apps/web/app/ashwatch/watch-adventurer.ts";
import {combatFraming,combatCameraSide} from "../apps/web/app/ashwatch/camera-framing.ts";
import {cameraRig} from "../apps/web/app/ashwatch/controls.ts";
import {beginAction} from "../apps/web/app/ashwatch/combat.ts";

// Only the original procedural cloth canvas needs a stub; the actual meshes,
// articulation, transforms and ray/triangle intersection are Three's implementation.
function withCanvas(run:()=>void){
 const original=Object.getOwnPropertyDescriptor(globalThis,"document");
 Object.defineProperty(globalThis,"document",{configurable:true,value:{createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillStyle:""})})}});
 try{run();}finally{if(original)Object.defineProperty(globalThis,"document",original);else Reflect.deleteProperty(globalThis,"document");}
}
for(const cls of Object.keys(PHYSIQUE) as (keyof typeof PHYSIQUE)[]){
 test(`${cls}: the actual scout weapon remains readable during preparation and contact at both screen widths`,()=>withCanvas(()=>{
  const own=adventurer(cls,{weapon:"watch-sword"}),enemy=adventurer("Knight",{weapon:"watch-sword",faction:"ashen"}),spacing=(cls==="Ironbound"?46:38)*.04;
  own.group.position.y=.18;enemy.group.position.set(0,.18,-spacing);enemy.group.rotation.y=Math.PI;enemy.group.scale.setScalar(.88);
  try{for(const narrow of [false,true])for(const awareness of [0,20,100])for(const when of [100400,101050]){
   own.animate(when/1000,0);enemy.animate(when/1000,0,0,0,false,{...beginAction("Knight",false,Math.PI/2,100000),contactAt:101050,recoveryAt:101160,endsAt:102450},when);
   own.group.updateMatrixWorld(true);enemy.group.updateMatrixWorld(true);
   const rig=cameraRig(awareness),frame=combatFraming(PHYSIQUE[cls],spacing,narrow),camera=new THREE.Vector3(frame.shoulder*combatCameraSide(cls),rig.height+.18+frame.lift,rig.distance);let clear=0,total=0;
   enemy.arm.traverse(o=>{if(!(o instanceof THREE.Mesh))return;const pos=o.geometry.getAttribute("position");for(let i=0;i<pos.count;i+=Math.ceil(pos.count/60)){
    const point=o.localToWorld(new THREE.Vector3().fromBufferAttribute(pos,i)),direction=point.clone().sub(camera),d=direction.length(),ray=new THREE.Raycaster(camera,direction.normalize(),0,d-.02);
    if(!ray.intersectObject(own.group,true).length)clear++;total++;
   }});
   assert.ok(clear/total>=.75,`${cls}, Awareness${awareness}, narrow${narrow}, time${when}: ${(clear/total*100).toFixed(1)}% of the weapon-arm samples clear`);
  }}finally{own.dispose();enemy.dispose();}
 }));
}
