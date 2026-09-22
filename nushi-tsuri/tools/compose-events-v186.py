"""Four original event scores. Synthesized locally; no borrowed melodies/samples.
Run with numpy, scipy and ffmpeg. Tails wrap across the exact loop boundary.
"""
from pathlib import Path
import importlib.util
import json
import numpy as np
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('seasonal', Path(__file__).with_name('compose-soundtrack-v183.py'))
seasonal = importlib.util.module_from_spec(spec)
spec.loader.exec_module(seasonal)
old, SR = seasonal.old, seasonal.SR
OUT = ROOT / 'assets/audio/music-v186'
SCORES = [
    dict(id='tournament-lake', title='湖上の勝負・最後の一投', bpm=140, key=62, meter=4, battle=True,
         chords=[(0,4,7),(9,12,16),(5,9,12),(7,11,14),(0,4,7),(5,9,12),(2,5,9),(7,11,14)],
         melody=['0 4 7 - 9 7 4 2','0 - 4 7 9 - 12 9','5 7 9 - 12 9 7 5','7 - 11 14 12 11 9 7',
                 '12 11 9 7 4 - 7 9','12 - 9 7 5 7 9 -','14 12 9 - 5 4 2 -','7 11 14 11 9 7 4 2']),
    dict(id='tournament-masters', title='名手への挑戦・火花の水面', bpm=152, key=64, meter=4, battle=True,
         chords=[(0,3,7),(8,12,15),(5,8,12),(7,11,14),(0,3,7),(3,7,10),(8,12,15),(7,11,14)],
         melody=['0 7 3 7 12 - 10 7','8 7 3 - 0 3 7 8','5 8 12 8 15 12 8 5','7 11 14 - 11 7 2 -',
                 '12 7 15 12 10 7 3 0','3 7 10 12 15 - 10 7','8 12 15 12 8 7 3 -','11 14 11 7 2 7 11 -']),
    dict(id='contest-pet', title='しっぽとリボンのワルツ', bpm=108, key=65, meter=3, battle=False,
         chords=[(0,4,7),(5,9,12),(2,5,9),(7,11,14),(9,12,16),(5,9,12),(7,11,14),(0,4,7)],
         melody=['4 - 7 9 7 -','5 - 9 12 9 -','2 4 5 9 5 -','7 - 11 9 7 -','9 12 16 - 12 9','5 7 9 - 7 5','7 11 14 11 9 2','4 - 2 4 0 -']),
    dict(id='contest-fish', title='きらめく鱗の宝石箱', bpm=92, key=62, meter=4, battle=False,
         chords=[(0,4,7),(4,7,11),(5,9,12),(7,11,14),(9,12,16),(2,5,9),(7,11,14),(0,4,7)],
         melody=['7 - 12 - 9 7 4 -','11 - 7 4 7 - 11 -','12 - 9 - 5 7 9 -','11 9 7 - 2 - 7 -',
                 '16 - 12 9 12 - 16 -','14 12 9 - 5 - 2 -','7 - 11 14 12 11 9 7','4 - 7 4 2 - 0 -']),
]

def brass(midi, duration):
    t = np.arange(round((duration + .13) * SR)) / SR
    f = 440 * 2 ** ((midi - 69) / 12)
    voice = sum(np.sin(2*np.pi*f*h*t) / h**1.45 for h in range(1, 8))
    voice *= np.minimum(1, t/.014) * np.exp(-np.maximum(0, t-duration)/.034)
    voice *= np.minimum(1, np.maximum(0, len(t)-1-np.arange(len(t)))/(SR*.025))
    return voice.astype(np.float32)

def drum(kind, rng):
    t = np.arange(round(SR * (.22 if kind == 'kick' else .14))) / SR
    if kind == 'kick':
        v = np.sin(2*np.pi*(62*t + 1.3*(1-np.exp(-t*42)))) * np.exp(-t*22)
    else:
        noise = sosfilt(butter(1, 2300 if kind == 'hat' else 950, 'highpass', fs=SR, output='sos'), rng.normal(0, 1, len(t)))
        v = noise * np.exp(-t*(75 if kind == 'hat' else 25))
        if kind == 'snare': v += .28*np.sin(2*np.pi*182*t)*np.exp(-t*28)
    return (v * np.minimum(1, t/.0015)).astype(np.float32)

