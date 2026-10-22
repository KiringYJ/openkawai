# Inventory

Record the files of one lawfully obtained target build here. The inventory is
about identity and structure, not content: hashes, sizes, formats, and a short
note for each file.

## Rules

- Never commit the archive, executables, DLLs, or extracted resources.
- Record the archive hash before extracting anything.
- Keep generated inventories small and reviewable. If a tool emits thousands of
  entries, summarise by directory and attach the full machine-readable file under
  `re/.local/`.
- Do not record licence keys, account names, or absolute paths containing a user
  name.

## Suggested workflow

1. Hash the archive and write the target block in `manifest.json`.
2. Extract to an ignored local directory, such as `re/.local/kawai2004/`.
3. Inventory top-level files and notable subdirectories.
4. Identify formats and runtime dependencies without executing untrusted code.
5. Record what was *not* examined and why.

Start from [`manifest.example.json`](manifest.example.json). The empty `files`
array is intentional: fill it only with observed data.
