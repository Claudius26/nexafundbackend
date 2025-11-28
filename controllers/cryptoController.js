const { getCryptoPrices, getCryptoChart } = require("../services/cryptoPrice");

async function fetchPrices(req, res) {
  try {
    const data = await getCryptoPrices();
    if (!data) return res.status(503).json({ error: "Failed to fetch prices" });
    res.json(data);
  } catch (err) {
    console.error("FETCH PRICES ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
}

async function fetchChart(req, res) {
  try {
    const symbol = (req.params.symbol || "").toUpperCase();
    const days = parseInt(req.query.days) || 7;

    const data = await getCryptoChart(symbol, days);
    if (!data) return res.status(503).json({ error: `Failed to fetch chart for ${symbol}` });

    res.json(data);
  } catch (err) {
    console.error("FETCH CHART ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
}

module.exports = { fetchPrices, fetchChart };
