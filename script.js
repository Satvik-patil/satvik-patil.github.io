const API_KEY = "987ceceaaa7a5ea30e76a14bb069dca4";

// Remove the Google Places initialization and replace with Nominatim search
async function searchLocations(query) {
    const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
    );
    if (!response.ok) throw new Error('Location search failed');
    return response.json();
}

// Add location search functionality
const locationInput = document.getElementById('location');
const locationList = document.createElement('div');
locationList.className = 'location-suggestions';
locationInput.parentNode.appendChild(locationList);

let searchTimeout;
locationInput.addEventListener('input', async (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value;
    
    if (query.length < 3) {
        locationList.innerHTML = '';
        return;
    }

    // Add loading indicator
    locationList.innerHTML = '<div class="suggestion-item">Searching...</div>';
    
    // Debounce the search
    searchTimeout = setTimeout(async () => {
        try {
            const locations = await searchLocations(query);
            
            if (locations.length === 0) {
                locationList.innerHTML = '<div class="suggestion-item">No locations found</div>';
                return;
            }

            locationList.innerHTML = locations
                .map(loc => `
                    <div class="suggestion-item" 
                         data-lat="${loc.lat}" 
                         data-lon="${loc.lon}"
                         data-name="${loc.display_name}">
                        ${loc.display_name}
                    </div>
                `).join('');
        } catch (error) {
            locationList.innerHTML = '<div class="suggestion-item">Error searching locations</div>';
        }
    }, 300);
});

// Handle location selection
locationList.addEventListener('click', (e) => {
    const item = e.target.closest('.suggestion-item');
    if (!item) return;

    const { lat, lon, name } = item.dataset;
    document.getElementById('lat').value = lat;
    document.getElementById('lon').value = lon;
    locationInput.value = name;
    locationList.innerHTML = '';
});

// Hide suggestions when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.location-wrapper')) {
        locationList.innerHTML = '';
    }
});

// Add these helper functions at the top
function getCloudTypeScore(clouds) {
    // OpenWeather provides cloud base height in meters
    const cloudHeight = clouds.base || 0;
    const coverage = clouds.all;
    
    // High clouds (above 6000m)
    if (cloudHeight > 6000) {
        // High clouds are good between 30-70% coverage
        if (coverage >= 30 && coverage <= 70) {
            return 30; // Maximum positive impact
        } else if (coverage < 30) {
            return coverage; // Proportional score
        } else {
            return Math.max(0, 30 - (coverage - 70) * 0.5); // Gradually reduce score
        }
    }
    // Mid-level clouds (2000-6000m)
    else if (cloudHeight > 2000) {
        // Mid clouds are best around 20-40% coverage
        if (coverage >= 20 && coverage <= 40) {
            return 20;
        } else {
            return Math.max(0, 20 - Math.abs(30 - coverage) * 0.3);
        }
    }
    // Low clouds (below 2000m)
    else {
        // Low clouds generally decrease quality
        return Math.max(0, 10 - coverage * 0.2);
    }
}

function getAtmosphericScore(weather, airQuality) {
    let score = 0;
    
    // Humidity factor (40-60% is ideal, be more strict)
    const humidity = weather.main.humidity;
    if (humidity >= 40 && humidity <= 60) {
        score += 15;
    } else {
        score += Math.max(0, 15 - Math.abs(50 - humidity) * 0.5);
    }
    
    // Air quality/visibility factor
    if (airQuality && airQuality.aqi !== undefined) {
        // PM2.5 impact
        const pm25 = airQuality.iaqi.pm25?.v;
        if (pm25 !== undefined) {
            if (pm25 <= 35) score += 10;
            else if (pm25 <= 75) score += 5;
            else if (pm25 <= 115) score += 2;
            else score = Math.max(0, score - 10);
        }
        
        // Ozone level impact
        const o3 = airQuality.iaqi.o3?.v;
        if (o3 !== undefined) {
            if (o3 <= 50) score += 10;
            else if (o3 <= 100) score += 5;
            else score = Math.max(0, score - 5);
        }
    } else {
        // If no air quality data, make a more balanced assumption based on location
        if (weather.sys?.country === 'GB') {
            score += 5; // UK typically has moderate air quality
        } else {
            score += 8; // Give benefit of doubt for other locations
        }
    }
    
    // Visibility impact
    const visibility = weather.visibility;
    if (visibility === 10000) {
        score += 5;
    } else {
        const visibilityScore = Math.min(15, (visibility / 10000) * 15);
        score += visibilityScore;
    }
    
    // Location-based adjustments
    if (weather.sys?.country === 'GB') {
        score = Math.max(0, score - 20);
    }
    
    return Math.max(0, Math.min(40, score));
}

