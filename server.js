'use strict';

//==================================
// Server Configuration
//==================================

require('dotenv').config();

const PORT = process.env.PORT || 3000;

const express = require('express');
const pg = require('pg');
const superagent = require('superagent');
const methodOverride = require('method-override');

const app = express();

const client = new pg.Client(process.env.DATABASE_URL);
client.on('error', error => console.error(error));
client.connect();

app.use(express.static('./public'));
app.use(express.urlencoded({ extended: true }));

app.set('view-engine', 'ejs');


app.use(methodOverride((request, response) => {
    if (request.body && typeof request.body === 'object' && '_method' in request.body) {
        let method = request.body._method;
        delete request.body._method;
        return method;
    }
}))

//==================================
// Routes
//==================================

app.get('/', renderLandingPage);

app.get('/about', renderAboutPage);

app.get('/results', renderResultsPage);

// app.post('/results', search)

app.get('/saved', renderSavedSearches);

app.post('/saved', searchUsernameData);

app.listen(PORT, () => console.log(`app is running on port ${PORT}`));

//==================================
// SQL
//==================================

const SQL = {};
SQL.getUsername = 'SELECT * FROM users WHERE user_name=$1';
SQL.saveUsername = 'INSERT INTO users (user_name) VALUES ($1)';
SQL.saveData = 'INSERT INTO saved_searches (location, lat, lng, person) VALUES ($1, $2, $3, $4)';
SQL.getData = 'SELECT * FROM saved_searches WHERE person=$1'

//==================================
// Constructors
//==================================

function Location(data) {
    this.address = data.formatted_address
    this.lat = data.geometry.location.lat
    this.lng = data.geometry.location.lng
}

function WorldWeather(data) {
    //`<img src="${icon}">`
    this.date = data.date;
    this.maxTemp = data.maxtempF;
    this.minTemp = data.mintempF;
    this.hourly = data.hourly.map(hour => new Hour(hour));
    this.hourlyTides = data.hourly.map(hour => new HourlyTide(hour));
    this.tides = data.tides[0].tide_data;
}

//create hour ojects to pull out the data we want
function Hour(hourlyData) {
    this.Time = hourlyData.time;
    this.Temp = hourlyData.tempF + '°';
    this.Precip = hourlyData.precipMM;
    this.Visibility = hourlyData.visibility;
    this.Feels_Like = hourlyData.FeelsLikeF + '°';
}

function HourlyTide(hourlyData) {
    this.Time = hourlyData.time;
    this.Swell_Height = hourlyData.swellHeight_m + 'm';
    this.Swell_Direction = hourlyData.swellDir16Point;
    this.Wind_Speed = hourlyData.windspeedMiles + 'mph';
    this.Wind_Direction = hourlyData.winddir16Point;
    this.Water_Temp = hourlyData.waterTemp_F + '°';
}

function Solunar(data) {
    this.moonPhase = data.moonPhase
    this.moonIllumination = data.moonIllumination;
}

function SunriseSunset(data) {
    this.sunrise = data.sunrise;
    this.sunset = data.sunset;
    this.solarNoon = data.solar_noon;
    this.nauticalTwillightAM = data.nautical_twilight_begin;
    this.nauticalTwillightPM = data.nautical_twilight_end;
}

function StormGlass(data) {
    this.hour = data.time.slice(11, 13);
}

//==================================
// Functions
//==================================

function handleError(error, response) {
    console.log('from handle error');
    console.log(error);
    response.render('pages/error.ejs', { status: 500, message: error });
}

function renderLandingPage(request, response) {
    response.render('pages/index.ejs')
}

function renderAboutPage(request, response) {
    response.render('pages/about.ejs')
}

function renderResultsPage(request, response) {
    //search is coming from the search box on the index page.
    const query = request.query.search;
    searchLocation(query, response).catch(error => handleError(error, response))
}

function renderSavedSearches(request, response) {
    response.render('pages/searches/saved_searches.ejs')
}

