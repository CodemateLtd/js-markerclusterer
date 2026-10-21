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

import { initializeMocks, testMarkerTypes } from "../test-helpers";
import { AbstractViewportAlgorithm, AlgorithmInput, noop } from "./core";
import { Cluster } from "../cluster";

initializeMocks();

class OneClusterAlgorithm extends AbstractViewportAlgorithm {
  protected cluster({ markers }: AlgorithmInput): Cluster[] {
    return [new Cluster({ markers, position: { lat: 0, lng: 0 } })];
  }
}

describe.each(testMarkerTypes)("Core works with %s", (_, markerClass) => {
  test("noop should return equivalent number of clusters", () => {
    expect(noop([]).length).toBe(0);
    expect(noop([new markerClass({}), new markerClass({})]).length).toBe(2);
  });

  test("AbstractViewportAlgorithm calculate should leave changed out at or above max zoom", () => {
    const map = new google.maps.Map(document.createElement("div"));
    const mapCanvasProjection =
      jest.fn() as unknown as google.maps.MapCanvasProjection;
    const markers = [new markerClass(), new markerClass()];
    const algorithm = new OneClusterAlgorithm({ maxZoom: 16 });

    for (const zoom of [16, 16, 17]) {
      map.getZoom = jest.fn().mockReturnValue(zoom);

      const { clusters, changed } = algorithm.calculate({
        markers,
        map,
        mapCanvasProjection,
      });

      expect(changed).toBeUndefined();
      expect(clusters.map((cluster) => cluster.markers)).toEqual([
        [markers[0]],
        [markers[1]],
      ]);
    }
  });
});
