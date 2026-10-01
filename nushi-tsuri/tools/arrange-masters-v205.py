"""Heavier rock arrangement of the SAME 203-note masters melody.

Uses the pinned v204 sample bank and original v186 performance. Only this track
is regenerated. Separate guitar, bass, orchestra and Power-kit drum buses allow
the low register and rhythm to carry weight without merely turning up the song.
"""
from pathlib import Path
import argparse
import hashlib
import importlib.util
import json
import subprocess
import wave

import numpy as np
from scipy.ndimage import uniform_filter1d
from scipy.signal import butter, sosfilt

spec=importlib.util.spec_from_file_location('arrangements204',Path(__file__).with_name('arrange-soundtrack-v204.py'))
A=importlib.util.module_from_spec(spec);spec.loader.exec_module(A)
SR,ROOT=A.SR,A.ROOT
OUT=ROOT/'assets/audio/music-v205'
PALETTE={0:(29,118,64,18),7:(30,93,66,15),1:(30,122,18,10),2:(30,119,110,10),
         3:(34,122,64,5),4:(48,91,82,35),5:(61,90,57,25),6:(44,85,40,24),9:(16,127,64,10)}
BUSES={'lead':[0,7],'rhythm':[1,2],'bass':[3],'strings':[4,6],'brass':[5],'drums':[9]}
BUS_RMS={'lead':.082,'rhythm':.090,'bass':.063,'strings':.045,'brass':.027,'drums':.084}


