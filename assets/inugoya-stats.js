(() => {
  'use strict';

  const STORAGE_KEY = 'inugoyaMiniGameStatsV1';
  const VERSION = 1;
  const DIFFICULTIES = ['easy', 'normal', 'hard'];
  const DIFFICULTY_LABELS = { easy: 'やさしい', normal: 'ふつう', hard: 'むずかしい' };
  const GAME_ORDER = ['othello', 'chess', 'shogi', 'tailDefense', 'rhythm'];
  const GAMES = {
    othello: { name: '犬小屋オセロ', icon: '⚫', kind: 'match' },
    chess: { name: '犬小屋チェス', icon: '♟️', kind: 'match' },
    shogi: { name: '犬小屋将棋', icon: '☗', kind: 'match' },
    tailDefense: { name: 'しっぽ防衛戦', icon: '🐕', kind: 'match', scoreLabel: '最高点' },
    rhythm: { name: 'ぽくぽくリズム', icon: '🥁', kind: 'score', scoreLabel: '最高点' }
  };

  function emptyDifficulty() {
    return { plays: 0, wins: 0, losses: 0, draws: 0 };
  }

  function emptyGame() {
    return {
      plays: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      bestScore: null,
      lastScore: null,
      currentStreak: 0,
      bestStreak: 0,
      lastDifficulty: null,
      difficulties: Object.fromEntries(DIFFICULTIES.map(level => [level, emptyDifficulty()])),
      lastResult: null,
      updatedAt: null
    };
  }

  function createDefaultData() {
    return {
      version: VERSION,
      totals: { plays: 0, wins: 0, losses: 0, draws: 0 },
      games: Object.fromEntries(GAME_ORDER.map(id => [id, emptyGame()])),
      events: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  function finiteNumber(value, fallback = 0) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function normalizeDifficulty(value = {}) {
    return {
      plays: Math.max(0, finiteNumber(value.plays)),
      wins: Math.max(0, finiteNumber(value.wins)),
      losses: Math.max(0, finiteNumber(value.losses)),
      draws: Math.max(0, finiteNumber(value.draws))
    };
  }

  function normalizeGame(value = {}) {
    const game = emptyGame();
    game.plays = Math.max(0, finiteNumber(value.plays));
    game.wins = Math.max(0, finiteNumber(value.wins));
    game.losses = Math.max(0, finiteNumber(value.losses));
    game.draws = Math.max(0, finiteNumber(value.draws));
    game.bestScore = Number.isFinite(Number(value.bestScore)) ? Number(value.bestScore) : null;
    game.lastScore = Number.isFinite(Number(value.lastScore)) ? Number(value.lastScore) : null;
    game.currentStreak = Math.max(0, finiteNumber(value.currentStreak));
    game.bestStreak = Math.max(game.currentStreak, finiteNumber(value.bestStreak));
    game.lastDifficulty = DIFFICULTIES.includes(value.lastDifficulty) ? value.lastDifficulty : null;
    game.lastResult = typeof value.lastResult === 'string' ? value.lastResult : null;
    game.updatedAt = typeof value.updatedAt === 'string' ? value.updatedAt : null;
    game.difficulties = Object.fromEntries(DIFFICULTIES.map(level => [level, normalizeDifficulty(value.difficulties?.[level])]));
    return game;
  }

  function normalizeData(value) {
    const data = createDefaultData();
    if (!value || typeof value !== 'object') return data;
    data.createdAt = typeof value.createdAt === 'string' ? value.createdAt : data.createdAt;
    data.updatedAt = typeof value.updatedAt === 'string' ? value.updatedAt : data.updatedAt;
    data.games = Object.fromEntries(GAME_ORDER.map(id => [id, normalizeGame(value.games?.[id])]));
    data.totals = {
      plays: GAME_ORDER.reduce((sum, id) => sum + data.games[id].plays, 0),
      wins: GAME_ORDER.reduce((sum, id) => sum + data.games[id].wins, 0),
      losses: GAME_ORDER.reduce((sum, id) => sum + data.games[id].losses, 0),
      draws: GAME_ORDER.reduce((sum, id) => sum + data.games[id].draws, 0)
    };
    data.events = Array.isArray(value.events)
      ? value.events.filter(event => event && GAME_ORDER.includes(event.gameId)).slice(0, 30)
      : [];
    return data;
  }

  function load() {
    try {
      return normalizeData(JSON.parse(localStorage.getItem(STORAGE_KEY)));
    } catch (error) {
      console.warn('犬小屋戦績帳の読み込みに失敗しました。', error);
      return createDefaultData();
    }
  }

  function save(data) {
    data.version = VERSION;
    data.updatedAt = new Date().toISOString();
    data.totals = {
      plays: GAME_ORDER.reduce((sum, id) => sum + data.games[id].plays, 0),
      wins: GAME_ORDER.reduce((sum, id) => sum + data.games[id].wins, 0),
      losses: GAME_ORDER.reduce((sum, id) => sum + data.games[id].losses, 0),
      draws: GAME_ORDER.reduce((sum, id) => sum + data.games[id].draws, 0)
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('犬小屋戦績帳の保存に失敗しました。', error);
    }
    window.dispatchEvent(new CustomEvent('inugoya-stats-updated', { detail: data }));
    renderLedger();
    return data;
  }

  function scoreDetail(options = {}) {
    if (typeof options.detail === 'string' && options.detail.trim()) return options.detail.trim();
    if (Number.isFinite(Number(options.playerScore)) && Number.isFinite(Number(options.shuuScore))) {
      return `${Number(options.playerScore)}対${Number(options.shuuScore)}`;
    }
    if (Number.isFinite(Number(options.score))) return `スコア${Number(options.score)}`;
    return '';
  }

  function addEvent(data, gameId, outcome, options = {}) {
    const meta = GAMES[gameId];
    const difficulty = DIFFICULTIES.includes(options.difficulty) ? options.difficulty : null;
    const label = outcome === 'win'
      ? '直美の勝ち'
      : outcome === 'loss'
        ? 'シュウの勝ち'
        : outcome === 'draw'
          ? '引き分け'
          : '記録更新';
    data.events.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      gameId,
      gameName: meta.name,
      outcome,
      label,
      difficulty,
      detail: scoreDetail(options),
      score: Number.isFinite(Number(options.score)) ? Number(options.score) : null,
      at: new Date().toISOString()
    });
    data.events = data.events.slice(0, 30);
  }

  function updateScore(game, options = {}) {
    if (!Number.isFinite(Number(options.score))) return;
    const score = Number(options.score);
    game.lastScore = score;
    game.bestScore = game.bestScore === null ? score : Math.max(game.bestScore, score);
  }

  function recordMatch(gameId, outcome, options = {}) {
    if (!GAMES[gameId]) return load();
    if (!['win', 'loss', 'draw'].includes(outcome)) return load();
    const data = load();
    const game = data.games[gameId];
    game.plays += 1;
    game[outcome === 'win' ? 'wins' : outcome === 'loss' ? 'losses' : 'draws'] += 1;
    game.currentStreak = outcome === 'win' ? game.currentStreak + 1 : 0;
    game.bestStreak = Math.max(game.bestStreak, game.currentStreak);
    game.lastResult = outcome;
    game.updatedAt = new Date().toISOString();
    updateScore(game, options);

    if (DIFFICULTIES.includes(options.difficulty)) {
      game.lastDifficulty = options.difficulty;
      const difficulty = game.difficulties[options.difficulty];
      difficulty.plays += 1;
      difficulty[outcome === 'win' ? 'wins' : outcome === 'loss' ? 'losses' : 'draws'] += 1;
    }

    addEvent(data, gameId, outcome, options);
    return save(data);
  }

  function recordScore(gameId, score, options = {}) {
    if (!GAMES[gameId] || !Number.isFinite(Number(score))) return load();
    const data = load();
    const game = data.games[gameId];
    game.plays += 1;
    game.lastResult = 'score';
    game.updatedAt = new Date().toISOString();
    updateScore(game, { ...options, score: Number(score) });
    if (DIFFICULTIES.includes(options.difficulty)) {
      game.lastDifficulty = options.difficulty;
      game.difficulties[options.difficulty].plays += 1;
    }
    addEvent(data, gameId, 'score', { ...options, score: Number(score) });
    return save(data);
  }

  function reset() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('犬小屋戦績帳のリセットに失敗しました。', error);
    }
    const data = createDefaultData();
    window.dispatchEvent(new CustomEvent('inugoya-stats-updated', { detail: data }));
    renderLedger();
    return data;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('ja-JP', {
      month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(date);
  }

  function difficultyMarks(game) {
    return DIFFICULTIES.map(level => {
      const won = game.difficulties[level]?.wins > 0;
      const icon = level === 'easy' ? '🌱' : level === 'normal' ? '🐾' : '🔥';
      return `<span class="inugoya-ledger-difficulty ${won ? 'cleared' : ''}" title="${DIFFICULTY_LABELS[level]}">${icon}${won ? '✓' : '—'}</span>`;
    }).join('');
  }

  function gameSummary(id, game) {
    if (!game.plays) return '<span class="inugoya-ledger-empty">まだ記録なし</span>';
    if (id === 'rhythm') {
      return `プレイ <b>${game.plays}</b>回 / 最高 <b>${game.bestScore ?? 0}</b>`;
    }
    if (id === 'tailDefense') {
      return `防衛 <b>${game.wins}</b>回 / 失敗 <b>${game.losses}</b>回 / 最高 <b>${game.bestScore ?? 0}</b>`;
    }
    return `直美 <b>${game.wins}</b>勝 / シュウ <b>${game.losses}</b>勝 / 引分 <b>${game.draws}</b>`;
  }

  function achievementList(data) {
    const games = data.games;
    const achievements = [
      { icon: '🐾', name: 'はじめの一勝', unlocked: data.totals.wins >= 1 },
      { icon: '🔥', name: '三連勝', unlocked: GAME_ORDER.some(id => games[id].bestStreak >= 3) },
      { icon: '🏆', name: '盤上三冠', unlocked: ['othello', 'chess', 'shogi'].every(id => games[id].wins >= 1) },
      { icon: '🌈', name: '難易度制覇', unlocked: GAME_ORDER.some(id => DIFFICULTIES.every(level => games[id].difficulties[level]?.wins >= 1)) },
      { icon: '🛡️', name: 'しっぽ警備主任', unlocked: (games.tailDefense.bestScore ?? 0) >= 180 },
      { icon: '🥁', name: 'ぽくぽく名人', unlocked: (games.rhythm.bestScore ?? 0) >= 150 }
    ];
    return achievements.map(item => `<span class="inugoya-ledger-badge ${item.unlocked ? 'unlocked' : ''}">${item.icon} ${escapeHtml(item.name)}</span>`).join('');
  }

  function installStyles() {
    if (document.getElementById('inugoyaLedgerStyles')) return;
    const style = document.createElement('style');
    style.id = 'inugoyaLedgerStyles';
    style.textContent = `
      .inugoya-ledger{margin:12px 0 16px;padding:13px;border-radius:19px;background:linear-gradient(155deg,rgba(255,248,236,.09),rgba(255,184,107,.08));border:1px solid rgba(255,240,187,.16);display:grid;gap:11px}
      .inugoya-ledger-head{display:flex;justify-content:space-between;gap:10px;align-items:center}
      .inugoya-ledger-title{font-weight:1000;color:#fff0c8}.inugoya-ledger-sub{font-size:.68rem;color:var(--muted,#d7c7bb)}
      .inugoya-ledger-totals{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
      .inugoya-ledger-total{padding:8px 4px;border-radius:12px;background:rgba(255,255,255,.065);text-align:center;font-size:.62rem;color:var(--muted,#d7c7bb)}
      .inugoya-ledger-total b{display:block;margin-top:2px;font-size:.96rem;color:#fff8ec}
      .inugoya-ledger-games{display:grid;gap:7px}.inugoya-ledger-game{padding:9px 10px;border-radius:14px;background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.07)}
      .inugoya-ledger-game-head{display:flex;justify-content:space-between;gap:8px;align-items:center}.inugoya-ledger-game-name{font-weight:950;font-size:.8rem}.inugoya-ledger-game-data{margin-top:4px;font-size:.69rem;color:var(--muted,#d7c7bb);line-height:1.5}
      .inugoya-ledger-difficulties{display:flex;gap:4px}.inugoya-ledger-difficulty{padding:2px 5px;border-radius:999px;background:rgba(255,255,255,.06);font-size:.62rem;opacity:.52}.inugoya-ledger-difficulty.cleared{opacity:1;background:rgba(157,243,196,.14);color:#bff8d7}
      .inugoya-ledger-empty{opacity:.7}.inugoya-ledger-achievements{display:flex;gap:5px;flex-wrap:wrap}.inugoya-ledger-badge{padding:4px 7px;border-radius:999px;background:rgba(255,255,255,.05);font-size:.62rem;opacity:.42}.inugoya-ledger-badge.unlocked{opacity:1;background:rgba(255,211,110,.14);color:#fff0bb;border:1px solid rgba(255,211,110,.18)}
      .inugoya-ledger-events{display:grid;gap:5px}.inugoya-ledger-event{padding:7px 8px;border-radius:11px;background:rgba(12,9,18,.22);font-size:.66rem;line-height:1.45;color:var(--muted,#d7c7bb)}.inugoya-ledger-event b{color:#fff2cf}.inugoya-ledger-time{float:right;opacity:.65;font-size:.58rem}
      .inugoya-ledger-reset{width:100%;min-height:38px!important;padding:7px 10px!important;border-radius:13px!important;font-size:.7rem!important;box-shadow:none!important}
      @media(max-width:380px){.inugoya-ledger-totals{grid-template-columns:repeat(2,1fr)}}
    `;
    document.head.appendChild(style);
  }

  function renderLedger() {
    const host = document.querySelector('#miniGameView .mini-menu');
    if (!host) return;
    installStyles();
    let ledger = document.getElementById('inugoyaStatsLedger');
    if (!ledger) {
      ledger = document.createElement('section');
      ledger.id = 'inugoyaStatsLedger';
      ledger.className = 'inugoya-ledger';
      const title = host.querySelector('.section-title');
      if (title?.nextSibling) host.insertBefore(ledger, title.nextSibling);
      else host.prepend(ledger);
    }

    const data = load();
    const rows = GAME_ORDER.map(id => {
      const meta = GAMES[id];
      const game = data.games[id];
      const showDifficulty = ['othello', 'chess', 'shogi'].includes(id);
      return `<div class="inugoya-ledger-game">
        <div class="inugoya-ledger-game-head"><span class="inugoya-ledger-game-name">${meta.icon} ${escapeHtml(meta.name)}</span>${showDifficulty ? `<span class="inugoya-ledger-difficulties">${difficultyMarks(game)}</span>` : ''}</div>
        <div class="inugoya-ledger-game-data">${gameSummary(id, game)}</div>
      </div>`;
    }).join('');

    const events = data.events.length
      ? data.events.slice(0, 3).map(event => {
          const difficulty = event.difficulty ? `・${DIFFICULTY_LABELS[event.difficulty]}` : '';
          const detail = event.detail ? ` / ${escapeHtml(event.detail)}` : '';
          return `<div class="inugoya-ledger-event"><span class="inugoya-ledger-time">${escapeHtml(formatDate(event.at))}</span><b>${escapeHtml(event.gameName)}</b>：${escapeHtml(event.label)}${difficulty}${detail}</div>`;
        }).join('')
      : '<div class="inugoya-ledger-event">次の対局・防衛・ぽくぽくから記録が始まるよ。</div>';

    ledger.innerHTML = `
      <div class="inugoya-ledger-head"><div><div class="inugoya-ledger-title">📖 犬小屋戦績帳</div><div class="inugoya-ledger-sub">端末内に自動保存・最近3件を表示</div></div><div class="inugoya-ledger-sub">${data.totals.plays}記録</div></div>
      <div class="inugoya-ledger-totals">
        <div class="inugoya-ledger-total">プレイ<b>${data.totals.plays}</b></div>
        <div class="inugoya-ledger-total">直美の勝ち<b>${data.totals.wins}</b></div>
        <div class="inugoya-ledger-total">シュウの勝ち<b>${data.totals.losses}</b></div>
        <div class="inugoya-ledger-total">引き分け<b>${data.totals.draws}</b></div>
      </div>
      <div class="inugoya-ledger-games">${rows}</div>
      <div class="inugoya-ledger-achievements">${achievementList(data)}</div>
      <div class="inugoya-ledger-events">${events}</div>
      <button type="button" class="secondary inugoya-ledger-reset" id="inugoyaStatsReset">戦績帳だけリセット</button>
    `;

    ledger.querySelector('#inugoyaStatsReset')?.addEventListener('click', () => {
      if (window.confirm('犬小屋戦績帳の記録だけをリセットしますか？ ゲーム本編のセーブは消えません。')) reset();
    });
  }

  window.InugoyaStats = Object.freeze({
    key: STORAGE_KEY,
    games: GAMES,
    getData: load,
    recordMatch,
    recordScore,
    reset,
    render: renderLedger
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderLedger, { once: true });
  else renderLedger();
  window.addEventListener('pageshow', renderLedger);
  window.addEventListener('storage', event => { if (event.key === STORAGE_KEY) renderLedger(); });
})();
