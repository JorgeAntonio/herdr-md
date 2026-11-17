// node test/remote.test.mjs
// Which machine a viewer reads from, and the pieces of the remote file copy.
import assert from "node:assert/strict";
import { machineCandidates, parseStats, slices, chunkCount, CHUNK, SLICE, STAT_SH, CHUNK_SH } from "../mods/herdr-md/remote.js";

let n = 0;
const t = (name, f) => { f(); n++; console.log("ok  ", name); };

const spaces = [
  { machine: null, tabs: [{ id: "tb1" }] },
  { machine: "ska", tabs: [{ id: "ska/tb2" }, { id: "ska/tb3" }] },
  { machine: "vana", tabs: [{ id: "vana/tb4" }] },
];
const panes = [{ mod: "herdr-md", tab: "vana/tb4" }, { mod: "other", tab: "tb1" }];
const cand = o => machineCandidates({ spaces, panes: [], mod: "herdr-md", ...o });

t("an explicit machine is the only candidate", () => {
  assert.deepEqual(cand({ explicit: "ska", focusedTab: "tb1" }), ["ska"]);
  assert.deepEqual(cand({ explicit: null, focusedTab: "ska/tb2" }), [null]);
  assert.deepEqual(cand({ explicit: "", focusedTab: "ska/tb2" }), [null]);
});
t("the focused tab's machine comes first, then this Mac", () => {
  assert.deepEqual(cand({ focusedTab: "ska/tb3" }), ["ska", null]);
});
t("a local focus stays local (nothing changes for local files)", () => {
  assert.deepEqual(cand({ focusedTab: "tb1" }), [null]);
});
t("viewer tabs add their machines after the focused one", () => {
  assert.deepEqual(cand({ focusedTab: "ska/tb2", panes }), ["ska", "vana", null]);
  assert.deepEqual(cand({ focusedTab: null, panes }), ["vana", null]);
});
t("an unknown tab and no focus fall back to this Mac", () => {
  assert.deepEqual(cand({ focusedTab: "zzz" }), [null]);
  assert.deepEqual(cand({}), [null]);
});
t("parseStats keeps one signature per path, null for a missing one", () => {
  assert.deepEqual(parseStats("1700000000:42\n-\n"), ["1700000000:42", null]);
  assert.deepEqual(parseStats(""), [null]);
});
t("slices split base64 on multiples of 4 and rejoin whole", () => {
  const s = "A".repeat(SLICE * 2 + 8), out = slices(s);
  assert.equal(out.length, 3); assert.equal(out.join(""), s);
  assert.ok(out.slice(0, -1).every(x => x.length % 4 === 0));
});
t("chunkCount rounds up", () => {
  assert.equal(chunkCount(1), 1); assert.equal(chunkCount(CHUNK), 1); assert.equal(chunkCount(CHUNK + 1), 2); assert.equal(chunkCount(0), 0);
});
t("a local focus with a viewer elsewhere probes this Mac first, then that machine", () => {
  assert.deepEqual(cand({ focusedTab: "tb1", panes }), [null, "vana"]);
});
t("parseStats takes sub-second mtimes and rejects junk (GNU `stat -f` filesystem output)", () => {
  assert.deepEqual(parseStats("1794926207.689238846:42\n-"), ["1794926207.689238846", null].map((x, i) => i ? null : "1794926207.689238846:42"));
  const gnuFs = "  File: \"x\"\n    ID: 1 Namelen: 255 Type: ext2/ext3\nBlock size: 4096\n";
  assert.deepEqual(parseStats(gnuFs).filter(Boolean), []);
});
t("STAT_SH tries GNU stat before BSD stat, so GNU never runs `stat -f`", () => {
  assert.ok(STAT_SH.indexOf("stat -c") < STAT_SH.indexOf("stat -f"));
});
t("CHUNK_SH checks readability before the pipeline (whose status is tr's)", () => {
  assert.ok(CHUNK_SH.startsWith('[ -r "$1" ] || exit 1;'));
});
console.log(`${n} passed`);
