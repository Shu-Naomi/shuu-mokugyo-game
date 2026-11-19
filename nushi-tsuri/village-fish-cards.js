(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ShuVillageFishCards = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const harborCards = { bora: 4, suzuki: 5 };
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

    function recordLabel(record) {
      return record.name + ' ・ ' + recordEntry(record) + ' ・ ' + record.rank + '着 ・ ' + record.day + '日目';
    }

    function fishCard(species, strength, record, selectable, owned = true) {
      const title = ctx.fishName(species);
      const card = selectable ? button('', 'fish', species, 'fish-playing-card') : node('div', 'fish-playing-card');
      if (selectable) card.setAttribute('aria-pressed', String(species === selectedFish));
      card.dataset.species = species;
      if (record) {
        card.dataset.recordId = record.id;
        card.classList.add('is-commemorative');
      }
      const foil = owned && ctx.hasFoil(species);
      if (foil) card.classList.add('is-foil');
      const art = node('span', 'fish-card-art');
      art.setAttribute('aria-hidden', 'true');
      ctx.drawFish(art, species, 0, record?.specimen || null);
      card.append(art, node('b', 'fish-card-name', record && record.name !== title ? record.name + '（' + title + '）' : title),
        node('small', 'fish-card-value', (current.id === 'practice' ? '練習値 ' : '海の強さ ') + strength));
      if (record) card.append(node('small', 'fish-card-imprint', record.course + ' ・ ' + recordEntry(record) + ' ・ ' + record.rank + '着'));
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
      panel.append(node('p', 'card-prompt', 'リアオ「最後の一手を任せるよ。3ラウンドの合計勝ち点で僕に勝てるかな？」'));
      const options = node('div', 'fish-game-options');
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

    function render(focus) {
      if (stopped) return;
      const panel = node('section', 'fish-card-shop');
      panel.dataset.cardScreen = screen;
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
      if (!control || !host.contains(control)) return;
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
      if (screen === 'album' && event.target.hasAttribute('data-card-record')) {
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

  return { challenges, resolveRound, open };
});
