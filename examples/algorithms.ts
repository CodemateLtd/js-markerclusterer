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
  Algorithm,
  AlgorithmInput,
  AlgorithmOutput,
  Cluster,
  GridAlgorithm,
  Marker,
  MarkerClusterer,
  MarkerUtils,
  NoopAlgorithm,
  SuperClusterAlgorithm,
} from "../src";
import { MAP_ID, createMarker, getLoaderOptions, sync } from "./config";

import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import trees from "./trees.json";

const mapOptions: google.maps.MapOptions = {
  center: { lat: 40.7128, lng: -73.85 },
  zoom: 10,
  mapId: MAP_ID,
};

interface CellAlgorithmOptions {
  // The width and height of a cell, in pixels. Defaults to 80.
  cellSize?: number;
}

// A custom algorithm: it implements the Algorithm interface, which is all
// MarkerClusterer needs. It divides the world into square cells of cellSize
// pixels at the current zoom and puts the markers in each cell in one cluster.
// The cells stay where they are when the map pans, so the clusters change only
// when the zoom or the markers do. It clusters every marker, not only those in
// the viewport, which is fine for the 1,000 markers here.
//
// The built-in algorithms extend two base classes, which are exported but left
// out of the API reference. AbstractAlgorithm stores a maxZoom option, the
// zoom from which markers are not clustered, and has a noop() helper that puts
// each marker in its own cluster; a subclass still writes calculate and checks
// maxZoom itself. This example has no maxZoom, so markers at the same position
// stay in one cluster at every zoom. AbstractViewportAlgorithm writes
// calculate for you: it clusters only the markers in the padded viewport and
// leaves markers unclustered from maxZoom, so a subclass writes only cluster().
// The viewport changes with every pan, so it clusters again after each one.
class CellAlgorithm implements Algorithm {
  private cellSize: number;
  private lastZoom?: number;
  private lastMarkers: Marker[] = [];
  private lastClusters: Cluster[] = [];

  constructor({ cellSize = 80 }: CellAlgorithmOptions) {
    this.cellSize = cellSize;
  }

  public calculate({ markers, map }: AlgorithmInput): AlgorithmOutput {
    // MarkerClusterer calls calculate only once the map has a projection, so
    // the map's zoom and projection are set.
    const zoom = map.getZoom()!;

    // MarkerClusterer changes its markers array in place, so compare the
    // markers one by one rather than the array. This doesn't notice a marker
    // that moves; an algorithm with moving markers would compare positions too.
    const changed =
      zoom !== this.lastZoom ||
      markers.length !== this.lastMarkers.length ||
      markers.some((marker, i) => marker !== this.lastMarkers[i]);

    // Same zoom and same markers give the same clusters, so return them with
    // changed: false and the clusterer keeps what it has drawn.
    if (!changed) {
      return { clusters: this.lastClusters, changed: false };
    }

    const projection = map.getProjection()!;
    const scale = 2 ** zoom;
    const cells = new Map<string, Marker[]>();
    for (const marker of markers) {
      // The default Mercator projection maps every position to a point.
      const point = projection.fromLatLngToPoint(
        MarkerUtils.getPosition(marker)
      )!;
      const column = Math.floor((point.x * scale) / this.cellSize);
      const row = Math.floor((point.y * scale) / this.cellSize);
      const key = `${column},${row}`;
      const cell = cells.get(key);
      if (cell) {
        cell.push(marker);
      } else {
        cells.set(key, [marker]);
      }
    }

    this.lastZoom = zoom;
    this.lastMarkers = [...markers];
    this.lastClusters = [...cells.values()].map(
      (cellMarkers) => new Cluster({ markers: cellMarkers })
    );

    // changed: true tells the clusterer to redraw. The first call always
    // gets here, because there is no last zoom yet.
    return { clusters: this.lastClusters, changed: true };
  }
}

async function main() {
  setOptions(getLoaderOptions());

  const { Map } = await importLibrary("maps");
  await importLibrary("marker");
  const { ControlPosition } = await importLibrary("core");
  const maps: google.maps.Map[] = [];

  const panels: [HTMLElement, Algorithm, string][] = [
    [
      document.getElementById("noop")!,
      new NoopAlgorithm({}),
      "new NoopAlgorithm()",
    ],
    [
      document.getElementById("grid")!,
      new GridAlgorithm({ maxDistance: 40000 }),
      "new GridAlgorithm({})",
    ],
    [
      document.getElementById("supercluster")!,
      new SuperClusterAlgorithm({}),
      "new SuperClusterAlgorithm({})",
    ],
    [
      document.getElementById("custom")!,
      new CellAlgorithm({ cellSize: 80 }),
      "new CellAlgorithm({ cellSize: 80 })",
    ],
  ];

  panels.forEach(([element, algorithm, text]) => {
    const map = new Map(element, mapOptions);
    maps.push(map);

    const textElement = document.createElement("pre");
    textElement.innerText = text;
    textElement.classList.add("description");

    map.controls[ControlPosition.LEFT_TOP].push(textElement);

    const markers = trees.map(({ geometry }) =>
      createMarker(map, geometry.coordinates[1], geometry.coordinates[0])
    );

    new MarkerClusterer({
      algorithm,
      map,
      markers,
    });
  });

  sync(...maps);
}

main().catch((err) => console.error(err));
