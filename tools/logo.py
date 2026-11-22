"""Generate a 16-bit style pixel-art arrow (diagonal, tip at top-right)."""
import sys
from PIL import Image

N = 24
PAL = {
    'K': '#1b1410', 'S': '#f1f5f8', 's': '#b4c0c8', 'd': '#6f7d88',
    'W': '#e5ad62', 'w': '#9c5f27',
    'R': '#e04a32', 'r': '#9a2418', 'F': '#f6e7c6', 'f': '#c9a77a',
    'Y': '#f5c451', 'y': '#b07f22',
}
M = N - 1
grid = [['.' for _ in range(N)] for _ in range(N)]


def put(x, y, c):
    if 0 <= x < N and 0 <= y < N:
        grid[y][x] = c


TIP = M - 4
HEAD_LEN = 12
BASE = TIP - HEAD_LEN
TAIL = -(M - 4)
FL_LEN = 13

for y in range(N):
    for x in range(N):
        a, p = x - y, x + y - M
        # head (leaf/bodkin hybrid)
        if BASE <= a <= TIP:
            t = (TIP - a) / HEAD_LEN          # 0 at tip, 1 at base
            half = 4.6 * t if t < 0.72 else 4.6 * 0.72 - (t - 0.72) * 9
            half = max(half, 1)
            if abs(p) <= half:
                put(x, y, 'S' if p < -1 else ('s' if p <= 1 else 'd'))
                continue
        # shaft (2px thick staircase)
        if TAIL <= a < BASE and abs(p) <= 1:
            put(x, y, 'W' if p < 0 else 'w')

# fletching (two fins)
for y in range(N):
    for x in range(N):
        a, p = x - y, x + y - M
        rel = a - (TAIL + 3)
        if 0 <= rel <= FL_LEN and 2 <= abs(p):
            h = 5.5 if rel <= 7 else 5.5 - (rel - 7) * 0.6
            if abs(p) <= h:
                bar = rel in (2, 3, 8, 9)
                if p < 0:
                    put(x, y, 'F' if bar else 'R')
                else:
                    put(x, y, 'f' if bar else 'r')

# thread binding just ahead of fletching, nock at rear
for y in range(N):
    for x in range(N):
        a, p = x - y, x + y - M
        if a in (TAIL + 3 + FL_LEN + 1, TAIL + 3 + FL_LEN + 2) and abs(p) <= 1:
            put(x, y, 'Y')
        if TAIL - 1 <= a <= TAIL + 2 and abs(p) <= 1:
            put(x, y, 'Y' if p < 0 else 'y')

# outline (8-neighbour for a chunkier sprite look)
filled = {(x, y) for y in range(N) for x in range(N) if grid[y][x] != '.'}
for (x, y) in list(filled):
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        nx, ny = x + dx, y + dy
        if 0 <= nx < N and 0 <= ny < N and (nx, ny) not in filled:
            grid[ny][nx] = 'K'

for row in grid:
    print(''.join(row))

rects = []
for y in range(N):
    # merge horizontal runs for a smaller SVG
    x = 0
    while x < N:
        c = grid[y][x]
        if c == '.':
            x += 1
            continue
        x2 = x
        while x2 + 1 < N and grid[y][x2 + 1] == c:
            x2 += 1
        rects.append(f'<rect x="{x}" y="{y}" width="{x2 - x + 1}" height="1" fill="{PAL[c]}"/>')
        x = x2 + 1
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {N} {N}" '
       f'shape-rendering="crispEdges">' + ''.join(rects) + '</svg>')
out = sys.argv[1]
open(out + '.svg', 'w').write(svg)
img = Image.new('RGBA', (N, N), (0, 0, 0, 0))
for y in range(N):
    for x in range(N):
        c = grid[y][x]
        if c != '.':
            h = PAL[c].lstrip('#')
            img.putpixel((x, y), tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,))
img.resize((N * 12, N * 12), Image.NEAREST).save(out + '_preview.png')
img.resize((192, 192), Image.NEAREST).save(out + '_192.png')
img.resize((512, 512), Image.NEAREST).save(out + '_512.png')
img.resize((48, 48), Image.NEAREST).save(out + '_48.png')
