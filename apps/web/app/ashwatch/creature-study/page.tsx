"use client";
import {useEffect,useRef,useState} from "react";
import {Scene} from "../scene3d";
import {LivingWorld,NEST} from "../world";
export default function CreatureStudy(){
 const canvas=useRef<HTMLCanvasElement>(null),mode=useRef(false),angle=useRef(.3),[awake,setAwake]=useState(false);
 useEffect(()=>{if(!canvas.current)return;const scene=new Scene(canvas.current),world=new LivingWorld();const session=world.enter("Art review","Knight"),p=world.heroes.get(session.id)!;let frame=0;
  const render=()=>{const a=angle.current;p.x=NEST.x+Math.sin(a)*290;p.y=NEST.y+Math.cos(a)*290;p.facing=Math.atan2(NEST.y-p.y,NEST.x-p.x);p.awareness=100;p.lastSeen=Date.now();world.dragon.state=mode.current?"enraged":"sleeping";const view=world.snapshot(session.id,session.token);view.dragon={...world.dragon,...NEST,attackAt:0};scene.draw(canvas.current!,Object.assign(view,{received:Date.now()}),Date.now());frame=requestAnimationFrame(render);};render();return()=>{cancelAnimationFrame(frame);scene.dispose();};
 },[]);
 return <main style={{position:"fixed",inset:0,background:"#9baaa3"}}><canvas ref={canvas} style={{width:"100%",height:"100%"}} aria-label="Rebuilt dragon model preview"/><section style={{position:"absolute",top:20,left:20,padding:20,background:"#15251fd9",color:"#eee0bc",fontFamily:"Georgia"}}><small>CREATURE ART REVIEW · NOT A LIVE ENCOUNTER</small><h1>Vaelthorn</h1><button onClick={()=>{mode.current=!mode.current;setAwake(mode.current);}}>{awake?"Show sleeping pose":"Show awakened pose"}</button> <button onClick={()=>angle.current-=.45}>View left</button> <button onClick={()=>angle.current+=.45}>View right</button> <a href="/ashwatch" style={{color:"#eed49e"}}>Return to game</a></section></main>;
}
