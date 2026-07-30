/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  SALESFORCE_ACCESS_TOKEN?: string;
  SALESFORCE_API_VERSION?: string;
  SALESFORCE_INSTANCE_URL?: string;
  SALESFORCE_CLIENT_ID?: string;
  SALESFORCE_CLIENT_SECRET?: string;
  SALESFORCE_LOGIN_URL?: string;
  GOOGLE_CALENDAR_ACCESS_TOKEN?: string;
  GOOGLE_CALENDAR_ID?: string;
  GOOGLE_CALENDAR_TIMEZONE?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  OAUTH_TOKEN_SECRET?: string;
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
const CLIENT_TASK_RECORD_TYPE_ID = "012Qh0000015yz3IAA";
const DEFAULT_SALESFORCE_API_VERSION = "v67.0";
const DEFAULT_SALESFORCE_LOGIN_URL = "https://login.salesforce.com";
const DEFAULT_GOOGLE_CALENDAR_ID = "primary";
const DEFAULT_GOOGLE_CALENDAR_TIMEZONE = "America/Toronto";
const OAUTH_CALLBACK_PATH = "/api/oauth/callback";
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
const DELIVERY_TEAMS = new Set(["AOD", "SOPS", "COPS", "MOPS", "Engineering"]);

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

type TaskRayProjectRecord = {
  Id: string;
  Name: string;
  Id_Pricing_Structure__c?: string;
  Delivery_Team__c?: string;
  TASKRAY__trAccount__r?: {
    Website?: string;
  };
};

type TaskRayProjectTaskRecord = {
  Id: string;
  TASKRAY__Project__c: string;
};

type ProjectOption = {
  id: string;
  label: string;
  idPricingStructure: string;
  pricingStructure: string;
  taskId?: string;
  deliveryTeam?: string;
  websiteDomain?: string;
};

type GoogleCalendarEventsResponse = {
  items?: GoogleCalendarEvent[];
  nextPageToken?: string;
};

type Provider = "google" | "salesforce";

type OAuthConnectionRow = {
  user_email: string;
  provider: Provider;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: number | null;
  instance_url: string | null;
  external_user_id: string | null;
  created_at: string;
  updated_at: string;
};

type OAuthTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  instance_url?: string;
  id?: string;
  error?: string;
  error_description?: string;
};

