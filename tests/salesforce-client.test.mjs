import assert from "node:assert/strict";
import test from "node:test";

import { createSalesforceClient } from "../scripts/salesforce-client.mjs";

const ORG = {
  status: 0,
  result: {
    accessToken: "[REDACTED] Use 'sf org auth show-access-token' to view",
    instanceUrl: "https://example.my.salesforce.com",
    username: "user@example.com",
    unusedField: "not cached",
  },
};

function jsonResult(body) {
  return { stdout: JSON.stringify(body), stderr: "" };
}

test("shares one concurrent CLI lookup and caches only connection fields", async () => {
  const calls = [];
  const client = createSalesforceClient({
    orgAlias: "test-org",
    execute: async (_command, args, options) => {
      calls.push({ args, options });
      return args[1] === "display"
        ? jsonResult(ORG)
        : jsonResult({ status: 0, result: { accessToken: "fresh-token" } });
    },
  });

  const [first, second, third] = await Promise.all([client.getOrg(), client.getOrg(), client.getOrg()]);

  assert.equal(calls.length, 2);
  assert.deepEqual(first, {
    accessToken: "fresh-token",
    instanceUrl: "https://example.my.salesforce.com",
    username: "user@example.com",
  });
  assert.deepEqual(second, first);
  assert.deepEqual(third, first);
  assert.equal(calls[0].options.timeout, 15_000);
});

test("turns CLI failures into actionable reauthentication guidance", async () => {
  const warnings = [];
  const client = createSalesforceClient({
    orgAlias: "test-org",
    logger: { warn: (message) => warnings.push(message) },
    execute: async () => {
      throw new Error("Command failed");
    },
  });

  await assert.rejects(
    client.getOrg(),
    /Salesforce CLI org test-org is not authenticated\. Run: sf org login web --alias test-org\./,
  );
  assert.deepEqual(warnings, ["Salesforce CLI authentication failed for org test-org."]);
});

test("rejects a token returned with the CLI stale-token warning", async () => {
  const client = createSalesforceClient({
    orgAlias: "test-org",
    logger: { warn() {} },
    execute: async (_command, args) =>
      args[1] === "display"
        ? jsonResult(ORG)
        : jsonResult({
            status: 0,
            result: { accessToken: "stale-token" },
            warnings: ["Unable to refresh auth for org. Access token may be stale."],
          }),
  });

  await assert.rejects(client.getOrg(), /Salesforce CLI org test-org could not refresh its access token\./);
});

test("clears credentials after a 401 and retries once with a refreshed token", async () => {
  let tokenCalls = 0;
  const authorizationHeaders = [];
  const client = createSalesforceClient({
    orgAlias: "test-org",
    execute: async (_command, args) => {
      if (args[1] === "display") return jsonResult(ORG);
      tokenCalls += 1;
      return jsonResult({ status: 0, result: { accessToken: `token-${tokenCalls}` } });
    },
    fetch: async (_url, init) => {
      authorizationHeaders.push(init.headers.Authorization);
      return authorizationHeaders.length === 1
        ? new Response(JSON.stringify([{ message: "Session expired" }]), { status: 401 })
        : new Response(JSON.stringify({ records: [] }), { status: 200 });
    },
  });

  const result = await client.rest("/services/data/v67.0/query?q=SELECT%20Id");

  assert.deepEqual(result, { records: [] });
  assert.deepEqual(authorizationHeaders, ["Bearer token-1", "Bearer token-2"]);
  assert.equal(tokenCalls, 2);
});
