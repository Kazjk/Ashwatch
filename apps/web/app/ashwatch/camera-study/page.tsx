"use client";
import {useEffect,useRef,useState} from "react";
import {Scene} from "../scene3d";
import {LivingWorld} from "../world";
import {DEFAULTS} from "../controls";

// Renderer fixtures only. No live session, network actions, or gameplay shortcuts.
export default function CameraStudy(){
 const canvas=useRef<HTMLCanvasElement>(null);
 const [awareness,setAwareness]=useState(0),[place,setPlace]=useState("village"),[heading,setHeading]=useState(-1.1),[performanceMode,setPerformanceMode]=useState(false);
 useEffect(()=>{
  if(!canvas.current)return;
  const world=new LivingWorld(()=>100000),session=world.enter("Camera fixture","Knight"),hero=world.heroes.get(session.id)!;
  hero.awareness=awareness;hero.facing=heading;
  if(place==="wall"){hero.floor=1;hero.x=675;hero.y=1100;}
  if(place==="archive"){hero.floor=5;hero.x=1200;hero.y=1100;}
  if(place==="combat"){hero.floor=10;hero.x=1200;hero.y=1200;}
  const view=Object.assign(world.snapshot(session.id,session.token),{received:Date.now()});
  const scene=new Scene(canvas.current);scene.setPreferences(DEFAULTS);scene.setQuality(performanceMode);
  let frame=0;
  const draw=()=>{scene.draw(canvas.current!,view,Date.now());frame=requestAnimationFrame(draw);};draw();
  return()=>{cancelAnimationFrame(frame);scene.dispose();};
 },[awareness,place,heading,performanceMode]);
 return <main style={{height:"100dvh",background:"#14201f",color:"#fff",fontFamily:"system-ui"}}>
  <canvas ref={canvas} style={{width:"100%",height:"100%",display:"block"}} aria-label="Camera validation scene"/>
  <section style={{position:"absolute",top:12,left:12,right:12,background:"#172524ee",padding:12,maxWidth:640,display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
   <strong>Camera fixtures · no live adventure</strong>
   <label>Awareness <select aria-label="Fixture Awareness" value={awareness} onChange={e=>setAwareness(Number(e.target.value))}><option value={0}>0 · low</option><option value={50}>50 · intermediate</option><option value={100}>100 · high</option></select></label>
   <label>Scene <select aria-label="Fixture scene" value={place} onChange={e=>setPlace(e.target.value)}><option value="village">Village</option><option value="wall">Dungeon wall</option><option value="archive">Archive obstacles</option><option value="combat">Final-depth enemies</option></select></label>
   <button onClick={()=>setHeading(h=>h-Math.PI/4)}>Turn left 45°</button><button onClick={()=>setHeading(h=>h+Math.PI/4)}>Turn right 45°</button>
   <button onClick={()=>setPerformanceMode(v=>!v)}>Graphics: {performanceMode?"Performance":"Full"}</button><a href="/ashwatch" style={{color:"#f8d899"}}>Play Ashwatch</a>
  </section>
 </main>;
}