def arrange(score,reference,duration):
    notes=[];beat=60/score['bpm']
    def add(ch,pitch,start,length,velocity,role='accompaniment'):
        assert 0<=pitch<128 and 0<=start<duration and length>0
        notes.append(dict(channel=ch,pitch=int(pitch),start=float(start),duration=float(length),velocity=int(velocity),role=role))
    for i,n in enumerate(reference):
        bar=int((n['start']/beat+.00001)//4)
        bridge=16<=bar<24
        strength=(95 if bridge else 112 if bar>=24 else 106)+(4,0,-2,1)[i%4]
        add(0,n['pitch'],n['start'],n['duration'],strength,'melody')
        # Lower octave reinforces the SAME contour; foreground ch0 is untouched.
        add(7,n['pitch']-12,n['start'],n['duration'],strength-13)
        add(5,n['pitch']-12,n['start'],n['duration'],77 if bridge else 89 if bar>=24 else 81)
    for bar in range(32):
        start=bar*4*beat;chord=score['chords'][bar%8];root=score['key']+chord[0]
        bridge,final=16<=bar<24,bar>=24
        # E1-region picked bass, voiced an octave lower than the v204 bass.
        for cell in range(8):
            pitch=score['key']+chord[0 if cell%4<2 else 2]-36
            add(3,pitch,start+cell*.5*beat,beat*.46,112 if cell%4==0 else 99 if cell%2==0 else 87)
        # E2-region power chords, not the old higher, sparse chord jabs.
        # The two takes have separate pan, velocity and tiny strum delays.
        cells=[0,4] if bridge else range(8)
        for cell in cells:
            length=1.65 if bridge else .46 if final else .43 if cell%4==0 else .32
            for ch,delay,change in [(1,0,0),(2,.009,-4)]:
                for j,pitch in enumerate([root-24,root-17,root-12]):
                    add(ch,pitch,start+cell*.5*beat+delay+j*.002,beat*length,
                        (109 if final else 96 if bridge else 102)+(4 if cell%4==0 else -5)+change)
        for offset in ([0] if bridge else [0,2]):
            for n in chord:
                add(4,score['key']+n-12,start+offset*beat,beat*(3.8 if bridge else 1.86),
                    91 if final else 77 if bridge else 82)
        # Bowed ostinato replaces the delicate pizzicato of the first arrangement.
        for cell in (range(0,8,2) if bridge else range(8)):
            add(6,score['key']+chord[cell%3]-12,start+cell*.5*beat,beat*.40,82 if cell%2==0 else 71)
        kicks=[0,2] if bridge else [0,.5,1.5,2,2.75,3.5]
        if final:kicks=[0,.5,.75,1.5,2,2.25,2.5,3.5]
        for off in kicks:add(9,36,start+off*beat,.16,123 if off%2==0 else 111)
        for off in ([2] if bridge else [1,3]):add(9,38,start+off*beat,.19,116 if not bridge else 108)
        for cell in (range(0,8,2) if bridge else range(8)):
            add(9,51 if final else 42,start+cell*.5*beat,.12,80 if cell%2==0 else 61)
        if not bridge and bar%2==1:add(9,46,start+3.5*beat,.19,73)
        if bar in [0,8,16,24] or (final and bar%2==0):add(9,49,start,.9,119 if final else 103)
        if bar%8==7:
            for i,off in enumerate([3,3.25,3.5,3.75]):
                add(9,[38,48,45,43][i],start+off*beat,.17,103+i*5)
    assert [{k:n[k] for k in ('pitch','start','duration')} for n in notes if n['role']=='melody']==reference
    return notes


def raw_bus(bank,palette,notes,duration):
    length=round(duration*SR);scheduled=[]
    for cycle in range(3):
        for n in notes:
            start=cycle*length+round(n['start']*SR)
            scheduled.extend([(start,1,n),(start+round(n['duration']*SR),0,n)])
    scheduled.sort(key=lambda e:(e[0],e[1]));synth=A.Synth(bank,palette)
    blocks=[];cursor=0
    try:
        for position,on,n in scheduled:
            if position>=3*length:break
            if position>cursor:blocks.append(synth.samples(position-cursor));cursor=position
            if on:assert synth.on(synth.synth,n['channel'],n['pitch'],n['velocity'])==0
            else:synth.off(synth.synth,n['channel'],n['pitch'])
        blocks.append(synth.samples(3*length-cursor))
    finally:synth.close()
    return np.concatenate(blocks)[2*length:]


def filtered(audio,frequency,kind):
    length=len(audio)
    return sosfilt(butter(2,frequency,kind,fs=SR,output='sos'),np.tile(audio,(3,1)),axis=0)[2*length:]


def normalized(audio,rms):
    return audio*(rms/max(1e-9,float(np.sqrt(np.mean(audio**2)))))


def parallel_compress(audio,threshold,wet):
    envelope=np.sqrt(np.maximum(1e-12,uniform_filter1d(np.mean(audio**2,axis=1),round(SR*.010),mode='wrap')))
    gain=np.minimum(1,(threshold/np.maximum(envelope,1e-9))**.75)
    gain=uniform_filter1d(gain,round(SR*.006),mode='wrap')
    return audio*((1-wet)+wet*gain[:,None])


def mix(bank,notes,duration):
    result=np.zeros((round(duration*SR),2),np.float64);levels={}
    for name,channels in BUSES.items():
        palette={ch:PALETTE[ch] for ch in channels}
        audio=raw_bus(bank,palette,[n for n in notes if n['channel'] in channels],duration)
        audio-=np.mean(audio,axis=0)
        if name in ('lead','rhythm'):
            audio=filtered(audio,95 if name=='lead' else 65,'highpass')
            audio=normalized(audio,.15)
            # Saturated guitar body, followed by cabinet-like treble roll-off.
            audio=np.tanh(audio*(2.2 if name=='rhythm' else 1.4))
            audio=filtered(audio,5500 if name=='rhythm' else 7200,'lowpass')
            if name=='rhythm':audio+=.45*filtered(audio,500,'lowpass')
        elif name=='bass':
            audio=filtered(audio,31,'highpass');audio=filtered(audio,3200,'lowpass')
            audio=normalized(audio,.12);audio=.6*np.tanh(audio/.6)
            audio+=.28*filtered(audio,220,'lowpass')
        elif name=='drums':
            audio=filtered(audio,31,'highpass')
            audio=normalized(audio,.13);audio=parallel_compress(audio,.085,.78)
        else:
            audio=filtered(audio,170 if name=='brass' else 110,'highpass')
        audio=normalized(audio,BUS_RMS[name]);result+=audio
        levels[name]=float(np.sqrt(np.mean(audio**2)))
        print('Recorded',name,'bus',flush=True)
    result=normalized(result,.145)
    result=.78*np.tanh(result/.78)
    # Keep codec and mono headroom, and meet the loop without an end pause.
    count=round(SR*.002);weight=(1-np.cos(np.linspace(0,np.pi,count)))/2
    result[-count:]+=weight[:,None]*(2*result[0]-result[1]-result[-1])
    mono=(result[:,0]+result[:,1])/np.sqrt(2)
    result*=min(1,.68/max(1e-9,float(np.max(np.abs(result)))),.84/max(1e-9,float(np.max(np.abs(mono)))))
    return result.astype(np.float32),levels


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--soundfont',required=True,type=Path)
    parser.add_argument('--wav-dir',type=Path)
    args=parser.parse_args()
    assert hashlib.sha256(args.soundfont.read_bytes()).hexdigest()==A.BANK_SHA256
    score,kind,composer,number=next(s for s in A.SCORES if s[0]['id']=='tournament-masters')
    reference,duration=A.original_melody(score,kind,composer,number)
    notes=arrange(score,reference,duration);audio,levels=mix(args.soundfont,notes,duration)
    OUT.mkdir(parents=True,exist_ok=True)
    mp3,mid=OUT/'tournament-masters.mp3',OUT/'tournament-masters.mid'
    A.PALETTES[score['id']]=PALETTE
    temporary=OUT/'tournament-masters.tmp.mp3'
    subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ar',str(SR),'-ac','2','-i','pipe:0',
                    '-c:a','libmp3lame','-b:a','160k','-metadata','title='+score['title']+' — v205 Heavy Rock',
                    '-metadata','artist=Shu / Mameshiba Workshop',str(temporary)],input=audio.astype('<f4').tobytes(),check=True)
    decoded=subprocess.check_output(['ffmpeg','-v','error','-i',str(temporary),'-f','f32le','-ar',str(SR),'-ac','2','pipe:1'])
    assert len(decoded)==len(audio)*8,'Encoded score was truncated'
    temporary.replace(mp3);temporary.unlink(missing_ok=True)
    mid.write_bytes(A.midi(score,notes,duration))
    old=json.loads((ROOT/'assets/audio/music-v204/arrangement.json').read_text())
    record=dict(title=score['title'],bpm=score['bpm'],duration=duration,audioSrc='assets/audio/music-v205/tournament-masters.mp3',
                source='tools/'+Path(composer.__file__).name,sourceSha256=hashlib.sha256(Path(composer.__file__).read_bytes()).hexdigest(),
                originalMelody=reference,midiSha256=hashlib.sha256(mid.read_bytes()).hexdigest(),audioSha256=hashlib.sha256(mp3.read_bytes()).hexdigest(),
                instruments={str(ch):dict(program=p,volume=v,pan=pan,reverbSend=r) for ch,(p,v,pan,r) in PALETTE.items()},
                pcmPeak=float(np.max(np.abs(audio))),pcmRms=float(np.sqrt(np.mean(audio**2))),mix=dict(busRms=levels,bassOctave=-36,rhythmOctave=-24))
    assert reference==old['tracks']['tournament-masters']['originalMelody'],'Original melody reference changed'
    (OUT/'arrangement.json').write_text(json.dumps(dict(version=205,sampleRate=SR,soundfont=old['soundfont'],tracks={score['id']:record}),ensure_ascii=False,indent=2)+'\n')
    if args.wav_dir:
        args.wav_dir.mkdir(parents=True,exist_ok=True)
        with wave.open(str(args.wav_dir/'tournament-masters-v205.wav'),'wb') as output:
            output.setparams((2,2,SR,len(audio),'NONE','not compressed'));output.writeframes((audio*32767).astype('<i2').tobytes())
    print('Masters:',len(reference),'unchanged melody notes,',duration,'seconds',flush=True)


if __name__=='__main__':main()
