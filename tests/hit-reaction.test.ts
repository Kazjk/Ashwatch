import test from "node:test";
import assert from "node:assert/strict";
import {hitRecoil} from "../apps/web/app/ashwatch/hit-reaction.ts";

test("confirmed hit recoil has one bounded lobe, settles exactly and respects reduced motion",()=>{
 for(const t of [-1,0,180,500])assert.equal(hitRecoil(1000+t,1000),0);
 const samples=Array.from({length:19},(_,i)=>hitRecoil(1000+i*10,1000));
 assert.ok(samples.some(x=>x>.05));assert.ok(samples.every(x=>x>=0&&x<.14));
 const peak=samples.indexOf(Math.max(...samples));assert.ok(samples.slice(0,peak).every((x,i)=>x<=samples[i+1]));assert.ok(samples.slice(peak).every((x,i)=>!i||x<=samples[peak+i-1]));
 assert.equal(hitRecoil(1050,1000,true),0);assert.equal(hitRecoil(1050,undefined),0);
});
