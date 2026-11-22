# Generates c:\Projects\Arrowmaker\research\bows-and-calcs.json
import json, math

OUT = r"c:\Projects\Arrowmaker\research\bows-and-calcs.json"
M = "Manual del Club"

def t(es, en):
    return {"es": es, "en": en}

# ---------------------------------------------------------------- helpers
def band_low(x):
    """5-lb wood spine band containing x (3Rivers / Manual del Club convention)."""
    return 5 * math.floor((x - 0.5) / 5)

def band_str(x):
    lo = band_low(x)
    if lo < 10:
        return "<10"
    return f"{lo}-{lo+5}"

# ---------------------------------------------------------------- WOOD charts
# 1) Manual del Club, Annex I p.47 "English Longbow / Spine Guide" (cols = DRAW length)
ml_rows = [[lo, lo + 5] for lo in range(20, 80, 5)]
ml_cols = [25, 26, 27, 28, 29, 30, 31]
ml_cells = []
for lo, hi in ml_rows:
    row = []
    for d in ml_cols:
        s = lo - 5 + 5 * (d - 28)
        row.append("<10" if s < 10 else f"{s}/{s+5}")
    ml_cells.append(row)
# spot checks against the printed chart
assert ml_cells[4][5] == "45/50"          # 40-45# @30" (highlighted in manual)
assert ml_cells[0][0] == "<10" and ml_cells[0][2] == "10/15"
assert ml_cells[11][6] == "85/90" and ml_cells[1][1] == "10/15"

# 2) Manual del Club Annex I p.46 = 3Rivers wood chart (cols = ARROW length, 125 gr reference)
r_lengths = list(range(23, 33))
recurve_pw = {100: 5, 125: 0, 145: -5, 160: -10, 190: -15}   # band shift of bow-weight column
longbow_pw = {100: 15, 125: 10, 145: 5, 160: 0, 190: -5}
tr_rows = []
for i in range(12):
    base = 26 + 5 * i  # 125-gr recurve column lower bound
    rec = {}
    for pw, sh in recurve_pw.items():
        lo = base + sh
        rec[str(pw)] = None if lo < 16 else [lo, lo + 4]
    lb = {}
    for pw, sh in longbow_pw.items():
        lo = base + sh
        lb[str(pw)] = None if lo < 26 else [lo, lo + 4]
    cells = []
    for L in r_lengths:
        idx = i + (L - 28)
        if idx < 1:
            cells.append(None)
        else:
            s = 30 + 5 * (idx - 1)
            cells.append(f"{s}-{s+5}" if s < 100 else ("100-105"))
    tr_rows.append({"recurveBowWeight": rec, "longbowBowWeight": lb, "cells": cells})
# checks vs printed chart
assert tr_rows[3]["cells"][r_lengths.index(28)] == "40-45"     # 41-45# recurve, 28", 125gr
assert tr_rows[0]["cells"][r_lengths.index(29)] == "30-35"
assert tr_rows[11]["cells"][r_lengths.index(23)] == "55-60"
assert tr_rows[11]["cells"][r_lengths.index(32)] == "100-105"
assert tr_rows[5]["cells"][r_lengths.index(23)] is None
assert tr_rows[0]["longbowBowWeight"]["125"] == [36, 40]

# 3) Generated 20-80 lb x 25-32" arrow-length charts (125 gr, Dacron), recurve & longbow
gen_rows = [[lo, lo + 5] for lo in range(20, 80, 5)]
gen_cols = list(range(25, 33))
def gen_wood(adj):
    out = []
    for lo, hi in gen_rows:
        mid = (lo + hi) / 2
        out.append([band_str(mid + adj + 5 * (L - 28)) for L in gen_cols])
    return out
wood_rec = gen_wood(0)
wood_lb = gen_wood(-10)
# generated longbow at arrow = draw + 1 must equal Manual's English longbow chart
for ri, (lo, hi) in enumerate(gen_rows):
    for d in ml_cols:
        L = d + 1
        if L in gen_cols:
            a = wood_lb[ri][gen_cols.index(L)].replace("-", "/")
            b = ml_cells[ri][ml_cols.index(d)]
            assert a == b, (lo, d, a, b)
assert wood_rec[4][gen_cols.index(28)] == "40-45"

# ---------------------------------------------------------------- CARBON
carbon_curve = [[15, 1500], [20, 1150], [25, 900], [30, 740], [35, 650], [40, 575],
                [45, 510], [50, 460], [55, 420], [60, 385], [65, 355], [70, 330],
                [80, 290], [90, 260], [100, 235]]
carbon_groups = [1500, 1200, 1000, 900, 800, 700, 600, 500, 400, 340, 300, 250]

def interp_curve(w):
    pts = carbon_curve
    if w <= pts[0][0]:
        (x0, y0), (x1, y1) = pts[0], pts[1]
    elif w >= pts[-1][0]:
        (x0, y0), (x1, y1) = pts[-2], pts[-1]
    else:
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            if x0 <= w <= x1:
                break
    # log-linear interpolation of spine vs weight
    f = (w - x0) / (x1 - x0)
    return math.exp(math.log(y0) + f * (math.log(y1) - math.log(y0)))

def snap(s):
    best = min(carbon_groups, key=lambda g: abs(math.log(g) - math.log(s)))
    # 'between' flag when close to the log-midpoint of two neighbours
    srt = sorted(carbon_groups)
    pair = None
    for a, b in zip(srt, srt[1:]):
        if a <= s <= b:
            mid = math.sqrt(a * b)
            if abs(math.log(s) - math.log(mid)) < 0.02:
                pair = [a, b]
    return best, pair

def carbon_cell(w):
    s = interp_curve(max(w, 10))
    best, pair = snap(s)
    if w > 100:
        return "250-"
    return f"{pair[1]}/{pair[0]}" if pair else str(best)

def gen_carbon(adj):
    return [[carbon_cell((lo + hi) / 2 + adj + 5 * (L - 28)) for L in gen_cols] for lo, hi in gen_rows]

carbon_bands = []
prev = None
for w in range(10, 101):
    s = interp_curve(w)
    g, _ = snap(s)
    if prev is None or g != prev["spine"]:
        prev = {"effectiveLbsMin": w, "effectiveLbsMax": w, "spine": g}
        carbon_bands.append(prev)
    else:
        prev["effectiveLbsMax"] = w
carbon_bands[0]["effectiveLbsMin"] = 0
carbon_bands[-1]["effectiveLbsMax"] = 120

# ---------------------------------------------------------------- ALUMINIUM (3Rivers letter chart, 1-D in effective weight)
al_letters = {"A": "1716", "B": "1816", "C": "1916", "D": "2013", "E": "2016", "F": "2018",
              "G": "2117", "H": "2213", "I": "2215", "J": "2216", "K": "2219", "L": "2314",
              "M": "2315", "N": "2317", "O": "2413"}
al_seq = ["A", "A", "B", "C-D", "C-D", "E", "E-F", "E-H", "H-I", "G-I", "J-L-O", "K-L-O", "M", "N", "N", "N"]
al_chart = []
for k, grp in enumerate(al_seq):
    al_chart.append({"effectiveLbsMin": 26 + 5 * k, "effectiveLbsMax": 30 + 5 * k,
                     "group": grp, "sizes": [al_letters[c] for c in grp.split("-")]})

def al_gpi(code):
    od = int(code[:2]) / 64.0
    wall = int(code[2:]) / 1000.0
    return round(math.pi * (od - wall) * wall * 16.387064 * 2.81 * 15.4324, 1)

al_sizes = [{"size": c, "odIn": round(int(c[:2]) / 64, 4), "wallIn": int(c[2:]) / 1000,
             "gpiApprox": al_gpi(c)} for c in sorted(set(al_letters.values()))]

# ---------------------------------------------------------------- WOOD species GPI
def wood_gpi(rho, d_in):
    d_cm = d_in * 2.54
    return round(rho * math.pi / 4 * d_cm ** 2 * 2.54 * 15.4324, 1)

species = [
    ("port-orford-cedar", t("Cedro de Port Orford", "Port Orford cedar"), 0.47, [0.42, 0.52],
     t("El astil tradicional por excelencia: recto, ligero, se clasifica por spine y peso.",
       "The classic traditional shaft: straight, light, sold spine- and weight-matched.")),
    ("sitka-spruce", t("Abeto de Sitka", "Sitka spruce"), 0.43, [0.38, 0.47],
     t("Muy ligero; algo más frágil que el cedro.", "Very light; somewhat more fragile than cedar.")),
    ("pine", t("Pino (silvestre / radiata)", "Pine (Scots / radiata)"), 0.50, [0.45, 0.55],
     t("Barato y fácil de encontrar en Europa; resistencia media.", "Cheap and common in Europe; medium toughness.")),
    ("douglas-fir", t("Abeto de Douglas", "Douglas fir"), 0.53, [0.48, 0.58],
     t("Más rígido y pesado que el cedro; buena durabilidad.", "Stiffer and heavier than cedar; durable.")),
    ("poplar", t("Chopo / álamo", "Poplar / aspen"), 0.45, [0.40, 0.50],
     t("Usado en flechas medievales (Mary Rose); ligero.", "Used for medieval arrows (Mary Rose); light.")),
    ("birch", t("Abedul", "Birch"), 0.65, [0.60, 0.70],
     t("Pesado y muy resistente; habitual en flechas históricas.", "Heavy and very tough; common for historical arrows.")),
    ("ash", t("Fresno", "Ash"), 0.67, [0.62, 0.72],
     t("Muy pesado y duro: flechas de caza y de arco de guerra.", "Very heavy and tough: hunting and warbow arrows.")),
    ("bamboo", t("Bambú (Tonkin)", "Bamboo (Tonkin)"), None, None,
     t("Hueco: no se calcula por densidad; pesa ~9-14 gr/in según diámetro y pared. Pesa cada astil.",
       "Hollow: not computed from density; ~9-14 gr/in depending on diameter and wall. Weigh each shaft.")),
]
diams = {"5/16": 5 / 16, "11/32": 11 / 32, "23/64": 23 / 64}
wood_species = []
for sid, name, rho, rng, note in species:
    e = {"id": sid, "name": name, "densityGcm3": rho, "densityRange": rng, "notes": note}
    if rho:
        e["gpi"] = {k: wood_gpi(rho, v) for k, v in diams.items()}
        e["gpiRange"] = {k: [wood_gpi(rng[0], v), wood_gpi(rng[1], v)] for k, v in diams.items()}
    else:
        e["gpi"] = {"5/16": 9.5, "11/32": 11.0, "23/64": 12.5}
        e["gpiRange"] = {"5/16": [8, 11], "11/32": [9, 13], "23/64": [10, 14]}
    wood_species.append(e)

