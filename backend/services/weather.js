import fetch from "node-fetch";

export async function getWeather(city) {
  const apiKey = process.env.OPENWEATHER_KEY;
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.cod !== 200) return "Weather data not available";
  return `${data.weather[0].description}, ${data.main.temp}°C`;
}
