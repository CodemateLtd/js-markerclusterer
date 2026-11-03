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

for (const name of [
  "bench-advanced",
  "bench-legacy",
  "bench-legacy-viewport",
]) {
  test(`${name} clusters the markers`, async ({ page, errors }) => {
    await page.goto(`/${name}/index.html`);

    await expect(clusters(page).first()).toBeVisible();
    await expectStarted(page, errors);
  });
}

// bench-leaflet doesn't use the Maps JavaScript API, but loads Leaflet from
// unpkg.com and tiles from openstreetmap.org, so it's a live test as well.
test("bench-leaflet clusters the markers", async ({ page, errors }) => {
  await page.goto("/bench-leaflet/index.html");

  await expect(page.locator(".marker-cluster").first()).toBeVisible();
  expect(errors).toEqual([]);
});
