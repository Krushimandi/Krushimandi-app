const { onRequest } = require("firebase-functions/v2/https");
const axios = require("axios");
const cheerio = require("cheerio");

const MANDI_URL =
  "https://www.mandiprices.com/mousambi-sweet-lime-price/west-bengal/mechua/other.html?sta=NCT+of+Delhi&loc=Azadpur&var=Mousambi&go=Go";

/**
 * Fetches Mousambi price data from MandiPrices.com
 */
exports.getMousambiPrice = onRequest(async (req, res) => {
  try {
    const { data } = await axios.get(MANDI_URL);
    const $ = cheerio.load(data);

    let minPrice = 0,
      maxPrice = 0,
      avgPrice = 0;

    // Scrape price table rows
    $("table tbody tr").each((_, row) => {
      const cols = $(row).find("td");
      const marketName = $(cols[0]).text().trim().toLowerCase();

      if (marketName.includes("azadpur")) {
        minPrice = parseInt($(cols[1]).text().replace(/[^\d]/g, "")) || 0;
        maxPrice = parseInt($(cols[2]).text().replace(/[^\d]/g, "")) || 0;
        avgPrice = parseInt($(cols[3]).text().replace(/[^\d]/g, "")) || 0;
      }
    });

    if (!avgPrice) {
      return res.status(404).json({
        success: false,
        message: "Price not found — site structure may have changed.",
      });
    }

    // Convert quintal → per kg
    const pricePerKg = {
      min: (minPrice / 100).toFixed(2),
      max: (maxPrice / 100).toFixed(2),
      avg: (avgPrice / 100).toFixed(2),
    };

    res.json({
      success: true,
      commodity: "Mousambi (Sweet Lime)",
      mandi: "Azadpur, Delhi",
      unit: "₹ per kg",
      prices: pricePerKg,
      source: MANDI_URL,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching mandi price:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch price",
      error: error.message,
    });
  }
});