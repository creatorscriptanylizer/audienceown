import { expect, test } from "@playwright/test";

test("Stage 1 keyboard selection, focus, and semantics", async ({ page }) => {
  const errors: string[] = [];
  page.on(
    "console",
    (message) => message.type() === "error" && errors.push(message.text()),
  );
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => localStorage.clear());
  await page.goto("/c/recovery-acceptance");

  for (const name of ["KwaMoon", "nana_friggy", "Lineconomy"]) {
    const checkbox = page.getByRole("checkbox", { name: new RegExp(name) });
    await expect(checkbox).toHaveCount(1);
    await checkbox.focus();
    await expect(checkbox).toBeFocused();
    await page.keyboard.press("Space");
    await expect(checkbox).toBeChecked();
  }

  expect(
    await page.evaluate(() =>
      localStorage.getItem("audienceown:recovery-flow:recovery-acceptance"),
    ),
  ).not.toBeNull();
  expect(errors).toEqual([]);
  const continueButton = page.getByRole("button", { name: /Continue/ });
  await expect(continueButton).toBeEnabled();
  await continueButton.focus();
  await expect(continueButton).toBeFocused();
});
