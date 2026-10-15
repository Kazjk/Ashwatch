import test from "node:test";
import assert from "node:assert/strict";
import {roomFromSearch,inviteUrl} from "../apps/web/app/ashwatch/invite.ts";
test("invitations contain a validated public room code, never session credentials",()=>{
 assert.equal(roomFromSearch("?room=abc123"),"ABC123");assert.equal(roomFromSearch("?room=../save"),null);assert.equal(roomFromSearch("?room=ABC1234"),null);assert.equal(roomFromSearch("?token=secret"),null);
 const link=inviteUrl("https://example.com","ABC123");assert.equal(link,"https://example.com/ashwatch?room=ABC123");assert.throws(()=>inviteUrl("https://example.com","bad"));
});
