import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the calendar time-entry workspace", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Calendar Time Entries<\/title>/i);
  assert.match(html, /Suggested Time Entries/);
  assert.match(html, /Manual Entry/);
  assert.match(html, /Salesforce TaskRay Time/);
  assert.match(html, /Copy Salesforce Payload/);
  assert.match(html, /Import to Salesforce/);
  assert.match(html, /Refresh Calendar/);
  assert.match(html, /Suggested entry rules/);
  assert.match(html, /Actions/);
  assert.match(html, /Remove/);
  assert.match(html, /Feature &amp; PC Sync/);
  assert.match(html, /TIME-178790/);
  assert.match(html, /Build -Deployments to PC/);
  assert.match(html, /Crisis24 - OnSolve Migration - \(SOPS\)/);
  assert.match(html, /Kicksaw - Internal Time Tracking/);
  assert.match(html, /2026-07-11/);
  assert.doesNotMatch(html, /Read-only TaskRay Time rows are sorted/);
  assert.doesNotMatch(html, /OOO is no longer suggested as time/);
  assert.doesNotMatch(html, /Project source/);
  assert.doesNotMatch(html, /Calendar Diagnostics/);
});

test("keeps the starter preview out of the production screen", async () => {
  const [page, layout] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(page, /SkeletonPreview|codex-preview|react-loading-skeleton/);
  assert.doesNotMatch(layout, /Starter Project/);
  assert.match(page, /Activity_Type__c/);
  assert.match(page, /TASKRAY__Project__c/);
  assert.match(page, /TASKRAY__Task__c/);
});
