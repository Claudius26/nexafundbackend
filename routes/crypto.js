const express = require("express");
const router = express.Router();
const { fetchPrices, fetchChart } = require("../controllers/cryptoController");

router.get("/prices", fetchPrices);
router.get("/chart/:symbol", fetchChart);

module.exports = router;
