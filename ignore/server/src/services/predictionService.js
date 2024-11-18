const axios = require('axios');

const API_KEY = process.env.OPENWEATHER_API_KEY;
const AMBEE_API_KEY = process.env.AMBEE_API_KEY;

async function getPredictionScore(lat, lon) {
  // Get weather data from OpenWeatherMap
  const weatherData = await getWeatherData(lat, lon);
  
  // Get air quality data from OpenAQ
  const airQualityData = await getAirQualityData(lat, lon);
  
  return weatherData.daily.map((day, index) => {
    const score = calculateSunsetScore({
      clouds: day.clouds,
      humidity: day.humidity,
      windSpeed: day.wind_speed,
      airQuality: airQualityData[index]?.value || 50,
      pressure: day.pressure,
      precipitation: day.pop,
      visibility: day.visibility,
      uvIndex: day.uvi,
      temp: day.temp.day,
      weather: day.weather[0].main
    });

    return {
      date: new Date(day.dt * 1000).toISOString(),
      score,
      cloudCover: day.clouds,
      humidity: day.humidity,
      airQuality: airQualityData[index]?.value || 'N/A',
      sunsetTime: new Date(day.sunset * 1000).toLocaleTimeString(),
      weatherCondition: day.weather[0].main,
      precipitationChance: Math.round(day.pop * 100)
    };
  });
}

function calculateSunsetScore(params) {
  let score = 100;
  
  // Weather condition base scores
  const weatherScores = {
    'Clear': 90,
    'Clouds': 75,
    'Rain': 30,
    'Snow': 40,
    'Drizzle': 35,
    'Thunderstorm': 20,
    'Mist': 45,
    'Fog': 40
  };
  
  // Start with base score for weather condition
  score = weatherScores[params.weather] || 50;

  // Cloud cover impact (most important factor)
  // Some clouds (20-40%) can actually improve sunset quality
  if (params.clouds < 20) {
    score += 10;
  } else if (params.clouds <= 40) {
    score += 15; // Optimal cloud coverage
  } else {
    score -= (params.clouds - 40) * 0.8;
  }

  // Humidity affects color intensity and visibility
  // Optimal humidity is between 40-60%
  const humidityDiff = Math.abs(params.humidity - 50);
  score -= humidityDiff * 0.3;

  // Wind speed affects cloud movement and stability
  // Light breeze (3-10 mph) is ideal
  if (params.windSpeed < 3) {
    score -= 5;
  } else if (params.windSpeed > 10) {
    score -= (params.windSpeed - 10) * 1.5;
  }

  // Air quality impact on visibility
  // AQI scale: 0-50 good, 51-100 moderate, 101-150 unhealthy for sensitive groups
  if (params.airQuality > 50) {
    score -= (params.airQuality - 50) * 0.3;
  }

  // Precipitation probability
  score -= params.precipitation * 50;

  // UV Index can indicate atmospheric clarity
  // Optimal UV index for sunsets is moderate (3-5)
  const uvDiff = Math.abs(params.uvIndex - 4);
  score -= uvDiff * 2;

  // Temperature can affect atmospheric conditions
  // Extreme temperatures can impact visibility
  const optimalTemp = 20; // 20°C
  const tempDiff = Math.abs(params.temp - optimalTemp);
  score -= tempDiff * 0.2;

  // Atmospheric pressure indicates stability
  // Normal pressure is around 1013 hPa
  const pressureDiff = Math.abs(params.pressure - 1013);
  score -= pressureDiff * 0.05;

  // Ensure score stays within 0-100 range
  return Math.max(0, Math.min(100, Math.round(score)));
}

async function getWeatherData(lat, lon) {
  const API_KEY = process.env.OPENWEATHER_API_KEY;
  const response = await axios.get(
    `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=minutely,hourly&appid=${API_KEY}`
  );
  return response.data;
}

async function getAirQualityData(lat, lon) {
  try {
    // Try OpenWeatherMap Air Quality API first
    const openWeatherAQ = await axios.get(
      `http://api.openweathermap.org/data/2.5/air_pollution/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}`
    );
    
    if (openWeatherAQ.data.list) {
      return openWeatherAQ.data.list.map(item => ({
        value: calculateAQIFromComponents(item.components),
        timestamp: item.dt
      }));
    }

    // Fallback to Ambee API if OpenWeatherMap fails
    const ambeeResponse = await axios.get(
      `https://api.ambeedata.com/latest/by-lat-lng?lat=${lat}&lng=${lon}`,
      {
        headers: { 'x-api-key': AMBEE_API_KEY }
      }
    );
    
    return ambeeResponse.data.stations.map(station => ({
      value: station.AQI,
      timestamp: new Date(station.updatedAt).getTime() / 1000
    }));

  } catch (error) {
    console.error('Error fetching air quality data:', error);
    // Return estimated AQI based on weather conditions if both APIs fail
    return estimateAQIFromWeather(weatherData);
  }
}

function calculateAQIFromComponents(components) {
  // Calculate US EPA AQI from pollutant concentrations
  const { pm2_5, pm10, no2, o3, co, so2 } = components;
  
  // Calculate individual AQI values for each pollutant
  const pm25AQI = calculatePM25AQI(pm2_5);
  const pm10AQI = calculatePM10AQI(pm10);
  const no2AQI = calculateNO2AQI(no2);
  const o3AQI = calculateO3AQI(o3);
  
  // Return the highest AQI value
  return Math.max(pm25AQI, pm10AQI, no2AQI, o3AQI);
}

function estimateAQIFromWeather(weatherData) {
  // Estimate AQI based on weather conditions when no AQI data is available
  let estimatedAQI = 50; // Start with moderate conditions
  
  const weather = weatherData.weather[0].main;
  const windSpeed = weatherData.wind_speed;
  const humidity = weatherData.humidity;
  const rain = weatherData.rain ? weatherData.rain['1h'] : 0;
  
  // Adjust based on weather conditions
  switch (weather) {
    case 'Rain':
      estimatedAQI -= 20; // Rain typically improves air quality
      break;
    case 'Fog':
    case 'Mist':
      estimatedAQI += 30; // Fog often indicates poor air quality
      break;
    case 'Clear':
      if (windSpeed < 2) {
        estimatedAQI += 10; // Stagnant air can worsen air quality
      }
      break;
  }
  
  // Wind speed affects air quality
  if (windSpeed > 5) {
    estimatedAQI -= Math.min(20, windSpeed * 2);
  }
  
  // High humidity can trap pollutants
  if (humidity > 70) {
    estimatedAQI += Math.min(20, (humidity - 70) * 0.5);
  }
  
  return Math.max(0, Math.min(150, Math.round(estimatedAQI)));
}

// Add these AQI calculation functions
function calculatePM25AQI(pm25) {
  // EPA PM2.5 breakpoints
  if (pm25 <= 12.0) return linearScale(pm25, 0, 12.0, 0, 50);
  if (pm25 <= 35.4) return linearScale(pm25, 12.1, 35.4, 51, 100);
  if (pm25 <= 55.4) return linearScale(pm25, 35.5, 55.4, 101, 150);
  if (pm25 <= 150.4) return linearScale(pm25, 55.5, 150.4, 151, 200);
  if (pm25 <= 250.4) return linearScale(pm25, 150.5, 250.4, 201, 300);
  return linearScale(pm25, 250.5, 500.4, 301, 500);
}

function linearScale(value, inMin, inMax, outMin, outMax) {
  return Math.round(
    ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin
  );
}

module.exports = { getPredictionScore }; 