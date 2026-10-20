/**
 * Copyright 2023 Google LLC
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

import { MarkerUtils } from "./marker-utils";
import { initializeMocks, testMarkerTypes } from "./test-helpers";

initializeMocks();

beforeEach(() => {
  initializeMocks();
});

describe.each(testMarkerTypes)(
  "MarkerUtils works with %s",
  (_, markerClass) => {
    let map: google.maps.Map;

    beforeEach(() => {
      map = new google.maps.Map(document.createElement("div"));
    });

    test("identifies AdvancedMarker instances", () => {
      const isAdvancedMarker = MarkerUtils.isAdvancedMarker(new markerClass());
      if (markerClass === google.maps.marker.AdvancedMarkerElement) {
        expect(isAdvancedMarker).toBeTruthy();
        return;
      }
      expect(isAdvancedMarker).toBeFalsy();
    });

    test("sets the map", () => {
      const marker = new markerClass();
      MarkerUtils.setMap(marker, map);
      if (markerClass === google.maps.marker.AdvancedMarkerElement) {
        expect(
          (marker as google.maps.marker.AdvancedMarkerElement).map
        ).toEqual(map);
        return;
      }
      expect((marker as google.maps.Marker).setMap).toHaveBeenCalled();
    });

    test("gets the marker position and returns a LatLng", () => {
      // test markers created with LatLng and LatLngLiteral
      [new google.maps.LatLng(1, 1), { lat: 1, lng: 1 }].forEach((position) => {
        const marker = new markerClass({ position: position });
        if (markerClass === google.maps.marker.AdvancedMarkerElement) {
          (marker as google.maps.marker.AdvancedMarkerElement).position =
            position;
        }
        expect(MarkerUtils.getPosition(marker)).toBeInstanceOf(
          google.maps.LatLng
        );
      });
    });

    test(`${markerClass.name}.getVisible`, () => {
      const marker = new markerClass();

      const res = MarkerUtils.getVisible(marker);

      if (marker instanceof google.maps.Marker) {
        expect(marker.getVisible).toHaveBeenCalled();
      } else {
        expect(res).toBe(true);
      }
    });
  }
);

describe("MarkerUtils.getPosition", () => {
  const advancedMarker = (
    position: google.maps.marker.AdvancedMarkerElement["position"]
  ) => {
    const marker = new google.maps.marker.AdvancedMarkerElement();
    marker.position = position;
    return marker;
  };

  const legacyMarker = (position: google.maps.LatLng | null | undefined) => {
    const marker = new google.maps.Marker();
    jest.mocked(marker.getPosition).mockReturnValue(position);
    return marker;
  };

  const toLiteral = (position: google.maps.LatLng | null) =>
    position && { lat: position.lat(), lng: position.lng() };

  test("returns null for a marker without a position", () => {
    expect(
      MarkerUtils.getPosition(new google.maps.marker.AdvancedMarkerElement())
    ).toBeNull();
    expect(MarkerUtils.getPosition(advancedMarker(null))).toBeNull();
    expect(MarkerUtils.getPosition(legacyMarker(undefined))).toBeNull();
    expect(MarkerUtils.getPosition(legacyMarker(null))).toBeNull();
  });

  test("returns null for a position with non-finite coordinates", () => {
    expect(
      MarkerUtils.getPosition(legacyMarker(new google.maps.LatLng(NaN, 1)))
    ).toBeNull();
    expect(
      MarkerUtils.getPosition(legacyMarker(new google.maps.LatLng(1, Infinity)))
    ).toBeNull();
    expect(
      MarkerUtils.getPosition(advancedMarker(new google.maps.LatLng(NaN, 1)))
    ).toBeNull();
  });

  test("keeps zero coordinates", () => {
    expect(
      toLiteral(MarkerUtils.getPosition(advancedMarker({ lat: 0, lng: 0 })))
    ).toEqual({ lat: 0, lng: 0 });
    expect(
      toLiteral(
        MarkerUtils.getPosition(advancedMarker(new google.maps.LatLng(0, 0)))
      )
    ).toEqual({ lat: 0, lng: 0 });
    expect(
      toLiteral(
        MarkerUtils.getPosition(legacyMarker(new google.maps.LatLng(0, 0)))
      )
    ).toEqual({ lat: 0, lng: 0 });
  });

  test("reads the coordinates of altitude-bearing positions", () => {
    const latLngAltitude = new google.maps.LatLngAltitude({
      lat: 10,
      lng: 20,
      altitude: 100,
    });
    // The mock ignores its constructor arguments.
    Object.assign(latLngAltitude, { lat: 10, lng: 20, altitude: 100 });

    expect(
      toLiteral(
        MarkerUtils.getPosition(
          advancedMarker({ lat: 10, lng: 20, altitude: 100 })
        )
      )
    ).toEqual({ lat: 10, lng: 20 });
    expect(
      toLiteral(MarkerUtils.getPosition(advancedMarker(latLngAltitude)))
    ).toEqual({ lat: 10, lng: 20 });
  });
});
