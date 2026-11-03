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

// Live tests load the examples against the real Maps JavaScript API, so
// they need a key from GOOGLE_MAPS_API_KEY and are skipped without one. The
// key goes into localStorage, where the examples read it, and is never
// printed: it is removed from every error message the tests collect.

import { Locator, Page, expect, test as base } from "@playwright/test";

const apiKey = process.env.GOOGLE_MAPS_API_KEY;

const redact = (text: string) =>
  apiKey ? text.split(apiKey).join("<GOOGLE_MAPS_API_KEY>") : text;

export const test = base.extend<{ errors: string[] }>({
  page: async ({ page }, use, testInfo) => {
    testInfo.skip(
      !apiKey,
      "Set GOOGLE_MAPS_API_KEY to a key for the Maps JavaScript API that " +
        "allows http://127.0.0.1 to run the live tests."
    );
    // skip() ends the test when there is no key. The key goes only to the
    // local server's origin, not to the frames the Maps JavaScript API opens.
    await page.addInitScript((key) => {
      if (location.hostname === "127.0.0.1") {
        localStorage.setItem("gmaps-key", key);
      }
    }, apiKey!);
    await use(page);
  },

  // Page errors and console errors, collected from the start of the test.
  errors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(redact(error.message)));
    page.on("console", (message) => {
      if (message.type() === "error") {
        errors.push(redact(message.text()));
      }
    });
    await use(errors);
  },
});

export { expect };

// The cluster markers the default renderer draws, as Advanced Markers or as
// legacy Markers. Both are buttons labelled with the number of markers.
export const clusters = (scope: Page | Locator) =>
  scope.getByRole("button", { name: /^Cluster of \d+ markers$/ });

// The labels of the clusters drawn, which name their number of markers.
export const clusterLabels = (scope: Page | Locator) =>
  clusters(scope).evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("aria-label"))
  );

// The labels of the clusters drawn, once two reads in a row agree, so a
// render still in progress isn't taken for the result.
export async function settledClusterLabels(scope: Page | Locator) {
  let previous: Array<string | null> = [];
  await expect
    .poll(
      async () => {
        const current = await clusterLabels(scope);
        const settled =
          current.length > 0 &&
          JSON.stringify(current) === JSON.stringify(previous);
        previous = current;
        return settled;
      },
      { intervals: [250] }
    )
    .toBe(true);
  return previous;
}

// Checks that the example started: no error box and nothing logged as an
// error.
export async function expectStarted(page: Page, errors: string[]) {
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(errors).toEqual([]);
}
