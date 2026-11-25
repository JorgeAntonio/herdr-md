// node test/platform.test.mjs
// The commands that differ between macOS and Linux. On Linux the last tests run
// them for real (file, stat, and ffmpeg/ffprobe and ImageMagick when present).
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openUrlCommand, revealCommand, statCommand, playerCommand, playerName, imageSizeCommands, parseImageSize } from "../mods/herdr-md/platform.js";

let n = 0;
const t = (name, f) => { f(); n++; console.log("ok  ", name); };
const path = "/d/-a b'$(x).png";

t("macOS runs the same commands as before", () => {
  assert.deepEqual(openUrlCommand("macos", "https://x.dev"), ["open", ["https://x.dev"]]);
  assert.deepEqual(revealCommand("macos", path, "/d"), ["open", ["-R", path]]);
  assert.deepEqual(statCommand("macos", path), ["stat", ["-f", "%m:%z", path]]);
  assert.deepEqual(playerCommand("macos", path, "mov"), ["open", ["-a", "QuickTime Player", path]]);
  assert.deepEqual(imageSizeCommands("macos", path), [["sips", ["-g", "pixelWidth", "-g", "pixelHeight", path]]]);
  assert.equal(playerName("macos"), "QuickTime Player");
  assert.deepEqual(parseImageSize("macos", "/d/a.png\n  pixelWidth: 640\n  pixelHeight: 360\n"), { w: 640, h: 360 });
});
t("Linux openers are detached, with paths and URLs as arguments", () => {
  for (const [cmd, args] of [openUrlCommand("linux", "mailto:a@b.dev"), revealCommand("linux", path, "/d"), playerCommand("linux", path, "mov")]) {
    assert.equal(cmd, "sh");
    assert.match(args[1], /setsid -f "\$@" >\/dev\/null 2>&1$/);
      assert.ok(!args[1].includes("$(x)") && !args[1].includes("b.dev"), "nothing is spliced into the script");
  }
});
t("Linux reveals the folder, never the file", () => {
  const args = revealCommand("linux", "/d/run.desktop", "/d")[1];
  assert.deepEqual(args.slice(3), ["xdg-open", "/d"]);
});
t("mpv gets the verified container, the file protocol only and no user config", () => {
  const args = playerCommand("linux", path, "matroska")[1].slice(3);
  assert.equal(args[0], "mpv");
  for (const flag of ["--no-config", "--load-scripts=no", "--ytdl=no", "--demuxer=lavf", "--demuxer-lavf-format=matroska", "--demuxer-lavf-o=protocol_whitelist=file"]) assert.ok(args.includes(flag), flag);
  assert.deepEqual(args.slice(-2), ["--", path]);
});
t("ffprobe is only asked about WebP, with that format forced", () => {
  assert.equal(imageSizeCommands("linux", "/a.png").length, 1);
  const probe = imageSizeCommands("linux", "/a.WEBP")[1][1];
  assert.equal(probe[probe.indexOf("-f") + 1], "webp_pipe");
  assert.equal(probe[probe.indexOf("-protocol_whitelist") + 1], "file");
});
t("file(1) and ffprobe output", () => {
  const size = s => parseImageSize("linux", s);
  for (const out of [
    "PNG image data, 640 x 360, 16-bit/color RGB, non-interlaced",
    "JPEG image data, JFIF standard 1.01, resolution (DPI), density 300x300, segment length 16, baseline, precision 8, 640x360, components 3",
    "GIF image data, version 89a, 640 x 360",
    "RIFF (little-endian) data, WebP image, VP8 encoding, 640x360, Scaling: [none]x[none], YUV color, decoders should clamp",
    "PC bitmap, Windows 98/2000 and newer format, 640 x 360 x 24, cbSize 691338, bits offset 138",
    "TIFF image data, little-endian, direntries=15, width=640, height=360, bps=6338, compression=none",
    "640x360\n",
  ]) assert.deepEqual(size(out), { w: 640, h: 360 }, out);
  for (const out of ["RIFF (little-endian) data, WebP image, lossless, with alpha", "SVG Scalable Vector Graphics image", "0x0", ""]) assert.equal(size(out), null, out);
});

if (process.platform === "linux") {
  const dir = mkdtempSync(join(tmpdir(), "herdr-md-platform-"));
  const has = p => spawnSync("sh", ["-c", 'command -v "$1"', "has", p]).status === 0;
  const run = ([cmd, args]) => spawnSync(cmd, args, { encoding: "utf8", timeout: 20000 });
  try {
    t("real GNU stat gives mtime:size", () => {
      const f = join(dir, "-s.txt"); writeFileSync(f, "12345");
      assert.match(run(statCommand("linux", f)).stdout.trim(), /^\d+:5$/);
    });
    t("a missing program exits 127", () => {
      const [, args] = openUrlCommand("linux", "mailto:a@b.dev");
      assert.equal(spawnSync("/bin/sh", args, { env: { PATH: dir } }).status, 127);
    });
    if (has("magick") && has("file")) t("real image files", () => {
      const types = ["png", "jpg", "gif", "webp", "bmp", "tiff", ...(has("ffprobe") ? ["lossless.webp"] : [])];
      for (const type of types) {
        const f = join(dir, `i.${type}`);
        execFileSync("magick", ["-size", "640x360", "gradient:red-blue", ...(type.startsWith("lossless") ? ["-define", "webp:lossless=true"] : []), f]);
        let size = null;
        for (const command of imageSizeCommands("linux", f)) {
          const r = run(command);
          if (r.status === 0 && (size = parseImageSize("linux", r.stdout))) break;
        }
        assert.deepEqual(size, { w: 640, h: 360 }, type);
      }
    });
    if (has("mpv") && has("ffmpeg")) t("real mpv plays the verified container and refuses a disguised playlist", () => {
      const clip = join(dir, "v.mp4"), fake = join(dir, "fake.mp4");
      execFileSync("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "testsrc=size=160x120:rate=10", "-t", "1", "-pix_fmt", "yuv420p", clip]);
      writeFileSync(fake, "#EXTM3U\n#EXT-X-TARGETDURATION:10\n#EXTINF:10,\nfile:///etc/hostname\n#EXT-X-ENDLIST\n");
      // The player's own flags, run in the foreground without a window or sound.
      const play = f => spawnSync("mpv", [...playerCommand("linux", f, "mov")[1].slice(4, -2), "--vo=null", "--ao=null", "--frames=1", "--", f], { timeout: 20000 }).status;
      assert.equal(play(clip), 0);
      assert.notEqual(play(fake), 0);
    });
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
console.log(`${n} tests passed`);
