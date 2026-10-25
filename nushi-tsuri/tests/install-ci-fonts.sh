#!/usr/bin/env bash
# The same pinned Japanese faces on the host runner and in the Playwright image.
set -euo pipefail
font_work_dir=$(mktemp -d)
trap 'rm -rf -- "$font_work_dir"' EXIT
cd "$font_work_dir"
font_base=https://raw.githubusercontent.com/notofonts/noto-cjk/f8d157532fbfaeda587e826d4cd5b21a49186f7c/Sans/OTF/Japanese
for font_face in Regular Bold; do
  curl --fail --location --connect-timeout 10 --max-time 60 --retry 2 \
    --output "NotoSansCJKjp-${font_face}.otf" "$font_base/NotoSansCJKjp-${font_face}.otf"
done
sha256sum --check <<'FONT_HASHES'
68a3fc98800b2a27b371f2fb79991daf3633bd89309d4ffaa6946fd587f375b5  NotoSansCJKjp-Regular.otf
e53dcb0dcb2922e45d01aae1ebd2f382bb81d4229b18b6b883bd170678af1f76  NotoSansCJKjp-Bold.otf
FONT_HASHES
font_root(){ if [ "$(id -u)" -eq 0 ]; then "$@"; else sudo "$@"; fi; }
font_root install -d /usr/local/share/fonts/noto-ci
font_root install -m 644 ./*.otf /usr/local/share/fonts/noto-ci/
cat > 99-nushi-japanese.conf <<'FONT_CONFIG'
<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd">
<fontconfig>
  <alias><family>sans-serif</family><prefer><family>Noto Sans CJK JP</family></prefer></alias>
</fontconfig>
FONT_CONFIG
font_root install -m 644 99-nushi-japanese.conf /etc/fonts/conf.d/99-nushi-japanese.conf
font_root fc-cache -f
fc-scan --format '%{family}\n' /usr/local/share/fonts/noto-ci/NotoSansCJKjp-Regular.otf | grep -F 'Noto Sans CJK JP'
fc-match -f '%{family}\n' 'sans-serif:lang=ja'
fc-match -f '%{family}\n' 'Noto Sans CJK JP' | grep -F 'Noto Sans CJK JP'
