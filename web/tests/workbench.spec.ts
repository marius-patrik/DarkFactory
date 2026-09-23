import { expect, test, type Page } from "@playwright/test";
import {
  BASE_SHA,
  installGithubMock,
  MOCK_REPOSITORY,
} from "./github-mock";

type Surface = "primary" | "main" | "secondary" | "panel";

const surface = (page: Page, name: Surface) =>
  page.locator(`[data-workbench-surface="${name}"]`);

const tab = (page: Page, name: Surface, label: string) =>
  surface(page, name).locator(".dv-tab").filter({ hasText: label }).first();

async function dragTab(page: Page, from: Surface, label: string, to: Surface) {
  const source = tab(page, from, label);
  const target = surface(page, to);
  await expect(source).toBeVisible();
  await expect(target).toBeVisible();
  const targetBox = await target.boundingBox();
  if (!targetBox) throw new Error(`missing drag geometry for ${from} -> ${to}`);

  await source.dragTo(target, {
    force: true,
    targetPosition: {
      x: Math.max(20, Math.min(targetBox.width - 20, targetBox.width / 2)),
      y: Math.max(20, Math.min(targetBox.height - 20, targetBox.height / 2)),
    },
  });

  await expect.poll(async () => surface(page, from).getAttribute("data-workbench-dnd-stage")).toMatch(/source/);
  await expect(surface(page, to)).toHaveAttribute("data-workbench-dnd-stage", /^moved:/);
  await expect(tab(page, to, label)).toBeVisible();
  await expect(tab(page, from, label)).toHaveCount(0);
}

async function openCommand(page: Page, label: string) {
  const omnibar = page.getByLabel("Workbench omnibar");
  await omnibar.fill(`>${label}`);
  await omnibar.press("Enter");
}

async function openFromLauncher(page: Page, label: string) {
  const launcher = surface(page, "main").getByRole("button", { name: "Open tab launcher" }).last();
  await launcher.click();
  await page.getByRole("menuitem", { name: label, exact: true }).click();
}

async function seedAuthenticatedSession(page: Page) {
  await page.evaluate(() => {
    sessionStorage.setItem("workbench-github-token", JSON.stringify({ token: "test-token" }));
  });
  await page.reload();
  await expect(page.getByTitle("Sign out")).toBeVisible();
}

async function openPrivateRepository(page: Page) {
  await page.getByRole("button", { name: /Open Repository/ }).first().click();
  await page.getByRole("textbox", { name: "Repository" }).fill(MOCK_REPOSITORY);
  await page.getByRole("button", { name: "Open", exact: true }).click();
  await expect(page.locator(".workspace-repository-button")).toContainText(MOCK_REPOSITORY);
}

async function editActiveMonaco(page: Page, value: string) {
  const editor = surface(page, "main").locator(".monaco-editor").last();
  await expect(editor).toBeVisible();
  await editor.click();
  await page.keyboard.press("Control+a");
  await page.keyboard.insertText(value);
  await page.waitForTimeout(450);
}

async function stageAndCommit(page: Page, message: string) {
  await tab(page, "primary", "Source Control").click();
  const row = surface(page, "primary").locator(".scm-change-row").filter({ hasText: "README.md" });
  await expect(row).toBeVisible();
  await row.getByTitle("Stage", { exact: true }).click();
  await expect(row.getByTitle("Unstage", { exact: true })).toBeVisible();

  await row.getByTitle("Unstage", { exact: true }).click();
  await expect(row.getByTitle("Stage", { exact: true })).toBeVisible();
  await row.getByTitle("Stage", { exact: true }).click();

  const messageBox = surface(page, "primary").getByLabel("Commit message");
  await messageBox.fill(message);
  await surface(page, "primary").getByRole("button", { name: /Commit staged/ }).click();
  await expect(surface(page, "primary").getByText(message, { exact: true })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
});

