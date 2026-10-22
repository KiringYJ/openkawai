# Scope

Last reviewed: 2026-10-22.

## Target

| Field           | Value                                                                 |
| --------------- | --------------------------------------------------------------------- |
| Game            | KAWAI 連連看 2004                                                      |
| Version         | v1.01                                                                  |
| Original archive| `kawai2004v101.zip`                                                    |
| SHA-256         | `3e722be316006e07fa3da8c39fa7926db41966b1501f756513df2335a93142c8`     |
| Author page     | [archived page](https://web.archive.org/web/20080604052530/http://cps-chen.myweb.hinet.net/kawai2004/kawai2004.htm) |
| Archive source  | [archived ZIP](https://web.archive.org/web/20070227095657id_/http://cps-chen.myweb.hinet.net/kawai2004/kawai2004v101.zip) |

The hash and links are cross-checked against
[`kawai-win11-compat`](https://github.com/KiringYJ/kawai-win11-compat). The
archive is **not** stored in this repository.

## Legal boundary

- The original executable, archives, artwork, music, and third-party runtime
  files are not part of this project.
- Analysis may only use a copy obtained and run lawfully by the investigator.
- Findings must describe observable behaviour. Do not copy decompiled code or
  extracted resources into tracked files.
- The placeholder tile set is original work, not a reproduction of the original
  art.

## Reported runtime context

The sibling compatibility project reports that Kawai2004 is a Visual Basic 5
application and uses a DirectX-for-Visual-Basic runtime DLL through a
registration-free COM manifest on Windows 11. Treat this as context, not as an
independently confirmed fact for this repository; verify before relying on it.

## Known behaviour

Only the following are currently treated as facts:

- The game is a matching-pair ("連連看") game distributed as a Windows build.
- The target build is v1.01 with the archive hash above.

Everything else in the implementation is a provisional choice. The current tile
set, board size, five-minute timer, scoring, and hint/shuffle behaviour are
**not** confirmed against the original.

## Open questions

| ID    | Question                                                             | Status  |
| ----- | -------------------------------------------------------------------- | ------- |
| Q-001 | What is the playable board size and are there layout variants?        | unknown |
| Q-002 | How many tile kinds exist, and what is their distribution per board?  | unknown |
| Q-003 | Are diagonal connections allowed, or only orthogonal?                 | unknown |
| Q-004 | Is the outer border always traversable? Are there corner restrictions?| unknown |
| Q-005 | What are the exact turn and path rules for edge cases?                | unknown |
| Q-006 | What is the round time limit, and does it vary by mode?               | unknown |
| Q-007 | How are score, combo, and time bonus calculated?                      | unknown |
| Q-008 | What do hint and shuffle cost, and are they limited?                  | unknown |
| Q-009 | What happens when no moves remain? Auto-shuffle or loss?              | unknown |
| Q-010 | What is the menu, mode, and level progression flow?                   | unknown |
| Q-011 | Which sounds and animations accompany selection and matching?         | unknown |
| Q-012 | Is there persistent score or save data, and where is it stored?       | unknown |

Add a finding in `findings/` before changing a provisional constant in `src/`.
