function calculateBalance(wallets, prices) {
  let total = 0;

  wallets.forEach(w => {
    const coinPrice = prices[w.coin];
    if (coinPrice) {
      total += w.amount * coinPrice; 
    }
  });

  return Number(total.toFixed(2));
}

module.exports = calculateBalance;
