"""Original Starfall Lake music. No sampled instrument or borrowed melody.
Renders circular scores, synthesized plucked strings/bamboo flute, soft percussion,
and sparse wildlife calls. Requires numpy, scipy and ffmpeg; run from anywhere.
"""
import json, math, subprocess, tempfile, sys
from pathlib import Path
import numpy as np
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/audio/music-v170'
SR = 32000
# Each 16-bar score has its own melody, tempo, root, accompaniment and phrasing.
SCORES = [
 dict(id='map-spring', title='春・花びらの小径', bpm=80, root=62, mode=[0,2,5,7,9], lead='koto', bass=[0,3,4,2,0,4,3,0], density=4, drum=.12,
      phrases=['0 1 2 - 3 2 1 -','2 - 3 4 3 - 2 -','1 2 3 - 2 1 0 -','1 - 2 1 0 - - -','2 3 4 - 5 4 3 -','4 - 3 2 1 2 3 -','2 1 0 - 1 2 1 -','0 - - - - - - -']),
 dict(id='map-summer', title='夏・青葉と川風', bpm=96, root=60, mode=[0,2,5,7,9], lead='flute', bass=[0,4,3,0,2,3,4,0], density=6, drum=.24,
      phrases=['2 - 3 4 3 - 2 1','0 - 1 2 3 - - -','4 3 2 - 3 4 5 -','3 - 2 1 0 - - -','2 3 4 5 4 - 3 -','4 - 5 4 3 2 1 -','3 2 1 0 1 - 2 -','1 - 0 - - - - -']),
 dict(id='map-autumn', title='秋・茜の水面', bpm=68, root=57, mode=[0,2,3,7,8], lead='flute', bass=[0,2,4,3,0,4,2,0], density=3, drum=.06,
      phrases=['3 - - 2 1 - 0 -','1 - 2 - 3 - - -','4 - 3 - 2 1 2 -','1 - 0 - - - - -','2 - 3 - 4 - 5 -','4 - - 3 2 - 1 -','2 - 1 - 0 1 2 -','1 - 0 - - - - -']),
 dict(id='map-winter', title='冬・雪待ち灯り', bpm=60, root=62, mode=[0,1,5,7,8], lead='bell', bass=[0,3,2,0,4,2,3,0], density=2, drum=0,
      phrases=['0 - - - 2 - - -','3 - - 2 1 - - -','2 - - - 4 - 3 -','2 - 1 - 0 - - -','3 - - - 4 - - -','5 - 4 - 3 - - -','2 - - 1 2 - 1 -','0 - - - - - - -']),
 dict(id='home', title='ただいま、相棒', bpm=72, root=55, mode=[0,2,5,7,9], lead='koto', bass=[0,2,3,4,0,3,2,0], density=3, drum=0,
      phrases=['0 - 2 - 1 0 - -','- 1 2 3 2 - 1 -','2 - 4 - 3 2 - -','1 - 2 1 0 - - -','0 1 2 - 4 3 2 -','3 - 4 - 3 2 1 -','2 - 1 - 0 - 1 -','0 - - - - - - -']),
 dict(id='sam', title='サムの釣具日和', bpm=92, root=60, mode=[0,2,5,7,9], lead='shamisen', bass=[0,3,0,4,2,3,4,0], density=5, drum=.20,
      phrases=['0 2 - 2 3 - 1 -','2 3 2 - 0 - 1 -','3 4 - 3 2 1 2 -','1 - 0 1 0 - - -','2 4 - 4 5 - 3 -','4 5 4 - 2 3 4 -','3 2 1 - 2 - 1 -','0 - 0 - - - - -']),
 dict(id='shrine', title='星を結ぶ祈り', bpm=56, root=57, mode=[0,1,5,7,8], lead='flute', bass=[0,3,0,2,4,0,3,0], density=2, drum=0,
      phrases=['0 - - - - 1 2 -','3 - - - 2 - - -','4 - - 3 - 2 - -','1 - - - 0 - - -','2 - - - 3 - 4 -','5 - - - 4 - 3 -','2 - - - 1 - 2 -','0 - - - - - - -']),
 dict(id='inn', title='水守りの宵布団', bpm=64, root=53, mode=[0,2,5,7,9], lead='flute', bass=[0,4,2,3,0,2,4,0], density=2, drum=0,
      phrases=['2 - - 1 0 - - -','1 - - 2 3 - - -','2 - 3 - 4 - 3 -','2 - 1 - 0 - - -','3 - - 2 1 - 2 -','4 - - 3 2 - - -','1 - 2 - 1 - 0 -','0 - - - - - - -']),
 dict(id='yaoya', title='朝採れの籠', bpm=100, root=65, mode=[0,2,5,7,9], lead='koto', bass=[0,2,0,3,4,2,3,0], density=5, drum=.14,
      phrases=['2 1 0 1 2 - 3 -','4 - 3 2 1 - 0 -','1 2 3 2 4 - 3 -','2 1 0 - 0 - - -','4 3 2 3 4 - 5 -','3 2 1 2 3 - 4 -','2 - 1 0 1 2 1 -','0 - - 0 - - - -']),
 dict(id='diner', title='湯気の向こうで', bpm=84, root=58, mode=[0,2,5,7,9], lead='shamisen', bass=[0,3,2,4,0,4,3,0], density=4, drum=.13,
      phrases=['1 - 2 3 2 - 0 -','2 - 4 3 2 1 0 -','0 1 2 - 3 - 2 -','1 0 1 - 0 - - -','3 - 4 5 4 - 2 -','4 - 5 4 3 2 1 -','2 3 2 - 1 - 0 -','1 - 0 - - - - -']),
 dict(id='fish-market', title='朝市の銀うろこ', bpm=104, root=55, mode=[0,2,5,7,9], lead='shamisen', bass=[0,4,3,2,0,3,4,0], density=6, drum=.22,
      phrases=['0 0 2 - 3 2 1 -','3 3 4 - 2 - 0 -','1 2 3 4 3 - 2 -','1 0 1 2 0 - - -','2 2 4 - 5 4 3 -','4 4 5 - 3 - 2 -','3 2 1 2 3 - 1 -','0 - 0 - - - - -']),
 dict(id='boats', title='港の舟支度', bpm=88, root=60, mode=[0,2,5,7,9], lead='flute', bass=[0,3,4,0,2,4,3,0], density=4, drum=.18,
      phrases=['0 - 3 - 2 1 0 -','2 - 4 - 3 2 1 -','3 4 3 - 2 - 0 -','1 - 2 - 0 - - -','2 - 5 - 4 3 2 -','4 - 5 4 3 - 2 -','3 2 1 - 2 1 0 -','0 - - - - - - -']),
]