function getSunPositionScore(sunPosition, date, lat, lon) {
    let score = 0;
    
    // Ideal sun angle is slightly negative (just below horizon)
    const idealAngle = -1;
    const angleDiff = Math.abs(sunPosition.altitude - idealAngle);
    score += Math.max(0, 20 - angleDiff * 10);
    
    // Calculate golden hour duration
    const times = SunCalc.getTimes(date, lat, lon);
    const goldenHourDuration = (times.sunset.getTime() - times.goldenHour.getTime()) / 1000 / 60; // in minutes
    
    // Longer golden hours are generally better
    score += Math.min(10, goldenHourDuration / 6);
    
    return Math.max(0, Math.min(30, score));
}

function calculateSunsetScore(weatherData, astronomicalData, airQuality = null, lat, lon) {
    let totalScore = 0;
    
    // Cloud composition (30% of total score)
    const cloudScore = getCloudTypeScore(weatherData.clouds);
    totalScore += cloudScore * 0.3;
    
    // Atmospheric conditions (40% of total score)
    const atmosphericScore = getAtmosphericScore(weatherData, airQuality);
    totalScore += atmosphericScore;
    
    // Sun position and timing (20% of total score)
    const sunScore = getSunPositionScore(
        astronomicalData,
        new Date(weatherData.dt * 1000),
        lat,
        lon
    );
    totalScore += sunScore * 0.667; // Scale to 20 points max
    
    // Air Quality Impact (10% of total score, separate from atmospheric)
    let airQualityScore = 0;
    if (airQuality) {
        const aqi = airQuality.aqi;
        if (aqi <= 50) airQualityScore = 10;
        else if (aqi <= 100) airQualityScore = 5;
        else if (aqi <= 150) airQualityScore = 2;
        else airQualityScore = 0;
    }
    totalScore += airQualityScore;

    // Location-based adjustments
    if (weatherData.sys?.country === 'GB') {
        totalScore *= 0.5; // 50% reduction for UK locations
    }

    // Seasonal adjustments
    const month = new Date(weatherData.dt * 1000).getMonth();
    if (month >= 2 && month <= 4 || month >= 8 && month <= 10) {
        totalScore *= 1.1;
    } else if (month >= 11 || month <= 1) {
        // Winter penalty
        totalScore *= 0.7;
    }

    // Latitude-based adjustments (higher latitudes tend to have more challenging conditions)
    const absLat = Math.abs(lat);
    if (absLat > 50) {
        totalScore *= Math.max(0.3, 1 - (absLat - 50) / 50); // Progressive reduction for higher latitudes
    }

    return {
        total: Math.min(100, totalScore),
        details: {
            cloudScore: cloudScore * 0.3,
            atmosphericScore,
            sunScore: sunScore * 0.667,
            airQualityScore
        }
    };
}

async function getWeeklyForecast(lat, lon) {
    const response = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}`
    );
    if (!response.ok) throw new Error('Failed to fetch forecast data');
    return response.json();
}

async function getAirQuality(lat, lon) {
    try {
        const response = await fetch(
            `https://api.waqi.info/feed/geo:${lat};${lon}/?token=${CONFIG.WAQI_API_KEY}`
        );
        const data = await response.json();
        
        if (data.status === 'error') {
            console.warn('Air quality API error:', data.message);
            return null;
        }
        
        if (data.status === 'ok' && data.data) {
            return {
                aqi: data.data.aqi,
                iaqi: data.data.iaqi || {},
                forecast: {
                    pm25: data.data.forecast?.daily?.pm25 || [],
                    pm10: data.data.forecast?.daily?.pm10 || [],
                    o3: data.data.forecast?.daily?.o3 || [],
                    uvi: data.data.forecast?.daily?.uvi || []
                },
                city: data.data.city,
                attribution: data.data.attributions
            };
        }
        
        return null;
    } catch (error) {
        console.warn('Air quality data unavailable:', error);
        return null;
    }
}

function getCloudDescription(clouds) {
    const coverage = clouds.all;
    const height = clouds.base || 0;
    
    let description = '';
    
    if (height > 6000) {
        description = 'High-altitude clouds ';
        if (coverage >= 30 && coverage <= 70) {
            description += '(ideal for vibrant sunsets)';
        } else if (coverage < 30) {
            description += '(slightly sparse for optimal conditions)';
        } else {
            description += '(somewhat heavy coverage)';
        }
    } else if (height > 2000) {
        description = 'Mid-level clouds ';
        if (coverage >= 20 && coverage <= 40) {
            description += '(good for sunset diffusion)';
        } else {
            description += '(may block too much light)';
        }
    } else {
        description = 'Low clouds ';
        description += '(may obstruct sunset views)';
    }
    
    return `${description}. Coverage: ${coverage}%`;
}

