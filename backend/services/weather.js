import fetch from "node-fetch";

export async function getWeather(city) {
  const apiKey = process.env.OPENWEATHER_KEY;
  
  if (!apiKey) {
    return "Weather API key not configured. Please set OPENWEATHER_KEY environment variable.";
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
    
    const res = await fetch(url);
    const data = await res.json();

    if (data.cod !== 200) {
      return `Weather data not available for ${city}. Error: ${data.message || 'Unknown error'}`;
    }

    const weather = data.weather[0];
    const main = data.main;
    const wind = data.wind;
    const humidity = data.main.humidity;

    return `Current weather in ${city}: ${weather.description}, ${main.temp}°C (feels like ${main.feels_like}°C), humidity ${humidity}%, wind speed ${wind.speed} m/s`;
  } catch (error) {
    console.error("Weather API error:", error);
    return `Unable to fetch weather data for ${city}. Please try again later.`;
  }
}
