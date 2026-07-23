/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  SALESFORCE_ACCESS_TOKEN?: string;
  SALESFORCE_API_VERSION?: string;
  SALESFORCE_INSTANCE_URL?: string;
  GOOGLE_CALENDAR_ACCESS_TOKEN?: string;
  GOOGLE_CALENDAR_ID?: string;
  GOOGLE_CALENDAR_TIMEZONE?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const TASKRAY_TIME_OBJECT = "TASKRAY__trTaskTime__c";
const TASKRAY_TIME_OWNER_ID = "0054T000001in8HQAQ";
const DEFAULT_SALESFORCE_API_VERSION = "v67.0";
const DEFAULT_GOOGLE_CALENDAR_ID = "primary";
const DEFAULT_GOOGLE_CALENDAR_TIMEZONE = "America/Toronto";
const CRISIS_PROJECT = {
  id: "a0uQh000004SaXhIAK",
  label: "Crisis24 - OnSolve Migration - (SOPS)",
  idPricingStructure: "a0uQh000004SaXhIAK-Capacity",
  pricingStructure: "Capacity",
  taskId: "a0tQh00000pN8R9IAK",
};
const INTERNAL_PROJECT = {
  id: "a0uQh000007aLujIAE",
  label: "Kicksaw - Internal Time Tracking",
  idPricingStructure: "a0uQh000007aLujIAE-Internal",
  pricingStructure: "Internal",
  taskId: "a0tQh00000pNVP9IAO",
};

type SalesforceTimeRecord = {
  Id: string;
  Name: string;
  TASKRAY__Date__c: string;
  TASKRAY__Project__c: string;
  TASKRAY__Project__r?: { Name?: string };
  TASKRAY__Hours__c: number;
  TASKRAY__Billable__c: boolean;
  Activity_Type__c?: string;
  TASKRAY__trTimeType__c?: string;
  Notes__c?: string;
  Category__c?: string;
};

type SalesforceQueryResponse = {
  records: SalesforceTimeRecord[];
};

type SalesforceCompositeResult = Array<{
  id?: string;
  success: boolean;
  errors?: Array<{
    fields?: string[];
    message: string;
    statusCode: string;
  }>;
}>;

type GoogleCalendarEvent = {
  id: string;
  summary?: string;
  description?: string;
  status?: string;
  transparency?: string;
  eventType?: string;
  start?: {
    date?: string;
    dateTime?: string;
  };
  end?: {
    date?: string;
    dateTime?: string;
  };
  attendees?: Array<{
    email?: string;
    resource?: boolean;
    responseStatus?: string;
    self?: boolean;
  }>;
};

