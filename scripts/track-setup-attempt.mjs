#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import { dirname, resolve } from "node:path";

const REPOSITORY = "kendraramey-kicksaw/Internal-Time-Logging";
const TRACKING_ISSUE_NUMBER = 1;
const TRACKING_MARKER = "internal-time-logging-setup-attempt";
const localDir = resolve(".local");
const installIdPath = resolve(localDir, "setup-install-id");
const sentPath = resolve(localDir, "setup-tracking-sent.json");
const args = new Set(process.argv.slice(2));

function readPackageVersion() {
  try {
    return JSON.parse(readFileSync(resolve("package.json"), "utf8")).version ?? "unknown";
  } catch {
    return "unknown";
  }
}

function ensureLocalDir() {
  mkdirSync(localDir, { recursive: true });
}

function getOrCreateInstallId() {
  ensureLocalDir();
  if (existsSync(installIdPath)) return readFileSync(installIdPath, "utf8").trim();

  const installId = randomUUID();
  writeFileSync(installIdPath, `${installId}\n`, { mode: 0o600 });
  return installId;
}

function anonymousInstallId(installId) {
  return `sha256:${createHash("sha256").update(`${REPOSITORY}:${installId}`).digest("hex")}`;
}

function trackingPayload() {
  return {
    event: "setup-attempt",
    installId: anonymousInstallId(getOrCreateInstallId()),
    repository: REPOSITORY,
    appVersion: readPackageVersion(),
    platform: os.platform(),
    createdAt: new Date().toISOString(),
  };
}

function writeSentReceipt(payload, result) {
  ensureLocalDir();
  mkdirSync(dirname(sentPath), { recursive: true });
  writeFileSync(
    sentPath,
    `${JSON.stringify(
      {
        installId: payload.installId,
        postedAt: payload.createdAt,
        result,
      },
      null,
      2,
    )}\n`,
  );
}

function postWithGh(body) {
  execFileSync(
    "gh",
    [
      "api",
      `repos/${REPOSITORY}/issues/${TRACKING_ISSUE_NUMBER}/comments`,
      "-X",
      "POST",
      "-f",
      `body=${body}`,
    ],
    { stdio: "ignore" },
  );
}

function postWithToken(body) {
  const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
  if (!token) return false;

  const response = awaitFetchSync(`https://api.github.com/repos/${REPOSITORY}/issues/${TRACKING_ISSUE_NUMBER}/comments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "internal-time-logging-setup-tracker",
    },
    body: JSON.stringify({ body }),
  });

  return response.status >= 200 && response.status < 300;
}

function awaitFetchSync(url, init) {
  const encoded = Buffer.from(JSON.stringify({ url, init })).toString("base64");
  const script = `
    const { url, init } = JSON.parse(Buffer.from(process.argv[1], "base64").toString("utf8"));
    const response = await fetch(url, init);
    console.log(JSON.stringify({ status: response.status }));
  `;
  const output = execFileSync(process.execPath, ["--input-type=module", "-e", script, encoded], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return JSON.parse(output);
}

async function main() {
  if (existsSync(sentPath) && !args.has("--force")) {
    console.log("Setup tracking already recorded for this checkout.");
    return;
  }

  const payload = trackingPayload();
  const body = `<!-- ${TRACKING_MARKER} -->\n${JSON.stringify(payload, null, 2)}`;

  if (args.has("--dry-run")) {
    console.log(body);
    return;
  }

  try {
    if (postWithToken(body)) {
      writeSentReceipt(payload, "posted-with-token");
      console.log("Anonymous setup attempt recorded.");
      return;
    }
  } catch {
    // Fall through to GitHub CLI.
  }

  try {
    postWithGh(body);
    writeSentReceipt(payload, "posted-with-gh");
    console.log("Anonymous setup attempt recorded.");
  } catch {
    console.log("Setup tracking skipped. GitHub CLI authentication was not available.");
  }
}

main();
