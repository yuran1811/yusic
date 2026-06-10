# yusic

## Usage

- Command:

```bash
node cli.js 5 "do re mi"
```

- Pipe output to clipboard:

```bash
# Mac
node transpose.js 2 song.txt | pbcopy

# Windows
node transpose.js 2 song.txt | clip

# Linux
node transpose.js 2 song.txt | xclip -selection clipboard
```
