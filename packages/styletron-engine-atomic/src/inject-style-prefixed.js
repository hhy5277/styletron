// @flow

import hyphenate from "./hyphenate-style-name";
import prefixAll from "inline-style-prefixer/static";

import type {baseStyleT} from "styletron-standard";

import {MultiCache} from "./cache.js";

export default function injectStylePrefixed(
  styleCache: MultiCache<{pseudo: string, block: string}>,
  styles: baseStyleT,
  media: string,
  pseudo: string
) {
  const cache = styleCache.getCache(media);
  let classString = "";
  for (const originalKey in styles) {
    const originalVal = styles[originalKey];

    if (typeof originalVal !== "object") {
      // Primitive value
      if (__DEV__) {
        validateValueType(originalVal);
      }

      const key = `${originalKey}${pseudo}:${((originalVal: any): string)}`;

      const cachedId = cache.cache[key];
      if (cachedId !== void 0) {
        // cache hit
        classString += " " + cachedId;
        continue;
      } else {
        // cache miss
        let block = "";
        const prefixed = prefixAll({[originalKey]: originalVal});
        for (const prefixedKey in prefixed) {
          const prefixedVal = prefixed[prefixedKey];
          const prefixedValType = typeof prefixedVal;
          if (prefixedValType === "string" || prefixedValType === "number") {
            block += `${hyphenate(prefixedKey)}:${prefixedVal};`;
          } else if (Array.isArray(prefixedVal)) {
            const hyphenated = hyphenate(prefixedKey);
            for (let i = 0; i < prefixedVal.length; i++) {
              block += `${hyphenated}:${prefixedVal[i]};`;
            }
          }
        }
        block = block.slice(0, -1); // Remove trailing semicolon
        const id = cache.addValue(key, {pseudo, block});
        classString += " " + id;
      }
    } else {
      // Object value
      if (originalKey[0] === ":") {
        classString +=
          " " +
          injectStylePrefixed(
            styleCache,
            originalVal,
            media,
            pseudo + originalKey
          );
      } else if (originalKey.substring(0, 6) === "@media") {
        classString +=
          " " +
          injectStylePrefixed(
            styleCache,
            originalVal,
            originalKey.substr(7),
            pseudo
          );
      }
    }
  }
  // remove leading space
  return classString.slice(1);
}

function validateValueType(value) {
  if (
    value === null ||
    Array.isArray(value) ||
    (typeof value !== "number" && typeof value !== "string")
  ) {
    throw new Error(`Unsupported style value: ${JSON.stringify(value)}`);
  }
}