#!/bin/sh

bunx skills experimental_install

for src in .github; do
  skills_dir="$src/skills"
  mkdir -p "$skills_dir"
  for dir in .agents/skills/*; do
    dst="$skills_dir/$(basename "$dir")"
    src="../../.agents/skills/$(basename "$dir")"
    [ -d "$dir" ] && ln -sfn "$src" "$dst"
  done
done