# ---------------------------------------------------------------- height table
height_table = [{"heightCm": h, "drawIn": round(h / 6.35, 1), "drawCm": round(h / 2.5, 1)}
                for h in range(110, 205, 5)]

# ---------------------------------------------------------------- BOW TYPES
def fl(type_, length, shapes, orientation, count, notes):
    return {"type": type_, "length": length, "shapes": shapes, "orientation": orientation,
            "count": count, "notes": notes}

bow_types = [
 {
  "id": "longbow-english",
  "name": t("Arco largo inglés (longbow)", "English longbow"),
  "desc": t("Arco largo en D, de una pieza (self) o laminado, sin repisa o con una mínima; se tira sobre la mano y no está cortado al centro. Sección profunda, casi tan gruesa como ancha.",
            "Long D-section bow, self or laminated, with no shelf (or a token one); shot off the hand and not centre-cut. Deep, stacked limb section."),
  "drawWeight": [25, 60],
  "markedAtIn": 28,
  "centreShot": False,
  "centreShotLevel": "well-short",
  "shootsOff": "hand",
  "draw": "mediterranean",
  "anchor": "corner-of-mouth",
  "recommendedMaterials": ["wood", "bamboo"],
  "allowedMaterials": ["wood", "bamboo", "carbon"],
  "fletching": fl("feathers", [4.5, 5.5], ["shield", "parabolic", "triangle-historical"], "helical", 3,
     t("Siempre plumas naturales: pasan sobre la mano sin desviar la flecha. Con puntas pesadas o flechas de madera gruesas, 5-5,5\".",
       "Always natural feathers: they fold over the hand without kicking the arrow. 5-5.5\" for heavy points or thick wooden shafts.")),
  "pointWeights": [100, 160],
  "nocks": ["self", "self-reinforced", "glue-on-taper"],
  "gppRange": [9, 11],
  "spineAdj": -10,
  "perInchPct": 0.05,
  "braceHeightIn": [6.5, 7.5],
  "styles": ["3d", "field", "instinctive", "historical", "target"],
  "speedModel": {"storageFactor": 0.50, "hysteresis": 0.90, "virtualMassGr": 140},
  "notes": t("En competición (WA/IFAA, división longbow) suelen exigirse flechas de madera: compruébalo en el reglamento. Estética: madera natural, cresting, culatín tallado con refuerzo de cuerno, plumas de pavo o de ganso. Longitud: apertura + 1\" (Manual del Club). Usar la tabla 'English Longbow / Spine Guide' del Manual.",
             "In competition (WA/IFAA longbow division) wooden arrows are usually required: check the rulebook. Look: natural wood, cresting, self nock reinforced with horn, turkey or goose feathers. Length: draw + 1\" (Manual del Club). Use the Manual's 'English Longbow / Spine Guide' chart.")
 },
 {
  "id": "flatbow",
  "name": t("Arco plano americano (flatbow)", "American flatbow"),
  "desc": t("Arco de palas anchas y planas de sección rectangular, normalmente con repisa cortada cerca del centro, pero no más allá.",
            "Bow with wide, flat rectangular-section limbs, usually with a shelf cut near, but not past, centre."),
  "drawWeight": [25, 55],
  "markedAtIn": 28,
  "centreShot": False,
  "centreShotLevel": "near",
  "shootsOff": "shelf",
  "draw": "mediterranean",
  "anchor": "corner-of-mouth",
  "recommendedMaterials": ["wood", "carbon"],
  "allowedMaterials": ["wood", "carbon", "aluminium", "bamboo"],
  "fletching": fl("feathers", [4, 5.5], ["shield", "parabolic"], "helical", 3,
     t("Plumas de 4-5\" helicoidales u offset; la pluma perdona el contacto con la repisa.",
       "4-5\" helical or offset feathers; feathers forgive contact with the shelf.")),
  "pointWeights": [100, 160],
  "nocks": ["self", "glue-on-taper", "pin", "press-fit"],
  "gppRange": [8, 10],
  "spineAdj": -5,
  "perInchPct": 0.05,
  "braceHeightIn": [6.5, 7.5],
  "styles": ["3d", "field", "instinctive", "historical"],
  "speedModel": {"storageFactor": 0.52, "hysteresis": 0.90, "virtualMassGr": 130},
  "notes": t("Si la repisa queda claramente lejos del centro, usa el ajuste de longbow (-10 lb).",
             "If the shelf is clearly short of centre, use the longbow adjustment (-10 lb).")
 },
 {
  "id": "longbow-hybrid",
  "name": t("Longbow híbrido (reflejo-deflejo)", "Hybrid (reflex-deflex) longbow"),
  "desc": t("Longbow moderno laminado con reflejo-deflejo, repisa y ventana cortadas cerca del centro. Más rápido y estable que el inglés.",
            "Modern laminated R/D longbow with a shelf cut close to centre. Faster and smoother than an English longbow."),
  "drawWeight": [30, 60],
  "markedAtIn": 28,
  "centreShot": False,
  "centreShotLevel": "near",
  "shootsOff": "shelf",
  "draw": "mediterranean",
  "anchor": "corner-of-mouth",
  "recommendedMaterials": ["carbon", "wood"],
  "allowedMaterials": ["carbon", "wood", "aluminium"],
  "fletching": fl("feathers", [4, 5], ["shield", "parabolic"], "helical", 3,
     t("Plumas de 4-5\". Con puntas de 200 gr o más y carbono fino, 5\".",
       "4-5\" feathers. With 200 gr+ points on skinny carbon, go 5\".")),
  "pointWeights": [125, 200],
  "nocks": ["pin", "press-fit", "glue-on-taper", "self"],
  "gppRange": [8, 10],
  "spineAdj": -5,
  "perInchPct": 0.052,
  "braceHeightIn": [6.75, 7.75],
  "styles": ["3d", "field", "instinctive", "hunting"],
  "speedModel": {"storageFactor": 0.53, "hysteresis": 0.91, "virtualMassGr": 130},
  "notes": t("Muy común en 3D tradicional. Si el fabricante indica que está cortado al centro, usa ajuste 0.",
             "Very common in traditional 3D. If the maker says it is cut to centre, use 0 adjustment.")
 },
 {
  "id": "recurve-traditional",
  "name": t("Recurvo tradicional (una pieza o desmontable)", "Traditional recurve (one-piece or take-down)"),
  "desc": t("Recurvo de madera/fibra con repisa tallada en el cuerpo, normalmente cortado al centro o casi. Sin visor ni botón de presión.",
            "Wood/glass recurve with a carved shelf, usually cut to or near centre. No sight, no plunger."),
  "drawWeight": [25, 60],
  "markedAtIn": 28,
  "centreShot": True,
  "centreShotLevel": "centre",
  "shootsOff": "shelf",
  "draw": "mediterranean",
  "anchor": "corner-of-mouth",
  "recommendedMaterials": ["carbon", "wood", "aluminium"],
  "allowedMaterials": ["carbon", "wood", "aluminium", "bamboo"],
  "fletching": fl("feathers", [4, 5], ["shield", "parabolic"], "helical", 3,
     t("Plumas de 4-5\". Las plumas son casi obligatorias al tirar sobre repisa (piel/alfombrilla); las vanes rebotan en ella.",
       "4-5\" feathers. Feathers are near-mandatory off a leather/carpet shelf; vanes bounce off it.")),
  "pointWeights": [100, 200],
  "nocks": ["pin", "press-fit", "glue-on-taper", "self"],
  "gppRange": [8, 10],
  "spineAdj": 0,
  "perInchPct": 0.055,
  "braceHeightIn": [7.25, 8.75],
  "styles": ["3d", "field", "instinctive", "target", "hunting"],
  "speedModel": {"storageFactor": 0.57, "hysteresis": 0.92, "virtualMassGr": 120},
  "notes": t("Es la referencia de las tablas de spine (recurvo cortado al centro, cuerda de Dacron, punta de 125 gr). Los recurvos 'vintage' con ventana poco cortada pueden necesitar -5 lb.",
             "This is the reference case for the spine charts (centre-cut recurve, Dacron string, 125 gr point). Vintage recurves with a shallow window may need -5 lb.")
 },
 {
  "id": "recurve-ilf-barebow",
  "name": t("Recurvo ILF desnudo (barebow)", "ILF barebow recurve"),
  "desc": t("Cuerpo metálico o de madera con palas ILF, reposaflechas y botón de presión (plunger); cortado más allá del centro y ajustable.",
            "Metal or wooden riser with ILF limbs, arrow rest and pressure button (plunger); cut past centre and adjustable."),
  "drawWeight": [20, 45],
  "markedAtIn": 28,
  "centreShot": True,
  "centreShotLevel": "past-centre",
  "shootsOff": "rest",
  "draw": "mediterranean",
  "anchor": "under-chin-or-corner-of-mouth",
  "recommendedMaterials": ["carbon", "aluminium"],
  "allowedMaterials": ["carbon", "aluminium", "carbon-aluminium", "wood"],
  "fletching": fl("vanes-or-feathers", [1.75, 3], ["spin-wing", "low-profile-vane", "parabolic"], "offset", 3,
     t("Con reposaflechas se pueden usar vanes de 1,75-3\" o plumas cortas; en sala muchos usan plumas de 2-3\" o spin-wings.",
       "With a rest, 1.75-3\" vanes or short feathers work; indoors many use 2-3\" feathers or spin-wings.")),
  "pointWeights": [100, 180],
  "nocks": ["pin", "press-fit"],
  "gppRange": [6, 9],
  "spineAdj": 5,
  "perInchPct": 0.045,
  "braceHeightIn": [7.5, 9.25],
  "styles": ["target", "field", "3d", "indoor"],
  "speedModel": {"storageFactor": 0.58, "hysteresis": 0.93, "virtualMassGr": 100},
  "notes": t("Ajuste +5 lb si las palas son de carbono/espuma (más rápidas); usa 0 con palas de madera y fibra (equivale a la regla de Easton: palas madera/fibra = -5 lb respecto a palas de competición). El spine se afina con el plunger. Respeta el peso mínimo del fabricante de las palas (suele ser 5-6 gpp).",
             "+5 lb adjustment for carbon/foam limbs (faster); use 0 with wood/glass limbs (matches Easton's rule: wood/glass limbs = -5 lb vs competition limbs). Fine-tune spine with the plunger. Respect the limb maker's minimum arrow weight (usually 5-6 gpp).")
 },
 {
  "id": "horsebow-hungarian",
  "name": t("Arco a caballo húngaro (magiar)", "Hungarian (Magyar) horse bow"),
  "desc": t("Arco corto asimétrico o simétrico con siyahs (puntas rígidas), sin repisa; la flecha se apoya en la mano y, con suelta de pulgar, a la derecha del arco (diestros).",
            "Short reflexed bow with rigid tips (siyahs), no shelf; the arrow rests on the hand and, with a thumb draw, on the right side of the bow for right-handers."),
  "drawWeight": [25, 60],
  "markedAtIn": 28,
  "centreShot": False,
  "centreShotLevel": "well-short",
  "shootsOff": "hand",
  "draw": "thumb",
  "anchor": "cheek-or-ear",
  "recommendedMaterials": ["wood", "bamboo", "carbon"],
  "allowedMaterials": ["wood", "bamboo", "carbon"],
  "fletching": fl("feathers", [5, 6.5], ["parabolic", "shield", "low-long-historical"], "straight-or-offset", 3,
     t("Solo plumas naturales (pasan sobre la mano). Plumas largas y bajas; tradicionalmente rectas o ligeramente offset.",
       "Natural feathers only (they pass over the hand). Long, low feathers; traditionally straight or slightly offset.")),
  "pointWeights": [70, 145],
  "nocks": ["self", "glue-on-taper", "bulbous-asian"],
  "gppRange": [8, 10],
  "spineAdj": 0,
  "perInchPct": 0.06,
  "braceHeightIn": [5.5, 7],
  "styles": ["instinctive", "historical", "mounted-archery", "3d"],
  "speedModel": {"storageFactor": 0.56, "hysteresis": 0.91, "virtualMassGr": 100},
  "arrowLengthExtraIn": 2,
  "drawStyleAdjIn": 1,
  "notes": t("Las flechas suelen ser más largas: la apertura con pulgar es mayor y la punta no debe quedar sobre la mano; recomienda apertura + 2\" (29-32\" típico). Los vendedores dan spines de carbono parecidos a los del recurvo (30-35 lb → 600; 40-45 lb → 500; 50 lb → 400). Los siyahs hacen que la potencia suba deprisa más allá de la apertura nominal: no sobretenses.",
             "Arrows are usually longer: the thumb draw is longer and the point must not sit over the hand; suggest draw + 2\" (29-32\" typical). Sellers quote carbon spines close to recurve charts (30-35 lb → 600; 40-45 lb → 500; 50 lb → 400). Siyahs make weight climb quickly past the rated draw: don't overdraw.")
 },
 {
  "id": "horsebow-turkish",
  "name": t("Arco turco (otomano)", "Turkish (Ottoman) bow"),
  "desc": t("Arco compuesto muy reflejado y corto; versiones de tiro de distancia (flight) y de tiro a blanco. Suelta de pulgar.",
            "Very short, heavily reflexed composite bow; flight and target versions. Thumb draw."),
  "drawWeight": [30, 70],
  "markedAtIn": 28,
  "centreShot": False,
  "centreShotLevel": "well-short",
  "shootsOff": "hand",
  "draw": "thumb",
  "anchor": "cheek-or-ear",
  "recommendedMaterials": ["wood", "bamboo", "carbon"],
  "allowedMaterials": ["wood", "bamboo", "carbon"],
  "fletching": fl("feathers", [3.5, 5.5], ["parabolic", "low-long-historical"], "straight-or-offset", 3,
     t("Plumas bajas; en flechas de distancia, muy pequeñas.", "Low feathers; very small on flight arrows.")),
  "pointWeights": [60, 125],
  "nocks": ["self", "bulbous-asian", "glue-on-taper"],
  "gppRange": [8, 10],
  "spineAdj": 0,
  "perInchPct": 0.065,
  "braceHeightIn": [5, 6.5],
  "styles": ["historical", "instinctive", "flight", "mounted-archery"],
  "speedModel": {"storageFactor": 0.58, "hysteresis": 0.91, "virtualMassGr": 90},
  "arrowLengthExtraIn": 1.5,
  "drawStyleAdjIn": 1,
  "notes": t("Históricamente se usaba el 'siper' (guía de sobreapertura) para flechas cortas de distancia: no es para principiantes. Usa la tabla de recurvo como punto de partida.",
             "Historically a 'siper' overdraw guide was used for short flight arrows: not for beginners. Start from the recurve chart.")
 },
 {
  "id": "horsebow-mongolian",
  "name": t("Arco mongol", "Mongolian bow"),
  "desc": t("Arco compuesto grande con siyahs largos y puentes de cuerda; flechas largas y pesadas. Suelta de pulgar.",
            "Large composite bow with long siyahs and string bridges; long, heavy arrows. Thumb draw."),
  "drawWeight": [30, 80],
  "markedAtIn": 28,
  "centreShot": False,
  "centreShotLevel": "well-short",
  "shootsOff": "hand",
  "draw": "thumb",
  "anchor": "ear",
  "recommendedMaterials": ["wood", "bamboo", "carbon"],
  "allowedMaterials": ["wood", "bamboo", "carbon"],
  "fletching": fl("feathers", [6, 9], ["low-long-historical", "parabolic"], "straight-or-offset", 3,
     t("Plumas largas (6-9\") y bajas; flechas tradicionales con grandes plumas de águila/buitre (hoy ganso o pavo).",
       "Long (6-9\"), low feathers; traditional arrows used large raptor feathers (today goose or turkey).")),
  "pointWeights": [100, 250],
  "nocks": ["self", "bulbous-asian"],
  "gppRange": [9, 12],
  "spineAdj": 0,
  "perInchPct": 0.055,
  "braceHeightIn": [6, 8],
  "styles": ["historical", "instinctive", "mounted-archery", "traditional-mongolian"],
  "speedModel": {"storageFactor": 0.55, "hysteresis": 0.90, "virtualMassGr": 150},
  "arrowLengthExtraIn": 2.5,
  "drawStyleAdjIn": 2,
  "notes": t("Apertura larga (hasta la oreja o más) y flechas de 32-36\". Las flechas pesadas y largas son parte de la estética y del rendimiento del arco.",
             "Long draw (to the ear or beyond) and 32-36\" arrows. Heavy, long arrows are part of both the look and the bow's performance.")
 },
 {
  "id": "horsebow-korean",
  "name": t("Arco coreano (gakgung)", "Korean bow (gakgung)"),
  "desc": t("Arco muy reflejado y corto; en el gungdo moderno se usan flechas de bambú o carbono muy ligeras y largas, apertura más allá de la oreja. Suelta de pulgar.",
            "Very short, heavily reflexed bow; modern gungdo uses very light, long bamboo or carbon arrows, drawn past the ear. Thumb draw."),
  "drawWeight": [30, 60],
  "markedAtIn": 28,
  "centreShot": False,
  "centreShotLevel": "well-short",
  "shootsOff": "hand",
  "draw": "thumb",
  "anchor": "past-ear",
  "recommendedMaterials": ["bamboo", "carbon"],
  "allowedMaterials": ["bamboo", "carbon", "wood"],
  "fletching": fl("feathers", [4.5, 6], ["low-long-historical", "parabolic"], "straight-or-offset", 3,
     t("Plumas bajas y largas.", "Low, long feathers.")),
  "pointWeights": [60, 125],
  "nocks": ["self", "glue-on-taper"],
  "gppRange": [7, 9],
  "spineAdj": 0,
  "perInchPct": 0.06,
  "braceHeightIn": [5.5, 7],
  "styles": ["historical", "target", "traditional-gungdo"],
  "speedModel": {"storageFactor": 0.58, "hysteresis": 0.92, "virtualMassGr": 80},
  "arrowLengthExtraIn": 2,
  "drawStyleAdjIn": 3,
  "notes": t("Las flechas de gungdo son muy ligeras para su longitud: comprueba con el arquero/bowyer el peso mínimo; los arcos de fibra modernos suelen admitir flechas más ligeras que los arcos de cuerno.",
             "Gungdo arrows are very light for their length: confirm the minimum weight with the bowyer; modern fibreglass gakgung usually tolerate lighter arrows than horn bows.")
 },
 {
  "id": "selfbow-primitive",
  "name": t("Arco primitivo / de una pieza (self bow)", "Primitive self bow"),
  "desc": t("Arco tallado de una sola madera (tejo, olmo, fresno, osage, avellano...), sin laminados ni fibra; se tira sobre la mano.",
            "Bow carved from a single stave (yew, elm, ash, osage, hazel...), no laminations or glass; shot off the hand."),
  "drawWeight": [25, 60],
  "markedAtIn": 28,
  "centreShot": False,
  "centreShotLevel": "well-short",
  "shootsOff": "hand",
  "draw": "mediterranean",
  "anchor": "corner-of-mouth",
  "recommendedMaterials": ["wood", "cane", "bamboo"],
  "allowedMaterials": ["wood", "cane", "bamboo"],
  "fletching": fl("feathers", [4, 6], ["shield", "triangle-historical", "parabolic"], "straight-or-helical", 3,
     t("Plumas naturales, a menudo recortadas a fuego y atadas con hilo; 2 o 3 plumas en reproducciones prehistóricas.",
       "Natural feathers, often burn-trimmed and thread-bound; 2 or 3 feathers in prehistoric reproductions.")),
  "pointWeights": [100, 200],
  "nocks": ["self", "self-reinforced"],
  "gppRange": [9, 12],
  "spineAdj": -10,
  "perInchPct": 0.06,
  "braceHeightIn": [5.5, 7],
  "styles": ["historical", "instinctive", "primitive", "3d"],
  "speedModel": {"storageFactor": 0.48, "hysteresis": 0.86, "virtualMassGr": 170},
  "notes": t("Los arcos de una pieza necesitan flechas pesadas (Manual: 8-9 gpp como mínimo general; para self bows 9-10 gpp o más). Hacen 'stacking' al final: no sobretenses y mide la potencia en tu apertura real.",
             "Self bows need heavy arrows (Manual: 8-9 gpp general minimum; self bows 9-10+ gpp). They stack at the end of the draw: never overdraw and measure the weight at your real draw.")
 },
 {
  "id": "warbow-medieval",
  "name": t("Arco de guerra medieval (warbow)", "Medieval warbow"),
  "desc": t("Reproducción de arco largo de guerra (tipo Mary Rose), de tejo u otras maderas, con potencias muy altas y aperturas largas hasta la oreja.",
            "Reproduction war longbow (Mary Rose type), yew or other woods, very heavy draw weights and long draws to the ear."),
  "drawWeight": [70, 160],
  "markedAtIn": 30,
  "centreShot": False,
  "centreShotLevel": "well-short",
  "shootsOff": "hand",
  "draw": "mediterranean",
  "anchor": "ear",
  "recommendedMaterials": ["wood"],
  "allowedMaterials": ["wood"],
  "fletching": fl("feathers", [6, 9], ["triangle-historical", "shield"], "straight-or-helical", 3,
     t("Plumas de ganso o cisne de 6-9\", pegadas y atadas con hilo (whipping).",
       "6-9\" goose or swan feathers, glued and thread-bound (whipped).")),
  "pointWeights": [200, 800],
  "nocks": ["self-reinforced"],
  "gppRange": [10, 15],
  "spineAdj": -10,
  "perInchPct": 0.045,
  "braceHeightIn": [6, 8],
  "styles": ["historical", "reenactment", "heavy-flight"],
  "speedModel": {"storageFactor": 0.50, "hysteresis": 0.88, "virtualMassGr": 300},
  "arrowLengthExtraIn": 1,
  "drawStyleAdjIn": 2,
  "notes": t("Fuera del alcance de las tablas estándar (que acaban en ~85 lb). Astiles barrilados de ~1/2\", flechas de 30-32\" y 900-1600 gr. Muchos warbows se marcan a 30\" o 32\": comprueba el marcado. Consultar con especialistas.",
             "Beyond standard charts (they stop around 85 lb). Barrelled ~1/2\" shafts, 30-32\" arrows of 900-1600 gr. Many warbows are rated at 30\" or 32\": check the marking. Consult specialists.")
 },
 {
  "id": "kids-fiberglass",
  "name": t("Arco infantil / de iniciación de fibra de vidrio", "Kids' / beginner fibreglass bow"),
  "desc": t("Arco sencillo de fibra de vidrio o recurvo de iniciación de baja potencia; a menudo ambidiestro y con un pequeño apoyo.",
            "Simple fibreglass bow or low-poundage starter recurve; often ambidextrous with a small rest/shelf."),
  "drawWeight": [8, 20],
  "markedAtIn": 28,
  "centreShot": False,
  "centreShotLevel": "near",
  "shootsOff": "shelf",
  "draw": "mediterranean",
  "anchor": "under-chin-or-corner-of-mouth",
  "recommendedMaterials": ["fiberglass", "aluminium", "carbon", "wood"],
  "allowedMaterials": ["fiberglass", "aluminium", "carbon", "wood"],
  "fletching": fl("vanes-or-feathers", [3, 4], ["parabolic", "shield", "low-profile-vane"], "straight-or-offset", 3,
     t("Vanes de plástico (duraderas) o plumas; para niños priman la durabilidad y la seguridad.",
       "Plastic vanes (durable) or feathers; for children durability and safety come first.")),
  "pointWeights": [50, 100],
  "nocks": ["press-fit", "snap-on", "glue-on-taper"],
  "gppRange": [8, 20],
  "spineAdj": -5,
  "perInchPct": 0.055,
  "braceHeightIn": [6, 8],
  "styles": ["beginner", "target", "school"],
  "speedModel": {"storageFactor": 0.48, "hysteresis": 0.85, "virtualMassGr": 120},
  "arrowLengthExtraIn": 2,
  "notes": t("En niños, la flecha debe ser algo más larga (apertura + 2\") para que nunca se caiga por dentro del arco al crecer o sobretensar. Con potencias tan bajas el GPP sale alto: no es problema. Muchos arcos infantiles están marcados a 24-26\": comprueba la etiqueta.",
             "For children make arrows a bit longer (draw + 2\") so they can never be overdrawn off the rest as they grow. At such low weights GPP comes out high: that is fine. Many youth bows are rated at 24-26\": check the label.")
 },
]

