/**
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { expect, test } from "@playwright/test";

// Each link on the index page and the example it must open.
const links = [
  ["Algorithms", "algorithms"],
  ["Renderers", "renderers"],
  ["Updates", "updates"],
  ["Defaults", "defaults"],
  ["Benchmark legacy markers", "bench-legacy"],
  ["Benchmark advanced markers", "bench-advanced"],
  ["Benchmark legacy markers with viewport", "bench-legacy-viewport"],
  ["Benchmark Leaflet markers", "bench-leaflet"],
];

test("the index links to every example", async ({ page }) => {
  await page.goto("/index.html");

  const texts = await page.getByRole("listitem").allTextContents();
  expect(texts).toEqual(links.map(([text]) => text));
});

for (const [text, name] of links) {
  test(`the "${text}" link opens the ${name} example`, async ({ page }) => {
    // Only the pages themselves are under test here, so load nothing else.
    await page.route("**/*", (route) =>
      route.request().resourceType() === "document"
        ? route.continue()
        : route.abort()
    );
    await page.goto("/index.html");

    const navigation = page.waitForResponse((response) =>
      response.request().isNavigationRequest()
    );
    await page.getByRole("link", { name: text, exact: true }).click();
    const response = await navigation;

    expect(response.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe(`/${name}/index.html`);
    await expect(page.locator(`script[src="${name}.js"]`)).toHaveCount(1);
  });
}
