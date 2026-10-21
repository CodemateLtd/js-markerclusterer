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
  Cluster,
  ClusterStats,
  defaultOnClusterClickHandler,
  MarkerClusterer,
} from ".";

import {
  initializeMocks,
  setupMapBounds,
  testMarkerTypes as markerClasses,
} from "./test-helpers";
import { Marker, MarkerUtils } from "./marker-utils";
import { MapCanvasProjection } from "@googlemaps/jest-mocks";
import * as algorithmUtils from "./algorithms/utils";
import {
  Algorithm,
  GridAlgorithm,
  SuperClusterAlgorithm,
  SuperClusterViewportAlgorithm,
} from "./algorithms";

initializeMocks();

describe.each(markerClasses)(
  "MarkerClusterer works with %p",
  (_, markerClass) => {
    const calculate = jest.fn().mockReturnValue({ clusters: [] });
    const algorithm = { calculate };

    const render = jest.fn().mockImplementation(() => new markerClass());
    const renderer = { render };

    let map: google.maps.Map;
    let rafSpy: jest.SpyInstance;

    beforeEach(() => {
      map = new google.maps.Map(document.createElement("div"));
      // Runs the raf callback immediately.
      rafSpy = jest
        .spyOn(window, "requestAnimationFrame")
        .mockImplementation((cb) => {
          cb(performance.now());
          return 0;
        });
    });

    afterEach(() => {
      calculate.mockClear();
      render.mockClear();
      rafSpy.mockRestore();
    });

    test("markerClusterer does not render if no map", () => {
      const calculate = jest.fn();
      const markerClusterer = new MarkerClusterer({
        markers: [],
        algorithm: { calculate },
      });
      markerClusterer.getMap = jest.fn().mockImplementation(() => null);
      markerClusterer.getProjection = jest.fn().mockImplementation(() => null);

      markerClusterer.render();
      expect(calculate).toHaveBeenCalledTimes(0);
    });

    test("markerClusterer calls calculate correctly", () => {
      const mapCanvasProjection = jest.fn();
      const markers: Marker[] = [];

      const markerClusterer = new MarkerClusterer({
        markers,
        algorithm,
      });

      markerClusterer.getMap = jest.fn().mockImplementation(() => map);
      markerClusterer.getProjection = jest
        .fn()
        .mockImplementation(() => mapCanvasProjection);
      markerClusterer["reset"] = jest.fn();
      markerClusterer["renderClusters"] = jest.fn();
      markerClusterer.render();

      expect(calculate).toHaveBeenCalledWith({
        map,
        markers,
        mapCanvasProjection,
      });
      expect(markerClusterer["reset"]).toHaveBeenCalledTimes(0);
      expect(markerClusterer["renderClusters"]).toHaveBeenCalledTimes(1);
    });

    test("markerClusterer does not reset and renderClusters if no change", () => {
      const mapCanvasProjection = jest.fn();
      const markers: Marker[] = [];
      const algorithm = {
        calculate: jest.fn().mockReturnValue({ clusters: [], changed: false }),
      };
      const markerClusterer = new MarkerClusterer({
        markers,
        algorithm,
      });

      markerClusterer.getMap = jest.fn().mockImplementation(() => map);
      markerClusterer.getProjection = jest
        .fn()
        .mockImplementation(() => mapCanvasProjection);
      markerClusterer["reset"] = jest.fn();
      markerClusterer["renderClusters"] = jest.fn();
      markerClusterer.render();

      expect(markerClusterer["reset"]).toHaveBeenCalledTimes(0);
      expect(markerClusterer["renderClusters"]).toHaveBeenCalledTimes(0);
    });

    test("markerClusterer reset takes everything off the map and keeps cluster markers", () => {
      const single = new markerClass();
      const grouped = [new markerClass(), new markerClass()];
      const markers: Marker[] = [single, ...grouped];

      const markerClusterer = new MarkerClusterer({
        markers,
      });
      const singleCluster = new Cluster({ markers: [single] });
      singleCluster.marker = single;
      // The cluster keeps the array it is given, so hand it a copy to compare
      // against.
      const groupCluster = new Cluster({ markers: [...grouped] });
      const groupIcon = new markerClass();
      groupCluster.marker = groupIcon;

      MarkerUtils.setMap = jest.fn().mockImplementation(() => null);

      markerClusterer["clusters"] = [singleCluster, groupCluster];
      markerClusterer["reset"]();

      // The mock markers are deep-equal to each other, so match by identity.
      const takenOff = (marker: Marker) =>
        (MarkerUtils.setMap as jest.Mock).mock.calls.some(
          ([m, map]) => m === marker && map === null
        );
      markers.forEach((marker) => expect(takenOff(marker)).toBe(true));
      expect(takenOff(groupIcon)).toBe(true);
      expect(singleCluster.markers).toHaveLength(1);
      expect(singleCluster.markers[0]).toBe(single);
      expect(groupCluster.markers).toHaveLength(grouped.length);
      grouped.forEach((marker, i) =>
        expect(groupCluster.markers[i]).toBe(marker)
      );
      expect(markerClusterer["clusters"]).toEqual([]);
    });

    describe("when taken off the map and put back", () => {
      const singles: [number, number][] = [
        [0, 0],
        [10, 10],
      ];
      const group: [number, number][] = [
        [0, 0],
        [0.001, 0.001],
      ];
      const cases: [string, () => Algorithm, number, [number, number][]][] = [
        ["GridAlgorithm at maxZoom", () => new GridAlgorithm({}), 17, singles],
        [
          "SuperClusterAlgorithm, single markers",
          () => new SuperClusterAlgorithm({}),
          6,
          singles,
        ],
        [
          "SuperClusterAlgorithm, one group",
          () => new SuperClusterAlgorithm({}),
          6,
          group,
        ],
        [
          "SuperClusterViewportAlgorithm, single markers",
          () => new SuperClusterViewportAlgorithm({}),
          6,
          singles,
        ],
        [
          "SuperClusterViewportAlgorithm, one group",
          () => new SuperClusterViewportAlgorithm({}),
          6,
          group,
        ],
      ];

      let onMap: Map<Marker, google.maps.Map | null>;
      let setMapSpy: jest.SpyInstance;
      let viewportSpy: jest.SpyInstance;
      let zoomedMap: google.maps.Map;
      let projection: MapCanvasProjection;

      const makeMarkerAt = ([lat, lng]: [number, number]): Marker => {
        const marker = new markerClass();
        if (MarkerUtils.isAdvancedMarker(marker)) {
          marker.position = { lat, lng };
        } else {
          (marker as google.maps.Marker).getPosition = jest
            .fn()
            .mockReturnValue(new google.maps.LatLng(lat, lng));
        }
        return marker;
      };
      const visible = () =>
        [...onMap].filter(([, m]) => m === zoomedMap).map(([marker]) => marker);

      beforeEach(() => {
        onMap = new Map();
        setMapSpy = jest
          .spyOn(MarkerUtils, "setMap")
          .mockImplementation((marker, m) => void onMap.set(marker, m));
        // The mocked LatLngBounds ignores its arguments, so give the viewport
        // algorithm a view that contains every marker.
        viewportSpy = jest
          .spyOn(algorithmUtils, "getPaddedViewport")
          .mockReturnValue([-20, -20, 20, 20]);
        zoomedMap = new google.maps.Map(document.createElement("div"));
        zoomedMap.getProjection = jest.fn().mockReturnValue({});
        setupMapBounds(zoomedMap, {
          west: -20,
          south: -20,
          east: 20,
          north: 20,
        });
        projection = new MapCanvasProjection();
        projection.fromLatLngToDivPixel = jest
          .fn()
          .mockImplementation((latLng: google.maps.LatLng) => ({
            x: latLng.lng() * 100,
            y: latLng.lat() * 100,
          }));
        projection.fromDivPixelToLatLng = jest
          .fn()
          .mockImplementation((point: google.maps.Point) => ({
            lat: () => point.y / 100,
            lng: () => point.x / 100,
          }));
      });

      afterEach(() => {
        setMapSpy.mockRestore();
        viewportSpy.mockRestore();
      });

      test.each(cases)(
        "markerClusterer onAdd after onRemove draws again and later renders do not: %s",
        (_, makeAlgorithm, zoom, positions) => {
          zoomedMap.getZoom = jest.fn().mockReturnValue(zoom);
          const markers = positions.map(makeMarkerAt);
          const markerClusterer = new MarkerClusterer({
            markers,
            algorithm: makeAlgorithm(),
            renderer,
          });
          markerClusterer.getMap = jest.fn().mockReturnValue(zoomedMap);
          markerClusterer.getProjection = jest.fn().mockReturnValue(projection);

          markerClusterer.onAdd();
          const first = visible();
          markerClusterer.onRemove();
          const removed = visible();
          markerClusterer.onAdd();
          const readded = visible();

          expect(first.length).toBeGreaterThan(0);
          expect(removed).toEqual([]);
          // A group's icon is a new marker on every draw, so compare the
          // members by identity and the rest by count.
          expect(readded.length).toBe(first.length);
          expect(markers.map((m) => readded.includes(m))).toEqual(
            markers.map((m) => first.includes(m))
          );

          // The forced draw is a one-off: the next idle render leaves the map
          // alone.
          setMapSpy.mockClear();
          markerClusterer.render();
          expect(setMapSpy).not.toHaveBeenCalled();
        }
      );

      test("markerClusterer render after a re-add without a projection draws once there is one", () => {
        zoomedMap.getZoom = jest.fn().mockReturnValue(6);
        const markers = singles.map(makeMarkerAt);
        const markerClusterer = new MarkerClusterer({
          markers,
          algorithm: new SuperClusterAlgorithm({}),
          renderer,
        });
        markerClusterer.getMap = jest.fn().mockReturnValue(zoomedMap);
        markerClusterer.getProjection = jest.fn().mockReturnValue(projection);

        markerClusterer.onAdd();
        markerClusterer.onRemove();

        (zoomedMap.getProjection as jest.Mock).mockReturnValue(null);
        markerClusterer.onAdd();
        expect(visible()).toEqual([]);

        (zoomedMap.getProjection as jest.Mock).mockReturnValue({});
        markerClusterer.render();
        expect(visible()).toHaveLength(markers.length);
        markers.forEach((marker) => expect(visible()).toContain(marker));
      });
    });

    test("markerClusterer render should not remove markers from the map if they were already rendered", () => {
      const marker = new markerClass();
      const markers: Marker[] = [marker];

      const algorithm = {
        calculate: jest.fn().mockReturnValue({
          clusters: [new Cluster({ markers })],
          changed: true,
        }),
      };
      const markerClusterer = new MarkerClusterer({
        markers,
        algorithm,
      });
      markerClusterer.getMap = jest.fn().mockImplementation(() => map);
      markerClusterer.getProjection = jest
        .fn()
        .mockImplementation(() => jest.fn());
      markerClusterer["renderClusters"] = jest.fn();
      markerClusterer["clusters"] = [new Cluster({ markers })];

      MarkerUtils.setMap = jest.fn().mockImplementation(() => null);

      markerClusterer["render"]();

      expect(MarkerUtils.setMap).toHaveBeenCalledTimes(0);
    });

    test("markerClusterer render should remove markers from the map if they are no more rendered", () => {
      const marker = new markerClass();
      const markers: Marker[] = [marker];

      const algorithm = {
        calculate: jest.fn().mockReturnValue({ clusters: [], changed: true }),
      };
      const markerClusterer = new MarkerClusterer({
        markers,
        algorithm,
      });
      markerClusterer.getMap = jest.fn().mockImplementation(() => map);
      markerClusterer.getProjection = jest
        .fn()
        .mockImplementation(() => jest.fn());
      markerClusterer["renderClusters"] = jest.fn();
      const cluster = new Cluster({ markers });
      cluster.marker = marker;
      markerClusterer["clusters"] = [cluster];

      MarkerUtils.setMap = jest.fn().mockImplementation(() => null);

      markerClusterer["render"]();

      expect(MarkerUtils.setMap).toHaveBeenCalledWith(marker, null);
    });

    test("markerClusterer render should remove all group cluster markers from the map", () => {
      const markers: Marker[] = [new markerClass(), new markerClass()];
      const algorithm = {
        calculate: jest.fn().mockReturnValue({ clusters: [], changed: true }),
      };
      const markerClusterer = new MarkerClusterer({
        markers,
        algorithm,
      });
      markerClusterer.getMap = jest.fn().mockImplementation(() => map);
      markerClusterer.getProjection = jest
        .fn()
        .mockImplementation(() => jest.fn());
      markerClusterer["renderClusters"] = jest.fn();
      const cluster = new Cluster({ markers });
      cluster.marker = new markerClass();
      markerClusterer["clusters"] = [cluster];

      MarkerUtils.setMap = jest.fn().mockImplementation(() => null);

      jest.useFakeTimers();

      markerClusterer["render"]();

      // removal happens delayed
      jest.advanceTimersByTime(50);

      expect(MarkerUtils.setMap).toHaveBeenCalledWith(cluster.marker, null);
    });

    test("markerClusterer renderClusters bypasses renderer if just one", () => {
      const markers: Marker[] = [new markerClass()];

      const markerClusterer = new MarkerClusterer({
        markers,
      });

      markerClusterer.getMap = jest.fn().mockImplementation(() => map);

      const clusters = [new Cluster({ markers })];

      markerClusterer["clusters"] = clusters;
      markerClusterer["renderClusters"]();

      expect(clusters[0].marker).toBe(markers[0]);
      expect(MarkerUtils.setMap).toHaveBeenCalledWith(markers[0], map);
    });

    test("markerClusterer renderClusters calls renderer", () => {
      const markers: Marker[] = [new markerClass(), new markerClass()];

      const markerClusterer = new MarkerClusterer({
        markers,
        renderer,
      });

      MarkerUtils.setMap = jest.fn();
      markerClusterer.getMap = jest.fn().mockImplementation(() => map);

      const clusters = [new Cluster({ markers }), new Cluster({ markers })];

      markerClusterer["clusters"] = clusters;
      markerClusterer["renderClusters"]();

      clusters.forEach((cluster) => {
        expect(MarkerUtils.setMap).toHaveBeenCalledWith(cluster.marker, map);
        expect(cluster.marker?.addListener).toHaveBeenCalledWith(
          // legacy Marker uses 'click' events, whereas AdvancedMarkerElement uses 'gmp-click'
          MarkerUtils.isAdvancedMarker(cluster.marker!) ? "gmp-click" : "click",
          expect.any(Function)
        );
      });

      expect(renderer.render).toHaveBeenCalledWith(
        clusters[0],
        expect.any(ClusterStats),
        map
      );
    });

    test("markerClusterer renderClusters remove all individual markers from the map", () => {
      const marker1 = new markerClass();
      const marker2 = new markerClass();
      const markers: Marker[] = [marker1, marker2];

      const markerClusterer = new MarkerClusterer({
        markers,
        renderer,
      });

      MarkerUtils.setMap = jest.fn();
      markerClusterer.getMap = jest.fn().mockImplementation(() => map);

      markerClusterer["clusters"] = [new Cluster({ markers })];
      markerClusterer["renderClusters"]();

      expect(MarkerUtils.setMap).toHaveBeenCalledWith(marker1, null);
      expect(MarkerUtils.setMap).toHaveBeenCalledWith(marker2, null);
    });

    test("markerClusterer renderClusters does not set click handler", () => {
      const markers: Marker[] = [new markerClass()];

      const markerClusterer = new MarkerClusterer({
        markers,
        onClusterClick: undefined,
      });

      markerClusterer.getMap = jest.fn().mockImplementation(() => map);

      const clusters = [new Cluster({ markers }), new Cluster({ markers })];

      markerClusterer["clusters"] = clusters;
      markerClusterer["renderClusters"]();

      clusters.forEach((cluster) => {
        expect(cluster.marker?.addListener).toHaveBeenCalledTimes(0);
      });
    });

    test("markerClusterer onAdd calls render and sets listener", () => {
      const markerClusterer = new MarkerClusterer({
        markers: [],
      });

      markerClusterer.getMap = jest.fn().mockImplementation(() => map);
      markerClusterer.render = jest.fn();
      markerClusterer.onAdd();

      expect(map.addListener).toHaveBeenCalledWith(
        "idle",
        expect.any(Function)
      );
      expect(markerClusterer.render).toHaveBeenCalledTimes(1);
    });

    test("markerClusterer onRemove calls reset and removes listener", () => {
      const markerClusterer = new MarkerClusterer({
        markers: [],
      });

      markerClusterer.getMap = jest.fn().mockImplementation(() => map);
      markerClusterer["reset"] = jest.fn();

      markerClusterer.onRemove();

      expect(markerClusterer["reset"]).toHaveBeenCalledTimes(1);
      expect(markerClusterer["idleListener"]).toBeNull();
    });

    test("markerClusterer addMarker", () => {
      const markerClusterer = new MarkerClusterer({
        markers: [],
      });

      markerClusterer.render = jest.fn();

      markerClusterer.addMarker(new markerClass());
      expect(markerClusterer.render).toHaveBeenCalledTimes(1);
      expect(markerClusterer["markers"]).toHaveLength(1);
    });

    test("markerClusterer addMarker does not add duplicate", () => {
      const markerClusterer = new MarkerClusterer({
        markers: [],
      });

      const marker = new markerClass();

      markerClusterer.addMarker(marker, true);
      markerClusterer.addMarker(marker, true);
      expect(markerClusterer["markers"]).toHaveLength(1);
    });

    test("markerClusterer addMarkers", () => {
      const markerClusterer = new MarkerClusterer({
        markers: [],
      });

      markerClusterer.render = jest.fn();

      markerClusterer.addMarkers([new markerClass(), new markerClass()]);
      expect(markerClusterer.render).toHaveBeenCalledTimes(1);
      expect(markerClusterer["markers"]).toHaveLength(2);

      markerClusterer.addMarkers(
        [
          new google.maps.Marker(),
          new google.maps.marker.AdvancedMarkerElement(),
        ],
        true
      );
      expect(markerClusterer.render).toHaveBeenCalledTimes(1);
    });

    test("markerClusterer removeMarker if present", () => {
      const markers = [new markerClass()];
      const markerClusterer = new MarkerClusterer({
        markers,
      });

      markerClusterer.render = jest.fn();

      expect(markerClusterer.removeMarker(markers[0])).toBe(true);
      expect(markerClusterer.render).toHaveBeenCalledTimes(1);
      expect(markerClusterer["markers"]).toHaveLength(0);
    });

    test("markerClusterer removeMarker if absent", () => {
      const markers = [new markerClass()];
      const markerClusterer = new MarkerClusterer({
        markers,
      });

      markerClusterer.render = jest.fn();

      expect(markerClusterer.removeMarker(new google.maps.Marker())).toBe(
        false
      );
      expect(
        markerClusterer.removeMarker(
          new google.maps.marker.AdvancedMarkerElement()
        )
      ).toBe(false);
      expect(markerClusterer.render).toHaveBeenCalledTimes(0);
      expect(markerClusterer["markers"]).toHaveLength(1);
    });

    test("markerClusterer removeMarkers if present", () => {
      const markers = [new markerClass()];
      const markerClusterer = new MarkerClusterer({
        markers,
      });

      markerClusterer.render = jest.fn();

      expect(markerClusterer.removeMarkers(markers)).toBe(true);
      expect(markerClusterer.render).toHaveBeenCalledTimes(1);
      expect(markerClusterer["markers"]).toHaveLength(0);
    });

    test("markerClusterer removeMarkers if absent", () => {
      const markers = [new markerClass()];
      const markerClusterer = new MarkerClusterer({
        markers,
      });

      markerClusterer.render = jest.fn();

      expect(markerClusterer.removeMarkers([new google.maps.Marker()])).toBe(
        false
      );
      expect(
        markerClusterer.removeMarkers([
          new google.maps.marker.AdvancedMarkerElement(),
        ])
      ).toBe(false);
      expect(markerClusterer.render).toHaveBeenCalledTimes(0);
      expect(markerClusterer["markers"]).toHaveLength(1);
    });

    test("markerClusterer removeMarkers if some absent", () => {
      const markers = [new markerClass()];
      const markerClusterer = new MarkerClusterer({
        markers,
      });

      markerClusterer.render = jest.fn();

      expect(
        markerClusterer.removeMarkers([
          new google.maps.Marker(),
          ...markers,
          new google.maps.marker.AdvancedMarkerElement(),
        ])
      ).toBe(true);
      expect(markerClusterer.render).toHaveBeenCalledTimes(1);
      expect(markerClusterer["markers"]).toHaveLength(0);
    });

    test("markerClusterer clearMarkers", () => {
      const markers = [new markerClass()];
      const markerClusterer = new MarkerClusterer({
        markers,
      });

      markerClusterer.render = jest.fn();

      markerClusterer.clearMarkers();
      expect(markerClusterer.render).toHaveBeenCalledTimes(1);
      expect(markerClusterer["markers"]).toHaveLength(0);

      markerClusterer.clearMarkers(true);
      expect(markerClusterer.render).toHaveBeenCalledTimes(1);
      expect(markerClusterer["markers"]).toHaveLength(0);
    });

    test("default click handler fitBounds", () => {
      const cluster = new Cluster({
        markers: [],
        position: new google.maps.LatLng(0, 0),
      });
      const bounds = new google.maps.LatLngBounds();

      jest.spyOn(cluster, "bounds", "get").mockImplementation(() => bounds);

      defaultOnClusterClickHandler(
        {} as google.maps.MapMouseEvent,
        cluster,
        map
      );

      expect(map.fitBounds).toHaveBeenCalledWith(bounds);
    });

    test("markerClusterer calls setMap from constructor", () => {
      MarkerClusterer.prototype.setMap = jest.fn();
      new MarkerClusterer({
        map,
      });

      expect(MarkerClusterer.prototype.setMap).toHaveBeenCalledWith(map);
    });
  }
);
