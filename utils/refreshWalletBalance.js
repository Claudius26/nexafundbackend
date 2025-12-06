const { getCryptoPrices } = require("../services/cryptoPrice");

async function refreshWalletValues(user) {
  const coinData = await getCryptoPrices();

  user.wallets.forEach(w => {
    const price = coinData[w.coin]?.price || 0;
    w.amountUsd = w.amount * price;
  });

  user.balance = user.wallets.reduce((sum, w) => sum + w.amountUsd, 0);

  await user.save();
}

module.exports = { refreshWalletValues };
