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

// The examples that load the Maps JavaScript API. bench-leaflet doesn't.
const examples = [
  "algorithms",
  "renderers",
  "updates",
  "defaults",
  "bench-legacy",
  "bench-advanced",
  "bench-legacy-viewport",
];

for (const name of examples) {
  test(`${name} shows an error when the Maps JavaScript API can't load`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") {
        errors.push(message.text());
      }
    });
    // Nothing loads from outside the local server, including the Maps
    // JavaScript API bootstrap from maps.googleapis.com.
    await page.route(
      (url) => url.hostname !== "127.0.0.1",
      (route) => route.abort()
    );

    await page.goto(`/${name}/index.html`);

    await expect(page.getByRole("alert")).toContainText(
      "This example could not start"
    );
    expect(errors).toContainEqual(expect.stringContaining("could not load"));
  });
}
