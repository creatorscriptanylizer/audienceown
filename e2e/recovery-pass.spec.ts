import { createHash, randomUUID, webcrypto } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

loadEnvConfig(process.cwd(), true);
const serviceKey =
  process.env.SUPABASE_ADMIN_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY;
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !serviceKey)
  throw new Error("Local Supabase acceptance configuration is required.");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const creatorId = "ac000000-0000-4000-8000-000000000001",
  slug = "recovery-acceptance",
  code = "246810";
const screenshotRoot = (info: TestInfo) =>
  `test-results/recovery-pass/${info.project.name.replace("-", "/")}`;
async function encrypt(value: string) {
  const secret = process.env.CONTACT_ENCRYPTION_KEY!;
  const iv = webcrypto.getRandomValues(new Uint8Array(12)),
    key = await webcrypto.subtle.importKey(
      "raw",
      await webcrypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(secret),
      ),
      "AES-GCM",
      false,
      ["encrypt"],
    ),
    cipher = new Uint8Array(
      await webcrypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        new TextEncoder().encode(value),
      ),
    );
  return Buffer.concat([Buffer.from(iv), Buffer.from(cipher)]).toString(
    "base64",
  );
}
async function installOtpProvider(page: Page, email: string) {
  await page.route(
    "**/api/public/recovery-pass/email-verification",
    async (route) => {
      const body = route.request().postDataJSON() as {
        action: string;
        email?: string;
      };
      if (body.action === "verify") return route.continue();
      const challengeId = randomUUID(),
        pepper = process.env.EMAIL_OTP_PEPPER!,
        emailHash = createHash("sha256").update(email).digest("hex"),
        codeHash = createHash("sha256")
          .update(`${pepper}:${challengeId}:${code}`)
          .digest("hex"),
        now = Date.now();
      await db
        .from("email_verification_challenges")
        .update({ replaced_at: new Date().toISOString() })
        .eq("creator_id", creatorId)
        .eq("email_hash", emailHash)
        .is("completed_at", null)
        .is("cancelled_at", null)
        .is("replaced_at", null);
      const inserted = await db
        .from("email_verification_challenges")
        .insert({
          id: challengeId,
          creator_id: creatorId,
          email_hash: emailHash,
          email_ciphertext: await encrypt(email),
          email_masked: `a•••••@example.invalid`,
          code_hash: codeHash,
          source_platform: "direct",
          landing_path: `/c/${slug}`,
          expires_at: new Date(now + 600000).toISOString(),
          resend_available_at: new Date(now + 30000).toISOString(),
        });
      expect(inserted.error).toBeNull();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          kind: "verification_sent",
          challengeId,
          masked: "a•••••@example.invalid",
          resendAfterSeconds: 30,
        }),
      });
    },
  );
}
async function card(page: Page, name: string) {
  return page
    .locator("label")
    .filter({ has: page.getByText(name, { exact: true }) });
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { localStorage.clear(); sessionStorage.clear(); });
});
async function completeToStageFive(
  page: Page,
  info: TestInfo,
  pushGuidance?: RegExp,
) {
  const email = `acceptance-${info.project.name}-${Date.now()}@example.invalid`;
  await installOtpProvider(page, email);
  await page.goto(`/c/${slug}`);
  await expect(
    page.getByRole("heading", { name: "Build your connection" }),
  ).toBeVisible();
  await expect(page.locator(".rp-header")).toBeVisible();
  await expect(page.locator("aside")).toHaveCount(0);
  await expect(
    page.getByText(/Complete your Recovery Pass to stay connected with Nana/),
  ).toBeVisible();
  const continueButton = page.getByRole("button", { name: /Continue/ });
  await expect(continueButton).toBeDisabled();
  for (const name of ["KwaMoon", "nana_friggy", "Lineconomy"])
    await (await card(page, name)).click();
  await expect(continueButton).toBeEnabled();
  await noOverflow(page);
  await page.screenshot({
    path: `${screenshotRoot(info)}/stage-1.png`,
    fullPage: true,
  });
  await continueButton.click();
  await expect(
    page.getByRole("heading", { name: "Create your direct connection" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Back/ }).click();
  for (const name of ["KwaMoon", "nana_friggy", "Lineconomy"])
    await expect(
      (await card(page, name)).locator('input[type="checkbox"]'),
    ).toBeChecked();
  await continueButton.click();
  await expect(page.getByText("YOUR DIRECT CONNECTION", { exact: true })).toBeVisible();
  await expect(
    page.getByText(/This is how Nana can reach you if something happens/),
  ).toBeVisible();
  const emailInput = page.getByRole("textbox", { name: "Email address" });
  await emailInput.fill("invalid");
  await expect(continueButton).toBeDisabled();
  await emailInput.fill(email);
  await expect(continueButton).toBeEnabled();
  await noOverflow(page);
  await page.screenshot({
    path: `${screenshotRoot(info)}/stage-2.png`,
    fullPage: true,
  });
  await continueButton.click();
  await expect(page.getByText("a•••••@example.invalid")).toBeVisible();
  const otp = page.getByRole("textbox", { name: "Email verification code" });
  await otp.fill("000000");
  await page.getByRole("button", { name: "Verify Email" }).click();
  await expect(page.getByText("That code doesn't match. Check the code in your Email and try again.")).toBeVisible();
  await page.screenshot({
    path: `${screenshotRoot(info)}/error-state.png`,
    fullPage: true,
  });
  await otp.fill(code);
  await page.getByRole("button", { name: "Verify Email" }).click();
  await expect(page.getByText("Email verified")).toBeVisible();
  await page.screenshot({
    path: `${screenshotRoot(info)}/stage-3.png`,
    fullPage: true,
  });
  await continueButton.click();
  await expect(
    page.getByRole("heading", { name: "Choose what Nana can tell you" }),
  ).toBeVisible();
  const recovery = page.getByRole("checkbox", { name: /Recovery alerts/ });
  await expect(recovery).toBeChecked();
  await expect(page.getByText("RECOMMENDED")).toBeVisible();
  await recovery.uncheck();
  await expect(continueButton).toBeDisabled();
  await expect(
    page.getByText(/Recovery alerts are required because/),
  ).toBeVisible();
  await recovery.check();
  for (const option of [
    "New videos",
    "Livestreams",
    "Podcast episodes",
    "Product releases",
    "Events",
    "Announcements",
  ])
    await expect(
      page.getByRole("checkbox", { name: new RegExp(option) }),
    ).not.toBeChecked();
  await expect(page.getByText("GET UPDATES INSTANTLY")).toHaveCount(0);
  for (const option of ["New videos", "Livestreams", "Announcements"])
    await page.getByRole("checkbox", { name: new RegExp(option) }).check();
  await expect(page.getByText("GET UPDATES INSTANTLY")).toBeVisible();
  await expect(page.getByText(/without waiting for Email/)).toBeVisible();
  if (pushGuidance) {
    await expect(page.getByText(pushGuidance)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Enable push notifications" }),
    ).toBeDisabled();
  }
  const pushButton = page.getByRole("button", {
    name: "Enable push notifications",
  });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(100);
  const [pushBox, footerBox] = await Promise.all([
    pushButton.boundingBox(),
    page.locator(".rp-sticky").boundingBox(),
  ]);
  expect(pushBox).not.toBeNull();
  expect(footerBox).not.toBeNull();
  expect(pushBox!.y + pushBox!.height).toBeLessThanOrEqual(footerBox!.y);
  await page.screenshot({
    path: `${screenshotRoot(info)}/stage-4-push-viewport.png`,
  });
  await page.screenshot({
    path: `${screenshotRoot(info)}/stage-4.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: /Back/ }).click();
  await continueButton.click();
  for (const option of ["New videos", "Livestreams", "Announcements"])
    await expect(
      page.getByRole("checkbox", { name: new RegExp(option) }),
    ).toBeChecked();
  await continueButton.click();
  await expect(page.getByText("Recovery alerts · Required")).toBeVisible();
  for (const option of ["New videos", "Livestreams", "Announcements"])
    await expect(page.getByText(option, { exact: true })).toBeVisible();
  for (const option of ["Podcast episodes", "Product releases", "Events"])
    await expect(page.getByText(option, { exact: true })).toHaveCount(0);
  await expect(page.getByText("Email · Verified")).toBeVisible();
  await expect(page.getByText(/Push notifications · Enabled/)).toHaveCount(0);
  await page.screenshot({
    path: `${screenshotRoot(info)}/stage-5.png`,
    fullPage: true,
  });
  return { email };
}

test.describe("live Recovery Pass acceptance", () => {
  test("six-stage flow, persistence, failure retry, and selected platform actions", async ({
    page,
    browser,
  }, info) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));
    const { email } = await completeToStageFive(page, info);
    let failActivation = true;
    await page.route("**/api/public/recovery-pass/activate", async (route) => {
      if (failActivation) {
        failActivation = false;
        return route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            kind: "validation_error",
            message: "Controlled activation failure.",
          }),
        });
      }
      return route.continue();
    });
    await page
      .getByRole("button", { name: /Activate my Recovery Pass/ })
      .click();
    await expect(
      page.getByText("Controlled activation failure."),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Protect your connection" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: /Activate my Recovery Pass/ })
      .click();
    await expect(page.getByText("Recovery Pass active")).toBeVisible();
    const managementCookie = (await page.context().cookies()).find(
      (cookie) => cookie.name === `ao_rp_${slug}`,
    );
    expect(managementCookie).toMatchObject({
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    });
    expect(managementCookie!.expires).toBeGreaterThan(Date.now() / 1000);
    await expect(
      page.getByRole("heading", {
        name: "Your connection to Nana is protected.",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Subscribe on YouTube/ }),
    ).toHaveCount(2);
    await expect(
      page.getByRole("link", { name: /Follow on Instagram/ }),
    ).toHaveCount(1);
    await expect(page.getByText("WatchBoost", { exact: true })).toHaveCount(0);
    await expect(page.getByText("NPA", { exact: true })).toHaveCount(0);
    await page.screenshot({
      path: `${screenshotRoot(info)}/stage-6.png`,
      fullPage: true,
    });
    const returnTab = await page.context().newPage();
    await returnTab.goto(`/c/${slug}`);
    await expect(
      returnTab.getByRole("heading", { name: "Your Recovery Pass with Nana" }),
    ).toBeVisible();
    await returnTab.close();
    const cleanContext = await browser.newContext();
    const cleanPage = await cleanContext.newPage();
    await cleanPage.goto(new URL(`/c/${slug}`, page.url()).toString());
    await expect(
      cleanPage.getByRole("heading", { name: "Build your connection" }),
    ).toBeVisible();
    await cleanContext.close();
    const emailHash = createHash("sha256").update(email).digest("hex"),
      { data: contact } = await db
        .from("follower_contacts")
        .select("id")
        .eq("email_hash", emailHash)
        .single(),
      { data: connection } = await db
        .from("follower_connections")
        .select("id,status")
        .eq("creator_id", creatorId)
        .eq("follower_contact_id", contact!.id)
        .single();
    expect(connection?.status).toBe("active");
    const { data: preferences } = await db
        .from("follower_category_preferences")
        .select("category_key,enabled")
        .eq("follower_connection_id", connection!.id),
      enabled = new Set(
        preferences
          ?.filter((item) => item.enabled)
          .map((item) => item.category_key),
      );
    expect(enabled).toEqual(
      new Set(["recovery", "videos", "livestreams", "announcements"]),
    );
    await page.getByRole("button", { name: "Manage my preferences" }).click();
    await expect(
      page.getByRole("heading", { name: "Your Recovery Pass with Nana" }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Your Recovery Pass with Nana" }),
    ).toBeVisible();
    await expect(page.getByText("Recovery alerts · Required")).toBeVisible();
    await page.screenshot({
      path: `${screenshotRoot(info)}/manage-preferences.png`,
      fullPage: true,
    });
    await noOverflow(page);
    const revoked = await db
      .from("follower_connections")
      .update({ management_tokens_revoked_at: new Date().toISOString() })
      .eq("id", connection!.id);
    expect(revoked.error).toBeNull();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Build your connection" }),
    ).toBeVisible();
    await expect(page.getByText(email)).toHaveCount(0);
    expect(
      errors.filter(
        (error) =>
          !/favicon|controlled activation|server responded with a status of 400/i.test(
            error,
          ),
      ),
    ).toEqual([]);
  });
});

test("Push denied remains optional", async ({
  page,
  browserName,
}, info) => {
  test.skip(
    browserName !== "chromium",
    "Capability simulation is covered once in Chromium.",
  );
  await page.addInitScript(() => {
    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: {
        permission: "denied",
        requestPermission: () => {
          throw new Error("must not reprompt");
        },
      },
    });
    Object.defineProperty(window, "PushManager", {
      configurable: true,
      value: class {},
    });
  });
  await completeToStageFive(page, info, /blocked in your browser settings/);
  await page.screenshot({
    path: `${screenshotRoot(info)}/push-denied.png`,
    fullPage: true,
  });
});

test("Push unsupported remains optional", async ({ page, browserName }, info) => {
  test.skip(
    browserName !== "chromium",
    "Capability simulation is covered once in Chromium.",
  );
  await page.addInitScript(() => {
    Reflect.deleteProperty(window, "PushManager");
  });
  await completeToStageFive(page, info, /aren't supported on this device/);
  await page.screenshot({
    path: `${screenshotRoot(info)}/push-unsupported.png`,
    fullPage: true,
  });
});