function getAtmosphericDescription(weather, airQuality = null) {
    const conditions = [];
    
    // Humidity analysis
    const humidity = weather.main.humidity;
    conditions.push(`Humidity: ${humidity}% (${
        humidity >= 40 && humidity <= 70 ? 'ideal' : 
        humidity < 40 ? 'too dry' : 'too humid'
    })`);
    
    // Visibility analysis
    const visibilityKm = weather.visibility / 1000;
    conditions.push(`Visibility: ${visibilityKm.toFixed(1)}km (${
        visibilityKm > 8 ? 'excellent' :
        visibilityKm > 5 ? 'good' :
        'limited'
    })`);
    
    // Air quality analysis
    if (airQuality) {
        const aqi = airQuality.aqi;
        conditions.push(`Air Quality Index: ${aqi} (${
            aqi <= 50 ? 'ideal' :
            aqi <= 100 ? 'moderate' :
            aqi <= 150 ? 'may enhance colors' :
            'poor'
        })`);
        
        // Add particle analysis if available
        if (airQuality.iaqi.pm10) {
            conditions.push(`PM10: ${airQuality.iaqi.pm10.v}μg/m³`);
        }
    }
    
    // Recent rain analysis
    if (weather.rain) {
        const recentRain = weather.rain['1h'] || weather.rain['3h'] || 0;
        if (recentRain > 0) {
            conditions.push('Recent rainfall (clean air)');
        }
    }
    
    return conditions.join('. ');
}

function getSunPositionDescription(weather, sunPosition) {
    const date = new Date(weather.dt * 1000);
    const month = date.getMonth();
    const seasonalEffect = 
        (month >= 2 && month <= 4) ? 'Spring conditions enhance sunset quality' :
        (month >= 8 && month <= 10) ? 'Fall conditions are optimal for sunsets' :
        'Normal seasonal conditions';
    
    const altitude = sunPosition.altitude * (180/Math.PI);
    const azimuth = sunPosition.azimuth * (180/Math.PI);
    
    return `Sun altitude: ${altitude.toFixed(1)}°, azimuth: ${azimuth.toFixed(1)}°. ${seasonalEffect}`;
}

function getOverallDescription(score) {
    if (score > 85) return "Exceptional sunset conditions! Perfect combination of clouds, atmosphere, and timing.";
    if (score > 75) return "Excellent conditions for a vibrant sunset.";
    if (score > 65) return "Very good conditions - expect nice colors.";
    if (score > 50) return "Good conditions, though some factors aren't optimal.";
    if (score > 35) return "Fair conditions - sunset may be visible but not spectacular.";
    return "Challenging conditions for viewing the sunset.";
}

function updateDetailedMetrics(weatherData, airQualityData, score) {
    const detailedMetrics = document.getElementById("detailed-metrics");
    
    let airQualityHtml = '';
    if (airQualityData) {
        airQualityHtml = `
            <div class="air-quality-info">
                <h4>Air Quality Details</h4>
                <table>
                    <tr>
                        <th>Metric</th>
                        <th>Value</th>
                        <th>Impact on Sunset</th>
                    </tr>
                    <tr>
                        <td>Air Quality Index</td>
                        <td>${airQualityData.aqi}</td>
                        <td>${getAQIImpact(airQualityData.aqi)}</td>
                    </tr>
                    ${airQualityData.iaqi.pm25 ? `
                    <tr>
                        <td>PM2.5</td>
                        <td>${airQualityData.iaqi.pm25.v}μg/m³</td>
                        <td>${getPM25Impact(airQualityData.iaqi.pm25.v)}</td>
                    </tr>
                    ` : ''}
                    ${airQualityData.iaqi.o3 ? `
                    <tr>
                        <td>Ozone</td>
                        <td>${airQualityData.iaqi.o3.v}ppb</td>
                        <td>${getOzoneImpact(airQualityData.iaqi.o3.v)}</td>
                    </tr>
                    ` : ''}
                </table>
                ${airQualityData.attribution ? `
                <div class="attribution">
                    Data source: ${airQualityData.attribution.map(a => a.name).join(', ')}
                </div>
                ` : ''}
            </div>
        `;
    }

    // Add the air quality HTML to the existing detailed metrics
    detailedMetrics.innerHTML += airQualityHtml;
}

