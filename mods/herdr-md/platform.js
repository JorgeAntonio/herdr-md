// The commands that differ between macOS and Linux. `os` is Herdr's
// window().platform; anything but "macos" gets the Linux tools. macOS keeps the
// commands it always had. No Herdr imports, so Node can test this.

export const isMac = os => os === "macos";

// Linux openers outlive the call: detach them and drop their output, or exec
// waits on their pipes. Exits 127 when the program isn't installed.
const DETACH = 'command -v "$1" >/dev/null 2>&1 || exit 127; setsid -f "$@" >/dev/null 2>&1';
const detached = argv => ["sh", ["-c", DETACH, "detach", ...argv]];

// A web or mail link in the system's app. On Linux, web links don't come here:
// the app opens those itself (cx.open_url takes http and https only).
export const openUrlCommand = (os, url) => isMac(os) ? ["open", [url]] : detached(["xdg-open", url]);

// Show where a local file is without ever opening the file itself: Finder
// selects it; on Linux its folder opens.
export const revealCommand = (os, path, folder) => isMac(os) ? ["open", ["-R", path]] : detached(["xdg-open", folder]);

// "mtime:size" of a local file. BSD and GNU stat share no format flag.
export const statCommand = (os, path) => ["stat", [...(isMac(os) ? ["-f", "%m:%z"] : ["-c", "%Y:%s"]), path]];

// A verified clip in a video player. `fmt` is the container probeVideo allowed
// ("mov" or "matroska"). Players sniff content, so mpv gets the same guard as
// ffmpeg: that container forced, the file protocol only, and no user config,
// scripts or youtube-dl.
export const playerCommand = (os, path, fmt) => isMac(os) ? ["open", ["-a", "QuickTime Player", path]]
  : detached(["mpv", "--no-config", "--load-scripts=no", "--ytdl=no", "--demuxer=lavf", `--demuxer-lavf-format=${fmt}`,
    "--demuxer-lavf-o=protocol_whitelist=file", "--", path]);
export const playerName = os => isMac(os) ? "QuickTime Player" : "mpv";

// The commands to try in order for an image's pixel size. Both Linux tools only
// read headers: file(1) covers most formats; ffprobe, with the container forced,
// covers the lossless WebP that file(1) gives no size for.
export function imageSizeCommands(os, path) {
  if (isMac(os)) return [["sips", ["-g", "pixelWidth", "-g", "pixelHeight", path]]];
  const probe = /\.webp$/i.test(path)
    ? [["ffprobe", ["-v", "error", "-protocol_whitelist", "file", "-f", "webp_pipe", "-select_streams", "v:0",
      "-show_entries", "stream=width,height", "-of", "csv=s=x:p=0", `file:${path}`]]]
    : [];
  return [["file", ["-b", "--", path]], ...probe];
}

// { w, h } from one of those commands' output, or null.
export function parseImageSize(os, stdout) {
  let w, h;
  if (isMac(os)) {
    w = stdout.match(/pixelWidth: (\d+)/)?.[1];
    h = stdout.match(/pixelHeight: (\d+)/)?.[1];
  } else {
    // TIFF spells it "width=W, height=H". Otherwise take the last "W x H": a
    // JPEG lists its density ("density 72x72") before its pixel size.
    [, w, h] = stdout.match(/\bwidth=(\d+), height=(\d+)/) ?? [...stdout.matchAll(/\b(\d+) ?x ?(\d+)\b/g)].pop() ?? [];
  }
  return +w > 0 && +h > 0 ? { w: +w, h: +h } : null;
}
