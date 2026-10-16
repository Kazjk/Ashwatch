import * as THREE from "three";
import {mergeGeometries} from "three/addons/utils/BufferGeometryUtils.js";
import {FOREST,terrainHeight,riverCenter,RIVER_LEVEL,canopyOverlaps} from "./frontier-land.ts";
import {buildPoint,type FrontierView,type StructureKind,type ResourceNode,type Structure} from "./frontier.ts";
import type {FrontierModels} from "./frontier-models";
import type {Box} from "./controls";

const S=.04;
const rand=(i:number)=>{const v=Math.sin(i*73.1+91.9)*43758.5453;return v-Math.floor(v);};
type Plan={piece:StructureKind;rotation:number}|null;
type Person={x:number;y:number;facing:number};
export class FrontierRenderer{
 readonly group=new THREE.Group();
 readonly terrain:THREE.Mesh;
 readonly resources=new Map<string,THREE.Group>();
 readonly structures=new Map<string,THREE.Group>();
 readonly boxes:Box[]=[];
 private materials:THREE.Material[]=[];
 private textures:THREE.Texture[]=[];
 private geometries:THREE.BufferGeometry[]=[];
 private water:THREE.MeshStandardMaterial;
 private fire:THREE.MeshBasicMaterial;
 private leaf:THREE.MeshStandardMaterial;
 private bark:THREE.MeshStandardMaterial;
 private rock:THREE.MeshStandardMaterial;
 private wood=new THREE.MeshStandardMaterial({color:"#b5a58a",roughness:.92,vertexColors:true});
 private roofing=new THREE.MeshStandardMaterial({color:"#8d8472",roughness:.96,vertexColors:true});
 private cloth=new THREE.MeshStandardMaterial({color:"#77644e",roughness:1});
 private herb=new THREE.MeshStandardMaterial({color:"#60833c",roughness:.95,side:THREE.DoubleSide});
 private aether=new THREE.MeshStandardMaterial({color:"#a3c7d0",emissive:"#508596",emissiveIntensity:.65,roughness:.24,metalness:.12});
 private ring=new THREE.MeshStandardMaterial({color:"#77726b",roughness:.95});
 private ghostMaterial=new THREE.MeshBasicMaterial({color:"#b4cfa3",transparent:true,opacity:.32,depthWrite:false,wireframe:false,vertexColors:true});
 private ghost=new THREE.Group();
 private plane=new THREE.PlaneGeometry(1,1);
 private cube=new THREE.BoxGeometry(1,1,1);
 private gable=new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-1.12,0),new THREE.Vector2(0,.49),new THREE.Vector2(1.12,0)]));
 private cylinder=new THREE.CylinderGeometry(1,1,1,10);
 private stone=new THREE.IcosahedronGeometry(1,1);
 private crystal=new THREE.ConeGeometry(.18,.8,6);
 private disposed=false;
 private low=false;
 private foliage:THREE.InstancedMesh[]=[];
 private hearthLights:THREE.PointLight[]=[];
 private insidePieces=new Set<string>();private updatedAt=0;
 private current:FrontierView|null=null;private models:FrontierModels|undefined;private modelsVersion=-1;
 constructor(anisotropy:number,low=false,sharedTexture?:(name:string,suffix:string)=>THREE.Texture,models?:FrontierModels){
  this.models=models;
  this.low=low;
  const map=(name:string,suffix:string)=>{if(sharedTexture)return sharedTexture(name,suffix);const t=new THREE.TextureLoader().load(`/ashwatch-assets/frontier/${name}-${suffix}.jpg`);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=suffix==="color"?THREE.SRGBColorSpace:THREE.NoColorSpace;t.anisotropy=anisotropy;this.textures.push(t);return t;};
  const pbr=(name:string,color:string)=>{const m=new THREE.MeshStandardMaterial({color,map:map(name,"color"),normalMap:map(name,"normal"),roughnessMap:map(name,"roughness"),roughness:1,normalScale:new THREE.Vector2(.6,.6)});this.materials.push(m);return m;};
  const ground=pbr("forest_floor","#a5ac93");this.bark=pbr("jolcham_oak_bark_01","#c2b9a1");this.rock=pbr("rock_face","#afb8b4");
  // Sawn construction timber and shingles are distinct from living tree bark.
  const timberCanvas=document.createElement("canvas");timberCanvas.width=timberCanvas.height=256;const tc=timberCanvas.getContext("2d")!;tc.fillStyle="#9c8b70";tc.fillRect(0,0,256,256);for(let i=0;i<180;i++){tc.strokeStyle=`rgba(35,27,18,${.025+rand(i)*.1})`;tc.lineWidth=.3+rand(i+8)*1.2;tc.beginPath();const x=rand(i+4)*256;for(let y=0;y<=256;y+=8){const xx=x+Math.sin(y*.035+i)*(.7+rand(i)*2);if(!y)tc.moveTo(xx,y);else tc.lineTo(xx,y);}tc.stroke();}const timber=new THREE.CanvasTexture(timberCanvas);timber.wrapS=timber.wrapT=THREE.RepeatWrapping;timber.colorSpace=THREE.SRGBColorSpace;timber.anisotropy=anisotropy;this.textures.push(timber);this.wood.map=timber;this.wood.bumpMap=timber;this.wood.bumpScale=.018;
  const roofCanvas=document.createElement("canvas");roofCanvas.width=roofCanvas.height=256;const sc=roofCanvas.getContext("2d")!;sc.fillStyle="#4f493f";sc.fillRect(0,0,256,256);for(let row=0;row<8;row++)for(let col=-1;col<8;col++){const tone=95+Math.floor(rand(row*11+col+200)*35),x=col*40+(row%2)*20,y=row*32;sc.fillStyle=`rgb(${tone+9},${tone+1},${tone-12})`;sc.fillRect(x+1,y+1,38,30);sc.fillStyle="rgba(20,18,14,.23)";sc.fillRect(x+1,y+28,38,3);for(let j=0;j<5;j++){sc.fillStyle="rgba(28,23,17,.08)";sc.fillRect(x+5+j*6,y+3,1,24);}}const shingles=new THREE.CanvasTexture(roofCanvas);shingles.wrapS=shingles.wrapT=THREE.RepeatWrapping;shingles.colorSpace=THREE.SRGBColorSpace;shingles.anisotropy=anisotropy;shingles.repeat.set(2,2);this.textures.push(shingles);this.roofing.map=shingles;this.roofing.bumpMap=shingles;this.roofing.bumpScale=.025;
  const terrainGeo=new THREE.PlaneGeometry(120,120,low?96:192,low?96:192);terrainGeo.rotateX(-Math.PI/2);terrainGeo.translate(48,0,48);
  const p=terrainGeo.getAttribute("position"),uv=terrainGeo.getAttribute("uv");
  for(let i=0;i<p.count;i++){p.setY(i,terrainHeight(p.getX(i)/S,p.getZ(i)/S));uv.setXY(i,p.getX(i)/3,p.getZ(i)/3);}terrainGeo.computeVertexNormals();
  this.terrain=new THREE.Mesh(terrainGeo,ground);this.terrain.receiveShadow=true;this.group.add(this.terrain);this.geometries.push(terrainGeo);
  const waterGeo=new THREE.BufferGeometry(),positions:number[]=[],waterUv:number[]=[],indices:number[]=[];
  for(let i=0;i<=160;i++){const z=-200+i*2800/160;for(const side of [-1,1]){positions.push((riverCenter(z)+side*75)*S,RIVER_LEVEL,z*S);waterUv.push(side<0?0:1,i/8);}if(i<160){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}}
  waterGeo.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));waterGeo.setAttribute("uv",new THREE.Float32BufferAttribute(waterUv,2));waterGeo.setIndex(indices);waterGeo.computeVertexNormals();this.geometries.push(waterGeo);
  const ripple=document.createElement("canvas");ripple.width=ripple.height=128;const rc=ripple.getContext("2d")!;rc.fillStyle="#8080ff";rc.fillRect(0,0,128,128);for(let i=0;i<90;i++){rc.strokeStyle=`rgba(${100+Math.floor(rand(i)*55)},${100+Math.floor(rand(i+3)*55)},255,.5)`;rc.beginPath();rc.ellipse(rand(i+7)*128,rand(i+10)*128,10+rand(i+9)*22,1,0,0,Math.PI*2);rc.stroke();}const normals=new THREE.CanvasTexture(ripple);normals.wrapS=normals.wrapT=THREE.RepeatWrapping;this.textures.push(normals);
  this.water=new THREE.MeshStandardMaterial({color:"#547d7c",metalness:.25,roughness:.2,normalMap:normals,normalScale:new THREE.Vector2(.12,.12),transparent:true,opacity:.86});const waterMesh=new THREE.Mesh(waterGeo,this.water);waterMesh.receiveShadow=true;this.group.add(waterMesh);
  const leafCanvas=document.createElement("canvas");leafCanvas.width=leafCanvas.height=128;const c=leafCanvas.getContext("2d")!;
  for(let i=0;i<34;i++){const x=64+(rand(i+700)-.5)*100,y=64+(rand(i+900)-.5)*98;c.fillStyle=["#667b3c","#89954a","#4a6639","#a0a260"][i%4];c.beginPath();c.ellipse(x,y,7+rand(i)*7,3+rand(i+1)*4,rand(i+5)*6.28,0,6.28);c.fill();}const leaves=new THREE.CanvasTexture(leafCanvas);leaves.colorSpace=THREE.SRGBColorSpace;leaves.anisotropy=anisotropy;this.textures.push(leaves);
  this.leaf=new THREE.MeshStandardMaterial({map:leaves,alphaTest:.48,side:THREE.DoubleSide,roughness:1,color:"#cad6a3"});
  new THREE.TextureLoader().load("/ashwatch-assets/frontier/oak-branch-cutout-v1.png",texture=>{if(this.disposed){texture.dispose();return;}texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=anisotropy;this.textures.push(texture);this.leaf.map=texture;this.leaf.color.set("#d9ddca");this.leaf.needsUpdate=true;},undefined,()=>{});
  const fireCanvas=document.createElement("canvas");fireCanvas.width=128;fireCanvas.height=256;const fc=fireCanvas.getContext("2d")!,glow=fc.createRadialGradient(64,210,4,64,164,116);glow.addColorStop(0,"#fff7c8");glow.addColorStop(.3,"#ffdd69");glow.addColorStop(.6,"#ef8c25dc");glow.addColorStop(1,"#b43c0b00");fc.fillStyle=glow;fc.beginPath();fc.moveTo(62,12);fc.bezierCurveTo(85,82,37,86,82,125);fc.bezierCurveTo(114,158,113,223,75,250);fc.bezierCurveTo(32,267,3,217,26,166);fc.bezierCurveTo(61,115,41,77,62,12);fc.fill();const fireTexture=new THREE.CanvasTexture(fireCanvas);fireTexture.colorSpace=THREE.SRGBColorSpace;this.textures.push(fireTexture);this.fire=new THREE.MeshBasicMaterial({map:fireTexture,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});
  this.materials.push(this.water,this.leaf,this.fire,this.roofing,this.wood,this.cloth,this.herb,this.aether,this.ring,this.ghostMaterial);
  this.geometries.push(this.plane,this.cube,this.gable,this.cylinder,this.stone,this.crystal);
  this.makeForest();this.makeGrass();this.makeCliffs();this.group.add(this.ghost);this.ghost.visible=false;
  for(let i=0;i<1;i++){const light=new THREE.PointLight("#ffb16a",0,7,2);this.hearthLights.push(light);this.group.add(light);}
 }
 surface(kind:string|undefined){return kind==="roof"?this.roofing:kind==="wood"?this.wood:kind==="stone"||kind==="rock"?this.rock:undefined;}
 private mesh(g:THREE.BufferGeometry,m:THREE.Material,parent:THREE.Object3D,x=0,y=0,z=0,sx=1,sy=1,sz=1){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 private instances(geometry:THREE.BufferGeometry,material:THREE.Material,items:{x:number;y:number;z:number;sx:number;sy:number;sz:number;rx?:number;ry?:number;rz?:number}[],shadows=true){const mesh=new THREE.InstancedMesh(geometry,material,items.length),dummy=new THREE.Object3D();for(const [i,p] of items.entries()){dummy.position.set(p.x,p.y,p.z);dummy.scale.set(p.sx,p.sy,p.sz);dummy.rotation.set(p.rx??0,p.ry??0,p.rz??0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}mesh.castShadow=shadows;mesh.receiveShadow=true;mesh.computeBoundingSphere();this.group.add(mesh);return mesh;}
 private makeForest(){
  const trunks=[],branches=[],leaves=[];
  for(const t of FOREST){const x=t.x*S,z=t.y*S,y=terrainHeight(t.x,t.y),s=t.size,h=6.7*s;
   trunks.push({x,y:y+h/2,z,sx:.24*s,sy:h,sz:.24*s,rz:(rand(t.seed)-.5)*.08});
   this.boxes.push({min:{x:x-.3*s,y,z:z-.3*s},max:{x:x+.3*s,y:y+h,z:z+.3*s}});
   for(let j=0;j<7;j++){const a=j*2.399+t.seed,reach=(1.3+rand(t.seed+j)*1.2)*s,by=y+(3.3+j*.39)*s;branches.push({x:x+Math.cos(a)*reach*.45,y:by,z:z+Math.sin(a)*reach*.45,sx:.075*s,sy:reach*1.5,sz:.075*s,rx:Math.cos(a)*.8,rz:Math.sin(a)*.8});
    for(let k=0;k<(this.low?4:8);k++){const n=t.seed*117+j*8+k;leaves.push({x:x+Math.cos(a)*reach+(rand(n)-.5)*2.6*s,y:by+.9*s+(rand(n+1)-.5)*1.8*s,z:z+Math.sin(a)*reach+(rand(n+2)-.5)*2.6*s,sx:(1.1+rand(n+3)*.6)*s,sy:(1.1+rand(n+4)*.6)*s,sz:1,rx:(rand(n+5)-.5)*2,ry:rand(n+6)*6.28,rz:rand(n+7)*6.28});}
   }
  }this.instances(this.cylinder,this.bark,trunks).name="forest-trunks";this.instances(this.cylinder,this.bark,branches).name="forest-branches";const crowns=this.instances(this.plane,this.leaf,leaves,false);crowns.name="forest-crowns";this.foliage.push(crowns);
 }
 private makeGrass(){const items=[];for(let i=0;i<(this.low?5500:22000);i++){const x=rand(i+2000)*96,z=rand(i+3000)*96,simx=x/S,simz=z/S;if(Math.abs(simx-riverCenter(simz))<48||Math.hypot(simx-920,simz-1500)<190||Math.hypot(simx-550,simz-530)<510)continue;const y=terrainHeight(simx,simz),height=.18+rand(i+1)*.28,width=.045+rand(i)*.06;items.push({x,y:y+height*.5,z,sx:width,sy:height,sz:width,ry:rand(i+2)*6.28,rz:(rand(i+3)-.5)*.25});}
  // Three crossed blades, instanced as one draw; no transparent sorting or per-blade objects.
  const geo=new THREE.BufferGeometry(),v:number[]=[],uv:number[]=[];for(let j=0;j<3;j++){const a=j*Math.PI/3,dx=Math.cos(a)*.45,dz=Math.sin(a)*.45;v.push(-dx,-.5,-dz,dx,-.5,dz,0,.5,0);uv.push(0,0,1,0,.5,1);}geo.setAttribute("position",new THREE.Float32BufferAttribute(v,3));geo.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));geo.computeVertexNormals();this.geometries.push(geo);const material=new THREE.MeshStandardMaterial({color:"#727f43",roughness:1,side:THREE.DoubleSide});this.materials.push(material);this.instances(geo,material,items,false);
 }
 private makeCliffs(){const items=[];for(let i=0;i<100;i++){const a=i/100*Math.PI*2,r=65+rand(i)*14,x=48+Math.cos(a)*r,z=48+Math.sin(a)*r;items.push({x,y:terrainHeight(x/S,z/S)+1,z,sx:3+rand(i+1)*6,sy:2+rand(i+2)*7,sz:3+rand(i+3)*5,rx:rand(i+4)*.4,ry:a,rz:rand(i+5)*.3});}this.instances(this.stone,this.rock,items);}
 heightAt(x:number,y:number){const floor=this.current?.structures.find(s=>s.kind==="foundation"&&Math.abs(x-s.x)<=25&&Math.abs(y-s.y)<=25);return floor?terrainHeight(floor.x,floor.y)+.43:terrainHeight(x,y);}
 private resource(n:ResourceNode){const g=new THREE.Group();g.position.set(n.x*S,terrainHeight(n.x,n.y),n.y*S);g.rotation.y=rand(n.x)*6.28;
  if(n.kind==="timber"){for(let i=0;i<3;i++){const log=this.mesh(this.cylinder,this.bark,g,(i-1)*.27,.23+i*.08,0,.17,1.8,.17);log.rotation.z=Math.PI/2;log.rotation.y=.1*i;}for(const x of [-.83,.83])this.mesh(this.cylinder,this.wood,g,x,.27,0,.16,.02,.16).rotation.z=Math.PI/2;}
  if(n.kind==="stone"&&this.models?.rocks.length){const rock=this.models.rocks[Math.floor(rand(n.x)*this.models.rocks.length)];this.mesh(rock.geometry,rock.material,g);}else if(n.kind==="stone"){for(let i=0;i<4;i++){const b=this.mesh(this.stone,this.rock,g,(rand(i+n.x)-.5)*.6,.27,(rand(i+n.y)-.5)*.6,.3+rand(i)*.23,.27+rand(i+1)*.3,.4);b.rotation.set(i,.6*i,i*.3);}}
  if(n.kind==="herb"){for(let i=0;i<9;i++){const a=i*2.4;const leaf=this.mesh(this.plane,this.herb,g,Math.cos(a)*.2,.2+rand(i)*.15,Math.sin(a)*.2,.12,.65,.12);leaf.rotation.set(.3, a,.5);}this.mesh(this.stone,this.aether,g,0,.42,0,.07,.07,.07);}
  if(n.kind==="aether"){this.mesh(this.stone,this.rock,g,0,.12,0,.4,.2,.4);for(let i=0;i<4;i++){const c=this.mesh(this.crystal,this.aether,g,(rand(i)*.4)-.2,.38+rand(i+1)*.3,(rand(i+2)*.4)-.2);c.rotation.z=(rand(i+4)-.5)*.7;}}
  return g;
 }
 private releaseGroup(group:THREE.Object3D){for(const geometry of (group.userData.ownedGeometries??[]) as THREE.BufferGeometry[])geometry.dispose();(group.userData.cutawayMaterial as THREE.Material|undefined)?.dispose();group.removeFromParent();}
 private batchStructure(group:THREE.Group){
  group.updateMatrixWorld(true);const inverse=group.matrixWorld.clone().invert(),batches=new Map<THREE.Material,THREE.Mesh[]>();
  group.traverse(o=>{if(!(o instanceof THREE.Mesh)||o.name==="fire"||Array.isArray(o.material))return;const list=batches.get(o.material)??[];list.push(o);batches.set(o.material,list);});
  group.userData.ownedGeometries=[];
  for(const [material,meshes] of batches){const copies=meshes.map(m=>{const g=m.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,m.matrixWorld));const normalized=g.index?g.toNonIndexed():g;if(g.index)g.dispose();const colors=new Float32Array(normalized.attributes.position.count*3).fill(m.userData.tone??1);normalized.setAttribute("color",new THREE.BufferAttribute(colors,3));return normalized;});const merged=mergeGeometries(copies);for(const copy of copies)copy.dispose();if(!merged)continue;for(const mesh of meshes)mesh.removeFromParent();group.userData.ownedGeometries.push(merged);const mesh=new THREE.Mesh(merged,material);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);}
 }
 getCutawayCount(){return [...this.structures.values()].filter(g=>((g.userData.cutawayMaterial as THREE.MeshStandardMaterial|undefined)?.opacity??1)<.95).length;}
 private structure(s:Pick<Structure,"kind"|"x"|"y"|"rotation"|"open">,ghost=false){const g=new THREE.Group(),floor=this.current?.structures.find(f=>f.kind==="foundation"&&Math.abs(s.x-f.x)<=26&&Math.abs(s.y-f.y)<=26);g.position.set(s.x*S,s.kind!=="foundation"&&floor?terrainHeight(floor.x,floor.y)+.43:terrainHeight(s.x,s.y),s.y*S);g.rotation.y=s.rotation*Math.PI/2;if(s.kind==="wall"||s.kind==="door"||s.kind==="roof")g.scale.y=1.12;let wood:THREE.Material=ghost?this.ghostMaterial:this.wood;const rock=ghost?this.ghostMaterial:this.rock;if(!ghost&&(s.kind==="roof"||s.kind==="wall"||s.kind==="door")){const cutaway=(s.kind==="roof"?this.roofing:this.wood).clone();cutaway.transparent=true;g.userData.cutawayMaterial=cutaway;wood=cutaway;}
  if(s.kind==="foundation"){for(let i=0;i<8;i++)this.mesh(this.cube,wood,g,(i-3.5)*.24,.35,0,.23,.16,1.9);for(const z of [-.7,.7])this.mesh(this.cube,wood,g,0,.2,z,1.9,.22,.16);}
  if(s.kind==="wall"){for(let i=0;i<10;i++)this.mesh(this.cube,wood,g,0,1.15,(i-4.5)*.20,.14,2.30,.195).userData.tone=.88+rand(i+Math.floor(s.x))*.22;for(const z of [-.94,.94])this.mesh(this.cube,wood,g,0,1.16,z,.22,2.36,.18).userData.tone=.55;for(const y of [.23,2.18])this.mesh(this.cube,wood,g,.13,y,0,.12,.15,2.02).userData.tone=.64;const brace=this.mesh(this.cube,wood,g,.14,1.17,0,.10,2.35,.12);brace.rotation.x=.60;brace.userData.tone=.65;}
  if(s.kind==="door"){for(const z of [-.95,.95])this.mesh(this.cube,wood,g,0,1.2,z,.27,2.4,.22);this.mesh(this.cube,wood,g,0,2.35,0,.27,.25,2.15);const door=new THREE.Group();door.position.z=-.8;door.rotation.y=s.open?-Math.PI/2:0;for(let i=0;i<7;i++)this.mesh(this.cube,wood,door,0,1.05,.12+i*.235,.14,2.1,.22);for(const y of [.35,1.7])this.mesh(this.cube,wood,door,.09,y,.82,.07,.14,1.6);g.add(door);}
  if(s.kind==="hearth"){for(let i=0;i<10;i++){const a=i/10*6.28;this.mesh(this.stone,ghost?rock:this.ring,g,Math.cos(a)*.5,.12,Math.sin(a)*.5,.18,.15,.2);}for(const a of [0,Math.PI/2]){const log=this.mesh(this.cylinder,wood,g,0,.13,0,.09,.75,.09);log.rotation.set(Math.PI/2,0,a);}if(!ghost)for(let i=0;i<3;i++){const f=this.mesh(this.plane,this.fire,g,(i-1)*.09,.5,0,.5,.85,1);f.rotation.y=i*Math.PI/3;f.castShadow=false;f.name="fire";}}
  if(s.kind==="roof"){for(const side of [-1,1]){const panel=this.mesh(this.cube,wood,g,0,2.55,side*.55,2.25,.12,1.3);panel.rotation.x=side*.4;}for(const side of [-1,1])this.mesh(this.gable,wood,g,side*1.07,2.3,0).rotation.y=side*Math.PI/2;}
  if(s.kind==="bedroll"){this.mesh(this.cube,ghost?wood:this.cloth,g,0,.12,0,.82,.16,1.7);this.mesh(this.cylinder,ghost?wood:this.cloth,g,0,.28,-.65,.2,.82,.2).rotation.z=Math.PI/2;}
  if(s.kind==="ward"){this.mesh(this.stone,rock,g,0,.25,0,.5,.35,.5);const crystal=this.mesh(this.crystal,ghost?wood:this.aether,g,0,1.1,0,1.5,2,1.5);crystal.name="ward";}
  this.batchStructure(g);return g;
 }
 update(view:FrontierView|null,me:Person|undefined,now:number,reduced:boolean,plan:Plan){this.current=view;const dt=this.updatedAt?Math.min(.1,(now-this.updatedAt)/1000):.016;this.updatedAt=now;this.insidePieces.clear();const occupiedFloors=me?(view?.structures??[]).filter(s=>s.kind==="foundation"&&Math.abs(me.x-s.x)<=26&&Math.abs(me.y-s.y)<=26):[];
  if(this.models&&this.modelsVersion!==this.models.version){this.modelsVersion=this.models.version;for(const n of view?.nodes??[])if(n.kind==="stone"){this.resources.get(n.id)?.removeFromParent();this.resources.delete(n.id);}}
  const nodes=new Set<string>();for(const n of view?.nodes??[]){nodes.add(n.id);if(!this.resources.has(n.id)){const g=this.resource(n);this.resources.set(n.id,g);this.group.add(g);}}for(const [id,g] of this.resources)if(!nodes.has(id)){g.removeFromParent();this.resources.delete(id);}
  const structures=new Set<string>();for(const s of view?.structures??[]){structures.add(s.id);let g=this.structures.get(s.id);if(!g||g.userData.open!==s.open){if(g)this.releaseGroup(g);g=this.structure(s);g.userData.open=s.open;this.structures.set(s.id,g);this.group.add(g);}const cutaway=g.userData.cutawayMaterial as THREE.MeshStandardMaterial|undefined;if(cutaway){const inside=occupiedFloors.some(f=>Math.hypot(f.x-s.x,f.y-s.y)<40);if(inside)this.insidePieces.add(s.id);const nearOpenDoor=s.kind==="door"&&s.open&&!!me&&Math.hypot(s.x-me.x,s.y-me.y)<60,fade=nearOpenDoor||inside&&(s.kind==="roof"||!!me&&(s.x-me.x)*Math.cos(me.facing)+(s.y-me.y)*Math.sin(me.facing)<8),target=fade?.14:1;cutaway.opacity=reduced?target:cutaway.opacity+(target-cutaway.opacity)*(1-Math.exp(-dt*10));cutaway.depthWrite=cutaway.opacity>.9;for(const o of g.children)if(o instanceof THREE.Mesh)o.castShadow=!fade;}for(const o of g.children)if(o.name==="fire")o.scale.y=.85*(reduced?1:1+Math.sin(now*.005+s.x)*.08);}for(const [id,g] of this.structures)if(!structures.has(id)){this.releaseGroup(g);this.structures.delete(id);}
  const fires=me?(view?.structures??[]).filter(s=>s.kind==="hearth"&&Math.hypot(s.x-me.x,s.y-me.y)<250).toSorted((a,b)=>Math.hypot(a.x-me.x,a.y-me.y)-Math.hypot(b.x-me.x,b.y-me.y)):[];
  for(const [i,light] of this.hearthLights.entries()){const fire=fires[i];light.intensity=fire?14+(reduced?0:Math.sin(now*.004+fire.x)*.5):0;if(fire)light.position.set(fire.x*S,this.heightAt(fire.x,fire.y)+.65,fire.y*S);}
  this.ghost.visible=!!me&&!!plan;if(me&&plan){const point=buildPoint(me,plan.piece),key=`${plan.piece}:${point.x}:${point.y}:${plan.rotation}`;this.ghostMaterial.color.set(plan.piece==="foundation"&&canopyOverlaps(point.x,point.y)?"#df8e7f":"#b4cfa3");if(this.ghost.userData.key!==key){for(const child of [...this.ghost.children])this.releaseGroup(child);this.ghost.clear();this.ghost.add(this.structure({kind:plan.piece,...point,rotation:plan.rotation,open:false},true));this.ghost.userData.key=key;}}
  if(!reduced&&this.water.normalMap)this.water.normalMap.offset.y=now*.000006;
 }
 collisionBoxes(){const boxes=[...this.boxes];for(const s of this.current?.structures??[])if(!this.insidePieces.has(s.id)&&(s.kind==="wall"||s.kind==="roof"||s.kind==="door"&&!s.open)){const x=s.x*S,z=s.y*S,y=terrainHeight(s.x,s.y),a=s.kind==="roof"?1.15:s.rotation%2?.95:.2,b=s.kind==="roof"?1.15:s.rotation%2?.2:.95;boxes.push({min:{x:x-a,y:s.kind==="roof"?y+2.9:y,z:z-b},max:{x:x+a,y:y+(s.kind==="roof"?3.7:3.25),z:z+b}});}return boxes;}
 dispose(){this.disposed=true;this.group.removeFromParent();for(const g of this.structures.values())this.releaseGroup(g);for(const g of [...this.ghost.children])this.releaseGroup(g);for(const g of this.geometries)g.dispose();for(const m of this.materials)m.dispose();for(const t of this.textures)t.dispose();this.resources.clear();this.structures.clear();}
}
