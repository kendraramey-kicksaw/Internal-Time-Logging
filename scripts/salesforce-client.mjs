import { execFile } from "node:child_process";
import { promisify } from "node:util";

const DEFAULT_TIMEOUT_MS = 15_000;

export function createSalesforceClient({
  orgAlias,
  execute = promisify(execFile),
  fetch: fetchImpl = globalThis.fetch,
  logger = console,
  onUnauthorized = () => {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  let cachedOrg = null;
  let cachedOrgPromise = null;

  async function getOrg() {
    if (cachedOrg) return cachedOrg;
    if (!cachedOrgPromise) {
      cachedOrgPromise = loadOrg().then(
        (org) => {
          cachedOrg = org;
          return org;
        },
        (error) => {
          cachedOrgPromise = null;
          logger.warn(`Salesforce CLI authentication failed for org ${orgAlias}.`);
          throw error;
        },
      );
    }
    return cachedOrgPromise;
  }

  async function loadOrg() {
    let orgResult;
    let tokenResult = null;
    try {
      orgResult = await sfJson(["org", "display", "--target-org", orgAlias, "--json"]);
      tokenResult = await sfJson(["org", "auth", "show-access-token", "--target-org", orgAlias, "--json"]).catch((error) => {
        if (isUnknownShowAccessTokenCommand(error)) return null;
        throw error;
      });
    } catch {
      throw authenticationError();
    }

    if (hasStaleTokenWarning(tokenResult?.warnings)) {
      throw new Error(`Salesforce CLI org ${orgAlias} could not refresh its access token. Run: sf org login web --alias ${orgAlias}.`);
    }

    const accessToken = tokenResult?.result?.accessToken ?? displayAccessToken(orgResult.result?.accessToken);
    const instanceUrl = orgResult.result?.instanceUrl;
    const username = orgResult.result?.username;
    if (!accessToken || !instanceUrl || !username) throw authenticationError();

    return { accessToken, instanceUrl, username };
  }

  async function sfJson(args) {
    try {
      const { stdout } = await execute("sf", args, {
        maxBuffer: 10 * 1024 * 1024,
        timeout: timeoutMs,
      });
      const parsed = JSON.parse(stdout);
      if (parsed.status !== 0) throw new Error("Salesforce CLI command failed.");
      return parsed;
    } catch (error) {
      error.commandArgs = args;
      throw error;
    }
  }

  async function rest(path, init = {}, retryOnUnauthorized = true) {
    const org = await getOrg();
    const response = await fetchImpl(`${org.instanceUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${org.accessToken}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
    const data = await response.json().catch(() => ({}));

    if (response.status === 401 && retryOnUnauthorized) {
      clearAuthCache();
      return rest(path, init, false);
    }
    if (!response.ok) {
      throw new Error(data?.[0]?.message ?? data?.message ?? data?.error_description ?? "Salesforce request failed.");
    }

    return data;
  }

  function clearAuthCache() {
    cachedOrg = null;
    cachedOrgPromise = null;
    onUnauthorized();
  }

  function authenticationError() {
    return new Error(`Salesforce CLI org ${orgAlias} is not authenticated. Run: sf org login web --alias ${orgAlias}.`);
  }

  return { getOrg, rest };
}

function hasStaleTokenWarning(warnings) {
  return (warnings ?? []).some((warning) => /access token may be stale/i.test(String(warning)));
}

function isUnknownShowAccessTokenCommand(error) {
  const output = `${error?.stdout ?? ""}\n${error?.stderr ?? ""}\n${error?.message ?? ""}`;
  return /org auth show-access-token is not a sf command/i.test(output);
}

function displayAccessToken(value) {
  const token = String(value ?? "");
  return token && !token.includes("[REDACTED]") ? token : "";
}
