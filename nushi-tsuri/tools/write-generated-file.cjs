'use strict';
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');

// Readers, including a checkout being staged, only see complete artifacts.
module.exports = function writeGeneratedFile(file, bytes) {
  const temporary = file + '.' + randomUUID() + '.tmp';
  try {
    fs.writeFileSync(temporary, bytes, {flag:'wx'});
    fs.renameSync(temporary, file);
  } finally {
    fs.rmSync(temporary, {force:true});
  }
};
