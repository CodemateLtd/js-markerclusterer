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

import { Cluster } from "./cluster";
import { ClusterStats, DefaultRenderer } from "./renderer";
import { initializeMocks } from "./test-helpers";

// A real Cluster with a fixed marker count. The renderer reads only `count`
// and `position`, so the tests need no fixture markers.
class FixedCountCluster extends Cluster {
  private readonly fixedCount: number;

  constructor(count: number) {
    super({ position: new google.maps.LatLng(1, 2) });
    this.fixedCount = count;
  }

  public get count(): number {
    return this.fixedCount;
  }
}

describe("DefaultRenderer with Advanced Markers", () => {
  let map: google.maps.Map;
  let advancedMarkerSpy: jest.SpyInstance;

  const render = (count: number) => {
    const cluster = new FixedCountCluster(count);
    const stats = new ClusterStats([], [cluster]);
    return new DefaultRenderer().render(cluster, stats, map);
  };

  const markerOptions = (
    callIndex: number
  ): google.maps.marker.AdvancedMarkerElementOptions =>
    advancedMarkerSpy.mock.calls[callIndex][0];

  beforeEach(() => {
    initializeMocks();
    map = new google.maps.Map(document.createElement("div"));
    map.getMapCapabilities = jest.fn().mockReturnValue({
      isAdvancedMarkersAvailable: true,
      isDataDrivenStylingAvailable: false,
    });
    const Original = google.maps.marker.AdvancedMarkerElement;
    advancedMarkerSpy = jest
      .spyOn(google.maps.marker, "AdvancedMarkerElement")
      .mockImplementation(() => new Original());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("stacks clusters above the legacy MAX_ZINDEX, larger on top", () => {
    render(5);
    render(10);
    const smaller = markerOptions(0).zIndex;
    const larger = markerOptions(1).zIndex;

    // 1000000 is the value of google.maps.Marker.MAX_ZINDEX
    expect(smaller).toBeGreaterThan(1000000);
    // nothing is greater than Infinity, so a missing zIndex fails here too
    expect(larger).toBeGreaterThan(smaller ?? Infinity);
  });
});
