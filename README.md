# token-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/heartfarren4-dev/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/heartfarren4-dev/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A token-launch radar: ranks 178 pre-token protocols by implied value, derived from the DefiLlama snapshot's own figures (TVL, 7-day change, time listed) with a peer-multiple model — no hardcoded name list. Every row carries a concrete 7-step farm plan with capital tiers, costs and durations, and the dashboard is sortable, filterable, and shows a per-protocol detail view with the full model breakdown.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../input/snapshot.json
```

Reads `/input/snapshot.json` and writes `/output/board.json`, the dashboard (`data.js`), and `dossier.json`.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
