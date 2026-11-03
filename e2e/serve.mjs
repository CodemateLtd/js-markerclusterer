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

// Serves the built examples in public/ for the browser tests.
// Usage: node e2e/serve.mjs <port>

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import url from "node:url";

const root = url.fileURLToPath(new URL("../public/", import.meta.url));
const port = Number(process.argv[2]);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

http
  .createServer((request, response) => {
    const { pathname } = new URL(request.url, "http://localhost");
    let file;
    try {
      file = path.join(root, path.normalize(decodeURIComponent(pathname)));
    } catch {
      response.writeHead(400).end();
      return;
    }

    if (!file.startsWith(root) || file.includes("\0")) {
      response.writeHead(403).end();
      return;
    }

    fs.readFile(file, (error, data) => {
      if (error) {
        response.writeHead(404).end();
        return;
      }
      response.writeHead(200, {
        "Content-Type":
          contentTypes[path.extname(file)] ?? "application/octet-stream",
      });
      response.end(data);
    });
  })
  .listen(port, "127.0.0.1");
