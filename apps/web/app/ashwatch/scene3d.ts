import * as THREE from "three";
import {HDRLoader} from "three/addons/loaders/HDRLoader.js";
import {FrontierModels} from "./frontier-models";
import {FrontierRenderer} from "./frontier-renderer";
import {terrainHeight} from "./frontier-land";
import type {StructureKind} from "./frontier";
import {getImageProps} from "next/image";
import {frontierScenery,duskSky} from "./watch-scenery";
import {COMBAT,combatPose,presentEnemyAction,type CombatAction} from "./combat";
import {readTarget} from "./targeting";
import {combatFraming,combatCameraSide} from "./camera-framing";
import {watchEnemy} from "./watch-enemies";
import {enemyHealth} from "./enemy-health";
import {hitRecoil} from "./hit-reaction";
import {clickedFacing,type ClickTarget} from "./click-target";
import type {ClassName} from "./progression";
import {adventurer,PHYSIQUE} from "./watch-adventurer";
import {mergeGeometries} from "three/addons/utils/BufferGeometryUtils.js";
import {routeTo} from "./navigation";
import {cameraRig,cameraClearance,damping,followFacing,DEFAULTS,type Preferences,type Box} from "./controls";
import { residents, TOWNS, BUILDINGS, FLOOR_COLORS, GATE, NEST, VILLAGE, sight, type Hero, type WorldView, type MonsterView } from "./world";
const S=.04;
const random=(n:number)=>{const r=Math.sin(n*127.1+311.7)*43758.5453;return r-Math.floor(r);};
type Actor={group:THREE.Group;left:THREE.Group;right:THREE.Group;arm:THREE.Group;cape?:THREE.Mesh;setFrost?:(active:boolean,seconds:number)=>void;animate?:(t:number,movement:number,attack:number,dash:number,reduced:boolean,action?:CombatAction|null,serverTime?:number)=>void;dispose?:()=>void};
export class Scene {
 private renderer:THREE.WebGLRenderer;
 private frontierMode=false;private frontierRenderer:FrontierRenderer|null=null;private frontierModels:FrontierModels|null=null;private buildPlan:{piece:StructureKind;rotation:number}|null=null;private disposed=false;
 setFrontier(enabled:boolean){if(this.frontierMode!==enabled){this.frontierMode=enabled;this.floor=-1;if(this.previewActor){this.previewActor.group.removeFromParent();this.previewActor.dispose?.();this.previewActor=null;}}}
 setBuildPlan(plan:{piece:StructureKind;rotation:number}|null){this.buildPlan=plan;}
 private heightAt(x:number,y:number){return this.frontierRenderer?.heightAt(x,y)??(this.watchScene?.18:0);}
 private scene=new THREE.Scene();
 private camera=new THREE.PerspectiveCamera(48,1,.1,100);
 private environment=new THREE.Group();
 private actors=new Map<string,Actor>();
 private decorations:THREE.Object3D[]=[];
 private lamps:THREE.PointLight[]=[];
 private indicators=new THREE.Group();
 private rings=new THREE.Group();
 private ringPool:THREE.Mesh<THREE.RingGeometry,THREE.MeshBasicMaterial>[]=[];
 private previewClass:ClassName="Knight";
 private previewWatch=true;private watchSignals:THREE.Mesh[]=[];
 setPreviewWatch(watch:boolean){this.previewWatch=watch;}
 private previewActor:Actor|null=null;
 setPreviewClass(cls:ClassName){if(cls!==this.previewClass){this.previewClass=cls;if(this.previewActor){this.scene.remove(this.previewActor.group);this.previewActor.dispose?.();this.previewActor=null;}}}
 private targetMarker=new THREE.Mesh(new THREE.RingGeometry(.6,.68,4),new THREE.MeshBasicMaterial({color:"#ffe1a2",transparent:true,opacity:.9,depthWrite:false,side:THREE.DoubleSide}));
 private enemyHealthMaterials=[new THREE.MeshBasicMaterial({color:"#271f25"}),new THREE.MeshBasicMaterial({color:"#f0a082"})];
 private reachFan=new THREE.Mesh(new THREE.RingGeometry(.92,1,40,1,-56*Math.PI/180,112*Math.PI/180),new THREE.MeshBasicMaterial({color:"#a3d6d4",transparent:true,opacity:.28,depthWrite:false,side:THREE.DoubleSide}));
 private facingMarker=new THREE.Mesh(new THREE.ConeGeometry(.13,.38,3),new THREE.MeshBasicMaterial({color:"#ffe5a3"}));


 private ringGeometry=new THREE.RingGeometry(.92,1,40);
 private lowQuality=false;private reducedMotion=false;
 private cameraLift=0;
 private combatLift=0;private shoulder=1.45;private framedHero="";
 private effectActors=new Map<number,THREE.Group>();
 private preferences:Preferences={...DEFAULTS};private cameraFraction=1;private collisionBoxes:Box[]=[];
 private obstructions:{center:THREE.Vector3;radius:number;materials:THREE.MeshStandardMaterial[]}[]=[];
 private foliage:{group:THREE.Group;material:THREE.MeshStandardMaterial;bark:THREE.MeshStandardMaterial}[]=[];
 private frameSamples:number[]=[];private frameReportAt=0;
 private watchScene=false;private floor=-1;private last=0;private heading=-Math.PI/2;
 private focus=new THREE.Vector3(VILLAGE.x*S,0,VILLAGE.y*S);
 private playerPosition=new THREE.Vector2(VILLAGE.x*S,VILLAGE.y*S);
 private uniforms={player:{value:this.playerPosition},direction:{value:-Math.PI/2},range:{value:7.2},angle:{value:Math.PI/5},rear:{value:0},active:{value:0}};
 private textures=new Map<string,THREE.Texture>();
 private materials:THREE.Material[]=[];
 private materialCache=new Map<string,THREE.MeshStandardMaterial>();
 private sun:THREE.DirectionalLight;
 private rim=new THREE.DirectionalLight("#9bbcf0",.95);
 private ambient:THREE.HemisphereLight;
 private ray=new THREE.Raycaster();
 private clickTargets:ClickTarget[]=[];
 private guideTarget:{x:number;y:number}|null=null;
 private guidePath:{x:number;y:number}[]=[];private guideAt=0;
 setGuide(point:{x:number;y:number}|null){if(JSON.stringify(point)!==JSON.stringify(this.guideTarget)){this.guideTarget=point;this.guideAt=0;}}