# ---------------------------------------------------------------- vocab for enums used above
vocab = {
  "shootsOff": {
    "hand": t("sobre la mano", "off the hand"),
    "shelf": t("sobre la repisa", "off the shelf"),
    "rest": t("sobre reposaflechas", "off a rest"),
  },
  "draw": {
    "mediterranean": t("mediterránea (tres dedos)", "Mediterranean (three fingers)"),
    "thumb": t("de pulgar (con anillo o guante)", "thumb draw (ring or glove)"),
  },
  "centreShotLevel": {
    "past-centre": t("cortado más allá del centro", "cut past centre"),
    "centre": t("cortado al centro", "cut to centre"),
    "near": t("cortado cerca del centro", "cut near centre"),
    "well-short": t("lejos del centro (se tira sobre la mano)", "well short of centre (off the hand)"),
  },
  "materials": {
    "wood": t("madera", "wood"), "bamboo": t("bambú", "bamboo"), "cane": t("caña", "cane"),
    "carbon": t("carbono", "carbon"), "aluminium": t("aluminio", "aluminium"),
    "carbon-aluminium": t("carbono-aluminio", "carbon-aluminium"), "fiberglass": t("fibra de vidrio", "fibreglass"),
  },
  "fletchShapes": {
    "shield": t("escudo", "shield"), "parabolic": t("parabólica", "parabolic"),
    "triangle-historical": t("triangular histórica", "historical triangle"),
    "low-long-historical": t("baja y larga (asiática)", "low & long (Asian)"),
    "spin-wing": t("spin-wing", "spin-wing"), "low-profile-vane": t("vane de perfil bajo", "low-profile vane"),
    "flu-flu": t("flu-flu", "flu-flu"),
  },
  "orientation": {
    "helical": t("helicoidal", "helical"), "offset": t("offset (inclinada)", "offset"),
    "straight": t("recta", "straight"), "straight-or-offset": t("recta u offset", "straight or offset"),
    "straight-or-helical": t("recta o helicoidal", "straight or helical"),
  },
  "nocks": {
    "self": t("culatín tallado (self nock)", "self nock"),
    "self-reinforced": t("culatín tallado con refuerzo de cuerno/hueso", "self nock with horn/bone insert"),
    "glue-on-taper": t("culatín pegado sobre cono (taper)", "glue-on taper nock"),
    "pin": t("culatín sobre pin", "pin nock"),
    "press-fit": t("culatín a presión", "press-fit nock"),
    "snap-on": t("culatín de clic", "snap-on nock"),
    "bulbous-asian": t("culatín bulboso asiático", "bulbous Asian nock"),
  },
  "styles": {
    "3d": t("3D", "3D"), "field": t("recorridos de campo", "field"), "target": t("tiro a diana", "target"),
    "instinctive": t("tiro instintivo", "instinctive"), "historical": t("tiro histórico", "historical"),
    "reenactment": t("recreación histórica", "re-enactment"), "hunting": t("caza", "hunting"),
    "indoor": t("sala", "indoor"), "mounted-archery": t("tiro a caballo", "mounted archery"),
    "flight": t("tiro de distancia (flight)", "flight shooting"), "primitive": t("arquería primitiva", "primitive archery"),
    "heavy-flight": t("distancia con flecha pesada", "heavy-arrow flight"), "beginner": t("iniciación", "beginner"),
    "school": t("escuela", "school"), "traditional-mongolian": t("tiro tradicional mongol", "Mongolian traditional"),
    "traditional-gungdo": t("gungdo (tiro tradicional coreano)", "gungdo (Korean traditional)"),
    "larp": t("LARP / combate con arco", "LARP / bow combat"),
  },
}

