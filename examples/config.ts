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

import { APIOptions } from "@googlemaps/js-api-loader";
import { MarkerUtils } from "../src";

export const MAP_ID = "DEMO_MAP_ID";

const DEFAULT_KEY = "AIzaSyDhRjl83cPVWeaEer-SnKIw7GTjBuqWxXI";

export const getLoaderOptions = (): APIOptions => ({
  key: localStorage.getItem("gmaps-key") ?? DEFAULT_KEY,
  v: "weekly",
  libraries: ["marker"],
});

// helper function to keep maps in sync
export const sync = (...maps: google.maps.Map[]): void => {
  let center: google.maps.LatLng;
  let zoom: number;

  function update(changedMap: google.maps.Map) {
    maps.forEach((m) => {
      if (m === changedMap) {
        return;
      }

      m.setCenter(center);
      m.setZoom(zoom);
    });
  }

  maps.forEach((m) => {
    m.addListener("bounds_changed", () => {
      const changedCenter = m.getCenter()!;
      const changedZoom = m.getZoom()!;

      if (changedCenter !== center || changedZoom !== zoom) {
        center = changedCenter;
        zoom = changedZoom;
        update(m);
      }
    });
  });
};

// Creates an Advanced Marker.
//
// Throws instead of falling back to the deprecated google.maps.Marker, so a
// map missing Advanced Marker support fails loudly with an actionable
// message rather than silently teaching the deprecated API.
export function createMarker(map: google.maps.Map, lat: number, lng: number) {
  if (!MarkerUtils.isAdvancedMarkerAvailable(map)) {
    throw new Error(
      "Advanced Markers are not available for this map. Use a Map ID with " +
        "Advanced Markers enabled: " +
        "https://developers.google.com/maps/documentation/javascript/advanced-markers/migration"
    );
  }

  return new google.maps.marker.AdvancedMarkerElement({
    map,
    position: { lat, lng },
  });
}

// Logs an error that stopped an example from starting and shows it at the
// top of the page, so a failed load doesn't leave a blank map. All text is
// set with textContent, so nothing in the error is parsed as HTML.
export function showError(error: unknown): void {
  console.error(error);

  const message = error instanceof Error ? error.message : String(error);

  const summary = document.createElement("strong");
  summary.textContent = `This example could not start: ${message}`;

  const networkHint = document.createElement("p");
  networkHint.textContent =
    "If the Maps JavaScript API could not load, check the network " +
    "connection and that no content blocker is blocking maps.googleapis.com.";

  const indexLink = document.createElement("a");
  indexLink.href = "../index.html";
  indexLink.textContent = "examples index page";

  const errorsLink = document.createElement("a");
  errorsLink.href =
    "https://developers.google.com/maps/documentation/javascript/error-messages";
  errorsLink.textContent = "Maps JavaScript API error messages";

  const setupHint = document.createElement("p");
  setupHint.append(
    "Problems with the API key, billing, or the key's website restrictions " +
      "are reported in the browser console as errors ending in MapError. " +
      "Enter your own key on the ",
    indexLink,
    ", and see ",
    errorsLink,
    "."
  );

  const errorBox = document.createElement("div");
  errorBox.setAttribute("role", "alert");
  errorBox.style.cssText =
    "margin: 12px; padding: 1rem; border: 1px solid #c5221f; " +
    "background-color: #fce8e6; color: #333333; font-family: sans-serif;";
  errorBox.append(summary, networkHint, setupHint);
  document.body.prepend(errorBox);
}
