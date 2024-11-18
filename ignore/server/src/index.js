const express = require('express');
const cors = require('cors');
const { getSunsetPredictions } = require('./controllers/predictions');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/predictions', getSunsetPredictions);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 