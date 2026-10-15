import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {clickedFacing} from "../apps/web/app/ashwatch/click-target.ts";
import {adventurer,PHYSIQUE} from "../apps/web/app/ashwatch/watch-adventurer.ts";

for(const cls of Object.keys(PHYSIQUE) as (keyof typeof PHYSIQUE)[])test(`${cls}: clicking the actual face aims at its admitted position at desktop and narrow widths`,()=>{
 const original=Object.getOwnPropertyDescriptor(globalThis,"document");Object.defineProperty(globalThis,"document",{configurable:true,value:{createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillStyle:""})})}});
 const actor=adventurer(cls,{weapon:"watch-sword"});
 try{
  actor.group.position.set(1,.18,-2);actor.group.updateMatrixWorld(true);
  const head=actor.group.children[0].children.find(p=>Math.abs(p.position.y-1.73)<.001)!;
  const point=head.localToWorld(new THREE.Vector3(0,.03,-.10));
  for(const aspect of [1280/720,390/844]){
   const camera=new THREE.PerspectiveCamera(58,aspect,.1,100);camera.position.set(1.45,5.2,6);camera.lookAt(0,1,-1);camera.updateMatrixWorld();
   const screen=point.clone().project(camera),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(screen.x,screen.y),camera);
   assert.equal(clickedFacing(ray,[{group:actor.group,x:25,y:-50}],{x:0,y:0}),Math.atan2(-50,25));
  }
 }finally{actor.dispose();if(original)Object.defineProperty(globalThis,"document",original);else Reflect.deleteProperty(globalThis,"document");}
});

function fixture(){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(.7,2,.7),new THREE.MeshBasicMaterial());mesh.position.set(1,1,-2);mesh.updateMatrixWorld();
 const ray=new THREE.Raycaster(new THREE.Vector3(1,2,6),new THREE.Vector3(0,-1,-8).normalize());
 return {mesh,ray,target:{group:mesh,x:25,y:-50},origin:{x:0,y:0}};
}
test("retained hidden actors and unadmitted meshes cannot be click targets",()=>{
 const f=fixture();assert.equal(clickedFacing(f.ray,[],f.origin),undefined);f.mesh.visible=false;assert.equal(clickedFacing(f.ray,[f.target],f.origin),undefined);
 f.mesh.visible=true;const hidden=new THREE.Group();hidden.visible=false;hidden.add(f.mesh);assert.equal(clickedFacing(f.ray,[f.target],f.origin),undefined);
 f.mesh.geometry.dispose();f.mesh.material.dispose();
});
test("health indicators do not enlarge a target and opaque stone blocks body selection",()=>{
 const f=fixture();f.mesh.name="health";assert.equal(clickedFacing(f.ray,[f.target],f.origin),undefined);f.mesh.name="";
 const wall=new THREE.Mesh(new THREE.BoxGeometry(3,4,.5),new THREE.MeshBasicMaterial());wall.position.set(1,1,1);assert.equal(clickedFacing(f.ray,[f.target],f.origin,[wall]),undefined);
 wall.visible=false;assert.equal(clickedFacing(f.ray,[f.target],f.origin,[wall]),Math.atan2(-50,25));
 f.mesh.geometry.dispose();f.mesh.material.dispose();wall.geometry.dispose();wall.material.dispose();
});