def instrument(midi, duration, kind, rng):
    n=max(1,round((duration+(2.4 if kind in ('koto','bell') else 1.2))*SR)); t=np.arange(n)/SR
    f=440*2**((midi-69)/12)
    if kind in ('koto','shamisen','bass','bell'):
        decay={'koto':1.15,'shamisen':.48,'bass':.72,'bell':1.7}[kind]
        attack=1-np.exp(-t/.0035)
        result=np.zeros(n)
        for h in range(1,11 if kind!='bass' else 5):
            # Stiff string partials, individually decaying; a quieter second
            # string adds a natural chorus rather than a square-wave buzz.
            freq=f*h*(1+.00012*h*h)
            amplitude=(np.sin(np.pi*.19*h)/h if kind!='bell' else 1/h**1.7)
            if kind=='shamisen': amplitude*=1.2 if h%2 else .65
            result+=amplitude*np.sin(2*np.pi*freq*t)*np.exp(-t*(1+h*.32)/decay)
        result+=.07*np.sin(2*np.pi*f*1.002*t)*np.exp(-t/decay)
        result*=attack
        if kind=='shamisen':result+=rng.normal(0,.025,n)*np.exp(-t/.012)*attack
    else:
        hold=max(.15,duration); envelope=np.minimum(1,t/.085)*np.exp(-np.maximum(0,t-hold)/.20)
        envelope*=1+.045*np.sin(2*np.pi*1.4*t)
        bend=-.017*np.exp(-t/.05)+.004*np.sin(2*np.pi*4.8*t)*np.minimum(t/.5,1)
        phase=2*np.pi*f*np.cumsum(1+bend)/SR
        result=(np.sin(phase)+.24*np.sin(phase*2)+.065*np.sin(phase*3))*envelope
        noise=sosfilt(butter(2,[900,6000],btype='bandpass',fs=SR,output='sos'),rng.normal(0,1,n))
        result+=noise*.055*envelope
    result*=np.minimum(1,(n-1-np.arange(n))/(SR*.05))
    return result.astype(np.float32)