larp_note = t("LARP / combate con arco (archery tag): NO se deben fabricar flechas caseras para tirar a personas. Usa solo flechas de seguridad comerciales homologadas por la organización del evento (punta de espuma ancha, que no pueda entrar en un ojo) y respeta su potencia máxima (habitualmente ≤ 25-30 lb a 28\"). La web no debe calcular flechas para este uso; solo remitir al reglamento del evento.",
              "LARP / bow combat (archery tag): do NOT build home-made arrows to shoot at people. Use only commercial safety arrows approved by the event organiser (wide foam head that cannot enter an eye) and respect the maximum draw weight (usually ≤ 25-30 lb at 28\"). The site should not compute arrows for this use; only point to the event rules.")

# ---------------------------------------------------------------- assemble
data = {
 "meta": {
  "version": 1,
  "generated": "2026-11-22",
  "disclaimer": t("Todos los cálculos son estimaciones de partida. Confirma siempre con una prueba de flecha desnuda (bare shaft) y con un kit de prueba de spines antes de comprar una docena.",
                  "All calculations are starting estimates. Always confirm with bare-shaft testing and a spine test kit before buying a dozen."),
  "conventions": {
   "drawLength": t("Apertura = distancia, a plena apertura, desde el fondo de la ranura del culatín hasta la cara exterior (espalda) del arco en la ventana. Es lo que mide el Manual del Club con la flecha graduada y coincide en la práctica con la 'apertura AMO/ATA' (hasta el punto de pivote + 1,75\").",
                   "Draw length = at full draw, from the bottom of the nock groove to the back (outer face) of the bow at the arrow pass. This is what the Manual del Club measures with the graduated arrow and in practice matches 'AMO/ATA draw length' (to the pivot point + 1.75\")."),
   "arrowLength": t("Longitud de flecha = desde el fondo de la ranura del culatín hasta el final del tubo/astil, sin contar punta ni inserto (Manual del Club, fig. 10; norma AMO).",
                    "Arrow length = from the bottom of the nock groove to the end of the shaft, excluding point and insert (Manual del Club fig. 10; AMO standard)."),
   "drawWeight": t("Potencia real = la que marca la báscula a TU apertura, no la escrita en el arco (marcada normalmente a 28\").",
                   "Actual draw weight = what the scale reads at YOUR draw length, not the figure written on the bow (normally rated at 28\")."),
   "spine": t("Spine estático (ATA/ASTM F2031): flexión en milésimas de pulgada con 1,94 lb (880 g) colgados en el centro de un vano de 28\"; número más alto = más flexible. En madera se expresa en libras (p. ej. 40-45#).",
              "Static spine (ATA/ASTM F2031): deflection in thousandths of an inch with 1.94 lb (880 g) hung at the centre of a 28\" span; higher number = more flexible. Wood is expressed in pounds (e.g. 40-45#).")
  },
  "units": {"lbToG": 453.6, "inToCm": 2.54, "gToGrains": 15.4324, "grainsToG": 0.0647989,
            "manualGToGrains": 15,
            "note": t("El Manual del Club redondea 1 g ≈ 15 grains; para cálculos usa 15,43.", "The Manual del Club rounds 1 g ≈ 15 grains; use 15.43 in calculations.")}
 },
 "vocab": vocab,
 "bowTypes": bow_types,
 "styleNotes": {"larp": larp_note},
 "drawLength": {
  "definition": "see meta.conventions.drawLength",
  "preferred": t("Mide con una flecha graduada (Manual del Club, fig. 9): a plena apertura y anclaje habitual, que otra persona lea la marca en la cara exterior del arco. Repite 3 veces y usa la media.",
                 "Measure with a graduated arrow (Manual del Club fig. 9): at full draw and your usual anchor, have someone read the mark at the back of the bow. Repeat 3 times and average."),
  "methods": [
   {"id": "measured", "name": t("Medida con flecha graduada", "Measured with a graduated arrow"),
    "expr": "drawLengthIn = measuredIn", "uncertaintyIn": 0.25, "source": M},
   {"id": "wingspan", "name": t("Envergadura ÷ 2,5", "Wingspan ÷ 2.5"),
    "expr": "drawLengthIn = wingspanCm / 2.5 / 2.54 + styleAdjIn",
    "desc": t("Brazos en cruz, de punta a punta del dedo corazón, en cm. Envergadura/2,5 da la apertura en cm; ÷2,54 para pulgadas (equivale a envergadura en cm ÷ 6,35).",
              "Arms outstretched, middle fingertip to fingertip, in cm. Wingspan/2.5 gives draw in cm; ÷2.54 for inches (same as wingspan cm ÷ 6.35)."),
    "uncertaintyIn": 1.0, "source": "https://www.3riversarchery.com/pdf/ArrowCharts.pdf (draw-check method); wingspan/2.5 is the standard ATA fitting rule"},
   {"id": "height", "name": t("A partir de la altura", "From height"),
    "expr": "drawLengthIn = heightCm / 6.35 + styleAdjIn",
    "desc": t("Supone envergadura ≈ altura. Menos fiable que la envergadura.", "Assumes wingspan ≈ height. Less reliable than wingspan."),
    "uncertaintyIn": 1.5}
  ],
  "styleAdjustments": [
   {"id": "med-chin", "name": t("Mediterránea, anclaje bajo la barbilla (recurvo olímpico/barebow)", "Mediterranean, under-chin anchor (Olympic/barebow)"), "adjIn": 0},
   {"id": "med-mouth", "name": t("Mediterránea, comisura de la boca (tradicional, arco inclinado)", "Mediterranean, corner of mouth (traditional, canted bow)"), "adjIn": -0.5,
    "note": t("Los tiradores tradicionales con el brazo del arco algo flexionado suelen abrir 0,5-1\" menos que lo que da la fórmula.", "Traditional shooters with a slightly bent bow arm usually draw 0.5-1\" less than the formula.")},
   {"id": "med-ear", "name": t("Mediterránea hasta la oreja/mandíbula (arco de guerra, histórico)", "Mediterranean to the ear/jaw (warbow, historical)"), "adjIn": 2},
   {"id": "thumb-cheek", "name": t("Pulgar, anclaje en mejilla/oreja (arco a caballo)", "Thumb draw, cheek/ear anchor (horse bow)"), "adjIn": 1},
   {"id": "thumb-past-ear", "name": t("Pulgar, más allá de la oreja (gungdo, mongol)", "Thumb draw past the ear (gungdo, Mongolian)"), "adjIn": 2.5}
  ],
  "heightTable": height_table,
  "uncertaintyNote": t("Las estimaciones tienen un error típico de ±1\" (±2,5 cm). Corta las flechas largas al principio y ajusta después: siempre se puede recortar, nunca alargar.",
                       "Estimates carry a typical error of ±1\" (±2.5 cm). Start with arrows long and trim later: you can always cut, never lengthen.")
 },
 "arrowLength": {
  "expr": "arrowLengthIn = drawLengthIn + (bowType.arrowLengthExtraIn ?? 1)",
  "base": {"addIn": 1, "addCm": 2.5, "source": M},
  "notes": t("Regla del Manual: apertura + 1\" (2,5 cm). 3Rivers recomienda +1 o +2\" para puntas de caza (que la broadhead no toque la repisa). Arcos a caballo y niños: +2\".",
             "Manual rule: draw + 1\" (2.5 cm). 3Rivers suggests +1 or +2\" with broadheads (so the head clears the shelf). Horse bows and children: +2\".")
 },
 "drawWeight": {
  "markedAtIn": 28,
  "tolerance": t("La industria permite ±2 lb respecto a la potencia marcada (3Rivers).", "Industry tolerance is ±2 lb from the marked weight (3Rivers)."),
  "perInchAdjust": {"longbow-english": 2.0, "flatbow": 2.2, "longbow-hybrid": 2.3, "recurve-traditional": 2.5,
                    "recurve-ilf-barebow": 2.0, "horsebow": 2.8, "selfbow-primitive": 2.8, "warbow-medieval": 3.5,
                    "kids-fiberglass": 1.0},
  "perInchAdjustNote": t("Libras por pulgada válidas para arcos de ~35-50 lb (3Rivers: 2-3 lb por pulgada). Para otras potencias usa el porcentaje por pulgada (perInchPct de cada arco).",
                         "Pounds per inch valid for ~35-50 lb bows (3Rivers: 2-3 lb per inch). For other weights use the percentage per inch (each bow's perInchPct)."),
  "expr": "actualLbs = markedLbs * (1 + perInchPct * (drawLengthIn - markedAtIn))",
  "exprSimple": "actualLbs = markedLbs + perInchLbs * (drawLengthIn - 28)",
  "measure": t("Con una báscula de arquería o de equipaje (Manual del Club, fig. 7-8): engancha la cuerda en el punto de enfleche, abre hasta tu apertura (usa la flecha graduada como referencia) y lee la báscula. Repite 3 veces. No uses una báscula de muelle barata más allá de su rango.",
               "With an archery or luggage scale (Manual del Club figs 7-8): hook the string at the nocking point, draw to your draw length (use the graduated arrow as a guide) and read the scale. Repeat 3 times. Don't use a cheap spring scale beyond its range."),
  "profiles": [
   {"id": "child-small", "name": t("Niño/a (6-10 años)", "Child (6-10 years)"), "range": [10, 15]},
   {"id": "child-large", "name": t("Niño/a (11-13 años)", "Child (11-13 years)"), "range": [12, 20]},
   {"id": "teen", "name": t("Adolescente (14-17 años)", "Teenager (14-17 years)"), "range": [16, 26]},
   {"id": "adult-woman-beginner", "name": t("Mujer adulta, principiante", "Adult woman, beginner"), "range": [18, 26]},
   {"id": "adult-man-beginner", "name": t("Hombre adulto, principiante", "Adult man, beginner"), "range": [22, 32]},
   {"id": "senior-beginner", "name": t("Persona mayor o con poca fuerza, principiante", "Older or less strong beginner"), "range": [15, 24]},
   {"id": "intermediate", "name": t("Intermedio (1-3 años de tiro)", "Intermediate (1-3 years)"), "range": [28, 40]},
   {"id": "experienced-target", "name": t("Experimentado, 3D/recorridos", "Experienced, 3D/field"), "range": [35, 50]},
   {"id": "experienced-hunting", "name": t("Experimentado, caza (donde sea legal)", "Experienced, hunting (where legal)"), "range": [45, 60]},
   {"id": "warbow-specialist", "name": t("Especialista en arco de guerra", "Warbow specialist"), "range": [80, 160]}
  ],
  "profilesNote": t("Rangos orientativos (potencia real a la apertura del arquero, arcos tradicionales). Test práctico: debes poder sostener la apertura 5-6 s sin temblar y tirar una sesión completa (60 flechas) sin dolor; si no, baja potencia.",
                    "Indicative ranges (actual weight at the archer's draw, traditional bows). Practical test: you should hold full draw 5-6 s without shaking and shoot a full session (60 arrows) without pain; if not, go lighter.")
 },
 "spine": {
  "directionNote": t("Cuanto MENOS cortado al centro está el arco (longbow, self bow, arcos a caballo sobre la mano), más tiene que flexionar la flecha para rodear el cuerpo del arco: necesita un spine MÁS DÉBIL (menos libras en madera, número más alto en carbono). Un arco cortado más allá del centro necesita una flecha MÁS RÍGIDA.",
                     "The LESS centre-cut the bow (longbow, self bow, horse bows off the hand), the more the arrow must bend around the handle: it needs a WEAKER spine (fewer pounds in wood, higher number in carbon). A bow cut past centre needs a STIFFER arrow."),
  "commonAdjustments": [
   {"id": "length", "wood": "+5 lb per inch of arrow over 28\" (−5 under)", "carbon": "+5 lb effective per inch over 28\"",
    "expr": "5 * (arrowLengthIn - 28)", "source": M + "; 3Rivers chart"},
   {"id": "pointWood", "expr": "interp(pointGr, [100,125,145,160,190], [-5,0,5,10,15]); extrapolate 0.2 lb/gr below 100 and 0.167 lb/gr above 190",
    "desc": t("Madera/aluminio: ~5 lb por cada 20-25 gr de punta por encima de 125 (columnas de la tabla).", "Wood/aluminium: ~5 lb per 20-25 gr of point over 125 (chart columns)."),
    "source": M + " (Annex I) / 3Rivers"},
   {"id": "pointCarbon", "expr": "3 * (pointGr - 125) / 25",
    "desc": t("Carbono: +3 lb por cada 25 gr por encima de 125 (−3 por debajo). Cuenta punta + inserto si el inserto pesa más de 25 gr.", "Carbon: +3 lb per 25 gr over 125 (−3 under). Count point + insert if the insert is over 25 gr."),
    "source": "Easton target & hunting charts; 3Rivers carbon columns"},
   {"id": "bowType", "expr": "bowType.spineAdj",
    "desc": t("Recurvo al centro 0; híbrido/flatbow −5; longbow inglés, self bow, warbow −10; ILF con palas de carbono +5; infantil −5; arcos a caballo 0.", "Centre-cut recurve 0; hybrid/flatbow −5; English longbow, self bow, warbow −10; ILF carbon limbs +5; kids −5; horse bows 0."),
    "source": "3Rivers (longbow side = +10 lb on wood/aluminium chart); Easton (wood/glass limb −5)"},
   {"id": "string", "options": {"dacron": 0, "fastflight": 5},
    "desc": t("Cuerda de material de bajo estiramiento (Fast Flight, Dyneema, 8125, 452X): +5 lb.", "Low-stretch string (Fast Flight, Dyneema, 8125, 452X): +5 lb."),
    "source": "3Rivers chart header"},
   {"id": "braceHeight", "expr": "0 (qualitative)",
    "desc": t("Fistmele (altura de cuerda): ajuste fino, sin valor numérico. Manual del Club: fistmele grande → menos recorrido, menos velocidad, más estabilidad; corto → más velocidad y menos estabilidad. Según la mayoría de arqueros tradicionales, subir el fistmele hace que la flecha se comporte algo más rígida y bajarlo, más débil (Easton describe lo contrario en algún texto: comprueba en tu arco). Mantén el fistmele recomendado por el fabricante.",
               "Brace height (fistmele): fine-tuning only, no numeric value. Manual del Club: higher brace → shorter power stroke, less speed, more stability; lower → more speed, less stability. Most traditional archers report that raising brace height makes the arrow act slightly stiffer and lowering it weaker (an Easton text is quoted saying the opposite: verify on your bow). Keep the maker's recommended brace height."),
    "source": M + "; tradgang.com discussions"}
  ],
  "wood": {
   "unit": "lb",
   "method": t("1) Potencia real a tu apertura (W). 2) W_ef = W + ajuste_punta(madera) + ajuste_tipo_arco + ajuste_cuerda. 3) Spine ≈ W_ef + 5 × (longitud_flecha − 28). 4) Elige el rango de 5 lb que contiene el valor (p. ej. 47 → 45-50). Reproduce las tablas del Manual del Club (Annex I).",
               "1) Actual weight at your draw (W). 2) W_eff = W + pointAdj(wood) + bowTypeAdj + stringAdj. 3) Spine ≈ W_eff + 5 × (arrowLength − 28). 4) Pick the 5-lb band containing the value (e.g. 47 → 45-50). Reproduces the Manual del Club charts (Annex I)."),
   "expr": "spineLbs = W + pointAdjWood + bowTypeAdj + stringAdj + 5 * (arrowLengthIn - 28); bandLow = 5 * Math.floor((spineLbs - 0.5) / 5)",
   "checks": [
     t("Recurvo 41-45 lb, flecha 28\", punta 125 → 40-45 (Manual/3Rivers).", "Recurve 41-45 lb, 28\" arrow, 125 gr → 40-45 (Manual/3Rivers)."),
     t("Longbow 40-45 lb, apertura 30\" (flecha 31\") → 45-50 (Manual, English Longbow Spine Guide).", "Longbow 40-45 lb, 30\" draw (31\" arrow) → 45-50 (Manual, English Longbow Spine Guide).")],
   "charts": {
    "manualEnglishLongbow": {
      "title": t("Guía de spine para longbow inglés (Manual del Club, Annex I p. 47)", "English Longbow Spine Guide (Manual del Club, Annex I p. 47)"),
      "colsAre": "drawLengthIn", "rows": ml_rows, "cols": ml_cols, "cells": ml_cells,
      "rule": "spineLow = rowLow - 5 + 5 * (drawIn - 28)", "source": M},
    "manual3RiversWood": {
      "title": t("Tabla de flechas de madera recurvo/longbow (Manual del Club Annex I p. 46 = tabla 3Rivers)", "Wood arrow chart recurve/longbow (Manual del Club Annex I p. 46 = 3Rivers chart)"),
      "colsAre": "arrowLengthIn", "cols": r_lengths, "pointWeights": [100, 125, 145, 160, 190],
      "rows": tr_rows,
      "rule": "row = band of bow weight under chosen point-weight column (recurve or longbow side); cell index = row + (arrowLength - 28); spineLow = 30 + 5*(index-1); blank if index < 1",
      "source": M + "; https://www.3riversarchery.com/pdf/ArrowCharts.pdf"},
    "recurve": {
      "title": t("Recurvo cortado al centro, punta 125 gr, Dacron (generada)", "Centre-cut recurve, 125 gr point, Dacron (generated)"),
      "colsAre": "arrowLengthIn", "rows": gen_rows, "cols": gen_cols, "cells": wood_rec, "bowTypeAdj": 0},
    "longbow": {
      "title": t("Longbow / self bow, punta 125 gr, Dacron (generada; coincide con la guía del Manual con flecha = apertura + 1\")", "Longbow / self bow, 125 gr point, Dacron (generated; matches the Manual guide with arrow = draw + 1\")"),
      "colsAre": "arrowLengthIn", "rows": gen_rows, "cols": gen_cols, "cells": wood_lb, "bowTypeAdj": -10}
   },
   "diameterGuide": [
    {"diameter": "5/16", "name": t("fino", "thin"), "spineLbs": [20, 45], "source": M + " (calibres)"},
    {"diameter": "11/32", "name": t("medio", "medium"), "spineLbs": [35, 70], "source": M},
    {"diameter": "23/64", "name": t("grueso", "thick"), "spineLbs": [55, 90], "source": M}
   ],
   "diameterNote": t("Rangos orientativos de spine por calibre en cedro; varían por especie y proveedor. Más grueso = más rígido y más pesado.",
                     "Indicative spine ranges by diameter for cedar; vary by species and supplier. Thicker = stiffer and heavier.")
  },
  "carbon": {
   "unit": "ATA deflection ×1000",
   "method": t("1) W_ef = W + 5 × (longitud − 28) + 3 × (punta − 125)/25 + ajuste_tipo_arco + ajuste_cuerda. 2) Busca W_ef en la tabla (o interpola la curva en escala logarítmica) y ajusta al grupo de spine disponible más próximo. 3) Si cae entre dos grupos: en recurvo cortado al centro con puntas de 125 gr o más, elige el más débil (consejo de Easton); en caso de duda, compra un tubo de cada y haz bare shaft.",
               "1) W_eff = W + 5 × (length − 28) + 3 × (point − 125)/25 + bowTypeAdj + stringAdj. 2) Look W_eff up in the table (or interpolate the curve in log space) and snap to the nearest available spine group. 3) If between two groups: for centre-cut recurves with 125 gr+ points choose the weaker (Easton's advice); if unsure, buy one of each and bare-shaft test."),
   "expr": "effLbs = W + 5*(arrowLengthIn-28) + 3*(pointGr-125)/25 + bowTypeAdj + stringAdj; spine = logInterp(curve, effLbs)",
   "curve": carbon_curve,
   "groups": carbon_groups,
   "otherGroups": [1300, 550, 450, 350],
   "betweenRule": "if |ln(spine) - ln(sqrt(a*b))| < 0.02 show 'a/b'",
   "chart": carbon_bands,
   "charts": {
    "recurve": {"title": t("Carbono, recurvo al centro, 125 gr (generada)", "Carbon, centre-cut recurve, 125 gr (generated)"),
                "colsAre": "arrowLengthIn", "rows": gen_rows, "cols": gen_cols, "cells": gen_carbon(0), "bowTypeAdj": 0},
    "longbow": {"title": t("Carbono, longbow/self bow, 125 gr (generada)", "Carbon, longbow/self bow, 125 gr (generated)"),
                "colsAre": "arrowLengthIn", "rows": gen_rows, "cols": gen_cols, "cells": gen_carbon(-10), "bowTypeAdj": -10}
   },
   "calibration": t("Curva situada entre la tabla Easton Target (recurvo, con −5 lb por palas de madera/fibra y +3 lb por 125 gr) y la tabla de carbono de 3Rivers (que da ~1 grupo más rígido por debajo de 50 lb). A 28\"/125 gr: 3Rivers da 600 para 29-33 lb, 500 para 34-48, 400 para 49-63, 340 para 64-75, 300 para 76+.",
                     "Curve placed between the Easton Target chart (recurve, with −5 lb for wood/glass limbs and +3 lb for 125 gr) and 3Rivers' carbon chart (which runs ~1 group stiffer below 50 lb). At 28\"/125 gr, 3Rivers gives 600 for 29-33 lb, 500 for 34-48, 400 for 49-63, 340 for 64-75, 300 for 76+."),
   "longbowNote": t("La tabla de carbono de 3Rivers desplaza el longbow ~15-18 lb (más que en madera); aquí usamos −10 lb de forma coherente y recomendamos bare shaft. La tabla de caza de Easton tiene una columna 'longbow' que parece ir en sentido contrario: no la usamos.",
                    "3Rivers' carbon chart shifts longbows by ~15-18 lb (more than for wood); we use −10 lb consistently and recommend bare-shaft testing. Easton's hunting chart has a 'longbow' column that appears to go the other way: not used."),
   "typicalGpi": [
    {"spine": 1000, "gpi": [5.5, 7.5]}, {"spine": 900, "gpi": [6, 7.5]}, {"spine": 800, "gpi": [6.5, 8]},
    {"spine": 700, "gpi": [7, 8.5]}, {"spine": 600, "gpi": [7.5, 9]}, {"spine": 500, "gpi": [8, 10]},
    {"spine": 400, "gpi": [9, 11]}, {"spine": 340, "gpi": [10, 12]}, {"spine": 300, "gpi": [11, 13]},
    {"spine": 250, "gpi": [12.5, 14.5]}],
   "typicalGpiNote": t("Valores típicos; los tubos 'tradicionales' con aspecto de madera suelen ser más pesados y los de diana finos, más ligeros. Usa siempre el GPI que publica el fabricante (Manual del Club: peso = longitud × GPI del fabricante).",
                       "Typical values; wood-look 'traditional' shafts tend to be heavier and skinny target shafts lighter. Always use the maker's published GPI (Manual del Club: weight = length × maker's GPI).")
  },
  "aluminium": {
   "method": t("Igual que madera para longitud, punta y tipo de arco (W_ef = W + ajuste_punta(madera) + ajuste_tipo_arco + ajuste_cuerda + 5 × (longitud − 28)); busca W_ef en la tabla de grupos (3Rivers). Código Easton XXYY: XX = diámetro en 64avos de pulgada, YY = pared en milésimas.",
               "Same as wood for length, point and bow type (W_eff = W + pointAdj(wood) + bowTypeAdj + stringAdj + 5 × (length − 28)); look W_eff up in the group table (3Rivers). Easton code XXYY: XX = diameter in 64ths of an inch, YY = wall in thousandths."),
   "chart": al_chart,
   "letters": al_letters,
   "sizes": al_sizes,
   "gpiExpr": "gpi = PI * (od - wall) * wall * 16.387 * 2.81 * 15.4324  // od, wall in inches; 7075 alloy",
   "source": "https://www.3riversarchery.com/pdf/ArrowCharts.pdf"
  },
  "fiberglass": {
   "method": t("Los fabricantes de flechas de fibra (sobre todo infantiles) usan su propia numeración o ninguna. Guía por potencia real:", "Fibreglass arrow makers (mostly youth) use their own numbering or none. Guide by actual weight:"),
   "bands": [
    {"lbs": [0, 15], "advice": t("Flechas de fibra de 6 mm (≈1/4\") o de aluminio 1416-1516.", "6 mm (≈1/4\") fibreglass or 1416-1516 aluminium.")},
    {"lbs": [15, 25], "advice": t("Fibra de 5/16\" (8 mm) tubular; o carbono 1000-1500 / aluminio 1616-1716.", "5/16\" (8 mm) tubular fibreglass; or 1000-1500 carbon / 1616-1716 aluminium.")},
    {"lbs": [25, 30], "advice": t("Solo fibra de pared gruesa; mejor pasar a carbono o madera.", "Only thick-walled fibreglass; better move to carbon or wood.")},
    {"lbs": [30, 200], "advice": t("No recomendado: usa carbono, aluminio o madera.", "Not recommended: use carbon, aluminium or wood.")}
   ],
   "gpi": [12, 20],
   "safety": t("La fibra de vidrio se astilla al romperse: revisa cada flecha y desecha las agrietadas.", "Fibreglass splinters when it breaks: inspect every arrow and discard cracked ones.")
  },
  "conversions": {
   "carbonToWoodLbs": "woodLbs ≈ 31500 / ataSpine",
   "woodLbsFromDeflection26": "woodLbs = 26 / deflectionIn  // 2 lb load on 26\" span (old wood/AMO method)",
   "note": t("Equivalencia ESTÁTICA solamente (p. ej. 500 ≈ 63#). No uses la equivalencia para elegir spine: el carbono, al ser más ligero, se comporta más rígido; usa la tabla de carbono.",
             "STATIC equivalence only (e.g. 500 ≈ 63#). Don't use it to pick spine: lighter carbon acts stiffer dynamically; use the carbon chart.")
  }
 },
 "shafts": {"woodSpecies": wood_species,
            "woodGpiExpr": "gpi = densityGcm3 * PI/4 * (diamIn*2.54)^2 * 2.54 * 15.4324",
            "woodNote": t("Valores medios; la madera varía mucho. Pesa los astiles (balanza de grains) y emparéjalos en ±10 gr.", "Average values; wood varies a lot. Weigh shafts (grain scale) and match them within ±10 gr.")},
 "weights": {
  "shaftExpr": "shaftGr = arrowLengthIn * gpi",
  "feathers": {
   "grPerInch": {"turkey-low-profile": 0.6, "turkey-high-profile": 0.75, "goose": 0.8},
   "gluePerFletchGr": 1,
   "fluFluEachGr": [6, 12],
   "examples": [
    {"length": 4, "shape": "shield", "grEach": 2.3, "source": "Trueflight 4\" shield (Lancaster Archery listing)"},
    {"length": 5, "shape": "shield/parabolic", "grEach": 3},
    {"length": 5.5, "shape": "shield/parabolic", "grEach": 3.5},
    {"length": 7, "shape": "historical", "grEach": 5}],
   "expr": "fletchGr = count * (lengthIn * grPerInch + gluePerFletchGr)"
  },
  "vanes": {"grPerInch": 2.5, "examples": [{"length": 2, "grEach": 5.5}, {"length": 3, "grEach": 7.5}, {"length": 4, "grEach": 10}],
            "spinWingEachGr": 1.5},
  "nocks": [
   {"id": "self", "gr": 0, "note": t("Tallado en el astil: no añade peso.", "Cut into the shaft: adds no weight.")},
   {"id": "self-reinforced", "gr": 5},
   {"id": "glue-on-taper", "grByDiameter": {"5/16": 8, "11/32": 10, "23/64": 12}},
   {"id": "pin", "gr": 12, "note": t("Pin + culatín.", "Pin + nock.")},
   {"id": "press-fit", "gr": 7},
   {"id": "snap-on", "gr": 7},
   {"id": "bulbous-asian", "gr": 12},
   {"id": "aluminium-bushing", "gr": 15, "note": t("Casquillo + culatín (aluminio).", "Bushing + nock (aluminium).")}
  ],
  "inserts": [
   {"id": "none-wood", "gr": 0, "note": t("Madera: punta pegada sobre cono, sin inserto.", "Wood: glue-on point over taper, no insert.")},
   {"id": "aluminium-standard", "gr": 16, "range": [10, 25]},
   {"id": "brass", "gr": 50, "range": [25, 100]},
   {"id": "outsert", "gr": 20, "range": [15, 30]}
  ],
  "points": [
   {"id": "field-glue-5/16", "range": [70, 125]}, {"id": "field-glue-11/32", "range": [100, 160]},
   {"id": "field-glue-23/64", "range": [125, 200]}, {"id": "screw-in", "range": [75, 300]},
   {"id": "bodkin-historical", "range": [70, 250]}, {"id": "warbow-heavy", "range": [200, 800]}
  ],
  "wraps": {"grPerInch": 1.5, "typicalLengthIn": 4},
  "crestingGr": [3, 10],
  "pointWeightManual": {
   "wood": "pointGr ≈ (shaftGr + nockGr + fletchGr + wrapGr) / 3",
   "carbon": "pointGr ≈ (shaftGr + nockGr + fletchGr + wrapGr) / 2.5",
   "source": M + " (Form. 1-2 / 5-6)",
   "interpretation": t("El Manual llama 'peso total de la flecha' al peso del astil con plumas y culatín (Form. 4-6: 'quin pes total tindrà el nostre vàstag... plomes... culatí'). Interpretamos que la punta NO está incluida en el dividendo. Si se incluyera, la fórmula equivalente sería punta = resto/2 (madera) o resto/1,5 (carbono), que da puntas mucho más pesadas.",
                        "The Manual calls the shaft + feathers + nock weight the 'total arrow weight' (Forms 4-6). We read it as NOT including the point. If the point were included, the equivalent would be point = rest/2 (wood) or rest/1.5 (carbon), giving much heavier points.")
  },
  "gppBands": [
   {"id": "danger", "max": 6, "name": t("Peligrosa: por debajo del mínimo de casi todos los fabricantes (riesgo de 'tiro en vacío')", "Dangerous: below nearly every maker's minimum (dry-fire risk)")},
   {"id": "light", "min": 6, "max": 8, "name": t("Ligera: diana/ILF; comprueba el mínimo del fabricante", "Light: target/ILF; check the maker's minimum")},
   {"id": "standard", "min": 8, "max": 10, "name": t("Estándar tradicional (Manual del Club: 8-9 gpp mínimo)", "Traditional standard (Manual del Club: 8-9 gpp minimum)")},
   {"id": "heavy", "min": 10, "max": 12, "name": t("Pesada: caza, self bows", "Heavy: hunting, self bows")},
   {"id": "very-heavy", "min": 12, "name": t("Muy pesada: arco de guerra, primitivo", "Very heavy: warbow, primitive")}
  ],
  "minWeightManual": {"expr": "minArrowGr = drawWeightLbs * gpp  // gpp = 8 or 9", "gpp": [8, 9], "source": M + " (Form. 3)"},
  "focTargets": [
   {"id": "target", "range": [7, 12], "name": t("Diana / 3D tradicional", "Target / traditional 3D")},
   {"id": "3d", "range": [6, 12], "name": t("3D (Ashby)", "3D (Ashby)"), "source": "Ashby 2005"},
   {"id": "fita", "range": [11, 16], "name": t("Diana olímpica / FITA (Ashby)", "Olympic / FITA target (Ashby)"), "source": "Ashby 2005"},
   {"id": "hunting", "range": [10, 15], "name": t("Caza (Easton)", "Hunting (Easton)"), "source": "Easton"},
   {"id": "hunting-efoc", "range": [19, 30], "name": t("Caza con FOC extremo (Ashby, EFOC ≥ 19%)", "Hunting extreme FOC (Ashby, EFOC ≥ 19%)"), "source": "Ashby"}
  ],
  "focNote": t("FOC negativo o < 5%: flecha inestable. Más FOC = más estable y más penetración, pero la flecha se comporta más débil (añadir peso en punta debilita el spine dinámico).",
               "Negative or < 5% FOC: unstable arrow. More FOC = more stable and more penetration, but the arrow acts weaker (adding point weight weakens dynamic spine).")
 },
 "foc": {
  "expr": "FOC = (B - L/2) / L * 100",
  "definitions": t("L = longitud del astil desde el fondo de la ranura del culatín hasta el final del tubo (norma AMO, sin punta). B = punto de equilibrio medido desde el fondo de la ranura del culatín.",
                   "L = shaft length from the bottom of the nock groove to the end of the shaft (AMO standard, excluding point). B = balance point measured from the bottom of the nock groove."),
  "fromComponents": {
   "expr": "B = sum(m_i * x_i) / sum(m_i)",
   "positionsIn": {
    "shaft": "L / 2",
    "point": "L + 0.3",
    "insert": "L - 0.5",
    "nock": "0.3",
    "fletching": "rearOffset + fletchLength / 2   // rearOffset ≈ 1.25 (feathers) or 1.0 (vanes)",
    "wrap": "0.25 + wrapLength / 2",
    "cresting": "3"
   },
   "example": {"L": 28.5, "gpi": 11, "pointGr": 125, "nockGr": 10, "fletch": "3 × 5\" shield", "resultFocPct": None}
  },
  "source": "https://cpw.state.co.us/Documents/Hunting/EHU/UpdatePrologue-UnderstandingFOC.pdf ; https://eastonarchery.com/2014/06/foc/"
 },
 "speed": {
  "caveat": t("Estimación aproximada (±10-15%). Solo un cronógrafo da la velocidad real.", "Rough estimate (±10-15%). Only a chronograph gives the real speed."),
  "storedEnergyExpr": "E_ftlb = storageFactor * W * (drawLengthIn - 1.75 - braceHeightIn) / 12",
  "efficiencyExpr": "eta = hysteresis * m / (m + virtualMassGr)",
  "velocityExpr": "v_fps = sqrt(450240 * eta * E_ftlb / m)",
  "keExpr": "KE_ftlb = m * v^2 / 450240",
  "momentumExpr": "p = m * v / 225218  // slug·ft/s",
  "metric": "v_ms = v_fps * 0.3048; KE_J = KE_ftlb * 1.3558",
  "notes": t("Modelo de masa virtual (Hickman/Klopsteg) con parámetros por tipo de arco (speedModel). Calibrado para dar ~170-180 fps con un recurvo de 50 lb a 28\" y flecha de 500 gr, y ~160-165 fps con un longbow inglés.",
             "Virtual-mass model (Hickman/Klopsteg) with per-bow parameters (speedModel). Calibrated to give ~170-180 fps for a 50 lb recurve at 28\" with a 500 gr arrow and ~160-165 fps for an English longbow.")
 },
}

