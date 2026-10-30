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

const renderCluster = (
  cluster: Cluster,
  map: google.maps.Map,
  renderer = new DefaultRenderer()
) => renderer.render(cluster, new ClusterStats([], [cluster]), map);

describe("DefaultRenderer with Advanced Markers", () => {
  let map: google.maps.Map;
  let advancedMarkerSpy: jest.SpyInstance;

  const render = (count: number) =>
    renderCluster(new FixedCountCluster(count), map);

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

  test("renders the SVG as the marker's only child", () => {
    const marker = render(5);
    // of the two marker types, only AdvancedMarkerElement is an HTMLElement
    if (!(marker instanceof HTMLElement)) {
      throw new Error("expected an AdvancedMarkerElement");
    }

    expect(marker.children).toHaveLength(1);
    expect(marker.firstElementChild?.tagName).toBe("svg");
    expect(marker.querySelector("text")?.textContent).toBe("5");
  });

  test("passes the map, the cluster's position and a title", () => {
    const cluster = new FixedCountCluster(5);
    renderCluster(cluster, map);
    const options = markerOptions(0);

    expect(options.map).toBe(map);
    expect(options.position).toBe(cluster.position);
    expect(options.title).toBe("Cluster of 5 markers");
  });

  test("gives each cluster its own SVG element", () => {
    // MarkerClusterer renders every cluster with the same renderer
    const renderer = new DefaultRenderer();
    const first = renderCluster(new FixedCountCluster(5), map, renderer);
    const second = renderCluster(new FixedCountCluster(10), map, renderer);
    if (!(first instanceof HTMLElement && second instanceof HTMLElement)) {
      throw new Error("expected AdvancedMarkerElements");
    }

    // a shared element would move to the second marker and change the first
    expect(first.querySelector("text")?.textContent).toBe("5");
    expect(second.querySelector("text")?.textContent).toBe("10");
    expect(first.firstElementChild).not.toBe(second.firstElementChild);
  });
});

describe("DefaultRenderer with legacy Markers", () => {
  let map: google.maps.Map;
  let markerSpy: jest.SpyInstance;
  let advancedMarkerSpy: jest.SpyInstance;

  const markerOptions = (): google.maps.MarkerOptions =>
    markerSpy.mock.calls[0][0];

  beforeEach(() => {
    initializeMocks();
    // the jest-mocks map reports Advanced Markers as not available
    map = new google.maps.Map(document.createElement("div"));
    const OriginalMarker = google.maps.Marker;
    markerSpy = jest
      .spyOn(google.maps, "Marker")
      .mockImplementation((options) => new OriginalMarker(options));
    // the mock has no MAX_ZINDEX; use the value of the real constant
    Object.defineProperty(google.maps.Marker, "MAX_ZINDEX", {
      value: 1000000,
    });
    const OriginalAdvancedMarker = google.maps.marker.AdvancedMarkerElement;
    advancedMarkerSpy = jest
      .spyOn(google.maps.marker, "AdvancedMarkerElement")
      .mockImplementation(() => new OriginalAdvancedMarker());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("renders a legacy Marker", () => {
    const marker = renderCluster(new FixedCountCluster(5), map);

    expect(markerSpy).toHaveBeenCalledTimes(1);
    expect(marker).toBe(markerSpy.mock.results[0].value);
    expect(advancedMarkerSpy).not.toHaveBeenCalled();
  });

  test("renders a legacy Marker when the marker library is not loaded", () => {
    map.getMapCapabilities = jest.fn().mockReturnValue({
      isAdvancedMarkersAvailable: true,
      isDataDrivenStylingAvailable: false,
    });
    jest.replaceProperty(
      google.maps,
      "marker",
      undefined as unknown as typeof google.maps.marker
    );

    const marker = renderCluster(new FixedCountCluster(5), map);

    expect(markerSpy).toHaveBeenCalledTimes(1);
    expect(marker).toBe(markerSpy.mock.results[0].value);
  });

  test("passes the cluster's position, a title and a z-index", () => {
    const cluster = new FixedCountCluster(5);
    renderCluster(cluster, map);
    const options = markerOptions();

    expect(options.position).toBe(cluster.position);
    expect(options.title).toBe("Cluster of 5 markers");
    expect(options.zIndex).toBe(1000005);
  });

  test("uses the cluster SVG as the icon", () => {
    renderCluster(new FixedCountCluster(5), map);
    const { url } = markerOptions().icon as google.maps.Icon;
    const prefix = "data:image/svg+xml;base64,";
    const svg = new DOMParser().parseFromString(
      atob(url.slice(prefix.length)),
      "image/svg+xml"
    ).documentElement;

    expect(url.startsWith(prefix)).toBe(true);
    expect(svg.tagName).toBe("svg");
    expect(svg.querySelector("text")?.textContent).toBe("5");
  });
});