def add(track, mono, seconds, level, pan=0):
    index=round(seconds*SR)%len(track); stereo=np.column_stack([mono*np.sqrt((1-pan)/2),mono*np.sqrt((1+pan)/2)])*level
    for start in range(0,len(stereo),len(track)):
        chunk=stereo[start:start+len(track)]; first=min(len(chunk),len(track)-index)
        track[index:index+first]+=chunk[:first]
        if first<len(chunk):track[:len(chunk)-first]+=chunk[first:]
        index=0


def note(score,degree):
    return score['root']+score['mode'][degree%5]+12*(degree//5)


def compose(score,number):
    rng=np.random.default_rng(17000+number); beat=60/score['bpm']; seconds=64*beat
    track=np.zeros((round(seconds*SR),2),np.float32)
    # Eight two-bar phrases leave rests for breath and let the last phrase settle.
    for phrase,pattern in enumerate(score['phrases']):
        cells=pattern.split()
        for cell,value in enumerate(cells):
            if value=='-':continue
            next_note=next((j for j in range(cell+1,8) if cells[j]!='-'),8)
            duration=min(2.5,(next_note-cell)*beat*.80)
            degree=int(value); when=(phrase*8+cell)*beat+.015
            lead=score['lead']; midi=note(score,degree)+(12 if lead=='flute' else 0)
            add(track,instrument(midi,duration,lead,rng),when,.20 if lead=='flute' else .31,.13)
            if phrase in (4,5) and cell in (0,4) and score['id']!='shrine':
                add(track,instrument(note(score,degree)-12,beat,'koto',rng),when+.02,.11,-.27)
    for bar in range(16):
        degree=score['bass'][bar//2]; start=bar*4*beat
        add(track,instrument(note(score,degree)-24,beat*2,'bass',rng),start,.23,-.08)
        pattern={2:[(1.5,0),(3,3)],3:[(.5,0),(2,2),(3,3)],4:[(.5,0),(1.5,2),(2.5,3),(3.5,2)],
                 5:[(.5,0),(1.25,2),(2,3),(2.75,2),(3.5,4)],6:[(.5,0),(1,2),(1.5,3),(2.5,2),(3,4),(3.5,2)]}[score['density']]
        for offset,step in pattern:
            # Open fifths/pentatonic voicings keep the arrangement gentle.
            add(track,instrument(note(score,degree+step)-12,beat*.65,'koto',rng),start+offset*beat,.085 if bar%4!=3 else .064,-.36)
        if score['drum']:
            for offset,high in [(0,False),(2,False),(3.5,True)]:
                t=np.arange(round(SR*.22))/SR
                if high:drum=np.sin(2*np.pi*1550*t)*np.exp(-t*70)+.1*rng.normal(0,1,len(t))*np.exp(-t*110)
                else:drum=np.sin(2*np.pi*(105*t+2.2*(1-np.exp(-t*30))))*np.exp(-t*20)
                drum*=1-np.exp(-t/.002)
                add(track,drum,start+offset*beat,score['drum']*.13,.32 if high else -.18)
    # Circular early reflections preserve both the reverb tail and the exact loop.
    dry=track.copy()
    for delay,gain in [(.073,.11),(.139,.08),(.233,.06),(.367,.045),(.521,.032),(.713,.025)]:
        track+=np.roll(dry,round(delay*SR),axis=0)[:,::-1]*gain
    rms=np.sqrt(np.mean(track**2)); track*=.085/max(rms,1e-8)
    peak=np.max(np.abs(track))
    if peak>.82:track*=.82/peak
    return track,seconds


def encode(track,path,title):
    path.parent.mkdir(parents=True,exist_ok=True)
    temporary=path.with_suffix('.tmp.mp3')
    quality=['-q:a','4'] if path.name.endswith('-birds.mp3') else ['-b:a','80k']
    subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ar',str(SR),'-ac','2','-i','pipe:0','-c:a','libmp3lame',*quality,
                    '-metadata','title='+title,'-metadata','artist=Shu / Mameshiba Workshop','-metadata','album=Starfall Lake — Original Soundtrack',str(temporary)],input=track.astype('<f4').tobytes(),check=True)
    temporary.replace(path)


