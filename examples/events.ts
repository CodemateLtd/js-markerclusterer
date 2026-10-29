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

import { MAP_ID, createMarker, getLoaderOptions } from "./config";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import {
  Cluster,
  MarkerClusterer,
  MarkerClustererEvents,
  defaultOnClusterClickHandler,
  onClusterClickHandler,
} from "../src";
import trees from "./trees.json";

const MAX_LOG_ENTRIES = 50;

const mapOptions: google.maps.MapOptions = {
  center: { lat: 40.7128, lng: -73.85 },
  zoom: 12,
  mapId: MAP_ID,
};

async function main() {
  setOptions(getLoaderOptions());

  const { Map, InfoWindow } = await importLibrary("maps");
  await importLibrary("marker");

  const map = new Map(document.getElementById("map")!, mapOptions);
  const log = document.getElementById("log")!;
  const clickMode = document.getElementById("click-mode") as HTMLSelectElement;
  const removeButton = document.getElementById(
    "remove-listeners"
  ) as HTMLButtonElement;

  const appendLog = (message: string) => {
    const entry = document.createElement("li");
    entry.textContent = message;
    log.prepend(entry);
    while (log.children.length > MAX_LOG_ENTRIES) {
      log.lastElementChild!.remove();
    }
  };

  const markers = trees.map(({ geometry }) =>
    createMarker(map, geometry.coordinates[1], geometry.coordinates[0])
  );

  // The map is set after the listeners below are registered, so no render is
  // missed.
  const markerCluster = new MarkerClusterer({ markers });

  // clusteringbegin and clusteringend pass the clusterer. They fire on every
  // render once the map has a projection, including renders where the
  // clusters don't change, such as a pan at the same zoom. Both fire in the
  // same task, so the browser doesn't paint between them: a loading indicator
  // shown on clusteringbegin and hidden on clusteringend never appears.
  let renderStart = 0;
  const listeners = [
    markerCluster.addListener(
      MarkerClustererEvents.CLUSTERING_BEGIN,
      (clusterer: MarkerClusterer) => {
        renderStart = performance.now();
        appendLog(`clusteringbegin at zoom ${clusterer.getMap()?.getZoom()}`);
      }
    ),
    markerCluster.addListener(MarkerClustererEvents.CLUSTERING_END, () => {
      const elapsed = (performance.now() - renderStart).toFixed(1);
      appendLog(`clusteringend after ${elapsed} ms`);
    }),
    // click passes the Cluster. It fires before onClusterClick is called, and
    // also when onClusterClick is null.
    markerCluster.addListener(
      MarkerClustererEvents.CLUSTER_CLICK,
      (cluster: Cluster) => {
        appendLog(
          `click: ${cluster.count} markers at ${cluster.position.toUrlValue()}`
        );
      }
    ),
  ];

  markerCluster.setMap(map);

  const infoWindow = new InfoWindow();

  // onClusterClick gets the cluster marker's click event, the Cluster and the
  // map. An Advanced Marker passes a google.maps.marker.AdvancedMarkerClickEvent,
  // which has no latLng, so this handler uses cluster.position.
  const showClusterInfo: onClusterClickHandler = (event, cluster, map) => {
    const content = document.createElement("div");
    content.textContent = `${cluster.count} markers `;
    const zoomButton = document.createElement("button");
    zoomButton.textContent = "Zoom in";
    zoomButton.addEventListener("click", () => {
      infoWindow.close();
      defaultOnClusterClickHandler(event, cluster, map);
    });
    content.append(zoomButton);

    infoWindow.setOptions({ content, position: cluster.position });
    infoWindow.open({ map });
  };

  const clickHandlers: Record<string, onClusterClickHandler | null> = {
    default: defaultOnClusterClickHandler,
    info: showClusterInfo,
    // null turns off the zoom; the clusterer still fires its click event.
    none: null,
  };

  clickMode.addEventListener("change", () => {
    infoWindow.close();
    markerCluster.onClusterClick = clickHandlers[clickMode.value];
  });

  removeButton.addEventListener("click", () => {
    listeners.forEach((listener) => listener.remove());
    removeButton.disabled = true;
    appendLog("Listeners removed. Clustering and onClusterClick carry on.");
  });
}

main().catch((err) => console.error(err));
