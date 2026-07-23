/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  SALESFORCE_ACCESS_TOKEN?: string;
  SALESFORCE_API_VERSION?: string;
  SALESFORCE_INSTANCE_URL?: string;
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

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

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

async function getSalesforceTimeEntries(request: Request, env: Env): Promise<Response> {
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

async function createSalesforceTimeEntries(request: Request, env: Env): Promise<Response> {
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

  const response = await salesforceFetch(
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

  return jsonResponse(response.data, 201);
}

function salesforceConnection(env: Env) {
  const instanceUrl = env.SALESFORCE_INSTANCE_URL?.replace(/\/$/, "");
  const accessToken = env.SALESFORCE_ACCESS_TOKEN;
  if (!instanceUrl || !accessToken) return null;

  return {
    accessToken,
    apiVersion: env.SALESFORCE_API_VERSION ?? DEFAULT_SALESFORCE_API_VERSION,
    instanceUrl,
  };
}

async function salesforceFetch<T>(
  env: Env,
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

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
