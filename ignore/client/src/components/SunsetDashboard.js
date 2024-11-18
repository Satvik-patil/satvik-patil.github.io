import React from 'react';
import './SunsetDashboard.css';

export function SunsetDashboard({ predictions, location }) {
  return (
    <div className="sunset-dashboard">
      <h2>Sunset Predictions for {location.name}</h2>
      <div className="predictions-grid">
        {predictions.map((prediction) => (
          <div key={prediction.date} className="prediction-card">
            <div className="date">{new Date(prediction.date).toLocaleDateString()}</div>
            <div className="score-container">
              <div 
                className="score" 
                style={{
                  background: `conic-gradient(from 0deg, #ff6b6b ${prediction.score}%, #f8f9fa ${prediction.score}%)`
                }}
              >
                {prediction.score}
              </div>
            </div>
            <div className="details">
              <p>Cloud Cover: {prediction.cloudCover}%</p>
              <p>Humidity: {prediction.humidity}%</p>
              <p>Air Quality: {prediction.airQuality}</p>
              <p>Sunset Time: {prediction.sunsetTime}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 