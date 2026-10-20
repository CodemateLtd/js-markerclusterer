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

import { SuperClusterAlgorithm } from "./supercluster";
import {
  initializeMocks,
  testMarkerTypes,
  setupMapBounds,
  createMarker,
  moveMarker,
} from "../test-helpers";
import { Marker } from "../marker-utils";
import { ClusterFeature } from "supercluster";

initializeMocks();

describe.each(testMarkerTypes)(
  "SuperClusterAlgorithm works with %s",
  (_, markerClass) => {
    let map: google.maps.Map;

    beforeEach(() => {
      map = new google.maps.Map(document.createElement("div"));
    });

    test("should only call load if markers change", () => {
      const mapCanvasProjection =
        jest.fn() as unknown as google.maps.MapCanvasProjection;
      const markers: Marker[] = [new markerClass()];

      const superCluster = new SuperClusterAlgorithm({});
      superCluster["superCluster"].load = jest.fn();
      superCluster.cluster = jest.fn();

      superCluster.calculate({ markers, map, mapCanvasProjection });
      superCluster.calculate({ markers, map, mapCanvasProjection });
      expect(superCluster["superCluster"].load).toHaveBeenCalledTimes(1);
      expect(superCluster["superCluster"].load).toHaveBeenCalledWith([
        {
          type: "Feature",
          geometry: { coordinates: [0, 0], type: "Point" },
          properties: { marker: markers[0] },
        },
      ]);
    });

    test("should cluster markers", () => {
      const mapCanvasProjection =
        jest.fn() as unknown as google.maps.MapCanvasProjection;
      const markers: Marker[] = [new markerClass(), new markerClass()];

      const superCluster = new SuperClusterAlgorithm({});
      map.getZoom = jest.fn().mockReturnValue(0);
      setupMapBounds(map, { west: -180, south: -90, east: 180, north: 90 });
      const { clusters } = superCluster.calculate({
        markers,
        map,
        mapCanvasProjection,
      });

      expect(clusters).toHaveLength(1);
    });

    test("should transform to Cluster with single marker if not cluster", () => {
      const superCluster = new SuperClusterAlgorithm({});
      const marker: Marker = new markerClass();

      // mock out the supercluster implementation
      jest
        .spyOn(superCluster["superCluster"], "getLeaves")
        .mockImplementation(() => [clusterFeature]);

      const clusterFeature: ClusterFeature<{ marker: Marker }> = {
        type: "Feature",
        geometry: { coordinates: [0, 0], type: "Point" },
        properties: {
          marker,
          cluster: true,
          cluster_id: 100,
          point_count: 1,
          point_count_abbreviated: 1,
        },
      };

      const cluster = superCluster["transformCluster"](clusterFeature);

      expect(cluster.markers.length).toEqual(1);
      expect(cluster.markers[0]).toBe(marker);
    });

    test("should not cluster if zoom didn't change", () => {
      const mapCanvasProjection =
        jest.fn() as unknown as google.maps.MapCanvasProjection;
      const markers: Marker[] = [new markerClass(), new markerClass()];

      const superCluster = new SuperClusterAlgorithm({});
      superCluster["markers"] = markers;
      superCluster["state"] = { zoom: 12 };
      superCluster.cluster = jest.fn().mockReturnValue([]);
      superCluster["clusters"] = [];

      map.getZoom = jest.fn().mockReturnValue(superCluster["state"].zoom);

      const { clusters, changed } = superCluster.calculate({
        markers,
        map,
        mapCanvasProjection,
      });

      expect(changed).toBeFalsy();
      expect(clusters).toBe(superCluster["clusters"]);
    });

    test("should not cluster if zoom beyond maxZoom", () => {
      const mapCanvasProjection =
        jest.fn() as unknown as google.maps.MapCanvasProjection;
      const markers: Marker[] = [new markerClass(), new markerClass()];

      const superCluster = new SuperClusterAlgorithm({});
      superCluster["markers"] = markers;
      superCluster["state"] = { zoom: 20 };
      superCluster.cluster = jest.fn().mockReturnValue([]);
      superCluster["clusters"] = [];

      map.getZoom = jest.fn().mockReturnValue(superCluster["state"].zoom + 1);

      const { clusters, changed } = superCluster.calculate({
        markers,
        map,
        mapCanvasProjection,
      });

      expect(changed).toBeFalsy();
      expect(clusters).toBe(superCluster["clusters"]);
    });

    test.each([
      ["the same array", (markers: Marker[]) => markers],
      ["a new array", (markers: Marker[]) => [...markers]],
    ])(
      "should recluster markers moved in place after reset, given %s",
      (_, nextInput) => {
        const mapCanvasProjection =
          jest.fn() as unknown as google.maps.MapCanvasProjection;
        map.getZoom = jest.fn().mockReturnValue(3);
        const a = createMarker(markerClass, { lat: 0, lng: 0 });
        const b = createMarker(markerClass, { lat: 50, lng: 50 });
        const markers = [a, b];

        const superCluster = new SuperClusterAlgorithm({});
        const before = superCluster.calculate({
          markers,
          map,
          mapCanvasProjection,
        });
        expect(before.clusters).toHaveLength(2);

        moveMarker(b, { lat: 0, lng: 0.0001 });
        superCluster.reset();
        const { clusters, changed } = superCluster.calculate({
          markers: nextInput(markers),
          map,
          mapCanvasProjection,
        });

        expect(changed).toBe(true);
        expect(clusters).toHaveLength(1);
        expect(clusters[0].markers).toEqual(expect.arrayContaining([a, b]));
      }
    );

    test("should report changed after reset when all markers were removed", () => {
      const mapCanvasProjection =
        jest.fn() as unknown as google.maps.MapCanvasProjection;
      map.getZoom = jest.fn().mockReturnValue(3);
      const markers = [
        createMarker(markerClass, { lat: 0, lng: 0 }),
        createMarker(markerClass, { lat: 50, lng: 50 }),
      ];

      const superCluster = new SuperClusterAlgorithm({});
      const load = jest.spyOn(superCluster["superCluster"], "load");
      superCluster.calculate({ markers, map, mapCanvasProjection });

      superCluster.reset();
      const { clusters, changed } = superCluster.calculate({
        markers: [],
        map,
        mapCanvasProjection,
      });

      expect(changed).toBe(true);
      expect(clusters).toHaveLength(0);
      expect(load).toHaveBeenLastCalledWith([]);
    });

    test("should report changed once after reset even if clusters are the same", () => {
      const mapCanvasProjection =
        jest.fn() as unknown as google.maps.MapCanvasProjection;
      map.getZoom = jest.fn().mockReturnValue(3);
      const markers = [
        createMarker(markerClass, { lat: 0, lng: 0 }),
        createMarker(markerClass, { lat: 50, lng: 50 }),
      ];

      const superCluster = new SuperClusterAlgorithm({});
      const load = jest.spyOn(superCluster["superCluster"], "load");
      superCluster.calculate({ markers, map, mapCanvasProjection });

      superCluster.reset();
      const { changed } = superCluster.calculate({
        markers,
        map,
        mapCanvasProjection,
      });

      expect(changed).toBe(true);
      expect(load).toHaveBeenCalledTimes(2);

      const next = superCluster.calculate({
        markers,
        map,
        mapCanvasProjection,
      });
      expect(next.changed).toBe(false);
      expect(load).toHaveBeenCalledTimes(2);
    });

    test("should round fractional zoom", () => {
      const mapCanvasProjection =
        jest.fn() as unknown as google.maps.MapCanvasProjection;
      const markers: Marker[] = [];

      const superCluster = new SuperClusterAlgorithm({});
      superCluster["superCluster"].getClusters = jest.fn().mockReturnValue([]);

      map.getZoom = jest.fn().mockReturnValue(1.534);
      superCluster.cluster({ map, mapCanvasProjection, markers });
      expect(superCluster["superCluster"].getClusters).toHaveBeenCalledWith(
        [-180, -90, 180, 90],
        2
      );

      map.getZoom = jest.fn().mockReturnValue(3.234);
      superCluster.cluster({ map, mapCanvasProjection, markers });
      expect(superCluster["superCluster"].getClusters).toHaveBeenCalledWith(
        [-180, -90, 180, 90],
        3
      );
    });
  }
);
