/* Cosmetic swim styles only: no catch probabilities, fight physics or saves. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ShuFishMotion=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  // These are restrained animation choices for the existing elevated-camera
  // drawings, not a biological simulation. The head/fin roots stay connected.
  const families={
    cruise:{amplitude:6,shoulder:.27,falloff:1.65,wave:3.9,fin:1.6,pulse:.10},
    swift:{amplitude:5,shoulder:.43,falloff:1.7,wave:4.5,fin:1.2,pulse:.06},
    hover:{amplitude:3.8,shoulder:.38,falloff:1.9,wave:3.4,fin:2.6,pulse:.25},
    bottom:{amplitude:4.5,shoulder:.30,falloff:1.8,wave:4.1,fin:1.8,pulse:.40},
    long:{amplitude:12,shoulder:.16,falloff:1.3,wave:6.9,fin:1,pulse:.12},
    flat:{amplitude:3.5,shoulder:.34,falloff:1.6,wave:5.8,fin:2.1,pulse:.32},
    heavy:{amplitude:6.5,shoulder:.32,falloff:1.8,wave:3.3,fin:1.7,pulse:.17},
  };
  const groups={
    cruise:'moroko funa ayu yamame nijimasu iwana amago bora suzuki madai isaki ugui kawamutsu herabuna himemasu aburahaya bluegill tanago motsugo nigoi',
    swift:'aji wakasagi oikawa sayori masaba akakamasu buri hiramasa kanpachi shimaaji',
    hover:'mebaru kawahagi oyanirami medaka',
    bottom:'kasago shirogisu ainame kajika kamatsuka mahaze gigi kawayoshinobori akahata donko',
    long:'unagi dojo utsubo',flat:'hirame magochi',
    heavy:'koi namazu bass kurodai ishidai ishigakidai raigyo streamNushi coastNushi caveNushi starNushi nushi',
  };
  const variations={unagi:[1.05,.97],dojo:[.78,1.18],utsubo:[1.08,1],koi:[.84,.9],namazu:[1.12,1.12],
    medaka:[.68,1.1],kawahagi:[.65,.85],buri:[1.08,.98],hiramasa:[.88,1.1],kanpachi:[1.12,.92],
    donko:[.78,.86],tanago:[.72,1.04],moroko:[.82,1.08],hirame:[.78,1.15],magochi:[.76,.85]};
  const profiles={};
  for(const [family,ids]of Object.entries(groups))for(const id of ids.split(' ')){
    const v=variations[id]||[1,1],p=families[family];
    profiles[id]=Object.freeze({...p,family,amplitude:p.amplitude*v[0],wave:p.wave*v[1]});
  }
  const aliases={buriMojako:'buri',buriYoung:'buri',tanagoGold:'tanago',raigyoAlbino:'raigyo',kamatsukaAlbino:'kamatsuka',
    madaiBlue:'madai',dojoAlbino:'dojo',unagiAlbino:'unagi',medakaGold:'medaka',namazuAlbino:'namazu',koiGold:'koi',funaGold:'funa'};
  const profile=id=>profiles[aliases[id]||id]||profiles.moroko;
  // Donko settles between short, smooth advances. This continuous clock is
  // cosmetic only; no timers, randomness, save state or game-time changes.
  function travelClock(id,seconds,individual=0){
    const t=Math.max(0,Number(seconds)||0);
    if(id!=='donko')return t;
    const cycle=4.4,offset=individual*.41,clock=t+offset,turn=Math.floor(clock/cycle),part=clock/cycle-turn;
    const p=Math.max(0,Math.min(1,(part-.56)/.44));
    return turn*cycle+cycle*p*p*(3-2*p)-offset;
  }
  function phase(id,seconds,speed=1,bottom=false,individual=0){
    if(id==='donko'){
      const t=Math.max(0,Number(seconds)||0);
      // The body may settle, but gentle fin/breathing motion never freezes.
      seconds=.16*t+.84*(travelClock(id,t,individual)-travelClock(id,0,individual));
    }
    const p=profile(id),clock=Math.max(0,Number(seconds)||0)*speed;
    // The derivative remains positive: a tail push eases into a glide rather
    // than pausing in an integer pose. Individual offsets prevent lockstep.
    return (clock+p.pulse*Math.sin(clock*1.7+individual))/(bottom?.24:.18)+individual;
  }
  // Fight-only effort. Aquarium gait and all simulation inputs remain unchanged.
  // Heavy fish load a broad stroke then glide; swift fish use quicker, tighter
  // strokes. These are artistic rhythms, not biological measurements.
  const fightFamilies={
    cruise:{cycle:1.6,cadence:3.2,effort:1.85},
    swift:{cycle:1.05,cadence:4.8,effort:1.65},
    hover:{cycle:1.3,cadence:3.5,effort:1.65},
    bottom:{cycle:1.9,cadence:2.6,effort:1.8},
    long:{cycle:1.8,cadence:2.8,effort:1.65},
    flat:{cycle:2.1,cadence:2.2,effort:1.55},
    heavy:{cycle:2.2,cadence:3,effort:2.15},
  };
  const fightBosses={
    streamNushi:{cycle:1.5,cadence:4.2,effort:2.2},
    coastNushi:{cycle:1.9,cadence:3.6,effort:2.4},
    caveNushi:{cycle:2.5,cadence:2.6,effort:2.35},
    nushi:{cycle:2.2,cadence:3.2,effort:2.45},
    starNushi:{cycle:2.35,cadence:4,effort:2.8},
  };
  for(const p of [...Object.values(fightFamilies),...Object.values(fightBosses)])Object.freeze(p);
  const fightProfile=id=>fightBosses[id]||fightFamilies[profile(id).family];
  function fight(id,seconds,options={}){
    if(options.reduced)return {extraFrame:0,effort:1};
    const p=fightProfile(id),t=Math.max(0,Number(seconds)||0),angle=t*Math.PI*2/p.cycle;
    // Positive derivative and no mood-dependent phase reset: a new window,
    // warning or turn never reverses or jumps the tail's cycle.
    const extraFrame=t*p.cadence+.15*p.cadence*p.cycle/(Math.PI*2)*Math.sin(angle);
    const age=Math.max(0,Number(options.age)||0),remaining=Number.isFinite(options.remaining)?Math.max(0,options.remaining):1;
    const envelope=Math.min(1,age/.24,remaining/.24);
    const surge=.35+.65*((1+Math.sin(angle))/2)**2;
    const effort=options.quiet?1:options.calm?1.25:1.25+(p.effort-1.25)*envelope*surge;
    return {extraFrame,effort};
  }
  return Object.freeze({profile,phase,travelClock,fight,fightProfile,profiles:Object.freeze(profiles)});
});
