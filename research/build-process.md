# Arrow build process: research summary

Companion to `build-process.json`, which holds the full bilingual (ES/EN) data: tools, consumables, steps, safety and finishing for each material, plus tuning steps and a 46-term glossary.

It is consistent with the club manual (`Documentos/Manual fletxes.PDF`):
- Arrow length = draw length + 2.5 cm (1 in), measured from the bottom of the nock groove to the end of the shaft.
- Points are weighed in grains (1 g = 15.43 gr).
- Wood shafts: taper the point with the LONG blade and glue on a taper point with epoxy, 2-part glue or Loctite. Taper the nock end with the SHORT blade.
- On wood, the nock slot always goes ACROSS the grain (a contraveta), never parallel to it.
- Carbon: put hot melt inside the shaft, insert the point quickly and trim the excess.
- Fletching follows the jig routine. Never mix left-wing and right-wing feathers.

## Extra top-level keys in the JSON

The JSON follows the requested structure and adds three keys:
- `meta`: unit conversions and the length rule.
- `common.fletchingSteps`: a 4-step fletching-jig routine that every material reuses.
- `glueGuide`: which glue to use for each job.

## Overview by material

| Material | Difficulty | Time per dozen | Key specifics |
|---|---|---|---|
| Wood | 2 | 3–4 h + 1–2 days drying | Inspect for knots and grain runout. Weight-sort within ±10 gr and spine-sort in 5 lb bands. Straighten by hand or with heat. Taper the nock end (~11°, short blade), seal and crest, then glue the nock across the grain and fletch. Cut to length, taper the point end (~5°, long blade) and glue on the point. |
| Bamboo | 3 | 6–10 h over several days | Season the canes. Heat-straighten the internodes first, then the nodes. File the nodes flush but keep the skin. Cut so a node sits 1–3 cm in front of the nock. Make a self nock bound with thread, or fit hardwood plugs for taper points and nocks. Thread binding is almost mandatory. |
| Carbon (incl. wood-look and footed) | 1 | 1.5–2 h + glue cure | Cut with an abrasive arrow saw only, then square and clean. Dry-fit the parts. For hot melt, use the low-temperature kind and heat the point, never the tube; epoxy is the alternative. Footing, outserts and half-outs are optional. Do not scuff wood-look finishes. |
| Fiberglass | 1 | 1.5–2 h | Solid shafts take parallel glue-on points and over nocks. Tubular shafts take inserts and press-fit nocks. Glass dust needs a mask, glasses and gloves. Fiberglass splinters on side impacts. |
| Aluminium | 1 | 1.5–2 h | Size code: e.g. 2016 = 20/64 in diameter, 0.016 in wall. Cut with an arrow saw, not a plumber's tube cutter. Deburr. Hot-melt the inserts. Glue conventional nocks onto the swaged taper, or press-fit nocks into a bushing. Check straightness before every session. |

## Key cross-checked facts
- **Wood taper angles:** about 5° for the point (long blade) and about 11° for the nock (short blade). Some tools cut 9–10° nock tapers, so match the taper to your nocks. Cut the point taper last, because it fixes the final length.
- **Wood spine and weight:** vendors (3Rivers) sell Port Orford cedar in 5 lb spine bands and 20-grain weight groups. Typical 11/32 in cedar weighs 10–13 GPI. Straighten by overcorrecting over the heel of the hand, using short low-heat passes if needed. Cull any shaft that springs back after about 3 tries.
- **Wood nock orientation:** the club rule (slot across the grain lines) is the standard anti-split practice. Forum builders also align the grain "pointers" consistently so every arrow in the set flexes in the same plane.
- **Cutting carbon:** Gold Tip says to use only a high-speed abrasive cut-off saw and to roll the shaft against the wheel. Cut and test one arrow first. Never shoot an arrow less than 1 in past the rest at full draw.
- **Cleaning:** Easton says to clean the insert area and fletching area with 91% isopropyl alcohol (or MEK for the fletching area) until no residue shows. Do not soak shafts in solvents. Keep acetone and MEK away from fitted nocks.
- **Glue on carbon (conflicting advice):**
  - The club manual and many traditional builders use hot melt on carbon.
  - Easton's FAQ and Gold Tip do not recommend hot melt on pure carbon. They want epoxy or their own insert adhesive, and Gold Tip says to cure 24 h.
  - Lancaster recommends low-temperature ("cold") melt as the safer option on carbon.
  - The JSON compromises: low-temperature hot melt with the point heated (never the tube), or the shaft maker's epoxy. The tip "if it is too hot to hold, it is too hot for the shaft" comes from several sources.
- **Glue on aluminium:** Easton prescribes hot melt for inserts in aluminium and aluminium/carbon shafts.
- **Fletching glue:** cyanoacrylate is fast. Fletch-Tite or Bohning cement is the traditional choice for feathers and wood. Check that a CA glue is rated for the fletching type you use.
- **Bare-shaft tuning, right-handed archer:**
  - Bare shaft hits left = too stiff; right = too weak. Reverse this for left-handers.
  - Bare shaft hits low = nocking point too high; high = nocking point too low.
  - Fix vertical first. Start at about 10 m, then move back to 15–20 m.
  - A stiff arrow is fixed with a heavier point, a longer arrow or a weaker spine. A weak arrow is fixed with a lighter point, by shortening 1/4 in (0.5 cm) at a time, or with a stiffer spine.
  - Put tape on the bare shaft to match the weight of the fletching.
  - One search summary stated the point-weight effect backwards. The JSON follows Archery360: heavier points weaken dynamic spine.

