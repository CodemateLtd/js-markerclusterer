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

// The MarkerUtils marker helpers take the Marker type, which is either an
// AdvancedMarkerElement or a deprecated google.maps.Marker. Code written with
// them works for both, which helps an app that still has legacy Markers while
// it migrates. This page creates Advanced Markers only.

import { Marker, MarkerClusterer, MarkerUtils } from "../src";
import { MAP_ID, createMarker, getLoaderOptions } from "./config";

import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import trees from "./trees.json";

// isAdvancedMarker narrows the type, for anything MarkerUtils doesn't wrap,
// such as the title shown on hover.
function setTitle(marker: Marker, title: string) {
  if (MarkerUtils.isAdvancedMarker(marker)) {
    marker.title = title;
  } else {
    marker.setTitle(title);
  }
}

async function main() {
  setOptions(getLoaderOptions());

  const { Map } = await importLibrary("maps");
  await importLibrary("marker");
  const { ControlPosition, LatLngBounds } = await importLibrary("core");

  const map = new Map(document.getElementById("map")!, { mapId: MAP_ID });

  const markers: Marker[] = trees.map(
    ({ geometry, spc_common: species, status }) => {
      const marker = createMarker(
        map,
        geometry.coordinates[1],
        geometry.coordinates[0]
      );
      // Dead trees and stumps have no species.
      setTitle(marker, species ?? status);
      return marker;
    }
  );

  // getPosition returns a LatLng for either marker type.
  const bounds = new LatLngBounds();
  markers.forEach((marker) => bounds.extend(MarkerUtils.getPosition(marker)));
  map.fitBounds(bounds);

  const markerCluster = new MarkerClusterer({ map, markers });

  // The clusterer sets the map of the markers it holds, so setMap is only
  // called while the markers are out of it.
  let clustered = true;
  const button = document.createElement("button");
  button.textContent = "Turn clustering off";
  button.classList.add("control");
  button.addEventListener("click", () => {
    clustered = !clustered;
    if (clustered) {
      markerCluster.addMarkers(markers);
    } else {
      markerCluster.clearMarkers();
      markers.forEach((marker) => MarkerUtils.setMap(marker, map));
    }
    button.textContent = clustered
      ? "Turn clustering off"
      : "Turn clustering on";
  });

  const description = document.createElement("pre");
  description.textContent = [
    "MarkerUtils.getPosition: fits the map to the markers",
    "MarkerUtils.isAdvancedMarker: sets each marker's title",
    "MarkerUtils.setMap: shows the markers without clustering",
  ].join("\n");
  description.classList.add("control");

  map.controls[ControlPosition.TOP_LEFT].push(description);
  map.controls[ControlPosition.TOP_LEFT].push(button);
}

main().catch((err) => console.error(err));
