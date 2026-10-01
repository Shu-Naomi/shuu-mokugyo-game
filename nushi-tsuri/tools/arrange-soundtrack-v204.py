"""Arrange the existing sixteen scores with sampled acoustic/electric instruments.

The old composers remain the source of truth. Capture their actual foreground
note calls (including rests, bridge omissions and note lengths), then place that
unchanged melody on channel 0. No rescore, transposition or tempo change.

Requires Python/numpy/scipy, libfluidsynth >=2.3, ffmpeg, and GeneralUser GS 2.0.3.
See docs/v204-soundtrack.md for the pinned bank, license and reproduction command.
The bank is used offline; only MP3 loops are downloaded by the game.
"""
from pathlib import Path
import argparse
import ctypes as C
import ctypes.util
import hashlib
import importlib.util
import json
import os
import struct
import subprocess
import wave

import numpy as np
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/audio/music-v204'
SR = 44100
BANK_SHA256 = '9575028c7a1f589f5770fccc8cff2734566af40cd26ed836944e9a5152688cfe'


def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(filename))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


EVENTS = load('events204', 'compose-events-v186.py')
SEASONS, ROOMS = EVENTS.seasonal, EVENTS.old
SCORES = [(s, 'season', SEASONS, i) for i, s in enumerate(SEASONS.SCORES)]
SCORES += [(s, 'room', ROOMS, i) for i, s in enumerate(ROOMS.SCORES) if not s['id'].startswith('map-')]
SCORES += [(s, 'event', EVENTS, i) for i, s in enumerate(EVENTS.SCORES)]

# General MIDI programs are zero-based. ch0 always carries the original melody.
# program, volume, stereo pan, reverb send; percussion uses bank 128 on ch9.
PALETTES = {
    'tournament-masters': {0:(61,110,64,30),1:(30,62,24,12),2:(30,60,104,12),3:(33,105,64,5),4:(48,56,78,52),5:(56,62,52,26),6:(45,66,38,26),9:(0,99,64,16)},
    'tournament-lake': {0:(56,106,64,35),1:(28,64,28,15),2:(60,62,100,32),3:(33,99,64,5),4:(48,58,78,52),5:(61,59,48,35),6:(45,68,36,28),9:(0,92,64,18)},
    'contest-pet': {0:(45,110,68,35),1:(0,67,38,32),3:(32,88,64,12),4:(48,44,82,50),5:(71,42,58,35),9:(40,44,64,18)},
    'contest-fish': {0:(11,107,68,48),1:(46,78,36,42),3:(32,78,64,12),4:(48,46,82,56),5:(8,43,82,48)},
    'map-spring': {0:(0,105,68,35),1:(24,75,36,28),3:(32,77,64,12),4:(48,40,82,54)},
    'map-summer': {0:(75,110,68,26),1:(25,72,32,24),2:(12,52,92,28),3:(33,83,64,8),9:(0,67,64,14)},
    'map-autumn': {0:(25,108,68,26),1:(21,57,36,26),3:(32,85,64,10),4:(45,46,92,30),9:(40,52,64,16)},
    'map-winter': {0:(0,104,68,48),1:(24,66,34,38),3:(32,66,64,18),4:(48,48,84,64),5:(9,34,92,52)},
    'home': {0:(107,111,68,38),1:(24,66,34,34),3:(32,74,64,12),4:(48,36,86,56)},
    'sam': {0:(106,112,68,28),1:(25,63,34,26),3:(33,83,64,8),4:(21,36,90,32),9:(40,49,64,16)},
    'shrine': {0:(77,108,68,55),1:(107,63,34,48),3:(32,57,64,22),4:(48,41,86,67)},
    'inn': {0:(73,105,68,48),1:(24,68,34,38),3:(32,66,64,18),4:(48,39,86,62)},
    'yaoya': {0:(107,110,68,26),1:(12,66,34,24),3:(32,82,64,10),4:(24,44,90,30),9:(40,48,64,16)},
    'diner': {0:(106,106,68,32),1:(24,69,34,30),3:(32,79,64,12),4:(4,41,90,34),9:(40,46,64,16)},
    'fish-market': {0:(106,112,68,26),1:(25,65,34,24),3:(32,86,64,10),4:(21,41,90,28),9:(40,55,64,16)},
    'boats': {0:(73,111,68,35),1:(25,67,34,26),3:(32,81,64,12),4:(21,42,90,34),9:(40,49,64,16)},
}


