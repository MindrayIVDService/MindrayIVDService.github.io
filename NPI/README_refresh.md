# NPI Portal — Monthly Data Refresh

## Setup (one-time)
1. Put `refresh_npi_data.py` in the same folder as your two source workbooks
   (wherever you keep `QE&FTFR.xlsx` and `RTS training data.xlsx` each month).
2. `pip install openpyxl` if you haven't already.
3. Open `refresh_npi_data.py` and check the `LIVE_SITE_DATA_DIR` path near the
   top matches your machine (`F:\IVD\IVD\NPI\data` by default). This also
   determines the default location it reads the live portal's `index.html`
   from (`F:\IVD\IVD\NPI\index.html`, i.e. one level up) — override with
   `--portal-html <path>` if your layout differs.

## Every month
1. Drop the new `QE&FTFR.xlsx` and `RTS training data.xlsx` into that folder
   (overwrite the old ones, same filenames).
2. Run: `python refresh_npi_data.py`
3. Read the sanity-check summary it prints — compare FTFR%, SLA%, MCSR-E
   attainment%, and the Equipment/Coverage map row counts against last
   month's numbers. A big unexplained jump usually means a sheet got
   restructured upstream, not that the business actually moved that much.
   Pay particular attention to the `skip_*` counters printed for MCSR
   record / MCST record / Equipment data — these should stay roughly
   stable month to month; a sudden jump means something upstream changed
   shape.
4. It copies the 7 refreshed files straight into `F:\IVD\IVD\NPI\data\`,
   overwriting the old ones.
5. Open the portal via a local server (not double-click — see the portal's
   own error message if you forget) and eyeball a page or two, including
   the Coverage Map and Equipment Lifecycle pages.
6. Commit + push `F:\IVD\IVD\NPI` the same way you always do (GitHub
   Desktop, or your existing script).

## What this script produces
    data/qe.json          <- QE&FTFR.xlsx           > QE
    data/ftfr_agg.json    <- QE&FTFR.xlsx           > FTFR-BD
    data/mcsre.json       <- RTS training data.xlsx > MCSR-E
    data/f2f.json         <- RTS training data.xlsx > face to face record + course list
    data/rts_roster.json  <- RTS training data.xlsx > RTS Score
    data/equipment.json   <- RTS training data.xlsx > Equipment data
    data/coverage_map.json<- RTS training data.xlsx > Equipment data, MCSR record,
                                                        MCST record, CS Score
                             + index.html            > MC_ROWS_SEED (Page D)

## What this script does NOT touch
- `index.html` — the portal's code doesn't change month to month. It IS
  read (not written) for `MC_ROWS_SEED`, so if you add a new model/category
  on Page D, re-running this script will pick it up automatically.
- Git commit/push — stays a manual, deliberate step so you always get to
  look before it goes live.

## A note on coverage_map.json / equipment.json specifically
These two depend on an org-specific reference table (which countries
belong to which internal "Region III" territory) that isn't in either
workbook — it's embedded directly in the script (`L3_MAP_RAW`) because it
was recovered from a separate internal dashboard, not derived from data.
If Mindray's regional boundaries are ever restructured, that table needs a
fresh source — don't hand-edit country lists in the script based on
guesswork. Two synthetic buckets, `COMMON INDIA` and `COMMON RUSSIA`, exist
because India and Russia are the only countries that internally split into
several Region IIIs, so a channel/distributor account whose only location
signal is the country name can't always be placed more precisely — treat
those two buckets as "somewhere in that country," not as precisely located.

Two other known, non-fixable gaps worth knowing about (the script counts
them each run rather than guessing):
- Internal "TS"-role MCSR qualifications have no region anywhere in the
  source data (not in CS Score, not in their own record) — they're
  dropped and counted under `skip_internal_no_geo`.
- A handful of MCST record rows reference course-group names that Page D's
  `mcst_name` field doesn't recognize — dropped and counted under
  `skip_no_category`.
