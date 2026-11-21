import { test } from "node:test";
import assert from "node:assert/strict";
import { cacheFlow } from "../mods/herdr-md/flow-cache.js";

test("cache hits reuse the flow and refresh its LRU position", () => {
  const cache = new Map();
  let builds = 0;
  const make = source => cacheFlow(cache, source, () => { builds++; return [source]; }, { maxEntries: 2, maxChars: 100 });
  const first = make("a");
  make("b");
  assert.equal(make("a"), first);
  make("c");
  assert.deepEqual([...cache.keys()], ["a", "c"]);
  assert.equal(builds, 3);
});

test("cache bounds total source text as well as entry count", () => {
  const cache = new Map();
  const make = source => cacheFlow(cache, source, () => [source], { maxEntries: 8, maxChars: 6 });
  make("abc");
  make("def");
  make("xy");
  assert.deepEqual([...cache.keys()], ["def", "xy"]);
});

test("oversized flow sources are returned but never cached", () => {
  const cache = new Map();
  const result = cacheFlow(cache, "long source", () => ["built"], { maxChars: 4 });
  assert.deepEqual(result, ["built"]);
  assert.equal(cache.size, 0);
});
