// Species size bands tune which fish bites; specimen sizes are rolled separately after selection.
(function (root, factory) {
  const tackle = factory();
  if (typeof module === "object" && module.exports) module.exports = tackle;
  if (root) root.ShuTackle = tackle;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const hooks = {
    small: { name: "ハリ小", role: "小型魚種を狙いやすい", bands: { small: 2.2, medium: .83, large: .12 } },
    medium: { name: "ハリ中", role: "標準的な魚種向け", bands: { small: .72, medium: 1.2, large: .88 } },
    large: { name: "ハリ大", role: "大型魚種を狙いやすい", bands: { small: .07, medium: .46, large: 1.9 } },
  };
  // Add a species here with its basic band, bait multipliers, and optional hook overrides.
  // Spot, weather, time and casting distance multiply the result in the fishing scene.
  const species = {
    tanago:{band:"small",baits:{paste:2.8,river:1.2,worm:1,corn:.9,smallShrimp:.25,shrimp:.08,grasshopper:.1,liveMinnow:.01,shell:.02,crab:.02}},
    motsugo:{band:"small",baits:{river:2.6,worm:1.4,paste:1.1,corn:.18,smallShrimp:.45,shrimp:.15,grasshopper:.25,liveMinnow:.02,shell:.03,crab:.03}},
    medaka:{band:"small",hooks:{small:2.8,medium:.05,large:.005},baits:{river:2.2,paste:1,worm:.65,corn:.04,smallShrimp:.12,shrimp:.03,grasshopper:.08,liveMinnow:.005,shell:.01,crab:.01}},
    kamatsuka:{band:"small",hooks:{small:2.2,medium:.9,large:.12},baits:{worm:2.5,river:2,smallShrimp:.7,shrimp:.3,paste:.1,corn:.06,grasshopper:.08,liveMinnow:.1,shell:.03,crab:.08}},
    nigoi:{band:"large",hooks:{small:.15,medium:1.8,large:1.3},baits:{worm:2.1,river:1.8,corn:1.1,paste:.7,liveMinnow:.8,smallShrimp:1,shrimp:.3,grasshopper:.4,shell:.15,crab:.3}},
    raigyo:{band:"large",hooks:{small:.03,medium:.7,large:2.4},baits:{liveMinnow:3.5,grasshopper:1.8,worm:.5,river:.1,smallShrimp:.6,shrimp:.2,paste:.02,corn:.01,shell:.02,crab:.7}},
    moroko: {
      band: "small",
      baits: {
        river: 1.9, worm: 1, paste: 0.45, corn: 0.28,
        shrimp: 0.2, liveMinnow: 0.04, grasshopper: 0.9, smallShrimp: 0.5,
        shell: 0.12, crab: 0.08,
      },
    },
    funa: {
      band: "medium",
      baits: {
        corn: 1.85, paste: 1.6, worm: 0.8, river: 0.68,
        shrimp: 0.3, liveMinnow: 0.04, grasshopper: 0.65, smallShrimp: 0.55,
        shell: 0.35, crab: 0.18,
      },
      hooks: { small: 2.5, medium: 1.2, large: 0.32 },
    },
    koi: {
      band: "large",
      baits: {
        corn: 2.25, paste: 1.55, worm: 0.62, river: 0.32,
        shrimp: 0.22, liveMinnow: 0.04, grasshopper: 0.35, smallShrimp: 0.38,
        shell: 0.5, crab: 0.24,
      },
      hooks: { small: 0.14, medium: 0.92, large: 1.85 },
    },
    aji: {
      band: "small",
      baits: {
        shrimp: 2.1, river: 0.72, liveMinnow: 0.58, worm: 0.52,
        paste: 0.3, corn: 0.03, grasshopper: 0.05, smallShrimp: 1.95,
        shell: 0.45, crab: 0.35,
      },
    },
    ayu: {
      band: "small",
      baits: {
        river: 2.45, worm: 0.32, shrimp: 0.14, paste: 0.08,
        corn: 0.03, liveMinnow: 0.02, grasshopper: 1.9, smallShrimp: 0.28,
        shell: 0.04, crab: 0.05,
      },
    },
    iwana: {band:"medium",baits:{worm:1.8,river:1.7,grasshopper:1.8,liveMinnow:1.2,smallShrimp:.6,shrimp:.3,paste:.06,corn:.03,shell:.04,crab:.08}},
    amago: {band:"small",baits:{river:2.3,grasshopper:2.15,worm:.85,liveMinnow:.58,smallShrimp:.65,shrimp:.25,paste:.05,corn:.03,shell:.03,crab:.06}},
    kajika: {band:"small",baits:{river:2.5,worm:1.4,liveMinnow:1.1,smallShrimp:.8,shrimp:.5,grasshopper:.3,paste:.04,corn:.02,shell:.07,crab:.12}},
    wakasagi: {band:"small",baits:{river:2.5,smallShrimp:1.8,worm:1.1,shrimp:.55,paste:.25,corn:.03,liveMinnow:.02,grasshopper:.12,shell:.02,crab:.02}},
    dojo: {band:"small",baits:{worm:2.6,river:1.7,smallShrimp:.8,shrimp:.45,paste:.3,corn:.12,liveMinnow:.04,grasshopper:.3,shell:.05,crab:.05}},
    ugui: {band:"medium",hooks:{small:1.6,medium:1.2,large:.2},baits:{worm:2,river:1.8,paste:1.2,grasshopper:1.2,corn:.4,smallShrimp:.5,shrimp:.15,liveMinnow:.12,shell:.06,crab:.04}},
    oikawa: {band:"small",baits:{river:2.4,grasshopper:1.5,worm:1.2,paste:.8,corn:.2,smallShrimp:.3,shrimp:.12,liveMinnow:.02,shell:.02,crab:.02}},
    kawahagi: {band:"small",baits:{shell:3,smallShrimp:1.4,crab:1.8,shrimp:1.1,worm:.8,river:.04,paste:.03,corn:.02,liveMinnow:.02,grasshopper:.02}},
    isaki: {band:"medium",baits:{shrimp:2.4,smallShrimp:2,worm:1.2,river:.35,liveMinnow:.55,paste:.12,corn:.03,grasshopper:.04,shell:.55,crab:.65}},
    yamame: {
      band: "small",
      baits: {
        river: 2, worm: 0.72, liveMinnow: 0.58, shrimp: 0.32,
        paste: 0.05, corn: 0.03, grasshopper: 2.15, smallShrimp: 0.72,
        shell: 0.05, crab: 0.12,
      },
    },
    namazu: {
      band: "medium",
      baits: {
        liveMinnow: 2.2, worm: 1.15, shrimp: 0.52, river: 0.3,
        paste: 0.08, corn: 0.03, grasshopper: 0.75, smallShrimp: 0.62,
        shell: 0.1, crab: 1.15,
      },
    },
    unagi: {
      band: "medium",
      baits: {
        worm: 1.9, liveMinnow: 1.35, shrimp: 0.85, river: 0.4,
        paste: 0.08, corn: 0.03, grasshopper: 0.25, smallShrimp: 0.9,
        shell: 0.35, crab: 1.6,
      },
    },
    bass: {
      band: "medium",
      baits: {
        liveMinnow: 2.2, worm: 0.88, shrimp: 0.68, river: 0.52,
        paste: 0.08, corn: 0.03, grasshopper: 1.45, smallShrimp: 0.84,
        shell: 0.12, crab: 1.1,
      },
    },
    kurodai: {
      band: "large",
      baits: {
        shrimp: 1.95, paste: 1.3, corn: 0.48, worm: 0.52,
        river: 0.32, liveMinnow: 0.18, grasshopper: 0.08, smallShrimp: 1.82,
        shell: 2.15, crab: 2.4,
      },
    },
    kasago: {
      band: "small",
      baits: {
        shrimp: 2.25, liveMinnow: 0.78, worm: 0.76, river: 0.5,
        paste: 0.08, corn: 0.02, grasshopper: 0.08, smallShrimp: 2.08,
        shell: 1.35, crab: 2,
      },
    },
    suzuki: {
      band: "large",
      baits: {
        liveMinnow: 2.4, shrimp: 1.12, worm: 0.52, river: 0.48,
        paste: 0.04, corn: 0.02, grasshopper: 0.25, smallShrimp: 1.18,
        shell: 0.65, crab: 1.15,
      },
    },
    hirame: {
      band: "large",
      baits: {
        liveMinnow: 2.55, shrimp: 1.3, worm: 0.38, river: 0.28,
        paste: 0.03, corn: 0.01, grasshopper: 0.05, smallShrimp: 1.35,
        shell: 0.42, crab: 1.2,
      },
    },
    nushi: {
      band: "large",
      baits: {
        nushiSecret: 1, liveMinnow: 0.52, paste: 0.45, worm: 0.34,
        river: 0.3, shrimp: 0.2, corn: 0.16, grasshopper: 0.12,
        smallShrimp: 0.24, shell: 0.2, crab: 0.4,
      },
      hooks: { small: 0.02, medium: 0.28, large: 2.4 },
    },
    bora: {
      band: "medium",
      baits: {
        paste: 1.9, shrimp: 1.2, corn: 0.82, river: 0.62,
        worm: 0.42, liveMinnow: 0.04, grasshopper: 0.3, smallShrimp: 1.05,
        shell: 0.72, crab: 0.42,
      },
    },
    mebaru: {
      band: "small",
      baits: {
        shrimp: 2.3, river: 0.92, worm: 0.72, liveMinnow: 0.52,
        paste: 0.12, corn: 0.02, grasshopper: 0.15, smallShrimp: 2.2,
        shell: 1.4, crab: 1.9,
      },
    },
    nijimasu: {
      band: "medium",
      baits: {
        river: 2.2, worm: 0.92, liveMinnow: 0.66, shrimp: 0.38,
        paste: 0.05, corn: 0.02, grasshopper: 2.05, smallShrimp: 0.65,
        shell: 0.08, crab: 0.35,
      },
    },
    shirogisu: { band: "small", baits: {
      worm: 2.1, shrimp: 1.55, smallShrimp: 1.9, river: .8,
      crab: .45, shell: .35, liveMinnow: .08, paste: .12, corn: .03,
    } },
    ainame: { band: "medium", baits: {
      shrimp: 1.8, smallShrimp: 1.75, crab: 2.2, shell: 1.25,
      liveMinnow: 1.4, worm: .75, river: .35, paste: .06, corn: .02,
    } },
    madai: { band: "large", baits: {
      shrimp: 2.1, smallShrimp: 1.65, crab: 2.35, shell: 2.05,
      liveMinnow: .6, worm: .4, river: .2, paste: .18, corn: .08,
    } },
  };
  Object.assign(species,{
    streamNushi:{band:"large",baits:{river:1.6,worm:1.1,liveMinnow:1.4,grasshopper:1.2,star:5}},
    coastNushi:{band:"large",baits:{shrimp:1.2,smallShrimp:1.2,shell:2.2,crab:2,liveMinnow:1.1,star:5}},
    caveNushi:{band:"large",baits:{worm:1.8,liveMinnow:1.5,smallShrimp:.8,star:5.5}},
    starNushi:{band:"large",baits:{worm:.4,corn:1.8,paste:1.8,star:8}},
  });
  const baitDefaults = {
    worm: 1, river: .08, paste: .08, corn: .08,
    shrimp: .08, liveMinnow: .08, grasshopper: .08,
    smallShrimp: .08, shell: .08, crab: .08,
  };
  // Regional bosses use the same explicit fallback bait multipliers as the
  // rest of the catalogue, with their preferred foods overriding defaults.
  for(const id of ["streamNushi","coastNushi","caveNushi","starNushi"])
    species[id].baits={...baitDefaults,...species[id].baits};
  function allowed(baitId, hookId) { return baitId !== "nushiSecret" || hookId === "large"; }
  function weight(fishId, baitId, hookId = "medium") {
    if (!hooks[hookId] || !allowed(baitId, hookId)) return 0;
    // Exclusive bait is a candidate filter; it never produces an incidental fish.
    if (baitId === "nushiSecret") return fishId === "nushi" ? 1 : 0;
    const profile = species[fishId];
    const bait = profile?.baits[baitId] ?? baitDefaults[baitId] ?? .08;
    const hook = profile?.hooks?.[hookId] ?? hooks[hookId].bands[profile?.band] ?? 1;
    return Math.max(0, bait * hook);
  }
  return { hooks, species, allowed, weight };
});
