import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";
import ts from "typescript";
import { createRequire } from "node:module";

const projectRoot = process.cwd();
const nodeRequire = createRequire(import.meta.url);
const moduleCache = new Map();

function resolveModulePath(fromPath, request) {
  const tryPaths = [];
  if (request.startsWith("@/")) {
    const base = path.join(projectRoot, request.slice(2));
    tryPaths.push(base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"));
  } else if (request.startsWith(".")) {
    const base = path.resolve(path.dirname(fromPath), request);
    tryPaths.push(base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"));
  }

  for (const candidate of tryPaths) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

function loadTsModule(modulePath) {
  const fullPath = path.resolve(modulePath);
  if (moduleCache.has(fullPath)) return moduleCache.get(fullPath);

  const source = fs.readFileSync(fullPath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: fullPath,
  }).outputText;

  const compiledModule = { exports: {} };
  moduleCache.set(fullPath, compiledModule.exports);

  const localRequire = (request) => {
    if (request === "next/server") {
      return {
        NextResponse: {
          json(body, init = {}) {
            const status = init.status ?? 200;
            return new Response(JSON.stringify(body), {
              status,
              headers: { "content-type": "application/json" },
            });
          },
        },
      };
    }

    const resolved = resolveModulePath(fullPath, request);
    if (resolved) return loadTsModule(resolved);
    return nodeRequire(request);
  };

  const sandbox = {
    module: compiledModule,
    exports: compiledModule.exports,
    require: localRequire,
    __dirname: path.dirname(fullPath),
    __filename: fullPath,
    process,
    console,
    URL,
    Blob,
    Request,
    Response,
    Headers,
    Buffer,
    fetch,
    AbortController,
    setTimeout,
    clearTimeout,
    TextEncoder,
    TextDecoder,
    document: {
      createElement: () => ({ click: () => {} }),
    },
  };

  vm.runInNewContext(compiled, sandbox, { filename: fullPath });
  moduleCache.set(fullPath, compiledModule.exports);
  return compiledModule.exports;
}

function resetTestDataDir() {
  moduleCache.clear();
  const testDataDir = path.join(projectRoot, "data-test");
  fs.rmSync(testDataDir, { recursive: true, force: true });
  fs.mkdirSync(testDataDir, { recursive: true });
  process.env.APP_DATA_DIR = testDataDir;
  delete process.env.META_AD_LIBRARY_TOKEN;
  delete process.env.INTERNAL_API_KEY;
}

function createJsonRequest(url, method, body, headers = {}) {
  return new Request(url, {
    method,
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function testAnalysisEngine() {
  const { analyzeAd } = loadTsModule("./lib/analysis.ts");

  const client = {
    id: "c1",
    name: "Acme Bank",
    domains: "acmebank.com",
    brandTerms: "acme,bank",
    country: "US",
    notes: "",
  };

  const suspiciousAd = {
    id: "ad1",
    page_name: "Acme Bank Support",
    page_id: "p1",
    ad_creative_bodies: [
      "Your account is locked. Verify your login now and claim reward.",
    ],
    ad_creative_link_captions: ["acmebank-secure-login.xyz"],
  };

  const legitAd = {
    id: "ad2",
    page_name: "Acme Bank",
    page_id: "p2",
    ad_creative_bodies: ["Official Acme Bank mobile app announcement."],
    ad_creative_link_captions: ["acmebank.com"],
  };

  const suspicious = analyzeAd(suspiciousAd, client);
  const legit = analyzeAd(legitAd, client);

  assert.ok(suspicious.score > legit.score, "Suspicious ad should score higher than legitimate ad");
  assert.ok(
    suspicious.threat === "high" || suspicious.threat === "critical",
    "Suspicious ad should be high or critical"
  );
}

async function testCsvSafety() {
  const { escapeCSV } = loadTsModule("./lib/export-csv.ts");
  const escaped = escapeCSV("=SUM(A1:A5)");
  assert.equal(escaped, "\"'=SUM(A1:A5)\"", "Formula-like CSV cells should be prefixed");
}

async function testStateConflictRoute() {
  resetTestDataDir();
  const stateRoute = loadTsModule("./app/api/state/route.ts");

  const firstWrite = await stateRoute.PUT(
    createJsonRequest("http://localhost/api/state", "PUT", {
      clients: [{ id: "1", name: "Acme", domains: "acme.com", brandTerms: "acme", country: "US", notes: "" }],
      triageMap: {},
      version: 0,
    })
  );
  assert.equal(firstWrite.status, 200, "Initial write should succeed");

  const conflictWrite = await stateRoute.PUT(
    createJsonRequest("http://localhost/api/state", "PUT", {
      clients: [],
      triageMap: {},
      version: 0,
    })
  );
  assert.equal(conflictWrite.status, 409, "Stale version write should conflict");
}

async function testAutomationGuardRoutes() {
  resetTestDataDir();
  process.env.INTERNAL_API_KEY = "test-internal-key";

  const runRoute = loadTsModule("./app/api/automation/run/route.ts");

  const forbidden = await runRoute.POST(new Request("http://localhost/api/automation/run", { method: "POST" }));
  assert.equal(forbidden.status, 403, "Missing internal key should be forbidden");

  const wrongKey = await runRoute.POST(
    new Request("http://localhost/api/automation/run", {
      method: "POST",
      headers: { "x-internal-api-key": "wrong" },
    })
  );
  assert.equal(wrongKey.status, 403, "Wrong internal key should be forbidden");
}

async function testMetaTokenSettingsRoute() {
  resetTestDataDir();
  process.env.INTERNAL_API_KEY = "test-internal-key";
  process.env.APP_ENCRYPTION_KEY = Buffer.from("12345678901234567890123456789012").toString("base64");

  const tokenRoute = loadTsModule("./app/api/settings/meta-token/route.ts");

  const badBody = await tokenRoute.POST(
    createJsonRequest("http://localhost/api/settings/meta-token", "POST", {}, {
      "x-internal-api-key": "test-internal-key",
    })
  );
  assert.equal(badBody.status, 400, "Missing token should return 400");

  const saveRes = await tokenRoute.POST(
    createJsonRequest(
      "http://localhost/api/settings/meta-token",
      "POST",
      { token: "meta-secret-token" },
      { "x-internal-api-key": "test-internal-key" }
    )
  );
  assert.equal(saveRes.status, 200, "Token save should succeed");

  const statusRes = await tokenRoute.GET(
    new Request("http://localhost/api/settings/meta-token", {
      method: "GET",
      headers: { "x-internal-api-key": "test-internal-key" },
    })
  );
  assert.equal(statusRes.status, 200, "Token status should succeed");
  const statusJson = await statusRes.json();
  assert.equal(statusJson.configured, true, "Stored token should be configured");

  const clearRes = await tokenRoute.DELETE(
    new Request("http://localhost/api/settings/meta-token", {
      method: "DELETE",
      headers: { "x-internal-api-key": "test-internal-key" },
    })
  );
  assert.equal(clearRes.status, 200, "Token clear should succeed");
}

async function testAdsRouteBehavior() {
  resetTestDataDir();
  let adsRoute = loadTsModule("./app/api/ads/route.ts");

  const missingTokenRes = await adsRoute.POST(
    createJsonRequest("http://localhost/api/ads", "POST", { q: "acme", country: "US" })
  );
  assert.equal(missingTokenRes.status, 503, "Missing token should return 503");

  process.env.META_AD_LIBRARY_TOKEN = "env-test-token";

  const invalidJsonRes = await adsRoute.POST(
    new Request("http://localhost/api/ads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not-json",
    })
  );
  assert.equal(invalidJsonRes.status, 400, "Invalid JSON should return 400");

  const missingQueryRes = await adsRoute.POST(
    createJsonRequest("http://localhost/api/ads", "POST", { country: "US" })
  );
  assert.equal(missingQueryRes.status, 400, "Missing q should return 400");

  const originalFetch = global.fetch;
  const callUrls = [];
  global.fetch = async (url) => {
    callUrls.push(String(url));
    if (callUrls.length === 1) {
      return new Response(
        JSON.stringify({
          data: [{ id: "1" }, { id: "2" }],
          paging: { next: "https://graph.facebook.com/v19.0/ads_archive?after=abc" },
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({
        data: [{ id: "2" }, { id: "3" }],
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  };

  try {
    moduleCache.clear();
    adsRoute = loadTsModule("./app/api/ads/route.ts");
    const paginatedRes = await adsRoute.POST(
      createJsonRequest("http://localhost/api/ads", "POST", { q: "acme", country: "US", maxPages: 3 })
    );
    assert.equal(paginatedRes.status, 200, "Paginated request should return 200");
    const paginatedJson = await paginatedRes.json();
    assert.equal(paginatedJson.ads.length, 3, "Ads should be deduped across pages");
    assert.equal(paginatedJson.meta.pagesFetched, 2, "Two pages should be fetched");
    assert.equal(callUrls.length, 2, "Fetch should follow pagination exactly");
  } finally {
    global.fetch = originalFetch;
  }

  const originalFetch2 = global.fetch;
  global.fetch = async () =>
    new Response("gateway error", { status: 502, headers: { "content-type": "text/plain" } });
  try {
    moduleCache.clear();
    adsRoute = loadTsModule("./app/api/ads/route.ts");
    const upstreamBadRes = await adsRoute.POST(
      createJsonRequest("http://localhost/api/ads", "POST", { q: "acme", country: "US" })
    );
    assert.equal(upstreamBadRes.status, 502, "Non-JSON upstream response should map to 502");
  } finally {
    global.fetch = originalFetch2;
  }
}

async function testStateBackupRestoreRoute() {
  resetTestDataDir();
  process.env.INTERNAL_API_KEY = "test-internal-key";

  const stateRoute = loadTsModule("./app/api/state/route.ts");
  const backupRoute = loadTsModule("./app/api/state/backup/route.ts");

  await stateRoute.PUT(
    createJsonRequest("http://localhost/api/state", "PUT", {
      clients: [{ id: "c1", name: "Acme", domains: "acme.com", brandTerms: "acme", country: "US", notes: "" }],
      triageMap: { "c1:ad1": "investigating" },
      version: 0,
    })
  );

  const backupRes = await backupRoute.GET(
    new Request("http://localhost/api/state/backup", {
      method: "GET",
      headers: { "x-internal-api-key": "test-internal-key" },
    })
  );
  assert.equal(backupRes.status, 200, "Backup export should succeed");
  const backupJson = await backupRes.json();
  assert.equal(Array.isArray(backupJson.state.clients), true, "Backup payload should include clients");

  const restoreRes = await backupRoute.POST(
    createJsonRequest(
      "http://localhost/api/state/backup",
      "POST",
      {
        state: {
          clients: [],
          triageMap: {},
          version: 10,
        },
      },
      { "x-internal-api-key": "test-internal-key" }
    )
  );
  assert.equal(restoreRes.status, 200, "Backup restore should succeed");
}

async function testAutomationPolicyRoute() {
  resetTestDataDir();
  process.env.INTERNAL_API_KEY = "test-internal-key";
  const policyRoute = loadTsModule("./app/api/automation/policy/route.ts");

  const getRes = await policyRoute.GET(
    new Request("http://localhost/api/automation/policy", {
      method: "GET",
      headers: { "x-internal-api-key": "test-internal-key" },
    })
  );
  assert.equal(getRes.status, 200, "Policy GET should succeed");

  const putRes = await policyRoute.PUT(
    createJsonRequest(
      "http://localhost/api/automation/policy",
      "PUT",
      {
        channels: { slack: true, telegram: false },
        minNewFlaggedForAlert: 3,
        quietHoursUtc: { enabled: true, startHour: 1, endHour: 7 },
      },
      { "x-internal-api-key": "test-internal-key" }
    )
  );
  assert.equal(putRes.status, 200, "Policy PUT should succeed");
  const putJson = await putRes.json();
  assert.equal(putJson.alertPolicy.minNewFlaggedForAlert, 3, "Policy threshold should update");
}

async function run() {
  await testAnalysisEngine();
  await testCsvSafety();
  await testStateConflictRoute();
  await testAutomationGuardRoutes();
  await testMetaTokenSettingsRoute();
  await testAdsRouteBehavior();
  await testStateBackupRestoreRoute();
  await testAutomationPolicyRoute();
  console.log("All tests passed.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
