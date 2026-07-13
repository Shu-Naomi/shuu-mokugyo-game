from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    Path(path).write_text(text, encoding="utf-8")


def replace_once(path: str, needle: str, replacement: str, label: str) -> None:
    text = read(path)
    if replacement in text:
        return
    if needle not in text:
        raise SystemExit(f"{path}: {label} hook not found")
    write(path, text.replace(needle, replacement, 1))


def add_script(path: str, src: str) -> None:
    text = read(path)
    tag = f'  <script src="{src}"></script>'
    if tag in text:
        return
    if "</body>" not in text:
        raise SystemExit(f"{path}: </body> not found")
    write(path, text.replace("</body>", f"{tag}\n</body>", 1))


add_script("index.html", "assets/inugoya-stats.js")
add_script("othello/index.html", "../assets/inugoya-stats.js")
add_script("chess/index.html", "../assets/inugoya-stats.js")
add_script("shogi/index.html", "../assets/inugoya-stats.js")

othello_hook = """        const ledgerOutcome = black > white ? 'win' : white > black ? 'loss' : 'draw';
        window.InugoyaStats?.recordMatch('othello', ledgerOutcome, {
          difficulty,
          playerScore: black,
          shuuScore: white,
          score: black,
          detail: `${black}対${white}`
        });
        resultModal.classList.add('show');"""
replace_once(
    "othello/index.html",
    "        resultModal.classList.add('show');",
    othello_hook,
    "othello result",
)

chess_needle = "$('#resultTitle').textContent=title;$('#resultMessage').textContent=msg;$('#resultDetail').textContent=detail;$('#resultModal').classList.add('show');}"
chess_hook = "$('#resultTitle').textContent=title;$('#resultMessage').textContent=msg;$('#resultDetail').textContent=detail;const ledgerOutcome=st.kind==='mate'?(st.winner===W?'win':'loss'):'draw';window.InugoyaStats?.recordMatch('chess',ledgerOutcome,{difficulty,detail});$('#resultModal').classList.add('show');}"
replace_once("chess/index.html", chess_needle, chess_hook, "chess result")

shogi_needle = "$('#resultTitle').textContent=title;$('#resultMessage').textContent=msg;$('#resultSummary').textContent=checked?'詰みで対局終了':'合法手なしで対局終了';$('#resultModal').classList.add('show');"
shogi_hook = "$('#resultTitle').textContent=title;$('#resultMessage').textContent=msg;$('#resultSummary').textContent=checked?'詰みで対局終了':'合法手なしで対局終了';const ledgerOutcome=winner===SENTE?'win':winner===GOTE?'loss':'draw';window.InugoyaStats?.recordMatch('shogi',ledgerOutcome,{difficulty,detail:checked?'詰みで対局終了':'合法手なしで対局終了',moves:moveNumber});$('#resultModal').classList.add('show');"
replace_once("shogi/index.html", shogi_needle, shogi_hook, "shogi result")

tail_needle = "      $('#tailDefenseResult').classList.remove('is-hidden');\n      renderTailDefense();"
tail_hook = """      $('#tailDefenseResult').classList.remove('is-hidden');
      window.InugoyaStats?.recordMatch('tailDefense', reason === 'failed' ? 'loss' : 'win', {
        score: tailDefense.score,
        detail: `${tailDefense.elapsed}秒 / ライフ${tailDefense.life}`
      });
      renderTailDefense();"""
replace_once("index.html", tail_needle, tail_hook, "tail defense result")

rhythm_needle = "      state.rhythmBest = Math.max(state.rhythmBest, rhythm.score);"
rhythm_hook = """      state.rhythmBest = Math.max(state.rhythmBest, rhythm.score);
      window.InugoyaStats?.recordScore('rhythm', rhythm.score, {
        detail: `ぽく度+${rewardPoku}${rewardSnack ? ` / おやつ+${rewardSnack}` : ''}`
      });"""
replace_once("index.html", rhythm_needle, rhythm_hook, "rhythm result")

checks = {
    "index.html": [
        "assets/inugoya-stats.js",
        "recordMatch('tailDefense'",
        "recordScore('rhythm'",
    ],
    "othello/index.html": ["../assets/inugoya-stats.js", "recordMatch('othello'"],
    "chess/index.html": ["../assets/inugoya-stats.js", "recordMatch('chess'"],
    "shogi/index.html": ["../assets/inugoya-stats.js", "recordMatch('shogi'"],
}

for file, needles in checks.items():
    content = read(file)
    missing = [needle for needle in needles if needle not in content]
    if missing:
        raise SystemExit(f"{file}: missing {missing}")

print("Shared minigame ledger hooks installed.")
