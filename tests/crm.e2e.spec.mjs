import { test, expect } from "@playwright/test";

const origin = "http://127.0.0.1:4173";
const mockSupabase = `
export function createClient() {
  let user = null;
  const session = { access_token: "e2e-test-token" };
  return {
    auth: {
      async getSession() { return { data: { session: user ? { ...session, user } : null } }; },
      async signInWithPassword({ email, password }) {
        if (email === "admin@example.test" && password === "CorrectHorse123!") {
          user = { id: "test-admin", email };
          return { data: { user }, error: null };
        }
        return { data: { user: null }, error: { message: "Identifiants invalides" } };
      },
      async signOut() { user = null; return { error: null }; }
    }
  };
}`;

test.beforeEach(async ({ page }) => {
  await page.route("https://esm.sh/@supabase/supabase-js@2.57.0", route =>
    route.fulfill({ status: 200, contentType: "application/javascript", body: mockSupabase })
  );
  await page.addInitScript(() => {
    window.PORTFOLIO_CONFIG = {
      supabaseUrl: "https://mock-project.supabase.co",
      supabaseAnonKey: "test-anon-key"
    };
  });
});

test("affiche la connexion et refuse un mot de passe invalide", async ({ page }) => {
  await page.goto(origin + "/admin.html");
  await expect(page.getByRole("heading", { name: "Connexion administrateur" })).toBeVisible();
  await page.locator("#email").fill("admin@example.test");
  await page.locator("#password").fill("incorrect");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.locator("#login-message")).toContainText("Identifiants invalides");
  await expect(page.locator("#crm-panel")).toBeHidden();
});

test("connecte un administrateur simulé et affiche les demandes CRM", async ({ page }) => {
  await page.route("https://mock-project.supabase.co/functions/v1/admin-leads**", async route => {
    const request = route.request();
    if (request.method() === "PATCH") {
      return route.fulfill({ json: { stats: { new: 1, contacted: 0, qualified: 0, proposal: 0, won: 0, lost: 0 }, total: 1 } });
    }
    if (new URL(request.url()).searchParams.has("finance")) {
      return route.fulfill({ json: { data: { total_invoiced: 0, collected: 0, outstanding: 0, overdue_amount: 0, overdue_count: 0, quotes_total: 0 } } });
    }
    return route.fulfill({ json: { data: [{
      id: "lead-e2e-1", name: "Prospect de test", email: "prospect@example.test",
      status: "new", pipeline_stage: "new", message: "Demande de démonstration",
      created_at: "2026-11-16T10:00:00.000Z"
    }], count: 1, newCount: 1 } });
  });

  await page.goto(origin + "/admin.html");
  await page.locator("#email").fill("admin@example.test");
  await page.locator("#password").fill("CorrectHorse123!");
  await page.getByRole("button", { name: "Se connecter" }).click();

  await expect(page.locator("#crm-panel")).toBeVisible();
  await expect(page.locator("#admin-email")).toHaveText("admin@example.test");
  await expect(page.locator("#leads-list")).toContainText("Prospect de test");
  await expect(page.locator("#leads-list")).toContainText("Demande de démonstration");

  await page.getByRole("button", { name: "Déconnexion" }).click();
  await expect(page.locator("#login-panel")).toBeVisible();
  await expect(page.locator("#crm-panel")).toBeHidden();
});

test("affiche proprement une erreur API sans injecter de contenu HTML", async ({ page }) => {
  await page.route("https://mock-project.supabase.co/functions/v1/admin-leads**", route =>
    route.fulfill({ status: 500, json: { error: "<img src=x onerror=alert(1)> API indisponible" } })
  );
  await page.goto(origin + "/admin.html");
  await page.locator("#email").fill("admin@example.test");
  await page.locator("#password").fill("CorrectHorse123!");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.locator("#load-message")).toContainText("API indisponible");
  await expect(page.locator("#load-message img")).toHaveCount(0);
});
