# Cipher Words

A word puzzle about breaking codes. Each puzzle is a short message where **every letter has been swapped for another letter**, and you work out the key.
The messages are short security tips written for this game, plus classic proverbs.

## How to play

1. Click a letter in the puzzle. Every place that uses the same cipher letter lights up.
2. Type your guess with the keyboard or the on-screen letters. The guess fills every matching spot.
3. Each plain letter can be used only once, so reusing a letter moves it to the new spot.
4. Use the tools when you're stuck:
   - **Check** marks the wrong guesses;
   - **Hint** reveals the most common unsolved letter;
   - the frequency panel shows letter counts (E, T, A, O and I are the most common letters in English).

## Features

- **Daily puzzle:** the same puzzle for everyone on a given date, with a streak counter.
- **Random puzzles:** unlimited.
- **Three difficulties:**

  | Difficulty | Letters given | Hints |
  |---|---|---|
  | Easy | 3 most frequent | 5 |
  | Normal | 1 | 3 |
  | Hard | none | 1 |

- **No letter maps to itself:** the cipher key is always a derangement, as in classic cryptograms.
- **Controls:** arrow keys move between letters and Backspace clears. Works on phones with the on-screen keyboard.
- **Saved in your browser:** stats and difficulty. Nothing is sent anywhere.

## Getting started

Requires Node.js 18 or newer.

```bash
npm install
npm run dev
```

Build a static version that you can host anywhere:

```bash
npm run build
```

## Tests

```bash
npm test
```

14 Vitest tests cover:
- the derangement key;
- encryption round trips;
- phrase character checks;
- per-seed determinism and the daily seed;
- given letters per difficulty;
- solution correctness;
- the guess rules (moving, clearing, locked letters);
- mistake detection, hints solving the whole puzzle, and rendering.

## Project structure

| File | Role |
|---|---|
| `src/game/cipher.js` | puzzle engine (pure functions) |
| `src/game/phrases.js` | message list (original security tips and traditional proverbs) |
| `src/App.jsx` | game UI |

## License

MIT, see [LICENSE](LICENSE). Built by [CyberResonance](https://cyberresonance.io).
