import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("discover, request, approve, reload", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Request access to Arduino Uno R4 WiFi" })
    .click();
  const form = page.getByRole("dialog");
  await form.getByLabel("Your name").fill("Alex Demo");
  await form.getByLabel("Project title").fill("Campus garden sensor");
  await form
    .getByLabel("Project & equipment requirements")
    .fill("Build an IoT sensor for soil moisture in the campus garden.");
  await form.getByRole("button", { name: "Submit access request" }).click();
  await expect(
    page.getByRole("heading", { name: "Request submitted!" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "View my requests" }).click();
  await page.getByRole("button", { name: "Faculty demo" }).click();
  const card = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "Campus garden sensor" }),
  });
  await card.getByRole("button", { name: "Approve preferred slot" }).click();
  await expect(card.getByText("approved", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /My requests/ }).click();
  await expect(
    page.getByRole("heading", { name: "Campus garden sensor" }),
  ).toBeVisible();
});

test("conflicting request can be approved into a feasible alternative", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Try a scheduling conflict/ }).click();
  const form = page.getByRole("dialog");
  await expect(form.getByText("A scheduling conflict was found")).toBeVisible();
  await form.getByLabel("Your name").fill("Jordan Demo");
  await form.getByLabel("Project title").fill("Signal analysis deadline");
  await form
    .getByLabel("Project & equipment requirements")
    .fill("Analyse an analogue signal for a campus sensor project.");
  await form.getByRole("button", { name: "Submit access request" }).click();
  await page.getByRole("button", { name: "View my requests" }).click();
  await page.getByRole("button", { name: "Faculty demo" }).click();
  const card = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "Signal analysis deadline" }),
  });
  await expect(
    card.getByRole("button", { name: "Approve preferred slot" }),
  ).toBeDisabled();
  await card
    .getByRole("button", { name: /Approve .* at/ })
    .first()
    .click();
  await expect(card.getByText("approved", { exact: true })).toBeVisible();
});

test("has no horizontal overflow or serious accessibility violations", async ({
  page,
}) => {
  await page.goto("/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(result.violations).toEqual([]);
  await page
    .getByRole("button", { name: "Request access to Arduino Uno R4 WiFi" })
    .click();
  const formResult = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(formResult.violations).toEqual([]);
});

test("two tabs cannot approve the same equipment slot", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Faculty demo" }).click();
  await page
    .getByRole("spinbutton", { name: "Arduino Uno R4 WiFi stock" })
    .fill("1");
  await page
    .getByRole("button", { name: "Save stock for Arduino Uno R4 WiFi" })
    .click();
  await expect(
    page.getByText("Equipment stock updated in this browser."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Student view" }).click();
  const other = await context.newPage();
  await other.goto("/");
  for (const tab of [page, other]) {
    await tab
      .getByRole("button", { name: "Request access to Arduino Uno R4 WiFi" })
      .click();
    const form = tab.getByRole("dialog");
    await form.getByLabel("Your name").fill("Concurrency Demo");
    await form
      .getByLabel("Project title")
      .fill(tab === page ? "Concurrent project A" : "Concurrent project B");
    await form
      .getByLabel("Project & equipment requirements")
      .fill("Test a shared equipment slot across two browser tabs.");
    await form.getByRole("button", { name: "Submit access request" }).click();
    await tab.getByRole("button", { name: "View my requests" }).click();
    await tab.getByRole("button", { name: "Faculty demo" }).click();
  }
  const a = page
    .getByRole("article")
    .filter({ hasText: "Concurrent project A" });
  const b = other
    .getByRole("article")
    .filter({ hasText: "Concurrent project B" });
  await Promise.allSettled([
    a
      .getByRole("button", { name: "Approve preferred slot" })
      .click({ timeout: 3000 }),
    b
      .getByRole("button", { name: "Approve preferred slot" })
      .click({ timeout: 3000 }),
  ]);
  const approved = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("lablink-demo-v1")!).requests.filter(
        (r: { project: string; status: string }) =>
          r.project.startsWith("Concurrent project") && r.status === "approved",
      ).length,
  );
  expect(approved).toBe(1);
});