test("root regions resize, clamp, hide/show, and persist", async ({ page }) => {
  const shell = page.locator(".workbench-shell");

  const readSize = async (name: "primary" | "secondary" | "panel") =>
    shell.evaluate((element, property) =>
      Number.parseFloat(getComputedStyle(element).getPropertyValue(`--${property}-size`)),
    name);

  const dragSeparator = async (label: string, dx: number, dy: number) => {
    const separator = page.getByRole("separator", { name: label });
    const box = await separator.boundingBox();
    if (!box) throw new Error(`${label} is not visible`);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await expect(shell).toHaveClass(/root-resizing/);
    await page.mouse.move(box.x + box.width / 2 + dx, box.y + box.height / 2 + dy, { steps: 6 });
    await page.mouse.up();
  };

  const primaryBefore = await readSize("primary");
  await dragSeparator("Resize Primary Sidebar", 54, 0);
  await expect.poll(() => readSize("primary")).toBeGreaterThan(primaryBefore + 35);
  const primary = await readSize("primary");

  await page.getByTitle(/Toggle Secondary Sidebar/).click();
  const secondaryBefore = await readSize("secondary");
  await dragSeparator("Resize Secondary Sidebar", -44, 0);
  await expect.poll(() => readSize("secondary")).toBeGreaterThan(secondaryBefore + 25);
  const secondary = await readSize("secondary");

  const panelBefore = await readSize("panel");
  await dragSeparator("Resize Panel", 0, -38);
  await expect.poll(() => readSize("panel")).toBeGreaterThan(panelBefore + 20);
  const panel = await readSize("panel");

  await page.getByTitle(/Toggle Primary Sidebar/).click();
  await expect(page.getByRole("separator", { name: "Resize Primary Sidebar" })).toBeHidden();
  await page.getByTitle(/Toggle Primary Sidebar/).click();
  await page.getByTitle(/Toggle Panel/).click();
  await expect(page.getByRole("separator", { name: "Resize Panel" })).toBeHidden();
  await page.getByTitle(/Toggle Panel/).click();

  expect(Math.abs(await readSize("primary") - primary)).toBeLessThan(2);
  expect(Math.abs(await readSize("secondary") - secondary)).toBeLessThan(2);
  expect(Math.abs(await readSize("panel") - panel)).toBeLessThan(2);

  await page.reload();
  expect(Math.abs(await readSize("primary") - primary)).toBeLessThan(2);
  expect(Math.abs(await readSize("secondary") - secondary)).toBeLessThan(2);
  expect(Math.abs(await readSize("panel") - panel)).toBeLessThan(2);

  await page.setViewportSize({ width: 640, height: 640 });
  await expect.poll(async () => (await surface(page, "main").boundingBox())?.width ?? 0)
    .toBeGreaterThanOrEqual(290);
});

test("tabs move across root Dockview surfaces, existing groups, splits, and reload", async ({ page }) => {
  await page.getByTitle(/Toggle Secondary Sidebar/).click();

  await dragTab(page, "primary", "Explorer", "main");
  await dragTab(page, "main", "Explorer", "secondary");
  await dragTab(page, "secondary", "Explorer", "panel");

  await surface(page, "main").getByRole("button", { name: "Browser", exact: true }).click();
  await expect(tab(page, "main", "Browser")).toBeVisible();

  await tab(page, "panel", "Explorer").dragTo(tab(page, "main", "Browser"), { force: true });
  await expect(tab(page, "main", "Explorer")).toBeVisible();
  await expect(tab(page, "panel", "Explorer")).toHaveCount(0);

  await dragTab(page, "main", "Explorer", "panel");

  const mainDock = surface(page, "main").locator(".workbench-dockview");
  const dockBox = await mainDock.boundingBox();
  if (!dockBox) throw new Error("main Dockview is not visible");
  await tab(page, "panel", "Explorer").dragTo(mainDock, {
    force: true,
    targetPosition: { x: Math.max(4, dockBox.width - 8), y: Math.max(20, dockBox.height / 2) },
  });
  await expect(tab(page, "main", "Explorer")).toBeVisible();
  await expect(tab(page, "panel", "Explorer")).toHaveCount(0);
  await expect(surface(page, "main").locator(".dv-groupview")).toHaveCount(2);

  await page.reload();
  await expect(tab(page, "main", "Explorer")).toBeVisible();
  await expect(tab(page, "main", "Browser")).toBeVisible();
  await expect(surface(page, "main").locator(".dv-groupview")).toHaveCount(2);
});

test("anonymous public repository and Browser history/reload/blocked fallback work", async ({ page }) => {
  await page.route("https://example.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<html><body>example</body></html>" }),
  );
  await page.route("https://example.org/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<html><body>example org</body></html>" }),
  );
  await page.route("https://blocked.example/**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 12_000));
    await route.abort("failed");
  });

  await page.getByRole("button", { name: /Open Repository/ }).first().click();
  await page.getByRole("textbox", { name: "Repository" }).fill("marius-patrik/DarkFactory-Paper");
  await page.getByRole("button", { name: "Open", exact: true }).click();
  await expect(page.locator(".workspace-repository-button")).toContainText("marius-patrik/DarkFactory-Paper", {
    timeout: 20_000,
  });

  await openCommand(page, "Open Browser");
  await expect(tab(page, "main", "Browser")).toBeVisible();

  const browser = surface(page, "main").locator(".browser-tab");
  const location = browser.getByRole("textbox", { name: "URL" });
  await location.fill("https://example.com");
  await location.press("Enter");
  await expect(browser.getByRole("button", { name: "Back" })).toBeEnabled();

  await location.fill("https://example.org");
  await location.press("Enter");
  await browser.getByRole("button", { name: "Back" }).click();
  await expect(location).toHaveValue(/example\.com/);

  await expect(browser.getByRole("button", { name: "Reload" })).toBeVisible();
  await browser.getByRole("button", { name: "Reload" }).click();

  await location.fill("https://blocked.example");
  await location.press("Enter");
  await expect(browser.getByText(/may block iframes/i)).toBeVisible({ timeout: 12_000 });
  await expect(browser.getByRole("link", { name: "Open externally" }).first()).toHaveAttribute("href", /blocked\.example/);
});

