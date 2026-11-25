# herdr-md

Finally, markdown and the terminal done right: a native markdown pane for the
[Herdr](https://herdr.dev) desktop app, drawn in your theme next to your shell.

> [!IMPORTANT]
> herdr-md is a mod for the **Herdr desktop app** (the native window, on macOS and
> Linux). It doesn't run in `herdr`, the terminal app and CLI.

https://github.com/user-attachments/assets/0da11259-cf8d-490e-943c-72fb9807540d

- **Reads like a real document.** Heading sizes and colors from your Herdr
  theme, your terminal font, tables, task lists, `> [!NOTE]` callouts, and code
  blocks with syntax colors and a copy button.
- **Math and diagrams in place.** MathJax typesets `$$…$$`, inline `$…$`
  becomes Unicode (`ŷ = wᵀx + b`), ` ```mermaid ` fences render in your
  theme's colors, and d2l-book `:eqref:` / `:numref:` roles become working
  cross-references.
- **Moves like vim.** A block cursor with counts (`5j`), smooth glide
  scrolling, folding (`za`), an outline (`o`), search (`/`), a Telescope-style
  file picker with live preview (`ctrl-p`), and `.md` links that open in place
  with `Backspace` to go back.
- **Shows what changed.** Save the file and the pane glides to the first
  edited block and marks each one in the gutter, even across sessions ("3
  changed since you last looked"). `]` / `[` step through them.
- **Bonus: works with AI.** herdr-md has APIs for AI to interact with and
  annotate the document: your agent runs `mdh hl FILE --lines 40-52 --note "…"`
  to highlight and annotate, and `mdh sel` reads the blocks you pinned with `V`
  then `p`.

## Install

Ask your agent in Herdr:

> add the mod github.com/ryanthedev/herdr-md

then put the CLI on your PATH:

```sh
ln -s ~/.config/herdr-app/mods/herdr-md/mdh ~/.local/bin/mdh
```

Or by hand:

```sh
git clone https://github.com/ryanthedev/herdr-md
cp -R herdr-md/mods/herdr-md ~/.config/herdr-app/mods/
ln -s ~/.config/herdr-app/mods/herdr-md/mdh ~/.local/bin/mdh   # the CLI for agents
```

**Needs:** Herdr desktop app on macOS or Linux. For math and Mermaid, Node.js with npm (the mod
runs `npm install` in its `render/` folder the first time it meets a formula or
diagram, about 400 MB with Mermaid's tooling) and, for Mermaid only, an
installed Chrome, Chromium, Brave or Edge (none is downloaded; set
`CHROME_PATH` if yours is elsewhere). Without them everything else works and
figures show their source. Videos need `ffmpeg` (Homebrew's is found).
Built on macOS; see [Linux](#linux) for what it uses there.

The first `npm install` can take longer than the 30 s Herdr gives a mod's command.
If figures say `took longer than 30 s`, wait for the install to finish and reopen
the document, or run it yourself:

```sh
cd ~/.config/herdr-app/mods/herdr-md/render && PUPPETEER_SKIP_DOWNLOAD=1 npm install
```

### Linux

The viewer asks Herdr which system it runs on and picks the tool itself. There is
nothing to configure.

| What | macOS | Linux |
|---|---|---|
| Copy (`y`, the `copy` button) | `pbcopy` | the app's own clipboard |
| Web links | `open` | the app opens them |
| Mail links | `open` | `xdg-open` |
| A link to a local non-markdown file | shown in Finder | its folder opens (`xdg-open`); the file is never opened |
| Image size | `sips` | `file` (and `ffprobe` for lossless WebP) |
| `O` on a video | QuickTime Player | `mpv` |
| Video cache | BSD `stat` | GNU `stat` |

Install `file`, `xdg-utils` and `util-linux` (`setsid`), which most desktops
already have; `ffmpeg` and `mpv` for videos; `nodejs` and `npm` for math and
Mermaid, plus Chromium, Chrome, Brave or Edge for Mermaid (set `CHROME_PATH` if
yours is elsewhere). On Arch:

```sh
sudo pacman -S --needed file xdg-utils util-linux ffmpeg mpv nodejs npm chromium
```

`mpv` runs with the same guard `ffmpeg` has: only the container `ffprobe`
verified, the file protocol only, and no user config, scripts or youtube-dl. SVG
images whose size `file` can't tell are drawn in an 800×450 box.

**Remote machines:** a viewer in a space on another machine (`hc machine`) reads that
machine's files: the tab it opened from names the machine (a badge in the header), or
pass `props.machine`. The document, notes, picker and recent list live there; run `mdh`
on that machine where Herdr is the window showing it. Herdr can't watch a remote
folder, so the viewer polls every 1.5 s. Images and videos are copied over (images up
to 20 MB, videos up to 32 MB) into `.cache/`.

**What it runs:** `node`/`npm` (renderers), `ffmpeg`/`ffprobe` (video frames), `cp`, `mkdir`, and the
system tools above (macOS: `open`, `sips`, `pbcopy`, `stat`; Linux: `xdg-open`, `setsid`, `file`, `mpv`, `stat`). It
reads the file you open and the images it links, writes only inside its own
folder (`.cache/`) and `~/.cache/herdr-md/` (highlights and your selection),
and fetches nothing from the network except that one-time `npm install`.
Remote images in documents are never fetched.

**Media:** GIFs animate. A local `![](clip.mp4)` (or `.mov`, `.m4v`, `.webm`)
plays inline with no sound: the first 20 s at 10 fps, at most 720 px wide,
as JPEG frames cached in `.cache/v/`, extracted on first play (only a poster
frame on open). Only real MP4/QuickTime or WebM files are decoded: ffmpeg runs
with the file protocol only and the container forced, so a playlist named
`.mp4` is refused. Enter plays it, `O` hands the file to
QuickTime Player (macOS) or `mpv` (Linux). See [`demo/media.md`](demo/media.md).

Try it on the bundled tour: `mdh open demo/tour.md`.

## Open a file

```sh
mdh open README.md                  # a viewer to the right of the focused pane
```

or from any script: `herdr-app do pane.split '{"direction":"right","mod":"herdr-md","props":{"file":"/abs/path.md"}}'`.

### Or start in the picker

```sh
mdh pick                            # no viewer open: an empty one beside the focused pane, in the picker
```

It lists this shell's folder, or its whole git repo when the folder is inside
one. With a viewer already open it opens that viewer's picker instead. Esc
leaves an empty viewer that says `Find a markdown file · ctrl-p`; `q` closes it.

To do the same from anywhere in Herdr with `cmd-shift-o`, add this to the
`global` section of `~/.config/herdr-app/keys.json` (it reloads live):

```json
"cmd-shift-o": {
  "command": "pane.split",
  "args": { "direction": "right", "mod": "herdr-md", "props": { "pick": true } }
}
```

On Linux `cmd` means the Super key, which window managers often keep for
themselves: bind another chord, such as `ctrl-alt-o`.

The key can't use `herdr-md.pick`: a mod command only reaches a viewer that
is already showing, so with none open it does nothing. With no shell to ask,
the picker lists the focused terminal's folder (or its repo), else the folder
of the file you opened last, else your home folder.

### Set up the picker

Put options in `~/.config/herdr-md/picker.json`. They use Telescope's names, so
a Neovim setup carries over, and they're read each time the picker opens.
Without the file the picker looks as it always has. A full example:

```json
{
  "layout_strategy": "center",
  "layout_config": {
    "prompt_position": "top",
    "horizontal": { "width": 0.9, "height": 0.85, "preview_width": 0.6 },
    "center": { "width": 680, "height": 0.6, "preview_height": 0.5 }
  },
  "previewer": false,
  "files": true,
  "hidden": true,
  "no_ignore": false,
  "file_ignore_patterns": ["^archive/", "\\.draft\\.md$"],
  "path_display": [],
  "prompt_prefix": "›",
  "depth": 4
}
```

| Option | Values | Default |
|---|---|---|
| `layout_strategy` | `"horizontal"` (list beside the preview) or `"center"` (one small box, the preview above the list) | `"horizontal"` |
| `layout_config` | `width`, `height`, `preview_width` (horizontal), `preview_height` (center): 0–1 is a fraction of the room, more is pixels. `prompt_position`: `"top"` or `"bottom"`. Put them under `"horizontal"` or `"center"` to set one layout only | as before |
| `previewer` | `true` or `false` | on for horizontal, off for center |
| `files` | `false` lists folders (those holding markdown) instead of files, like telescope-file-browser. `Enter` on a folder moves into it and lists its files; `ctrl-f` switches at any time | `true` |
| `hidden` | `false` leaves out dot files and dot folders | `true` |
| `no_ignore` | `true` lists git-ignored files too | `false` |
| `file_ignore_patterns` | regexes tested against each path, relative to the listed folder (JavaScript regex, not Lua patterns) | `[]` |
| `path_display` | `["tail"]` shows file names only; `["shorten"]` cuts folders to one letter | `[]` |
| `prompt_prefix` | up to 8 characters | `"›"` |
| `depth` | how deep a folder without git is searched (1–12) | `4` |

A mistake in the file shows in the picker's footer; the options it could read
still apply.

### Click to open from the Files panel

Herdr's Files panel is a shipped mod, so change a copy of it:

```sh
herdr-app do mod.clone '{"name":"files","as":"my-files"}'
herdr-app do layout.clone '{"name":"main","as":"my-main"}'
```

In `layouts/my-main.json` set the `files` block's `content.mod` to `my-files`.
In `mods/my-files/main.js` add `run` and `setShared` to the `herdr` import and
put this at the top of `show(path, cx)`:

```js
if (path && cx && !this.on && /\.(md|markdown|mdx)$/i.test(path)) {
  const file = `${this.root}/${path}`, tab = focused()?.tab;
  const viewers = panes().filter(p => p.mod === "herdr-md" && p.tab === tab);
  if (viewers.length !== 1) return run("pane.split", { direction: "right", mod: "herdr-md", props: { file } });
  setShared("herdr-md.open", { file });   // the open viewer shows it in place
  return run("herdr-md.open");
}
```

`herdr-md.open` works from any mod: set `herdr-md.open` in shared state to
`{ file }` first. When the shown tab has one local viewer, it opens the file in
place, and `Backspace` goes back to the one before.

## For agents: `mdh`

```sh
mdh open FILE [--down]
mdh hl FILE --lines 40-52 --note "why this matters"       # replaces earlier highlights
mdh hl FILE --text "a phrase from the doc" --color green  # matches the block containing it
mdh hl FILE --lines 90 --add --color red                  # --add keeps the earlier ones
mdh focus FILE 2 · mdh clear FILE · mdh show FILE
mdh sel                                                   # what the person pinned with V … p
mdh pick                                                  # the picker in the focused (or only) viewer; none open: a new one, rooted here
mdh video FILE [N] play|pause|toggle [0:12]               # video N (1-based, default 1)
mdh video FILE [N] seek 0:12                              # jump; keeps playing or paused
```

Notes are markdown. Colors: yellow (default), green, red, blue, purple, cyan.
Highlights snap to whole blocks (a paragraph or one of its statement lines,
heading, list item, table row, code block). For Claude Code there's a ready skill in
[`skills/md-viewer/SKILL.md`](skills/md-viewer/SKILL.md): copy it to
`~/.claude/skills/md-viewer/`.

## Keys (click the viewer first)

| Keys | |
|---|---|
| `j` `k` (counts: `5j`), `gg` `G` | move the cursor (one block is one line; a table steps row by row, and a paragraph of one-statement-per-line text steps line by line) |
| `ctrl-d` `ctrl-u`, `ctrl-f` `ctrl-b`, `space` | half / full page |
| `ctrl-e` `ctrl-y` | scroll a line, cursor stays |
| `{` `}` | previous / next heading |
| `]` `[` · `c` | next / previous changed block · clear the change marks |
| `o` | outline (`j`/`k`, `Enter`, `Esc`) |
| `ctrl-p` | find a markdown file: type to fuzzy-filter, `ctrl-n` `ctrl-p` (or `ctrl-j` `ctrl-k`, arrows) move, `Enter` opens here (`Backspace` comes back), `ctrl-v` opens a split, `ctrl-d` `ctrl-u` scroll the preview, `ctrl-f` switches files ⇄ folders (`Enter` on a folder moves into it), `ctrl-g` or `Backspace` on an empty prompt goes up a folder, `Esc` closes. Lists the git work tree's `.md`/`.markdown` files (tracked and untracked, not ignored), else the folder 4 levels deep; at most 5000; recently opened first. Layout and listing are set in [`picker.json`](#set-up-the-picker) |
| `Backspace` | back after following a link (web links open in your browser; local non-markdown files are only shown in Finder, or their folder opened on Linux, never launched) |
| `zz` · `za` `zc` `zo` · `zM` `zR` | center · toggle/close/open fold · fold/unfold all |
| `V` then `j`/`k` | select blocks |
| `y` | copy the selection's markdown source (table rows bring their header along) |
| `p` | pin the selection for the agent (`mdh sel` reads it) |
| `Enter` | fold the heading, follow the first link in the block, zoom a diagram or image, or play/pause a video |
| `O` | open the video under the cursor in QuickTime Player (macOS) or `mpv` (Linux) |
| in a zoomed figure: `h` `j` `k` `l` or drag or scroll · `+` `-` or ctrl-scroll · `0` · `Esc` | pan · zoom (about the pointer) · fit · close |
| `/` then `Enter` / `Shift-Enter`, `n` `N` | search; next / previous match (or highlight) |
| `#` | line numbers: absolute → relative (vim hybrid: the cursor shows its line, the rest how many `j`/`k` away) → off; remembered for every viewer |
| `C` | cursor look: highlight → number badge → lift → badge + highlight (saved for every viewer) |
| `B` | cursor motion (default: the number blinks its color, it never moves or vanishes): steady, pulse (number, highlight or both), grow the highlight (alone or with a pulse), blink (number, highlight or both); it stays still while moving |
| `Esc` | leave visual mode, close search, clear the sent selection |
| `?` or `h` | key help: `/` searches it (`Enter` back to scrolling, `Esc` clears); `j` `k`, `ctrl-d` `ctrl-u`, `g` `G` or the wheel scroll it; any other key closes it |
| `q` | close the viewer |

Clicking a heading's arrow folds it too.

## Development

Herdr hot-reloads mods on save but doesn't follow a symlinked mod folder, so
edit here and run `scripts/dev-sync.sh` to copy the mod into
`~/.config/herdr-app/mods/herdr-md` (it skips `node_modules` and `.cache`).

## License

MIT. Bundles [marked](https://github.com/markedjs/marked) (MIT,
`mods/herdr-md/marked.LICENSE.md`); MathJax and mermaid-cli are installed from
npm on first use under their own licenses.
