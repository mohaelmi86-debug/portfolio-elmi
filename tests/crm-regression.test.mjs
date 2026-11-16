import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const read = (p) => readFileSync(p, "utf8");
const html = read("admin.html");
const js = read("admin.js");
const edge = read("supabase/functions/admin-leads/index.ts");

test("CRM page includes the main authenticated workspace and navigation", () => {
  for (const id of ["login-form", "crm-panel", "leads-list", "clients-view", "export-csv", "pipeline-bars"]) {
    assert.ok(html.includes(`id="${id}"`) || html.includes(`id='${id}'`), `Missing ${id}`);
  }
});

test("all direct CRM DOM selectors resolve to an HTML id", () => {
  const ids = new Set([...html.matchAll(/\\bid=["\\']([^"\\']+)["\\']/g)].map(m => m[1]));
  const refs = [...js.matchAll(/\\$\\(["\\']([^"\\']+)["\\']\\)/g)].map(m => m[1]);
  assert.deepEqual([...new Set(refs.filter(id => !ids.has(id)))], []);
});

test("CRM avoids unsafe HTML injection for data rendering", () => {
  assert.match(js, /textContent/);
  assert.doesNotMatch(js, /innerHTML/);
});

test("client CRUD actions are wired in frontend and Edge Function", () => {
  assert.match(js, /create_client/);
  assert.match(js, /update_client/);
  assert.match(edge, /create_client/);
  assert.match(edge, /update_client/);
});

test("quotes, invoices, payments and documents have frontend/API wiring", () => {
  for (const term of ["quote", "invoice", "payment", "document"]) {
    assert.match(js.toLowerCase(), new RegExp(term), `Missing frontend ${term}`);
    assert.match(edge.toLowerCase(), new RegExp(term), `Missing API ${term}`);
  }
});

test("Supabase function and Netlify configuration are present", () => {
  assert.ok(existsSync("supabase/functions/admin-leads/index.ts"));
  assert.ok(existsSync("netlify.toml"));
  assert.match(read("netlify.toml"), /publish\\s*=\\s*["']\\.["']/);
});
