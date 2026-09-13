"""Compose the original, short friendly dog whine used by rival greetings.

Only Python's standard library is needed. The existing recorded greeting bark
is reused separately; this soft, harmonic whine supplies the affectionate reply.
"""
import math
from pathlib import Path
import random
import struct
import wave

RATE = 24000
DURATION = .92


def compose():
    rng = random.Random(181)
    phase = 0.0
    samples = []
    for i in range(round(RATE * DURATION)):
        t = i / RATE
        p = t / DURATION
        pitch = 340 + 135 * math.sin(math.pi * p ** .7) - 38 * p
        pitch *= 1 + .011 * math.sin(t * 2 * math.pi * 6.2)
        phase += 2 * math.pi * pitch / RATE
        envelope = min(1, t / .09) ** 1.5 * min(1, (DURATION - t) / .26) ** 1.8
        envelope *= .78 + .22 * math.sin(math.pi * p)
        voice = sum(level * math.sin(phase * harmonic + .08 * math.sin(t * 91))
                    for harmonic, level in [(1, .68), (2, .24), (3, .16), (4, .07), (5, .025)])
        # A little breath and uneven voicing soften the otherwise pure tone.
        voice *= .94 + .06 * math.sin(phase * .49)
        voice += rng.uniform(-1, 1) * .018
        samples.append(voice * envelope)
    peak = max(abs(value) for value in samples)
    return [round(value / peak * 23000) for value in samples]


if __name__ == "__main__":
    destination = Path(__file__).resolve().parents[1] / "assets/audio/dog-friendly-whine-v181.wav"
    samples = compose()
    with wave.open(str(destination), "wb") as output:
        output.setparams((1, 2, RATE, len(samples), "NONE", "not compressed"))
        output.writeframes(struct.pack("<" + "h" * len(samples), *samples))
    print(f"{destination.name}: {len(samples) / RATE:.2f}s, peak {max(abs(s) for s in samples)}")