test("GitHub sign-in covers start, pending, success, denial, expiry, and sign-out", async ({ page }) => {
  await installGithubMock(page);
  await page.route("https://github.com/login/oauth/authorize**", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<html><body>Mock GitHub authorization</body></html>" }),
  );

  await page.getByRole("button", { name: /Open Repository/ }).first().click();
  const signIn = page.getByRole("button", { name: "Sign in with GitHub" });
  await expect(signIn).toBeEnabled();
  await signIn.click();
  await expect(page).toHaveURL(/github\.com\/login\/oauth\/authorize/);

  const authorize = new URL(page.url());
  expect(authorize.searchParams.get("client_id")).toBe("test-client-id");
  expect(authorize.searchParams.get("code_challenge_method")).toBe("S256");
  expect(authorize.searchParams.get("code_challenge")).toBeTruthy();
  expect(authorize.searchParams.get("state")).toBeTruthy();

  await page.goBack();
  const pending = await page.evaluate(() => JSON.parse(sessionStorage.getItem("workbench-github-auth-result") || "{}"));
  expect(pending.phase).toBe("pending");
  const transaction = await page.evaluate(() => JSON.parse(sessionStorage.getItem("workbench-github-auth-transaction") || "{}"));
  expect(transaction.state).toBeTruthy();

  await page.goto(`/?code=test-code&state=${encodeURIComponent(transaction.state)}`);
  await expect(page.getByTitle("Sign out")).toContainText("octocat");
  await expect.poll(async () => page.evaluate(() => {
    const raw = sessionStorage.getItem("workbench-github-auth-result");
    return raw ? JSON.parse(raw).phase : "";
  })).toBe("success");

  await page.getByRole("button", { name: "Close" }).click();
  await page.getByTitle("Sign out").click();
  await expect(page.getByTitle("Sign in with GitHub")).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem("workbench-github-token"))).toBeNull();

  await page.goto("/?error=access_denied&error_description=Denied");
  await expect.poll(async () => page.evaluate(() => {
    const raw = sessionStorage.getItem("workbench-github-auth-result");
    return raw ? JSON.parse(raw).phase : "";
  })).toBe("denied");

  await page.goto("/");
  await page.evaluate(() => {
    sessionStorage.setItem("workbench-github-auth-transaction", JSON.stringify({
      state: "expired-state",
      verifier: "verifier",
      redirectUri: window.location.href,
      createdAt: 1,
    }));
  });
  await page.goto("/?code=expired&state=expired-state");
  await expect.poll(async () => page.evaluate(() => {
    const raw = sessionStorage.getItem("workbench-github-auth-result");
    return raw ? JSON.parse(raw).phase : "";
  })).toBe("expired");
});

test("authenticated private repo supports dirty edits, staging, local commit, push, and divergence", async ({ page }) => {
  const github = await installGithubMock(page);
  await seedAuthenticatedSession(page);
  await openPrivateRepository(page);

  await tab(page, "primary", "Explorer").click();
  await surface(page, "primary").getByTitle("README.md").click();
  await expect(tab(page, "main", "README.md")).toBeVisible();
  await editActiveMonaco(page, "# Changed in browser\n");

  await stageAndCommit(page, "browser commit");
  const push = surface(page, "primary").getByTitle("Push local commits");
  await expect(push).toBeEnabled();
  await push.click();
  await expect.poll(() => github.state.pushed).toBe(true);
  expect(github.state.writes).toEqual(expect.arrayContaining(["blob", "tree", "commit", "ref-update"]));
  await expect(surface(page, "primary").getByText("No local changes.")).toBeVisible();

  await tab(page, "main", "README.md").click();
  await editActiveMonaco(page, "# Divergent local change\n");
  await stageAndCommit(page, "divergent commit");

  github.setRemoteHead("9999999999999999999999999999999999999999");
  await surface(page, "primary").getByTitle("Fetch remote").click();
  await expect(surface(page, "primary").getByText(/Remote moved from/)).toBeVisible();
  await expect(surface(page, "primary").getByTitle("Push local commits")).toBeDisabled();
});