type GoogleCalendarEventsResponse = {
  items?: GoogleCalendarEvent[];
  nextPageToken?: string;
};

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/calendar/events") {
      if (request.method === "GET") return getGoogleCalendarEvents(request, env);
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    if (url.pathname === "/api/salesforce/time-entries") {
      if (request.method === "GET") return getSalesforceTimeEntries(request, env);
      if (request.method === "POST") return createSalesforceTimeEntries(request, env);
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;

async function getSalesforceTimeEntries(request: Request, env?: Env): Promise<Response> {
  const connection = salesforceConnection(env);
  if (!connection) return jsonResponse({ error: "Salesforce connection is not configured." }, 503);

  const url = new URL(request.url);
  const start = safeDate(url.searchParams.get("start"));
  const end = safeDate(url.searchParams.get("end"));
  if (!start || !end) return jsonResponse({ error: "Start and end dates are required." }, 400);

  const query = [
    "SELECT Id, Name, TASKRAY__Date__c, TASKRAY__Project__c, TASKRAY__Project__r.Name,",
    "TASKRAY__Hours__c, TASKRAY__Billable__c, Activity_Type__c, TASKRAY__trTimeType__c,",
    "Notes__c, Category__c",
    `FROM ${TASKRAY_TIME_OBJECT}`,
    `WHERE TASKRAY__Owner__c = '${TASKRAY_TIME_OWNER_ID}'`,
    `AND TASKRAY__Date__c >= ${start}`,
    `AND TASKRAY__Date__c <= ${end}`,
    "ORDER BY TASKRAY__Date__c DESC, TASKRAY__Project__r.Name ASC, Activity_Type__c ASC",
  ].join(" ");

  const response = await salesforceFetch<SalesforceQueryResponse>(
    env,
    `/services/data/${connection.apiVersion}/query?q=${encodeURIComponent(query)}`,
  );
  if (!response.ok) return response.error;

  return jsonResponse({
    records: response.data.records.map((record) => ({
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
  });
}

async function createSalesforceTimeEntries(request: Request, env?: Env): Promise<Response> {
  const connection = salesforceConnection(env);
  if (!connection) return jsonResponse({ error: "Salesforce connection is not configured." }, 503);

  let records: unknown;
  try {
    records = await request.json();
  } catch {
    return jsonResponse({ error: "Request body must be valid JSON." }, 400);
  }

  if (!Array.isArray(records) || records.length === 0) {
    return jsonResponse({ error: "At least one time entry is required." }, 400);
  }

  const response = await salesforceFetch<SalesforceCompositeResult>(
    env,
    `/services/data/${connection.apiVersion}/composite/sobjects`,
    {
      method: "POST",
      body: JSON.stringify({
        allOrNone: true,
        records,
      }),
    },
  );
  if (!response.ok) return response.error;

  if (Array.isArray(response.data) && response.data.some((result) => !result.success)) {
    return jsonResponse(
      {
        error: "Salesforce import failed.",
        details: response.data,
      },
      400,
    );
  }

  return jsonResponse(response.data, 201);
}

async function getGoogleCalendarEvents(request: Request, env?: Env): Promise<Response> {
  const accessToken = env?.GOOGLE_CALENDAR_ACCESS_TOKEN ?? process.env.GOOGLE_CALENDAR_ACCESS_TOKEN;
  if (!accessToken) {
    return jsonResponse({ error: "Google Calendar connection is not configured." }, 503);
  }

  const url = new URL(request.url);
  const start = safeDate(url.searchParams.get("start"));
  const end = safeDate(url.searchParams.get("end"));
  if (!start || !end) return jsonResponse({ error: "Start and end dates are required." }, 400);

  const timezone = env?.GOOGLE_CALENDAR_TIMEZONE ?? process.env.GOOGLE_CALENDAR_TIMEZONE ?? DEFAULT_GOOGLE_CALENDAR_TIMEZONE;
  const calendarId = env?.GOOGLE_CALENDAR_ID ?? process.env.GOOGLE_CALENDAR_ID ?? DEFAULT_GOOGLE_CALENDAR_ID;
  const timeMin = zonedDateBoundaryToUtcIso(start, timezone);
  const timeMax = zonedDateBoundaryToUtcIso(addDaysIso(end, 1), timezone);
  const events: GoogleCalendarEvent[] = [];
  let nextPageToken: string | undefined;

  do {
    const googleUrl = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
    googleUrl.searchParams.set("singleEvents", "true");
    googleUrl.searchParams.set("orderBy", "startTime");
    googleUrl.searchParams.set("timeMin", timeMin);
    googleUrl.searchParams.set("timeMax", timeMax);
    googleUrl.searchParams.set("timeZone", timezone);
    googleUrl.searchParams.set("maxResults", "2500");
    if (nextPageToken) googleUrl.searchParams.set("pageToken", nextPageToken);

    const response = await fetch(googleUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const data = (await response.json().catch(() => ({}))) as GoogleCalendarEventsResponse & { error?: unknown };

    if (!response.ok) {
      return jsonResponse(
        {
          error: "Google Calendar request failed.",
          details: data,
        },
        response.status,
      );
    }

    events.push(...(data.items ?? []));
    nextPageToken = data.nextPageToken;
  } while (nextPageToken);

  return jsonResponse({
    records: events.flatMap((event) => normalizeGoogleCalendarEvent(event)),
  });
}

function salesforceConnection(env?: Env) {
  const instanceUrl = (env?.SALESFORCE_INSTANCE_URL ?? process.env.SALESFORCE_INSTANCE_URL)?.replace(/\/$/, "");
  const accessToken = env?.SALESFORCE_ACCESS_TOKEN ?? process.env.SALESFORCE_ACCESS_TOKEN;
  if (!instanceUrl || !accessToken) return null;

  return {
    accessToken,
    apiVersion: env?.SALESFORCE_API_VERSION ?? process.env.SALESFORCE_API_VERSION ?? DEFAULT_SALESFORCE_API_VERSION,
    instanceUrl,
  };
}

async function salesforceFetch<T>(
  env: Env | undefined,
  path: string,
  init: RequestInit = {},
): Promise<{ ok: true; data: T } | { ok: false; error: Response }> {
  const connection = salesforceConnection(env);
  if (!connection) {
    return { ok: false, error: jsonResponse({ error: "Salesforce connection is not configured." }, 503) };
  }

  const response = await fetch(`${connection.instanceUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${connection.accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      ok: false,
      error: jsonResponse(
        {
          error: "Salesforce request failed.",
          details: data,
        },
        response.status,
      ),
    };
  }

  return { ok: true, data: data as T };
}

function safeDate(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function normalizeGoogleCalendarEvent(event: GoogleCalendarEvent) {
  if (shouldIgnoreGoogleCalendarEvent(event)) return [];

  const title = event.summary?.trim() || "Untitled calendar event";
  const start = event.start?.dateTime ?? (event.start?.date ? `${event.start.date}T00:00:00` : "");
  const end = event.end?.dateTime ?? (event.end?.date ? `${event.end.date}T00:00:00` : "");
  if (!start || !end) return [];

  const classification = classifyGoogleCalendarEvent(event);

  return [
    {
      id: event.id,
      title,
      start,
      end,
      project: classification.project,
      activityType: classification.activityType,
      billable: classification.project.id !== INTERNAL_PROJECT.id,
      responseStatus: selfResponseStatus(event),
      transparency: event.transparency === "transparent" ? "transparent" : "opaque",
    },
  ];
}

function shouldIgnoreGoogleCalendarEvent(event: GoogleCalendarEvent) {
  const title = (event.summary ?? "").toLowerCase();
  const eventType = (event.eventType ?? "").toLowerCase();
  const calendarDescription = (event.description ?? "").toLowerCase();

  return (
    event.status === "cancelled" ||
    selfResponseStatus(event) === "declined" ||
    event.transparency === "transparent" ||
    eventType === "focustime" ||
    eventType === "outofoffice" ||
    eventType === "workinglocation" ||
    title.includes("focus time") ||
    title.includes("ooo") ||
    title.includes("out of office") ||
    title.includes("birthday") ||
    calendarDescription.includes("birthday calendar")
  );
}

function classifyGoogleCalendarEvent(event: GoogleCalendarEvent): {
  activityType: "Meeting" | "Coding and Configuration" | "People and Team Activities";
  project: typeof CRISIS_PROJECT | typeof INTERNAL_PROJECT;
} {
  const title = (event.summary ?? "").toLowerCase();
  const attendeeCount = workAttendeeCount(event);
  const peopleAndTeam =
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
    title.includes("dj/kendra");

  if (peopleAndTeam) {
    return { activityType: "People and Team Activities", project: INTERNAL_PROJECT };
  }

  const looksLikeMeeting =
    attendeeCount > 1 ||
    title.includes("meeting") ||
    title.includes("stand-up") ||
    title.includes("standup") ||
    title.includes("triage") ||
    title.includes("sync") ||
    title.includes("review") ||
    title.includes("check-in") ||
    title.includes("chat") ||
    title.includes("call") ||
    title.includes("huddle") ||
    title.includes("1:1");

  return {
    activityType: looksLikeMeeting ? "Meeting" : "Coding and Configuration",
    project: CRISIS_PROJECT,
  };
}

function selfResponseStatus(event: GoogleCalendarEvent): "accepted" | "declined" | null {
  const selfAttendee = event.attendees?.find((attendee) => attendee.self);
  if (selfAttendee?.responseStatus === "declined") return "declined";
  if (selfAttendee?.responseStatus === "accepted") return "accepted";
  return null;
}

function workAttendeeCount(event: GoogleCalendarEvent) {
  return event.attendees?.filter((attendee) => !attendee.resource).length ?? 1;
}

function addDaysIso(date: string, days: number) {
  const nextDate = new Date(`${date}T00:00:00Z`);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate.toISOString().slice(0, 10);
}

function zonedDateBoundaryToUtcIso(date: string, timeZone: string) {
  const utcGuess = new Date(`${date}T00:00:00.000Z`);
  const zonedParts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(utcGuess);
  const valueFor = (type: string) => Number(zonedParts.find((part) => part.type === type)?.value);
  const zonedAsUtc = Date.UTC(
    valueFor("year"),
    valueFor("month") - 1,
    valueFor("day"),
    valueFor("hour"),
    valueFor("minute"),
    valueFor("second"),
  );

  return new Date(utcGuess.getTime() - (zonedAsUtc - utcGuess.getTime())).toISOString();
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
