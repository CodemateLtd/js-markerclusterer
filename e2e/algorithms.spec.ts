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

test("each algorithm panel clusters as its algorithm does", async ({
  page,
  errors,
}) => {
  await page.goto("/algorithms/index.html");

  const grid = page.locator("#grid");
  const supercluster = page.locator("#supercluster");
  const noop = page.locator("#noop");

  await expect(clusters(grid).first()).toBeVisible();
  await expect(clusters(supercluster).first()).toBeVisible();

  // NoopAlgorithm leaves every marker on its own.
  await expect(noop.locator("gmp-advanced-marker").first()).toBeAttached();
  await expect(clusters(noop)).toHaveCount(0);

  await expectStarted(page, errors);
});
