"use client";
import {useEffect,useRef,useState} from "react";
import * as THREE from "three";
import {adventurer} from "./watch-adventurer";
import {CLASSES,type ClassName} from "./progression";
export function Rebirth({onChoose,reduced}:{onChoose:(cls:ClassName)=>void;reduced:boolean}){
 const canvas=useRef<HTMLCanvasElement>(null),dialog=useRef<HTMLDivElement>(null),phaseRef=useRef(0),selected=useRef<ClassName>("Knight"),demoAt=useRef(0);
 const [phase,setPhase]=useState(0),[choice,setChoice]=useState<ClassName>("Knight");
 useEffect(()=>{phaseRef.current=phase;dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();},[phase]);
 useEffect(()=>{selected.current=choice;demoAt.current=performance.now();},[choice]);
 useEffect(()=>{
  if(!canvas.current)return;const element=canvas.current;
  const renderer=new THREE.WebGLRenderer({canvas:element,antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
  const scene=new THREE.Scene();scene.background=new THREE.Color("#131d2e");scene.fog=new THREE.Fog("#131d2e",25,100);
  const camera=new THREE.PerspectiveCamera(42,1,.1,60);camera.position.set(0,3.2,12);camera.lookAt(0,1,0);
  scene.add(new THREE.HemisphereLight("#d8eaff","#655a72",3));const rim=new THREE.DirectionalLight("#8fa9ff",4);rim.position.set(-4,4,-3);scene.add(rim);const light=new THREE.DirectionalLight("#ffe3b9",4);light.position.set(3,7,5);scene.add(light);
  const materials:THREE.Material[]=[],geometries:THREE.BufferGeometry[]=[];
  const mat=(color:string,metalness=0,glow=false)=>{const m=new THREE.MeshStandardMaterial({color,metalness,roughness:metalness?.32:.72,...(glow?{emissive:color,emissiveIntensity:2}: {})});materials.push(m);return m;};
  function mesh(parent:THREE.Object3D,g:THREE.BufferGeometry,m:THREE.Material,x:number,y:number,z:number){geometries.push(g);const a=new THREE.Mesh(g,m);a.position.set(x,y,z);parent.add(a);return a;}
  const sphere=(p:THREE.Object3D,m:THREE.Material,x:number,y:number,z:number,r:number)=>mesh(p,new THREE.SphereGeometry(r,18,12),m,x,y,z);
  const orb=new THREE.Group();scene.add(orb);sphere(orb,mat("#fff8d8",0,true),0,0,0,.2);const orbLight=new THREE.PointLight("#ffefc2",20,12);orb.add(orbLight);
  const skin=mat("#c89d78");
  const arms=new THREE.Group();camera.add(arms);scene.add(camera);
  const hands=[-1,1].map(side=>{const g=new THREE.Group();arms.add(g);g.position.set(side*.44,-.56,-1.3);g.rotation.z=side*-.25;mesh(g,new THREE.CylinderGeometry(.065,.085,.52,10),skin,0,-.18,0);const palm=sphere(g,skin,0,.12,0,.1);palm.scale.set(.8,1.2,.38);for(let i=0;i<4;i++){const f=mesh(g,new THREE.CapsuleGeometry(.013,.12,4,8),skin,-.05+i*.035,.29,0);f.rotation.z=(i-1.5)*-.06;}const thumb=mesh(g,new THREE.CapsuleGeometry(.018,.09,4,8),skin,side*.09,.13,0);thumb.rotation.z=side*-.65;return g;});
  const lineup=new THREE.Group();scene.add(lineup);
  const actors=Object.entries(CLASSES).map(([name,data],index)=>{
   const cls=name as ClassName,rig=adventurer(cls,{},true),root=new THREE.Group();root.position.x=(index-2)*1.8;root.add(rig.group);rig.group.rotation.y=Math.PI;lineup.add(root);
   mesh(root,new THREE.CylinderGeometry(.7,.77,.10,48),mat("#283c53",.5),0,-.05,0);
   const ring=mesh(root,new THREE.TorusGeometry(.74,.012,6,64),mat(data.color,0,true),0,.015,0);ring.rotation.x=Math.PI/2;
   const fx=new THREE.Group();root.add(fx);const aura=mesh(fx,new THREE.TorusGeometry(.55,.016,6,64),mat(data.color,0,true),0,.06,0);aura.rotation.x=Math.PI/2;
   for(let i=0;i<8;i++)sphere(fx,mat(data.color,0,true),Math.cos(i*Math.PI/4)*.7,.7,Math.sin(i*Math.PI/4)*.7,.035);
   return {cls,root,rig,ring,fx,index};
  });
  // A ruined astral sanctuary gives the rebirth its own place and identity.
  const stage=new THREE.Group();lineup.add(stage);mesh(stage,new THREE.CylinderGeometry(8,8,.12,96),mat("#202c42",.15),0,-.18,0);
  for(let i=0;i<9;i++){const angle=(i/8)*Math.PI,px=Math.cos(angle)*6.8,pz=-Math.sin(angle)*5.5-2;mesh(stage,new THREE.CylinderGeometry(.13,.22,3.6+i%3*.45,12),mat("#384357",.2),px,1.6,pz);sphere(stage,mat("#e6bc7e",0,true),px,3.4+i%3*.2,pz,.045);}
  const arch=mesh(stage,new THREE.TorusGeometry(3.7,.045,8,96,Math.PI),mat("#8b9fb2",.4),0,1.6,-5);arch.rotation.z=0;
  const halo=mesh(stage,new THREE.TorusGeometry(2.2,.014,6,96),mat("#d7b88a",0,true),0,2.5,-5);halo.rotation.z=.2;
  const dust=new THREE.BufferGeometry();const positions=new Float32Array(240*3);for(let i=0;i<positions.length;i++)positions[i]=(Math.random()-.5)*18;dust.setAttribute("position",new THREE.BufferAttribute(positions,3));geometries.push(dust);const dustMat=new THREE.PointsMaterial({color:"#e8d4ad",size:.025,transparent:true,opacity:.5});materials.push(dustMat);const points=new THREE.Points(dust,dustMat);scene.add(points);
  let frame=0,last=performance.now(),reported=0;const samples:number[]=[];const started=last;function draw(){const frameAt=performance.now(),elapsed=frameAt-last;last=frameAt;const t=(frameAt-started)/1000;const w=element.clientWidth,h=element.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
   const p=phaseRef.current;lineup.visible=p===2;arms.visible=p===1;orb.visible=p>0;orb.position.set(p===2?0:.1, p===2?3.1:2.4, p===2?1:8);orb.scale.setScalar(reduced?1:1+Math.sin(t*2)*.06);
   camera.position.set(0,p===2?2.65:2.6,p===2?Math.max(9.6,4.8/(Math.tan(21*Math.PI/180)*camera.aspect)):12);camera.lookAt(0,p===2?1.3:2.1,0);points.rotation.y=reduced?0:t*.018;
   hands.forEach((hand,i)=>{hand.rotation.x=reduced?-.2:-.25+Math.sin(t*1.4+i)*.15;hand.rotation.y=reduced?0:Math.sin(t+i)*.15;});
   actors.forEach(a=>{const active=a.cls===selected.current,v=reduced?0:t;const cycle=((frameAt-demoAt.current)/1000)%5.5,attack=active&&!reduced&&cycle>.8&&cycle<2.2?Math.sin((cycle-.8)/1.4*Math.PI):0;
    const targetX=(a.index-2)*1.85+(w>760?.8:0),targetZ=0;const ease=reduced?1:1-Math.exp(-.005*Math.min(elapsed,100));a.root.position.x+=(targetX-a.root.position.x)*ease;a.root.position.z+=(targetZ-a.root.position.z)*ease;
    const size=1;a.root.scale.lerp(new THREE.Vector3(size,size,size),ease);a.rig.group.rotation.y=Math.PI+(active?Math.sin(v*.4)*.12:0);a.rig.animate(v,0,attack,0,reduced);a.fx.visible=active;a.fx.rotation.y=v*.65;
    a.fx.children.forEach((spark,i)=>{if(i===0){spark.scale.setScalar(1+attack*.5);spark.position.y=a.cls==="Ironbound"?.9:0;}else{spark.position.y=a.cls==="Spellweaver"?2.3-((cycle+i*.1)%1.7):a.cls==="Warden"?.4+attack*.8:.25+attack*.35;}});
    a.ring.scale.setScalar(active?1.08:1);
   });

   renderer.render(scene,camera);if(!document.hidden&&elapsed>0){samples.push(elapsed);if(samples.length>300)samples.shift();}if(frameAt-reported>1000){const sorted=[...samples].sort((a,b)=>a-b);element.dataset.performance=JSON.stringify({samples:sorted.length,medianFrameMs:sorted[Math.floor(sorted.length*.5)],p95FrameMs:sorted[Math.floor(sorted.length*.95)],drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,renderCpuMs:performance.now()-frameAt});reported=frameAt;}frame=requestAnimationFrame(draw);
  }draw();return()=>{cancelAnimationFrame(frame);actors.forEach(a=>a.rig.dispose());geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();};
 },[reduced]);
 return <div ref={dialog} className={`rebirth phase-${phase}`} role="dialog" aria-modal="true" aria-label="Your rebirth"><canvas ref={canvas}/>{phase===0&&<div className="white-rebirth"/>}<div className="rebirth-story"><p className="overline">{phase===0?"BETWEEN ONE LIFE AND THE NEXT":phase===1?"A SECOND BREATH":"CHOOSE YOUR CLASS"}</p><h1>{phase===0?"A light. Then… breath.":phase===1?"These hands… I’m alive?":"Choose your class."}</h1><p>{phase===0?"There was silence. Now warmth gathers around a heartbeat you thought was gone.":phase===1?"You raise your arms. A small light hovers near. “Yes, wanderer. You have been given another beginning.”":"“Choose a class. Each has different abilities. You can improve your skills as you gain experience.”"}</p>{phase<2?<button onClick={()=>setPhase(phase+1)}>{phase===0?"Open your eyes":"Follow the light"} →</button>:<><div className="rebirth-choices">{(Object.keys(CLASSES) as ClassName[]).map(cls=><button key={cls} aria-pressed={choice===cls} onClick={()=>setChoice(cls)}>{cls}</button>)}</div><div className="class-potential"><small className="build-identity">{String((Object.keys(CLASSES) as ClassName[]).indexOf(choice)+1).padStart(2,"0")} / FIVE CLASSES</small><h2>{choice}</h2><b>{CLASSES[choice].skill} · {CLASSES[choice].title}</b><p>{CLASSES[choice].description}</p><small>{CLASSES[choice].hp} health · {CLASSES[choice].mp} MP · {CLASSES[choice].dash} dash speed</small></div><button className="preview-ability" onClick={()=>{demoAt.current=performance.now();}}>Demonstrate {CLASSES[choice].skill} ✧</button><button className="rebirth-confirm" onClick={()=>onChoose(choice)}>Be reborn as {choice} →</button></>}</div>{phase<2&&<button className="rebirth-skip" onClick={()=>setPhase(2)}>Skip to builds</button>}</div>;
}