def wildlife(kind):
    rng=np.random.default_rng(170 if kind=='lake' else 171); seconds=48; track=np.zeros((seconds*SR,2),np.float32)
    times=[2.4,8.7,15.8,27.2,34.9,43.1] if kind=='lake' else [3.8,14.6,25.4,39.0]
    for group,start in enumerate(times):
        pan=float(rng.uniform(-.65,.65))
        count=int(rng.integers(3,6)) if kind=='lake' else int(rng.integers(2,4))
        for call in range(count):
            duration=float(rng.uniform(.07,.18)) if kind=='lake' else float(rng.uniform(.38,.78))
            t=np.arange(round(duration*SR))/SR; u=t/duration
            if kind=='lake':
                base=rng.uniform(2300,3700);freq=base+900*np.sin(u*np.pi*.9)+400*np.sin(u*np.pi*3)
                envelope=np.sin(np.pi*u)**1.3
                tone=np.sin(2*np.pi*np.cumsum(freq)/SR)+.10*np.sin(4*np.pi*np.cumsum(freq)/SR)
                level=.10 if group%2 else .13
                when=start+call*.24
            else:
                # A rising, then falling nasal mew, with irregular throat flutter.
                base=rng.uniform(780,1150);freq=base+380*np.sin(np.pi*u**.45)-210*u
                phase=2*np.pi*np.cumsum(freq)/SR
                tone=np.sin(phase)+.36*np.sin(2*phase)+.18*np.sin(3*phase)
                envelope=(np.sin(np.pi*u)**.75)*(.82+.18*np.sin(2*np.pi*27*t))
                tone+=sosfilt(butter(2,[700,3600],btype='bandpass',fs=SR,output='sos'),rng.normal(0,.08,len(t)))
                level=.095;when=start+call*.91
            add(track,tone*envelope,when,level,pan)
    return track,seconds


def main():
    OUT.mkdir(parents=True,exist_ok=True);manifest={};selected=set(sys.argv[1:])
    for i,score in enumerate(SCORES):
        duration=64*60/score['bpm'];filename=score['id']+'.mp3'
        if not selected or score['id'] in selected:
            track,duration=compose(score,i);encode(track,OUT/filename,score['title'])
        manifest[score['id']]={'title':score['title'],'src':'assets/audio/music-v170/'+filename,'duration':duration,'bpm':score['bpm']}
        print(score['id'],round(duration,2),'s',round((OUT/filename).stat().st_size/1024),'KiB',flush=True)
    for kind in ['lake','harbor']:
        if selected and kind+'-birds' not in selected:continue
        track,duration=wildlife(kind);encode(track,OUT/(kind+'-birds.mp3'),{'lake':'湖畔の小鳥','harbor':'港の海鳥'}[kind])
    payload='/* Original score metadata; generated by tools/compose-soundtrack-v170.py. */\n(function(root,factory){const api=factory();if(typeof module===\'object\'&&module.exports)module.exports=api;else root.ShuMusicTracks=api;})(typeof globalThis!==\'undefined\'?globalThis:this,function(){return '+json.dumps(manifest,ensure_ascii=False,indent=2)+';});\n'
    (ROOT/'music-tracks.js').write_text(payload)
    print('14 original audio assets ready.',flush=True)

if __name__=='__main__':main()
