# Reverse-engineering workspace

This directory is the evidence layer for openkawai. Its job is to turn
observations of the original game into small, reviewable findings that justify
changes in `src/`.

It is **not** a place to store the original game, extracted assets, or
decompiled code. Read [`scope.md`](scope.md) and
[`../docs/ASSETS.md`](../docs/ASSETS.md) before adding material.

## Method

1. **Scope** — identify the exact build, environment, and question.
2. **Session** — record a reproducible investigation in `sessions/`: tools,
   commands, inputs, outputs, and limitations.
3. **Finding** — write one claim per file in `findings/`, with evidence links and
   a confidence level.
4. **Decision** — if a finding changes architecture or policy, record an ADR in
   `decisions/`.
5. **Implementation** — change `src/`, add a test, and link the finding from the
   commit or pull request.

A finding can be revised. Do not silently overwrite old evidence; add a new
session and supersede the finding.

## Directory map

| Path          | Contents                                                        |
| ------------- | --------------------------------------------------------------- |
| `scope.md`    | Target identity, legal boundary, known facts, open questions.   |
| `inventory/`  | File inventory and hashes for a lawfully obtained local copy.   |
| `sessions/`   | Reproducible investigation logs.                                |
| `findings/`   | One claim per file, with confidence and evidence links.         |
| `evidence/`   | Sanitised excerpts, screenshots, and exported observations.     |
| `assets/`     | Asset manifest policy; extracted files stay local and ignored.  |
| `decisions/`  | Architecture and policy decisions derived from findings.        |

## Confidence levels

| Level       | Meaning                                                          |
| ----------- | ---------------------------------------------------------------- |
| `confirmed` | Reproduced at least twice on the recorded build and environment. |
| `inferred`  | Consistent observations, but a plausible alternative remains.    |
| `unknown`   | Not yet investigated or not reproducible.                        |
| `rejected`  | Previously believed, disproved by newer evidence.                |

## Evidence rules

- Record the target hash, OS, display mode, and tool versions for every session.
- Prefer observable behaviour and minimal captures over decompiled output.
- Do not paste large pseudocode, disassembly, or original resource bytes into
  tracked files. Summarise the fact, keep the address or hash, and write the
  implementation independently.
- Put raw or sensitive captures under `re/.local/` (ignored). Promote only
  sanitised, minimal evidence into `evidence/`.
- Distinguish "what the game does" from "how the original implements it". The
  first is the contract; the second is only a hint.
- If a claim cannot be reproduced, leave it `unknown` rather than promoting a
  guess.

## Naming

- Findings: `RE-0001-short-title.md`
- Sessions: `YYYYMMDD-target-topic.md`
- Evidence: `YYYYMMDD-description.json`, `.png`, or `.txt`
- Decisions: `NNNN-short-title.md`

## Tooling

The sibling project
[`kawai-win11-compat`](https://github.com/KiringYJ/kawai-win11-compat) provides a
source-only launcher and a reproducible local assembly workflow for the 2003,
2004, and 2005 games. Use a copy you are authorised to run.

[REA](https://github.com/morluto/rea) is a useful investigation harness for
static and runtime analysis. If you use it:

- keep the target and its outputs outside this repository's tracked files;
- export snapshots into `re/.local/` and cite only the relevant observation;
- record the REA version and provider in the session log.

Tool output is evidence, not an implementation. The code in `src/` must remain
an independent expression of the observed behaviour.
