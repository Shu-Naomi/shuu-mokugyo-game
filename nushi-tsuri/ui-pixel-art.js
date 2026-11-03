// Hand-drawn pixel art. All coordinates sit on an integer pixel grid.
(function (root, factory) {
  "use strict";
  const art = factory();
  if (typeof module === "object" && module.exports) module.exports = art;
  if (root) root.UiPixelArt = art;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const sprites = {
    sunny: [
      ["#d68c36","M10 1h4v3h-4zM10 20h4v3h-4zM1 10h3v4H1zM20 10h3v4h-3zM4 3h2v2h2v2H5V6H3V4h1zM18 3h2v1h1v2h-2v1h-2V5h1zM4 17h3v2H5v2H3v-3h1zM17 17h2v1h2v3h-3v-2h-1z"],
      ["#263545","M9 5h6v1h3v3h1v6h-1v3h-3v1H9v-1H6v-3H5V9h1V6h3z"],
      ["#f5c75c","M9 6h6v1h2v2h1v6h-1v2h-2v1H9v-1H7v-2H6V9h1V7h2z"],
      ["#ffe68d","M9 7h6v2H9zM7 9h3v5H7z"],
      ["#d68c36","M16 12h2v3h-1v2h-3v1h-4v-2h5v-1h1z"],
      ["#fff3d0","M9 8h3v2h-3z"],
    ],
    cloudy: [
      ["#263545","M8 5h6v2h3v2h3v2h2v6h-2v2H4v-1H2v-3H1v-4h2V9h3V7h2z"],
      ["#74929d","M8 7h6v2h3v2h3v2h1v3h-2v2H4v-1H3v-3H2v-2h2v-2h3V8h1z"],
      ["#b9d9dc","M9 7h4v2h3v3h4v3H4v-1H3v-2h2v-2h3V9h1z"],
      ["#fff3d0","M9 8h3v1H9zM5 11h3v2H4v-1h1z"],
      ["#94b3be","M5 16h14v1H5zM17 14h4v2h-4z"],
    ],
    rain: [
      ["#263545","M8 2h6v2h3v2h3v2h2v5h-2v2H4v-1H2v-3H1V8h2V6h3V4h2z"],
      ["#74929d","M8 4h6v2h3v2h3v2h1v2h-2v2H4v-1H3v-3H2V8h2V7h3V5h1z"],
      ["#b9d9dc","M9 4h4v2h3v3h4v2H4v-1H3V8h3V6h3z"],
      ["#fff3d0","M9 5h3v1h-3z"],
      ["#3d85b5","M5 17h2v3H6v2H3v-2h1v-2h1zM12 16h2v3h-1v2h-3v-2h1v-2h1zM19 17h2v3h-1v2h-3v-2h1v-2h1z"],
      ["#70cbd5","M5 18h1v2H4v1H3v-1h1v-1h1zM12 17h1v2h-2v1h-1v-1h1v-1h1zM19 18h1v2h-2v1h-1v-1h1v-1h1z"],
    ],
    sound: [
      ["#263545","M2 8h5V6h2V4h4v16H9v-2H7v-2H2z"],
      ["#74929d","M3 9h5V7h2V5h2v14h-2v-2H8v-2H3z"],
      ["#b9d9dc","M3 9h3v5H3zM9 8h1v8H9z"],
      ["#fff3d0","M10 6h1v5h-1z"],
      ["#405366","M3 14h5v1h-5z"],
      ["#263545","M16 7h2v2h1v6h-1v2h-2v-2h1V9h-1zM19 3h2v3h1v3h1v6h-1v3h-1v3h-2v-3h1v-3h1V9h-1V6h-1z"],
      ["#70cbd5","M16 8h1v1h1v6h-1v1h-1v-1h1V9h-1zM19 4h1v2h1v3h1v6h-1v3h-1v2h-1v-2h1v-3h1V9h-1V6h-1z"],
    ],
    muted: [
      ["#263545","M2 8h5V6h2V4h4v16H9v-2H7v-2H2z"],
      ["#74929d","M3 9h5V7h2V5h2v14h-2v-2H8v-2H3z"],
      ["#b9d9dc","M3 9h3v5H3zM9 8h1v8H9z"],
      ["#fff3d0","M10 6h1v5h-1z"],
      ["#405366","M3 14h5v1h-5z"],
      ["#263545","M16 8h2v2h2V8h2v3h-1v2h1v3h-2v-2h-2v2h-2v-3h1v-2h-1z"],
      ["#d86f68","M16 9h1v1h1v1h2v-1h1V9h1v2h-1v2h1v2h-1v-1h-1v-1h-2v1h-1v1h-1v-2h1v-2h-1z"],
    ],
    book: [
      ["#263545","M1 4h8v1h2v1h2V5h2V4h8v16h-8v1H9v-1H1z"],
      ["#8e5745","M2 5h7v1h2v1h2V6h2V5h7v14h-7v1H9v-1H2z"],
      ["#fff3d0","M3 5h5v1h2v1h1v11H9v-1H3zM13 7h1V6h2V5h5v12h-5v1h-3z"],
      ["#d9bf85","M3 15h6v1h2v2H9v-1H3zM13 16h2v-1h6v2h-6v1h-2z"],
      ["#a78b65","M4 8h4v1H4zM4 11h5v1H4zM4 14h4v1H4zM16 8h4v1h-4zM15 11h5v1h-5zM16 14h4v1h-4z"],
      ["#d68c36","M11 7h2v12h-2z"],
      ["#d86f68","M17 5h2v5h-2z"],
    ],
    bag: [
      ["#263545","M8 2h8v2h2v4h3v3h1v10H2V11h1V8h3V4h2z"],
      ["#8d542d","M9 3h6v1h2v4h-2V5H9v3H7V4h2z"],
      ["#d68c36","M4 9h16v3h1v8H3v-8h1z"],
      ["#f5c75c","M5 10h14v3H5z"],
      ["#ab6e3c","M3 13h18v7H3z"],
      ["#edb45b","M5 14h14v4h-14z"],
      ["#263545","M10 12h4v5h-4z"],
      ["#fff3d0","M11 13h2v3h-2z"],
      ["#ffdb88","M5 10h2v2h-2z"],
      ["#8d542d","M4 18h16v2h-16z"],
    ],
    pin: [
      ["#263545","M8 1h8v1h3v3h2v7h-2v3h-2v3h-2v3h-2v2h-2v-2H9v-3H7v-3H5v-3H3V5h2V2h3z"],
      ["#d86f68","M8 2h8v1h3v3h1v5h-2v3h-2v3h-2v3h-2v2h-1v-2H9v-3H7v-3H5v-3H4V6h1V3h3z"],
      ["#f89d82","M8 3h6v2H8zM5 5h3v6H5z"],
      ["#a64d59","M17 10h3v1h-2v3h-2v3h-2v3h-2v-3h2v-3h2z"],
      ["#263545","M10 6h4v1h2v4h-2v1h-4v-1H8V7h2z"],
      ["#fff3d0","M10 7h4v1h1v2h-1v1h-4v-1H9V8h1z"],
    ],
    save: [
      ["#263545","M3 1h16v2h2v2h2v17H1V3h2z"],
      ["#3d85b5","M3 2h15v2h2v2h2v15H2V3h1z"],
      ["#245d83","M19 6h3v15H2v-3h17z"],
      ["#b9d9dc","M6 2h11v7h-11z"],
      ["#405366","M13 3h3v5h-3z"],
      ["#fff3d0","M7 3h4v1h-4z"],
      ["#263545","M5 12h14v9h-14z"],
      ["#fff3d0","M6 13h12v7h-12z"],
      ["#d5caa2","M7 15h10v1h-10z"],
      ["#d5caa2","M7 18h7v1h-7z"],
      ["#70cbd5","M3 5h2v6h-2z"],
      ["#1b425f","M3 19h1v1h-1z"],
    ],
    coin: [
      ["#263545","M8 1h8v1h4v3h2v3h1v8h-1v3h-2v3h-4v1H8v-1H4v-3H2v-3H1V8h1V5h2V2h4z"],
      ["#d68c36","M8 2h8v1h3v3h2v3h1v6h-1v3h-2v3h-3v1H8v-1H5v-3H3v-3H2V9h1V6h2V3h3z"],
      ["#f5c75c","M8 3h7v1h3v3h2v8h-2v4h-4v2H8v-2H5v-4H3V9h1V6h3V4h1z"],
      ["#ffe590","M8 4h7v1H8zM5 7h2v8H5zM7 5h2v2H7z"],
      ["#8d542d","M11 6h2v2h3v2h-5v1h4v1h1v4h-3v2h-2v-2H8v-2h5v-1H9v-1H8V8h3z"],
      ["#fff3d0","M12 7h1v1h-1z"],
      ["#ffde79","M19 8h1v7h-1zM16 18h2v1h-2z"],
    ],
    bolt: [
      ["#263545","M12 1h8v2h-2v4h-2v2h5v3h-2v3h-3v3h-3v3h-3v2H7v-3h2v-5H4v-3h2V9h2V6h2V3h2z"],
      ["#f5c75c","M13 2h6v1h-2v4h-2v3h5v1h-2v3h-3v3h-3v3H9v1H8v-1h2v-6H5v-1h2v-3h2V7h2V4h2z"],
      ["#fff0aa","M13 3h3v2h-2v4h-2v3H8v-2h2V7h2V4h1z"],
      ["#d68c36","M11 13h7v1h-3v3h-3v3H9v1H8v-1h2v-6h1z"],
      ["#fff3d0","M13 3h2v1h-2z"],
    ],
    phaseTarget: [
      ["#263545","M6 1h12v2h3v3h2v12h-2v3h-3v2H6v-2H3v-3H1V6h2V3h3z"],
      ["#405366","M6 2h12v2h3v2h1v12h-2v2h-2v2H6v-2H4v-2H2V6h2V4h2z"],
      ["#294958","M6 4h12v2h2v12h-2v2H6v-2H4V6h2z"],
      ["#527580","M6 3h12v1H6zM3 6h1v11H3z"],
      ["#b9d9dc","M10 5h4v2h3v3h2v4h-2v3h-3v2h-4v-2H7v-3H5v-4h2V7h3z"],
      ["#294958","M10 8h4v2h2v4h-2v2h-4v-2H8v-4h2z"],
      ["#f5c75c","M11 10h2v1h1v2h-1v1h-2v-1h-1v-2h1z"],
      ["#fff3d0","M11 10h1v1h-1z"],
    ],
    phaseDown: [
      ["#263545","M6 1h12v2h3v3h2v12h-2v3h-3v2H6v-2H3v-3H1V6h2V3h3z"],
      ["#405366","M6 2h12v2h3v2h1v12h-2v2h-2v2H6v-2H4v-2H2V6h2V4h2z"],
      ["#294958","M6 4h12v2h2v12h-2v2H6v-2H4V6h2z"],
      ["#527580","M6 3h12v1H6zM3 6h1v11H3z"],
      ["#70cbd5","M10 5h4v8h4v2h-2v2h-2v2h-4v-2H8v-2H6v-2h4z"],
      ["#fff3d0","M10 5h2v8h-2z"],
      ["#3d85b5","M12 13h6v2h-2v2h-2v2h-2z"],
    ],
    phaseRight: [
      ["#263545","M6 1h12v2h3v3h2v12h-2v3h-3v2H6v-2H3v-3H1V6h2V3h3z"],
      ["#405366","M6 2h12v2h3v2h1v12h-2v2h-2v2H6v-2H4v-2H2V6h2V4h2z"],
      ["#294958","M6 4h12v2h2v12h-2v2H6v-2H4V6h2z"],
      ["#527580","M6 3h12v1H6zM3 6h1v11H3z"],
      ["#f5c75c","M5 10h8V6h2v2h2v2h2v4h-2v2h-2v2h-2v-4H5z"],
      ["#fff3d0","M5 10h8v1H5zM13 7h1v3h-1z"],
      ["#d68c36","M5 13h9v3h1v-2h2v-1h2v1h-2v2h-2v2h-2v-4H5z"],
    ],
    phaseBoth: [
      ["#263545","M6 1h12v2h3v3h2v12h-2v3h-3v2H6v-2H3v-3H1V6h2V3h3z"],
      ["#405366","M6 2h12v2h3v2h1v12h-2v2h-2v2H6v-2H4v-2H2V6h2V4h2z"],
      ["#294958","M6 4h12v2h2v12h-2v2H6v-2H4V6h2z"],
      ["#527580","M6 3h12v1H6zM3 6h1v11H3z"],
      ["#70cbd5","M5 8h2v2h3v4H7v2H5v-2H3v-4h2z"],
      ["#f5c75c","M17 8h2v2h2v4h-2v2h-2v-2h-3v-4h3z"],
      ["#fff3d0","M5 10h5v1H5zM14 10h5v1h-5z"],
      ["#b9d9dc","M11 6h2v12h-2z"],
    ],
    phaseLow: [
      ["#263545","M6 1h12v2h3v3h2v12h-2v3h-3v2H6v-2H3v-3H1V6h2V3h3z"],
      ["#405366","M6 2h12v2h3v2h1v12h-2v2h-2v2H6v-2H4v-2H2V6h2V4h2z"],
      ["#294958","M6 4h12v2h2v12h-2v2H6v-2H4V6h2z"],
      ["#527580","M6 3h12v1H6zM3 6h1v11H3z"],
      ["#70cbd5","M6 5h3v2h2v2h2v2h2v2h3v-3h2v8H12v-2h3v-2h-2v-2h-2v-2H9V8H7V7H6z"],
      ["#fff3d0","M6 5h3v1H6zM9 7h2v1H9zM11 9h2v1h-2z"],
      ["#3d85b5","M12 17h7v1h-7z"],
    ],
    phaseWave: [
      ["#263545","M6 1h12v2h3v3h2v12h-2v3h-3v2H6v-2H3v-3H1V6h2V3h3z"],
      ["#405366","M6 2h12v2h3v2h1v12h-2v2h-2v2H6v-2H4v-2H2V6h2V4h2z"],
      ["#294958","M6 4h12v2h2v12h-2v2H6v-2H4V6h2z"],
      ["#527580","M6 3h12v1H6zM3 6h1v11H3z"],
      ["#70cbd5","M3 12h2V8h2V6h3v2h2v7h2v1h1v-2h1V9h2V7h3v3h-2v5h-2v3h-4v-2h-2v-5H9V9H8v2H7v4H3z"],
      ["#fff3d0","M7 6h3v1H7zM3 12h2v1H3zM17 7h4v1h-4z"],
      ["#3d85b5","M3 14h4v1H3zM12 17h5v1h-5z"],
    ],
    phaseDiagonal: [
      ["#263545","M6 1h12v2h3v3h2v12h-2v3h-3v2H6v-2H3v-3H1V6h2V3h3z"],
      ["#405366","M6 2h12v2h3v2h1v12h-2v2h-2v2H6v-2H4v-2H2V6h2V4h2z"],
      ["#294958","M6 4h12v2h2v12h-2v2H6v-2H4V6h2z"],
      ["#527580","M6 3h12v1H6zM3 6h1v11H3z"],
      ["#f5c75c","M11 5h8v8h-3v-3h-2v2h-2v2h-2v2H8v3H5v-5h2v-2h2v-2h2V8H9V5z"],
      ["#fff3d0","M10 5h9v1h-9zM5 14h2v4H5z"],
      ["#d68c36","M18 6h1v7h-3v-1h2zM7 17h1v2H5v-1h2z"],
    ],
    phaseTurn: [
      ["#263545","M6 1h12v2h3v3h2v12h-2v3h-3v2H6v-2H3v-3H1V6h2V3h3z"],
      ["#405366","M6 2h12v2h3v2h1v12h-2v2h-2v2H6v-2H4v-2H2V6h2V4h2z"],
      ["#294958","M6 4h12v2h2v12h-2v2H6v-2H4V6h2z"],
      ["#527580","M6 3h12v1H6zM3 6h1v11H3z"],
      ["#b9d9dc","M8 4h9v2h3v3h1v7h-2v3h-6v-3h4v-2h1V9h-2V7H9v3H6V8H4V6h2V4h2z"],
      ["#fff3d0","M8 4h9v1H8zM19 9h1v5h-1z"],
      ["#70cbd5","M13 17h5v1h-5zM6 7h3v3H6z"],
    ],
  };
  const ids = Object.freeze(Object.keys(sprites));
  const icons = Object.create(null);
  for (const id of ids) {
    icons[id] = `<svg xmlns="http://www.w3.org/2000/svg" class="pixel-item-icon" width="24" height="24" viewBox="0 0 24 24" shape-rendering="crispEdges" aria-hidden="true" focusable="false" data-pixel-icon="${id}">${sprites[id].map(([fill, d]) => `<path fill="${fill}" d="${d}"/>`).join("")}</svg>`;
  }
  Object.freeze(icons);
  function get(id) {
    return typeof id === "string" && Object.prototype.hasOwnProperty.call(icons, id) ? icons[id] : "";
  }
  return Object.freeze({ get, ids });
});
