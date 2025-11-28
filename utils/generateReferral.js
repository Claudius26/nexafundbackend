const crypto = require('crypto');

function genReferral() {
  return 'REF-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

module.exports = genReferral;
