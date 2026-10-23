# Animal candidate selection

Audited on 2026-10-23 against the immutable revisions in
[ASSETS.md](ASSETS.md). The implementation decision is
[0002-expanded-animal-pool.md](decisions/0002-expanded-animal-pool.md).

## Inclusion standard

The pool contains 75 distinct whole-animal identities with artwork in all four
independent libraries: Fluent 3D, Noto Color Emoji, Twemoji, and OpenMoji.
The audit rendered each library's exact pinned asset side by side; file presence
or an animal's Unicode name alone was not enough. A rendering must show the
whole-animal silhouette rather than a cropped head, a face with paws, an egg
obscuring the body, a body part, or a habitat. Mythical animals remain eligible,
as do whole marine animals classified under Unicode Food & Drink.

The five theme options remain available. Of the 75 candidates, 73 have official
Fluent Animated files; coral and oyster use the pinned Fluent 3D images.
The catalog records exact animation paths, including the different Phoenix
folder/filename in the two Microsoft repositories.

## Exclusions

| Reason | Excluded candidates |
| --- | --- |
| Agreed pest policy | Cockroach, mosquito, fly, ant |
| All drawings are head-only | Chicken, moose; face-specific animal emoji |
| Cropped in at least one library | Boar (Fluent/Noto/Twemoji), raccoon (Fluent/Twemoji) |
| Twemoji uses a head or face with paws | Deer, gorilla, rhinoceros, zebra, hedgehog |
| Body obscured or incomplete | Hatching chick, baby chick |
| Not a whole animal | Paw prints, feather, wing, spider web, nest, and plants |

The explicit pest policy retains butterfly, honeybee, lady beetle, beetle,
caterpillar, and snail. Spider, scorpion, cricket, and worm are also retained
as distinct whole-animal drawings; the policy does not exclude all invertebrates.

## Similarity representatives

| Kept | Excluded variant | Visual reason |
| --- | --- | --- |
| Two-hump camel | Single-hump camel | Same silhouette and palette apart from hump count |
| Mouse | Rat | Very similar small-rodent profile |
| Cow | Ox, water buffalo, bison | Repeated cattle silhouettes |
| Ewe | Ram | Woolly sheep differing mainly in horns |
| Cat | Black cat | Repeated cat profile |
| Dog | Service dog, guide dog, poodle | Repeated dog identity and accessory/coat variants |
| Rooster | Front-facing baby chick | Retain one unambiguous whole chicken identity |
| Bird | Black bird | Repeated generic bird profile |
| Spouting whale | Whale | Retain the established whale identity |

Goat/ewe, tiger/leopard, horse/donkey, and elephant/mammoth remain separate:
the four-library comparison showed distinct body silhouettes, palettes, or
coat patterns at the source-art level. This is a visual curation decision,
not a claim that the species are taxonomically interchangeable.

The existing hedgehog identity was removed because its Twemoji rendering does
not meet the whole-body standard. All other previously selected identities
retain their stable IDs. Upstream Bug remains app ID `caterpillar`.

## Accepted inventory

| Glyph | Stable ID | Animal |
| --- | --- | --- |
| 🐘 | `elephant` | elephant |
| 🦒 | `giraffe` | giraffe |
| 🐇 | `rabbit` | rabbit |
| 🐖 | `pig` | pig |
| 🐫 | `two_hump_camel` | two-hump camel |
| 🦘 | `kangaroo` | kangaroo |
| 🦨 | `skunk` | skunk |
| 🦇 | `bat` | bat |
| 🐧 | `penguin` | penguin |
| 🦉 | `owl` | owl |
| 🦆 | `duck` | duck |
| 🦩 | `flamingo` | flamingo |
| 🦚 | `peacock` | peacock |
| 🦜 | `parrot` | parrot |
| 🐢 | `turtle` | turtle |
| 🐍 | `snake` | snake |
| 🦕 | `sauropod` | sauropod |
| 🐉 | `dragon` | dragon |
| 🐳 | `spouting_whale` | spouting whale |
| 🐟 | `fish` | fish |
| 🐠 | `tropical_fish` | tropical fish |
| 🐡 | `blowfish` | blowfish |
| 🐙 | `octopus` | octopus |
| 🦑 | `squid` | squid |
| 🦀 | `crab` | crab |
| 🦞 | `lobster` | lobster |
| 🪼 | `jellyfish` | jellyfish |
| 🪸 | `coral` | coral |
| 🦪 | `oyster` | oyster |
| 🦋 | `butterfly` | butterfly |
| 🐝 | `honeybee` | honeybee |
| 🐞 | `lady_beetle` | lady beetle |
| 🪲 | `beetle` | beetle |
| 🐛 | `caterpillar` | bug |
| 🐌 | `snail` | snail |
| 🐁 | `mouse` | mouse |
| 🐄 | `cow` | cow |
| 🐅 | `tiger` | tiger |
| 🐆 | `leopard` | leopard |
| 🐈 | `cat` | cat |
| 🐊 | `crocodile` | crocodile |
| 🐎 | `horse` | horse |
| 🐐 | `goat` | goat |
| 🐑 | `ewe` | ewe |
| 🐒 | `monkey` | monkey |
| 🐓 | `rooster` | rooster |
| 🐕 | `dog` | dog |
| 🐦 | `bird` | bird |
| 🐦‍🔥 | `phoenix` | phoenix |
| 🐬 | `dolphin` | dolphin |
| 🐿️ | `chipmunk` | chipmunk |
| 🕊️ | `dove` | dove |
| 🕷️ | `spider` | spider |
| 🦂 | `scorpion` | scorpion |
| 🦃 | `turkey` | turkey |
| 🦅 | `eagle` | eagle |
| 🦈 | `shark` | shark |
| 🦎 | `lizard` | lizard |
| 🦐 | `shrimp` | shrimp |
| 🦖 | `t_rex` | T-Rex |
| 🦗 | `cricket` | cricket |
| 🦙 | `llama` | llama |
| 🦛 | `hippopotamus` | hippopotamus |
| 🦡 | `badger` | badger |
| 🦢 | `swan` | swan |
| 🦣 | `mammoth` | mammoth |
| 🦤 | `dodo` | dodo |
| 🦥 | `sloth` | sloth |
| 🦦 | `otter` | otter |
| 🦧 | `orangutan` | orangutan |
| 🦫 | `beaver` | beaver |
| 🦭 | `seal` | seal |
| 🪱 | `worm` | worm |
| 🪿 | `goose` | goose |
| 🫏 | `donkey` | donkey |

## Maintenance

Change the shared catalog only after repeating the four-library visual check
and considering the representative groups above. Regenerate the asset manifest,
remove retired local art, run the asset/session tests and production build,
and update counts in user and maintainer documentation. Source artwork remains
unmodified and retains the licences recorded in ASSETS and third-party notices.
