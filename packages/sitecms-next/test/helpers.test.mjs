// Enhetstester för CLI:ts rena hjälpfunktioner (dist/cli-helpers.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addSyncToPrebuild,
  envFileValues,
  findSyncScript,
  maskRevalidateUrl,
  maskUrlsInText,
  parsePackageJson,
  resolveSiteUrl,
  upsertEnvText,
} from "../dist/cli-helpers.js";

test("maskRevalidateUrl: standardroute visas, allt annat maskas", () => {
  const cases = [
    ["https://kund.se/api/sitecms/revalidate", "https://kund.se/api/sitecms/revalidate"],
    ["https://kund.se/api/sitecms/revalidate/", "https://kund.se/api/sitecms/revalidate"],
    ["https://www.kund.se:8443/api/sitecms/revalidate?secret=x#y", "https://www.kund.se:8443/api/sitecms/revalidate"],
    ["https://api.netlify.com/build_hooks/64f0abc", "https://api.netlify.com/••••"],
    ["https://api.vercel.com/v1/integrations/deploy/prj_1/abc", "https://api.vercel.com/••••"],
    ["https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/abc", "https://api.cloudflare.com/••••"],
    ["https://api.render.com/deploy/srv-abc?key=hemlig", "https://api.render.com/••••"],
    ["https://kund.se/api/revalidate", "https://kund.se/••••"],
    ["https://kund.se/", "https://kund.se/••••"],
    ["https://kund.se/••••", "https://kund.se/••••"],
    ["inte en url", "••••"],
    ["", "••••"],
  ];
  for (const [input, expected] of cases) assert.equal(maskRevalidateUrl(input), expected, input);
});

test("maskUrlsInText: maskar URL:er i fritext och behåller skiljetecken", () => {
  assert.equal(
    maskUrlsInText("Svarade 404 från https://api.netlify.com/build_hooks/abc. Testa https://kund.se/api/sitecms/revalidate, igen"),
    "Svarade 404 från https://api.netlify.com/••••. Testa https://kund.se/api/sitecms/revalidate, igen",
  );
  assert.equal(maskUrlsInText("Inget svar inom 10 sekunder."), "Inget svar inom 10 sekunder.");
});

test("resolveSiteUrl: reglerna per plattform", () => {
  const r = (env) => resolveSiteUrl(env);
  assert.deepEqual(r({}), { siteUrl: null, skipped: [] });
  assert.deepEqual(r({ CMS_SITE_URL: "https://a.se/x", SITE_URL: "https://b.se" }).siteUrl, { url: "https://a.se", source: "CMS_SITE_URL" });
  assert.deepEqual(r({ SITE_URL: "b.se" }).siteUrl, { url: "https://b.se", source: "SITE_URL" });
  assert.equal(r({ NEXT_PUBLIC_SITE_URL: "https://c.se" }).siteUrl, null);

  // Vercel
  assert.equal(r({ VERCEL_PROJECT_PRODUCTION_URL: "k.vercel.app", VERCEL_ENV: "production" }).siteUrl.url, "https://k.vercel.app");
  for (const VERCEL_ENV of ["preview", "development", undefined]) {
    const res = r({ VERCEL_PROJECT_PRODUCTION_URL: "k.vercel.app", VERCEL_ENV });
    assert.equal(res.siteUrl, null, String(VERCEL_ENV));
    assert.equal(res.skipped[0].source, "VERCEL_PROJECT_PRODUCTION_URL");
  }

  // Netlify
  const netlify = { NETLIFY: "true", URL: "https://k.netlify.app" };
  assert.equal(r({ ...netlify, CONTEXT: "production" }).siteUrl.url, "https://k.netlify.app");
  for (const CONTEXT of ["deploy-preview", "branch-deploy", "dev", undefined]) {
    assert.equal(r({ ...netlify, CONTEXT }).siteUrl, null, String(CONTEXT));
  }
  assert.deepEqual(r({ URL: "https://k.netlify.app", CONTEXT: "production" }), { siteUrl: null, skipped: [] }, "URL utan NETLIFY ignoreras");

  // Render
  assert.equal(r({ RENDER_EXTERNAL_URL: "https://k.onrender.com" }).siteUrl.url, "https://k.onrender.com");
  assert.equal(r({ RENDER_EXTERNAL_URL: "https://k.onrender.com", IS_PULL_REQUEST: "false" }).siteUrl.url, "https://k.onrender.com");
  const pr = r({ RENDER_EXTERNAL_URL: "https://k-pr-1.onrender.com", IS_PULL_REQUEST: "true" });
  assert.equal(pr.siteUrl, null);
  assert.match(pr.skipped[0].reason, /IS_PULL_REQUEST=true/);

  // Explicit vinner över en överhoppad preview; ogiltig explicit → nästa.
  const mixed = r({ SITE_URL: "http://[bad", VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "k.vercel.app" });
  assert.deepEqual(mixed.siteUrl, { url: "https://k.vercel.app", source: "VERCEL_PROJECT_PRODUCTION_URL" });
  assert.deepEqual(mixed.skipped, [{ source: "SITE_URL", reason: "ogiltig adress" }]);
});

test("parsePackageJson: BOM hanteras, ogiltig JSON kastar", () => {
  const p = parsePackageJson('﻿{"name":"x"}');
  assert.equal(p.bom, true);
  assert.deepEqual(p.data, { name: "x" });
  assert.equal(parsePackageJson('{"name":"x"}').bom, false);
  assert.throws(() => parsePackageJson("{ name: x }"));
  assert.throws(() => parsePackageJson("[]"), /JSON-objekt/);
});

