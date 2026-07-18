# Agent guidelines

Rules for work in this repo. Prefer these over default habits unless the user says otherwise.

## Prefer little code

When planning or implementing, meet the acceptance criteria in as little code as possible. Avoid speculative abstractions, extra layers, and “just in case” structure.

## Keep code simple

Favor straightforward, readable changes. Do not over-engineer. Match existing patterns in the project you are editing.

## No unit tests by default

Do not add unit tests unless the user asks for them.

## No backwards compatibility by default

Do not preserve backwards compatibility unless the user asks for it. Prefer the cleanest current solution over compatibility shims.

## Prefer terminal for file ops

When interacting with files, prefer terminal commands over editing files directly when possible (saves tokens). Example: use `mv` instead of writing the file in the new location and removing the old one.

## Scene colocation

Keep scene-specific assets, entities, combat, UI, config, tests, and helpers in `scenes/<scene>/`. Move code to the closest shared parent only when multiple scenes use it. Do not import another scene’s private files; promote shared code first.
