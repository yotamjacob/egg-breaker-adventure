"""Builds one continuous guided-voice MP3 per routine + timeline.json.
The cue schedule here MUST mirror index.html (phase lead-in + cycling cues cut at phase dur)."""
import os, sys, json, wave, math, subprocess, io
import numpy as np
from piper import PiperVoice
from piper.config import SynthesisConfig
import imageio_ffmpeg

MODEL   = os.environ.get("MODEL")
SPEAKER = os.environ.get("SPEAKER")
OUT     = os.environ.get("OUT", "voice")
voice   = PiperVoice.load(MODEL)
SR      = voice.config.sample_rate
syn     = SynthesisConfig(speaker_id=(voice.config.speaker_id_map.get(SPEAKER, int(SPEAKER)) if SPEAKER else None), length_scale=1.06, noise_scale=0.55, noise_w_scale=0.7)

def pulse_cues():
    c=[]
    for i in range(10):
        c.append(dict(label="Pulse %d"%(i+1), t=1, say=["one","two","three","four","five","six","seven","eight","nine","ten"][i]))
        c.append(dict(label="Off", t=1, say=None))
    c.append(dict(label="Rest", t=20, say="Rest"))
    return c
def reps(n, on, a, off, b, first=None):
    """n reps of on/off; on-cue speaks `first` for rep 1 and the rep number after."""
    nums=["one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen","twenty"]
    c=[]
    for i in range(n):
        c.append(dict(label=on, t=a, say=(first or on) if i==0 else nums[i]))
        c.append(dict(label=off, t=b, say=off))
    return c

ROUTINES = {
 "kegel": dict(
   done="Routine complete. Nice work. Remember, the real skill building happens in the field.",
   phases=[
    dict(dur=180, intro="Welcome to your daily control routine. First, slow Kegel holds. Contract your pelvic floor and hold for five seconds, then fully relax for five. Keep your abs, glutes and thighs loose, and breathe normally.",
         cues=[dict(label="Contract",t=5,say="Contract"),dict(label="Relax",t=5,say="Relax")]),
    dict(dur=160, intro="Next, quick Kegel pulses. One second on, one second off, ten times. Then rest for twenty seconds. Four rounds.",
         cues=pulse_cues()),
    dict(dur=120, intro="Endurance hold. Contract at about half effort and hold for ten seconds, then rest for ten. Six reps.",
         cues=[dict(label="Hold · 50%",t=10,say="Hold"),dict(label="Rest",t=10,say="Rest")]),
    dict(dur=120, intro="Reverse Kegels. Gently push outward and downward, as if you were starting to urinate. Hold for five seconds, then relax for five.",
         cues=[dict(label="Push out",t=5,say="Push out"),dict(label="Relax",t=5,say="Relax")]),
   ]),
 "snore": dict(
   done="Routine complete. Nice work. Tongue, palate and cheeks trained. Sleep well.",
   phases=[
    dict(dur=60, intro="Welcome to your daily anti-snore routine. First, nasal breathing posture. Lips closed, teeth slightly apart. Rest the tip of your tongue just behind your upper front teeth, and lightly suction the whole tongue to the roof of your mouth. Now breathe slowly through the nose. In for four, out for six.",
         cues=[dict(label="Inhale",t=4,say="Inhale"),dict(label="Exhale",t=6,say="Exhale")]),
    dict(dur=100, intro="Tongue slide. Press the tip of your tongue against the palate just behind your front teeth, and slide it firmly backward along the roof of your mouth. Then release. Twenty reps.",
         cues=reps(20,"Push & slide",3,"Release",2,first="Slide")),
    dict(dur=100, intro="Tongue suction hold. Suck your whole tongue flat up against the palate, like the start of a click, and hold it there with your lips closed. Then relax. Twenty reps.",
         cues=reps(20,"Suck up · hold",3,"Relax",2,first="Suck up and hold")),
    dict(dur=100, intro="Tongue press down. Keep the tip of your tongue touching your lower front teeth, and push the back of your tongue down against the floor of your mouth. Then relax. Twenty reps.",
         cues=reps(20,"Press down",3,"Relax",2)),
    dict(dur=100, intro="Soft palate lift. Say a strong, open 'ah', and feel the soft palate rise at the back of your throat. Hold the lift, then rest. Twenty reps. The first ten out loud, the last ten silently.",
         cues=reps(20,"Say “Ahh”",3,"Rest",2,first="Say ah")),
    dict(dur=100, intro="Cheek press. Place a clean index finger inside your left cheek and push outward, while the cheek muscle pulls inward against it. Ten reps on the left, then ten on the right.",
         cues=reps(10,"Press · left",3,"Relax",2,first="Press left")+reps(10,"Press · right",3,"Relax",2,first="Now the right side. Press")),
   ]),
}

