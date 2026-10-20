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

import { MapCanvasProjection, initialize } from "@googlemaps/jest-mocks";
import {
  areMarkersEqual,
  distanceBetweenPoints,
  extendPixelBounds,
  filterMarkersToPaddedViewport,
  pixelBoundsToLatLngBounds,
} from "./utils";
import {
  createMarker,
  initializeMocks,
  setupMapBounds,
  testMarkerTypes,
} from "../test-helpers";

beforeEach(() => {
  initialize();
});

describe("distanceBetweenPoints", () => {
  test("is correct", () => {
    expect(
      distanceBetweenPoints({ lng: 0, lat: 0 }, { lng: 1, lat: 1 })
    ).toMatchInlineSnapshot("157.24938127194397");

    expect(
      distanceBetweenPoints({ lng: 0, lat: 0 }, { lng: -1, lat: 1 })
    ).toMatchInlineSnapshot("157.24938127194397");

    expect(
      distanceBetweenPoints({ lng: 0, lat: 0 }, { lng: -1, lat: -1 })
    ).toMatchInlineSnapshot("157.24938127194397");

    expect(
      distanceBetweenPoints({ lng: 0, lat: 0 }, { lng: 1, lat: -1 })
    ).toMatchInlineSnapshot("157.24938127194397");
  });
});

describe("extendPixelBounds", () => {
  test("is correct", () => {
    const northEast = new google.maps.Point(0, 0);
    const southWest = new google.maps.Point(0, 0);
    expect(extendPixelBounds({ northEast, southWest }, 1)).toMatchObject({
      northEast: {
        x: 1,
        y: -1,
      },
      southWest: {
        x: -1,
        y: 1,
      },
    });
  });
});

describe("pixelBoundsToLatLngBounds", () => {
  test("is correct", () => {
    const northEast = new google.maps.Point(1, 1);
    const southWest = new google.maps.Point(-1, -1);
    const projection = new MapCanvasProjection();
    pixelBoundsToLatLngBounds({ northEast, southWest }, projection);
    expect(projection.fromDivPixelToLatLng).toHaveBeenCalledWith(northEast);
    expect(projection.fromDivPixelToLatLng).toHaveBeenCalledWith(southWest);
  });
});

describe.each(testMarkerTypes)(
  "filterMarkersToPaddedViewport works with %s",
  (_, markerClass) => {
    beforeEach(() => {
      initializeMocks();
    });

    test("drops markers without a position", () => {
      // Make the padded viewport contain every position, so only a missing
      // position can drop a marker. initializeMocks() in beforeEach restores
      // the original class.
      const OriginalLatLngBounds = google.maps.LatLngBounds;
      class ContainsEverything extends OriginalLatLngBounds {
        constructor(
          ...args: ConstructorParameters<typeof google.maps.LatLngBounds>
        ) {
          super(...args);
          this.contains = jest.fn().mockReturnValue(true);
        }
      }
      google.maps.LatLngBounds = ContainsEverything;

      const map = new google.maps.Map(document.createElement("div"));
      setupMapBounds(map, { west: -10, south: -10, east: 10, north: 10 });
      const placed = createMarker(markerClass, { lat: 1, lng: 1 });

      const markers = filterMarkersToPaddedViewport(
        map,
        new MapCanvasProjection(),
        [placed, createMarker(markerClass, null)],
        60
      );

      expect(markers).toHaveLength(1);
      expect(markers[0]).toBe(placed);
    });
  }
);

describe.each(testMarkerTypes)(
  "areMarkersEqual works with %s",
  (_, markerClass) => {
    beforeEach(() => {
      initializeMocks();
    });

    test("treats markers without a position as equal to each other only", () => {
      const positionless = () => createMarker(markerClass, null);
      const atOrigin = () => createMarker(markerClass, { lat: 0, lng: 0 });

      expect(areMarkersEqual([positionless()], [positionless()])).toBe(true);
      expect(areMarkersEqual([atOrigin()], [positionless()])).toBe(false);
      expect(areMarkersEqual([positionless()], [atOrigin()])).toBe(false);
    });
  }
);
