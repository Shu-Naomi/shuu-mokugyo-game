(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ShuVillageFishCards = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const harborCards = { aji: 3, bora: 4, suzuki: 5 };
  const loanerHand = Object.entries(harborCards).map(([species, strength]) => ({ species, strength }));
  const challenges = [
    { id: 'harbor-lead', title: 'ボラでリードを守れ', score: [3, 1], hand: ['bora'] },
    { id: 'harbor-tie', title: '同点から勝ち越せ', score: [2, 2], hand: ['bora', 'suzuki'] },
  ];
  const tackleNames = { none: '仕掛けなし', net: '大物網', chum: '撒き餌' };
  const tackleHints = {
    none: '魚札の強さで勝負する。',
    net: '相手の方が強いとき、相手の強さを3下げる。',
    chum: '自分の魚札の強さを2上げる。',
  };

  function resolveRound({ playerBase, rivalBase, tackle, rivalTackle, playerScore, rivalScore }) {
    const playerBeforeNet = playerBase + (tackle === 'chum' ? 2 : 0);
    const rivalBeforeNet = rivalBase + (rivalTackle === 'chum' ? 2 : 0);
    const playerNet = tackle === 'net' && playerBeforeNet < rivalBeforeNet;
    const rivalNet = rivalTackle === 'net' && rivalBeforeNet < playerBeforeNet;
    const playerStrength = Math.max(0, playerBeforeNet - (rivalNet ? 3 : 0));
    const rivalStrength = Math.max(0, rivalBeforeNet - (playerNet ? 3 : 0));
    const difference = Math.sign(playerStrength - rivalStrength);
    return { playerStrength, rivalStrength, playerNet, rivalNet,
      playerScore: playerScore + 1 + difference, rivalScore: rivalScore + 1 - difference };
  }

  function createMatch(playerCards = loanerHand, random = Math.random) {
    const match = { playerCards: playerCards.slice(), rivalCards: loanerHand.slice(),
      history: [], playerSpent: [], rivalSpent: [], rivalMove: null, random };
    nextMatchRound(match);
    return match;
  }

  // Choose from the publicly visible hands before either player sees this round's selections.
  function nextMatchRound(match) {
    if (match.rivalMove || match.history.length >= 3) return false;
    const own = match.rivalCards.map((_, index) => index).filter(index => !match.history.some(r => r.rivalIndex === index));
    const opposing = match.playerCards.filter((_, index) => !match.history.some(r => r.playerIndex === index));
    const index = own[Math.floor(match.random() * own.length)];
    const strength = match.rivalCards[index].strength;
    const tactics = Object.keys(tackleNames).filter(id => !match.rivalSpent.includes(id));
    // Weigh the fish Riao can still meet. A useless net may still bluff a boosted fish.
    const weights = tactics.map(id => {
      if (id === 'none') return own.length === 1 ? 1 : 3;
      if (id === 'net') return 1 + 2 * opposing.filter(card => card.strength > strength).length;
      return 1 + 2 * opposing.filter(card => Math.abs(card.strength - strength) <= 1).length;
    });
    let draw = match.random() * weights.reduce((sum, weight) => sum + weight, 0);
    const choice = tactics.find((_, i) => (draw -= weights[i]) < 0);
    match.rivalMove = { index, tackle: choice || 'none' };
    return true;
  }

  function playMatchRound(match, playerIndex, tackle) {
    if (!match.rivalMove || !Number.isInteger(playerIndex) || !match.playerCards[playerIndex] ||
        !Object.hasOwn(tackleNames, tackle) || match.playerSpent.includes(tackle) ||
        match.history.some(r => r.playerIndex === playerIndex)) return null;
    const { index: rivalIndex, tackle: rivalTackle } = match.rivalMove;
    const previous = match.history.at(-1);
    const verdict = resolveRound({ playerBase: match.playerCards[playerIndex].strength,
      rivalBase: match.rivalCards[rivalIndex].strength, tackle, rivalTackle,
      playerScore: previous?.playerScore ?? 0, rivalScore: previous?.rivalScore ?? 0 });
    const result = { playerIndex, rivalIndex, tackle, rivalTackle, ...verdict };
    if (tackle !== 'none') match.playerSpent.push(tackle);
    if (rivalTackle !== 'none') match.rivalSpent.push(rivalTackle);
    match.rivalMove = null;
    match.history.push(result);
    return result;
  }

  function open(host, ctx) {
    const doc = host.ownerDocument;
    let screen = 'shop';
    let current = challenges[0];
    let selectedFish = 'bora';
    let selectedTackle = 'none';
    let selectedArt = '';
    let albumId = '';
    let round = null;
    let foilSaveFailed = false;
    let clearSaveFailed = false;
    let stopped = false;
    let match = null;
    let deck = ['', '', ''];
    let handIndex = 0;
    let candidateUid = '';
    let printError = '';
    let nicknameDraft = '';

    function node(tag, className, label) {
      const element = doc.createElement(tag);
      if (className) element.className = className;
      if (label !== undefined) element.textContent = label;
      return element;
    }

    function button(label, attr, value, className) {
      const element = node('button', className, label);
      element.type = 'button';
      element.setAttribute('data-card-' + attr, value);
      return element;
    }

    function actions(...items) {
      const group = node('div', 'fish-game-actions');
      group.append(...items);
      return group;
    }

    function printed() { return ctx.getRecords(); }

    function artRecord() {
      return printed().find(record => record.id === selectedArt && record.species === selectedFish);
    }

    function baseFor(species) {
      return current.id === 'practice' ? 4 : harborCards[species];
    }

    function recordEntry(record) {
      if (record.rental) return 'レンタル魚';
      return Number.isInteger(record.generation) && record.generation > 0 ? '第' + record.generation + '世代' : '世代不明';
    }

    function raceTime(record) {
      return Number.isSafeInteger(record.timeCs) && record.timeCs > 0 ? (record.timeCs / 100).toFixed(2) + '秒' : '';
    }

    function recordLabel(record) {
      const title = record.name + ' ・ ' + recordEntry(record) + ' ・ ' + record.rank + '着 ・ ' + record.day + '日目';
      const time = raceTime(record);
      return time ? title + ' ・ ' + record.course + ' ' + time + (record.personalBest === true ? '（自己新）' : '') : title;
    }

    function fishCard(species, strength, record, selectable, owned = true, valueLabel = current.id === 'practice' ? '練習値 ' : '海の強さ ') {
      const title = ctx.fishName(species);
      const card = selectable ? button('', 'fish', species, 'fish-playing-card') : node('div', 'fish-playing-card');
      if (selectable) card.setAttribute('aria-pressed', String(species === selectedFish));
      card.dataset.species = species;
      if (record) {
        if (record.id) card.dataset.recordId = record.id;
        card.classList.add('is-commemorative');
      }
      const foil = owned && ctx.hasFoil(species);
      if (foil) card.classList.add('is-foil');
      const art = node('span', 'fish-card-art');
      art.setAttribute('aria-hidden', 'true');
      ctx.drawFish(art, species, 0, record?.specimen || null);
      card.append(art, node('b', 'fish-card-name', record && record.name !== title ? record.name + '（' + title + '）' : title),
        node('small', 'fish-card-value', valueLabel + strength));
      if (record) card.append(node('small', 'fish-card-imprint', record.course
        ? record.course + ' ・ ' + recordEntry(record) + ' ・ ' + record.rank + '着'
        : record.place || '釣り場不明'));
      const time = record?.course ? raceTime(record) : '';
      if (time) {
        const route = record.route === 'wheel' ? '水車側' : record.route === 'bank' ? '岸側' : '';
        const timing = node('small', 'fish-card-race-time', (route ? route + ' ・ ' : '') + time);
        if (record.personalBest === true) timing.append(node('b', 'card-best-stamp', '自己新'));
        card.append(timing);
      }
      if (foil) card.append(node('small', 'card-foil-mark', '金箔'));
      return card;
    }

    function selectRecords(records, value, kind, withNormal) {
      const label = node('label', 'card-album-select', kind === 'record' ? '一走を選ぶ ' : '札の絵柄 ');
      const select = node('select');
      select.setAttribute('data-card-' + kind, '');
      if (withNormal) {
        const normal = node('option', '', '通常の絵柄');
        normal.value = '';
        select.append(normal);
      }
      for (const record of records) {
        const option = node('option', '', recordLabel(record));
        option.value = record.id;
        select.append(option);
      }
      select.value = value;
      label.append(select);
      return label;
    }

    function shop(panel) {
      panel.append(node('p', 'card-prompt', 'リアオ「3枚で勝負しようか。最後の一手を練習できるお題もあるよ」'));
      const options = node('div', 'fish-game-options');
      const duel = button('リアオと3ラウンド対戦', 'action', 'duel', 'fish-game-choice fish-game-primary');
      duel.append(node('small', '', 'お互いの手札を見て勝負'));
      const printer = button('釣った魚を札にする', 'action', 'catch-print', 'fish-game-choice');
      printer.append(node('small', '', '愛称と釣り場を刻む'));
      options.append(duel, printer);
      const cleared = ctx.getCleared();
      for (const challenge of challenges) {
        const choice = button('', 'challenge', challenge.id, 'fish-game-choice');
        const art = node('span', 'fish-card-art');
        art.setAttribute('aria-hidden', 'true');
        ctx.drawFish(art, challenge.hand[challenge.hand.length - 1]);
        const caption = node('span', 'card-choice-caption', challenge.title);
        caption.append(node('small', '', '最終局・海　' + challenge.score.join('対') +
          (cleared.includes(challenge.id) ? '　解決済み' : '')));
        choice.append(art, caption);
        options.append(choice);
      }
      const count = printed().length;
      const album = button('レースの記念札', 'action', 'album', 'fish-game-choice');
      album.append(node('small', '', count ? count + '枚 ・ 一手勝負で使う' : 'ダンの魚レースで作れるよ'));
      options.append(album);
      panel.append(options);
    }

    function renderAlbum(panel) {
      const records = printed();
      const record = records.find(item => item.id === albumId) || records[0];
      if (record) {
        albumId = record.id;
        const spare = ctx.getDuplicateCount(record.species);
        const foil = button(ctx.hasFoil(record.species) ? '金箔加工済み' : '余り札1枚で金箔加工', 'action', 'foil');
        foil.disabled = !spare || ctx.hasFoil(record.species);
        panel.append(selectRecords(records, albumId, 'record', false),
          fishCard(record.species, 4, record, false),
          node('p', 'card-prompt', '練習卓は全種、強さ4。同じ魚種の2枚目から余り札が1枚付くよ。'),
          node('small', 'card-hint', foilSaveFailed
            ? '金箔加工を保存できなかった。余り札を確認して、もう一度加工してみよう。'
            : ctx.fishName(record.species) + 'の余り札 ' + spare + '枚'),
          actions(button('この札で一手勝負', 'action', 'practice', 'fish-game-primary'),
            foil, button('店へ戻る', 'action', 'shop')));
      } else {
        panel.append(node('p', 'card-prompt', 'リアオ「ダンのレースでゴールしたら、気に入った一走を記念札にしてごらん。何着の子でも歓迎さ」'),
          actions(button('店へ戻る', 'action', 'shop')));
      }
    }

    function renderPlay(panel) {
      const training = current.id === 'practice';
      const rivalBase = training ? 4 : harborCards.suzuki;
      panel.append(node('p', 'card-situation',
        '最終局' + (training ? '・練習卓' : '・海') + '　勝ち点　あなた ' + current.score[0] + ' 対 ' + current.score[1] + ' リアオ'),
        node('p', 'card-prompt', '相手はスズキ ' + rivalBase + ' ＋ 撒き餌 2 ＝ ' + (rivalBase + 2) + '。魚札と仕掛けを選ぼう。'));
      const hand = node('div', 'card-hand');
      for (const species of current.hand) {
        hand.append(fishCard(species, baseFor(species), species === selectedFish ? artRecord() : null, true));
      }
      panel.append(hand);
      const matching = printed().filter(record => record.species === selectedFish);
      if (matching.length) panel.append(selectRecords(matching, selectedArt, 'art', true));
      const choices = node('div', 'card-tackle');
      choices.setAttribute('role', 'group');
      choices.setAttribute('aria-label', '仕掛けを選ぶ');
      for (const [id, name] of Object.entries(tackleNames)) {
        const choice = button(name, 'tackle', id);
        choice.setAttribute('aria-pressed', String(id === selectedTackle));
        choices.append(choice);
      }
      panel.append(choices, node('small', 'card-hint', tackleHints[selectedTackle]),
        actions(button('札を出す', 'action', 'play', 'fish-game-primary'), button('店へ戻る', 'action', 'shop')));
    }

    function renderResult(panel) {
      const training = current.id === 'practice';
      const victor = round.playerScore > round.rivalScore ? 'あなたの勝ち！' :
        round.playerScore < round.rivalScore ? 'リアオの勝ち' : '引き分け';
      const hand = node('div', 'card-showdown');
      const player = fishCard(selectedFish, baseFor(selectedFish), artRecord(), false);
      const rival = fishCard('suzuki', training ? 4 : harborCards.suzuki, null, false, false);
      player.prepend(node('small', '', 'あなた ・ ' + tackleNames[selectedTackle]));
      rival.prepend(node('small', '', 'リアオ ・ 撒き餌'));
      hand.append(player, rival);
      const text = node('div', 'card-verdict');
      text.setAttribute('role', 'status');
      for (const key of ['playerStrength', 'rivalStrength', 'playerScore', 'rivalScore']) text.dataset[key] = round[key];
      text.append(node('strong', '', '合計 ' + round.playerScore + '対' + round.rivalScore + '　' + victor),
        node('span', '', (round.playerNet ? '網が決まり、相手に−3。' : '') +
          '最終局は ' + round.playerStrength + '対' + round.rivalStrength + '。'));
      const footer = actions(button('もう一度', 'action', 'replay'),
        button(training ? '記念札へ' : '次のお題を選ぶ', 'action', training ? 'album' : 'shop'));
      if (clearSaveFailed) {
        text.append(node('small', '', '解決記録を保存できなかった。'));
        footer.prepend(button('記録を再保存', 'action', 'save-clear'));
      }
      panel.append(hand, text, footer);
    }

    function catchStrength(species) {
      if (Object.hasOwn(harborCards, species)) return harborCards[species];
      const resistance = ctx.fishResistance?.(species);
      if (!Number.isFinite(resistance)) return 4;
      return resistance < 85 ? 3 : resistance >= 115 ? 5 : 4;
    }

    function slotCard(index, records) {
      const record = records.find(r => r.id === deck[index]);
      return record ? { species: record.species, strength: catchStrength(record.species), record } : loanerHand[index];
    }

    function cardName(card) {
      return card.record?.name || ctx.fishName(card.species);
    }

    function roster(cards, played = [], spent = []) {
      const row = node('div', 'duel-roster');
      row.append(node('b', '', 'リアオの手札'));
      cards.forEach((card, i) => {
        const used = played.includes(i);
        const chip = node('span', 'duel-rival-card' + (used ? ' is-spent' : ''),
          cardName(card) + ' ' + card.strength + (used ? '（済）' : ''));
        row.append(chip);
      });
      if (spent.length) row.append(node('small', 'duel-spent-tools', '使用済み ' + spent.map(id => tackleNames[id]).join('・')));
      return row;
    }

    function renderDuelSetup(panel) {
      const records = ctx.getCatchCards();
      panel.append(node('p', 'card-prompt', '3枚を1回ずつ出そう。勝ち2点、引き分け1点。大物網と撒き餌は各1回。'));
      panel.append(roster(loanerHand));
      const slots = node('div', 'duel-deck');
      loanerHand.forEach((loaner, i) => {
        const card = slotCard(i, records);
        const slot = node('label', 'duel-slot');
        const art = node('span', 'fish-card-art');
        art.setAttribute('aria-hidden', 'true');
        ctx.drawFish(art, card.species, 0, card.record?.specimen || null);
        const label = node('b', '', '自分の札 ' + (i + 1));
        const select = node('select');
        select.dataset.cardSlot = String(i);
        select.setAttribute('aria-label', '自分の札 ' + (i + 1));
        const standard = node('option', '', ctx.fishName(loaner.species) + ' ' + loaner.strength + '（貸札）');
        standard.value = '';
        select.append(standard);
        for (const item of records) {
          const option = node('option', '', item.name + ' ' + catchStrength(item.species) + ' ・ ' + (item.place || '釣り場不明'));
          option.value = item.id;
          option.disabled = deck.some((id, j) => j !== i && id === item.id);
          select.append(option);
        }
        select.value = card.record?.id || '';
        slot.append(label, art, select);
        slots.append(slot);
      });
      panel.append(slots, actions(button('この3枚で対戦', 'action', 'duel-start', 'fish-game-primary'), button('店へ戻る', 'action', 'shop')));
    }

    function renderDuelPlay(panel) {
      const previous = match.history.at(-1);
      panel.append(node('p', 'card-situation', '第' + (match.history.length + 1) + '局／3　勝ち点　あなた ' +
        (previous?.playerScore ?? 0) + ' 対 ' + (previous?.rivalScore ?? 0) + ' リアオ'),
        roster(match.rivalCards, match.history.map(result => result.rivalIndex), match.rivalSpent));
      const hand = node('div', 'duel-hand card-hand');
      match.playerCards.forEach((entry, i) => {
        const card = fishCard(entry.species, entry.strength, entry.record, true, true, '強さ ');
        card.removeAttribute('data-card-fish');
        card.dataset.cardDuelFish = String(i);
        card.disabled = match.history.some(result => result.playerIndex === i);
        card.setAttribute('aria-pressed', String(i === handIndex));
        if (card.disabled) card.querySelector('.fish-card-value').append('（済）');
        hand.append(card);
      });
      const tools = node('div', 'card-tackle');
      tools.setAttribute('aria-label', '仕掛けを選ぶ');
      tools.setAttribute('role', 'group');
      for (const [id, name] of Object.entries(tackleNames)) {
        const choice = button(name, 'tackle', id);
        choice.disabled = match.playerSpent.includes(id);
        if (choice.disabled) choice.append('（済）');
        choice.setAttribute('aria-pressed', String(id === selectedTackle));
        choice.title = tackleHints[id];
        tools.append(choice);
      }
      panel.append(hand, tools, node('small', 'card-hint', tackleHints[selectedTackle]),
        actions(button('同時にめくる', 'action', 'duel-play', 'fish-game-primary')));
    }

    function renderDuelResult(panel) {
      const result = match.history.at(-1);
      const final = match.history.length === 3;
      const outcome = result.playerScore > result.rivalScore ? 'あなたの勝ち！' :
        result.playerScore < result.rivalScore ? 'リアオの勝ち' : '引き分け';
      panel.append(node('p', 'card-situation', '第' + match.history.length + '局／3　' + (final ? '対戦終了' : '札を公開')));
      const showdown = node('div', 'card-showdown');
      for (const [who, card, tool, netHit, mine] of [
        ['あなた', match.playerCards[result.playerIndex], result.tackle, result.playerNet, true],
        ['リアオ', match.rivalCards[result.rivalIndex], result.rivalTackle, result.rivalNet, false],
      ]) {
        const face = fishCard(card.species, card.strength, card.record, false, mine, '強さ ');
        const effect = tool === 'chum' ? '＋2' : tool === 'net' ? (netHit ? ' 成功 −3' : ' 空振り') : '';
        face.prepend(node('small', '', who + ' ・ ' + tackleNames[tool] + effect));
        showdown.append(face);
      }
      const verdict = node('div', 'card-verdict');
      verdict.setAttribute('role', 'status');
      for (const key of ['playerStrength', 'rivalStrength', 'playerScore', 'rivalScore']) verdict.dataset[key] = result[key];
      const gain = result.playerStrength === result.rivalStrength ? '両者に1点' :
        result.playerStrength > result.rivalStrength ? 'あなたに2点' : 'リアオに2点';
      verdict.append(node('strong', '', '合計 ' + result.playerScore + '対' + result.rivalScore + (final ? '　' + outcome : '')),
        node('span', '', 'この局は ' + result.playerStrength + '対' + result.rivalStrength + '　' + gain));
      panel.append(showdown, verdict);
      if (final) {
        const log = node('div', 'duel-log');
        match.history.forEach((r, i) => log.append(node('span', '', (i + 1) + '局 ' + r.playerStrength + '対' + r.rivalStrength)));
        panel.append(log);
      }
      panel.append(final ? actions(button('同じ手札で再戦', 'action', 'duel-rematch', 'fish-game-primary'),
        button('手札を変える', 'action', 'duel'), button('店へ戻る', 'action', 'shop')) :
        actions(button('次の局へ', 'action', 'duel-next', 'fish-game-primary')));
    }

    function renderCatchPrint(panel) {
      const candidates = ctx.getCatchCandidates();
      const records = ctx.getCatchCards();
      const candidate = candidates.find(item => item.uid === candidateUid) || candidates[0];
      if (!candidate) {
        panel.append(node('p', 'card-prompt', 'リアオ「自宅の観賞水槽に釣った魚を入れておいで。その子の姿を札に刷るよ」'),
          actions(button('手札を選ぶ', 'action', 'duel', 'fish-game-primary'), button('店へ戻る', 'action', 'shop')));
        return;
      }
      candidateUid = candidate.uid;
      const record = records.find(item => item.uid === candidateUid);
      const label = node('label', 'card-album-select', '水槽の釣果 ');
      const select = node('select');
      select.dataset.cardCandidate = '';
      for (const item of candidates) {
        const option = node('option', '', item.name + ' ・ ' + (item.place || '釣り場不明'));
        option.value = item.uid;
        select.append(option);
      }
      select.value = candidateUid;
      label.append(select);
      const card = record || candidate;
      const status = node('p', 'card-hint', printError || (record ? 'この子の釣果札は手札に入れられるよ。' : '魚は観賞水槽で泳いだまま。愛称は魚と札の両方に残るよ。'));
      panel.append(label);
      if (!record) {
        const field = node('label', 'card-album-select card-catch-nickname', '愛称（任意・12文字まで）');
        const input = node('input');
        input.type = 'text';
        input.dataset.cardNickname = '';
        input.maxLength = 512; // The game's name validator counts graphemes, not UTF-16 units.
        input.autocomplete = 'off';
        input.placeholder = candidate.name;
        input.value = nicknameDraft;
        field.append(input);
        panel.append(field);
      }
      status.setAttribute('role', 'status');
      panel.append(fishCard(card.species, catchStrength(card.species), card, false, true, '強さ '), status,
        actions(record ? button('この札で対戦', 'action', 'duel-with-catch', 'fish-game-primary') :
          button('この魚の札を刷る', 'action', 'print-catch', 'fish-game-primary'), button('店へ戻る', 'action', 'shop')));
    }

    function startDuel(cards) {
      match = createMatch(cards);
      screen = 'duel-play';
      handIndex = 0;
      selectedTackle = 'none';
      render('[data-card-duel-fish="0"]');
    }

    function render(focus) {
      if (stopped) return;
      const panel = node('section', 'fish-card-shop');
      panel.dataset.cardScreen = screen;
      if (screen === 'duel-setup') renderDuelSetup(panel);
      if (screen === 'duel-play') renderDuelPlay(panel);
      if (screen === 'duel-result') renderDuelResult(panel);
      if (screen === 'catch-print') renderCatchPrint(panel);
      if (screen === 'shop') shop(panel);
      if (screen === 'album') renderAlbum(panel);
      if (screen === 'play') renderPlay(panel);
      if (screen === 'result') renderResult(panel);
      host.replaceChildren(panel);
      if (focus) panel.querySelector(focus)?.focus({ preventScroll: true });
    }

    function begin(challenge, record) {
      current = challenge;
      selectedFish = challenge.hand[0];
      selectedTackle = 'none';
      selectedArt = record ? record.id : '';
      round = null;
      clearSaveFailed = false;
      screen = 'play';
      render('[data-card-fish]');
    }

    function click(event) {
      const control = event.target.closest('button');
      if (!control || control.disabled || !host.contains(control)) return;
      if (screen === 'duel-play' && control.hasAttribute('data-card-duel-fish')) {
        handIndex = Number(control.dataset.cardDuelFish);
        render('[data-card-duel-fish][aria-pressed="true"]');
        return;
      }
      if (screen === 'duel-play' && control.hasAttribute('data-card-tackle')) {
        selectedTackle = control.dataset.cardTackle;
        render('[data-card-tackle][aria-pressed="true"]');
        return;
      }
      if (screen === 'shop' && control.hasAttribute('data-card-challenge')) {
        const challenge = challenges.find(q => q.id === control.dataset.cardChallenge);
        if (challenge) begin(challenge);
        return;
      }
      if (screen === 'play' && current.hand.includes(control.dataset.cardFish)) {
        if (selectedFish !== control.dataset.cardFish) selectedArt = '';
        selectedFish = control.dataset.cardFish;
        render('[data-card-fish][aria-pressed="true"]');
        return;
      }
      if (screen === 'play' && Object.hasOwn(tackleNames, control.dataset.cardTackle)) {
        selectedTackle = control.dataset.cardTackle;
        render('[data-card-tackle][aria-pressed="true"]');
        return;
      }
      switch (control.dataset.cardAction) {
        case 'duel':
          screen = 'duel-setup';
          render('[data-card-action="duel-start"]');
          break;
        case 'duel-start':
          if (screen === 'duel-setup') {
            const records = ctx.getCatchCards();
            startDuel(loanerHand.map((_, i) => slotCard(i, records)));
          }
          break;
        case 'duel-play':
          if (screen !== 'duel-play' || !playMatchRound(match, handIndex, selectedTackle)) return;
          screen = 'duel-result';
          render('[data-card-action="duel-next"],[data-card-action="duel-rematch"]');
          break;
        case 'duel-next':
          if (screen !== 'duel-result' || !nextMatchRound(match)) return;
          handIndex = match.playerCards.findIndex((_, i) => !match.history.some(result => result.playerIndex === i));
          selectedTackle = 'none';
          screen = 'duel-play';
          render('[data-card-duel-fish][aria-pressed="true"]');
          break;
        case 'duel-rematch':
          if (screen === 'duel-result' && match.history.length === 3) startDuel(match.playerCards);
          break;
        case 'catch-print':
          printError = '';
          nicknameDraft = '';
          screen = 'catch-print';
          render('[data-card-candidate],button');
          break;
        case 'print-catch':
          if (screen !== 'catch-print') return;
          nicknameDraft = host.querySelector('[data-card-nickname]').value;
          if (nicknameDraft.trim() && !doc.defaultView.ShuPlayerOptions.validName(nicknameDraft)) {
            printError = '愛称は1〜12文字で決めてね。';
            render('[data-card-nickname]');
            return;
          }
          printError = ctx.printCatchCard(candidateUid, nicknameDraft) ? '' : '札を保存できなかった。もう一度刷ってみよう。';
          render('[data-card-action="print-catch"],[data-card-action="duel-with-catch"]');
          break;
        case 'duel-with-catch': {
          if (screen !== 'catch-print') return;
          const record = ctx.getCatchCards().find(item => item.uid === candidateUid);
          if (!record) return;
          if (!deck.includes(record.id)) deck[loanerHand.findIndex(loaner => loaner.strength === catchStrength(record.species))] = record.id;
          screen = 'duel-setup';
          render('[data-card-action="duel-start"]');
          break;
        }
        case 'album':
          foilSaveFailed = false;
          screen = 'album';
          current = { id: 'practice' };
          render('[data-card-record],button');
          break;
        case 'foil': {
          const record = printed().find(item => item.id === albumId);
          if (screen !== 'album' || !record) return;
          foilSaveFailed = !ctx.foilCard(record.species);
          render(foilSaveFailed ? '[data-card-action="foil"]' : '[data-card-action="practice"]');
          break;
        }
        case 'practice': {
          const record = printed().find(item => item.id === albumId);
          if (record) begin({ id: 'practice', score: [2, 2], hand: [record.species] }, record);
          break;
        }
        case 'play':
          if (screen !== 'play') return;
          round = resolveRound({ playerBase: baseFor(selectedFish), rivalBase: current.id === 'practice' ? 4 : harborCards.suzuki,
            tackle: selectedTackle, rivalTackle: 'chum', playerScore: current.score[0], rivalScore: current.score[1] });
          screen = 'result';
          if (round.playerScore > round.rivalScore && current.id !== 'practice') {
            clearSaveFailed = ctx.markCleared(current.id) === false;
          }
          render(clearSaveFailed ? '[data-card-action="save-clear"]' : '[data-card-action="replay"]');
          break;
        case 'save-clear':
          if (screen !== 'result' || !clearSaveFailed) return;
          clearSaveFailed = ctx.markCleared(current.id) === false;
          render(clearSaveFailed ? '[data-card-action="save-clear"]' : '[data-card-action="replay"]');
          break;
        case 'replay':
          begin(current, artRecord());
          break;
        case 'shop':
          screen = 'shop';
          render('[data-card-challenge]');
          break;
      }
    }

    function change(event) {
      if (screen === 'duel-setup' && event.target.hasAttribute('data-card-slot')) {
        const i = Number(event.target.dataset.cardSlot);
        const id = event.target.value;
        if (Number.isInteger(i) && i >= 0 && i < deck.length &&
            (!id || (ctx.getCatchCards().some(item => item.id === id) && !deck.some((other, j) => j !== i && other === id)))) {
          deck[i] = id;
        }
        render('[data-card-slot="' + i + '"]');
      } else if (screen === 'catch-print' && event.target.hasAttribute('data-card-candidate')) {
        printError = '';
        nicknameDraft = '';
        candidateUid = event.target.value;
        render('[data-card-candidate]');
      } else if (screen === 'album' && event.target.hasAttribute('data-card-record')) {
        foilSaveFailed = false;
        albumId = event.target.value;
        render('[data-card-record]');
      } else if (screen === 'play' && event.target.hasAttribute('data-card-art')) {
        selectedArt = event.target.value;
        render('[data-card-art]');
      }
    }

    host.addEventListener('click', click);
    host.addEventListener('change', change);
    render();
    return { stop() {
      stopped = true;
      host.removeEventListener('click', click);
      host.removeEventListener('change', change);
    } };
  }

  return { challenges, resolveRound, createMatch, playMatchRound, nextMatchRound, open };
});
