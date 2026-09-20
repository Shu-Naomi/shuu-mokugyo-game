"""Four original major-key seasonal scores and two short synthesized pet sounds.
No borrowed melodies/samples. Run with numpy, scipy and ffmpeg installed.
Scores are circular, with tails wrapped into the beginning for seamless loops.
"""
from pathlib import Path
import importlib.util, json, wave
import numpy as np
from scipy.signal import butter, sosfilt

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('previous',Path(__file__).with_name('compose-soundtrack-v170.py'))
old=importlib.util.module_from_spec(spec);spec.loader.exec_module(old)
SR=old.SR
OUT=ROOT/'assets/audio/music-v183'
# Chords are explicit major/minor triads with occasional sixths/ninths, not
# parallel pentatonic shapes: every phrase has a clear tonic and resolution.
SCORES=[
 dict(id='map-spring',title='春・ひだまりの水辺',bpm=76,key=60,lead='piano',
      chords=[(0,4,7,11),(5,9,12,16),(0,4,7,9),(7,11,14,16),(9,12,16,19),(5,9,12,16),(2,5,9,12),(7,11,14,17)],
      melody=['4 - 7 - 9 7 4 -','2 - 4 5 4 - 0 -','7 - 9 - 12 - 9 7','4 - 2 - 0 - - -','9 - 12 - 14 12 9 -','7 - 9 7 5 - 4 -','2 - 5 - 7 5 2 -','4 - 2 - 0 - - -']),
 dict(id='map-summer',title='夏・サンシャイン桟橋',bpm=104,key=62,lead='pan',
      chords=[(0,4,7,9),(7,11,14,16),(9,12,16,19),(5,9,12,14),(0,4,7,9),(5,9,12,16),(7,11,14,17),(0,4,7,9)],
      melody=['7 9 - 12 9 - 7 4','2 - 7 9 - 7 4 -','9 12 - 16 14 12 9 -','5 - 9 7 - 5 4 -','12 14 16 - 14 12 9 -','9 - 12 9 7 - 5 4','7 9 - 11 14 - 11 7','4 - 2 4 0 - - -']),
 dict(id='map-autumn',title='秋・木の葉のステップ',bpm=92,key=65,lead='pluck',
      chords=[(0,4,7,11),(2,5,9,12),(7,11,14,17),(0,4,7,9),(9,12,16,19),(5,9,12,16),(7,11,14,17),(0,4,7,11)],
      melody=['4 - 7 9 - 7 4 -','5 - 9 - 12 9 5 -','7 - 11 14 - 11 7 -','4 2 - 0 - - - -','9 - 12 16 - 12 9 -','9 7 - 5 - 4 5 -','7 - 11 - 9 7 2 -','4 - 2 4 0 - - -']),
 dict(id='map-winter',title='冬・雪明かりの毛布',bpm=68,key=63,lead='felt',
      chords=[(0,4,7,11),(5,9,12,16),(0,4,7,9),(7,11,14,16),(9,12,16,19),(5,9,12,16),(7,11,14,17),(0,4,7,11)],
      melody=['7 - - 4 - - 2 -','5 - 9 - 7 - - -','4 - - 7 - - 9 -','7 - 4 - 2 - - -','9 - - 12 - - 16 -','12 - 9 - 7 - 5 -','7 - - 11 9 - 7 -','4 - 2 - 0 - - -']),
]

def tone(midi,duration,kind,rng):
    f=440*2**((midi-69)/12);tail=1.4 if kind in ('pad','felt','bell') else .5
    t=np.arange(round((duration+tail)*SR))/SR;v=np.zeros_like(t)
    if kind=='pad':
        for h,a in [(1,1),(2,.13),(3,.04)]:v+=a*(np.sin(2*np.pi*f*h*t)+.28*np.sin(2*np.pi*f*h*1.0017*t))
        v*=np.minimum(t/.28,1)*np.exp(-np.maximum(0,t-duration)/.45)
    elif kind=='pan':
        for h,a in [(1,1),(2,.28),(3,.15),(4.02,.07)]:v+=a*np.sin(2*np.pi*f*h*t)*np.exp(-t*(2.4+h*.4))
        v*=1-np.exp(-t/.004)
    else:
        decay={'piano':1.0,'felt':1.55,'guitar':.7,'pluck':.23,'bass':.48,'bell':1.8}.get(kind,.8)
        for h in range(1,7):
            level=(1/h**(1.65 if kind in ('felt','bass') else 1.35))
            if kind=='guitar':level*=abs(np.sin(h*.63))
            v+=level*np.sin(2*np.pi*f*h*(1+.000015*h*h)*t)*np.exp(-t*(1+.35*h)/decay)
        v*=1-np.exp(-t/(.008 if kind=='felt' else .003))
        if kind=='pluck':v+=rng.normal(0,.015,len(t))*np.exp(-t/.007)
    v*=np.minimum(1,np.maximum(0,len(t)-1-np.arange(len(t)))/(SR*.03))
    return v.astype(np.float32)

