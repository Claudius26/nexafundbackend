require('dotenv').config();
const { getCryptoPrices, getCryptoChart } = require('./services/cryptoPrice');

async function test() {
  try {
    console.log("Fetching prices...");
    const prices = await getCryptoPrices();
    console.log("Prices:", prices);

    console.log("\nFetching BTC chart...");
    const btcChart = await getCryptoChart('BTC', 7);
    console.log("BTC chart data points:", btcChart?.prices?.length || 0);

    console.log("\nFetching ETH chart...");
    const ethChart = await getCryptoChart('ETH', 7);
    console.log("ETH chart data points:", ethChart?.prices?.length || 0);

  } catch (err) {
    console.error("Service test error:", err);
  }
}

test();
