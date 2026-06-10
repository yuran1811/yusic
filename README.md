# yusic

## Usage

- Command:

```bash
bun src 5 "do re mi"

# From file
bun src \
  -s -5 \
  -i ./samples/waltz-no-2.txt \
  -o ./output/waltz-no-2-down5.txt \
  --style sharp --overrides "10:flat"
# or
cat ./samples/waltz-no-2.txt | bun src -s -5 --style sharp --overrides "10:flat"
```

- Pipe output to clipboard:

```bash
# Mac
bun src -s -5 -i ./samples/waltz-no-2.txt | pbcopy

# Windows
bun src -s -5 -i ./samples/waltz-no-2.txt | clip

# Linux
bun src -s -5 -i ./samples/waltz-no-2.txt | xclip -selection clipboard
```
