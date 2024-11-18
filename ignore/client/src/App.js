import React, { useState, useEffect } from 'react';
import { LocationSearch } from './components/LocationSearch';
import { SunsetDashboard } from './components/SunsetDashboard';
import './App.css';

function App() {
  const [location, setLocation] = useState(null);
  const [predictions, setPredictions] = useState([]);

  useEffect(() => {
    if (location) {
      fetchPredictions();
    }
  }, [location]);

  const fetchPredictions = async () => {
    try {
      const response = await fetch(`/api/predictions?lat=${location.lat}&lon=${location.lon}`);
      const data = await response.json();
      setPredictions(data);
    } catch (error) {
      console.error('Error fetching predictions:', error);
    }
  };

  return (
    <div className="app">
      <header>
        <h1>Sunset Quality Predictor</h1>
      </header>
      <main>
        <LocationSearch onLocationSelect={setLocation} />
        {location && <SunsetDashboard predictions={predictions} location={location} />}
      </main>
    </div>
  );
}

export default App; 