# ---------------------------------------------------------------- FOC example check
L, gpi = 28.5, 11
items = [(L * gpi, L / 2), (125, L + 0.3), (10, 0.3), (3 * (5 * 0.6 + 1), 1.25 + 2.5)]
mt = sum(m for m, _ in items)
B = sum(m * x for m, x in items) / mt
data["foc"]["fromComponents"]["example"]["resultFocPct"] = round((B - L / 2) / L * 100, 1)
data["foc"]["fromComponents"]["example"]["totalGr"] = round(mt)

# speed example check
def speed(bt, W, draw, brace, m):
    sm = next(b for b in bow_types if b["id"] == bt)["speedModel"]
    E = sm["storageFactor"] * W * (draw - 1.75 - brace) / 12
    eta = sm["hysteresis"] * m / (m + sm["virtualMassGr"])
    return math.sqrt(450240 * eta * E / m)
data["speed"]["examples"] = [
  {"bow": "recurve-traditional", "W": 50, "draw": 28, "brace": 7.5, "arrowGr": 500, "fps": round(speed("recurve-traditional", 50, 28, 7.5, 500))},
  {"bow": "longbow-english", "W": 50, "draw": 28, "brace": 7, "arrowGr": 500, "fps": round(speed("longbow-english", 50, 28, 7, 500))},
  {"bow": "selfbow-primitive", "W": 50, "draw": 28, "brace": 6.5, "arrowGr": 550, "fps": round(speed("selfbow-primitive", 50, 28, 6.5, 550))},
  {"bow": "recurve-ilf-barebow", "W": 38, "draw": 28, "brace": 8.5, "arrowGr": 300, "fps": round(speed("recurve-ilf-barebow", 38, 28, 8.5, 300))},
  {"bow": "kids-fiberglass", "W": 15, "draw": 23, "brace": 7, "arrowGr": 300, "fps": round(speed("kids-fiberglass", 15, 23, 7, 300))}
]

