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

/**
 * A typescript assertion function used in cases where typescript has to be
 * convinced that the object in question can not be null.
 *
 * @param value
 * @param message
 */
export function assertNotNull<TValue>(
  value: TValue,
  message: string = "assertion failed"
): asserts value is NonNullable<TValue> {
  if (value === null || value === undefined) {
    throw Error(message);
  }
}

/**
 * Throws a `RangeError` unless the supercluster library can build an index for
 * `maxZoom`. The library caps `maxZoom` at 30 and sizes an array from the
 * result, so the capped value has to be a whole number of -1 or more.
 *
 * @param maxZoom
 */
export function assertSuperClusterMaxZoom(maxZoom: number): void {
  const cappedMaxZoom = Math.min(maxZoom, 30);
  if (!Number.isInteger(cappedMaxZoom) || cappedMaxZoom < -1) {
    throw new RangeError(
      "maxZoom must be a whole number of -1 or more (values above 30 are " +
        `treated as 30); got ${maxZoom}`
    );
  }
}
