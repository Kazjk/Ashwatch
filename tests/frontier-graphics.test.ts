import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {FrontierRenderer} from "../apps/web/app/ashwatch/frontier-renderer.ts";
import {SETTLEMENT_BUILDINGS} from "../apps/web/app/ashwatch/settlement-layout.ts";
import {FOREST,canopyOverlaps} from "../apps/web/app/ashwatch/frontier-land.ts";

test("actual tree trunk, branch and foliage-card bounds stay outside every settlement building",()=>{
 const original=Object.getOwnPropertyDescriptor(globalThis,"document"),load=THREE.TextureLoader.prototype.load;
 const context=new Proxy({},{get:(_,key)=>key==="createLinearGradient"||key==="createRadialGradient"?()=>({addColorStop(){}}):()=>{}});
 Object.defineProperty(globalThis,"document",{configurable:true,value:{createElement:()=>({width:0,height:0,getContext:()=>context})}});
 THREE.TextureLoader.prototype.load=()=>new THREE.Texture();
 let scene:FrontierRenderer|undefined;
 try{
  scene=new FrontierRenderer(1,true);
  const matrix=new THREE.Matrix4(),bounds=new THREE.Box3();
  const buildings=SETTLEMENT_BUILDINGS.map(([x,y,size])=>new THREE.Box3(new THREE.Vector3(x*.04-3.2*size,-2,y*.04-2.2*size),new THREE.Vector3(x*.04+3.2*size,6*size,y*.04+2.2*size)));
  for(const name of ["forest-trunks","forest-branches","forest-crowns"]){
   const mesh=scene.group.getObjectByName(name) as THREE.InstancedMesh;assert.ok(mesh?.isInstancedMesh,name);mesh.geometry.computeBoundingBox();
   for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);bounds.copy(mesh.geometry.boundingBox!).applyMatrix4(matrix);assert.ok(buildings.every(b=>!b.intersectsBox(bounds)),`${name} instance${i} intersects architecture`);}
  }
  assert.ok(FOREST.length>80,"Retain a real woodland rather than deleting all trees.");
  assert.equal(canopyOverlaps(950,1750),false,"The existing representative paid cabin remains in a clearing.");
  assert.equal(canopyOverlaps(FOREST[0].x,FOREST[0].y),true);
 }finally{scene?.dispose();THREE.TextureLoader.prototype.load=load;if(original)Object.defineProperty(globalThis,"document",original);else Reflect.deleteProperty(globalThis,"document");}
});
