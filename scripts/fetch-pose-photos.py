import subprocess, concurrent.futures

photos = {
    "dead-bug": "Dead_Bug",
    "dumbbell-bent-over-row": "Bent_Over_Two-Dumbbell_Row",
    "gentle-full-body-stretch": "Overhead_Stretch",
    "brisk-walk-or-cycle": "Walking_Treadmill",
}


def fetch(item):
    slug, id, i = item
    subprocess.run(
        [
            "curl",
            "-Ls",
            "--fail",
            "--max-time",
            "30",
            f"https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/{id}/{i}.jpg",
            "-o",
            f"/private/tmp/form-real-demos/{slug}-{i}.jpg",
        ],
        check=True,
    )


with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    list(pool.map(fetch, [(s, id, i) for s, id in photos.items() for i in range(2)]))
