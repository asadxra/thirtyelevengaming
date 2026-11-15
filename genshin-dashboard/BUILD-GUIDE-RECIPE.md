# How a build guide is made

The recipe behind the 23 guides in Genshin Studio, reconstructed from the
guides themselves (their sources, notes and structure). Use it as the brief for
whoever or whatever writes the next guide. The display side is in
`BUILD-GUIDES-MAP.md`.

## 1. Trigger

You type a character on the Build Guides page and press **Send to Claude**.
That saves `buildreq/request = {char, status: "waiting"}` and copies
"research my build guide for X". Pasting that in a Claude chat starts the work.
A guide can also start from a **video transcript** you paste (Mona from Sevie,
Vodinita from Zy0x).

## 2. Research: at least two sources

| Source | Used for |
| --- | --- |
| **Icy Veins** (build and team guides) | Main reference: weapon and artifact ranking, Energy Recharge targets, team lists, tier rating |
| **GenshinBuilds** | Current-version weapons, artifacts, stats, talent order, community usage |
| **KeqingMains** | Theorycrafting check, mostly for newer or complex characters |
| **GameWith, u7buy, Sportskeeda, Beebom, AllThings.how, TimeSaver, Pocket Tactics** | Gap-fillers: stat targets, weapon stats, extra teams |
| **A YouTube guide transcript** | Starting point when you supply one, then re-checked against Icy Veins |

Rules the guides follow:

- **Prefer the current version.** Note the game version and date checked (e.g. "v7.1", "updated Sep 2026").
- **Cross-check.** Where sources agree, say so. Where they disagree, keep both options and explain the split in `source`.
- **Mark what isn't sourced.** Reasons that come from general game knowledge are labelled that way.

## 3. Work out the roles

Decide what the character can be built as: **Support**, **Sub DPS**,
**Hybrid** or **DPS**.

- **One clear role** (e.g. Xiao DPS, Bennett support): the items don't need role tags.
- **Several roles** (e.g. Rosaria, Columbina, Durin): tag every weapon, artifact and team with the role or roles it suits.
- **Popular role:** set `popularRole` when one role is clearly the community favourite (Rosaria → Sub DPS). It becomes the default filter.
- **Different stats per role:** use `statsBy` when main stats change by role (Rosaria, Mitya, Mona).

## 4. Fill each section

| Section | What goes in | Typical size |
| --- | --- | --- |
| **Header** | Name, rarity, weapon type, element, one-line role summary | 1 |
| **Weapons** | Best first. Signature weapon, then strong 5★, then good 4★ (F2P and craftable), then 3★ fallbacks. Each has stars and a 1–3 sentence **why** (which stat or passive helps, and any condition). | 8–17 |
| **Artifacts** | 4-piece sets ranked first, then 2-piece combos, each with a **why** | 3–9 |
| **Artifact stats** | Main stat for Sands, Goblet and Circlet (with alternatives and when to pick them), then a substat priority. **Energy Recharge targets** by team type and constellation. | 1 block |
| **Talent priority** | Which talent to level first, the target level, and why | 3 |
| **Teams** | 4 members, a team name, a short note on why it works and any substitutes. Most popular first, marked `popular`. | 5–25 |

## 5. Writing style for the "why" lines

- Plain, friendly English, short sentences.
- Lead with the verdict ("The best general pick.", "Best in slot.", "A solid free option.").
- Then the reason, as a game mechanic: which stat, passive or buff, and who it helps.
- Mention the catch if there is one ("needs a few CRIT Rate substats", "only if no one else uses Noblesse").
- No hype and no made-up numbers; numbers come from a source.

## 6. Save and finish

1. Write the guide to `builds/<character-slug>` with `checkedAt` set to now and `source` listing every site used, the version and any disagreements.
2. Set `buildreq/request.status = "done"`.
3. On the page, **Refresh guides** opens the new guide automatically.
4. Optionally add a portrait (**Change image**) and **Save a copy** to freeze this version before later updates.

## 7. Updating an existing guide

Re-check it against the same sources when a new version releases. Update the
lists, add "Re-checked <date> against …" to `source`, and bump `checkedAt`.
Saved copies stay as they were, so you can compare.

## Quick checklist

- [ ] At least two sources, current version, disagreements noted
- [ ] Roles decided; items tagged if more than one role
- [ ] Weapons ranked best first with stars and a reason each
- [ ] Artifacts: 4-piece first, reasons given
- [ ] Main stats per slot, substat order, Energy Recharge targets
- [ ] Talent order with target levels
- [ ] Teams of 4, most popular first, with a note each
- [ ] `source`, `checkedAt` filled; request marked done
