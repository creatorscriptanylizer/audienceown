import { expect, test, type Page } from "@playwright/test";

const email = process.env.UI_VISUAL_EMAIL;
const password = process.env.UI_VISUAL_PASSWORD;
const publicSlug = process.env.UI_VISUAL_PUBLIC_SLUG;

async function settle(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.addStyleTag({ content: "*,*::before,*::after{caret-color:transparent!important;animation:none!important;transition:none!important}" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    document.querySelectorAll(".protection-landing .landing-section, .protection-landing .final-cta")
      .forEach((element) => element.classList.add("is-revealed"));
    window.scrollTo(0, 0);
  });
}

async function login(page: Page) {
  if (!email || !password) throw new Error("Authorized UI_VISUAL_EMAIL and UI_VISUAL_PASSWORD are required.");
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await Promise.all([page.waitForURL(/\/(dashboard|onboarding)/), page.getByRole("button", { name: /log in/i }).click()]);
  if (!page.url().includes("/dashboard")) throw new Error("Visual fixture must be an onboarding-complete creator.");
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { Date.now = () => 1_800_000_000_000; });
});

test("landing canonical production route", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await settle(page);
  await expect(page).toHaveScreenshot("landing.png", { fullPage: true });
});

for (const [name, route] of [
  ["dashboard", "/dashboard"],
  ["updates", "/dashboard/updates"],
  ["platforms-recovery-networks", "/dashboard/platforms"],
  ["audience", "/dashboard/audience"],
  ["verified-identity", "/dashboard/verified-identity"],
] as const) {
  test(`${name} canonical production route`, async ({ page }) => {
    test.skip(!email || !password, "Authorized visual-test credentials were not supplied.");
    await login(page);
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    const finalRoute = route === "/dashboard/verified-identity" ? "/dashboard/authenticity" : route;
    await expect(page).toHaveURL(new RegExp(`${finalRoute.replaceAll("/", "\\/")}$`));
    await settle(page);
    await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true });
  });
}

test("register canonical production route", async ({ page }) => {
  const response = await page.goto("/register");
  expect(response?.status()).toBe(200);
  await settle(page);
  await expect(page).toHaveScreenshot("register.png", { fullPage: true });
});

test("public Recovery Pass canonical production route", async ({ page }) => {
  test.skip(!publicSlug, "UI_VISUAL_PUBLIC_SLUG is required for a real public Recovery Pass baseline.");
  const response = await page.goto(`/c/${publicSlug}`);
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(new RegExp(`/c/${publicSlug}$`));
  await settle(page);
  await expect(page).toHaveScreenshot("public-recovery-pass.png", { fullPage: true });
});
