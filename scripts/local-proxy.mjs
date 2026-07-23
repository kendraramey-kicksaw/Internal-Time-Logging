import { execFile } from "node:child_process";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const TASKRAY_TIME_OBJECT = "TASKRAY__trTaskTime__c";
const DEFAULT_PORT = 8789;
const DEFAULT_ORG_ALIAS = "KicksawProd";
const DEFAULT_API_VERSION = "v67.0";

const port = Number(process.env.LOCAL_PROXY_PORT ?? DEFAULT_PORT);
const orgAlias = process.env.SF_ORG_ALIAS ?? DEFAULT_ORG_ALIAS;
const apiVersion = process.env.SALESFORCE_API_VERSION ?? DEFAULT_API_VERSION;
const calendarFile = resolve(process.env.LOCAL_CALENDAR_EVENTS_FILE ?? ".local/calendar-events.json");

let cachedOrg = null;
let cachedUserId = null;

const server = createServer(async (request, response) => {
  if (!request.url) return sendJson(response, 400, { error: "Missing request URL." });

  const url = new URL(request.url, `http://${request.headers.host ?? `127.0.0.1:${port}`}`);

  if (request.method === "OPTIONS") {
    return sendEmpty(response, 204);
  }

  try {
    if (url.pathname === "/api/integrations/status" && request.method === "GET") {
      return sendJson(response, 200, await integrationStatus());
    }

    if (url.pathname === "/api/integrations/disconnect" && request.method === "POST") {
      const result = disconnectIntegration(url);
      return sendJson(response, result.ok ? 200 : 400, result);
    }

    if (url.pathname === "/api/calendar/events" && request.method === "GET") {
      return sendJson(response, 200, calendarEvents(url));
    }

    if (url.pathname === "/api/salesforce/time-entries" && request.method === "GET") {
      return sendJson(response, 200, await salesforceTimeEntries(url));
    }

    if (url.pathname === "/api/salesforce/time-entries" && request.method === "POST") {
      const records = await readJsonBody(request);
      return sendJson(response, 201, await createSalesforceTimeEntries(records));
    }

    return sendJson(response, 404, { error: "Local proxy route not found." });
  } catch (error) {
    return sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Local proxy request failed.",
    });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Local Time Logging proxy listening on http://127.0.0.1:${port}`);
  console.log(`Using Salesforce CLI org alias: ${orgAlias}`);
  console.log(`Using calendar event file: ${calendarFile}`);
});

async function integrationStatus() {
  const salesforce = await getSalesforceOrg().then(
    (org) => ({ connected: true, username: org.username }),
    () => ({ connected: false, username: null }),
  );

  return {
    user: {
      email: salesforce.username ?? "local-user",
      name: salesforce.username ?? "Local user",
    },
    providers: {
      google: {
        configured: false,
        connected: existsSync(calendarFile),
        localFile: calendarFile,
      },
      salesforce: {
        configured: false,
        connected: salesforce.connected,
        fallbackConfigured: salesforce.connected,
        username: salesforce.username,
      },
    },
  };
}

function disconnectIntegration(url) {
  const provider = url.searchParams.get("provider");

  if (provider === "google") {
    if (existsSync(calendarFile)) unlinkSync(calendarFile);
    return { ok: true };
  }

  if (provider === "salesforce") {
    return {
      ok: false,
      error: `To disconnect Salesforce locally, run: sf org logout --target-org ${orgAlias}`,
    };
  }

  return { ok: false, error: "Provider must be google or salesforce." };
}

function calendarEvents(url) {
  if (!existsSync(calendarFile)) {
    return {
      records: [],
      warning: `Calendar event file not found: ${calendarFile}`,
    };
  }

  const raw = JSON.parse(readFileSync(calendarFile, "utf8"));
  const records = Array.isArray(raw) ? raw : raw.records ?? [];
  const start = safeDate(url.searchParams.get("start"));
  const end = safeDate(url.searchParams.get("end"));

  return {
    records: records.filter((event) => {
      const eventDate = String(event.start ?? "").slice(0, 10);
      return !start || !end || (eventDate >= start && eventDate <= end);
    }),
  };
}