data["formulas"] = [
 {"id": "arrow-length", "expr": "drawLengthIn + 1", "desc": t("Longitud de flecha = apertura + 1\" (2,5 cm).", "Arrow length = draw length + 1\" (2.5 cm)."), "source": M},
 {"id": "arrow-length-cm", "expr": "drawLengthCm + 2.5", "desc": t("Igual, en centímetros.", "Same, in centimetres."), "source": M},
 {"id": "draw-from-wingspan", "expr": "wingspanCm / 2.5 / 2.54 + styleAdjIn", "desc": t("Apertura estimada a partir de la envergadura.", "Draw length estimated from wingspan."), "source": "ATA fitting rule (wingspan/2.5)"},
 {"id": "draw-from-height", "expr": "heightCm / 6.35 + styleAdjIn", "desc": t("Apertura estimada a partir de la altura (envergadura ≈ altura).", "Draw length estimated from height (wingspan ≈ height).")},
 {"id": "actual-draw-weight", "expr": "markedLbs * (1 + perInchPct * (drawLengthIn - markedAtIn))", "desc": t("Potencia real a tu apertura.", "Actual weight at your draw."), "source": "3Rivers (2-3 lb per inch)"},
 {"id": "min-arrow-weight", "expr": "drawWeightLbs * gpp  /* gpp = 8 or 9 */", "desc": t("Peso mínimo recomendado de la flecha (grains).", "Minimum recommended arrow weight (grains)."), "source": M + " (Form. 3)"},
 {"id": "shaft-weight", "expr": "arrowLengthIn * gpi", "desc": t("Peso del astil = longitud × GPI del fabricante.", "Shaft weight = length × maker's GPI."), "source": M + " (Form. 4)"},
 {"id": "point-weight-wood", "expr": "(shaftGr + nockGr + fletchGr + wrapGr) / 3", "desc": t("Peso aproximado de la punta, flecha de madera.", "Approximate point weight, wooden arrow."), "source": M + " (Form. 1/5)"},
 {"id": "point-weight-carbon", "expr": "(shaftGr + nockGr + fletchGr + wrapGr) / 2.5", "desc": t("Peso aproximado de la punta, flecha de carbono.", "Approximate point weight, carbon arrow."), "source": M + " (Form. 2/6)"},
 {"id": "total-weight", "expr": "shaftGr + pointGr + insertGr + nockGr + fletchGr + wrapGr + crestGr", "desc": t("Peso total de la flecha.", "Total arrow weight.")},
 {"id": "gpp", "expr": "totalGr / drawWeightLbs", "desc": t("Grains por libra de potencia.", "Grains per pound of draw weight.")},
 {"id": "fletch-weight", "expr": "count * (lengthIn * grPerInch + gluePerFletchGr)", "desc": t("Peso estimado del emplumado.", "Estimated fletching weight.")},
 {"id": "wood-gpi", "expr": "densityGcm3 * Math.PI/4 * Math.pow(diamIn*2.54, 2) * 2.54 * 15.4324", "desc": t("GPI teórico de un astil de madera.", "Theoretical GPI of a wooden shaft.")},
 {"id": "aluminium-gpi", "expr": "Math.PI * (odIn - wallIn) * wallIn * 16.387 * 2.81 * 15.4324", "desc": t("GPI teórico de un tubo de aluminio a partir de su código.", "Theoretical GPI of an aluminium tube from its size code.")},
 {"id": "spine-wood", "expr": "W + pointAdjWood + bowTypeAdj + stringAdj + 5 * (arrowLengthIn - 28)", "desc": t("Spine de madera en libras (redondear al rango de 5 lb).", "Wood spine in pounds (round to the 5-lb band)."), "source": M + " (Annex I); 3Rivers"},
 {"id": "spine-carbon-eff", "expr": "W + 5*(arrowLengthIn - 28) + 3*(pointGr - 125)/25 + bowTypeAdj + stringAdj", "desc": t("Potencia efectiva para la tabla de carbono.", "Effective weight for the carbon chart."), "source": "Easton; 3Rivers"},
 {"id": "foc", "expr": "(B - L/2) / L * 100", "desc": t("FOC (%) a partir del punto de equilibrio.", "FOC (%) from the balance point."), "source": "Easton / Ashby (AMO)"},
 {"id": "balance-point", "expr": "sum(m_i * x_i) / sum(m_i)", "desc": t("Punto de equilibrio a partir de los componentes.", "Balance point from component masses and positions.")},
 {"id": "speed", "expr": "Math.sqrt(450240 * eta * E / m)", "desc": t("Velocidad estimada (fps).", "Estimated speed (fps).")},
 {"id": "kinetic-energy", "expr": "m * v*v / 450240", "desc": t("Energía cinética (ft·lb).", "Kinetic energy (ft·lb).")},
 {"id": "momentum", "expr": "m * v / 225218", "desc": t("Cantidad de movimiento (slug·ft/s).", "Momentum (slug·ft/s).")},
 {"id": "carbon-to-wood-static", "expr": "31500 / ataSpine", "desc": t("Equivalencia estática spine carbono → libras de madera.", "Static carbon spine → wood pounds equivalence.")},
 {"id": "lb-to-kg", "expr": "lbs * 0.4536", "desc": t("Libras a kilos.", "Pounds to kilograms."), "source": M},
 {"id": "in-to-cm", "expr": "inches * 2.54", "desc": t("Pulgadas a centímetros.", "Inches to centimetres."), "source": M},
 {"id": "g-to-grains", "expr": "grams * 15.4324", "desc": t("Gramos a grains (el Manual redondea a 15).", "Grams to grains (the Manual rounds to 15)."), "source": M}
]

