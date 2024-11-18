import React, { useState } from 'react';
import './LocationSearch.css';

export function LocationSearch({ onLocationSelect }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  const searchLocation = async (query) => {
    if (query.length < 3) return;
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      setSuggestions(data);
    } catch (error) {
      console.error('Error searching locations:', error);
    }
  };

  const handleSelect = (location) => {
    onLocationSelect({
      lat: parseFloat(location.lat),
      lon: parseFloat(location.lon),
      name: location.display_name
    });
    setSuggestions([]);
    setSearchTerm(location.display_name);
  };

  return (
    <div className="location-search">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          searchLocation(e.target.value);
        }}
        placeholder="Enter location..."
        className="location-input"
      />
      {suggestions.length > 0 && (
        <ul className="suggestions-list">
          {suggestions.map((location) => (
            <li
              key={location.place_id}
              onClick={() => handleSelect(location)}
            >
              {location.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 