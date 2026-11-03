// Original 32-pixel pantry and cooking sprites. All markup is built from the
// trusted drawings below, never from an item name or other caller input.
(function (root, factory) {
  'use strict';
  const art = factory();
  if (typeof module === 'object' && module.exports) module.exports = art;
  else root.ItemArt = art;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const C = Object.freeze({
    ink: '#34323b', dark: '#514344', wood: '#916044', tan: '#bf8956',
    gold: '#dda24b', yellow: '#f5ce71', pale: '#ffe8a3',
    cream: '#fff3d5', rice: '#fff9e9', shade: '#d9cdb4',
    red: '#cf514a', coral: '#ef7960', blush: '#ffab85', wine: '#8f3945',
    green: '#4f874d', leaf: '#81ad58', mint: '#b6c777', forest: '#2c5945',
    sea: '#4a717c', blue: '#7d9eaa', light: '#bcd2cc', white: '#f1f3df',
    purple: '#76528c', plum: '#4a395e', lilac: '#a879bd', pink: '#dcb3dd'
  });

  // Rasterize each drawing onto one integer grid first. Shared edges are exact,
  // and the resulting SVG consists only of opaque, axis-aligned pixel runs.
  function drawing(paint) {
    const pixels = Array.from({ length: 32 }, () => Array(32).fill(null));
    function dot(x, y, color) {
      if (x >= 0 && x < 32 && y >= 0 && y < 32) pixels[y][x] = color;
    }
    function rect(x, y, w, h, color) {
      for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) dot(i, j, color);
    }
    function shape(inside, color, outline) {
      const cells = [];
      for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
        if (inside(x + 0.5, y + 0.5)) cells.push([x, y]);
      }
      if (outline) for (const [x, y] of cells) {
        dot(x - 1, y, outline); dot(x + 1, y, outline);
        dot(x, y - 1, outline); dot(x, y + 1, outline);
      }
      for (const [x, y] of cells) dot(x, y, color);
    }
    function oval(x, y, w, h, color, outline) {
      shape((px, py) => ((px - x - w / 2) / (w / 2)) ** 2 +
        ((py - y - h / 2) / (h / 2)) ** 2 <= 1, color, outline);
    }
    function poly(points, color, outline) {
      shape((px, py) => {
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
          const [ax, ay] = points[i], [bx, by] = points[j];
          if ((ay > py) !== (by > py) && px < (bx - ax) * (py - ay) / (by - ay) + ax) inside = !inside;
        }
        return inside;
      }, color, outline);
    }
    const pen = { dot, rect, oval, poly };
    paint(pen);
    const paths = Object.create(null);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32;) {
      const color = pixels[y][x];
      if (!color) { x++; continue; }
      const start = x;
      while (x < 32 && pixels[y][x] === color) x++;
      const width = x - start;
      paths[color] = (paths[color] || '') + `M${start} ${y}h${width}v1h-${width}z`;
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" class="pixel-item-icon" width="32" height="32" viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true" focusable="false">' +
      Object.entries(paths).map(([color, path]) => `<path fill="${color}" d="${path}"/>`).join('') + '</svg>';
  }

  function plate(p, color = C.light) {
    p.oval(2, 13, 28, 15, C.sea, C.ink);
    p.oval(3, 12, 26, 13, color);
    p.oval(5, 13, 22, 10, C.white);
    p.oval(7, 15, 18, 6, C.shade);
    p.rect(8, 25, 16, 1, C.blue);
    p.rect(5, 16, 1, 4, C.cream);
    p.rect(26, 17, 1, 3, C.cream);
  }
  function leaf(p, x, y, flip = false) {
    const points = flip ? [[x, y + 5], [x + 2, y], [x + 7, y], [x + 6, y + 4], [x + 2, y + 6]] :
      [[x, y], [x + 5, y + 1], [x + 7, y + 5], [x + 3, y + 6], [x, y + 3]];
    p.poly(points, C.green, C.forest);
    p.rect(x + 2, y + 2, 2, 1, C.leaf);
    p.dot(x + 4, y + 3, C.mint);
    p.dot(x + 3, y + 4, C.leaf);
  }
  function riceGrains(p, coords) {
    for (const [x, y] of coords) {
      p.rect(x, y, 2, 1, C.rice);
      p.dot(x + 1, y + 1, C.shade);
    }
  }
  function bowl(p, soup = C.gold, body = C.red) {
    p.poly([[3, 15], [29, 15], [27, 24], [23, 28], [9, 28], [5, 24]], body, C.ink);
    p.rect(10, 28, 12, 2, C.ink);
    p.rect(11, 28, 10, 1, C.tan);
    p.poly([[6, 19], [9, 20], [10, 25], [8, 24]], C.coral);
    p.poly([[25, 19], [28, 17], [26, 24], [23, 27], [18, 27]], C.wine);
    p.oval(3, 10, 26, 11, C.cream, C.ink);
    p.oval(5, 12, 22, 7, soup, C.wood);
    p.rect(10, 20, 12, 1, C.pale);
  }
  function steam(p, x, y) {
    p.rect(x, y, 1, 2, C.shade); p.rect(x - 1, y + 2, 1, 2, C.cream);
  }
  function fish(p, x, y, body, highlight, tail = C.gold, deep = false) {
    p.poly([[x, y + 3], [x - 3, y], [x - 3, y + 7], [x + 1, y + 5]], tail, C.ink);
    p.poly([[x + 3, y + 1], [x + 7, y - (deep ? 3 : 2)], [x + 10, y + 1]], tail, C.ink);
    p.poly([[x + 7, y + 5], [x + 10, y + 8], [x + 12, y + 5]], tail, C.ink);
    p.oval(x, y, 20, deep ? 10 : 7, body, C.ink);
    p.rect(x + 4, y + 2, 9, 1, highlight);
    p.rect(x + 7, y + 4, 6, 1, C.cream);
    p.rect(x + 14, y + 2, 1, 4, C.wood);
    p.rect(x + 16, y + 1, 2, 2, C.cream);
    p.dot(x + 17, y + 2, C.ink);
    p.dot(x + 19, y + 4, C.ink);
  }

  const sprites = Object.create(null);
  function add(id, paint) { sprites[id] = drawing(paint); }

  add('vegetableOnigiri', p => {
    leaf(p, 4, 21); leaf(p, 21, 20, true);
    p.poly([[14, 4], [18, 4], [21, 8], [28, 23], [26, 27], [6, 27], [4, 23], [11, 8]], C.shade, C.ink);
    p.poly([[14, 5], [17, 5], [23, 15], [26, 23], [23, 25], [7, 25], [5, 23], [12, 9]], C.cream);
    p.poly([[14, 7], [17, 7], [22, 17], [10, 18]], C.rice);
    riceGrains(p, [[12, 11], [10, 15], [18, 14], [7, 21], [22, 20], [11, 23], [19, 23]]);
    p.rect(12, 18, 8, 9, C.forest); p.rect(13, 19, 6, 7, C.green);
    p.rect(14, 19, 1, 6, C.leaf); p.rect(17, 21, 1, 5, C.forest);
    for (const [x, y] of [[11, 13], [19, 12], [9, 19], [22, 22]]) p.dot(x, y, C.green);
    p.dot(17, 10, C.coral); p.dot(20, 17, C.coral);
  });

  add('fishBento', p => {
    p.rect(3, 7, 26, 22, C.ink); p.rect(2, 9, 28, 18, C.ink);
    p.rect(3, 9, 26, 18, C.wine); p.rect(4, 8, 24, 17, C.red);
    p.rect(5, 9, 22, 15, C.wood); p.rect(6, 10, 11, 13, C.cream);
    riceGrains(p, [[7, 11], [11, 10], [14, 12], [8, 14], [12, 15], [7, 18], [11, 20], [14, 19]]);
    p.oval(10, 14, 5, 5, C.wine); p.oval(10, 14, 4, 3, C.red); p.dot(11, 14, C.blush);
    p.rect(18, 10, 8, 6, C.forest); p.rect(19, 11, 6, 4, C.yellow);
    p.rect(20, 11, 1, 4, C.pale); p.rect(23, 11, 1, 4, C.gold);
    p.poly([[19, 17], [24, 17], [26, 20], [24, 22], [19, 21]], C.gold, C.ink);
    p.rect(19, 18, 5, 1, C.pale); p.rect(21, 19, 1, 2, C.wood); p.dot(24, 19, C.ink);
    p.rect(5, 25, 22, 1, C.coral); p.rect(6, 28, 20, 1, C.dark);
    p.rect(6, 4, 21, 1, C.wood); p.rect(5, 5, 21, 1, C.tan);
  });

  add('tomato', p => {
    p.oval(4, 9, 24, 20, C.wine, C.ink);
    p.oval(5, 8, 22, 18, C.red);
    p.oval(7, 10, 15, 13, C.coral);
    p.oval(8, 11, 6, 5, C.blush); p.rect(9, 11, 3, 2, C.pale);
    p.poly([[16, 9], [9, 6], [11, 10], [6, 12], [13, 12], [15, 16], [17, 12], [23, 13], [21, 10], [24, 7], [18, 9]], C.forest);
    p.poly([[16, 9], [11, 8], [14, 11], [10, 12], [16, 11], [16, 14], [18, 11], [22, 11], [20, 9]], C.green);
    p.rect(16, 4, 2, 6, C.forest); p.rect(16, 4, 1, 4, C.leaf);
    p.rect(21, 22, 3, 1, C.red); p.dot(25, 18, C.coral);
  });

  add('apple', p => {
    p.poly([[14, 8], [7, 8], [4, 12], [4, 20], [7, 26], [12, 28], [16, 26], [21, 28], [26, 24], [28, 15], [26, 10], [21, 8], [17, 10]], C.wine, C.ink);
    p.poly([[14, 10], [8, 9], [5, 13], [6, 21], [10, 26], [15, 25], [20, 26], [24, 22], [26, 14], [23, 10], [19, 10], [16, 12]], C.red);
    p.oval(7, 11, 8, 12, C.coral); p.rect(8, 12, 2, 5, C.blush); p.rect(9, 12, 2, 2, C.pale);
    p.rect(16, 4, 2, 7, C.wood); p.dot(17, 3, C.ink);
    leaf(p, 19, 4, true); p.rect(17, 8, 3, 1, C.green);
    p.dot(10, 23, C.gold); p.dot(13, 22, C.gold); p.dot(22, 18, C.coral);
    p.rect(14, 10, 3, 1, C.dark);
  });

  add('offeringDaikon', p => {
    p.poly([[12, 12], [20, 12], [22, 16], [20, 23], [16, 28], [13, 30], [14, 26], [11, 21], [10, 16]], C.shade, C.ink);
    p.poly([[13, 13], [18, 13], [19, 18], [17, 25], [14, 28], [15, 24], [12, 19]], C.rice);
    p.rect(18, 16, 3, 1, C.light); p.rect(17, 20, 3, 1, C.light); p.rect(14, 24, 2, 1, C.shade);
    p.rect(14, 8, 4, 7, C.green); p.rect(15, 8, 1, 6, C.mint);
    leaf(p, 6, 4); leaf(p, 19, 4, true);
    p.poly([[15, 10], [12, 6], [12, 2], [16, 3], [18, 7], [18, 11]], C.green, C.forest);
    p.rect(14, 3, 1, 5, C.leaf); p.dot(15, 7, C.mint);
    p.rect(11, 10, 2, 2, C.leaf); p.rect(19, 10, 2, 2, C.leaf);
  });

  add('starGrapes', p => {
    p.rect(15, 3, 2, 6, C.wood); p.rect(16, 3, 5, 1, C.wood);
    leaf(p, 7, 4); leaf(p, 20, 5, true);
    for (const [x, y] of [[11, 7], [17, 8], [6, 11], [13, 12], [20, 12], [9, 17], [16, 17], [12, 22]]) {
      p.oval(x, y, 7, 7, C.purple, C.plum);
      p.oval(x + 1, y + 1, 4, 3, C.lilac); p.dot(x + 2, y + 1, C.pink);
      p.rect(x + 3, y + 5, 2, 1, C.plum);
    }
    p.poly([[24, 3], [25, 6], [28, 7], [25, 8], [24, 11], [23, 8], [20, 7], [23, 6]], C.gold, C.wood);
    p.rect(23, 6, 2, 3, C.pale); p.rect(22, 7, 4, 1, C.yellow);
  });

  add('wildGreens', p => {
    p.poly([[13, 13], [20, 13], [18, 28], [14, 29]], C.forest, C.ink);
    p.rect(15, 15, 1, 13, C.leaf); p.rect(17, 16, 1, 12, C.mint);
    leaf(p, 5, 6); leaf(p, 19, 4, true); leaf(p, 7, 13); leaf(p, 20, 13, true);
    p.poly([[14, 15], [11, 10], [13, 3], [17, 2], [20, 7], [17, 13]], C.green, C.forest);
    p.rect(15, 4, 1, 10, C.mint); p.rect(13, 7, 2, 1, C.leaf); p.rect(16, 9, 2, 1, C.leaf);
    p.rect(12, 22, 9, 3, C.wood); p.rect(12, 22, 9, 1, C.yellow);
    p.rect(16, 21, 2, 5, C.gold); p.dot(15, 23, C.pale);
    p.poly([[19, 23], [23, 25], [22, 27], [19, 25]], C.tan, C.wood);
  });

  // Each fillet has its own silhouette, skin, flesh and cut pattern rather than
  // simply changing the color of a single generic fish slice.
  add('fishFillet', p => {
    leaf(p, 4, 21); leaf(p, 20, 22, true);
    p.poly([[4, 18], [11, 10], [24, 8], [28, 12], [23, 22], [8, 25], [4, 23]], C.sea, C.ink);
    p.poly([[4, 17], [11, 9], [24, 7], [28, 11], [22, 20], [8, 23], [4, 21]], C.coral, C.wine);
    p.poly([[7, 17], [12, 11], [23, 9], [25, 11], [21, 18], [9, 21]], C.blush);
    for (let n = 0; n < 4; n++) {
      p.poly([[10 + n * 3, 12 - n], [11 + n * 3, 13 - n], [9 + n * 3, 19 - n], [8 + n * 3, 19 - n]], C.cream);
    }
    p.rect(9, 23, 4, 1, C.light); p.rect(16, 22, 4, 1, C.blue); p.dot(23, 20, C.light);
  });

  add('shirogisuFillet', p => {
    leaf(p, 5, 21); leaf(p, 20, 21, true);
    p.poly([[6, 9], [13, 7], [16, 10], [17, 18], [15, 26], [11, 23], [7, 17]], C.blue, C.ink);
    p.poly([[7, 9], [13, 8], [15, 11], [16, 19], [14, 23], [11, 21], [8, 16]], C.cream);
    p.poly([[18, 9], [25, 10], [25, 17], [20, 25], [17, 23], [17, 16]], C.sea, C.ink);
    p.poly([[19, 10], [24, 11], [23, 17], [20, 23], [18, 21], [18, 16]], C.rice);
    p.rect(10, 10, 1, 7, C.shade); p.rect(12, 17, 1, 4, C.shade);
    p.rect(21, 12, 1, 6, C.shade); p.dot(20, 19, C.shade);
    p.rect(10, 11, 3, 1, C.blush); p.rect(19, 15, 3, 1, C.blush);
    p.rect(8, 11, 1, 4, C.white); p.rect(23, 12, 1, 3, C.white);
  });

  add('ayuFillet', p => {
    leaf(p, 5, 22); leaf(p, 20, 22, true);
    p.poly([[4, 18], [8, 12], [22, 9], [28, 12], [26, 18], [10, 24], [5, 23]], C.forest, C.ink);
    p.poly([[5, 17], [9, 12], [22, 8], [27, 11], [24, 17], [9, 22], [5, 21]], C.shade, C.wood);
    p.poly([[7, 17], [10, 13], [22, 10], [25, 11], [23, 15], [10, 20]], C.cream);
    for (let n = 0; n < 5; n++) {
      p.rect(9 + n * 3, 16 - Math.floor(n / 2), 1, 3, C.tan);
      p.dot(10 + n * 3, 21 - Math.floor(n / 2), C.gold);
    }
    p.rect(20, 10, 3, 1, C.pale); p.rect(7, 21, 4, 1, C.leaf);
  });

  add('madaiFillet', p => {
    leaf(p, 3, 20); leaf(p, 21, 20, true);
    p.poly([[6, 12], [13, 7], [23, 10], [27, 17], [25, 24], [17, 26], [6, 23]], C.wine, C.ink);
    p.poly([[6, 11], [13, 6], [23, 9], [27, 16], [24, 21], [16, 23], [6, 20]], C.coral, C.wine);
    p.poly([[8, 12], [13, 8], [22, 11], [25, 16], [22, 19], [16, 21], [8, 18]], C.cream);
    p.poly([[12, 10], [14, 11], [12, 18], [10, 18]], C.blush);
    p.poly([[17, 11], [19, 12], [17, 20], [15, 20]], C.blush);
    p.poly([[21, 13], [23, 15], [21, 18], [19, 19]], C.shade);
    p.rect(9, 22, 3, 1, C.red); p.rect(16, 24, 3, 1, C.coral); p.dot(23, 22, C.blush);
  });

  add('bigFishPlate', p => {
    plate(p); leaf(p, 5, 19); leaf(p, 20, 18, true);
    fish(p, 7, 10, C.red, C.blush, C.coral, true);
    p.rect(10, 13, 1, 4, C.wine); p.rect(14, 12, 1, 5, C.wine); p.rect(18, 13, 1, 4, C.wine);
    p.dot(11, 12, C.pale); p.dot(16, 11, C.pale); p.dot(18, 15, C.cream);
    p.oval(20, 20, 6, 5, C.gold, C.wood); p.oval(21, 20, 4, 4, C.yellow);
    p.rect(23, 21, 1, 3, C.cream); p.rect(21, 22, 3, 1, C.cream);
  });

  add('shellSoup', p => {
    steam(p, 9, 4); steam(p, 23, 3);
    bowl(p, C.tan, C.sea);
    p.rect(7, 22, 2, 2, C.blue); p.rect(10, 25, 12, 1, C.blue); p.rect(24, 21, 1, 3, C.light);
    p.poly([[8, 16], [8, 12], [10, 9], [14, 9], [17, 12], [17, 16]], C.tan, C.dark);
    p.poly([[9, 15], [10, 11], [13, 10], [15, 12], [16, 15]], C.cream);
    p.rect(11, 11, 1, 4, C.gold); p.rect(14, 12, 1, 3, C.gold);
    p.poly([[16, 17], [18, 12], [22, 11], [25, 14], [24, 18]], C.wood, C.dark);
    p.poly([[18, 16], [19, 13], [22, 12], [24, 15], [23, 17]], C.blush);
    p.dot(21, 13, C.cream); p.rect(20, 15, 3, 1, C.tan);
    p.rect(8, 17, 3, 1, C.green); p.rect(19, 18, 2, 1, C.green); p.dot(25, 16, C.leaf);
    p.dot(6, 14, C.pale); p.dot(14, 18, C.pale);
  });

  add('mountainPlate', p => {
    plate(p, C.tan); leaf(p, 4, 15); leaf(p, 7, 19); leaf(p, 21, 18, true);
    p.rect(13, 11, 3, 9, C.cream); p.rect(15, 13, 2, 6, C.tan);
    p.oval(8, 6, 14, 9, C.wood, C.dark); p.oval(10, 7, 10, 5, C.tan);
    p.rect(10, 12, 10, 1, C.gold); p.dot(12, 8, C.cream); p.rect(16, 9, 2, 1, C.pale);
    p.rect(23, 14, 2, 6, C.shade); p.oval(19, 10, 9, 6, C.red, C.dark);
    p.rect(21, 11, 2, 1, C.blush); p.dot(25, 13, C.pale);
    p.oval(12, 20, 6, 5, C.wood, C.dark); p.rect(14, 20, 1, 4, C.gold);
    p.oval(19, 21, 5, 4, C.tan, C.dark); p.dot(21, 21, C.pale);
    p.dot(6, 18, C.mint); p.dot(9, 23, C.mint);
  });

  add('shrimpRice', p => {
    bowl(p, C.cream, C.red);
    p.oval(5, 10, 22, 9, C.cream);
    riceGrains(p, [[6, 13], [9, 11], [14, 12], [20, 11], [23, 13], [7, 16], [13, 17], [20, 17], [24, 16]]);
    p.poly([[12, 7], [17, 6], [22, 8], [24, 12], [22, 16], [17, 17], [13, 14], [14, 11], [17, 12], [19, 13], [20, 11], [18, 9], [14, 10]], C.red, C.wine);
    p.poly([[13, 7], [17, 7], [21, 9], [22, 12], [20, 15], [17, 15], [15, 13], [17, 13], [20, 14], [22, 11], [18, 8], [14, 9]], C.blush);
    p.rect(19, 8, 1, 3, C.cream); p.rect(21, 12, 2, 1, C.cream); p.rect(17, 14, 1, 2, C.cream);
    p.poly([[13, 9], [8, 6], [9, 10], [7, 12], [12, 12], [15, 10]], C.coral, C.wine);
    p.dot(10, 8, C.blush); p.rect(7, 16, 3, 1, C.green); p.rect(21, 18, 2, 1, C.green);
  });

  add('shirogisuTempura', p => {
    plate(p); leaf(p, 5, 19); leaf(p, 21, 20, true);
    p.poly([[7, 9], [11, 6], [15, 8], [16, 13], [13, 21], [9, 22], [7, 18]], C.gold, C.wood);
    p.poly([[8, 10], [11, 8], [13, 9], [14, 13], [12, 19], [9, 20]], C.yellow);
    p.poly([[18, 10], [22, 7], [25, 10], [25, 15], [20, 23], [17, 22], [16, 18]], C.gold, C.wood);
    p.poly([[19, 11], [22, 9], [23, 11], [23, 15], [20, 20], [18, 21], [18, 17]], C.yellow);
    p.poly([[9, 22], [7, 26], [11, 24], [14, 25], [13, 21]], C.coral, C.wine);
    p.poly([[18, 22], [16, 26], [20, 25], [22, 27], [21, 22]], C.coral, C.wine);
    for (const [x, y] of [[10, 9], [8, 13], [12, 13], [10, 17], [20, 11], [22, 14], [19, 17]]) {
      p.rect(x, y, 2, 1, C.pale); p.dot(x, y + 2, C.tan);
    }
    p.dot(15, 19, C.gold); p.dot(25, 18, C.gold);
  });

  add('ayuShioyaki', p => {
    plate(p, C.tan); leaf(p, 5, 19); leaf(p, 19, 20, true);
    p.poly([[2, 23], [2, 21], [28, 7], [30, 7], [30, 8]], C.wood);
    p.poly([[3, 21], [29, 7], [29, 8], [3, 22]], C.tan);
    p.poly([[7, 17], [3, 16], [4, 22], [8, 20]], C.gold, C.ink);
    p.poly([[7, 16], [13, 11], [23, 8], [28, 10], [27, 14], [18, 18], [9, 21]], C.green, C.ink);
    p.poly([[8, 17], [14, 13], [24, 10], [27, 11], [25, 14], [17, 17], [9, 20]], C.gold);
    p.poly([[11, 18], [18, 14], [25, 12], [24, 14], [17, 18], [10, 20]], C.cream);
    p.poly([[13, 12], [13, 8], [17, 10]], C.gold, C.wood);
    p.poly([[17, 18], [20, 21], [22, 16]], C.gold, C.wood);
    p.rect(12, 15, 1, 3, C.wood); p.rect(16, 13, 1, 3, C.wood); p.rect(20, 12, 1, 3, C.wood);
    p.dot(24, 11, C.ink); p.dot(23, 10, C.cream); p.dot(26, 13, C.ink);
    for (const [x, y] of [[10, 17], [14, 14], [18, 13], [22, 12]]) p.dot(x, y, C.white);
    p.oval(22, 21, 5, 4, C.leaf, C.forest); p.dot(24, 21, C.pale);
  });

  add('madaiUshiojiru', p => {
    steam(p, 8, 3); steam(p, 24, 3);
    bowl(p, C.pale, C.sea);
    p.rect(8, 23, 2, 2, C.light); p.rect(11, 25, 10, 1, C.blue); p.rect(24, 22, 1, 2, C.light);
    p.poly([[10, 13], [13, 8], [20, 8], [25, 13], [23, 17], [17, 18]], C.red, C.wine);
    p.poly([[12, 13], [15, 10], [20, 10], [23, 13], [21, 16], [17, 16]], C.cream);
    p.rect(17, 11, 1, 4, C.blush); p.dot(22, 12, C.ink); p.dot(21, 11, C.white);
    p.poly([[12, 9], [11, 6], [14, 7], [16, 5], [17, 8]], C.coral, C.wine);
    p.rect(7, 14, 3, 3, C.white); p.rect(7, 16, 3, 1, C.shade);
    p.rect(20, 17, 3, 2, C.white); p.rect(23, 15, 3, 1, C.green);
    leaf(p, 6, 10); p.dot(14, 18, C.green); p.dot(25, 16, C.leaf);
  });

  add('nutFishJerky', p => {
    // Dark bamboo mat, three dried fish strips and a split walnut.
    p.poly([[4, 10], [25, 7], [29, 23], [7, 27]], C.wood, C.ink);
    for (let i = 0; i < 6; i++) p.poly([[6 + i * 3, 10], [7 + i * 3, 9], [10 + i * 3, 24], [9 + i * 3, 25]], C.tan);
    p.poly([[5, 10], [8, 8], [12, 11], [14, 20], [11, 22], [8, 17]], C.wine, C.dark);
    p.poly([[11, 8], [14, 6], [18, 10], [19, 19], [16, 21], [14, 17]], C.wood, C.dark);
    p.poly([[18, 7], [21, 6], [25, 10], [26, 16], [23, 18], [20, 13]], C.red, C.dark);
    p.poly([[6, 10], [8, 10], [11, 18], [10, 19]], C.coral);
    p.poly([[12, 9], [14, 9], [17, 17], [16, 18]], C.gold);
    p.poly([[19, 8], [21, 8], [24, 14], [23, 15]], C.tan);
    p.dot(8, 13, C.pale); p.dot(15, 13, C.pale); p.dot(22, 11, C.blush);
    p.oval(18, 20, 10, 8, C.wood, C.dark); p.oval(19, 20, 7, 6, C.tan);
    p.rect(22, 20, 1, 6, C.dark); p.rect(20, 21, 1, 3, C.pale); p.rect(24, 21, 1, 3, C.gold);
    p.dot(21, 23, C.wood); p.dot(23, 24, C.wood); p.dot(25, 22, C.cream);
    p.oval(11, 24, 5, 4, C.gold, C.wood); p.dot(12, 25, C.pale);
  });

  const ids = Object.freeze(Object.keys(sprites));
  Object.freeze(sprites);
  return Object.freeze({
    ids,
    get(id) {
      return typeof id === 'string' && Object.prototype.hasOwnProperty.call(sprites, id) ? sprites[id] : '';
    }
  });
});