data["sources"] = [
 "Manual del Club: Club Vall-Llobera Terra d'Arquers, 'Curs Tecnificació Bàsic – Manual fletxes' (Documentos/Manual fletxes.PDF), pp. 4-15, 46-47",
 "https://www.3riversarchery.com/pdf/ArrowCharts.pdf",
 "https://eastonarchery.com/wp-content/uploads/2023/08/301055-A-Arrow-Shaft-Selection-Target.pdf",
 "https://eastonarchery.com/wp-content/uploads/2023/08/301055-A-Arrow-Shaft-Selection-Hunting.pdf",
 "https://goldtip.com/arrow-spine-selector",
 "https://cpw.state.co.us/Documents/Hunting/EHU/UpdatePrologue-UnderstandingFOC.pdf",
 "https://eastonarchery.com/2014/06/foc/",
 "https://eastonarchery.com/2022/06/the-simple-guidelines-to-correct-arrow-balance-foc/",
 "https://lancasterarchery.com/products/trueflight-4-shield-back-feathers-18-count-combo-pack",
 "https://www.tradgang.com/tgsmf/index.php?msg=322592",
 "https://www.tradgang.com/tgsmf/index.php?msg=563580",
 "https://outdoorlife.com/blogs/game-changers/how-tune-arrows-traditional-bows-correct-spine-and-length-combo",
 "https://archery360.com/2020/12/09/understanding-arrow-spine/",
 "https://www.chnarchery.com/blogs/news/recommended-draw-weight-for-new-archers-bow-draw-weight-charts",
 "https://archery360.com/?p=97171",
 "https://www.bearpaw-products.com/blogs/our-products/the-fascination-of-horsebows",
 "https://www.3riversarchery.com/magyar-sport-horse-bow.html",
 "https://en.wikipedia.org/wiki/Archer%27s_paradox"
]

with open(OUT, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=1)

print("FOC example", data["foc"]["fromComponents"]["example"])
print("speed", data["speed"]["examples"])
print("carbon bands", carbon_bands)
print("al sizes", al_sizes)
print("wood rec 28 col", [r[gen_cols.index(28)] for r in wood_rec])
print("carbon rec", gen_carbon(0))
print("species", [(w["id"], w["gpi"]) for w in wood_species])
