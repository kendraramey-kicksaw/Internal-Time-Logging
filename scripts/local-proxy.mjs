import { execFile } from "node:child_process";
import { existsSync, readFileSync, statSync, unlinkSync } from "node:fs";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const TASKRAY_TIME_OBJECT = "TASKRAY__trTaskTime__c";
const CLIENT_TASK_RECORD_TYPE_ID = "012Qh0000015yz3IAA";
const DEFAULT_PORT = 8789;
const DEFAULT_ORG_ALIAS = "KicksawProd";
const DEFAULT_API_VERSION = "v67.0";
const DELIVERY_TEAMS = new Set(["AOD", "SOPS", "COPS", "MOPS", "Engineering"]);
const INTERNAL_PROJECT = {
  id: "a0uQh000007aLujIAE",
  label: "Kicksaw - Internal Time Tracking",
  idPricingStructure: "a0uQh000007aLujIAE-Internal",
  pricingStructure: "Internal",
  taskId: "a0tQh00000pNVP9IAO",
};
const BLANK_PROJECT = {
  id: "",
  label: "",
  idPricingStructure: "",
  pricingStructure: "Capacity",
};

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

    if (url.pathname === "/api/app/update-status" && request.method === "GET") {
      return sendJson(response, 200, await appUpdateStatus());
    }

    if (url.pathname === "/api/app/update" && request.method === "POST") {
      return sendJson(response, 200, await updateApp());
    }

    if (url.pathname === "/api/calendar/events" && request.method === "GET") {
      return sendJson(response, 200, await calendarEvents(url));
    }

    if (url.pathname === "/api/salesforce/time-entries" && request.method === "GET") {
      return sendJson(response, 200, await salesforceTimeEntries(url));
    }

    if (url.pathname.startsWith("/api/salesforce/time-entries/") && request.method === "DELETE") {
      const result = await deleteSalesforceTimeEntry(url.pathname);
      return sendJson(response, result.status ?? 200, result);
    }

    if (url.pathname === "/api/salesforce/projects" && request.method === "GET") {
      return sendJson(response, 200, await salesforceProjects(url));
    }

    if (url.pathname === "/api/salesforce/time-entries" && request.method === "POST") {
      const records = await readJsonBody(request);
      return sendJson(response, 201, await createSalesforceTimeEntries(records));
    }

    return sendJson(response, 404, { error: "Local proxy route not found." });
  } catch (error) {
    return sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Local proxy request failed.",
      details: error?.details,
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
    (org) => ({
      connected: true,
      instanceUrl: org.instanceUrl,
      orgAlias,
      username: org.username,
    }),
    () => ({ connected: false, instanceUrl: null, orgAlias, username: null }),
  );
  const calendarInfo = calendarFileInfo();

  return {
    user: {
      email: salesforce.username ?? "local-user",
      name: salesforce.username ?? "Local user",
    },
    providers: {
      google: {
        configured: false,
        connected: calendarInfo.exists,
        email: salesforce.username,
        localFile: calendarFile,
        lastSyncedAt: calendarInfo.lastSyncedAt,
      },
      salesforce: {
        configured: false,
        connected: salesforce.connected,
        fallbackConfigured: salesforce.connected,
        instanceUrl: salesforce.instanceUrl,
        orgAlias: salesforce.orgAlias,
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

async function appUpdateStatus() {
  const status = await gitUpdateStatus();
  return {
    ...status,
    local: true,
  };
}

async function updateApp() {
  const status = await gitUpdateStatus();
  if (!status.gitAvailable) throw new Error(status.message ?? "Git is not available for updates.");
  if (status.dirty) throw new Error("Local changes are present. Commit or stash them before updating.");
  if (!status.updateAvailable) {
    return {
      ...status,
      local: true,
      message: "App is already up to date.",
    };
  }

  await execFileAsync("git", ["pull", "--ff-only", "origin", "main"], {
    cwd: process.cwd(),
    maxBuffer: 20 * 1024 * 1024,
  });
  await execFileAsync("npm", ["install"], {
    cwd: process.cwd(),
    maxBuffer: 30 * 1024 * 1024,
  });

  return {
    ...(await gitUpdateStatus()),
    local: true,
    message: "Update installed. Restart the local proxy and dev server if the app does not refresh automatically.",
  };
}

async function gitUpdateStatus() {
  try {
    await execFileAsync("git", ["rev-parse", "--is-inside-work-tree"], { cwd: process.cwd() });
  } catch {
    return {
      gitAvailable: false,
      updateAvailable: false,
      dirty: false,
      message: "This folder is not a Git repository.",
    };
  }

  await execFileAsync("git", ["fetch", "origin", "main"], {
    cwd: process.cwd(),
    maxBuffer: 10 * 1024 * 1024,
  }).catch(() => null);

  const [head, upstream, dirty] = await Promise.all([
    gitText(["rev-parse", "HEAD"]),
    gitText(["rev-parse", "origin/main"]),
    gitText(["status", "--porcelain"]),
  ]);
  const canFastForward = head && upstream ? await gitExitOk(["merge-base", "--is-ancestor", head, upstream]) : false;

  return {
    gitAvailable: true,
    current: head,
    latest: upstream,
    dirty: Boolean(dirty),
    updateAvailable: Boolean(head && upstream && head !== upstream && canFastForward),
    message:
      head && upstream && head !== upstream && !canFastForward
        ? "Local branch has diverged from origin/main. Pull manually in Git."
        : undefined,
  };
}

async function gitText(args) {
  const { stdout } = await execFileAsync("git", args, {
    cwd: process.cwd(),
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout.trim();
}

async function gitExitOk(args) {
  try {
    await execFileAsync("git", args, { cwd: process.cwd() });
    return true;
  } catch {
    return false;
  }
}

async function calendarEvents(url) {
  const calendarInfo = calendarFileInfo();
  if (!calendarInfo.exists) {
    return {
      records: [],
      warning: `Calendar event file not found: ${calendarFile}`,
      localFile: calendarFile,
      lastSyncedAt: null,
    };
  }

  const raw = JSON.parse(readFileSync(calendarFile, "utf8"));
  const records = Array.isArray(raw) ? raw : raw.records ?? [];
  const start = safeDate(url.searchParams.get("start"));
  const end = safeDate(url.searchParams.get("end"));
  const deliveryTeam = deliveryTeamFromUrl(url);

  return {
    localFile: calendarFile,
    lastSyncedAt: calendarInfo.lastSyncedAt,
    records: await Promise.all(
      records
        .filter((event) => {
          const eventDate = String(event.start ?? "").slice(0, 10);
          return !start || !end || (eventDate >= start && eventDate <= end);
        })
        .map((event) => normalizeLocalCalendarEvent(event, deliveryTeam)),
    ),
  };
}

function calendarFileInfo() {
  if (!existsSync(calendarFile)) {
    return {
      exists: false,
      lastSyncedAt: null,
    };
  }

  return {
    exists: true,
    lastSyncedAt: statSync(calendarFile).mtime.toISOString(),
  };
}

async function salesforceProjects(url) {
  const deliveryTeam = deliveryTeamFromUrl(url);
  return {
    records: await querySalesforceProjects(deliveryTeam),
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

async function normalizeLocalCalendarEvent(event, deliveryTeam) {
  const title = String(event.title ?? event.summary ?? "").trim();
  const eventDate = String(event.start ?? "").slice(0, 10);
  const project = await projectForCalendarEvent(event, deliveryTeam, eventDate);

  return {
    ...event,
    title,
    project,
    billable: project.id !== INTERNAL_PROJECT.id && Boolean(event.billable ?? true),
  };
}

async function projectForCalendarEvent(event, deliveryTeam, eventDate) {
  if (isInternalCalendarEvent(event)) return INTERNAL_PROJECT;

  const domains = externalAttendeeDomains(event);
  if (domains.length) {
    return (await matchProjectByDomains(domains, deliveryTeam, eventDate)) ?? BLANK_PROJECT;
  }

  const providedProject = normalizeProject(event.project);
  return providedProject && projectIsNamedInEventTitle(providedProject, event) ? providedProject : BLANK_PROJECT;
}

async function matchProjectByDomains(domains, deliveryTeam, eventDate) {
  const projects = await querySalesforceProjects(deliveryTeam, eventDate);
  return projects.find((project) =>
    project.websiteDomain && domains.some((domain) => domainsMatch(project.websiteDomain, domain)),
  );
}

async function querySalesforceProjects(deliveryTeam, eventDate) {
  const filters = [
    "TASKRAY__Status__c = false",
    "TASKRAY__trTemplate__c = false",
    "Parent_Project__c = false",
    `Delivery_Team__c = '${escapeSoql(deliveryTeam)}'`,
  ];

  if (eventDate) {
    filters.push(`(OfficialStartDate__c = null OR OfficialStartDate__c <= ${eventDate})`);
  }

  const query = [
    "SELECT Id, Name, Id_Pricing_Structure__c, TASKRAY__trAccount__r.Website, Delivery_Team__c",
    "FROM TASKRAY__Project__c",
    `WHERE ${filters.join(" AND ")}`,
    "ORDER BY Name ASC",
  ].join(" ");
  const data = await salesforceRest(`/services/data/${apiVersion}/query?q=${encodeURIComponent(query)}`);
  const projects = (data.records ?? []).map((record) => normalizeProject({
    id: record.Id,
    label: record.Name,
    idPricingStructure: record.Id_Pricing_Structure__c,
    website: record.TASKRAY__trAccount__r?.Website,
    deliveryTeam: record.Delivery_Team__c,
  })).filter(Boolean);
  const taskIds = await taskIdsForProjects(projects.map((project) => project.id));

  return [INTERNAL_PROJECT, ...projects.map((project) => ({
    ...project,
    taskId: taskIds[project.id],
  }))];
}

async function taskIdsForProjects(projectIds) {
  if (!projectIds.length) return {};
  const quotedIds = projectIds.map((id) => `'${escapeSoql(id)}'`).join(",");
  const query = [
    "SELECT Id, TASKRAY__Project__c",
    "FROM TASKRAY__Project_Task__c",
    `WHERE RecordTypeId = '${CLIENT_TASK_RECORD_TYPE_ID}'`,
    "AND TASKRAY__Archived__c = false",
    `AND TASKRAY__Project__c IN (${quotedIds})`,
  ].join(" ");
  const data = await salesforceRest(`/services/data/${apiVersion}/query?q=${encodeURIComponent(query)}`);

  return Object.fromEntries((data.records ?? []).map((record) => [record.TASKRAY__Project__c, record.Id]));
}

function normalizeProject(project) {
  if (!project?.id && !project?.Id) return null;
  const id = String(project.id ?? project.Id);
  const label = String(project.label ?? project.Name ?? "");
  const idPricingStructure = String(project.idPricingStructure ?? project.Id_Pricing_Structure__c ?? `${id}-Capacity`);
  const pricingStructure = idPricingStructure.split("-").at(-1) || project.pricingStructure || "Capacity";

  return {
    id,
    label,
    idPricingStructure,
    pricingStructure,
    taskId: project.taskId,
    deliveryTeam: project.deliveryTeam,
    websiteDomain: websiteDomain(project.website ?? project.Website ?? project.TASKRAY__trAccount__r?.Website),
  };
}

function projectIsNamedInEventTitle(project, event) {
  const title = normalizedSearchText(event.title ?? event.summary ?? "");
  return projectKeywords(project.label).some((keyword) => title.includes(keyword));
}

function projectKeywords(label) {
  const ignored = new Set([
    "aod",
    "boh",
    "capacity",
    "client",
    "cops",
    "eops",
    "engineering",
    "eng",
    "implementation",
    "internal",
    "jumpstart",
    "managed",
    "migration",
    "mops",
    "project",
    "restart",
    "salesforce",
    "sops",
    "support",
    "services",
  ]);
  return Array.from(new Set(normalizedSearchText(label).split(" ")))
    .filter((keyword) => keyword.length >= 4 && !ignored.has(keyword));
}

function normalizedSearchText(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function isInternalCalendarEvent(event) {
  const title = String(event.title ?? event.summary ?? "").toLowerCase();
  return (
    title.includes("all hands") ||
    title.includes("team lunch") ||
    title.includes("values in action") ||
    title.includes("salesforce user group") ||
    title.includes("delivery ai lounge") ||
    title.includes("hangout") ||
    title.includes("workshop") ||
    title.includes("kendra / dj") ||
    title.includes("kendra/dj") ||
    title.includes("dj / kendra") ||
    title.includes("dj/kendra")
  );
}

function externalAttendeeDomains(event) {
  const attendees = Array.isArray(event.attendees)
    ? event.attendees
    : Array.isArray(event.attendeeEmails)
      ? event.attendeeEmails.map((email) => ({ email }))
      : [];

  return Array.from(new Set(attendees
    .map((attendee) => String(attendee.email ?? attendee).toLowerCase())
    .map((email) => email.split("@").at(-1) ?? "")
    .map(normalizeDomain)
    .filter((domain) => domain && domain !== "kicksaw.com")));
}

function websiteDomain(value) {
  if (!value) return "";
  try {
    return normalizeDomain(new URL(String(value).includes("://") ? String(value) : `https://${value}`).hostname);
  } catch {
    return normalizeDomain(String(value).replace(/^https?:\/\//, "").split("/")[0] ?? "");
  }
}

function normalizeDomain(value) {
  return String(value).trim().toLowerCase().replace(/^www\./, "");
}

function domainsMatch(website, attendee) {
  return website === attendee || website.endsWith(`.${attendee}`) || attendee.endsWith(`.${website}`);
}

function deliveryTeamFromUrl(url) {
  const requested = url.searchParams.get("deliveryTeam") ?? "SOPS";
  return DELIVERY_TEAMS.has(requested) ? requested : "SOPS";
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

  const result = await salesforceRest(`/services/data/${apiVersion}/composite/sobjects`, {
    method: "POST",
    body: JSON.stringify({
      allOrNone: true,
      records: ownedRecords,
    }),
  });

  const failedResults = Array.isArray(result) ? result.filter((item) => !item?.success) : [];
  if (failedResults.length > 0) {
    const messages = failedResults
      .flatMap((item, index) =>
        (item.errors ?? []).map((error) => {
          const fields = Array.isArray(error.fields) && error.fields.length ? ` (${error.fields.join(", ")})` : "";
          return `Row ${index + 1}: ${error.message ?? error.statusCode ?? "Salesforce row failed."}${fields}`;
        }),
      )
      .filter(Boolean);

    const error = new Error(messages.join(" ") || "Salesforce rejected one or more time entries.");
    error.details = failedResults;
    throw error;
  }

  return {
    records: result,
    createdCount: Array.isArray(result) ? result.filter((item) => item?.success).length : 0,
  };
}

async function deleteSalesforceTimeEntry(pathname) {
  const recordId = decodeURIComponent(pathname.split("/").pop() ?? "");
  if (!isSalesforceId(recordId)) {
    return { error: "A valid Salesforce time entry Id is required.", status: 400 };
  }

  await salesforceRest(`/services/data/${apiVersion}/sobjects/${TASKRAY_TIME_OBJECT}/${recordId}`, {
    method: "DELETE",
  });

  return { deleted: true, recordId };
}

function isSalesforceId(value) {
  return /^[a-zA-Z0-9]{15,18}$/.test(value);
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
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Origin": "*",
  };
}