// Add logic for if it is a landlocked city
async function searchLocation(query, response) {
    // query google API for location
    const URL = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${process.env.GEOCODE_API_KEY}`;
    const result = await superagent.get(URL).catch(error => console.log(error));
    const location = new Location(result.body.results[0]);
    const map = `<img id="map" src="https://maps.googleapis.com/maps/api/staticmap?center=${location.lat}%2c%20${location.lng}&zoom=13&size=600x300&maptype=roadmap
    &key=${process.env.GEOCODE_API_KEY}">`;

    const aqua = await searchAquaplot(location.lat, location.lng).catch(error => console.log(error));
    const wwo = await searchWorldWeather(location.lat, location.lng).catch(error => console.log(error));
    const solunar = await searchSolunar(location.lat, location.lng).catch(error => console.log(error));
    const sunset = await searchSunriseSunset(location.lat, location.lng).catch(error => console.log(error));
    // const storm = await searchStormGlass(location.lat, location.lng).catch(error => console.log(error)); //limit 50 requests per day. Comment out unless specifially testing.
    let data = {
        location: location,
        aqua: aqua,
        wwo: wwo,
        solunar: solunar,
        sunset: sunset,
        map: map,
        // storm: storm
    }
    console.log(solunar, sunset);
    response.render('pages/searches/results.ejs', { data });
}

function searchAquaplot(lat, lng) {
    //returning a promise allows us to use the await
    return new Promise(resolve => {
        const URL = `https://api.aquaplot.com/v1/validate/${lng}/${lat}`;
        superagent.get(URL).auth(process.env.AQUAPLOT_API_USERNAME, process.env.AQUAPLOT_API_KEY, { type: 'auto' }).then(result => {
            resolve(result.body.is_valid);
        }).catch(error => console.log(error));
    });
}

function searchStormGlass(lat, lng) {
    return new Promise(resolve => {
        const URL = `https://api.stormglass.io/v1/weather/point?lat=${lat}&lng=${lng}`;
        superagent.get(URL).set('Authorization', process.env.STORMGLASS_API_KEY).then(result => {
            const hourlyWeatherData = result.body.hours;
            const week = [];
            let index = 0;
            for (let i = 0; i < 7; i++) {
                const day = [];
                for (let j = 0; j < 24; j++) {
                    day.push(new StormGlass(hourlyWeatherData[index]));
                    index++;
                }
                week.push(day);
            }
            resolve(week);
        });
    });
}

function searchWorldWeather(lat, lng) {
    return new Promise(resolve => {
        const tide = 'yes'
        const includelocation = 'yes'
        const URL = `https://api.worldweatheronline.com/premium/v1/marine.ashx?key=${process.env.WWO_API_KEY}&q=${lat},${lng}&format=json&includelocation=${includelocation}&tide=${tide}&tp=1`;
        superagent.get(URL).then(result => {
            const week = result.body.data.weather.map(day => new WorldWeather(day));
            resolve(week);
        });
    });
}

function searchSolunar(lat, lng) {
    //need to change this to get info for each day in the week
    return new Promise(resolve => {
        const date = Date.now();
        const URL = `https://api.solunar.org/solunar/${lat},${lng},${date},-4`
        superagent.get(URL).then(result => {
            resolve(new Solunar(result.body.moonPhase));
        });
    });
}

function searchSunriseSunset(lat, lng) {
    //need to change this so that we get info for each day in the week
    return new Promise(resolve => {
        const URL = `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}`
        superagent.get(URL).then(result => {
            resolve(new SunriseSunset(result.body.results));
        });
    });
}

function searchUsernameData(request, response) {
    const { enterUsername, location, lat, lng } = request.body;
    console.log(request.body.enterUsername, 'enterUsername')
    client.query(SQL.getUsername, [enterUsername]).then(result => {
        console.log('Username Search', result.rows);
        if (result.rows.length) {
            //user ID corresponds to person in schema.sql 
            let userId = result.rows[0].id;
            console.log('Store name and data', userId);
            client.query(SQL.saveData, [location, lat, lng, userId]).then(result => {
                console.log('storing data', userId);
                renderUserSearches(userId, response);
            })
        } else {
            console.log('Username does not exist');
            storeUsernameAndData(request, response);
        }
    });
}

function storeUsernameAndData(request, response) {
    const { enterUsername, location, lat, lng } = request.body;
    client.query(SQL.saveUsername, [enterUsername]).then(result => {
        client.query(SQL.getUsername, [enterUsername]).then(result => {
            let userId = result.rows[0].id;
            console.log('Store name and data', userId);
            client.query(SQL.saveData, [location, lat, lng, userId]).then(result => {
                console.log('storing data');
                renderUserSearches(userId, response);
            })
        })
    });
}

function renderUserSearches(id, response) {
    client.query(SQL.getData, [id]).then(result => {
        console.log('From render searches', result.rows)
        response.redirect('/saved');
    })
}