def compose(score,number):
    rng=np.random.default_rng(18300+number);beat=60/score['bpm'];duration=64*beat
    track=np.zeros((round(duration*SR),2),np.float32)
    summer=number==1;autumn=number==2;winter=number==3
    for phrase,pattern in enumerate(score['melody']):
        cells=pattern.split()
        for i,n in enumerate(cells):
            if n=='-':continue
            # Two-bar phrases; the paired responses leave air between lines.
            when=(phrase*8+i)*beat
            length=beat*(.40 if autumn else .78)
            old.add(track,tone(score['key']+int(n)+12,length,score['lead'],rng),when,.13 if winter else .18,.12)
            if winter and i==0:old.add(track,tone(score['key']+int(n)+24,.3,'bell',rng),when+.03,.027,.42)
    for bar in range(16):
        chord=score['chords'][bar//2];when=bar*4*beat
        old.add(track,tone(score['key']+chord[0]-24,beat,'bass',rng),when,.13,-.10)
        if summer:old.add(track,tone(score['key']+chord[2]-24,beat,'bass',rng),when+2*beat,.10,-.1)
        if summer:
            for offset in [.5,1.5,2.5,3.5]:
                for j,n in enumerate(chord[:3]):old.add(track,tone(score['key']+n,.25,'guitar',rng),when+offset*beat+j*.017,.075,-.35)
        elif autumn:
            for offset in [1,2.5]:
                for j,n in enumerate(chord[1:]):old.add(track,tone(score['key']+n,.16,'pluck',rng),when+offset*beat+j*.009,.055,-.30)
        else:
            for j,n in enumerate(chord):old.add(track,tone(score['key']+n,beat,'felt' if winter else 'guitar',rng),when+(j*.75+.25)*beat,.052,-.3)
            if winter:
                for n in chord[:3]:old.add(track,tone(score['key']+n-12,beat*3.1,'pad',rng),when,.021,-.1)
        if summer or autumn:
            for off in ([0,1.5,2,3.5] if summer else [1,3]):
                t=np.arange(round(SR*.12))/SR
                drum=np.sin(2*np.pi*(180*t+1.2*(1-np.exp(-t*55))))*np.exp(-t*45)*(1-np.exp(-t/.002))
                old.add(track,drum,when+off*beat,.053 if summer else .024,.25)
            if summer:
                for off in np.arange(.5,4,.5):
                    t=np.arange(round(SR*.045))/SR
                    shaker=sosfilt(butter(1,3500,'highpass',fs=SR,output='sos'),rng.normal(0,1,len(t)))*np.sin(np.pi*t/.045)**2
                    old.add(track,shaker,when+off*beat,.019,.5)
    dry=track.copy()
    for d,g in ([(.043,.06),(.083,.04)] if autumn else [(.063,.1),(.121,.08),(.213,.05),(.337,.035)]):track+=np.roll(dry,round(SR*d),axis=0)[:,::-1]*g
    track*=.092/max(1e-8,np.sqrt(np.mean(track**2)));peak=np.max(np.abs(track))
    if peak>.78:track*=.78/peak
    return track,duration

def wav(name,data,rate=24000,peak=.58):
    data=data-np.mean(data);data*=min(1,peak/max(1e-9,np.max(np.abs(data))))
    fade=min(240,len(data)//8);data[:fade]*=np.linspace(0,1,fade);data[-fade:]*=np.linspace(1,0,fade)
    dest=ROOT/'assets/audio'/name;dest.parent.mkdir(parents=True,exist_ok=True)
    with wave.open(str(dest),'wb') as w:w.setparams((1,2,rate,len(data),'NONE','not compressed'));w.writeframes((data*32767).astype('<i2').tobytes())

def effects():
    rate=24000;rng=np.random.default_rng(183);t=np.arange(round(rate*.68))/rate
    # Soft, short nasal voice: variable harmonic excitation + breath/formants.
    # No long sine glissando, regular vibrato or octave-down playback.
    f0=np.interp(t,[0,.07,.20,.40,.56,.68],[590,630,645,565,505,465])
    f0*=1+.005*sosfilt(butter(1,35,fs=rate,output='sos'),rng.normal(0,1,len(t)))
    phase=2*np.pi*np.cumsum(f0)/rate;voice=np.zeros_like(t)
    for h in range(1,12):
        amp=(.24/h**1.5 + .14*np.exp(-((h*f0-1550)/550)**2)/h+.06*np.exp(-((h*f0-3200)/850)**2)/h)
        voice+=amp*np.sin(h*phase+.07*h)
    breath=sosfilt(butter(2,[800,3800],btype='bandpass',fs=rate,output='sos'),rng.normal(0,.05,len(t)))
    env=np.minimum(1,t/.065)**1.3*np.minimum(1,(.68-t)/.23)**1.5
    env*=.85+.15*np.sin(np.pi*t/.68)
    voice=(voice+breath)*env
    voice=voice/max(np.max(np.abs(voice)),1e-8)*.52
    wav('dog-friendly-whine-v183.wav',voice)
    t=np.arange(round(rate*.16))/rate
    phase=2*np.pi*np.cumsum(950*np.exp(-t*24)+150)/rate
    pop=np.sin(phase)*np.exp(-t*39)*(1-np.exp(-t/.004))
    ripple=sosfilt(butter(2,[900,4000],btype='bandpass',fs=rate,output='sos'),rng.normal(0,.12,len(t)))*np.exp(-t*40)
    wav('fish-feed-v183.wav',(pop*.30+ripple)*np.minimum(1,t/.003),peak=.36)

if __name__=='__main__':
    manifest_path=ROOT/'music-tracks.js';source=manifest_path.read_text();a=source.index('return {')+7;b=source.rindex('};});')+1
    manifest=json.loads(source[a:b]);OUT.mkdir(parents=True,exist_ok=True)
    for i,score in enumerate(SCORES):
        track,duration=compose(score,i);old.encode(track,OUT/(score['id']+'.mp3'),score['title'])
        manifest[score['id']]={'title':score['title'],'src':'assets/audio/music-v183/'+score['id']+'.mp3','duration':duration,'bpm':score['bpm']}
        print(score['id'],round(duration,2),'seconds',flush=True)
    manifest_path.write_text(source[:a]+json.dumps(manifest,ensure_ascii=False,indent=2)+source[b:])
    effects()
