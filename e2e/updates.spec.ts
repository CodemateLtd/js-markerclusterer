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

import {
  clusters,
  expect,
  expectStarted,
  settledClusterLabels,
  test,
} from "./live";

// The example runs a timed sequence of about 25 seconds: it clears the
// markers, adds and removes ten one at a time, then adds all of them back
// and removes them all.
test("updates adds and removes markers", async ({ page, errors }) => {
  test.setTimeout(60_000);
  await page.goto("/updates/index.html");

  const initialClusters = (await settledClusterLabels(page)).length;

  // clearMarkers
  await expect(clusters(page)).toHaveCount(0);

  // addMarkers with every marker draws the first clusters again. Adding
  // ten markers one at a time never comes close.
  await expect
    .poll(() => clusters(page).count(), {
      intervals: [100],
      timeout: 40_000,
    })
    .toBe(initialClusters);

  // removeMarkers with every marker leaves nothing on the map.
  await expect(page.locator("gmp-advanced-marker")).toHaveCount(0, {
    timeout: 10_000,
  });

  await expectStarted(page, errors);
});
