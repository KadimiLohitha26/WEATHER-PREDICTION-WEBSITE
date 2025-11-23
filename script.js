const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const locationBtn = document.getElementById('location-btn');
const weatherContent = document.getElementById('weather-content');

const API_KEY = '1e63c99032e9ce7d84a3ec59ee66b27c';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

let currentUnit = 'metric';
let currentWeatherData = null;

function updateCopyrightYear() {
    const currentYear = new Date().getFullYear();
    document.getElementById('current-year').textContent = currentYear;
}

document.addEventListener('DOMContentLoaded', () => {
    updateCopyrightYear();
    getWeatherByCity('London');
});

searchBtn.addEventListener('click', handleSearch);
locationBtn.addEventListener('click', getCurrentLocationWeather);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleSearch();
    }
});

function handleSearch() {
    const city = searchInput.value.trim();
    if (city) {
        getWeatherByCity(city);
    }
}

function getCurrentLocationWeather() {
    if (!navigator.geolocation) {
        showError('Geolocation is not supported by your browser');
        return;
    }

    showLoading();
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            try {
                const weatherData = await fetchWeatherDataByCoords(latitude, longitude);
                displayWeatherData(weatherData);
            } catch (error) {
                showError('Failed to fetch weather data for your location');
                console.error('Error:', error);
            }
        },
        (error) => {
            showError('Unable to retrieve your location. Please enable location services.');
            console.error('Geolocation error:', error);
        }
    );
}

async function getWeatherByCity(city) {
    showLoading();
    
    try {
        const weatherData = await fetchWeatherDataByCity(city);
        displayWeatherData(weatherData);
        searchInput.value = ''; 
    } catch (error) {
        showError('Failed to fetch weather data. Please check the city name and try again.');
        console.error('Error fetching weather data:', error);
    }
}

async function fetchWeatherDataByCity(city) {
    const currentResponse = await fetch(
        `${BASE_URL}/weather?q=${city}&appid=${API_KEY}&units=${currentUnit}`
    );
    
    if (!currentResponse.ok) {
        throw new Error('City not found');
    }
    
    const currentData = await currentResponse.json();
    
    const forecastResponse = await fetch(
        `${BASE_URL}/forecast?q=${city}&appid=${API_KEY}&units=${currentUnit}`
    );
    
    if (!forecastResponse.ok) {
        throw new Error('Forecast data not available');
    }
    
    const forecastData = await forecastResponse.json();
    
    return {
        location: {
            name: currentData.name,
            country: currentData.sys.country,
            lat: currentData.coord.lat,
            lon: currentData.coord.lon
        },
        current: processCurrentWeather(currentData),
        forecast: processForecastData(forecastData)
    };
}

async function fetchWeatherDataByCoords(lat, lon) {
    const currentResponse = await fetch(
        `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${currentUnit}`
    );
    
    if (!currentResponse.ok) {
        throw new Error('Weather data not available');
    }
    
    const currentData = await currentResponse.json();
    
    const forecastResponse = await fetch(
        `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${currentUnit}`
    );
    
    if (!forecastResponse.ok) {
        throw new Error('Forecast data not available');
    }
    
    const forecastData = await forecastResponse.json();
    
    return {
        location: {
            name: currentData.name,
            country: currentData.sys.country,
            lat: currentData.coord.lat,
            lon: currentData.coord.lon
        },
        current: processCurrentWeather(currentData),
        forecast: processForecastData(forecastData)
    };
}

function processCurrentWeather(data) {
    return {
        temp: data.main.temp,
        feels_like: data.main.feels_like,
        humidity: data.main.humidity,
        pressure: data.main.pressure,
        wind_speed: data.wind.speed,
        wind_deg: data.wind.deg,
        visibility: data.visibility / 1000,
        condition: data.weather[0].main.toLowerCase(),
        description: data.weather[0].description,
        icon: data.weather[0].icon,
        sunrise: new Date(data.sys.sunrise * 1000),
        sunset: new Date(data.sys.sunset * 1000)
    };
}

function processForecastData(data) {
    const hourly = [];
    const daily = [];
    
    const dailyForecasts = {};
    
    data.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dayKey = date.toDateString();
        
        if (!dailyForecasts[dayKey]) {
            dailyForecasts[dayKey] = {
                date: date,
                temps: [],
                conditions: [],
                icons: []
            };
        }
        
        dailyForecasts[dayKey].temps.push(item.main.temp);
        dailyForecasts[dayKey].conditions.push(item.weather[0].main);
        dailyForecasts[dayKey].icons.push(item.weather[0].icon);
        
        if (hourly.length < 8) {
            hourly.push({
                time: date.getHours() + ':00',
                temp: item.main.temp,
                condition: item.weather[0].main.toLowerCase(),
                icon: item.weather[0].icon
            });
        }
    });
    
    Object.keys(dailyForecasts).slice(0, 5).forEach(dayKey => {
        const dayData = dailyForecasts[dayKey];
        const maxTemp = Math.max(...dayData.temps);
        const minTemp = Math.min(...dayData.temps);
        
        const conditionCounts = {};
        dayData.conditions.forEach(condition => {
            conditionCounts[condition] = (conditionCounts[condition] || 0) + 1;
        });
        
        const mostFrequentCondition = Object.keys(conditionCounts).reduce((a, b) => 
            conditionCounts[a] > conditionCounts[b] ? a : b
        );
        
        daily.push({
            name: dayData.date.toLocaleDateString('en-US', { weekday: 'short' }),
            fullDate: dayData.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            max_temp: maxTemp,
            min_temp: minTemp,
            condition: mostFrequentCondition.toLowerCase(),
            icon: dayData.icons[0] // Use first icon as representative
        });
    });
    
    return { hourly, daily };
}

