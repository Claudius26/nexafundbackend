const fetch = require("node-fetch");

const chartCache = {};
const priceCache = { data: null, time: 0 };

const CACHE_TIME = 60 * 1000;          
const STALE_OK_TIME = 30 * 60 * 1000;  

const coinIdMap = {
  BTC: "bitcoin",
  ETH: "ethereum",
  USDT: "tether",
  USDC: "usd-coin",
  BNB: "binancecoin",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  SOL: "solana",
  TRX: "tron",
  DOT: "polkadot",
  MATIC: "polygon",
  LTC: "litecoin",
  AVAX: "avalanche-2",
  LINK: "chainlink",
  ATOM: "cosmos",
  XLM: "stellar",
  ETC: "ethereum-classic",
  BCH: "bitcoin-cash",
  FIL: "filecoin",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJsonWithRetry(url, retries = 2) {
  let lastErr;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "nexafunded/1.0 (Render)",
        "Accept": "application/json",
      },
    });

    if (res.ok) return res.json();

    if (res.status === 429 && attempt < retries) {
      const wait = 800 * Math.pow(2, attempt);
      await sleep(wait);
      continue;
    }

    const err = new Error(`CoinGecko failed: ${res.status}`);
    err.status = res.status;
    lastErr = err;
    break;
  }

  throw lastErr;
}

async function getCryptoPrices() {
  const now = Date.now();

  if (priceCache.data && (now - priceCache.time) < CACHE_TIME) {
    return priceCache.data;
  }

  const ids = Object.values(coinIdMap).join(",");
  const url =
    `https://api.coingecko.com/api/v3/simple/price` +
    `?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;

  try {
    const data = await fetchJsonWithRetry(url, 2);

    const formatted = {};
    for (const symbol in coinIdMap) {
      const id = coinIdMap[symbol];
      formatted[symbol] = {
        price: Number(data[id]?.usd) || 0,
        change: Number(data[id]?.usd_24h_change) || 0,
      };
    }

    if (!formatted.BTC?.price && !formatted.ETH?.price) {
      const err = new Error("CoinGecko returned invalid data");
      err.status = 502;
      throw err;
    }

    priceCache.data = formatted;
    priceCache.time = now;
    return formatted;

  } catch (err) {
    console.error("PRICE FETCH ERROR:", err);

    // Stale fallback (even if expired) to avoid breaking prod actions
    if (priceCache.data && (now - priceCache.time) < STALE_OK_TIME) {
      return priceCache.data;
    }

    // Important: return null to let controllers respond correctly (503), not "Unsupported coin"
    return null;
  }
}

async function getCryptoChart(symbol, days = 7) {
  const sym = String(symbol || "").trim().toUpperCase();
  const coinId = coinIdMap[sym];
  if (!coinId) return null;

  const now = Date.now();

  if (chartCache[sym] && now - chartCache[sym].time < CACHE_TIME) {
    return chartCache[sym].data;
  }

  try {
    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;

    const data = await fetchJsonWithRetry(url, 2);

    const formatted = (data.prices || []).map(([timestamp, price]) => ({
      time: new Date(timestamp).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
      }),
      price: Number(price) || 0,
    }));

    chartCache[sym] = { data: formatted, time: now };
    return formatted;

  } catch (err) {
    console.error("CHART FETCH ERROR:", err);
    return chartCache[sym]?.data || null;
  }
}

module.exports = { getCryptoPrices, getCryptoChart };
