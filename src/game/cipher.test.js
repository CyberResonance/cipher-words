import { describe, it, expect } from 'vitest'
import { rng, makeKey, encrypt, makePuzzle, frequency, setGuess, isSolved, mistakes, hint, render, dailySeed, ALPHABET } from './cipher.js'
import { PHRASES } from './phrases.js'

describe('key and encryption', () => {
  it('key is a derangement of the alphabet', () => {
    for (let s = 1; s < 50; s++) {
      const k = makeKey(rng(s))
      expect(new Set(Object.values(k)).size).toBe(26)
      for (const p of ALPHABET) expect(k[p]).not.toBe(p)
    }
  })
  it('encrypt keeps spaces and punctuation, and decrypts back', () => {
    const k = makeKey(rng(7))
    const c = encrypt('Hello, world!', k)
    expect(c).toMatch(/^[A-Z]{5}, [A-Z]{5}!$/)
    const inv = Object.fromEntries(Object.entries(k).map(([p, x]) => [x, p]))
    expect(c.replace(/[A-Z]/g, x => inv[x])).toBe('HELLO, WORLD!')
  })
  it('every phrase only uses plain ASCII letters and punctuation', () => {
    for (const p of PHRASES) expect(p.text).toMatch(/^[A-Za-z ,.'!?-]+$/)
  })
})

describe('puzzle', () => {
  it('is deterministic per seed and difficulty', () => {
    expect(makePuzzle(123, 'hard')).toEqual(makePuzzle(123, 'hard'))
  })
  it('daily seed is the date as a number', () => {
    expect(dailySeed(new Date(2026, 9, 28))).toBe(20261028)
  })
  it('reveals the most frequent letters by difficulty', () => {
    const p = makePuzzle(5, 'easy')
    expect(Object.keys(p.given)).toHaveLength(3)
    expect(Object.keys(p.given)).toEqual(frequency(p.cipher).slice(0, 3).map(f => f.letter))
    expect(Object.keys(makePuzzle(5, 'hard').given)).toHaveLength(0)
  })
  it('solution decodes the cipher to the plain text', () => {
    const p = makePuzzle(99, 'normal')
    expect(p.cipher.replace(/[A-Z]/g, c => p.solution[c])).toBe(p.plain)
  })
  it('rejects unknown difficulty', () => {
    expect(() => makePuzzle(1, 'expert')).toThrow()
  })
})

describe('guesses', () => {
  const p = makePuzzle(42, 'hard')
  const letters = Object.keys(p.solution)
  it('a plain letter moves when used again', () => {
    let g = setGuess(p, {}, letters[0], 'e')
    g = setGuess(p, g, letters[1], 'E')
    expect(g).toEqual({ [letters[1]]: 'E' })
  })
  it('clearing removes a guess', () => {
    expect(setGuess(p, { [letters[0]]: 'A' }, letters[0], '')).toEqual({})
  })
  it('given letters are locked', () => {
    const e = makePuzzle(42, 'easy')
    const locked = Object.keys(e.given)[0]
    expect(setGuess(e, {}, locked, 'Z')).toEqual({})
  })
  it('detects mistakes and the solved state', () => {
    const wrong = { [letters[0]]: p.solution[letters[0]] === 'Q' ? 'Z' : 'Q' }
    expect(mistakes(p, wrong)).toEqual([letters[0]])
    expect(isSolved(p, wrong)).toBe(false)
    expect(isSolved(p, { ...p.solution })).toBe(true)
  })
  it('hints fix the most frequent unsolved letter until solved', () => {
    let g = {}
    for (let i = 0; i < letters.length; i++) { const h = hint(p, g); g = h.guesses }
    expect(isSolved(p, g)).toBe(true)
    expect(hint(p, g)).toBe(null)
  })
  it('render shows underscores for unknown letters', () => {
    expect(render(p, {})).toBe(p.plain.replace(/[A-Z]/g, '_'))
    expect(render(p, { ...p.solution })).toBe(p.plain)
  })
})
