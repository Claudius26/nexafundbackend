const fetch = require("node-fetch");

const chartCache = {};
const priceCache = {};
const CACHE_TIME = 10 * 60 * 1000; // 10 mins

const coinIdMap = {
  BTC: "bitcoin",
  ETH: "ethereum",
  USDT: "tether",
  LTC: "litecoin",
  XRP: "ripple",
  SOL: "solana",
};

async function getCryptoPrices() {
  const now = Date.now();

  if (priceCache.time && now - priceCache.time < CACHE_TIME) {
    return priceCache.data;
  }

  try {
    const ids = Object.values(coinIdMap).join(",");
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`CoinGecko failed: ${res.status}`);

    const data = await res.json();

    const formatted = {};
    for (const symbol in coinIdMap) {
      const id = coinIdMap[symbol];
      formatted[symbol] = {
        price: data[id]?.usd || 0,
        change: data[id]?.usd_24h_change || 0,
      };
    }

    priceCache.data = formatted;
    priceCache.time = now;

    return formatted;
  } catch (err) {
    console.error("PRICE FETCH ERROR:", err);
    return priceCache.data || {};
  }
}

async function getCryptoChart(symbol, days = 7) {
  const coinId = coinIdMap[symbol.toUpperCase()];
  if (!coinId) return null;

  const now = Date.now();

  if (chartCache[symbol] && now - chartCache[symbol].time < CACHE_TIME) {
    return chartCache[symbol].data;
  }

  try {
    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`CoinGecko chart failed: ${res.status}`);

    const data = await res.json();

    const formatted = data.prices.map(([timestamp, price]) => ({
      time: new Date(timestamp).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
      }),
      price: Number(price) || 0,
    }));

    chartCache[symbol] = { data: formatted, time: now };
    return formatted;

  } catch (err) {
    console.error("CHART FETCH ERROR:", err);
    return chartCache[symbol]?.data || null;
  }
}

module.exports = { getCryptoPrices, getCryptoChart };
