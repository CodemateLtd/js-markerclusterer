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

import { clusters, expect, expectStarted, test } from "./live";

test("each renderer panel draws its clusters", async ({ page, errors }) => {
  await page.goto("/renderers/index.html");

  // DefaultRenderer, in the first and third panels.
  await expect(clusters(page.locator("#default")).first()).toBeVisible();
  await expect(clusters(page.locator("#svg")).first()).toBeVisible();

  // A pin titled with the count.
  await expect(
    page.locator("#simple gmp-advanced-marker[title]").first()
  ).toHaveAttribute("title", /^\d+$/);

  // An SVG of its own, with the count as text.
  await expect(
    page.locator("#interpolated gmp-advanced-marker svg text").first()
  ).toHaveText(/^\d+$/);

  await expectStarted(page, errors);
});

test("each panel shows its renderer's code, highlighted", async ({
  page,
  errors,
}) => {
  await page.goto("/renderers/index.html");

  for (const id of ["default", "simple", "svg", "interpolated"]) {
    await expect(
      page.locator(`#${id} .description .hljs-keyword`).first()
    ).toBeVisible();
  }

  await expectStarted(page, errors);
});
