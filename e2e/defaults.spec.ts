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

import { Locator } from "@playwright/test";
import {
  clusterLabels,
  clusters,
  expect,
  expectStarted,
  settledClusterLabels,
  test,
} from "./live";

test("defaults clusters the markers", async ({ page, errors }) => {
  await page.goto("/defaults/index.html");

  await expect(clusters(page).first()).toBeVisible();
  await expectStarted(page, errors);
});

test("clicking a cluster zooms in to its markers", async ({ page, errors }) => {
  await page.goto("/defaults/index.html");
  const before = await settledClusterLabels(page);

  // The map draws markers beyond the edges of the window, so pick a cluster
  // that is fully inside it. The Desktop Chrome device sets the viewport.
  const { width, height } = page.viewportSize()!;
  let cluster: Locator | undefined;
  for (const candidate of await clusters(page).all()) {
    const box = await candidate.boundingBox();
    if (
      box &&
      box.x > 0 &&
      box.y > 0 &&
      box.x + box.width < width &&
      box.y + box.height < height
    ) {
      cluster = candidate;
      break;
    }
  }
  if (!cluster) {
    throw new Error("No cluster is fully inside the window.");
  }

  await cluster.click();

  await expect.poll(() => clusterLabels(page)).not.toEqual(before);
  await expectStarted(page, errors);
});