_cache={}
def tts(text):
    if text in _cache: return _cache[text]
    buf=io.BytesIO(); w=wave.open(buf,"wb")
    voice.synthesize_wav(text, w, syn_config=syn); w.close()
    buf.seek(0); r=wave.open(buf,"rb"); a=np.frombuffer(r.readframes(r.getnframes()),dtype=np.int16).astype(np.float32)/32768
    # trim leading/trailing silence, peak-normalise to -3 dBFS
    nz=np.where(np.abs(a)>0.01)[0]
    if len(nz): a=a[max(0,nz[0]-int(0.05*SR)):nz[-1]+int(0.12*SR)]
    a=a/(np.max(np.abs(a))+1e-6)*0.7
    _cache[text]=a; return a
def chime(f1=660,f2=880,d=0.45):
    t=np.arange(int(SR*d))/SR
    env=np.exp(-t*6)
    return (0.25*np.sin(2*np.pi*f1*t)+0.18*np.sin(2*np.pi*f2*t))*env

def build(rid, cfg):
    events=[]   # (time, samples)
    leads=[]; t=0.0
    for p in cfg["phases"]:
        intro=tts(p["intro"]); ch=chime()
        lead=math.ceil(len(intro)/SR+0.4+1.2)   # chime + speech + a beat before the first cue
        leads.append(lead)
        events.append((t, ch)); events.append((t+0.4, intro))
        t_phase=t+lead; end=t_phase+p["dur"]; tc=t_phase; k=0
        while tc<end-1e-9:
            cue=p["cues"][k%len(p["cues"])]
            if cue["say"]: events.append((tc, tts(cue["say"])))
            tc+=cue["t"]; k+=1
        t=end
    events.append((t, chime(880,1320,0.8))); events.append((t+0.7, tts(cfg["done"])))
    total=t+0.7+len(tts(cfg["done"]))/SR+0.8
    out=np.zeros(int(total*SR)+SR, dtype=np.float32)
    for at,s in events:
        i=int(at*SR); n=min(len(s), len(out)-i)
        if n>0: out[i:i+n]+=s[:n]
    out=np.clip(out,-1,1)
    os.makedirs(OUT,exist_ok=True)
    wavp=os.path.join(OUT,rid+".wav"); w=wave.open(wavp,"wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out*32767).astype(np.int16).tobytes()); w.close()
    mp3=os.path.join(OUT,rid+".mp3")
    subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),"-y","-loglevel","error","-i",wavp,"-ac","1","-ar",str(SR),"-codec:a","libmp3lame","-b:a","48k",mp3],check=True)
    os.remove(wavp)
    return dict(leads=leads, routineSeconds=t, audioSeconds=round(len(out)/SR,2), size=os.path.getsize(mp3))

tl={rid:build(rid,cfg) for rid,cfg in ROUTINES.items()}
json.dump(tl,open(os.path.join(OUT,"timeline.json"),"w"),indent=1)
print(json.dumps(tl,indent=1)); print("utterances",len(_cache),"sr",SR)