// Helper functions for air quality impact descriptions
function getAQIImpact(aqi) {
    if (aqi <= 50) return "Optimal for clear, vibrant sunsets";
    if (aqi <= 100) return "Good conditions for sunset viewing";
    if (aqi <= 150) return "May create interesting color effects";
    if (aqi <= 200) return "Heavy haze may obstruct sunset";
    return "Poor visibility likely to impact sunset quality";
}

function getPM25Impact(pm25) {
    if (pm25 <= 35) return "Clean air, optimal for sunset colors";
    if (pm25 <= 75) return "Light particles may enhance color scattering";
    if (pm25 <= 115) return "Moderate haze may affect clarity";
    return "Heavy particles likely to diminish sunset quality";
}

function getOzoneImpact(o3) {
    if (o3 <= 50) return "Optimal for light scattering";
    if (o3 <= 100) return "Good conditions for color separation";
    return "May affect light transmission";
}

// Add these functions at the top of your script.js
function showSearchSection() {
    document.getElementById('search-section').classList.remove('hidden');
    document.getElementById('result').classList.add('hidden');
    document.getElementById('location').value = '';
    document.getElementById('lat').value = '';
    document.getElementById('lon').value = '';
}

function showResultSection() {
    document.getElementById('search-section').classList.add('hidden');
    document.getElementById('result').classList.remove('hidden');
}

// Update the form submission handler
document.getElementById("location-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const lat = document.getElementById("lat").value;
    const lon = document.getElementById("lon").value;
    const locationName = document.getElementById("location").value;
    const qualityEl = document.getElementById("sunset-quality");
    const scoreEl = document.getElementById("score-number");
    const locationDisplay = document.getElementById("location-display");
    const detailedMetrics = document.getElementById("detailed-metrics");

    if (!lat || !lon) {
        qualityEl.textContent = "Please select a location from the suggestions";
        return;
    }

    try {
        showResultSection();
        
        // Show loading state
        locationDisplay.textContent = locationName;
        qualityEl.textContent = "Calculating...";
        scoreEl.textContent = "...";
        detailedMetrics.innerHTML = `
            <div class="loading-message">
                Analyzing sunset conditions...
            </div>
        `;
        
        const [forecastData, airQualityData] = await Promise.all([
            getWeeklyForecast(lat, lon),
            getAirQuality(lat, lon)
        ]);

        const forecast = forecastData.list[0];
        const date = new Date(forecast.dt * 1000);
        const sunTimes = SunCalc.getTimes(date, lat, lon);
        const sunPosition = SunCalc.getPosition(sunTimes.sunset, lat, lon);
        
        const score = calculateSunsetScore(forecast, sunPosition, airQualityData, lat, lon);
        
        const quality = score.total > 85 ? "Exceptional" :
                       score.total > 75 ? "Excellent" :
                       score.total > 65 ? "Very Good" :
                       score.total > 50 ? "Good" :
                       score.total > 35 ? "Fair" : "Poor";

        // Update the display elements
        locationDisplay.textContent = locationName;
        qualityEl.textContent = quality;
        scoreEl.textContent = score.total.toFixed(1);

        detailedMetrics.innerHTML = `
            <h3>Detailed Sunset Quality Analysis</h3>
            <table>
                <tr>
                    <th>Component</th>
                    <th>Score</th>
                    <th>Details</th>
                </tr>
                <tr>
                    <td>Cloud Composition</td>
                    <td>${score.details.cloudScore.toFixed(1)}/30</td>
                    <td>${getCloudDescription(forecast.clouds)}</td>
                </tr>
                <tr>
                    <td>Atmospheric Conditions</td>
                    <td>${score.details.atmosphericScore.toFixed(1)}/40</td>
                    <td>${getAtmosphericDescription(forecast, airQualityData)}</td>
                </tr>
                <tr>
                    <td>Solar Position</td>
                    <td>${score.details.sunScore.toFixed(1)}/20</td>
                    <td>${getSunPositionDescription(forecast, sunPosition)}</td>
                </tr>
                <tr>
                    <td>Air Quality Impact</td>
                    <td>${score.details.airQualityScore.toFixed(1)}/10</td>
                    <td>${airQualityData ? getAQIImpact(airQualityData.aqi) : 'Data unavailable'}</td>
                </tr>
            </table>
        `;

        if (airQualityData) {
            updateDetailedMetrics(forecast, airQualityData, score);
        }

    } catch (error) {
        qualityEl.textContent = `Error: ${error.message}`;
        console.error('Detailed error:', error);
    }
});
