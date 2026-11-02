"""Download the verified source clips recorded in the shipped attribution catalog."""

import concurrent.futures, json, pathlib, subprocess

root = pathlib.Path(__file__).resolve().parent.parent
cache = pathlib.Path("/private/tmp/form-real-demos")
cache.mkdir(exist_ok=True)
records = json.loads((root / "public/exercises/ATTRIBUTION.json").read_text())


def download(item):
    slug, record = item
    path = cache / (slug + ".mp4")
    if not path.exists():
        subprocess.run(
            [
                "curl",
                "-Ls",
                "--fail",
                "--retry",
                "2",
                "--max-time",
                "90",
                record["video"],
                "-o",
                str(path),
            ],
            check=True,
        )
    print("Source ready:", slug, flush=True)


clips = {slug: r for slug, r in records.items() if r["kind"] == "footage"}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    list(pool.map(download, clips.items()))
(cache / "sources.json").write_text(json.dumps(clips, indent=2))
