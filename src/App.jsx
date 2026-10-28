import { useCallback, useEffect, useMemo, useState } from 'react'
import { ALPHABET, makePuzzle, dailySeed, setGuess, merged, isSolved, mistakes, hint, frequency } from './game/cipher.js'

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v) } catch { return d } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* storage unavailable */ } },
}
const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

function newGame(mode, difficulty) {
  const seed = mode === 'daily' ? dailySeed() : Math.floor(Math.random() * 1e9)
  const puzzle = makePuzzle(seed, difficulty)
  return { mode, puzzle, guesses: {}, hintsLeft: puzzle.hints, checked: [], started: Date.now(), done: null, gaveUp: false }
}

export default function App() {
  const [difficulty, setDifficulty] = useState(store.get('cw.diff', 'normal'))
  const [game, setGame] = useState(() => newGame('daily', store.get('cw.diff', 'normal')))
  const [sel, setSel] = useState(null)
  const [now, setNow] = useState(Date.now())
  const { puzzle, guesses } = game
  const all = merged(puzzle, guesses)
  const cipherLetters = useMemo(() => [...new Set(puzzle.cipher.replace(/[^A-Z]/g, ''))], [puzzle])
  // Words as lists of { ch, i } where i is the index in the full cipher string (used for selection and arrow keys).
  const words = useMemo(() => {
    const out = [[]]
    puzzle.cipher.split('').forEach((ch, i) => { if (ch === ' ') out.push([]); else out.at(-1).push({ ch, i }) })
    return out
  }, [puzzle])
  const used = new Set(Object.values(all))
  const elapsed = Math.round(((game.done || now) - game.started) / 1000)

  useEffect(() => { if (game.done) return; const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [game.done])

  const finish = useCallback((g) => {
    const solved = isSolved(g.puzzle, g.guesses)
    if (!solved) return g
    const done = { ...g, done: Date.now() }
    if (g.mode === 'daily' && !g.gaveUp) {
      const s = store.get('cw.stats', { streak: 0, best: 0, last: 0, solved: 0 })
      const today = g.puzzle.seed
      if (s.last !== today) {
        const y = new Date(); y.setDate(y.getDate() - 1)
        s.streak = s.last === dailySeed(y) ? s.streak + 1 : 1
        s.best = Math.max(s.best, s.streak); s.last = today; s.solved++
        store.set('cw.stats', s)
      }
    }
    return done
  }, [])

  const guess = useCallback((c, p) => {
    setGame(g => g.done ? g : finish({ ...g, guesses: setGuess(g.puzzle, g.guesses, c, p), checked: g.checked.filter(x => x !== c) }))
  }, [finish])

  const move = useCallback((dir) => {
    const order = puzzle.cipher.split('').map((ch, i) => ({ ch, i })).filter(x => x.ch >= 'A' && x.ch <= 'Z' && !puzzle.given[x.ch])
    if (!order.length) return
    const idx = sel ? order.findIndex(x => x.i === sel.i) : -1
    let n = idx
    for (let k = 0; k < order.length; k++) {
      n = (n + dir + order.length) % order.length
      if (dir > 0 ? !all[order[n].ch] : true) break
    }
    setSel(order[n])
  }, [puzzle, sel, all])

  useEffect(() => {
    const onKey = (e) => {
      if (!sel || game.done || e.ctrlKey || e.metaKey || e.altKey) return
      const k = e.key.toUpperCase()
      if (k.length === 1 && k >= 'A' && k <= 'Z') { e.preventDefault(); guess(sel.ch, k); move(1) }
      else if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); guess(sel.ch, '') }
      else if (e.key === 'ArrowRight') { e.preventDefault(); move(1) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); move(-1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sel, game.done, guess, move])

  function start(mode, diff = difficulty) { store.set('cw.diff', diff); setDifficulty(diff); setGame(newGame(mode, diff)); setSel(null) }
  function useHint() {
    if (!game.hintsLeft || game.done) return
    const h = hint(puzzle, guesses)
    if (h) setGame(g => finish({ ...g, guesses: h.guesses, hintsLeft: g.hintsLeft - 1, checked: [] }))
  }
  function check() { setGame(g => ({ ...g, checked: mistakes(g.puzzle, g.guesses) })) }
  function giveUp() { setGame(g => ({ ...g, guesses: { ...g.puzzle.solution }, gaveUp: true, done: Date.now() })) }

  const stats = store.get('cw.stats', { streak: 0, best: 0, solved: 0 })
  return (
    <main>
      <header>
        <h1>Cipher <span>Words</span></h1>
        <p className="muted">Every letter stands for another letter. Crack the substitution and reveal the message.</p>
      </header>

      <section className="bar card">
        <div className="row">
          <button className={game.mode === 'daily' ? 'on' : ''} onClick={() => start('daily')}>Daily</button>
          <button className={game.mode === 'random' ? 'on' : ''} onClick={() => start('random')}>New random</button>
          <select value={difficulty} onChange={e => start(game.mode, e.target.value)} aria-label="Difficulty">
            <option value="easy">Easy (3 letters given)</option>
            <option value="normal">Normal (1 letter given)</option>
            <option value="hard">Hard (no letters given)</option>
          </select>
        </div>
        <div className="row stats">
          <span>⏱ {fmt(elapsed)}</span>
          <span>Hints {game.hintsLeft}</span>
          <span>Streak {stats.streak} (best {stats.best})</span>
        </div>
      </section>

      <section className="card puzzle" aria-label="Puzzle">
        {words.map((w, wi) => (
          <span className="word" key={wi}>
            {w.map(({ ch, i }) => {
              const letter = ch >= 'A' && ch <= 'Z'
              if (!letter) return <span key={i} className="punct">{ch}</span>
              const given = !!puzzle.given[ch]
              const cls = ['cell', given && 'given', sel?.ch === ch && 'same', sel?.i === i && 'active',
                game.checked.includes(ch) && 'wrong', game.gaveUp && 'reveal'].filter(Boolean).join(' ')
              return (
                <button key={i} className={cls} onClick={() => !given && !game.done && setSel({ ch, i })} aria-label={`Cipher ${ch}, guess ${all[ch] || 'empty'}`}>
                  <b>{all[ch] || ''}</b><small>{ch}</small>
                </button>
              )
            })}
          </span>
        ))}
      </section>

      {game.done ? (
        <section className="card win">
          <h2>{game.gaveUp ? 'Solution revealed' : 'Solved!'}</h2>
          <p className="quote">“{puzzle.text}” <span className="muted">— {puzzle.source}</span></p>
          {!game.gaveUp && <p>Time {fmt(elapsed)} · hints used {puzzle.hints - game.hintsLeft}</p>}
          <div className="row"><button onClick={() => start('random')}>Next puzzle</button></div>
        </section>
      ) : (
        <>
          <section className="card keys" aria-label="Letter keyboard">
            {ALPHABET.split('').map(k => (
              <button key={k} disabled={!sel} className={used.has(k) ? 'used' : ''} onClick={() => { guess(sel.ch, k); move(1) }}>{k}</button>
            ))}
            <button className="wide" disabled={!sel} onClick={() => sel && guess(sel.ch, '')}>⌫</button>
          </section>
          <section className="row actions">
            <button onClick={useHint} disabled={!game.hintsLeft}>Hint</button>
            <button onClick={check}>Check</button>
            <button className="ghost" onClick={giveUp}>Give up</button>
            {game.checked.length > 0 && <span className="error">{game.checked.length} wrong letter(s) marked</span>}
            {game.checked.length === 0 && Object.keys(guesses).length > 0 && <span className="muted">Click Check to mark wrong letters.</span>}
          </section>
          <details className="card freq">
            <summary>Letter frequency</summary>
            <p className="muted">In English, E, T, A, O and I are the most common letters.</p>
            <div className="freq-grid">
              {frequency(puzzle.cipher).map(f => <span key={f.letter}><b>{f.letter}</b> {f.count}{all[f.letter] ? ` → ${all[f.letter]}` : ''}</span>)}
            </div>
          </details>
        </>
      )}
      <footer className="muted">{cipherLetters.length} different letters · Built by <a href="https://cyberresonance.io" target="_blank" rel="noreferrer">CyberResonance</a>.</footer>
    </main>
  )
}