 private damageLabels=new Map<number,{sprite:THREE.Sprite;texture:THREE.CanvasTexture}>();
 constructor(canvas:HTMLCanvasElement){
  this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:"high-performance"});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFShadowMap;
  this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;
  this.scene.background=new THREE.Color("#9ac8ca");this.scene.fog=new THREE.FogExp2("#9ac8ca",.011);
  this.ambient=new THREE.HemisphereLight("#c4e0ef","#314c49",2.1);this.scene.add(this.ambient);
  this.sun=new THREE.DirectionalLight("#ffdfa3",3.4);this.sun.position.set(20,32,9);this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);
  Object.assign(this.sun.shadow.camera,{left:-18,right:18,top:18,bottom:-18,near:.5,far:80});this.sun.shadow.bias=-.0006;this.sun.shadow.normalBias=.04;
  this.scene.add(this.rim,this.rim.target,this.sun,this.sun.target,this.environment,this.indicators,this.rings,this.facingMarker,this.targetMarker,this.reachFan);
  this.targetMarker.rotation.x=this.reachFan.rotation.x=-Math.PI/2;
 }
 setQuality(low:boolean){low=low||this.preferences.automaticGraphics&&this.renderer.domElement.clientWidth<600;if(low===this.lowQuality)return;this.lowQuality=low;if(this.frontierMode)this.floor=-1;this.frameSamples=[];this.renderer.setPixelRatio(low?1:Math.min(devicePixelRatio,1.75));this.renderer.shadowMap.enabled=!low;this.sun.castShadow=!low;}
 setReducedMotion(reduced:boolean){this.reducedMotion=reduced;}
 setPreferences(preferences:Preferences){this.preferences=preferences;}
 getHeading(){return this.heading;}
 aimAt(clientX:number,clientY:number,canvas:HTMLCanvasElement){
  const r=canvas.getBoundingClientRect();this.ray.setFromCamera(new THREE.Vector2((clientX-r.left)/r.width*2-1,-(clientY-r.top)/r.height*2+1),this.camera);
  const bodyFacing=clickedFacing(this.ray,this.clickTargets,{x:this.playerPosition.x/S,y:this.playerPosition.y/S},[this.environment]);
  if(bodyFacing!==undefined)return bodyFacing;
  const terrain=this.frontierRenderer?this.ray.intersectObject(this.frontierRenderer.terrain)[0]:undefined;if(terrain)return Math.atan2(terrain.point.z-this.playerPosition.y,terrain.point.x-this.playerPosition.x);
  const hit=new THREE.Vector3();if(!this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),this.watchScene?-.18:0),hit))return undefined;
  return Math.atan2(hit.z-this.playerPosition.y,hit.x-this.playerPosition.x);
 }
 private frontierTexture(name:string,suffix:string){const key=`frontier-${name}-${suffix}`,existing=this.textures.get(key);if(existing)return existing;const t=new THREE.TextureLoader().load(`/ashwatch-assets/frontier/${name}-${suffix}.jpg`);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=suffix==="color"?THREE.SRGBColorSpace:THREE.NoColorSpace;t.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());this.textures.set(key,t);return t;}
 private texture(kind:string){
  const existing=this.textures.get(kind);if(existing)return existing;
  if(kind==="slate"){const {props}=getImageProps({src:"/ashwatch-assets/frontier-slate-v1.png",alt:"",width:512,height:512,quality:75});const t=new THREE.TextureLoader().load(props.src);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());this.textures.set(kind,t);return t;}
  if(kind==="scales"){const t=new THREE.TextureLoader().load("/ashwatch-assets/dragon-scales-v3.png");t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;t.repeat.set(2,2);this.textures.set(kind,t);return t;}
  const canvas=document.createElement("canvas");canvas.width=canvas.height=256;const c=canvas.getContext("2d")!;
  c.fillStyle=kind==="ground"?"#b7c7b2":"#ede5d5";c.fillRect(0,0,256,256);
  for(let i=0;i<2300;i++){const n=random(i+77),x=random(i+1)*256,y=random(i+2)*256;c.fillStyle=`rgba(${n>.5?"215,208,181":"17,22,18"},${random(i+5)*.16})`;c.fillRect(x,y,1+random(i+7)*4,1+random(i+8)*3);}
  if(kind==="stone"||kind==="roof")for(let row=0;row<8;row++)for(let col=-1;col<5;col++){const x=col*64+(row%2)*32,y=row*32;c.strokeStyle="#252b296e";c.lineWidth=3;c.strokeRect(x+2,y+2,60,28);c.strokeStyle="#d4cbb730";c.lineWidth=1;c.beginPath();c.moveTo(x+4,y+29);c.lineTo(x+62,y+29);c.stroke();}
  if(kind==="slate"){for(let i=0;i<4;i++){const x=random(i+233)*256,y=random(i+93)*256;c.strokeStyle="#3d535d45";c.lineWidth=.8;c.beginPath();c.moveTo(x,y);c.lineTo(x+18+random(i)*22,y+8);c.lineTo(x+40+random(i)*26,y-4);c.stroke();}c.strokeStyle="#ffffff24";c.lineWidth=3;c.strokeRect(3,3,250,250);}
  if(kind==="wood")for(let i=0;i<32;i++){c.strokeStyle=`rgba(29,24,20,${.08+random(i)*.3})`;c.lineWidth=random(i+9)*2;c.beginPath();c.moveTo(i*8,0);c.bezierCurveTo(i*8+12,70,i*8-9,190,i*8,256);c.stroke();}
  const t=new THREE.CanvasTexture(canvas);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;if(kind==="stone"||kind==="roof")t.repeat.set(5,5);this.textures.set(kind,t);return t;
 }
 private material(color:string,kind?:string,metalness=0,unmasked=true){
  const key=`${this.frontierMode}:${color}:${kind}:${metalness}:${unmasked}`;const cached=this.materialCache.get(key);if(cached)return cached;
  const surface=this.frontierRenderer?.surface(kind),map=surface?.map??(kind?this.texture(kind):null);
  const mat=new THREE.MeshStandardMaterial({color,map,roughness:metalness?.68:.94,metalness,bumpMap:map,bumpScale:kind==="stone"?.12:.035});
  if(surface){mat.normalMap=surface.normalMap;mat.normalScale.set(.65,.65);mat.roughnessMap=surface.roughnessMap;mat.bumpMap=null;mat.color.set(kind==="wood"?"#b8a38c":"#b2b7ad");}
  if(!unmasked){const uniforms=this.uniforms;mat.onBeforeCompile=shader=>{
   shader.uniforms.awPlayer=uniforms.player;shader.uniforms.awDirection=uniforms.direction;shader.uniforms.awRange=uniforms.range;shader.uniforms.awAngle=uniforms.angle;shader.uniforms.awRear=uniforms.rear;shader.uniforms.awActive=uniforms.active;
   shader.vertexShader="varying vec3 awPosition;\n"+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace("#include <project_vertex>","#include <project_vertex>\nawPosition=(modelMatrix*vec4(transformed,1.0)).xyz;");
   shader.fragmentShader="varying vec3 awPosition;uniform vec2 awPlayer;uniform float awDirection;uniform float awRange;uniform float awAngle;uniform float awRear;uniform float awActive;\n"+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace("#include <fog_fragment>",`#include <fog_fragment>
    vec2 offset=awPosition.xz-awPlayer;float radius=length(offset);float a=atan(offset.y,offset.x)-awDirection;
    a=abs(atan(sin(a),cos(a)));float angular=1.0-smoothstep(awAngle-0.14,awAngle,a);
    float reach=1.0-smoothstep(awRange*0.72,awRange,radius);
    float visible=max(angular*reach,1.0-smoothstep(max(0.0,awRear-0.3),max(0.001,awRear),radius));
    gl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(0.063,0.090,0.098),awActive*(1.0-visible));`);
  };mat.customProgramCacheKey=()=>"ashwatch-directional-sight-v2";}
  this.materials.push(mat);this.materialCache.set(key,mat);return mat;
 }
 private mesh(geo:THREE.BufferGeometry,mat:THREE.Material,parent:THREE.Object3D,x=0,y=0,z=0){const mesh=new THREE.Mesh(geo,mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 private box(parent:THREE.Object3D,mat:THREE.Material,x:number,y:number,z:number,w:number,h:number,d:number){return this.mesh(new THREE.BoxGeometry(w,h,d),mat,parent,x,y,z);}
 private sphere(parent:THREE.Object3D,mat:THREE.Material,x:number,y:number,z:number,sx:number,sy:number,sz:number){const m=this.mesh(new THREE.SphereGeometry(1,16,12),mat,parent,x,y,z);m.scale.set(sx,sy,sz);return m;}
 private cylinder(parent:THREE.Object3D,mat:THREE.Material,x:number,y:number,z:number,r1:number,r2:number,h:number){return this.mesh(new THREE.CylinderGeometry(r1,r2,h,9),mat,parent,x,y,z);}
 private resetEnvironment(){this.frontierRenderer?.dispose();this.frontierRenderer=null;this.environment.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});this.environment.clear();this.decorations=[];this.lamps=[];this.watchSignals=[];this.collisionBoxes=[];this.foliage=[];this.obstructions=[];}
 private fadeObstruction(group:THREE.Object3D){
 group.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(group),sphere=bounds.getBoundingSphere(new THREE.Sphere()),materials=new Map<THREE.Material,THREE.MeshStandardMaterial>();
 group.traverse(o=>{if(!(o instanceof THREE.Mesh)||!(o.material instanceof THREE.MeshStandardMaterial))return;let clone=materials.get(o.material);if(!clone){clone=o.material.clone();clone.transparent=true;clone.depthWrite=false;materials.set(o.material,clone);this.materials.push(clone);}o.material=clone;});
 this.obstructions.push({center:sphere.center,radius:sphere.radius,materials:[...materials.values()]});
 }
 private makeHouse(x:number,z:number,size:number,seed:number){
  const group=new THREE.Group();group.position.set(x*S,0,z*S);group.scale.setScalar(size);group.userData.house=true;this.environment.add(group);this.decorations.push(group);
  const stone=this.material("#b6c5bc","stone"),wood=this.material("#60545b","wood"),wall=this.material("#e4ceb0","plaster"),roof=this.material("#3b5260","roof"),dark=this.material("#322c27");
  this.box(group,stone,0,.45,0,4.6,.9,2.9);this.box(group,wall,0,1.6,0,4.5,2.2,2.8);
  for(const xx of [-2.2,-.7,.7,2.2])this.box(group,wood,xx,1.8,1.45,.13,2.6,.15);
  for(const yy of [1,2.8])this.box(group,wood,0,yy,1.48,4.6,.16,.16);
  for(const side of [-1,1]){const r=this.box(group,roof,0,3.35,side*.91,5.2,.16,2.35);r.rotation.x=side*.65;}
  const triangle=new THREE.Shape();triangle.moveTo(-1.4,0);triangle.lineTo(0,1.05);triangle.lineTo(1.4,0);triangle.closePath();
  for(const side of [-1,1]){const m=this.mesh(new THREE.ShapeGeometry(triangle),wall,group,side*2.25,2.7,0);m.rotation.y=side*Math.PI/2;}
  this.box(group,dark,0,1,1.52,.85,1.75,.08);
  for(let i=0;i<5;i++)this.box(group,wood,-.37+i*.185,1,1.58,.025,1.7,.015);
  for(const xx of [-1.4,1.4]){this.box(group,dark,xx,1.85,1.53,.65,.8,.1);const glow=this.material("#bc8954");glow.emissive.set("#77502c");glow.emissiveIntensity=.45;this.box(group,glow,xx,1.85,1.59,.5,.64,.04);this.box(group,wood,xx,1.85,1.63,.055,.7,.04);this.box(group,wood,xx,1.85,1.64,.6,.055,.04);}
  this.box(group,stone,1.1,3.7,-.3,.54,1.8,.6);this.box(group,dark,1.1,4.64,-.3,.4,.02,.43);
  const barrel=this.cylinder(group,wood,-2.7,.44,1.3,.34,.29,.88);barrel.rotation.z=.05;
  for(const yy of [.15,.68]){const band=this.mesh(new THREE.TorusGeometry(.32,.025,5,12),this.material("#494840",undefined,.4),group,-2.7,yy,1.3);band.rotation.x=Math.PI/2;}
  this.box(group,wood,2.6,.3,-.2,.6,.6,.6).rotation.y=seed;
  const flames=new THREE.Group();flames.name="flames";flames.visible=false;group.add(flames);const flame=this.material("#b76f30");flame.emissive.set("#d67922");flame.emissiveIntensity=2;
  for(let i=0;i<5;i++)this.mesh(new THREE.ConeGeometry(.16,.9,6),flame,flames,-1.4+i*.65,2.7,1.2);
  // Solid house/roof envelope; barrels and invisible flame meshes must not expand it.
  this.collisionBoxes.push({min:{x:x*S-2.6*size,y:0,z:z*S-1.88*size},max:{x:x*S+2.6*size,y:4.7*size,z:z*S+1.88*size}});
 }
 private tree(x:number,z:number,seed:number,dead=false){
  const group=new THREE.Group();group.position.set(x*S,0,z*S);this.environment.add(group);this.decorations.push(group);group.scale.setScalar(.7+random(seed+1)*.7);
  const bark=this.material("#857362","wood").clone();bark.transparent=true;this.materials.push(bark);const trunk=this.cylinder(group,bark,0,1.6,0,.12,.25,3.2);trunk.rotation.z=(random(seed)-.5)*.13;
  for(let j=0;j<3;j++){const branch=this.cylinder(group,bark,Math.cos(j*2)*.32,2.4+j*.3,Math.sin(j*2)*.32,.06,.1,1.5);branch.rotation.z=.5+j*.45;}
  if(!dead){
   let leaf=this.textures.get("foliage");if(!leaf){const canvas=document.createElement("canvas");canvas.width=canvas.height=256;const ctx=canvas.getContext("2d")!;
    for(let i=0;i<55;i++){const a=random(i)*Math.PI*2,r=Math.sqrt(random(i+8))*105,x=128+Math.cos(a)*r,y=128+Math.sin(a)*r;ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.fillStyle=["#72844c","#9da767","#465d32","#809252"][i%4];ctx.beginPath();ctx.ellipse(0,0,8+random(i+1)*8,4+random(i+3)*4,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#c0c39088";ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(-9,0);ctx.lineTo(9,0);ctx.stroke();ctx.restore();}
    leaf=new THREE.CanvasTexture(canvas);leaf.colorSpace=THREE.SRGBColorSpace;this.textures.set("foliage",leaf);}
   const material=new THREE.MeshStandardMaterial({map:leaf,alphaTest:.45,side:THREE.DoubleSide,roughness:1,transparent:true,depthWrite:false,color:this.floor===8?"#d59b72":"#f2efcc"});this.materials.push(material);this.foliage.push({group,material,bark});
   const leaves=new THREE.InstancedMesh(new THREE.PlaneGeometry(1.3,1.3),material,85),dummy=new THREE.Object3D();
   for(let i=0;i<85;i++){const a=random(seed*100+i)*Math.PI*2,r=Math.sqrt(random(i+seed+81))*1.6;dummy.position.set(Math.cos(a)*r,2.7+random(i+seed+52)*1.8,Math.sin(a)*r);dummy.rotation.set(random(i)*Math.PI,random(i+21)*Math.PI,random(i+7)*Math.PI);dummy.scale.setScalar(.8+random(i+80)*.7);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);}leaves.castShadow=true;leaves.receiveShadow=true;group.add(leaves);
  }
 }
 private portal(x:number,z:number,open=true){
  const group=new THREE.Group();group.position.set(x*S,0,z*S);this.environment.add(group);this.decorations.push(group);
  const stone=this.material("#96958b","stone");for(const side of [-1,1])for(let i=0;i<5;i++)this.box(group,stone,side*1.2,.3+i*.6,0,.65,.56,.8);
  for(let i=0;i<7;i++){const a=i*Math.PI/6;const b=this.box(group,stone,Math.cos(a)*1.2,2.7+Math.sin(a)*1.2,0,.6,.55,.8);b.rotation.z=a;}
  const light=this.material(open?"#81bcb6":"#694a43");light.emissive.set(open?"#3a6e68":"#391a17");light.transparent=true;light.opacity=.26;light.side=THREE.DoubleSide;
  const arch=this.mesh(new THREE.PlaneGeometry(1.85,2.9),light,group,0,1.45,0);arch.name="portal";
  this.torch(group,-1.7,1.7,.1);this.torch(group,1.7,1.7,.1);this.fadeObstruction(group);
 }
 private torch(parent:THREE.Object3D,x:number,y:number,z:number){
  this.cylinder(parent,this.material("#5d4938","wood"),x,y-.2,z,.04,.05,.5);
  const flame=this.material("#f3b366");flame.emissive.set("#d17427");flame.emissiveIntensity=2;this.sphere(parent,flame,x,y+.15,z,.08,.22,.08);
  const light=new THREE.PointLight("#edb572",4,5,2);light.position.set(x,y+.2,z);parent.add(light);this.lamps.push(light);
 }
 private road(points:THREE.Vector3[],width:number,mat:THREE.Material){
  const path=new THREE.CatmullRomCurve3(points),vertices:number[]=[],uv:number[]=[],indices:number[]=[];
  for(let i=0;i<=80;i++){const p=path.getPoint(i/80),t=path.getTangent(i/80),side=new THREE.Vector3(-t.z,0,t.x).normalize().multiplyScalar(width/2);vertices.push(p.x+side.x,.015,p.z+side.z,p.x-side.x,.015,p.z-side.z);uv.push(0,i/4,1,i/4);if(i<80){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}}
  const geo=new THREE.BufferGeometry();geo.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));geo.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();this.mesh(geo,mat,this.environment);
 }
 private build(floor:number,watch=false){
  this.resetEnvironment();this.floor=floor;this.cameraFraction=1;this.cameraLift=0;
  if(this.frontierMode&&floor===0){
   this.watchScene=false;this.scene.background=new THREE.Color("#adc2ce");this.scene.fog=new THREE.FogExp2("#b0b9b5",.006);this.ambient.color.set("#c6d2e4");this.ambient.groundColor.set("#534b38");this.ambient.intensity=1.1;this.sun.color.set("#ffead0");this.sun.intensity=3.1;this.rim.intensity=.3;
   this.frontierModels??=new FrontierModels(Math.min(8,this.renderer.capabilities.getMaxAnisotropy()));
   this.frontierRenderer=new FrontierRenderer(Math.min(8,this.renderer.capabilities.getMaxAnisotropy()),this.lowQuality,(name,suffix)=>this.frontierTexture(name,suffix),this.frontierModels);
   for(const [i,b] of BUILDINGS.entries())this.makeHouse(b[0],b[1],b[2],i);this.batchScenery();this.environment.add(this.frontierRenderer.group);
   const sky=this.textures.get("frontier-sky");if(sky){this.scene.background=sky;this.scene.environment=sky;}else new HDRLoader().load("/ashwatch-assets/frontier/sky.hdr",texture=>{if(this.disposed){texture.dispose();return;}texture.mapping=THREE.EquirectangularReflectionMapping;this.textures.set("frontier-sky",texture);if(this.frontierMode&&this.floor===0){this.scene.background=texture;this.scene.environment=texture;}},undefined,()=>{});
   this.scene.environmentIntensity=.65;return;
  }
  this.scene.backgroundIntensity=1;
  const sky=watch?"#536078":"#9ac8ca";
  if(watch){let texture=this.textures.get("watch-dusk");if(!texture){texture=duskSky();this.textures.set("watch-dusk",texture);}this.scene.background=texture;this.scene.environment=texture;this.scene.environmentIntensity=.35;}else{this.scene.background=new THREE.Color(sky);this.scene.environment=null;}
  this.scene.fog=new THREE.FogExp2(sky,watch?.007:.011);this.ambient.color.set(watch?"#b7c9ee":"#c4e0ef");this.ambient.groundColor.set(watch?"#383342":"#314c49");this.ambient.intensity=watch?1.25:2.1;this.rim.intensity=watch?.95:.35;this.sun.color.set(watch?"#ffd0a2":"#ffdfa3");this.sun.intensity=watch?2.6:3.4;
  this.watchScene=watch;const ground=this.material(watch?"#283940":floor?FLOOR_COLORS[floor-1]:"#446f62",watch?undefined:floor?"stone":"ground");
  const groundMap=this.texture(floor?"stone":"ground");if(!watch){ground.map=groundMap;ground.bumpMap=groundMap;}this.textures.set(`ground-${floor}`,groundMap);
  const plane=this.mesh(new THREE.PlaneGeometry(watch?240:96,watch?240:96,1,1),ground,this.environment,48,-.04,48);plane.rotation.x=-Math.PI/2;const uv=plane.geometry.getAttribute("uv");for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*22,uv.getY(i)*22);
  if(watch){
   const slate=this.material("#344454","slate"),broken=this.material("#8c959d","stone"),ink=this.material("#253445"),gold=this.material("#bc9361"),grass=this.material("#354747");
   // An authored courtyard within the existing collision envelope; no additional simulation map.
   this.box(this.environment,slate,48,0,49.5,41,.16,48);
   for(let row=0;row<20;row++)for(let col=0;col<14;col++){
    const x=28+col*2.92+(row%2)*.13,z=27+row*2.32;if((col<2||col>11)&&random(row*24+col)<.12)continue;
    const w=2.78,d=2.18,chipped=.06+random(row*24+col)*.12,shape=new THREE.Shape();
    shape.moveTo(-w/2+chipped,-d/2);shape.lineTo(w/2-chipped,-d/2);shape.lineTo(w/2,-d/2+chipped);shape.lineTo(w/2,d/2-chipped);shape.lineTo(w/2-chipped,d/2);shape.lineTo(-w/2+chipped,d/2);shape.lineTo(-w/2,d/2-chipped);shape.lineTo(-w/2,-d/2+chipped);shape.closePath();
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:.045,bevelEnabled:true,bevelSize:.026,bevelThickness:.018,bevelSegments:1,steps:1});const position=geometry.getAttribute("position"),uv=geometry.getAttribute("uv"),angle=Math.floor(random(row*93+col)*4)*Math.PI/2,scale=.55+random(row*63+col)*.4;for(let i=0;i<uv.count;i++){const u=position.getX(i)/w,v=position.getY(i)/d;uv.setXY(i,(u*Math.cos(angle)-v*Math.sin(angle))*scale+.5+random(col*43+row)*.4,(u*Math.sin(angle)+v*Math.cos(angle))*scale+.5+random(col*37+row)*.4);}
    const tile=this.mesh(geometry,this.material(["#c5d0d5","#d2d8d8","#b8c8cf"][Math.floor(random(row*91+col)*3)],"slate"),this.environment,x,.11,z);tile.rotation.x=-Math.PI/2;tile.rotation.z=(random(col*23+row)-.5)*.014;
   }
   const eye=new THREE.Shape();eye.moveTo(-2.5,0);eye.quadraticCurveTo(0,2,2.5,0);eye.quadraticCurveTo(0,-2,-2.5,0);const sigil=this.mesh(new THREE.ShapeGeometry(eye),ink,this.environment,48,.195,48);sigil.rotation.x=-Math.PI/2;
   const pupil=this.mesh(new THREE.CircleGeometry(.55,32),gold,this.environment,48,.2,48);pupil.rotation.x=-Math.PI/2;
   for(const side of [-1,1]){
    const x=side===-1?26:70;this.collisionBoxes.push({min:{x:x-.6,y:0,z:21},max:{x:x+.6,y:3,z:73}});
    for(let i=0;i<10;i++){const z=24+i*4.8;this.box(this.environment,ink,x,.35,z,1.2,.7,4.6);if(i%3===0){this.box(this.environment,broken,x,1.4,z,1.4,2.8,1.4);this.box(this.environment,gold,x,2.5,z,1.53,.06,1.53);}}
    for(const z of [27,41,55,68]){const pillar=new THREE.Group();pillar.position.set(48+side*10,0,z);this.environment.add(pillar);this.collisionBoxes.push({min:{x:pillar.position.x-.5,y:0,z:z-.5},max:{x:pillar.position.x+.5,y:3.9,z:z+.5}});this.cylinder(pillar,broken,0,1.9,0,.35,.48,3.8);this.box(pillar,ink,0,.22,0,1.1,.44,1.1);this.box(pillar,gold,0,3.8,0,.78,.1,.78);this.fadeObstruction(pillar);}
    for(let i=0;i<6;i++){const patch=this.mesh(new THREE.CircleGeometry(1+random(i)*2,7),grass,this.environment,48+side*18,.13,26+i*7);patch.rotation.x=-Math.PI/2;}
   }
   const gate=new THREE.Group();gate.position.set(48,0,23);this.environment.add(gate);for(const side of [-1,1]){this.box(gate,ink,side*2.7,2,0,1.4,4,1.4);this.box(gate,broken,side*2.7,4,0,1.7,.3,1.7);}
   this.box(gate,broken,0,4.6,0,6.8,.6,1.4);
   const crest=new THREE.Shape();crest.moveTo(-.9,0);crest.quadraticCurveTo(0,.6,.9,0);crest.quadraticCurveTo(0,-.6,-.9,0);const mark=this.mesh(new THREE.ShapeGeometry(crest),gold,gate,0,4.65,.72);mark.rotation.y=0;this.mesh(new THREE.CircleGeometry(.18,16),ink,gate,0,4.65,.73);this.fadeObstruction(gate);
   const banner=this.material("#753945"),trim=this.material("#d1b274");for(const side of [-1,1]){this.cylinder(gate,ink,side*5.5,2.8,0,.06,.08,5.6);this.box(gate,banner,side*5.5,3.3,.05,1.35,2.15,.035);this.box(gate,trim,side*5.5,3.4,.078,.04,1.4,.02);this.box(gate,trim,side*5.5,3.65,.078,.72,.04,.02);const foot=this.mesh(new THREE.ConeGeometry(.16,.5,4),trim,gate,side*5.5,1.95,.05);foot.rotation.z=Math.PI;}

   // Three frontier signal bowls are lit by completed encounters, not local guesses.
   for(let i=0;i<3;i++){const x=44+i*4;this.cylinder(this.environment,ink,x,2.2,24,.08,.12,4.4);this.cylinder(this.environment,gold,x,4.4,24,.4,.22,.3);const flame=this.mesh(new THREE.ConeGeometry(.21,.85,5),new THREE.MeshBasicMaterial({color:"#fbca77",transparent:true,opacity:.9}),this.environment,x,4.9,24);this.materials.push(flame.material);this.watchSignals.push(flame);}
   for(const [x,z] of [[32,36],[64,36],[32,61],[64,61]])this.torch(this.environment,x,1.7,z);
   frontierScenery(this.environment,(color,kind,metalness)=>this.material(color,kind,metalness));this.collisionBoxes.push({min:{x:18.6,y:0,z:30.5},max:{x:23.4,y:9,z:35.5}});
   for(const side of [-1,1])this.collisionBoxes.push({min:{x:side===-1?26:51,y:0,z:73.35},max:{x:side===-1?45:70,y:3.7,z:74.65}});
   this.collisionBoxes.push({min:{x:44,y:4.9,z:73},max:{x:52,y:5.9,z:75}});
  }else if(!floor){
   const paving=this.material("#b6ad94","stone");const pavingMap=this.texture("stone");paving.map=pavingMap;paving.bumpMap=pavingMap;this.textures.set("paving",pavingMap);const square=this.mesh(new THREE.CircleGeometry(8.5,48),paving,this.environment,VILLAGE.x*S,0,VILLAGE.y*S);square.rotation.x=-Math.PI/2;const puv=square.geometry.getAttribute("uv");for(let i=0;i<puv.count;i++)puv.setXY(i,puv.getX(i)*5,puv.getY(i)*5);
   this.road([new THREE.Vector3(690*S,0,1930*S),new THREE.Vector3(1050*S,0,1450*S),new THREE.Vector3(1110*S,0,1240*S),new THREE.Vector3(GATE.x*S,0,GATE.y*S)],2.5,this.material("#b0a48a","ground"));
   this.road([new THREE.Vector3(1480*S,0,2450*S),new THREE.Vector3(1640*S,0,1580*S),new THREE.Vector3(1490*S,0,1270*S),new THREE.Vector3(1570*S,0,1020*S),new THREE.Vector3(1480*S,0,450*S),new THREE.Vector3(1600*S,0,-80*S)],3.8,this.material("#536e6a",undefined,.3));
   const bridge=new THREE.Group();bridge.position.set(1540*S,.12,1180*S);bridge.rotation.y=.3;this.environment.add(bridge);const planks=this.material("#9b866b","wood");
   for(let i=0;i<18;i++)this.box(bridge,planks,-3.4+i*.4,0,0,.36,.16,2.9);
   for(const side of [-1,1]){this.box(bridge,planks,0,.85,side*1.4,7.3,.12,.12);for(let i=0;i<5;i++)this.box(bridge,planks,-3.4+i*1.7,.4,side*1.4,.13,1,.13);}
   for(const [i,b] of BUILDINGS.entries())this.makeHouse(b[0],b[1],b[2],i);
   this.road([new THREE.Vector3(920*S,0,1500*S),new THREE.Vector3(740*S,0,970*S),new THREE.Vector3(550*S,0,530*S)],2.5,this.material("#ab9b7b","ground"));
   for(const town of TOWNS){
    const arena=new THREE.Group();arena.position.set(town.arena.x*S,.03,town.arena.y*S);this.environment.add(arena);
    const sand=this.material("#b9a078","ground"),stone=this.material("#9a9787","stone"),wood=this.material("#695844","wood");
    const r=town.arena.r*S;const disk=this.mesh(new THREE.CircleGeometry(r,64),sand,arena);disk.rotation.x=-Math.PI/2;
    for(let i=0;i<36;i++){const a=i/36*Math.PI*2;if(Math.abs(Math.sin(a))<.16)continue;const wall=this.box(arena,stone,Math.cos(a)*r,.35,Math.sin(a)*r,.8,.7,.4);wall.rotation.y=-a+Math.PI/2;}
    for(let row=0;row<(town.size>1?3:1);row++)for(let i=0;i<9;i++){const a=Math.PI*.2+i*.22;const bench=this.box(arena,wood,Math.cos(a)*(r+row*.55),.6+row*.4,Math.sin(a)*(r+row*.55),.8,.2,.45);bench.rotation.y=-a+Math.PI/2;}
    this.sign(town.arena.x,town.arena.y+town.arena.r+20,`${town.name.toUpperCase()} ARENA`,"Cross the sand · free-for-all");
    this.sign(town.guild.x,town.guild.y+50,"ADVENTURERS GUILD","Contracts · parties");
    this.sign(town.inn.x,town.inn.y+55,"THE EMBER LODGE","Rest · save your return point");
   }

   for(let i=0;i<150;i++){const x=random(i+5)*2400,z=random(i+1005)*2400;if(TOWNS.some(t=>Math.hypot(x-t.x,z-t.y)<280*t.size)||Math.hypot(x-GATE.x,z-GATE.y)<120||Math.hypot(x-NEST.x,z-NEST.y)<190||Math.abs(x-(z>1250?1040:1200))<90)continue;this.tree(x,z,i);}
   const stone=this.material("#a8a89d","stone");this.cylinder(this.environment,stone,VILLAGE.x*S,.35,VILLAGE.y*S,1.15,1.25,.7);
   const water=this.material("#5a7775",undefined,.4);this.cylinder(this.environment,water,VILLAGE.x*S,.71,VILLAGE.y*S,.9,.9,.02);this.cylinder(this.environment,stone,VILLAGE.x*S,1,VILLAGE.y*S,.13,.25,1.1);
   for(let i=0;i<26;i++){const x=VILLAGE.x+Math.cos(i*.7)*(230+random(i)*20),z=VILLAGE.y+Math.sin(i*.7)*(205+random(i)*25);if(Math.abs(x-1050)<60)continue;this.box(this.environment,stone,x*S,.4,z*S,.65,.8,.4).rotation.y=i*.7;}
   this.portal(GATE.x,GATE.y);
   const mountain=this.material("#718078");for(let i=0;i<22;i++){const a=i/22*Math.PI*2,r=70+random(i)*12;const peak=this.mesh(new THREE.SphereGeometry(13+random(i)*9,18,12),mountain,this.environment,48+Math.cos(a)*r,5,48+Math.sin(a)*r);peak.scale.set(1.2,.75+random(i+11)*.8,1);peak.rotation.y=i;}
   const ash=this.mesh(new THREE.CircleGeometry(7,48),this.material("#383d39","ground"),this.environment,NEST.x*S,.025,NEST.y*S);ash.rotation.x=-Math.PI/2;
   for(let i=0;i<14;i++){const a=i/14*Math.PI*2,r=6+random(i);const stone=this.mesh(new THREE.DodecahedronGeometry(.5+random(i)*.8,1),this.material("#555f59","rock"),this.environment,NEST.x*S+Math.cos(a)*r,.25,NEST.y*S+Math.sin(a)*r);stone.scale.y=1.4;}

   for(let i=0;i<45;i++){const x=random(i+103)*2400,z=random(i+211)*2400;const rock=this.mesh(new THREE.DodecahedronGeometry(.4+random(i)*.5,0),stone,this.environment,x*S,.15,z*S);rock.scale.set(1,.65,1.3);rock.rotation.set(i,.7*i,0);this.decorations.push(rock);}
   for(const [x,z] of [[970,1430],[1020,1610],[810,1500]]){const post=new THREE.Group();post.position.set(x*S,0,z*S);this.environment.add(post);this.cylinder(post,this.material("#6a5441","wood"),0,1,0,.05,.1,2);this.torch(post,0,2,0);}
  }else{
   this.collisionBoxes.push({min:{x:25.4,y:0,z:21},max:{x:26.6,y:4,z:73}},{min:{x:69.4,y:0,z:21},max:{x:70.6,y:4,z:73}});
   const stone=this.material("#96978d","stone");for(let i=0;i<11;i++)for(const x of [650,1750]){this.box(this.environment,stone,x*S,1,(570+i*115)*S,1.2,2,3.4);this.cylinder(this.environment,stone,(x+(x<1000?35:-35))*S,1.9,(570+i*115)*S,.35,.45,3.8);}
   for(let i=0;i<14;i++){const x=700+random(i+4)*950,z=710+random(i+9)*740;
    if([1,2,8].includes(floor)){this.tree(x,z,i,floor===2);}
    else if([3,7].includes(floor)){const mat=this.material(floor===7?"#a5c1cb":"#6e8ea3",undefined,.35);const crystal=this.mesh(new THREE.ConeGeometry(.3,1.8,5),mat,this.environment,x*S,.75,z*S);crystal.rotation.z=.25;this.fadeObstruction(crystal);}
    else if(floor===5){const shelf=new THREE.Group();shelf.position.set(x*S,0,z*S);this.environment.add(shelf);this.box(shelf,this.material("#88755a","wood"),0,.9,0,1.5,1.8,.4);for(let row=0;row<3;row++)for(let b=0;b<7;b++)this.box(shelf,this.material(["#725448","#525c54","#7e7257"][b%3]),-.6+b*.2,.35+row*.52,.25,.14,.35,.25);this.fadeObstruction(shelf);}
    else{const column=this.cylinder(this.environment,stone,x*S,1.2,z*S,.3,.36,2.4);this.fadeObstruction(column);}
   }
   if(floor===10){this.box(this.environment,stone,48,.4,31,4,.8,3);this.box(this.environment,this.material("#71675d",undefined,.3),48,1.5,30,1.4,2.5,.4);}
   if(floor===4){const inlay=this.mesh(new THREE.RingGeometry(4,4.12,48),this.material("#c8c4af",undefined,.3),this.environment,48,.02,44);inlay.rotation.x=-Math.PI/2;}
   if(floor===6){const lava=this.material("#a75427");lava.emissive.set("#cd4a0c");lava.emissiveIntensity=.8;for(let i=0;i<4;i++)this.box(this.environment,lava,29+i*12,0,42,.2,.035,21);}
   if(floor===9)this.box(this.environment,this.material("#51393b"),48,.015,45,3.5,.03,33);
   for(let i=0;i<4;i++)this.torch(this.environment,29+i*12,1.8,43);
   this.portal(1200,1650);this.portal(1200,650,false);
  }
  this.batchScenery();
 }
 private batchScenery(){
  this.environment.updateMatrixWorld(true);const batches=new Map<string,{material:THREE.Material;meshes:THREE.Mesh[]}>();
  const treeGroups=new Set(this.foliage.map(f=>f.group));
  this.environment.traverse(object=>{if(!(object instanceof THREE.Mesh)||object instanceof THREE.InstancedMesh||Array.isArray(object.material)||object.material.transparent)return;let ancestor:THREE.Object3D|null=object;while(ancestor&&ancestor!==this.environment){if(treeGroups.has(ancestor as THREE.Group)||ancestor.name==="flames")return;ancestor=ancestor.parent;}const center=new THREE.Vector3();object.getWorldPosition(center);const key=object.material.uuid+":"+Math.floor(center.x/12)+":"+Math.floor(center.z/12);let batch=batches.get(key);if(!batch){batch={material:object.material,meshes:[]};batches.set(key,batch);}batch.meshes.push(object);});
  for(const batch of batches.values()){if(batch.meshes.length<2)continue;const transformed=batch.meshes.map(mesh=>{const g=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);const result=g.index?g.toNonIndexed():g;if(g.index)g.dispose();for(const key of Object.keys(result.attributes))if(!["position","normal","uv"].includes(key))result.deleteAttribute(key);if(!result.attributes.normal)result.computeVertexNormals();if(!result.attributes.uv)result.setAttribute("uv",new THREE.Float32BufferAttribute(new Float32Array(result.attributes.position.count*2),2));return result;});const merged=mergeGeometries(transformed);for(const geometry of transformed)geometry.dispose();if(!merged)continue;for(const mesh of batch.meshes){mesh.removeFromParent();mesh.geometry.dispose();}const mesh=new THREE.Mesh(merged,batch.material);mesh.castShadow=true;mesh.receiveShadow=true;this.environment.add(mesh);}
 }
 private sign(x:number,y:number,title:string,subtitle:string){
  const c=document.createElement("canvas");c.width=512;c.height=160;const ctx=c.getContext("2d")!;
  ctx.fillStyle="#292c28";ctx.fillRect(0,0,512,160);ctx.strokeStyle="#bcaa7e";ctx.lineWidth=6;ctx.strokeRect(6,6,500,148);ctx.textAlign="center";
  ctx.fillStyle="#eadfc4";ctx.font="bold 29px Georgia";ctx.fillText(title,256,67);ctx.font="21px Georgia";ctx.fillText(subtitle,256,112);
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;this.textures.set(title+x,texture);
  const material=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide});this.materials.push(material);
  this.mesh(new THREE.PlaneGeometry(1.7,.53),material,this.environment,(x+65)*S,2.1,y*S);
  this.cylinder(this.environment,this.material("#584936","wood"),(x+65)*S,1,y*S,.05,.06,2);
 }
 private human(hero:Pick<Hero,"heroClass"> & Partial<Pick<Hero,"weapon"|"hair"|"accessory">>,self:boolean,civilian=false):Actor{
  {const actor=adventurer(civilian?"Warden":hero.heroClass,civilian?{}:{...hero,frontier:this.frontierMode});this.scene.add(actor.group);return actor;}
 }

 private creature(e:MonsterView):Actor{
  if(this.watchScene){
   const presentation=watchEnemy(e.kind),actor=adventurer(presentation.heroClass,{weapon:"watch-sword",faction:"ashen"});
   const scale=presentation.scale;actor.group.scale.setScalar(scale);actor.group.userData.baseScale=scale;actor.group.userData.articulated=true;
   this.scene.add(actor.group);return actor;
  }

  const group=new THREE.Group(),left=new THREE.Group(),right=new THREE.Group(),arm=new THREE.Group();group.add(left,right,arm);
  const hide=this.material(e.kind==="wolf"?"#586c6e":e.kind==="slime"?"#609589":"#563c3e");
  if(e.kind==="wolf"){
   this.sphere(group,hide,0,.54,0,.24,.3,.57);
   arm.position.set(0,.74,-.40);this.sphere(arm,hide,0,0,-.08,.22,.26,.28);this.sphere(arm,hide,0,-.1,-.32,.13,.13,.22);
   const eye=this.material("#edc67c");eye.emissive.set("#b68a35");eye.emissiveIntensity=.4;
   for(const side of [-1,1]){this.mesh(new THREE.ConeGeometry(.095,.24,5),hide,arm,side*.14,.28,-.05);this.sphere(arm,eye,side*.19,.035,-.23,.025,.025,.04);
    for(const z of [-.3,.32]){const leg=new THREE.Group();leg.position.set(side*.17,.49,z);this.box(leg,hide,0,-.23,0,.085,.46,.11);this.box(leg,hide,0,-.45,-.045,.11,.07,.18);(side*z<0?left:right).add(leg);}}
   const tail=this.mesh(new THREE.ConeGeometry(.11,.56,7),hide,group,0,.5,.64);tail.rotation.x=-.8;
  }else if(e.kind==="slime"){this.sphere(group,hide,0,.28,0,.45,.33,.42);}
  else{
   const plate=this.material("#b07d68"),gold=this.material("#d4b785"),ember=this.material("#f3a96b"),dark=this.material("#352831");ember.emissive.set("#bc6835");ember.emissiveIntensity=.7;
   this.mesh(new THREE.CylinderGeometry(.38,.23,.72,6),hide,group,0,1.12,0).scale.z=.65;
   this.box(group,plate,0,1.25,-.21,.52,.45,.12);this.box(group,gold,0,1.12,-.28,.055,.4,.02);
   this.mesh(new THREE.CylinderGeometry(.2,.17,.38,6),plate,group,0,1.68,0);this.box(group,dark,0,1.69,-.2,.31,.09,.04);this.box(group,ember,0,1.69,-.225,.16,.025,.015);
   for(const side of [-1,1]){
    this.mesh(new THREE.IcosahedronGeometry(.23,0),plate,group,side*.39,1.4,0).scale.y=.65;
    const leg=side<0?left:right;leg.position.set(side*.17,.74,0);this.box(leg,hide,0,-.27,0,.17,.55,.20);this.box(leg,plate,0,-.23,-.12,.15,.22,.07);this.box(leg,dark,0,-.66,-.07,.20,.12,.32);
    const spike=this.mesh(new THREE.ConeGeometry(.075,.24,4),gold,group,side*.06,2.02,.10);spike.rotation.z=side*-.4;
   }
   arm.position.set(.39,1.4,0);this.box(arm,hide,0,-.24,0,.15,.48,.17);this.box(arm,plate,0,-.50,0,.17,.22,.20);
   this.cylinder(arm,dark,0,-.42,-.35,.024,.03,1.05);this.box(arm,plate,0,.11,-.35,.54,.27,.16);this.box(arm,ember,0,.12,-.45,.38,.025,.02);
   this.box(group,hide,-.4,1.04,0,.17,.52,.20);this.box(group,plate,-.4,.8,-.11,.28,.38,.1);
   const cloak=this.mesh(new THREE.PlaneGeometry(.58,.82),this.material("#662f3b"),group,0,.93,.24);cloak.material.side=THREE.DoubleSide;
   if(e.kind==="boss")group.scale.setScalar(1.7);
  }
  this.scene.add(group);return {group,left,right,arm};
 }
 private dragon(){
  const group=new THREE.Group(),left=new THREE.Group(),right=new THREE.Group(),arm=new THREE.Group();
  const scales=this.material("#b2b7a1","scales",.12),belly=this.material("#a59a77"),horn=this.material("#d1c19b"),ridge=this.material("#667466","scales",.1);
  const ember=this.material("#ffba58");ember.emissive.set("#ef6418");ember.emissiveIntensity=2;
  const tube=(parent:THREE.Object3D,points:number[][],radius:number,mat:THREE.Material)=>this.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p as [number,number,number]))),24,radius,10,false),mat,parent);
  this.sphere(group,scales,0,1.35,.25,.95,.86,1.75);this.sphere(group,belly,0,1.1,-.5,.65,.64,1.05);
  arm.position.set(0,1.7,-.9);group.add(arm);
  tube(arm,[[0,0,0],[0,.6,-.6],[0,1,-1.4],[0,.85,-2.1]],.37,scales);
  this.sphere(arm,scales,0,.85,-2.1,.42,.34,.65);this.sphere(arm,scales,0,.69,-2.67,.3,.18,.48);
  this.sphere(arm,belly,0,.53,-2.57,.28,.075,.53);
  for(const side of [-1,1]){
   this.sphere(arm,ridge,side*.34,.97,-2.25,.16,.095,.24);this.sphere(arm,ember,side*.382,.93,-2.35,.04,.048,.11);
   tube(arm,[[side*.3,1.07,-1.87],[side*.52,1.34,-1.58],[side*.61,1.62,-1.06]],.08,horn);
   for(let i=0;i<5;i++){const fang=this.mesh(new THREE.ConeGeometry(.03,.14,8),horn,arm,side*.24,.57,-2.85+i*.13);fang.rotation.z=Math.PI;}
   for(const z of [-.85,1.15]){const leg=new THREE.Group();leg.position.set(side*.65,1.15,z);group.add(leg);leg.name=`leg-${side}-${z}`;tube(leg,[[0,0,0],[side*.42,-.15,.12],[side*.58,-.65,-.08],[side*.54,-1.03,-.35]],.18,scales);this.sphere(leg,scales,side*.55,-1.05,-.43,.26,.13,.38);for(let i=0;i<3;i++){const claw=this.mesh(new THREE.ConeGeometry(.055,.32,9),horn,leg,side*.55+(i-1)*.14,-1.08,-.8);claw.rotation.x=-Math.PI/2;}}
   const wing=side<0?left:right;wing.position.set(side*.72,1.85,-.6);group.add(wing);
   const fingers=[[side*4.5,.7,-1.5],[side*5.2,.4,.1],[side*4.6,.1,1.6],[side*3.4,-.25,2.5],[side*1.4,-.65,2.25]];
   tube(wing,[[0,0,0],[side*1.4,1,-.6],[side*2.5,1.45,-1.15],[side*4.5,.7,-1.5]],.1,scales);
   const vertices:number[]=[],colors:number[]=[];
   const root=new THREE.Vector3(side*1.4,1,-.6);
   for(let i=0;i<fingers.length-1;i++){const a=new THREE.Vector3(...fingers[i] as [number,number,number]),b=new THREE.Vector3(...fingers[i+1] as [number,number,number]);
    for(let j=0;j<10;j++){const t=j/10,t2=(j+1)/10;const edge=(v:number)=>a.clone().lerp(b,v).lerp(root,Math.sin(v*Math.PI)*.12);const v1=edge(t),v2=edge(t2);vertices.push(...root.toArray(),...v1.toArray(),...v2.toArray());for(let n=0;n<3;n++){const shade=.8+random(i*30+j)*.18;colors.push(.34*shade,.19*shade,.13*shade);}}
   }
   const geo=new THREE.BufferGeometry();geo.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));geo.setAttribute("color",new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();
   const membrane=new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:.8});this.materials.push(membrane);this.mesh(geo,membrane,wing);
   for(const f of fingers)tube(wing,[root.toArray(),[(root.x+f[0])/2,(root.y+f[1])/2+.06,(root.z+f[2])/2],f],.038,horn);
  }
  const tail=new THREE.Group();tail.name="tail";group.add(tail);
  for(let i=0;i<14;i++){const z=1.4+i*.28,x=Math.sin(i*.17)*i*.08;this.sphere(tail,scales,x,.9-i*.045,z,.4*(1-i/16),.36*(1-i/16),.38);}
  for(let i=0;i<17;i++){const z=-1.3+i*.31,h=.32+Math.sin(i*.4)*.12;const spike=this.mesh(new THREE.ConeGeometry(.12,h,6),horn,group,0,2.1-Math.max(0,z-1)*.5,z);spike.rotation.x=.38;}
  const scaleGeo=new THREE.SphereGeometry(.12,6,4),instances=new THREE.InstancedMesh(scaleGeo,ridge,180);const dummy=new THREE.Object3D();
  for(let i=0;i<180;i++){const z=-1.1+(i%20)*.14,a=(Math.floor(i/20)/8)*Math.PI;dummy.position.set(Math.cos(a)*.92,1.4+Math.sin(a)*.83,z);dummy.scale.set(.65,.4,.6);dummy.rotation.z=a;dummy.updateMatrix();instances.setMatrixAt(i,dummy.matrix);}instances.castShadow=true;group.add(instances);
  group.scale.setScalar(1.25);this.scene.add(group);return {group,left,right,arm};
 }
 private updateActor(id:string,actor:Actor,x:number,z:number,facing:number,dt:number,responsive=false){
  const target=new THREE.Vector3(x*S,this.heightAt(x,z),z*S),beforeX=actor.group.position.x,beforeZ=actor.group.position.z;
  if(!actor.group.userData.placed||actor.group.position.distanceTo(target)>6){actor.group.position.copy(target);actor.group.userData.placed=true;actor.group.userData.motion=0;}
  else{actor.group.position.lerp(target,damping(responsive?24:15,dt));actor.group.userData.motion=Math.min(1,Math.hypot(actor.group.position.x-beforeX,actor.group.position.z-beforeZ)/Math.max(.001,dt*155*S));}
  const rotation=-facing-Math.PI/2;const delta=Math.atan2(Math.sin(rotation-actor.group.rotation.y),Math.cos(rotation-actor.group.rotation.y));actor.group.rotation.y+=delta*damping(responsive?24:12,dt);this.actors.set(id,actor);
 }
 draw(canvas:HTMLCanvasElement,view:WorldView|null,now:number,preview=false){
  const frameStart=performance.now();const elapsed=this.last?frameStart-this.last:16.67;const dt=Math.min(.1,elapsed/1000);this.last=frameStart;
  if(elapsed>0&&!document.hidden){this.frameSamples.push(elapsed);if(this.frameSamples.length>300)this.frameSamples.shift();}
  const w=canvas.clientWidth,h=canvas.clientHeight;if(canvas.width!==Math.floor(w*this.renderer.getPixelRatio())||canvas.height!==Math.floor(h*this.renderer.getPixelRatio()))this.renderer.setSize(w,h,false);
  const aspect=w/h,fov=58;if(this.camera.aspect!==aspect||this.camera.fov!==fov){this.camera.aspect=aspect;this.camera.fov=fov;this.camera.far=180;this.camera.updateProjectionMatrix();}
  const me=view?.heroes.find(p=>p.id===view.selfId),watch=!!view?.watch||!view&&this.previewWatch,floor=me?.floor??(watch?1:0);if(this.floor!==floor||this.watchScene!==watch)this.build(floor,watch);
  const surfaceY=me?this.heightAt(me.x,me.y):watch?.18:0;
  this.frontierRenderer?.update(view?.frontier??null,me,now,this.reducedMotion,this.buildPlan);
  const cameraBoxes=this.frontierRenderer?[...this.collisionBoxes,...this.frontierRenderer.collisionBoxes()]:this.collisionBoxes;this.rings.position.y=this.indicators.position.y=surfaceY;
  const serverTime=view?view.time+now-((view as WorldView&{received?:number}).received??now):now;
  const visible=new Set<string>();
  if(!floor&&!preview&&!this.frontierRenderer)for(const [i,civilian] of residents(serverTime,view?.dragon?.state==="enraged").entries()){const actor=this.actors.get(civilian.id)??this.human({heroClass:"Spellweaver"},true,true);this.updateActor(civilian.id,actor,civilian.x,civilian.y,civilian.facing,dt);actor.left.rotation.x=Math.sin(now*.009+i)*.3;actor.right.rotation.x=-actor.left.rotation.x;visible.add(civilian.id);}
  if(me){
   const vision=sight(me.awareness);this.uniforms.active.value=1;this.uniforms.direction.value=me.facing;this.uniforms.range.value=vision.range*S;this.uniforms.angle.value=vision.halfAngle;this.uniforms.rear.value=vision.rearRange*S;
   this.playerPosition.set(me.x*S,me.y*S);this.heading=followFacing(this.heading,me.facing,this.preferences.response,dt);
   const target=new THREE.Vector3(me.x*S,surfaceY,me.y*S);if(this.focus.distanceTo(target)>7)this.focus.copy(target);else this.focus.lerp(target,1-Math.exp(-dt*9));
   const forward=new THREE.Vector3(Math.cos(this.heading),0,Math.sin(this.heading)),rig=cameraRig(me.awareness,this.preferences.distance);
   const pivot=this.focus.clone().add(new THREE.Vector3(0,rig.targetHeight,0));
   const right=new THREE.Vector3(-forward.z,0,forward.x);
   const faced=readTarget(view!,me),framing=combatFraming(PHYSIQUE[me.heroClass],faced&&!faced.obstructed?Math.hypot(faced.x-me.x,faced.y-me.y)*S:undefined,w<600);
   const shoulderSide=combatCameraSide(me.heroClass);
   if(this.framedHero!==me.id){this.framedHero=me.id;this.combatLift=framing.lift;this.shoulder=framing.shoulder*shoulderSide;}
   const response=damping(this.reducedMotion?3:5,dt);this.combatLift+=(framing.lift-this.combatLift)*response;this.shoulder+=(framing.shoulder*shoulderSide-this.shoulder)*response;
   const desired=this.focus.clone().addScaledVector(forward,-rig.distance).addScaledVector(right,this.shoulder).add(new THREE.Vector3(0,rig.height+this.combatLift,0));
   // Collision uses the unsmoothed player pivot, so camera lag cannot put it through a wall.
   const safetyPivot=new THREE.Vector3(me.x*S,surfaceY+rig.targetHeight,me.y*S);
   const initialClearance=cameraClearance(safetyPivot,desired,cameraBoxes);
 const lift=(1-initialClearance)*3;
 this.cameraLift+=(lift-this.cameraLift)*damping(lift>this.cameraLift?12:3,dt);
 desired.y+=this.cameraLift;
 const permitted=initialClearance;
   this.cameraFraction=permitted<this.cameraFraction?permitted:this.cameraFraction+(permitted-this.cameraFraction)*damping(3,dt);
   // Compress the horizontal arm, retaining elevation so the lens stays outside the hero.
   desired.x=safetyPivot.x+(desired.x-safetyPivot.x)*this.cameraFraction;
   desired.z=safetyPivot.z+(desired.z-safetyPivot.z)*this.cameraFraction;
   const finalClearance=cameraClearance(safetyPivot,desired,cameraBoxes);
   this.camera.position.copy(safetyPivot).lerp(desired,finalClearance);
   this.camera.position.y=Math.max(this.frontierRenderer?terrainHeight(this.camera.position.x/S,this.camera.position.z/S)+.45:.45,this.camera.position.y);
   this.camera.lookAt(pivot.clone().addScaledVector(forward,2.5).addScaledVector(right,.15));
  }else{this.uniforms.active.value=0;this.focus.set(VILLAGE.x*S,0,VILLAGE.y*S);this.camera.position.set(VILLAGE.x*S+9,11,VILLAGE.y*S+11);this.camera.lookAt(this.focus);
   this.previewActor??=adventurer(this.previewClass,{frontier:this.frontierMode},true);if(!this.previewActor.group.parent)this.scene.add(this.previewActor.group);
   this.previewActor.group.visible=true;this.previewActor.group.position.set(watch?48:VILLAGE.x*S,surfaceY,watch?40:VILLAGE.y*S+3);
   this.previewActor.group.rotation.y=3.7;this.previewActor.animate?.(now/1000,0,0,0,this.reducedMotion);
   const anchor=this.previewActor.group.position;this.previewActor.group.scale.setScalar(w>600?1.3:1.15);this.focus.copy(anchor);this.camera.position.set(anchor.x+3.5,3.3,anchor.z+4.8);this.camera.lookAt(anchor.x-(w>600?2.7:0),1.35,anchor.z);
  }
  if(me&&this.previewActor)this.previewActor.group.visible=false;
  for(const [i,signal] of this.watchSignals.entries()){signal.visible=!view||!!view.watch&&(view.watch.state==="victory"||view.watch.stage>i);signal.scale.y=this.reducedMotion?1:1+Math.sin(now*.006+i)*.07;}
  this.reachFan.visible=!!me&&me.hp>0&&!!me.action&&!me.action.skill&&serverTime<me.action.contactAt;this.targetMarker.visible=false;
  if(me){this.reachFan.position.set(me.x*S,surfaceY+.045,me.y*S);this.reachFan.rotation.z=-me.facing;this.reachFan.scale.setScalar(COMBAT[me.heroClass].reach*S);const selection=readTarget(view!,me);if(selection){this.targetMarker.visible=true;this.targetMarker.position.set(selection.x*S,this.heightAt(selection.x,selection.y)+.07,selection.y*S);this.targetMarker.material.color.set(selection.inReach?"#ffe1a2":"#7aabaa");}}

  const cameraLine=this.camera.position.clone().sub(this.focus.clone().add(new THREE.Vector3(0,1.1,0))),lineLength=cameraLine.lengthSq();
  for(const leaf of this.foliage){const center=leaf.group.position.clone().add(new THREE.Vector3(0,3.5,0)),relative=center.clone().sub(this.focus.clone().add(new THREE.Vector3(0,1.1,0))),fraction=Math.max(0,Math.min(1,relative.dot(cameraLine)/Math.max(.001,lineLength))),nearest=this.focus.clone().add(new THREE.Vector3(0,1.1,0)).addScaledVector(cameraLine,fraction);const occludes=me&&center.distanceTo(nearest)<2.9;leaf.material.opacity+=((occludes?.08:1)-leaf.material.opacity)*damping(12,dt);leaf.bark.opacity=leaf.material.opacity;}
  for(const object of this.obstructions){const base=this.focus.clone().add(new THREE.Vector3(0,1.1,0)),relative=object.center.clone().sub(base),fraction=Math.max(0,Math.min(1,relative.dot(cameraLine)/Math.max(.001,lineLength))),nearest=base.addScaledVector(cameraLine,fraction);const occludes=!!me&&object.center.distanceTo(nearest)<object.radius+.2;for(const mat of object.materials)mat.opacity+=((occludes?.12:1)-mat.opacity)*damping(12,dt);}
  this.rim.position.copy(this.focus).add(new THREE.Vector3(8,8,15));this.rim.target.position.copy(this.focus);
  this.sun.position.copy(this.focus).add(new THREE.Vector3(-12,24,-8));this.sun.target.position.copy(this.focus);
  if(this.frontierRenderer){const day=view?.frontier?.day??.34,daylight=Math.max(0,Math.sin((day-.16)/.52*Math.PI));this.sun.intensity=.12+daylight*3.1;this.sun.color.set(daylight>.3?"#ffead0":"#9aaeca");this.ambient.intensity=.38+daylight*.64;this.scene.environmentIntensity=.22+daylight*.5;this.scene.backgroundIntensity=.18+daylight*.82;this.scene.fog?.color.setRGB(.025+daylight*.41,.04+daylight*.44,.06+daylight*.4);this.sun.position.copy(this.focus).add(new THREE.Vector3(Math.cos(day*Math.PI*2)*24,8+daylight*24,Math.sin(day*Math.PI*2)*24));}
  for(const object of this.decorations){object.visible=preview||object.position.distanceTo(this.focus)<65;if(object.userData.house){const flames=object.getObjectByName("flames");if(flames){flames.visible=(view?.villageDamage??0)>20;flames.scale.y=1+Math.sin(now*.014)*.25;}}}
  for(const light of this.lamps){light.visible=!this.lowQuality&&light.position.distanceTo(this.focus)<14;light.intensity=3.5+(this.reducedMotion?0:Math.sin(now*.009+light.position.x)*.6);}
  for(const p of view?.heroes??[]){let actor=this.actors.get(p.id);if(actor&&actor.group.userData.appearance!==[p.weapon,p.hair,p.accessory].join("|")){if(actor.dispose)actor.dispose();else actor.group.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});this.scene.remove(actor.group);this.actors.delete(p.id);actor=undefined;}actor??=this.human(p,p.id===me?.id);visible.add(p.id);this.updateActor(p.id,actor,p.x,p.y,p.facing,dt,p.id===me?.id);const walk=p.moving?Math.sin(now*.013)*.5:0;actor.left.rotation.x=walk;actor.right.rotation.x=-walk;const age=(serverTime-p.attackAt)/1000, swing=age>=0&&age<.48?Math.sin(age/.48*Math.PI):0;
   actor.arm.rotation.x=swing?(p.attackStyle===2?-2.3+swing*2.8:-1.1+swing*.8):walk*.5;
   actor.arm.rotation.z=swing?(p.attackStyle===2?-swing*1.1:(p.attackStyle===0?1:-1)*swing*1.35):0;
   const roll=(serverTime-p.dodgeAt)/360;actor.group.rotation.x=!this.reducedMotion&&roll>=0&&roll<1?-.25*Math.sin(roll*Math.PI):0;
   actor.group.position.y=this.heightAt(p.x,p.y)+(!this.reducedMotion&&roll>=0&&roll<1?.12*Math.sin(roll*Math.PI):0);
