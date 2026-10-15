import * as THREE from "three";
import {RoundedBoxGeometry} from "three/addons/geometries/RoundedBoxGeometry.js";

const noise=(seed:number)=>{const v=Math.sin(seed*91.13+12.7)*43758.5453;return v-Math.floor(v);};

// Drooping, irregular branch fans give the trees a broken outline at skyline distance.
// Opaque geometry keeps the forest inexpensive and avoids alpha-sort shimmer on phones.
function frontierFir(root:THREE.Group,x:number,z:number,height:number,seed:number,wood:THREE.Material,needles:THREE.Material[]){
 const tree=new THREE.Group();tree.position.set(x,0,z);root.add(tree);
 const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.055,height*.023,height*.94,7),wood);trunk.position.y=height*.47;tree.add(trunk);
 const surfaces:number[][]=[[],[],[]];
 const tri=(vertices:number[],a:number[],b:number[],c:number[])=>vertices.push(...a,...b,...c);
 for(let level=0;level<9;level++){
  const h=height*(.23+level*.083),radius=height*.27*Math.pow(1-level/10,1.2),branches=level>6?5:7;
  for(let branch=0;branch<branches;branch++){
   const angle=branch/branches*Math.PI*2+level*2.399+noise(seed+level)*.3;
   const r=radius*(.7+noise(seed+level*23+branch)*.45),width=r*(.48+noise(seed+branch*19)*.18),bend=h-r*.12;
   const forward=[Math.cos(angle),Math.sin(angle)],side=[-forward[1],forward[0]];
   const point=(distance:number,lateral:number,y:number)=>[forward[0]*distance+side[0]*lateral,y,forward[1]*distance+side[1]*lateral];
   const center=point(r*.42,0,h+r*.30),base=point(.015,0,h),left=point(r*.60,-width,bend),tip=point(r,0,bend-r*.09),right=point(r*.60,width,bend);
   const vertices=surfaces[(branch+level)%3];
   tri(vertices,base,left,center);tri(vertices,left,tip,center);tri(vertices,tip,right,center);tri(vertices,right,base,center);
   tri(vertices,base,tip,left);tri(vertices,base,right,tip);
  }
 }
 for(const [i,vertices] of surfaces.entries()){
  const geometry=new THREE.BufferGeometry();geometry.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,needles[i]);mesh.castShadow=mesh.receiveShadow=true;tree.add(mesh);
 }
}

function courtyardGrowth(root:THREE.Group,materials:THREE.Material[]){
 const surfaces:number[][]=materials.map(()=>[]);
 // Small, static clumps live beside the side walls. The central combat lanes stay clear.
 for(let i=0;i<560;i++){
  const side=i%2?-1:1,x=48+side*(14.8+noise(i+74)*4.1),z=26+noise(i+92)*46;
  if(noise(Math.floor(z/2)+side*91)<.22)continue;
  const vertices=surfaces[i%surfaces.length],height=.10+Math.pow(noise(i+21),2)*.36;
  for(let blade=0;blade<4;blade++){
   const a=noise(i*13+blade)*Math.PI*2,w=.025+noise(i+blade+7)*.025,r=.04+noise(i+blade)*.12;
   const bx=x+Math.cos(a)*r,bz=z+Math.sin(a)*r,dx=Math.cos(a+Math.PI/2)*w,dz=Math.sin(a+Math.PI/2)*w;
   const tip=[bx+Math.cos(a)*height*.35,.18+height,bz+Math.sin(a)*height*.35],left=[bx-dx,.18,bz-dz],right=[bx+dx,.18,bz+dz];
   vertices.push(...left,...right,...tip,...right,...left,...tip);
  }
 }
 for(const [i,vertices] of surfaces.entries()){
  const geometry=new THREE.BufferGeometry();geometry.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,materials[i]);mesh.receiveShadow=true;root.add(mesh);
 }
}

