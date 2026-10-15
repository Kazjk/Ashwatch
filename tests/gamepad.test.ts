import test from "node:test";
import assert from "node:assert/strict";
import {GamepadInput} from "../apps/web/app/ashwatch/gamepad.ts";
const pad=()=>({index:0,connected:true,mapping:"standard",axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false}))});
test("controller filters drift and turns consistently across frame rates and sensitivities",()=>{
 const p=pad(),input=new GamepadInput();input.sample(p,true,.65,.01);
 p.axes=[.1,.1,.1,0];assert.equal(input.sample(p,true,.65,.01).turn,0);
 p.axes=[1,1,1,0];const slow=input.sample(p,true,.2,1/30),fast=input.sample(p,true,1.8,1/120);
 assert.ok(Math.abs(Math.hypot(slow.x,slow.y)-1)<1e-9);
 assert.ok(Math.abs(slow.turn*30*9-fast.turn*120)<1e-9);
 p.mapping="unknown";assert.equal(input.sample(p,true,.65,.01).x,0);
});
test("controller buttons use edges and cannot carry combat across menus or disconnects",()=>{
 const p=pad(),input=new GamepadInput();input.sample(p,true,.65,.01);
 p.buttons[3].pressed=true;assert.equal(input.sample(p,true,.65,.01).skill,true);assert.equal(input.sample(p,true,.65,.01).skill,false);
 input.sample(p,false,.65,.01);p.buttons[2].pressed=true;
 assert.equal(input.sample(p,true,.65,.01).attack,false);
 p.buttons[2].pressed=p.buttons[3].pressed=false;input.sample(p,true,.65,.01);
 p.buttons[2].pressed=true;assert.equal(input.sample(p,true,.65,.01).attack,true);
 assert.equal(input.sample(null,true,.65,.01).attack,false);
 assert.equal(input.sample(p,true,.65,.01).attack,false);
 p.buttons[9].pressed=true;assert.equal(input.sample(p,false,.65,.01).menu,true);
 assert.equal(input.sample(p,false,.65,.01).menu,false);
});

test("controller cover calls use the right shoulder edge and cannot carry across a menu",()=>{
 const p=pad(),input=new GamepadInput();input.sample(p,true,.65,.01);p.buttons[5].pressed=true;
 assert.equal(input.sample(p,true,.65,.01).warn,true);assert.equal(input.sample(p,true,.65,.01).warn,false);
 input.sample(p,false,.65,.01);assert.equal(input.sample(p,true,.65,.01).warn,false);
 p.buttons[5].pressed=false;input.sample(p,true,.65,.01);p.buttons[5].pressed=true;assert.equal(input.sample(p,true,.65,.01).warn,true);
});
