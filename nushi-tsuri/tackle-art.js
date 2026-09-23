// Small hand-drawn pixel sprites shared by the shop, tackle menus and bag.
(function (root, factory) {
  const art = factory();
  if (typeof module === "object" && module.exports) module.exports = art;
  if (root) root.ShuTackleArt = art;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const sprites = {
    worm: [
      ["#342b35","M16 1h3v2h2v3h-2v2h-3v3h-3v3h-3v2H7v3H4v-2H2v-4h3v-3h3v-2h3V8h3V5h2z"],
      ["#8e4a55","M16 3h3v3h-2v3h-3v3h-3v2H8v3H5v-3h3v-3h3v-3h3V7h2z"],
      ["#e08a72","M16 4h2v2h-2v3h-3v3h-3v2H7v3H5v-2h3v-3h3v-3h3V7h2z"],
      ["#f6bf8a","M16 4h1v2h-1v2h-2V7h2zM11 10h2v1h-2zM8 13h2v1H8z"],
      ["#5a3546","M17 7h2v1h-2zM13 12h2v1h-2zM9 15h2v1H9zM5 18h2v1H5z"],
    ],
    corn: [
      ["#423a2c","M9 2h6v2h3v13h-2v3H8v-3H6V4h3z"],
      ["#2d704e","M7 11h2v5h2v5H8v-3H6v-5H4v-3h3zM16 10h3v-2h2v6h-2v4h-3z"],
      ["#df972d","M9 4h7v13H9z"],
      ["#ffe082","M10 5h2v2h-2zM13 5h2v2h-2zM10 8h2v2h-2zM13 8h2v2h-2zM10 11h2v2h-2zM13 11h2v2h-2zM10 14h2v2h-2zM13 14h2v2h-2z"],
      ["#f3b33c","M12 7h1v1h-1zM12 10h1v1h-1zM12 13h1v1h-1zM10 17h5v1h-5z"],
      ["#7db759","M7 12h1v4h2v3H8v-3H7zM17 12h2v2h-2z"],
    ],
    liveMinnow: [
      ["#21384c","M2 11h3V8h2V6h3V4h3v3h3v1h4v2h2v4h-3v2h-4v1h-4v2H8v-3H6v-2H4v3H2z"],
      ["#588397","M5 10h3V8h4v1h5v1h3v3h-4v2H9v-2H6z"],
      ["#a7c5bb","M7 12h10v2H9v-1H7zM10 17h3v1h-3z"],
      ["#e0dfbc","M9 11h9v1H9z"],
      ["#285665","M4 12h3v1H5v2H4zM10 5h3v2h-3zM12 16h3v1h-3z"],
      ["#f4e2ac","M18 10h2v2h-2z"], ["#1c293b","M19 10h1v1h-1z"],
    ],
    nushiSecret: [
      ["#41295f","M10 1h4v3h4v3h3v4h2v4h-2v3h-4v3H7v-3H3v-4H1v-4h3V7h3V4h3z"],
      ["#734aa0","M9 5h7v2h3v4h2v4h-3v3H7v-3H4v-4h2V8h3z"],
      ["#be74ca","M11 6h4v2h3v5h-2v3H9v-2H7v-4h2V8h2z"],
      ["#efd09e","M11 4h2v3h3v2h-3v3h-2V9H8V7h3z"],
      ["#fff4cf","M11 6h2v2h2v1h-2v2h-2V9H9V8h2zM18 3h2v2h-2zM4 16h2v2H4z"],
      ["#784577","M12 15h4v2h-4zM8 14h2v2H8z"],
    ],
    grasshopper: [
      ["#273e30","M4 10h4V8h3V6h5v2h3v3h2v4h-3v-2h-3v2h-2v3h-3v-2H8v2H5v-3H3z"],
      ["#5e9b49","M7 10h4V8h5v2h3v2h-3v2H9v-2H6z"],
      ["#bbca66","M9 9h6v1H9zM10 12h5v1h-5z"],
      ["#386b40","M6 15h3v1H7v3H5v-2h1zM15 14h2v1h-2v3h-2v-2h2z"],
      ["#e5d997","M18 10h2v1h-2z"], ["#1d2d30","M19 10h1v1h-1zM17 7h1v2h-1z"],
    ],
    river: [
      ["#293944","M7 3h2v3h2V4h2v3h2V5h2v5h3v3h-3v3h-2v3H9v-3H7v-3H4v-3h3z"],
      ["#866a4e","M9 8h6v3h2v3h-2v3H9v-3H7v-3h2z"],
      ["#d2ad72","M10 8h3v3h2v3h-2v2h-3v-3H9v-2h1z"],
      ["#6b867d","M7 10H4v3h3zM17 10h3v3h-3z"],
      ["#f5df9f","M10 10h1v2h-1zM13 13h1v1h-1z"],
      ["#3c4243","M6 16h2v3H6zM16 15h2v3h-2z"],
    ],
    paste: [
      ["#4a4038","M7 4h10v2h3v3h2v7h-2v3h-3v2H7v-2H4v-3H2V9h2V6h3z"],
      ["#bb915c","M7 6h10v2h3v8h-3v3H7v-3H4V9h3z"],
      ["#ead19a","M8 7h7v2h3v6h-2v2H8v-2H6V9h2z"],
      ["#fff0bd","M8 8h3v3H8zM13 9h3v2h-3zM10 13h3v2h-3z"],
      ["#98784d","M16 14h3v2h-3zM7 15h3v2H7z"],
    ],
    shrimp: [
      ["#493943","M6 6h4V4h6v2h3v3h2v3h-2v3h-3v3h-5v-2H7v-2H4v-3H2V8h4z"],
      ["#cb6862","M6 8h5V6h5v2h3v3h-2v3h-3v2h-3v-2H8v-2H5v-2H4V9h2z"],
      ["#ffb08a","M7 8h4v2H7zM12 6h4v2h-4zM9 11h5v2H9zM14 13h3v2h-3z"],
      ["#f0dbac","M3 9h3v1H3zM6 11h2v1H6zM11 14h2v1h-2z"],
      ["#663949","M5 13h2v4H5zM9 15h2v4H9zM16 16h2v3h-2zM18 5h2v3h-2z"],
      ["#1e2e3d","M17 8h1v1h-1z"],
    ],
    smallShrimp: [
      ["#384552","M7 7h4V5h5v2h3v3h2v3h-3v3h-3v2H9v-2H5v-3H3V9h4z"],
      ["#b5a5a2","M7 9h5V7h4v2h3v2h-2v3h-3v2H9v-2H6v-2H5v-2h2z"],
      ["#f5d2b8","M8 9h4v2H8zM13 9h3v2h-3zM10 12h5v2h-5z"],
      ["#799299","M5 13h2v3H5zM9 16h2v3H9zM16 16h2v2h-2z"],
      ["#233645","M17 9h1v1h-1zM19 6h1v3h-1z"],
    ],
    shell: [
      ["#454051","M3 13h2V9h3V6h3V4h4v2h3v3h3v4h2v5H2v-5z"],
      ["#c28d72","M5 13h2V9h3V7h6v2h3v4h2v4H4v-3h1z"],
      ["#f1cea0","M6 14h2v-3h2V9h4v2h3v3h2v2H5v-2z"],
      ["#fff0c1","M11 8h2v4h-2zM7 12h2v2H7zM15 12h2v2h-2z"],
      ["#8b5e61","M4 18h17v2H4zM9 12h1v4H9zM14 12h1v4h-1z"],
    ],
    crab: [
      ["#493640","M4 4h4v3h2v2h4V7h2V4h4v5h-3v3h3v3h-3v3H7v-3H4v-3h3V9H4z"],
      ["#b85853","M4 5h3v4H5v3h4v-2h7v2h3V9h-2V5h2v3h-4v2H9V8H5V5zM8 12h8v5H8z"],
      ["#ea8a64","M9 12h6v3H9zM4 6h2v2H4zM17 6h2v2h-2z"],
      ["#f3ba86","M10 13h4v2h-4zM7 11h2v2H7zM16 11h2v2h-2z"],
      ["#2b2e39","M9 8h2v2H9zM13 8h2v2h-2zM7 17h2v3H7zM15 17h2v3h-2z"],
    ],
    hookSmall: [
      ["#243341","M11 3h4v4h-1v9h-2v2H7v-2H6v-4h2v4h3V7h-1V3z"],
      ["#a6b9bb","M11 4h3v2h-1v10h-2v1H8v-1h3V6h-1V4z"],
      ["#f4e6b6","M11 4h2v1h-2zM12 8h1v5h-1z"],
      ["#e6ac71","M6 12h2v2H7v-1H6z"],
    ],
    hookMedium: [
      ["#243341","M11 2h4v4h-1v11h-2v2H6v-2H4v-6h2v6h5V6h-1V2z"],
      ["#a6b9bb","M11 3h3v2h-1v12h-2v1H7v-1h4V5h-1V3z"],
      ["#f4e6b6","M11 3h2v1h-2zM12 8h1v7h-1z"],
      ["#e6ac71","M4 11h2v3H5v-2H4z"],
    ],
    hookLarge: [
      ["#243341","M10 1h5v5h-1v12h-2v2H5v-2H3v-8h3v8h5V6h-2V1z"],
      ["#a6b9bb","M10 2h4v3h-1v13h-2v1H6v-1h5V5H9V2z"],
      ["#f4e6b6","M10 2h3v1h-3zM12 8h1v8h-1z"],
      ["#e6ac71","M3 10h3v4H5v-2H3z"],
    ],
    silverSpoon: [
      ["#273744","M16 2h3v2h2v5h-2v3h-2v3h-3v3h-2v3H8v-3h2v-2h3v-3h2v-3h1z"],
      ["#91b1b9","M16 4h3v5h-2v3h-2v2h-2v-2h1V9h2z"],
      ["#e6ecda","M17 4h1v5h-1v2h-1V7h1zM12 16h2v2h-2z"],
      ["#be8d59","M7 18h3v2H7z"],
    ],
    starMinnow: [
      ["#253b4f","M2 11h4V8h4V6h4v2h4v2h3v5h-4v2h-5v2H9v-3H6v-2H4v3H2z"],
      ["#3b8a9c","M6 10h5V8h5v2h3v4h-4v2H9v-3H6z"],
      ["#9ed4ca","M7 13h9v2H8z"],
      ["#f7d982","M11 8h1v2h2v1h-2v2h-1v-2H9v-1h2z"],
      ["#172b39","M18 11h1v1h-1z"],
    ],
    expeditionJoint: [
      ["#29343b","M5 3h14v3h2v11h-2v3H5v-3H3V6h2z"],
      ["#83969a","M6 5h12v2h2v9h-2v2H6v-2H4V7h2z"],
      ["#d9c49a","M7 6h10v2H7zM7 16h10v1H7z"],
      ["#4e646c","M7 9h3v6H7zM14 9h3v6h-3z"],
      ["#f4e6b6","M11 9h2v6h-2z"],
    ],
    float: [
      ["#2d3640","M11 1h2v4h2v2h2v9h-3v4h-4v-4H7V7h2V5h2z"],
      ["#faf1cf","M10 7h4v2h2v3H8V9h2z"],
      ["#d96354","M8 12h8v3H8z"],
      ["#eac16d","M10 16h4v2h-4z"],
      ["#9fb4ad","M11 2h2v3h-2z"],
    ],
  };
  function icon(id) {
    const sprite = sprites[id];
    if (!sprite) return "";
    return `<svg class="tackle-pixel-icon" viewBox="0 0 24 24" shape-rendering="crispEdges" aria-hidden="true">${sprite.map(([fill,d])=>`<path fill="${fill}" d="${d}"/>`).join("")}</svg>`;
  }
  return { sprites, icon };
});