test("GitHub entity surfaces and omnibar navigate files, symbols, entities, commands, and refs", async ({ page }) => {
  await installGithubMock(page);
  await seedAuthenticatedSession(page);
  await openPrivateRepository(page);

  await openCommand(page, "Open Issues");
  await expect(surface(page, "main").getByText("#7 Private issue", { exact: true }).last()).toBeVisible();

  await openCommand(page, "Open Pull Requests");
  await expect(surface(page, "main").getByText("Private pull request")).toBeVisible();

  await openCommand(page, "Open Actions");
  await expect(surface(page, "main").getByText("Validate private repository", { exact: true }).last()).toBeVisible();

  await openFromLauncher(page, "Projects");
  await expect(surface(page, "main").getByText("#1 Private project", { exact: true })).toBeVisible();

  await openFromLauncher(page, "Branches & Tags");
  await expect(surface(page, "main").getByText("main", { exact: true }).last()).toBeVisible();
  await expect(surface(page, "main").getByText("v1.0.0", { exact: true }).last()).toBeVisible();

  await openFromLauncher(page, "Commits");
  await expect(surface(page, "main").getByText("Base commit")).toBeVisible();

  await openFromLauncher(page, "Releases");
  await expect(surface(page, "main").getByText("Version 1.0.0", { exact: true }).last()).toBeVisible();

  const omnibar = page.getByLabel("Workbench omnibar");
  await page.keyboard.press("Control+p");
  await expect(omnibar).toBeFocused();
  await omnibar.fill("src/app.ts");
  await omnibar.press("Enter");
  await expect(tab(page, "main", "app.ts")).toBeVisible();
  await omnibar.fill("@hello");
  await expect(page.getByRole("button", { name: /hello · function · line 1/ })).toBeVisible();
  await omnibar.press("Enter");

  await page.keyboard.press("Control+p");
  await expect(omnibar).toBeFocused();
  await omnibar.fill("#7");
  const issueResult = page.locator(".omnibar-results button").filter({ hasText: "Private issue" }).first();
  await expect(issueResult).toBeVisible();
  await issueResult.click();
  await expect(surface(page, "main").getByText("#7 Private issue", { exact: true }).last()).toBeVisible();

  await page.keyboard.press("Control+p");
  await omnibar.fill("branch:feature");
  await expect(page.locator(".omnibar-results button").filter({ hasText: "feature" }).first()).toBeVisible();
  await omnibar.press("Escape");

  await page.keyboard.press("Control+p");
  await omnibar.fill("project:1");
  await expect(page.locator(".omnibar-results button").filter({ hasText: "Private project" }).first()).toBeVisible();
  await omnibar.press("Enter");
  await expect(surface(page, "main").getByText("#1 Private project", { exact: true }).last()).toBeVisible();

  await page.keyboard.press("Control+p");
  await omnibar.fill(`commit:${BASE_SHA.slice(0, 7)}`);
  await expect(page.getByRole("button", { name: /Base commit/ })).toBeVisible();
  await omnibar.press("Enter");
  await expect(surface(page, "main").getByText(BASE_SHA)).toBeVisible();

  await page.keyboard.press("Control+p");
  await omnibar.fill("run:12");
  await expect(page.getByRole("button", { name: /Run #12/ })).toBeVisible();
  await omnibar.press("Enter");
  await expect(surface(page, "main").getByText("Validate private repository", { exact: true }).last()).toBeVisible();

  await page.keyboard.press("Control+p");
  await omnibar.fill("release:v1.0.0");
  await expect(page.getByRole("button", { name: /v1.0.0/ })).toBeVisible();
  await omnibar.press("Enter");
  await expect(surface(page, "main").getByText("Version 1.0.0", { exact: true }).last()).toBeVisible();
});

test("keyboard shortcuts toggle root regions and focus both omnibar modes", async ({ page }) => {
  const shell = page.locator(".workbench-shell");

  await page.keyboard.press("Control+b");
  await expect(shell).toHaveClass(/primary-collapsed/);
  await page.keyboard.press("Control+b");
  await expect(shell).not.toHaveClass(/primary-collapsed/);

  await page.keyboard.press("Control+Alt+b");
  await expect(shell).not.toHaveClass(/secondary-collapsed/);
  await page.keyboard.press("Control+Alt+b");
  await expect(shell).toHaveClass(/secondary-collapsed/);

  await page.keyboard.press("Control+j");
  await expect(shell).toHaveClass(/panel-collapsed/);
  await page.keyboard.press("Control+j");
  await expect(shell).not.toHaveClass(/panel-collapsed/);

  const omnibar = page.getByLabel("Workbench omnibar");
  await page.keyboard.press("Control+Shift+p");
  await expect(omnibar).toBeFocused();
  await expect(omnibar).toHaveValue(">");

  await page.keyboard.press("Escape");
  await page.keyboard.press("Control+p");
  await expect(omnibar).toBeFocused();
});