async function salesforceTimeEntries(url) {
  const start = safeDate(url.searchParams.get("start"));
  const end = safeDate(url.searchParams.get("end"));
  if (!start || !end) throw new Error("Start and end dates are required.");

  const ownerId = await getSalesforceUserId();
  const query = [
    "SELECT Id, Name, TASKRAY__Date__c, TASKRAY__Project__c, TASKRAY__Project__r.Name,",
    "TASKRAY__Hours__c, TASKRAY__Billable__c, Activity_Type__c, TASKRAY__trTimeType__c,",
    "Notes__c, Category__c",
    `FROM ${TASKRAY_TIME_OBJECT}`,
    `WHERE TASKRAY__Owner__c = '${ownerId}'`,
    `AND TASKRAY__Date__c >= ${start}`,
    `AND TASKRAY__Date__c <= ${end}`,
    "ORDER BY TASKRAY__Date__c DESC, TASKRAY__Project__r.Name ASC, Activity_Type__c ASC",
  ].join(" ");

  const data = await salesforceRest(`/services/data/${apiVersion}/query?q=${encodeURIComponent(query)}`);

  return {
    records: (data.records ?? []).map((record) => ({
      id: record.Id,
      recordId: record.Id,
      recordName: record.Name,
      date: record.TASKRAY__Date__c,
      projectValue: record.TASKRAY__Project__c,
      projectLabel: record.TASKRAY__Project__r?.Name ?? record.TASKRAY__Project__c,
      hours: record.TASKRAY__Hours__c,
      billable: record.TASKRAY__Billable__c,
      activityType: record.Activity_Type__c ?? "",
      notes: record.Notes__c ?? "",
      category: record.Category__c ?? "",
      timeType: record.TASKRAY__trTimeType__c ?? "",
    })),
  };
}

async function createSalesforceTimeEntries(records) {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("At least one time entry is required.");
  }

  const ownerId = await getSalesforceUserId();
  const ownedRecords = records.map((record) =>
    record && typeof record === "object"
      ? { ...record, TASKRAY__Owner__c: ownerId }
      : record,
  );

  return salesforceRest(`/services/data/${apiVersion}/composite/sobjects`, {
    method: "POST",
    body: JSON.stringify({
      allOrNone: true,
      records: ownedRecords,
    }),
  });
}

async function getSalesforceOrg() {
  if (cachedOrg) return cachedOrg;

  const { stdout } = await execFileAsync("sf", ["org", "display", "--target-org", orgAlias, "--json"], {
    maxBuffer: 10 * 1024 * 1024,
  });
  const parsed = JSON.parse(stdout);
  if (parsed.status !== 0 || !parsed.result?.accessToken || !parsed.result?.instanceUrl) {
    throw new Error(`Salesforce CLI org ${orgAlias} is not authenticated.`);
  }

  cachedOrg = parsed.result;
  return cachedOrg;
}

async function getSalesforceUserId() {
  if (cachedUserId) return cachedUserId;

  const org = await getSalesforceOrg();
  const query = `SELECT Id FROM User WHERE Username = '${escapeSoql(org.username)}' LIMIT 1`;
  const data = await salesforceRest(`/services/data/${apiVersion}/query?q=${encodeURIComponent(query)}`);
  const userId = data.records?.[0]?.Id;
  if (!userId) throw new Error(`Could not resolve Salesforce User Id for ${org.username}.`);

  cachedUserId = userId;
  return cachedUserId;
}

async function salesforceRest(path, init = {}) {
  const org = await getSalesforceOrg();
  const response = await fetch(`${org.instanceUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${org.accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.[0]?.message ?? data?.message ?? data?.error_description ?? "Salesforce request failed.");
  }

  return data;
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : null;
}

function safeDate(value) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function escapeSoql(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function sendEmpty(response, status) {
  response.writeHead(status, corsHeaders());
  response.end();
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    ...corsHeaders(),
    "Content-Type": "application/json",
  });
  response.end(JSON.stringify(body));
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Origin": "http://localhost:3000",
    Vary: "Origin",
  };
}
