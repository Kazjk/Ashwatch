import test from "node:test";
import assert from "node:assert/strict";
import {readSavedSession,restoreSession} from "../apps/web/app/ashwatch/session-recovery.ts";

const session={id:"test-adventurer",token:"test-credential",room:"ABC123",host:true};
test("saved sessions reject corrupt records and respect a different company invite",()=>{
 assert.deepEqual(readSavedSession(JSON.stringify({...session,extra:"discard"})),session);
 for(const value of [null,"not json","{}",JSON.stringify({...session,token:null}),JSON.stringify({...session,room:"bad"})])assert.equal(readSavedSession(value),null);
 assert.equal(readSavedSession(JSON.stringify(session),"DEF456"),null);
 assert.deepEqual(readSavedSession(JSON.stringify(session),"ABC123"),session);
});

test("network and temporary storage failures retry the same credential with bounded backoff",async()=>{
 const delays:number[]=[],attempts:unknown[]=[],controller=new AbortController();let retries=0;
 const recovered=await restoreSession(session,async s=>{attempts.push({...s});if(attempts.length<7)throw Error(attempts.length%2?"Failed to fetch":"Company storage unavailable");return {selfId:s.id};},controller.signal,()=>retries++,async delay=>{delays.push(delay);});
 assert.equal(recovered.selfId,session.id);assert.equal(retries,6);assert.deepEqual(delays,[250,500,1000,2000,2000,2000]);assert.deepEqual(attempts,Array(7).fill(session));
});

test("confirmed expiry returns immediately and cancellation cannot resume a departed page",async()=>{
 let calls=0;const controller=new AbortController();
 await assert.rejects(restoreSession(session,async()=>{calls++;throw Error("SESSION_EXPIRED");},controller.signal,()=>assert.fail("expiry cannot retry")),/SESSION_EXPIRED/);assert.equal(calls,1);
 const cancelled=new AbortController();
 await assert.rejects(restoreSession(session,async()=>{cancelled.abort();return {selfId:session.id};},cancelled.signal),{name:"AbortError"});
 let pendingCalls=0;const pending=new AbortController();
 const attempt=restoreSession(session,async()=>{pendingCalls++;throw Error("Offline");},pending.signal,()=>pending.abort());
 await assert.rejects(attempt,{name:"AbortError"});assert.equal(pendingCalls,1);
});