function displayWeatherData(data) {
    currentWeatherData = data;
    const { location, current, forecast } = data;
    
    weatherContent.innerHTML = `
        <div class="unit-toggle">
            <button class="unit-btn ${currentUnit === 'metric' ? 'active' : ''}" onclick="changeUnit('metric')">°C</button>
            <button class="unit-btn ${currentUnit === 'imperial' ? 'active' : ''}" onclick="changeUnit('imperial')">°F</button>
        </div>

        <div class="main-content">
            <div class="current-weather">
                <div class="location">
                    <i class="fas fa-map-marker-alt"></i>
                    <h2>${location.name}, ${location.country}</h2>
                </div>
                <div class="weather-icon">
                    <img src="https://openweathermap.org/img/wn/${current.icon}@4x.png" alt="${current.description}">
                </div>
                <div class="temperature">${Math.round(current.temp)}°${currentUnit === 'metric' ? 'C' : 'F'}</div>
                <div class="weather-description">${current.description}</div>
                <div class="weather-details">
                    <div class="detail-item">
                        <i class="fas fa-wind"></i>
                        <div>
                            <div class="detail-value">${current.wind_speed} ${currentUnit === 'metric' ? 'm/s' : 'mph'}</div>
                            <div class="detail-label">Wind Speed</div>
                        </div>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-tint"></i>
                        <div>
                            <div class="detail-value">${current.humidity}%</div>
                            <div class="detail-label">Humidity</div>
                        </div>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-temperature-low"></i>
                        <div>
                            <div class="detail-value">${Math.round(current.feels_like)}°${currentUnit === 'metric' ? 'C' : 'F'}</div>
                            <div class="detail-label">Feels Like</div>
                        </div>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-eye"></i>
                        <div>
                            <div class="detail-value">${current.visibility} km</div>
                            <div class="detail-label">Visibility</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="forecast">
                <h3 class="section-title"><i class="fas fa-clock"></i> 24-Hour Forecast</h3>
                <div class="hourly-forecast">
                    ${forecast.hourly.map(hour => `
                        <div class="hour-item">
                            <div class="hour-time">${hour.time}</div>
                            <div class="hour-icon">
                                <img src="https://openweathermap.org/img/wn/${hour.icon}.png" alt="${hour.condition}">
                            </div>
                            <div class="hour-temp">${Math.round(hour.temp)}°</div>
                        </div>
                    `).join('')}
                </div>

                <h3 class="section-title"><i class="fas fa-calendar-alt"></i> 5-Day Forecast</h3>
                <div class="daily-forecast">
                    ${forecast.daily.map(day => `
                        <div class="day-item">
                            <div class="day-name">${day.name}</div>
                            <div class="day-date">${day.fullDate}</div>
                            <div class="day-icon">
                                <img src="https://openweathermap.org/img/wn/${day.icon}.png" alt="${day.condition}">
                            </div>
                            <div class="day-temp">${Math.round(day.max_temp)}°</div>
                            <div class="day-min-temp">${Math.round(day.min_temp)}°</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>

        <div class="additional-info">
            <div class="info-card">
                <h3><i class="fas fa-compress-arrows-alt"></i> Pressure</h3>
                <div class="info-value">${current.pressure} hPa</div>
                <div class="info-label">Atmospheric pressure</div>
            </div>
            <div class="info-card">
                <h3><i class="fas fa-sun"></i> Sunrise & Sunset</h3>
                <div class="sun-times">
                    <div class="sun-time">
                        <div class="info-value">${current.sunrise.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                        <div class="info-label">Sunrise</div>
                    </div>
                    <div class="sun-time">
                        <div class="info-value">${current.sunset.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                        <div class="info-label">Sunset</div>
                    </div>
                </div>
            </div>
            <div class="info-card">
                <h3><i class="fas fa-wind"></i> Wind Direction</h3>
                <div class="info-value">${getWindDirection(current.wind_deg)}</div>
                <div class="info-label">${current.wind_deg}°</div>
            </div>
        </div>

        <div class="last-updated">
            Last updated: ${new Date().toLocaleTimeString()}
        </div>
    `;
}

function changeUnit(unit) {
    if (currentUnit !== unit) {
        currentUnit = unit;
        if (currentWeatherData) {
            getWeatherByCity(currentWeatherData.location.name);
        }
    }
}

function getWindDirection(degrees) {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
}

function showLoading() {
    weatherContent.innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading weather data...</p>
        </div>
    `;
}

function showError(message) {
    weatherContent.innerHTML = `
        <div class="error-message">
            <p><i class="fas fa-exclamation-triangle"></i> ${message}</p>
        </div>
    `;
}