test("findSyncScript: hittar sync i prebuild, build och andra scripts", () => {
  assert.equal(findSyncScript({ build: "sitecms-next sync && next build" }), "build");
  assert.equal(findSyncScript({ cms: "npx sitecms-next sync", build: "next build" }), "cms");
  assert.equal(findSyncScript({ cms: "sitecms-next sync", prebuild: "sitecms-next sync --strict" }), "prebuild");
  assert.equal(findSyncScript({ build: "next build", check: "sitecms-next check" }), null);
  assert.equal(findSyncScript(undefined), null);
});

test("addSyncToPrebuild: minimal ändring, format bevaras", () => {
  const cases = [
    // [före, efter, resultat]
    [
      '{\n  "scripts": {\n    "dev": "next dev",\n    "build": "next build"\n  }\n}\n',
      '{\n  "scripts": {\n    "dev": "next dev",\n    "prebuild": "sitecms-next sync",\n    "build": "next build"\n  }\n}\n',
      "added",
    ],
    [
      '{\n    "scripts": { "prebuild": "echo \\u0068ej", "build": "next build" },\n    "x": [1, 2,3]\n}',
      '{\n    "scripts": { "prebuild": "echo hej && sitecms-next sync", "build": "next build" },\n    "x": [1, 2,3]\n}',
      "extended",
    ],
    [
      '{\r\n\t"name": "a",\r\n\t"scripts": {\r\n\t\t"dev": "next dev"\r\n\t}\r\n}\r\n',
      '{\r\n\t"name": "a",\r\n\t"scripts": {\r\n\t\t"dev": "next dev",\r\n\t\t"prebuild": "sitecms-next sync"\r\n\t}\r\n}\r\n',
      "added",
    ],
    [
      '﻿{\r\n  "name": "a",\r\n  "scripts": {}\r\n}',
      '﻿{\r\n  "name": "a",\r\n  "scripts": {\r\n    "prebuild": "sitecms-next sync"\r\n  }\r\n}',
      "added",
    ],
    ['{\n  "name": "a"\n}\n', '{\n  "name": "a",\n  "scripts": {\n    "prebuild": "sitecms-next sync"\n  }\n}\n', "added"],
    ['{"name":"a","scripts":{"build":"b"}}', '{"name":"a","scripts":{"prebuild":"sitecms-next sync","build":"b"}}', "added"],
    ['{"name":"a"}', '{"name":"a","scripts":{ "prebuild":"sitecms-next sync" }}', "added"],
    ["{}\n", '{\n  "scripts": {\n    "prebuild": "sitecms-next sync"\n  }\n}\n', "added"],
    [
      '{\n  "scripts": {\n    "prebuild": "",\n    "build": "next build"\n  }\n}',
      '{\n  "scripts": {\n    "prebuild": "sitecms-next sync",\n    "build": "next build"\n  }\n}',
      "extended",
    ],
  ];
  for (const [before, after, result] of cases) {
    const edit = addSyncToPrebuild(before);
    assert.equal(edit.result, result, before);
    assert.equal(edit.text, after, before);
  }

  const ok = '{\n  "scripts": { "build": "sitecms-next sync && next build" }\n}\n';
  assert.deepEqual(addSyncToPrebuild(ok), { result: "ok", foundIn: "build", text: ok });
  const okBom = '﻿{"scripts":{"prebuild":"sitecms-next sync"}}';
  assert.equal(addSyncToPrebuild(okBom).text, okBom);
  assert.throws(() => addSyncToPrebuild('{"name": }'));
});

test("upsertEnvText: lägger till, lämnar orört eller kommenterar ut gammal nyckel", () => {
  const d = "2026-10-21";
  assert.deepEqual(upsertEnvText(null, "CMS_API_KEY", "ny", d), { result: "created", text: "CMS_API_KEY=ny\n", replaced: [] });
  assert.equal(upsertEnvText("A=1", "CMS_API_KEY", "ny", d).text, "A=1\nCMS_API_KEY=ny\n");
  assert.equal(upsertEnvText("A=1\r\n", "CMS_API_KEY", "ny", d).text, "A=1\r\nCMS_API_KEY=ny\r\n");
  assert.equal(upsertEnvText('CMS_API_KEY="ny"\n', "CMS_API_KEY", "ny", d).result, "unchanged");

  const replaced = upsertEnvText("A=1\r\nexport CMS_API_KEY=gammal # kommentar\r\nB=2\r\n", "CMS_API_KEY", "ny", d);
  assert.equal(replaced.result, "replaced");
  assert.deepEqual(replaced.replaced, ["gammal"]);
  assert.equal(
    replaced.text,
    "A=1\r\n# export CMS_API_KEY=gammal # kommentar (ersatt av sitecms-next init 2026-10-21)\r\nexport CMS_API_KEY=ny\r\nB=2\r\n",
  );
  // Den utkommenterade raden räknas inte längre.
  assert.deepEqual(envFileValues(replaced.text, "CMS_API_KEY"), ["ny"]);
  assert.equal(upsertEnvText(replaced.text, "CMS_API_KEY", "ny", d).result, "unchanged");

  // Flera rader: den första ersätts, övriga avvikande kommenteras ut.
  const multi = upsertEnvText("CMS_API_KEY=a\nCMS_API_KEY=b\n", "CMS_API_KEY", "ny", d);
  assert.equal(
    multi.text,
    "# CMS_API_KEY=a (ersatt av sitecms-next init 2026-10-21)\nCMS_API_KEY=ny\n# CMS_API_KEY=b (ersatt av sitecms-next init 2026-10-21)\n",
  );
});
