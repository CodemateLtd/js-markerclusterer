/**
 * Copyright 2021 Google LLC
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
  createMarker,
  initializeMocks,
  testMarkerTypes,
} from "../test-helpers";
import { noop } from "./core";

initializeMocks();

describe.each(testMarkerTypes)("Core works with %s", (_, markerClass) => {
  test("noop should return equivalent number of clusters", () => {
    expect(noop([]).length).toBe(0);
    expect(
      noop([
        createMarker(markerClass, { lat: 0, lng: 0 }),
        createMarker(markerClass, { lat: 0, lng: 0 }),
      ]).length
    ).toBe(2);
  });

  test("noop should leave markers without a position out of clusters", () => {
    const placed = createMarker(markerClass, { lat: 1, lng: 1 });
    const clusters = noop([placed, createMarker(markerClass, null)]);

    expect(clusters).toHaveLength(1);
    expect(clusters[0].markers).toEqual([placed]);
  });
});
