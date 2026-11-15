import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const html = readFileSync("admin.html", "utf8");
const js = readFileSync("admin.js", "utf8");
const ids = new Set([...html.matchAll(/\\bid="([^"]+)"/g)].map((m) => m[1]));
const refs = [...js.matchAll(/\\$\\(["']([^"']+)["']\\)/g)].map((m) => m[1]);
const missing = [...new Set(refs.filter((id) => !ids.has(id)))];
assert.deepEqual(missing, [], `CRM JS references missing HTML IDs: ${missing.join(", ")}`);
for (const required of ["login-form", "crm-panel", "leads-list", "clients-view", "export-csv", "pipeline-bars"]) {
  assert(ids.has(required), `Missing required CRM element: ${required}`);
}
assert(js.includes("textContent"), "CRM should render untrusted data via textContent");
assert(!js.includes("innerHTML"), "CRM must not inject untrusted data with innerHTML");
console.log(`CRM smoke checks passed: ${ids.size} DOM IDs, ${refs.length} references.`);