def compose(score, index):
    rng = np.random.default_rng(18600 + index)
    beat, meter = 60/score['bpm'], score['meter']
    bars = 32 if score['battle'] else 24 if meter == 3 else 16
    duration = bars * meter * beat
    track = np.zeros((round(duration*SR), 2), np.float32)
    for bar in range(bars):
        chord = score['chords'][bar % 8]
        phrase = score['melody'][bar % 8].split()
        start = bar * meter * beat
        # A / A' / bridge / return; breathing room in the bridge, octave reply in A'.
        bridge = score['battle'] and 16 <= bar < 24
        for cell, note in enumerate(phrase):
            if note == '-' or (bridge and cell % 2): continue
            midi = score['key'] + int(note) + 12
            when = start + cell*.5*beat
            if score['battle']:
                sound = brass(midi, beat*.36 if not bridge else beat*.7)
                old.add(track, sound, when, .14, .12)
                if 8 <= bar < 16: old.add(track, brass(midi-12, beat*.32), when, .045, -.25)
            else:
                old.add(track, seasonal.tone(midi, beat*.5, 'bell' if index == 3 else 'pluck', rng), when, .15, .20)
                if bar >= 8 and cell == 0: old.add(track, seasonal.tone(midi+12, beat, 'bell', rng), when, .025, -.3)
        if score['battle']:
            for cell in range(8):
                n = chord[0] if cell % 4 < 2 else chord[2]
                old.add(track, seasonal.tone(score['key']+n-24, beat*.3, 'bass', rng), start+cell*.5*beat, .13, -.05)
                if not bridge:
                    old.add(track, seasonal.tone(score['key']+chord[cell % 3], beat*.2, 'pluck', rng), start+cell*.5*beat, .055, -.4)
            for offset in [0, 1.5, 2, 3.5]: old.add(track, drum('kick', rng), start+offset*beat, .12, 0)
            for offset in [1, 3]: old.add(track, drum('snare', rng), start+offset*beat, .065, .1)
            for offset in np.arange(0, 4, .5): old.add(track, drum('hat', rng), start+offset*beat, .018, .4)
            if bar % 8 == 7:
                for off in [3, 3.25, 3.5, 3.75]: old.add(track, drum('snare', rng), start+off*beat, .035, -.1)
        else:
            old.add(track, seasonal.tone(score['key']+chord[0]-24, beat, 'bass', rng), start, .11, -.1)
            if meter == 3:
                for offset in [1, 2]:
                    for n in chord: old.add(track, seasonal.tone(score['key']+n, beat*.25, 'piano', rng), start+offset*beat, .045, -.35)
                old.add(track, drum('hat', rng), start+2*beat, .008, .45)
            else:
                for cell in range(8):
                    old.add(track, seasonal.tone(score['key']+chord[cell % 3], beat*.4, 'felt', rng), start+cell*.5*beat, .045, -.35)
                for n in chord: old.add(track, seasonal.tone(score['key']+n-12, beat*3, 'pad', rng), start, .02, -.15)
    dry = track.copy()
    for delay, gain in [(.051,.09),(.109,.06),(.211,.045),(.347,.025)]:
        track += np.roll(dry, round(SR*delay), axis=0)[:, ::-1]*gain
    track *= (.086 if score['battle'] else .078)/max(1e-8, np.sqrt(np.mean(track**2)))
    track *= min(1, .77/max(1e-8, np.max(np.abs(track))))
    return track, duration

if __name__ == '__main__':
    path = ROOT / 'music-tracks.js'
    source = path.read_text(); a = source.index('return {')+7; b = source.rindex('};});')+1
    manifest = json.loads(source[a:b])
    for i, score in enumerate(SCORES):
        track, duration = compose(score, i)
        old.encode(track, OUT/(score['id']+'.mp3'), score['title'])
        manifest[score['id']] = dict(title=score['title'], src='assets/audio/music-v186/'+score['id']+'.mp3', duration=duration, bpm=score['bpm'])
        print(score['id'], round(duration, 3), 'seconds', flush=True)
    path.write_text(source[:a]+json.dumps(manifest, ensure_ascii=False, indent=2)+source[b:])
