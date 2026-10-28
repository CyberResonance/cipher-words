// Substitution-cipher puzzles: seeded keys, encryption, guesses, checking and hints. Pure functions.
import { PHRASES } from './phrases.js'

export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
export const DIFFICULTY = { easy: { reveal: 3, hints: 5 }, normal: { reveal: 1, hints: 3 }, hard: { reveal: 0, hints: 1 } }

export function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Random derangement: plain letter -> cipher letter, no letter maps to itself. */
export function makeKey(rand) {
  for (;;) {
    const a = ALPHABET.split('')
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
    if (a.every((c, i) => c !== ALPHABET[i])) return Object.fromEntries(ALPHABET.split('').map((p, i) => [p, a[i]]))
  }
}

export function encrypt(text, key) {
  return text.toUpperCase().replace(/[A-Z]/g, c => key[c])
}

export function dailySeed(date = new Date()) {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()
}

/** Build a puzzle. `solution` maps cipher letter -> plain letter for letters that appear. */
export function makePuzzle(seed, difficulty = 'normal') {
  const d = DIFFICULTY[difficulty]
  if (!d) throw new Error(`Unknown difficulty: ${difficulty}`)
  const rand = rng(seed)
  const phrase = PHRASES[Math.floor(rand() * PHRASES.length)]
  const key = makeKey(rand)
  const cipher = encrypt(phrase.text, key)
  const solution = {}
  for (const [p, c] of Object.entries(key)) if (cipher.includes(c)) solution[c] = p
  const byFreq = frequency(cipher).map(f => f.letter)
  const given = {}
  for (const c of byFreq.slice(0, d.reveal)) given[c] = solution[c]
  return { seed, difficulty, cipher, plain: phrase.text.toUpperCase(), text: phrase.text, source: phrase.source, solution, given, hints: d.hints }
}

export function frequency(cipher) {
  const n = {}
  for (const ch of cipher) if (ch >= 'A' && ch <= 'Z') n[ch] = (n[ch] || 0) + 1
  return Object.entries(n).map(([letter, count]) => ({ letter, count })).sort((a, b) => b.count - a.count || a.letter.localeCompare(b.letter))
}

/** Set a guess for cipher letter `c`. A plain letter can only be used once, so it moves away from any other cipher letter. Given letters are locked. */
export function setGuess(puzzle, guesses, c, p) {
  if (puzzle.given[c]) return guesses
  const next = { ...guesses }
  if (!p) { delete next[c]; return next }
  p = p.toUpperCase()
  for (const [k, v] of Object.entries(next)) if (v === p && !puzzle.given[k]) delete next[k]
  next[c] = p
  return next
}

export const merged = (puzzle, guesses) => ({ ...guesses, ...puzzle.given })

export function isSolved(puzzle, guesses) {
  const g = merged(puzzle, guesses)
  return Object.entries(puzzle.solution).every(([c, p]) => g[c] === p)
}

/** Cipher letters whose current guess is wrong. */
export function mistakes(puzzle, guesses) {
  return Object.entries(guesses).filter(([c, p]) => !puzzle.given[c] && puzzle.solution[c] !== p).map(([c]) => c)
}

/** Reveal the most frequent cipher letter that is still unsolved or wrong. Returns the new guesses or null if nothing is left. */
export function hint(puzzle, guesses) {
  const g = merged(puzzle, guesses)
  const target = frequency(puzzle.cipher).map(f => f.letter).find(c => g[c] !== puzzle.solution[c])
  if (!target) return null
  return { guesses: setGuess(puzzle, guesses, target, puzzle.solution[target]), letter: target }
}

/** Plain text as the player currently sees it ("_" for unknown letters). */
export function render(puzzle, guesses) {
  const g = merged(puzzle, guesses)
  return puzzle.cipher.replace(/[A-Z]/g, c => g[c] || '_')
}
