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
    bottom:'kasago shirogisu ainame kajika kamatsuka mahaze gigi kawayoshinobori akahata',
    long:'unagi dojo utsubo',flat:'hirame magochi',
    heavy:'koi namazu bass kurodai ishidai ishigakidai raigyo streamNushi coastNushi caveNushi starNushi nushi',
  };
  const variations={unagi:[1.05,.97],dojo:[.78,1.18],utsubo:[1.08,1],koi:[.84,.9],namazu:[1.12,1.12],
    medaka:[.68,1.1],kawahagi:[.65,.85],buri:[1.08,.98],hiramasa:[.88,1.1],kanpachi:[1.12,.92],
    tanago:[.72,1.04],moroko:[.82,1.08],hirame:[.78,1.15],magochi:[.76,.85]};
  const profiles={};
  for(const [family,ids]of Object.entries(groups))for(const id of ids.split(' ')){
    const v=variations[id]||[1,1],p=families[family];
    profiles[id]=Object.freeze({...p,family,amplitude:p.amplitude*v[0],wave:p.wave*v[1]});
  }
  const aliases={buriMojako:'buri',buriYoung:'buri',tanagoGold:'tanago',raigyoAlbino:'raigyo',kamatsukaAlbino:'kamatsuka',
    madaiBlue:'madai',dojoAlbino:'dojo',unagiAlbino:'unagi',medakaGold:'medaka',namazuAlbino:'namazu',koiGold:'koi',funaGold:'funa'};
  const profile=id=>profiles[aliases[id]||id]||profiles.moroko;
  function phase(id,seconds,speed=1,bottom=false,individual=0){
    const p=profile(id),clock=Math.max(0,Number(seconds)||0)*speed;
    // The derivative remains positive: a tail push eases into a glide rather
    // than pausing in an integer pose. Individual offsets prevent lockstep.
    return (clock+p.pulse*Math.sin(clock*1.7+individual))/(bottom?.24:.18)+individual;
  }
  return Object.freeze({profile,phase,profiles:Object.freeze(profiles)});
});
