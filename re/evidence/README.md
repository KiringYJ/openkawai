# Evidence

Store only the smallest sanitised artifacts needed to support a finding.

## Allowed here

- Screenshots of the game's visible UI, when their inclusion is lawful and they
  do not reproduce a substantial portion of the artwork.
- Short text excerpts such as menu labels, window titles, or error messages.
- JSON summaries produced by an analysis tool: counts, addresses, hashes, call
  relationships, and short descriptions.
- Independently written diagrams or tables.

## Keep local

Put these under `re/.local/` (ignored by Git):

- the original archive and extracted files;
- full REA snapshots and provider databases;
- long disassembly or pseudocode;
- extracted images, audio, fonts, and data tables;
- anything containing a user name, path, or licence identifier.

## Sanitisation checklist

- [ ] No original binary or resource bytes.
- [ ] No long decompiled listing.
- [ ] No personal paths, account names, or keys.
- [ ] The finding can be understood without the raw file.
- [ ] The file name follows `YYYYMMDD-description.ext`.