## Notes and assumptions
- **Cock feather:** the JSON says it sits perpendicular to the nock slot and points away from the bow. This is the conventional set-up for 3 feathers at 120° shot off the shelf.
- **Nocking point:** the JSON uses 1–1.5 cm (3/8–1/2 in) above square as the traditional starting value.
- **GPP:** the JSON gives "≥ 8–9 GPP" as general traditional guidance. Bow makers' minimums vary, so check the bow's manual.
- **Fiberglass heat tolerance:** I found no source that addresses it directly. The JSON says not to overheat the shaft and to heat only the point.
- **Footed carbon:** I found no single manufacturer how-to. The steps are synthesized from outsert/half-out instructions (dry-fit first, epoxy, account for added length and weight) and from traditional forum practice.
- **Spanish terminology** is Spain-standard: astil/vástago, culatín, punta, pluma, emplumadora, conificador, emplumado helicoidal/offset/recto, pluma guía, punto de enfleche, repisa, altura de cuerda (fistmele), apertura.

## Sources
- 3Rivers Archery: [Building Wood Arrows, Where to Start](https://www.3riversarchery.com/blog/?p=1482); [Weight Matched Port Orford Cedar](https://www.3riversarchery.com/weight-matched-port-orford-cedar-wood-shafting.html); [Tapered POC shafts](https://www.3riversarchery.com/tapered-port-orford-cedar-wood-shafting.html); [Making Bamboo Arrows booklet](https://3riversarchery.com/making-bamboo-arrows-book.html)
- Gold Tip via 3Rivers: [Arrow Assembly](https://www.3riversarchery.com/blog/gold-tip-arrow-assembly/); [Bare Shaft Tuning](https://www.3riversarchery.com/blog/gold-tip-arrows-bare-shaft-tuning/)
- Easton: [FAQ](https://eastonarchery.com/faqs/); [Arrow maintenance](https://eastonarchery.com/2018/08/arrow-maintenance/)
- Lancaster Archery: [Know Your Archery Glues](https://lancasterarchery.com/blogs/guides-and-information/know-your-archery-glues); [A Basic Guide to Arrow Nocks](https://lancasterarchery.com/blogs/guides-and-information/a-basic-guide-to-arrow-nocks)
- Archery360: [How to Bare-Shaft Tune Your Recurve or Longbow](https://archery360.com/2019/07/10/how-to-bare-shaft-tune-your-recurve-or-longbow/); [Build Wooden Arrows in 5 Steps](https://archery360.com/2019/12/18/build-wooden-arrows-in-5-steps)
- Legend Archery: [How to cut and assemble carbon/aluminium arrows](https://legendarchery.com/blogs/archery-bowhunting-blog/how-to-cut-arrows-and-assemble-for-carbon-aluminum-shafts)
- Arrow-building course modules: [Shafts: straightening and tapering](https://dvhthomas.github.io/arrow-building/modules/02-shafts-straightening-tapering/); [Bareshaft tuning session](https://dvhthomas.github.io/arrow-building/modules/05-tuning-maintenance-repair/exercises/bareshaft-tuning-session/)
- Bohning: [Tech guide (PDF)](https://www.bohning.com/wp-content/uploads/2020/02/tech_guide_english.pdf); Abbey Archery: [Installing inserts/points with Ferr-L-Tite](https://www.abbeyarchery.com.au/p/ARTC992/How+to+install+inserts+and+points+using+Bohning+Ferr-L-Tite+Hot+Melt.html)
- World Archery: [Archery 101: How to put points in arrows](https://worldarchery.org/news/146283/archery-101-how-put-points-arrows); [Make your own equipment (PDF)](https://extranet.worldarchery.sport/documents/index.php/Coaches/Equipment/MAKE_YOUR_OWN_EQUIPMENT.pdf)
- Georgia 4-H: [Making Arrows (PDF)](https://georgia4h.org/wp-content/uploads/2018/05/MakingArrrows.pdf), on fiberglass properties.
- Bamboo: [Instructables: How to Make Bamboo Arrows](https://instructables.com/How-to-Make-Bamboo-Arrows); [Korean bamboo arrow crafting](https://koreanarchery.org/classic/jookshi.html)
- Instructables: [Traditional Arrows](https://www.instructables.com/traditional-arrows)
- Outsert/footing: [AltraArrows ARCOS instructions (PDF)](https://cdn.shopify.com/s/files/1/0724/5411/1540/files/AltraArrows-ARCOS-Insturctions.pdf); TradGang forum threads on footed carbon.
- Spanish terminology: [Revista Aire Libre, "La flecha de madera"](https://revista-airelibre.com/2018/01/17/la-flecha-madera)