// Original static dressing stays outside combat clearance and introduces no hidden actors.
export function frontierScenery(root:THREE.Group,material:(color:string,kind?:string,metalness?:number)=>THREE.MeshStandardMaterial){
 const stone=material("#546174","stone"),edge=material("#84919b","stone"),dark=material("#233444"),wood=material("#695240","wood"),bronze=material("#b78b59",undefined,.4);
 const block=(parent:THREE.Object3D,mat:THREE.Material,x:number,y:number,z:number,w:number,h:number,d:number)=>{
  const mesh=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,1,Math.min(.07,w/8,h/8,d/8)),mat);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
 };
 for(const side of [-1,1]){
  const x=48+side*22;
  for(let row=0;row<4;row++)for(let col=0;col<23;col++){
   if(row>1&&noise(row*30+col+side*100)<.3)continue;
   const z=22.5+col*2.2+(row%2)*1.1;
   block(root,noise(col+row*19)>.55?edge:stone,x,.42+row*.67,z,1.17,.63,2.14);
  }
  for(const z of [29,47,66]){
   block(root,wood,x-side*.8,2.15,z,.14,.16,3.7);
   const brace=block(root,wood,x-side*.62,1.45,z+1.1,.18,1.7,.18);brace.rotation.x=-.44;
  }
  for(let i=0;i<19;i++){
   const z=24+i*2.45,xr=x-side*(.9+noise(i)*.55);
   const rock=block(root,stone,xr,.14,z,.35+noise(i+11)*.5,.18,.3+noise(i+71)*.5);rock.rotation.y=noise(i)*Math.PI;
  }
 }
 // Layered distant ridges replace the row of featureless cone blocks.
 for(let layer=0;layer<3;layer++){
  const ridge=material(["#344357","#273449","#1e2d43"][layer]);
  for(let i=0;i<13;i++){
   const mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(7+noise(i)*5,1),ridge);
   mesh.position.set(-8+i*9,-1+noise(i+4)*1.5,-30-layer*22);mesh.scale.set(1.4,.35+noise(i+layer*5)*.28,.8);mesh.rotation.z=(noise(i+8)-.5)*.3;mesh.castShadow=false;root.add(mesh);
  }
 }
 // The north arch uses individually cut voussoirs and inset masonry.
 const arch=new THREE.Group();arch.position.set(48,0,23);root.add(arch);
 for(let i=0;i<13;i++){
  const angle=i/12*Math.PI;
  const b=block(arch,i%3?edge:stone,Math.cos(angle)*2.1,3.4+Math.sin(angle)*2.1,.72,.56,.73,.38);b.rotation.z=angle-Math.PI/2;
 }
 for(const side of [-1,1])for(let row=0;row<6;row++)block(arch,stone,side*2.7,.35+row*.62,.76,1.45,.57,.25);
 block(arch,bronze,0,5.65,.73,.7,.26,.42);
 const gold=material("#daba72",undefined,.35);
 for(const side of [-1,1]){
  const plaque=block(root,dark,48+side*7,1.5,24,.85,2.6,.35);
  plaque.rotation.y=side*.12;
  block(root,gold,48+side*7,2.5,24.2,.55,.06,.04);
 }
 // A scarred timber lookout gives the courtyard a recognizable frontier silhouette.
 // It stands beyond the existing walkable boundary; the renderer supplies its camera box.
 const tower=new THREE.Group();tower.position.set(21,0,33);root.add(tower);
 for(const x of [-1.7,1.7])for(const z of [-1.7,1.7]){block(tower,stone,x,.3,z,.62,.6,.62);block(tower,wood,x,3.3,z,.27,6.6,.27);block(tower,bronze,x,4.6,z,.33,.09,.33);}
 block(tower,wood,0,5.1,0,4.4,.24,4.4);block(tower,dark,0,5.3,0,4.6,.18,4.6);
 for(const side of [-1,1])for(const z of [-1.7,1.7]){const brace=block(tower,wood,side*.9,2.5,z,.18,4.8,.18);brace.rotation.z=side*-.38;}
 for(const z of [-1.9,1.9]){block(tower,wood,0,6.0,z,4.2,.16,.14);for(let i=0;i<7;i++)block(tower,wood,-1.8+i*.6,5.65,z,.10,.85,.10);}
 for(const x of [-1.9,1.9])block(tower,wood,x,6.0,0,.14,.16,4.2);
 for(const side of [-1,1]){const roof=block(tower,material("#354653","roof"),side*1.18,7.1,0,2.7,.18,4.8);roof.rotation.z=side*-.45;block(tower,bronze,side*2.35,6.5,0,.09,.10,4.8);}
 block(tower,wood,0,7.68,0,.18,.18,4.9);
 const pennant=block(tower,material("#7e4149"),-1.94,5.8,1.95,.62,1.8,.035);pennant.rotation.z=-.05;block(tower,gold,-1.94,5.8,1.976,.035,1.4,.01);
 // Physical branch fans replace the stacked cone silhouettes. No gameplay actors.
 const needles=[material("#283c3f"),material("#344b48"),material("#425850")];
 for(const side of [-1,1])for(let i=0;i<11;i++){
  frontierFir(root,48+side*(30+noise(i+side*21)*6),16+i*5.9,5+noise(i*23)*5,i+side*31,wood,needles);
 }
 courtyardGrowth(root,[material("#636c50"),material("#7d7958"),material("#414f42")]);
 // The rear approach completes the same courtyard; it is static scenery outside play bounds.
 const rear=new THREE.Group();rear.position.set(48,0,74);root.add(rear);
 for(const side of [-1,1]){
  for(let row=0;row<4;row++)for(let col=0;col<8;col++){
   block(rear,row%2?edge:stone,side*(4.8+col*2.3),.4+row*.65,0,2.24,.6,1.15);
  }
  block(rear,wood,side*3.2,2.5,0,.42,5,.48);block(rear,stone,side*3.2,.3,0,.75,.6,.8);
  block(rear,bronze,side*3.2,4.9,0,.53,.15,.59);
  for(let j=0;j<3;j++)block(rear,wood,side*(5+j*5.9),3.1,0,.23,.8,.23);
 }
 block(rear,wood,0,5.1,0,7.1,.35,.65);block(rear,bronze,0,5.12,.36,1.1,.14,.025);
 const roof=material("#314552","roof");
 for(const side of [-1,1]){const shelter=block(rear,roof,0,5.45,side*.59,7.7,.12,1.35);shelter.rotation.x=side*.3;}
 const sign=block(rear,wood,0,4.55,.31,2.6,.56,.14);sign.rotation.z=.025;
 // A carved eye repeats the company's frontier motif without a floating warning symbol.
 const eye=new THREE.Mesh(new THREE.TorusGeometry(.18,.023,4,16),bronze);eye.position.set(0,4.57,.40);eye.scale.set(2,1,1);rear.add(eye);
 for(let i=0;i<9;i++){
  frontierFir(root,20+i*7+noise(i)*3,91+noise(i+31)*8,5+noise(i+79)*4,i+171,wood,needles);
 }
 for(let i=0;i<14;i++){
  const angle=i/14*Math.PI*2,mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(9+noise(i+64)*5,1),material(i%2?"#384b5a":"#283c50"));
  mesh.position.set(48+Math.cos(angle)*104,-1,48+Math.sin(angle)*106);mesh.scale.set(1.7,.4+noise(i+62)*.28,1.2);mesh.rotation.y=angle;mesh.castShadow=false;root.add(mesh);
 }
 // A supply cart and stacked provisions establish a lived-in frontier staging area.
 const cart=new THREE.Group();cart.position.set(35,0,78);cart.rotation.y=-.17;root.add(cart);
 block(cart,wood,0,.94,0,2.7,.16,1.65);
 for(const side of [-1,1])for(let row=0;row<3;row++)block(cart,wood,0,1.12+row*.21,side*.85,2.8,.14,.12);
 for(const x of [-1,1])for(const side of [-1,1]){
  const wheel=new THREE.Mesh(new THREE.TorusGeometry(.54,.07,5,12),wood);wheel.position.set(x,.57,side*1);cart.add(wheel);
  for(let spoke=0;spoke<4;spoke++){const beam=block(cart,wood,x,.57,side*1,.07,1.03,.06);beam.rotation.z=spoke*Math.PI/4;}
 }
 block(cart,wood,0,.91,2.2,.16,.18,2.5);
 for(let i=0;i<3;i++){const box=block(cart,material("#8b7358","wood"),(i-1)*.76,1.4,(i%2)*.2,.64,.64,.7);box.rotation.y=i*.12;block(cart,bronze,(i-1)*.76,1.4,.36+(i%2)*.2,.6,.045,.015);}
}

export function duskSky(){
 const canvas=document.createElement("canvas");canvas.width=512;canvas.height=256;
 const context=canvas.getContext("2d")!,gradient=context.createLinearGradient(0,0,0,256);
 gradient.addColorStop(0,"#102038");gradient.addColorStop(.36,"#364764");gradient.addColorStop(.48,"#a08879");gradient.addColorStop(.52,"#c6a78b");gradient.addColorStop(.57,"#66594d");gradient.addColorStop(1,"#27303e");
 context.fillStyle=gradient;context.fillRect(0,0,512,256);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.mapping=THREE.EquirectangularReflectionMapping;
 return texture;
}