def original_melody(score, kind, composer, number):
    """Intercept the original composer, rather than reinterpreting its strings."""
    captured = []
    saved = [(ROOMS, 'add'), (ROOMS, 'instrument'), (SEASONS, 'tone'), (EVENTS, 'brass'), (EVENTS, 'drum')]
    originals = [getattr(obj, key) for obj, key in saved]
    def tag(midi, duration, *args):
        return int(midi), float(duration)
    def capture(_track, tone, when, level, pan=0):
        if (kind == 'room' and pan == .13) or (kind == 'season' and pan == .12) or (kind == 'event' and level == (.14 if score['battle'] else .15)):
            captured.append(dict(pitch=tone[0], start=float(when), duration=tone[1]))
    try:
        ROOMS.add, ROOMS.instrument, SEASONS.tone, EVENTS.brass = capture, tag, tag, tag
        EVENTS.drum = lambda *_: None
        _, duration = composer.compose(score, number)
    finally:
        for (obj, key), value in zip(saved, originals):
            setattr(obj, key, value)
    return captured, duration


def arrange(score, kind, reference, duration):
    beat, ident = 60 / score['bpm'], score['id']
    palette, notes = PALETTES[ident], []
    def add(channel, pitch, start, length, velocity=75, role='accompaniment'):
        if channel not in palette:
            return
        assert 0 <= pitch <= 127 and 0 <= start < duration and length > 0
        notes.append(dict(channel=channel, pitch=int(pitch), start=float(start), duration=float(length), velocity=int(max(1,min(127,velocity))), role=role))
    for i, n in enumerate(reference):
        accent = (5,0,-3,1)[i % 4]
        if kind == 'event' and score['battle']:
            bar = int((n['start'] / beat + .00001) // 4)
            velocity = (88 if 16 <= bar < 24 else 105 if bar >= 24 else 98) + accent
        elif ident == 'map-winter':
            velocity = 61 + accent
        elif ident in ('shrine','inn'):
            velocity = 76 + accent
        else:
            velocity = 86 + accent
        add(0,n['pitch'],n['start'],n['duration'],velocity,'melody')
        # Retain the existing A' octave replies; the primary line stays untouched.
        if kind == 'event' and score['battle'] and 8 <= bar < 16:
            add(5,n['pitch']-12,n['start'],beat*.32,63)
        if ident == 'map-winter' and round(n['start']/beat) % 8 == 0:
            add(5,n['pitch']+12,n['start']+.03,.3,46)
        if kind == 'event' and not score['battle'] and n['start'] >= 8*score['meter']*beat and round(n['start']/beat*2) % (2*score['meter']) == 0:
            add(5,n['pitch']+12,n['start'],beat,43)

    if kind == 'event' and score['battle']:
        for bar in range(32):
            t = bar*4*beat
            chord = score['chords'][bar%8]
            bridge, final = 16 <= bar < 24, bar >= 24
            root = score['key'] + chord[0]
            # Real finger bass locks to the existing root/fifth pulse.
            for cell in range(8):
                pitch = score['key']+chord[0 if cell%4<2 else 2]-24
                add(3,pitch,t+cell*.5*beat,beat*.40,91 if cell%2==0 else 76)
            # Two separated guitar performances: small strum delays, no lead delay.
            if not bridge:
                rhythm = [(0,.32),(1.5,.27),(2,.36),(3.5,.27)]
                for offset,length in rhythm:
                    for j,pitch in enumerate([root-12,root-5,root]):
                        add(1,pitch,t+offset*beat+j*.004,beat*length,81 if offset%2==0 else 70)
                        if ident == 'tournament-masters':
                            add(2,pitch,t+offset*beat+.009+j*.003,beat*length,76 if offset%2==0 else 67)
                for cell in range(8):
                    add(6,score['key']+chord[cell%3],t+cell*.5*beat,beat*.24,69 if cell%2==0 else 58)
            for n in chord:
                add(4,score['key']+n-12,t,beat*(3.8 if bridge else 3.6),63 if bridge else 56 if final else 48)
            if ident == 'tournament-lake':
                for off in [0,2]:
                    for n in chord:
                        add(2,score['key']+n-12,t+off*beat,beat*.72,61)
            # The bridge opens space; the return restores full hats and cymbals.
            for off in ([0,2] if bridge else [0,1.5,2,3.5]):
                add(9,36,t+off*beat,.12,108 if off%2==0 else 89)
            for off in [1,3]:
                add(9,38,t+off*beat,.14,88 if bridge else 106)
            for cell in range(8):
                if not bridge or cell%2==0:
                    add(9,51 if final else 42,t+cell*.5*beat,.08,65 if cell%2==0 else 49)
            if bar in [0,8,24]:
                add(9,49,t,.8,96 if bar==24 else 83)
            if bar%8==7:
                for i,off in enumerate([3,3.25,3.5,3.75]):
                    add(9,[38,48,45,43][i],t+off*beat,.14,72+i*7)
    elif kind == 'event':
        meter = score['meter']
        bars = 24 if meter == 3 else 16
        for bar in range(bars):
            t = bar*meter*beat
            chord = score['chords'][bar%8]
            add(3,score['key']+chord[0]-24,t,beat*1.15,81)
            if meter == 3:
                for off in [1,2]:
                    for j,n in enumerate(chord):
                        add(1,score['key']+n,t+off*beat+j*.006,beat*.36,64 if off==1 else 57)
                add(9,37,t+2*beat,.10,44)
            else:
                for cell in range(8):
                    add(1,score['key']+chord[cell%3],t+cell*.5*beat,beat*.42,66 if cell%2==0 else 56)
            for n in chord:
                add(4,score['key']+n-12,t,beat*(meter-.2),51)
    elif kind == 'season':
        for bar in range(16):
            t = bar*4*beat
            chord = score['chords'][bar//2]
            add(3,score['key']+chord[0]-24,t,beat*1.7,76)
            if ident in ('map-summer','map-autumn'):
                add(3,score['key']+chord[2]-24,t+2*beat,beat*1.5,69)
            if ident == 'map-summer':
                for off in [.5,1.5,2.5,3.5]:
                    for j,n in enumerate(chord[:3]):
                        add(1,score['key']+n,t+off*beat+j*.014,beat*.34,66 if off in [.5,2.5] else 58)
                for cell,n in enumerate(chord):
                    add(2,score['key']+n,t+(.25+cell*.75)*beat,beat*.5,56)
                for off in [0,1.5,2,3.5]:
                    add(9,64 if off%2==0 else 62,t+off*beat,.13,69 if off%2==0 else 58)
                for off in np.arange(.5,4,.5):
                    add(9,82,t+float(off)*beat,.07,52 if off%1==0 else 40)
            elif ident == 'map-autumn':
                for off in [1,2.5]:
                    for j,n in enumerate(chord[1:]):
                        add(1,score['key']+n,t+off*beat+j*.009,beat*.32,60)
                for off in [.5,2.5]:
                    add(4,score['key']+chord[2],t+off*beat,beat*.34,48)
                for off in [1,3]:
                    add(9,38,t+off*beat,.12,47)
                    add(9,42,t+(off-.5)*beat,.08,34)
            else:
                for j,n in enumerate(chord):
                    add(1,score['key']+n,t+(j*.75+.25)*beat,beat*.8,55 if ident=='map-winter' else 64)
                for n in chord[:3]:
                    add(4,score['key']+n-12,t,beat*3.8,47 if ident=='map-winter' else 38)
    else:
        patterns={2:[(1.5,0),(3,3)],3:[(.5,0),(2,2),(3,3)],4:[(.5,0),(1.5,2),(2.5,3),(3.5,2)],
                  5:[(.5,0),(1.25,2),(2,3),(2.75,2),(3.5,4)],6:[(.5,0),(1,2),(1.5,3),(2.5,2),(3,4),(3.5,2)]}
        for bar in range(16):
            degree, t = score['bass'][bar//2], bar*4*beat
            root = ROOMS.note(score,degree)
            add(3,root-24,t,beat*2,71)
            if score['drum']:
                add(3,ROOMS.note(score,degree+3)-24,t+2*beat,beat*1.5,63)
            for off,step in patterns[score['density']]:
                add(1,ROOMS.note(score,degree+step)-12,t+off*beat,beat*.65,64 if bar%4!=3 else 54)
            if bar%2==0:
                for step in [0,2,3]:
                    add(4,ROOMS.note(score,degree+step)-12,t,beat*7.7,40 if ident in ('shrine','inn','home') else 47)
            if score['drum']:
                for off in [0,2]:
                    add(9,36,t+off*beat,.13,57)
                for off in [1,3]:
                    add(9,37,t+off*beat,.11,48)
                add(9,42,t+3.5*beat,.07,38)

    # Channel 0 has exactly the old foreground pitches, onsets and note lengths.
    actual=[{k:n[k] for k in ('pitch','start','duration')} for n in notes if n['role']=='melody']
    assert actual == reference, ident+' melody changed'
    return notes


class Synth:
    def __init__(self, bank, palette, spacious=False):
        lib = os.environ.get('NUSHI_FLUIDSYNTH_LIBRARY') or ctypes.util.find_library('fluidsynth')
        if not lib:
            raise RuntimeError('Install libfluidsynth >=2.3 or set NUSHI_FLUIDSYNTH_LIBRARY')
        self.lib = C.CDLL(lib)
        def api(name, result, *args):
            f=getattr(self.lib,name); f.restype=result; f.argtypes=list(args); return f
        ptr, integer, string = C.c_void_p, C.c_int, C.c_char_p
        self.new_settings=api('new_fluid_settings',ptr)
        self.setnum=api('fluid_settings_setnum',integer,ptr,string,C.c_double)
        self.setint=api('fluid_settings_setint',integer,ptr,string,integer)
        self.new_synth=api('new_fluid_synth',ptr,ptr)
        self.sfload=api('fluid_synth_sfload',integer,ptr,string,integer)
        self.select=api('fluid_synth_program_select',integer,ptr,integer,integer,integer,integer)
        self.cc=api('fluid_synth_cc',integer,ptr,integer,integer,integer)
        self.on=api('fluid_synth_noteon',integer,ptr,integer,integer,integer)
        self.off=api('fluid_synth_noteoff',integer,ptr,integer,integer)
        self.write=api('fluid_synth_write_float',integer,ptr,integer,ptr,integer,integer,ptr,integer,integer)
        self.free_synth=api('delete_fluid_synth',None,ptr)
        self.free_settings=api('delete_fluid_settings',None,ptr)
        self.settings=self.new_settings()
        for key,value in {'synth.sample-rate':SR,'synth.gain':.35,'synth.reverb.room-size':.68 if spacious else .50,'synth.reverb.damp':.52,'synth.reverb.width':70,'synth.reverb.level':.26 if spacious else .18}.items():
            assert self.setnum(self.settings,key.encode(),value)==0
        for key,value in {'synth.polyphony':256,'synth.chorus.active':0,'synth.reverb.active':1,'synth.cpu-cores':1,'synth.threadsafe-api':0}.items():
            assert self.setint(self.settings,key.encode(),value)==0
        self.synth=self.new_synth(self.settings)
        self.bank=self.sfload(self.synth,str(bank).encode(),0)
        assert self.bank>=0,'SoundFont could not be loaded'
        for channel,(program,volume,pan,reverb) in palette.items():
            assert self.select(self.synth,channel,self.bank,128 if channel==9 else 0,program)==0
            for controller,value in [(7,volume),(10,pan),(91,reverb)]:
                assert self.cc(self.synth,channel,controller,value)==0

    def samples(self,count):
        result=np.empty((count,2),np.float32)
        if count:
            assert self.write(self.synth,count,result.ctypes.data,0,2,result.ctypes.data,1,2)==0
        return result

    def close(self):
        self.free_synth(self.synth); self.free_settings(self.settings)


def render(bank, score, notes, duration):
    # Repeat integer-sample cycles, then keep the third steady cycle. This carries
    # both release samples and room reverb across the exact browser loop boundary.
    length=round(duration*SR)
    scheduled=[]
    for cycle in range(3):
        for note in notes:
            start=cycle*length+round(note['start']*SR)
            end=start+round(note['duration']*SR)
            scheduled.extend([(start,1,note),(end,0,note)])
    scheduled.sort(key=lambda x:(x[0],x[1]))
    synth=Synth(bank,PALETTES[score['id']],score['id'] in ('shrine','inn','map-winter','contest-fish'))
    blocks=[];cursor=0
    try:
        for position,on,note in scheduled:
            if position>=3*length:
                break
            if position>cursor:
                blocks.append(synth.samples(position-cursor));cursor=position
            if on:
                assert synth.on(synth.synth,note['channel'],note['pitch'],note['velocity'])==0
            else:
                # MIDI noteoff may be redundant on short one-shot percussion.
                synth.off(synth.synth,note['channel'],note['pitch'])
        blocks.append(synth.samples(3*length-cursor))
    finally:
        synth.close()
    audio=np.concatenate(blocks)[2*length:3*length]
    # Apply tone shaping after two extra preceding loop cycles, retaining filter
    # state. This avoids a zero-state low-frequency transient at the first sample.
    highpass=butter(2,32 if score.get('battle') else 27,'highpass',fs=SR,output='sos')
    audio=sosfilt(highpass,np.tile(audio,(3,1)),axis=0)[2*length:]
    audio-=np.mean(audio,axis=0)
    target=.108 if score.get('battle') else .089
    audio*=target/max(1e-9,float(np.sqrt(np.mean(audio**2))))
    # Gentle peak saturation leaves drums distinct while preventing codec overs.
    audio=.83*np.tanh(audio/.83)
    # Sampled voices/reverb have independent phases on successive performances.
    # Correct only the final 2 ms of the tail to meet the opening waveform and
    # slope, rather than adding a pause or fading the whole score at each repeat.
    join=round(SR*.002)
    weight=(1-np.cos(np.linspace(0,np.pi,join)))/2
    target_last=2*audio[0]-audio[1]
    audio[-join:]+=weight[:,None]*(target_last-audio[-1])
    # Reserve headroom for both MP3/resampling overs and equal-power mono
    # downmixes (L+R)/sqrt(2), which are louder than a simple stereo average.
    mono=(audio[:,0]+audio[:,1])/np.sqrt(2)
    audio*=min(1,.68/max(1e-9,float(np.max(np.abs(audio)))),.84/max(1e-9,float(np.max(np.abs(mono)))))
    return audio.astype(np.float32)


def vlq(value):
    output=[value&127]
    while value>>7:
        value>>=7;output.insert(0,(value&127)|128)
    return bytes(output)


def midi(score,notes,duration):
    ppq=9600;beat=60/score['bpm']; tracks=[]
    def track(events):
        events.sort(key=lambda x:(x[0],x[1]))
        data=bytearray();prev=0
        for tick,_,message in events:
            data+=vlq(tick-prev)+message;prev=tick
        data+=b'\x00\xff\x2f\x00'
        return b'MTrk'+struct.pack('>I',len(data))+data
    tempo=round(60_000_000/score['bpm'])
    meter=score.get('meter',4)
    tracks.append(track([(0,0,b'\xff\x51\x03'+tempo.to_bytes(3,'big')),(0,1,b'\xff\x58\x04'+bytes([meter,2,24,8])),(round(duration/beat*ppq),3,b'\xff\x06\x08LOOP_END')]))
    for channel,(program,volume,pan,reverb) in PALETTES[score['id']].items():
        name=('Original melody (unchanged)' if channel==0 else 'Accompaniment '+str(channel)).encode()
        events=[(0,-5,b'\xff\x03'+vlq(len(name))+name),(0,-4,bytes([0xb0|channel,0,1 if channel==9 else 0])),(0,-3,bytes([0xc0|channel,program]))]
        events += [(0,-2,bytes([0xb0|channel,cc,value])) for cc,value in [(7,volume),(10,pan),(91,reverb)]]
        for n in notes:
            if n['channel']!=channel: continue
            start=round(n['start']/beat*ppq);end=round((n['start']+n['duration'])/beat*ppq)
            events.extend([(start,1,bytes([0x90|channel,n['pitch'],n['velocity']])),(end,0,bytes([0x80|channel,n['pitch'],0]))])
        tracks.append(track(events))
    return b'MThd'+struct.pack('>IHHH',6,1,len(tracks),ppq)+b''.join(tracks)


def encode(audio,path,title):
    temporary=path.with_suffix('.tmp.mp3')
    subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ar',str(SR),'-ac','2','-i','pipe:0','-c:a','libmp3lame','-b:a','160k','-metadata','title='+title+' — v204 arrangement','-metadata','artist=Shu / Mameshiba Workshop','-metadata','album=Starfall Lake — Real Instrument Arrangements',str(temporary)],input=audio.astype('<f4').tobytes(),check=True)
    # Validate the complete encoded sample count before replacing a working loop.
    decoded=subprocess.check_output(['ffmpeg','-v','error','-i',str(temporary),'-f','f32le','-ar',str(SR),'-ac','2','pipe:1'])
    assert len(decoded)==len(audio)*8,path.name+' encoded loop was truncated'
    temporary.replace(path)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--soundfont',type=Path,required=True)
    parser.add_argument('--track',action='append',default=[])
    parser.add_argument('--wav-dir',type=Path)
    args=parser.parse_args()
    assert hashlib.sha256(args.soundfont.read_bytes()).hexdigest()==BANK_SHA256,'Use the pinned GeneralUser GS 2.0.3 bank'
    OUT.mkdir(parents=True,exist_ok=True)
    manifest_path=OUT/'arrangement.json'
    manifest=json.loads(manifest_path.read_text()) if manifest_path.exists() else dict(version=204,sampleRate=SR,soundfont=dict(name='GeneralUser GS 2.0.3',sha256=BANK_SHA256,revision='684543d5e5efaef08d02be50dcda8d552478fa60'),tracks={})
    for score,kind,composer,number in SCORES:
        ident=score['id']
        if args.track and ident not in args.track:continue
        reference,duration=original_melody(score,kind,composer,number)
        notes=arrange(score,kind,reference,duration)
        audio=render(args.soundfont,score,notes,duration)
        mp3=OUT/(ident+'.mp3');mid=OUT/(ident+'.mid')
        encode(audio,mp3,score['title']);mid.write_bytes(midi(score,notes,duration))
        source=Path(composer.__file__)
        manifest['tracks'][ident]=dict(title=score['title'],bpm=score['bpm'],duration=duration,source='tools/'+source.name,sourceSha256=hashlib.sha256(source.read_bytes()).hexdigest(),originalMelody=reference,midiSha256=hashlib.sha256(mid.read_bytes()).hexdigest(),audioSha256=hashlib.sha256(mp3.read_bytes()).hexdigest(),instruments={str(ch):dict(program=p,volume=v,pan=pan,reverbSend=r) for ch,(p,v,pan,r) in PALETTES[ident].items()},pcmPeak=float(np.max(np.abs(audio))),pcmRms=float(np.sqrt(np.mean(audio**2))))
        if args.wav_dir:
            args.wav_dir.mkdir(parents=True,exist_ok=True)
            with wave.open(str(args.wav_dir/(ident+'.wav')),'wb') as output:
                output.setparams((2,2,SR,len(audio),'NONE','not compressed'))
                output.writeframes((audio*32767).astype('<i2').tobytes())
        manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
        print(ident, len(reference),'unchanged melody notes',round(duration,3),'sec',round(mp3.stat().st_size/1024),'KiB',flush=True)


if __name__=='__main__':
    main()