if(me&&p.id!==me.id&&me.party&&p.party===me.party){let label=actor.group.getObjectByName("company-label");if(!label){label=new THREE.Group();label.name="company-label";label.position.y=PHYSIQUE[p.heroClass].height*2.15;actor.group.add(label);const c=document.createElement("canvas");c.width=256;c.height=80;const ctx=c.getContext("2d")!;ctx.textAlign="center";ctx.strokeStyle="#10232b";ctx.lineWidth=5;ctx.lineJoin="round";ctx.font="25px Arial";ctx.strokeText(p.name,128,33,240);ctx.fillStyle="#efe3bd";ctx.fillText(p.name,128,33,240);ctx.font="17px Arial";ctx.strokeText(p.heroClass,128,59,240);ctx.fillStyle="#a8cabe";ctx.fillText(p.heroClass,128,59,240);const texture=new THREE.CanvasTexture(c),material=new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false});const sprite=new THREE.Sprite(material);sprite.scale.set(1.5,.47,1);label.add(sprite);const barMaterial=new THREE.MeshBasicMaterial({color:"#9ad6bd",depthTest:false});const bar=new THREE.Mesh(new THREE.PlaneGeometry(1.35,.035),barMaterial);bar.name="company-health";bar.position.y=-.29;label.add(bar);const oldDispose=actor.dispose;actor.dispose=()=>{oldDispose?.();texture.dispose();material.dispose();bar.geometry.dispose();barMaterial.dispose();};}label.quaternion.copy(this.camera.quaternion).premultiply(actor.group.quaternion.clone().invert());const fill=label.getObjectByName("company-health")!;fill.scale.x=Math.max(.001,p.hp/p.maxHp);fill.position.x=(fill.scale.x-1)*.675;}
if(actor.animate)actor.animate(now/1000,p.moving?actor.group.userData.motion??0:0,0,roll>=0&&roll<1?Math.sin(roll*Math.PI):0,this.reducedMotion,p.action,serverTime);else if(actor.cape)actor.cape.rotation.x=.12+Math.sin(now*.005)*.06+(p.moving?.25:0);actor.group.rotation.z=p.hp<=0?1.4:0;}
  for(const m of view?.monsters??[]){const training=view?.watch?.state==="forming";let actor=this.actors.get(m.id);if(actor&&!!actor.group.userData.training!==training){actor.group.removeFromParent();if(actor.dispose)actor.dispose();else actor.group.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});this.actors.delete(m.id);actor=undefined;}actor??=this.creature(m);actor.group.userData.training=training;visible.add(m.id);this.updateActor(m.id,actor,m.x,m.y,m.facing,dt);actor.group.position.y=this.heightAt(m.x,m.y)+(this.reducedMotion?0:Math.sin(now*.008+m.id.length)*.015);
   const anticipation=m.attackAt>serverTime?Math.max(0,Math.min(1,1-(m.attackAt-serverTime)/(m.kind==="boss"?1400:1050))):0;
   const recovery=m.recoveryUntil>serverTime;actor.setFrost?.((m.slowUntil??0)>serverTime,dt);
   actor.group.rotation.x=this.reducedMotion?0:anticipation*-.18+(recovery?.12:0);
   actor.group.scale.y=m.kind==="slime"?1-anticipation*.25:(actor.group.userData.baseScale??(m.kind==="boss"?1.7:1));

   actor.group.userData.gait=actor.group.userData.motion??0;
   const motion=presentEnemyAction(m,serverTime,actor.group.userData.contactAt??0,view?.time??serverTime);actor.group.userData.contactAt=motion.contactAt;const scheduled=motion.action;
   if(actor.animate){
    actor.animate(now/1000,m.attackAt||recovery?0:actor.group.userData.gait,0,0,this.reducedMotion,scheduled,serverTime);
   }else{const pose=combatPose(scheduled,serverTime),ready=Math.min(1,pose.windup*2.6);actor.left.rotation.x=m.attackAt||recovery?ready*.18:Math.sin(now*.01)*.25*actor.group.userData.gait;actor.right.rotation.x=-actor.left.rotation.x;actor.arm.rotation.x=-ready*.7+pose.strike*.18;if(m.kind==="wolf"){actor.arm.position.z=-.4+ready*.18-pose.strike*.32;actor.group.rotation.x=this.reducedMotion?0:-ready*.2+pose.strike*.12;}}


   if(actor.group.userData.hp!==undefined&&m.hp<actor.group.userData.hp)actor.group.userData.hit=now;actor.group.userData.hp=m.hp;
   actor.group.rotation.z=hitRecoil(now,actor.group.userData.hit,this.reducedMotion);
   let bar=actor.group.getObjectByName("health");
   if(!bar){
    bar=new THREE.Group();bar.name="health";
    bar.position.y=actor.group.userData.articulated?PHYSIQUE[watchEnemy(m.kind).heroClass].height*2.1+.2:m.kind==="boss"?2.3:1.8;
    const border=new THREE.Mesh(new THREE.PlaneGeometry(1.3,.14),this.enemyHealthMaterials[0]);
    const fill=new THREE.Mesh(new THREE.PlaneGeometry(1.24,.08),this.enemyHealthMaterials[1]);fill.name="fill";fill.position.z=.005;bar.add(border,fill);actor.group.add(bar);
    if(actor.dispose){const originalDispose=actor.dispose,health=bar;actor.dispose=()=>{originalDispose();health.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});};}
   }
   const health=enemyHealth(m.hp,m.maxHp);bar.visible=health.visible;
   bar.quaternion.copy(this.camera.quaternion).premultiply(actor.group.quaternion.clone().invert());
   const fill=bar.getObjectByName("fill")!;fill.scale.x=health.fraction;fill.position.x=(fill.scale.x-1)*.62;
  }
  if(view?.dragon&&view.dragon.state!=="defeated"){const d=view.dragon,actor=this.actors.get("dragon")??this.dragon();visible.add("dragon");this.updateActor("dragon",actor,d.x,d.y,d.facing,dt);const sleep=d.state==="sleeping";actor.group.scale.y=1.25*(sleep?.78+Math.sin(now*.0015)*.012:1);actor.arm.rotation.x=sleep?.35+Math.sin(now*.0015)*.012:Math.sin(now*.002)*.08;actor.left.rotation.z=(sleep?-.12:.14)+Math.sin(now*(sleep?.001:.005))*.08;actor.right.rotation.z=-actor.left.rotation.z;actor.left.rotation.y=sleep?-1.1:0;actor.right.rotation.y=-actor.left.rotation.y;const tail=actor.group.getObjectByName("tail");if(tail)tail.rotation.y=Math.sin(now*.001)*.14;}
  for(const [id,actor] of this.actors){actor.group.visible=visible.has(id);if(actor.group.visible)actor.group.userData.lastVisible=now;else if(now-(actor.group.userData.lastVisible??now)>60000){actor.group.removeFromParent();if(actor.dispose)actor.dispose();else actor.group.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});this.actors.delete(id);}}
  this.clickTargets=[];
  if(view?.frontier&&this.frontierRenderer)for(const n of view.frontier.nodes){const group=this.frontierRenderer.resources.get(n.id);if(group)this.clickTargets.push({group,x:n.x,y:n.y});}
  if(me&&view)for(const actor of [...view.heroes,...view.monsters]){const rendered=this.actors.get(actor.id);if(actor.id!==me.id&&actor.hp>0&&rendered?.group.visible)this.clickTargets.push({group:rendered.group,x:actor.x,y:actor.y});}
  // Retain each combat effect for its lifetime instead of reallocating meshes every frame.
  for(const [id,group] of this.effectActors)if(!view?.effects.some(e=>e.id===id&&serverTime-e.at<650)){
   group.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();(o.material as THREE.Material).dispose();}});
   group.removeFromParent();this.effectActors.delete(id);
  }
  for(const mesh of this.ringPool)mesh.visible=false;let usedRings=0;
  const ring=(x:number,z:number,r:number,color:string,opacity:number)=>{let mesh=this.ringPool[usedRings++];if(!mesh){mesh=new THREE.Mesh(this.ringGeometry,new THREE.MeshBasicMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide}));mesh.rotation.x=-Math.PI/2;this.rings.add(mesh);this.ringPool.push(mesh);}mesh.position.set(x*S,this.heightAt(x,z)-surfaceY+.045,z*S);mesh.scale.setScalar(Math.max(.02,r));mesh.material.color.set(color);mesh.material.opacity=opacity;mesh.visible=true;};
  this.facingMarker.visible=!!me;
 if(me){ring(me.x,me.y,.42,"#f4d58a",.85);this.facingMarker.position.set(me.x*S+Math.cos(me.facing)*.75,surfaceY+.08,me.y*S+Math.sin(me.facing)*.75);this.facingMarker.rotation.set(0,-me.facing,-Math.PI/2);}
  if(me&&(this.watchScene||!floor)&&this.guideTarget){if(now-this.guideAt>1200){this.guidePath=this.watchScene?[this.guideTarget]:routeTo(me,this.guideTarget);this.guideAt=now;}for(const point of this.guidePath.filter((_,i)=>i%2===0).slice(0,24))ring(point.x,point.y,.12,"#efc676",.65);ring(this.guideTarget.x,this.guideTarget.y,.65+Math.sin(now*.002)*.06,"#f4d58a",.8);}
  for(const e of view?.effects??[]){const age=(serverTime-e.at)/1000;if(age<0||age>1)continue;
   if(e.kind==="starfall"&&!e.to)ring(e.x+Math.cos(e.angle)*2.5/S,e.y+Math.sin(e.angle)*2.5/S,.4+age*2.5,"#9eb8f4",1-age);
     if(["heal","portal","ward","cleanse","parry","interrupt","backstab"].includes(e.kind))ring(e.x,e.y,.5+age*(e.kind==="ward"?.4:1.1),e.kind==="parry"?"#fff0b3":e.kind==="ward"?"#89c7e8":e.kind==="interrupt"||e.kind==="backstab"?"#dab5ea":"#a8e2bb",1-age);
   if(e.to&&["spell","starfall","heal","cleanse"].includes(e.kind)){
    let beam=this.effectActors.get(e.id);const from=new THREE.Vector3(e.x*S,1.05,e.y*S),to=new THREE.Vector3(e.to.x*S,1.05,e.to.y*S),delta=to.clone().sub(from),length=delta.length();
    if(!beam&&age<.22&&length>.01){beam=new THREE.Group();const material=new THREE.MeshBasicMaterial({color:e.kind==="heal"||e.kind==="cleanse"||e.style==="Warden"?"#a7dfb6":"#9acfe7",transparent:true,depthWrite:false});beam.add(new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,1,6),material));this.indicators.add(beam);this.effectActors.set(e.id,beam);}
    if(beam){beam.position.copy(from).addScaledVector(delta,.5);beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());beam.scale.y=length;beam.visible=age<.22;((beam.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity=Math.max(0,1-age/.22)*.6;}
   }
   const duration=e.kind==="spell"||e.kind==="starfall"||e.kind==="defeat"?.65:e.kind==="hit"?.45:.4;
   if(["slash","crescent","spell","starfall","hit","defeat"].includes(e.kind)&&age<duration&&!(e.to&&(e.kind==="spell"||e.kind==="starfall"))){
    let group=this.effectActors.get(e.id);
    if(!group){
     group=new THREE.Group();this.indicators.add(group);this.effectActors.set(e.id,group);
     if(e.kind==="slash"||e.kind==="crescent"){
      const crescent=e.kind==="crescent",material=new THREE.MeshBasicMaterial({color:"#d4c1a0",transparent:true,side:THREE.DoubleSide,depthWrite:false});
      if(e.style==="Rogue"){for(const side of [-1,1]){const cut=this.mesh(new THREE.BoxGeometry(.05,.06,e.radius?e.radius*S:2),material,group);cut.rotation.y=-e.angle+Math.PI/2+side*.12;cut.position.x=Math.cos(e.angle);cut.position.z=Math.sin(e.angle);}}else{const r=(e.radius??(crescent?95:72))*S;const arc=this.mesh(new THREE.RingGeometry(r*.82,r,32,1,e.angle-56*Math.PI/180,112*Math.PI/180),material,group);arc.rotation.x=Math.PI/2;}
     }else if(e.kind==="defeat"){for(let i=0;i<8;i++)this.mesh(new THREE.BoxGeometry(.08+(i%3)*.035,.07,.06),new THREE.MeshBasicMaterial({color:i%3?"#54515b":"#c89f6a",transparent:true,depthWrite:false}),group);}
     else for(let i=0;i<(e.kind==="hit"?4:e.kind==="starfall"?6:1);i++){
      this.sphere(group,new THREE.MeshBasicMaterial({color:e.kind==="starfall"?"#b8c5ff":e.kind==="spell"?"#99bbc0":"#ae8d6b",transparent:true,depthWrite:false}),0,0,0,e.kind==="spell"||e.kind==="starfall"?.055:.025,e.kind==="spell"?.055:.025,e.kind==="spell"?.055:.025);
     }
    }
    group.position.set(e.x*S,this.heightAt(e.x,e.y)-surfaceY+(e.kind==="slash"||e.kind==="crescent"?.65:.5),e.y*S);
    group.children.forEach((object,i)=>{
     const mesh=object as THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>;mesh.castShadow=false;mesh.receiveShadow=false;mesh.material.opacity=(1-age/duration)*(e.kind==="slash"||e.kind==="crescent"?.6:1);
     if(e.kind==="starfall")mesh.position.set(Math.cos(e.angle)*2.5+Math.cos(i)*.55,Math.max(.1,3.2-age*7+i*.13),Math.sin(e.angle)*2.5+Math.sin(i)*.55);
      else if(e.kind==="spell")mesh.position.set(Math.cos(e.angle)*age*(e.radius?e.radius*S/duration:9),.35,Math.sin(e.angle)*age*(e.radius?e.radius*S/duration:9));
     else if(e.kind==="defeat"){const spread=this.reducedMotion?.08:age*1.5;mesh.position.set(Math.cos(i*2.4)*spread,.3+(i%3)*.2+(this.reducedMotion?0:age*.9-age*age*2),Math.sin(i*2.4)*spread);mesh.rotation.set(i+spread,spread,i*.8);mesh.scale.setScalar(1-age/duration);}
     else if(e.kind==="hit")mesh.position.set(Math.cos(i*2)*age,age,Math.sin(i*2)*age);
     else mesh.scale.setScalar(1+age*.15);
    });
   }
   if(e.kind==="fire")ring(e.x,e.y,1+age*6,"#d79348",1-age);
  }
  for(const e of view?.effects??[])if(["guard","parry","ward","cleanse","interrupt","backstab","cover"].includes(e.kind)||e.kind==="hit"&&e.value){
   const age=(serverTime-e.at)/1000;if(age<0||age>1)continue;
   let label=this.damageLabels.get(e.id);if(!label){const c=document.createElement("canvas");c.width=128;c.height=64;const ctx=c.getContext("2d")!;ctx.font="bold 25px Georgia";ctx.textAlign="center";ctx.strokeStyle="#201a17";ctx.lineWidth=5;const labelText=e.kind==="cover"?"Covered":e.kind==="practice"?"Rehearsal":e.kind==="guard"?"Safe":e.kind==="parry"?"Parry":e.kind==="ward"?"Ward":e.kind==="cleanse"?"Cleanse":e.kind==="interrupt"?"Interrupt":e.kind==="backstab"?"Backstab":String(e.value);ctx.strokeText(labelText,64,45);ctx.fillStyle="#ffe3a6";ctx.fillText(labelText,64,45);const texture=new THREE.CanvasTexture(c);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false}));sprite.scale.set(1,.5,1);this.scene.add(sprite);label={sprite,texture};this.damageLabels.set(e.id,label);}label.sprite.position.set(e.x*S,this.heightAt(e.x,e.y)+1.6+age,e.y*S);label.sprite.material.opacity=1-age;
  }
  for(const [id,label] of this.damageLabels)if(!view?.effects.some(e=>e.id===id&&serverTime-e.at<1000)){this.scene.remove(label.sprite);label.texture.dispose();label.sprite.material.dispose();this.damageLabels.delete(id);}
  this.renderer.render(this.scene,this.camera);
  if(now-this.frameReportAt>1000&&this.frameSamples.length>=1){const sorted=[...this.frameSamples].sort((a,b)=>a-b);canvas.dataset.performance=JSON.stringify({frontier:!!this.frontierRenderer,natureModels:this.frontierModels?.rocks.length??0,cameraHeading:+this.heading.toFixed(3),heroPosition:me?{x:+me.x.toFixed(1),y:+me.y.toFixed(1),facing:+me.facing.toFixed(3)}:null,samples:sorted.length,mouseLookLocked:document.pointerLockElement===canvas,focused:document.hasFocus(),background:document.hidden,renderCpuMs:+(performance.now()-frameStart).toFixed(2),medianFrameMs:+sorted[Math.floor(sorted.length*.5)].toFixed(2),p95FrameMs:+sorted[Math.floor(sorted.length*.95)].toFixed(2),drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,geometries:this.renderer.info.memory.geometries,mode:this.lowQuality?"performance":"full",cameraClearance:+this.cameraFraction.toFixed(3),cameraHeight:+this.camera.position.y.toFixed(2),awareness:me?.awareness??0,effectObjects:this.effectActors.size});this.frameReportAt=now;}
 }
 dispose(){this.disposed=true;this.frontierRenderer?.dispose();this.frontierModels?.dispose();for(const material of this.enemyHealthMaterials)material.dispose();this.previewActor?.dispose?.();this.targetMarker.geometry.dispose();this.targetMarker.material.dispose();this.reachFan.geometry.dispose();this.reachFan.material.dispose();for(const actor of this.actors.values())actor.dispose?.();this.scene.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});for(const mesh of this.ringPool)mesh.material.dispose();this.facingMarker.material.dispose();this.effectActors.forEach(group=>group.traverse(o=>{if(o instanceof THREE.Mesh)(o.material as THREE.Material).dispose();}));for(const label of this.damageLabels.values()){label.texture.dispose();label.sprite.material.dispose();}for(const m of this.materials)m.dispose();for(const t of this.textures.values())t.dispose();this.renderer.dispose();}
}