type SalesforceConnection = {
  accessToken: string;
  apiVersion: string;
  instanceUrl: string;
  ownerId: string;
};

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/integrations/status") {
      if (request.method === "GET") return getIntegrationStatus(request, env);
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    if (url.pathname === "/api/integrations/disconnect") {
      if (request.method === "POST") return disconnectIntegration(request, env);
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    if (url.pathname === "/api/oauth/start") {
      if (request.method === "GET") return startOAuth(request, env);
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    if (url.pathname === OAUTH_CALLBACK_PATH) {
      if (request.method === "GET") return finishOAuth(request, env);
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    if (url.pathname === "/api/calendar/events") {
      if (request.method === "GET") return getGoogleCalendarEvents(request, env);
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    if (url.pathname === "/api/app/update-status") {
      if (request.method === "GET") {
        return jsonResponse({
          local: false,
          updateAvailable: false,
          dirty: false,
          message: "Hosted app updates are installed through deployment. Local users get update checks in local CLI mode.",
        });
      }
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    if (url.pathname === "/api/app/update") {
      if (request.method === "POST") {
        return jsonResponse({ error: "Hosted app updates must be deployed from the GitHub repo." }, 400);
      }
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    if (url.pathname === "/api/salesforce/time-entries") {
      if (request.method === "GET") return getSalesforceTimeEntries(request, env);
      if (request.method === "POST") return createSalesforceTimeEntries(request, env);
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    if (url.pathname.startsWith("/api/salesforce/time-entries/")) {
      if (request.method === "DELETE") return deleteSalesforceTimeEntry(request, env);
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    if (url.pathname === "/api/salesforce/projects") {
      if (request.method === "GET") return getSalesforceProjects(request, env);
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
  const connection = await salesforceConnection(request, env);
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
    `WHERE TASKRAY__Owner__c = '${connection.ownerId}'`,
    `AND TASKRAY__Date__c >= ${start}`,
    `AND TASKRAY__Date__c <= ${end}`,
    "ORDER BY TASKRAY__Date__c DESC, TASKRAY__Project__r.Name ASC, Activity_Type__c ASC",
  ].join(" ");

  const response = await salesforceFetch<SalesforceQueryResponse>(
    connection,
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
  const connection = await salesforceConnection(request, env);
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

  const ownedRecords = records.map((record) =>
    record && typeof record === "object"
      ? { ...record, TASKRAY__Owner__c: connection.ownerId }
      : record,
  );

  const response = await salesforceFetch<SalesforceCompositeResult>(
    connection,
    `/services/data/${connection.apiVersion}/composite/sobjects`,
    {
      method: "POST",
      body: JSON.stringify({
        allOrNone: true,
        records: ownedRecords,
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

async function deleteSalesforceTimeEntry(request: Request, env?: Env): Promise<Response> {
  const connection = await salesforceConnection(request, env);
  if (!connection) return jsonResponse({ error: "Salesforce connection is not configured." }, 503);

  const recordId = decodeURIComponent(new URL(request.url).pathname.split("/").pop() ?? "");
  if (!isSalesforceId(recordId)) return jsonResponse({ error: "A valid Salesforce time entry Id is required." }, 400);

  const response = await salesforceFetch<Record<string, never>>(
    connection,
    `/services/data/${connection.apiVersion}/sobjects/${TASKRAY_TIME_OBJECT}/${recordId}`,
    { method: "DELETE" },
  );
  if (!response.ok) return response.error;

  return jsonResponse({ deleted: true, recordId });
}

function isSalesforceId(value: string) {
  return /^[a-zA-Z0-9]{15,18}$/.test(value);
}

async function getGoogleCalendarEvents(request: Request, env?: Env): Promise<Response> {
  const user = authenticatedUser(request);
  const googleConnection = user ? await connectionForUser(env, user.email, "google") : null;
  const accessToken = googleConnection?.accessToken ?? env?.GOOGLE_CALENDAR_ACCESS_TOKEN ?? process.env.GOOGLE_CALENDAR_ACCESS_TOKEN;
  if (!accessToken) {
    return jsonResponse({ error: "Google Calendar connection is not configured." }, 503);
  }

  const url = new URL(request.url);
  const start = safeDate(url.searchParams.get("start"));
  const end = safeDate(url.searchParams.get("end"));
  if (!start || !end) return jsonResponse({ error: "Start and end dates are required." }, 400);
  const deliveryTeam = deliveryTeamFromUrl(url);
  const salesforce = await salesforceConnection(request, env);

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
    records: await normalizeGoogleCalendarEvents(events, deliveryTeam, salesforce),
  });
}

async function getSalesforceProjects(request: Request, env?: Env): Promise<Response> {
  const connection = await salesforceConnection(request, env);
  if (!connection) return jsonResponse({ error: "Salesforce connection is not configured." }, 503);

  const url = new URL(request.url);
  const deliveryTeam = deliveryTeamFromUrl(url);
  const date = safeDate(url.searchParams.get("date"));
  const projects = await querySalesforceProjects(connection, deliveryTeam, date);
  return jsonResponse({ records: projects });
}

async function getIntegrationStatus(request: Request, env?: Env): Promise<Response> {
  const user = authenticatedUser(request);
  if (!user) return jsonResponse({ error: "Signed-in user email is required." }, 401);

  await ensureOAuthSchema(env);
  const google = await connectionRow(env, user.email, "google");
  const salesforce = await connectionRow(env, user.email, "salesforce");
  const fallbackSalesforce = salesforceEnvConnection(env);

  return jsonResponse({
    user,
    providers: {
      google: {
        configured: oauthConfigured(env, "google"),
        connected: Boolean(google),
        email: google ? user.email : null,
      },
      salesforce: {
        configured: oauthConfigured(env, "salesforce"),
        connected: Boolean(salesforce),
        fallbackConfigured: Boolean(fallbackSalesforce),
        instanceUrl: salesforce?.instance_url ?? fallbackSalesforce?.instanceUrl ?? null,
        username: salesforce ? user.email : null,
      },
    },
  });
}

async function disconnectIntegration(request: Request, env?: Env): Promise<Response> {
  const user = authenticatedUser(request);
  if (!user) return jsonResponse({ error: "Signed-in user email is required." }, 401);

  const provider = providerFromUrl(request);
  if (!provider) return jsonResponse({ error: "Provider must be google or salesforce." }, 400);
  if (!env?.DB) return jsonResponse({ error: "Connection storage is not configured." }, 503);

  await ensureOAuthSchema(env);
  await env.DB.prepare("DELETE FROM oauth_connections WHERE user_email = ? AND provider = ?")
    .bind(user.email, provider)
    .run();

  return jsonResponse({ ok: true });
}

async function startOAuth(request: Request, env?: Env): Promise<Response> {
  const user = authenticatedUser(request);
  if (!user) return jsonResponse({ error: "Signed-in user email is required." }, 401);

  const provider = providerFromUrl(request);
  if (!provider) return jsonResponse({ error: "Provider must be google or salesforce." }, 400);
  if (!oauthConfigured(env, provider)) return jsonResponse({ error: `${providerLabel(provider)} OAuth is not configured.` }, 503);

  const redirectUri = oauthRedirectUri(request);
  const state = await signOAuthState(env, {
    provider,
    returnTo: "/",
    userEmail: user.email,
  });

  const authorizeUrl =
    provider === "google"
      ? googleAuthorizeUrl(env, redirectUri, state)
      : salesforceAuthorizeUrl(env, redirectUri, state);

  return Response.redirect(authorizeUrl, 302);
}

async function finishOAuth(request: Request, env?: Env): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) return redirectWithIntegrationResult(request, "error", error);
  if (!code || !state) return redirectWithIntegrationResult(request, "error", "Missing OAuth response.");

  const parsedState = await verifyOAuthState(env, state);
  if (!parsedState) return redirectWithIntegrationResult(request, "error", "Invalid OAuth state.");

  const user = authenticatedUser(request);
  if (!user || user.email !== parsedState.userEmail) {
    return redirectWithIntegrationResult(request, "error", "Signed-in user changed during OAuth.");
  }

  if (!env?.DB) return redirectWithIntegrationResult(request, "error", "Connection storage is not configured.");
  if (!env.OAUTH_TOKEN_SECRET) return redirectWithIntegrationResult(request, "error", "Token encryption is not configured.");

  const redirectUri = oauthRedirectUri(request);
  const tokenResponse =
    parsedState.provider === "google"
      ? await exchangeGoogleCode(env, code, redirectUri)
      : await exchangeSalesforceCode(env, code, redirectUri);

  if (!tokenResponse.access_token) {
    return redirectWithIntegrationResult(
      request,
      "error",
      tokenResponse.error_description ?? tokenResponse.error ?? "OAuth token exchange failed.",
    );
  }

  await saveConnection(env, user.email, parsedState.provider, tokenResponse);
  return redirectWithIntegrationResult(request, parsedState.provider, "connected");
}

async function salesforceConnection(request: Request, env?: Env): Promise<SalesforceConnection | null> {
  const user = authenticatedUser(request);
  const storedConnection = user ? await connectionForUser(env, user.email, "salesforce") : null;
  if (storedConnection?.instanceUrl && storedConnection.externalUserId) {
    return {
      accessToken: storedConnection.accessToken,
      apiVersion: env?.SALESFORCE_API_VERSION ?? process.env.SALESFORCE_API_VERSION ?? DEFAULT_SALESFORCE_API_VERSION,
      instanceUrl: storedConnection.instanceUrl,
      ownerId: storedConnection.externalUserId,
    };
  }

  return salesforceEnvConnection(env);
}

function salesforceEnvConnection(env?: Env): SalesforceConnection | null {
  const instanceUrl = (env?.SALESFORCE_INSTANCE_URL ?? process.env.SALESFORCE_INSTANCE_URL)?.replace(/\/$/, "");
  const accessToken = env?.SALESFORCE_ACCESS_TOKEN ?? process.env.SALESFORCE_ACCESS_TOKEN;
  if (!instanceUrl || !accessToken) return null;

  return {
    accessToken,
    apiVersion: env?.SALESFORCE_API_VERSION ?? process.env.SALESFORCE_API_VERSION ?? DEFAULT_SALESFORCE_API_VERSION,
    instanceUrl,
    ownerId: TASKRAY_TIME_OWNER_ID,
  };
}

async function salesforceFetch<T>(
  connection: SalesforceConnection,
  path: string,
  init: RequestInit = {},
): Promise<{ ok: true; data: T } | { ok: false; error: Response }> {
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

async function connectionForUser(env: Env | undefined, userEmail: string, provider: Provider) {
  const row = await connectionRow(env, userEmail, provider);
  if (!row || !env?.OAUTH_TOKEN_SECRET) return null;

  const accessToken = await decryptToken(env, row.access_token);
  const refreshToken = row.refresh_token ? await decryptToken(env, row.refresh_token) : null;
  if (!accessToken) return null;

  const expiresSoon = row.token_expires_at ? row.token_expires_at < Date.now() + 60_000 : false;
  if (!expiresSoon) {
    return {
      accessToken,
      externalUserId: row.external_user_id,
      instanceUrl: row.instance_url,
      refreshToken,
    };
  }

  if (!refreshToken) return null;

  const refreshed =
    provider === "google"
      ? await refreshGoogleToken(env, refreshToken)
      : await refreshSalesforceToken(env, refreshToken);
  if (!refreshed.access_token) return null;

  const savedResponse: OAuthTokenResponse = {
    ...refreshed,
    refresh_token: refreshed.refresh_token ?? refreshToken,
    instance_url: refreshed.instance_url ?? row.instance_url ?? undefined,
    id: row.external_user_id ? `/${row.external_user_id}` : refreshed.id,
  };
  await saveConnection(env, userEmail, provider, savedResponse);

  return {
    accessToken: refreshed.access_token,
    externalUserId: row.external_user_id,
    instanceUrl: refreshed.instance_url ?? row.instance_url,
    refreshToken,
  };
}

async function connectionRow(env: Env | undefined, userEmail: string, provider: Provider) {
  if (!env?.DB) return null;
  await ensureOAuthSchema(env);

  return env.DB.prepare(
    [
      "SELECT user_email, provider, access_token, refresh_token, token_expires_at,",
      "instance_url, external_user_id, created_at, updated_at",
      "FROM oauth_connections",
      "WHERE user_email = ? AND provider = ?",
    ].join(" "),
  )
    .bind(userEmail, provider)
    .first<OAuthConnectionRow>();
}

async function saveConnection(env: Env, userEmail: string, provider: Provider, tokenResponse: OAuthTokenResponse) {
  if (!env.DB) throw new Error("Connection storage is not configured.");
  if (!tokenResponse.access_token) throw new Error("OAuth access token missing.");

  await ensureOAuthSchema(env);

  const existing = await connectionRow(env, userEmail, provider);
  const now = new Date().toISOString();
  const refreshToken = tokenResponse.refresh_token ?? (existing?.refresh_token ? await decryptToken(env, existing.refresh_token) : null);
  const externalUserId =
    provider === "salesforce"
      ? salesforceUserIdFromIdentityUrl(tokenResponse.id) ?? existing?.external_user_id ?? null
      : existing?.external_user_id ?? null;
  const expiresAt = tokenResponse.expires_in ? Date.now() + tokenResponse.expires_in * 1000 : Date.now() + 7_200_000;

  await env.DB.prepare(
    [
      "INSERT INTO oauth_connections",
      "(user_email, provider, access_token, refresh_token, token_expires_at, instance_url, external_user_id, created_at, updated_at)",
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      "ON CONFLICT(user_email, provider) DO UPDATE SET",
      "access_token = excluded.access_token,",
      "refresh_token = excluded.refresh_token,",
      "token_expires_at = excluded.token_expires_at,",
      "instance_url = excluded.instance_url,",
      "external_user_id = excluded.external_user_id,",
      "updated_at = excluded.updated_at",
    ].join(" "),
  )
    .bind(
      userEmail,
      provider,
      await encryptToken(env, tokenResponse.access_token),
      refreshToken ? await encryptToken(env, refreshToken) : null,
      expiresAt,
      tokenResponse.instance_url ?? existing?.instance_url ?? null,
      externalUserId,
      existing?.created_at ?? now,
      now,
    )
    .run();
}

async function ensureOAuthSchema(env?: Env) {
  if (!env?.DB) return;

  await env.DB.batch([
    env.DB.prepare(
      [
        "CREATE TABLE IF NOT EXISTS oauth_connections (",
        "user_email text NOT NULL,",
        "provider text NOT NULL,",
        "access_token text NOT NULL,",
        "refresh_token text,",
        "token_expires_at integer,",
        "instance_url text,",
        "external_user_id text,",
        "created_at text NOT NULL,",
        "updated_at text NOT NULL,",
        "PRIMARY KEY(user_email, provider)",
        ")",
      ].join(" "),
    ),
  ]);
}

async function exchangeGoogleCode(env: Env | undefined, code: string, redirectUri: string) {
  return tokenRequest("https://oauth2.googleapis.com/token", {
    client_id: env?.GOOGLE_CLIENT_ID ?? "",
    client_secret: env?.GOOGLE_CLIENT_SECRET ?? "",
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });
}

async function exchangeSalesforceCode(env: Env | undefined, code: string, redirectUri: string) {
  return tokenRequest(`${salesforceLoginUrl(env)}/services/oauth2/token`, {
    client_id: env?.SALESFORCE_CLIENT_ID ?? "",
    client_secret: env?.SALESFORCE_CLIENT_SECRET ?? "",
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });
}

async function refreshGoogleToken(env: Env | undefined, refreshToken: string) {
  return tokenRequest("https://oauth2.googleapis.com/token", {
    client_id: env?.GOOGLE_CLIENT_ID ?? "",
    client_secret: env?.GOOGLE_CLIENT_SECRET ?? "",
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
}

async function refreshSalesforceToken(env: Env | undefined, refreshToken: string) {
  return tokenRequest(`${salesforceLoginUrl(env)}/services/oauth2/token`, {
    client_id: env?.SALESFORCE_CLIENT_ID ?? "",
    client_secret: env?.SALESFORCE_CLIENT_SECRET ?? "",
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
}

async function tokenRequest(url: string, values: Record<string, string>) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(values),
  });

  return response.json().catch(() => ({
    error: response.ok ? undefined : "token_request_failed",
  })) as Promise<OAuthTokenResponse>;
}

function googleAuthorizeUrl(env: Env | undefined, redirectUri: string, state: string) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", env?.GOOGLE_CLIENT_ID ?? "");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "https://www.googleapis.com/auth/calendar.readonly");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  return url.toString();
}

function salesforceAuthorizeUrl(env: Env | undefined, redirectUri: string, state: string) {
  const url = new URL(`${salesforceLoginUrl(env)}/services/oauth2/authorize`);
  url.searchParams.set("client_id", env?.SALESFORCE_CLIENT_ID ?? "");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "api refresh_token");
  url.searchParams.set("state", state);
  return url.toString();
}

function oauthConfigured(env: Env | undefined, provider: Provider) {
  const hasTokenStorage = Boolean(env?.DB && env?.OAUTH_TOKEN_SECRET);
  if (provider === "google") return hasTokenStorage && Boolean(env?.GOOGLE_CLIENT_ID && env?.GOOGLE_CLIENT_SECRET);
  return hasTokenStorage && Boolean(env?.SALESFORCE_CLIENT_ID && env?.SALESFORCE_CLIENT_SECRET);
}

function providerFromUrl(request: Request): Provider | null {
  const provider = new URL(request.url).searchParams.get("provider");
  return provider === "google" || provider === "salesforce" ? provider : null;
}

function providerLabel(provider: Provider) {
  return provider === "google" ? "Google Calendar" : "Salesforce";
}

function salesforceLoginUrl(env?: Env) {
  return (env?.SALESFORCE_LOGIN_URL ?? process.env.SALESFORCE_LOGIN_URL ?? DEFAULT_SALESFORCE_LOGIN_URL).replace(/\/$/, "");
}

function oauthRedirectUri(request: Request) {
  return new URL(OAUTH_CALLBACK_PATH, request.url).toString();
}

function redirectWithIntegrationResult(request: Request, integration: string, message: string) {
  const url = new URL("/", request.url);
  url.searchParams.set("integration", integration);
  url.searchParams.set("message", message);
  return Response.redirect(url.toString(), 302);
}

function authenticatedUser(request: Request) {
  const email = request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase();
  if (!email) return null;

  const encodedName = request.headers.get("oai-authenticated-user-full-name");
  const encoding = request.headers.get("oai-authenticated-user-full-name-encoding");
  const name =
    encodedName && encoding === "percent-encoded-utf-8"
      ? decodeURIComponent(encodedName)
      : encodedName ?? email;

  return { email, name };
}

async function signOAuthState(env: Env | undefined, state: { provider: Provider; returnTo: string; userEmail: string }) {
  const payload = base64UrlEncode(JSON.stringify({ ...state, nonce: crypto.randomUUID() }));
  const signature = await hmacSha256(env?.OAUTH_TOKEN_SECRET ?? "", payload);
  return `${payload}.${signature}`;
}

async function verifyOAuthState(env: Env | undefined, state: string) {
  const [payload, signature] = state.split(".");
  if (!payload || !signature) return null;

  const expectedSignature = await hmacSha256(env?.OAUTH_TOKEN_SECRET ?? "", payload);
  if (!timingSafeEqual(signature, expectedSignature)) return null;

  const parsed = JSON.parse(base64UrlDecode(payload)) as { provider?: string; returnTo?: string; userEmail?: string };
  if ((parsed.provider !== "google" && parsed.provider !== "salesforce") || !parsed.userEmail) return null;
  return {
    provider: parsed.provider as Provider,
    returnTo: parsed.returnTo ?? "/",
    userEmail: parsed.userEmail,
  };
}

async function encryptToken(env: Env, token: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await tokenCryptoKey(env);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(token));
  return `v1:${base64UrlEncodeBytes(iv)}:${base64UrlEncodeBytes(new Uint8Array(encrypted))}`;
}

async function decryptToken(env: Env, encryptedToken: string) {
  const [version, ivValue, cipherValue] = encryptedToken.split(":");
  if (version !== "v1" || !ivValue || !cipherValue) return null;

  try {
    const key = await tokenCryptoKey(env);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64UrlDecodeBytes(ivValue) },
      key,
      base64UrlDecodeBytes(cipherValue),
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  }
}

async function tokenCryptoKey(env: Env) {
  if (!env.OAUTH_TOKEN_SECRET) throw new Error("Token encryption is not configured.");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(env.OAUTH_TOKEN_SECRET));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function hmacSha256(secret: string, value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret || "missing-oauth-secret"));
  const key = await crypto.subtle.importKey("raw", digest, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return base64UrlEncodeBytes(new Uint8Array(signature));
}

function salesforceUserIdFromIdentityUrl(identityUrl?: string) {
  if (!identityUrl) return null;
  return identityUrl.split("/").filter(Boolean).at(-1) ?? null;
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}

function base64UrlEncode(value: string) {
  return base64UrlEncodeBytes(new TextEncoder().encode(value));
}

function base64UrlDecode(value: string) {
  return new TextDecoder().decode(base64UrlDecodeBytes(value));
}

function base64UrlEncodeBytes(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecodeBytes(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function safeDate(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

async function normalizeGoogleCalendarEvents(
  events: GoogleCalendarEvent[],
  deliveryTeam: string,
  connection: SalesforceConnection | null,
) {
  const normalized = [];

  for (const event of events) {
    const entry = await normalizeGoogleCalendarEvent(event, deliveryTeam, connection);
    if (entry) normalized.push(entry);
  }

  return normalized;
}

async function normalizeGoogleCalendarEvent(
  event: GoogleCalendarEvent,
  deliveryTeam: string,
  connection: SalesforceConnection | null,
) {
  if (shouldIgnoreGoogleCalendarEvent(event)) return null;

  const title = event.summary?.trim() || "Untitled calendar event";
  const start = event.start?.dateTime ?? (event.start?.date ? `${event.start.date}T00:00:00` : "");
  const end = event.end?.dateTime ?? (event.end?.date ? `${event.end.date}T00:00:00` : "");
  if (!start || !end) return null;

  const classification = await classifyGoogleCalendarEvent(event, deliveryTeam, connection, start.slice(0, 10));

  return {
    id: event.id,
    title,
    start,
    end,
    project: classification.project,
    activityType: classification.activityType,
    billable: classification.project.id !== INTERNAL_PROJECT.id,
    responseStatus: selfResponseStatus(event),
    transparency: event.transparency === "transparent" ? "transparent" : "opaque",
  };
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

async function classifyGoogleCalendarEvent(
  event: GoogleCalendarEvent,
  deliveryTeam: string,
  connection: SalesforceConnection | null,
  eventDate: string,
): Promise<{
  activityType: "Meeting" | "Coding and Configuration" | "People and Team Activities";
  project: ProjectOption;
}> {
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

  const domains = externalAttendeeDomains(event);
  const project = connection && domains.length
    ? (await matchProjectByDomains(connection, domains, deliveryTeam, eventDate)) ?? BLANK_PROJECT
    : BLANK_PROJECT;

  return {
    activityType: looksLikeMeeting ? "Meeting" : "Coding and Configuration",
    project,
  };
}

async function matchProjectByDomains(
  connection: SalesforceConnection,
  domains: string[],
  deliveryTeam: string,
  eventDate: string,
) {
  const projects = await querySalesforceProjects(connection, deliveryTeam, eventDate);
  return projects.find((project) =>
    project.websiteDomain && domains.some((domain) => domainsMatch(project.websiteDomain ?? "", domain)),
  );
}

async function querySalesforceProjects(
  connection: SalesforceConnection,
  deliveryTeam: string,
  date: string | null,
): Promise<ProjectOption[]> {
  const filters = [
    "TASKRAY__Status__c = false",
    "TASKRAY__trTemplate__c = false",
    "Parent_Project__c = false",
    `Delivery_Team__c = '${escapeSoql(deliveryTeam)}'`,
  ];

  if (date) {
    filters.push(`(OfficialStartDate__c = null OR OfficialStartDate__c <= ${date})`);
  }

  const query = [
    "SELECT Id, Name, Id_Pricing_Structure__c, TASKRAY__trAccount__r.Website, Delivery_Team__c",
    "FROM TASKRAY__Project__c",
    `WHERE ${filters.join(" AND ")}`,
    "ORDER BY Name ASC",
  ].join(" ");
  const response = await salesforceFetch<{ records: TaskRayProjectRecord[] }>(
    connection,
    `/services/data/${connection.apiVersion}/query?q=${encodeURIComponent(query)}`,
  );
  if (!response.ok) return [INTERNAL_PROJECT];

  const projects = response.data.records.map(projectFromRecord);
  const taskIds = await taskIdsForProjects(connection, projects.map((project) => project.id));

  return [
    INTERNAL_PROJECT,
    ...projects.map((project) => ({
      ...project,
      taskId: taskIds[project.id],
    })),
  ];
}

async function taskIdsForProjects(connection: SalesforceConnection, projectIds: string[]) {
  if (!projectIds.length) return {} as Record<string, string>;
  const quotedIds = projectIds.map((id) => `'${escapeSoql(id)}'`).join(",");
  const query = [
    "SELECT Id, TASKRAY__Project__c",
    "FROM TASKRAY__Project_Task__c",
    `WHERE RecordTypeId = '${CLIENT_TASK_RECORD_TYPE_ID}'`,
    "AND TASKRAY__Archived__c = false",
    `AND TASKRAY__Project__c IN (${quotedIds})`,
  ].join(" ");
  const response = await salesforceFetch<{ records: TaskRayProjectTaskRecord[] }>(
    connection,
    `/services/data/${connection.apiVersion}/query?q=${encodeURIComponent(query)}`,
  );
  if (!response.ok) return {} as Record<string, string>;

  return Object.fromEntries(response.data.records.map((record) => [record.TASKRAY__Project__c, record.Id]));
}

function projectFromRecord(record: TaskRayProjectRecord): ProjectOption {
  const idPricingStructure = record.Id_Pricing_Structure__c ?? `${record.Id}-Capacity`;
  return {
    id: record.Id,
    label: record.Name,
    idPricingStructure,
    pricingStructure: idPricingStructure.split("-").at(-1) ?? "Capacity",
    deliveryTeam: record.Delivery_Team__c,
    websiteDomain: websiteDomain(record.TASKRAY__trAccount__r?.Website),
  };
}

function externalAttendeeDomains(event: GoogleCalendarEvent) {
  return Array.from(new Set((event.attendees ?? [])
    .filter((attendee) => !attendee.resource)
    .map((attendee) => attendee.email?.toLowerCase() ?? "")
    .map((email) => normalizeDomain(email.split("@").at(-1) ?? ""))
    .filter((domain) => domain && domain !== "kicksaw.com")));
}

function websiteDomain(value?: string) {
  if (!value) return "";
  try {
    return normalizeDomain(new URL(value.includes("://") ? value : `https://${value}`).hostname);
  } catch {
    return normalizeDomain(value.replace(/^https?:\/\//, "").split("/")[0] ?? "");
  }
}

function normalizeDomain(value: string) {
  return value.trim().toLowerCase().replace(/^www\./, "");
}

function domainsMatch(website: string, attendee: string) {
  return website === attendee || website.endsWith(`.${attendee}`) || attendee.endsWith(`.${website}`);
}

function deliveryTeamFromUrl(url: URL) {
  const requested = url.searchParams.get("deliveryTeam") ?? "SOPS";
  return DELIVERY_TEAMS.has(requested) ? requested : "SOPS";
}

function escapeSoql(value: string) {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
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
