const { getCryptoPrices } = require("../services/cryptoPrice");

let cachedPrices = null;
let lastFetched = 0;
const CACHE_DURATION = 10 * 60 * 1000;

async function getCryptoPricesSafe() {
  const now = Date.now();
  if (cachedPrices && now - lastFetched < CACHE_DURATION) return cachedPrices;

  try {
    cachedPrices = await getCryptoPrices();
    lastFetched = now;
    return cachedPrices;
  } catch (err) {
    console.error("PRICE FETCH ERROR:", err);
    return cachedPrices || {};
  }
}

async function refreshWalletValues(user) {
  const coinData = await getCryptoPricesSafe();

  user.wallets.forEach(w => {
    const price = coinData[w.coin]?.price || 0; 
    w.amountUsd = w.amount * price;
  });

  user.balance = user.wallets.reduce((sum, w) => sum + w.amountUsd, 0);

  await user.save();
}

module.exports = { refreshWalletValues };
