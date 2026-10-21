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

import { NoopAlgorithm } from "./noop";
import { initializeMocks, testMarkerTypes } from "../test-helpers";
import { Marker } from "../marker-utils";

initializeMocks();

describe.each(testMarkerTypes)(
  "NoopAlgorithm works with %s",
  (_, markerClass) => {
    let map: google.maps.Map;
    const mapCanvasProjection =
      jest.fn() as unknown as google.maps.MapCanvasProjection;

    beforeEach(() => {
      map = new google.maps.Map(document.createElement("div"));
    });

    test("calculate should return changed: true on the first call", () => {
      const noop = new NoopAlgorithm({});
      const markers = [new markerClass(), new markerClass()];

      const { clusters, changed } = noop.calculate({
        markers,
        map,
        mapCanvasProjection,
      });

      expect(changed).toBe(true);
      expect(clusters.map((cluster) => cluster.markers)).toEqual([
        [markers[0]],
        [markers[1]],
      ]);
    });

    test("calculate should return changed: false for the same markers", () => {
      const noop = new NoopAlgorithm({});
      const markers = [new markerClass(), new markerClass()];

      noop.calculate({ markers, map, mapCanvasProjection });
      const { changed } = noop.calculate({
        markers: [...markers],
        map,
        mapCanvasProjection,
      });

      expect(changed).toBe(false);
    });

    test("calculate should return changed: true when the markers change", () => {
      const noop = new NoopAlgorithm({});
      const a = new markerClass();
      const b = new markerClass();
      const c = new markerClass();
      const calculate = (markers: Marker[]) =>
        noop.calculate({ markers, map, mapCanvasProjection }).changed;

      calculate([a, b]);

      expect(calculate([a, b, c])).toBe(true);
      expect(calculate([a, c, b])).toBe(true);
      expect(calculate([a, c])).toBe(true);
      expect(calculate([])).toBe(true);
      expect(calculate([])).toBe(false);
    });

    test("calculate should not be affected by later changes to the input array", () => {
      const noop = new NoopAlgorithm({});
      const markers = [new markerClass()];

      noop.calculate({ markers, map, mapCanvasProjection });
      markers.push(new markerClass());
      const { changed } = noop.calculate({ markers, map, mapCanvasProjection });

      expect(changed).toBe(true);
    });
  }
);
