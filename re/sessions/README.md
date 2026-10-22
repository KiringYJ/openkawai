# Sessions

A session is a reproducible investigation log. It answers "how do we know?"
without requiring the reader to rerun the original game.

## Rules

- Use one file per investigation, named `YYYYMMDD-target-topic.md`.
- Record the build hash, OS, locale, display configuration, and tool versions.
- List the exact commands or interaction sequence.
- Keep raw output under `re/.local/`; embed only the minimal excerpt needed to
  support a finding.
- Record limitations and anything that could invalidate the observation.
- A session may produce zero or several findings.

Copy [`_template.md`](_template.md) to start. Do not edit an old session to
change its conclusion; add a new session and link it.
