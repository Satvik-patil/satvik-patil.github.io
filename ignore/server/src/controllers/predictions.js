const { getPredictionScore } = require('../services/predictionService');

async function getSunsetPredictions(req, res) {
  try {
    const { lat, lon } = req.query;
    const predictions = await getPredictionScore(lat, lon);
    res.json(predictions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = { getSunsetPredictions }; 