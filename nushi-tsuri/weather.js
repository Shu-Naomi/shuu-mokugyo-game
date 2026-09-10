/* Daily weather and synthesized rain. The saved game clock is the only seed;
 * neither weather nor its sound consumes the fishing random-number stream. */
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ShuWeather = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const types = Object.freeze({
    sunny: Object.freeze({ id: 'sunny', icon: '☀️', label: '晴れ',
      hint: '「今日は晴れじゃ。湖の浅場ならモロコ、川ならアユが少し寄りやすいぞ」',
      fish: Object.freeze({ moroko: 1.08, ayu: 1.10 }) }),
    cloudy: Object.freeze({ id: 'cloudy', icon: '☁️', label: '曇り',
      hint: '「今日は曇りじゃ。ブラックバスや川のヤマメ、ニジマスが少し狙いやすいぞ」',
      fish: Object.freeze({ bass: 1.12, yamame: 1.12, nijimasu: 1.12, suzuki: 1.08 }) }),
    rain: Object.freeze({ id: 'rain', icon: '🌧️', label: '小雨',
      hint: '「今日は小雨じゃ。ナマズやウナギが少し寄りやすいぞ。夕方から夜なら、なお狙い目じゃ」',
      fish: Object.freeze({ namazu: 1.18, unagi: 1.18, bass: 1.10, suzuki: 1.10, yamame: 1.08 }) }),
  });
  function forecast(minutes = 360) {
    const value = Number(minutes);
    const day = Math.floor((Number.isFinite(value) ? Math.max(0, value) : 360) / 1440);
    // The first three days introduce the weather. Later days are a stable hash,
    // with about 52% sun, 30% cloud and 18% light rain; no repeating weekly cycle.
    if (day < 3) return types[['sunny', 'cloudy', 'rain'][day]];
    let seed = (day + 83) | 0;
    seed = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b);
    seed = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b);
    const roll = ((seed ^ (seed >>> 16)) >>> 0) / 4294967296;
    return types[roll < .52 ? 'sunny' : roll < .82 ? 'cloudy' : 'rain'];
  }
  function fishMultiplier(fishId, minutes, practice = false) {
    return practice ? 1 : forecast(minutes).fish[fishId] || 1;
  }
  const rainBuffers = new WeakMap();
  function createRain(context, destination) {
    let buffer = rainBuffers.get(context);
    if (!buffer) {
      const length = Math.round(context.sampleRate * 3);
      buffer = context.createBuffer(2, length, context.sampleRate);
      for (let channel = 0; channel < 2; channel++) {
        const data = buffer.getChannelData(channel);
        let seed = 92317 + channel * 271, low = 0;
        for (let i = 0; i < length; i++) {
          seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
          const white = seed / 2147483648 - 1;
          low = low * .93 + white * .07;
          const swell = .88 + .08 * Math.sin(i / length * Math.PI * 6 + channel);
          data[i] = (white * .32 + low * 1.5) * swell;
        }
        // A short seam blend avoids a click when this small buffer loops.
        const seam = Math.min(256, Math.floor(length / 4));
        for (let i = 0; i < seam; i++) {
          const mix = i / (seam - 1);
          data[length - seam + i] = data[length - seam + i] * (1 - mix) + data[i] * mix;
        }
      }
      rainBuffers.set(context, buffer);
    }
    const source = context.createBufferSource(), lowpass = context.createBiquadFilter();
    const highpass = context.createBiquadFilter(), gain = context.createGain();
    source.buffer = buffer; source.loop = true;
    source.loopStart = Math.min(256, Math.floor(buffer.length / 4)) / context.sampleRate;
    lowpass.type = 'lowpass'; lowpass.frequency.value = 4300; lowpass.Q.value = .5;
    highpass.type = 'highpass'; highpass.frequency.value = 450; highpass.Q.value = .5;
    gain.gain.setValueAtTime(0, context.currentTime);
    gain.gain.linearRampToValueAtTime(.19, context.currentTime + .7);
    source.connect(lowpass); lowpass.connect(highpass); highpass.connect(gain); gain.connect(destination);
    source.onended = () => { for (const node of [source, lowpass, highpass, gain]) node.disconnect(); };
    source.start();
    let stopped = false;
    return { stop() {
      if (stopped) return false;
      stopped = true;
      gain.gain.cancelScheduledValues(context.currentTime);
      gain.gain.setValueAtTime(gain.gain.value, context.currentTime);
      gain.gain.linearRampToValueAtTime(0, context.currentTime + .18);
      source.stop(context.currentTime + .2);
      return true;
    } };
  }
  return { types, forecast, fishMultiplier, createRain };
});
