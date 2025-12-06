function calculateBalance(wallets, prices) {
  let total = 0;

  wallets.forEach(w => {
    const coinData = prices[w.coin];

    if (!coinData) return;

    const price = typeof coinData === "number"
      ? coinData
      : coinData.price;

    if (!price) return;

    total += w.amount * price;
  });

  return Number(total.toFixed(2));
}

module.exports = calculateBalance;
