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

import { defineConfig, devices } from "@playwright/test";

// The built examples are served from public/, so run `npm run examples`
// first; `npm run test:e2e` does both.
const port = Number(process.env.E2E_PORT ?? 8090);

// Workers load this file too; warn once, from the main process.
if (!process.env.GOOGLE_MAPS_API_KEY && !process.env.TEST_WORKER_INDEX) {
  console.warn(
    "GOOGLE_MAPS_API_KEY is not set, so the live tests are skipped. " +
      "Only the offline tests run."
  );
}

// Playwright reads its configuration from the default export.
export default defineConfig({
  testDir: ".",
  outputDir: "../test-results",
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `node e2e/serve.mjs ${port}`,
    cwd: "..",
    url: `http://127.0.0.1:${port}/index.html`,
    reuseExistingServer: false,
  },
});
