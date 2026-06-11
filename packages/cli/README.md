# @yusic/cli

## Usage

- Command:
  - Simple:
    ```bash
    bun src 5 "do re mi"
    ```
  - With options:
    ```bash
    bun src -s -5 -i ./samples/waltz-no-2.txt -o ./output/waltz-no-2-down5.txt --style sharp --overrides "10:flat"
    ```
    or
    ```bash
    cat ./samples/waltz-no-2.txt | bun src -s -5 --style sharp --overrides "10:flat"
    ```

- Pipe output to clipboard:
  - Mac:
    ```bash
    bun src -s -5 -i ./samples/waltz-no-2.txt | pbcopy
    ```
  - Windows:
    ```bash
    bun src -s -5 -i ./samples/waltz-no-2.txt | clip
    ```
  - Linux
    ```bash
    bun src -s -5 -i ./samples/waltz-no-2.txt | xclip -selection clipboard
    ```
