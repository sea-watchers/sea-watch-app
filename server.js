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

app.get('/results', renderResultsPage)

// app.post('/results', search)

app.get('/saved', renderSavedSearches)

app.listen(PORT, () => console.log(`app is running on port ${PORT}`));

//==================================
// SQL
//==================================

const SQL = {};


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

async function searchLocation(query, response) {
    // query google API for location
    const URL = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${process.env.GEOCODE_API_KEY}`;
    const result = await superagent.get(URL);
    const address = result.body.results[0].formatted_address
    const lat = result.body.results[0].geometry.location.lat;
    const lng = result.body.results[0].geometry.location.lng;
    const map = `<img src="https://maps.googleapis.com/maps/api/staticmap?center=${lat}%2c%20${lng}&zoom=13&size=600x300&maptype=roadmap
    &key=${process.env.GEOCODE_API_KEY}">`;
    console.log('location = ', lat, lng);

    const aqua = await searchAquaplot(lat, lng).catch(error => console.log(error));
    const wwo = await searchWorldWeather(lat, lng).catch(error => console.log(error));
    const solunar = await searchSolunar(lat, lng).catch(error => console.log(error));
    const sunset = await searchSunriseSunset(lat, lng).catch(error => console.log(error));
    const storm = await searchStormGlass(lat, lng).catch(error => console.log(error)); //limit 50 requests per day. Comment out unless specifially testing.
    //console.log(storm) //comment out unless specifically testing storm glass
    let data = {
        address: address,
        aqua: aqua,
        wwo: wwo,
        solunar: solunar,
        sunset: sunset,
        map: map
    }
    console.log(aqua, solunar, sunset, storm);
    response.render('pages/searches/results.ejs', { data });
}

function searchAquaplot(lat, lng) {
    //returning a promise allows us to use the await
    return new Promise(resolve => {
        const URL = `https://api.aquaplot.com/v1/validate/${lng}/${lat}`;
        superagent.get(URL).auth(process.env.AQUAPLOT_API_USERNAME, process.env.AQUAPLOT_API_KEY, { type: 'auto' }).then(result => {
            // console.log(result.body.is_valid);
            resolve(result.body.is_valid);
        }).catch(error => console.log(error));
    });
}

function searchStormGlass(lat, lng) {
    return new Promise(resolve => {
        // const URL = `https://api.stormglass.io/v1/weather/point?lat=${lat}&lng=${lng}`;
        superagent.get(url).set('Authorization', process.env.STORMGLASS_API_KEY).then(result => {
            console.log(result.body.meta.start, result.body.meta.end)
            resolve(result.body.meta.start);
        });
    });
}

function searchWorldWeather(lat, lng) {
    return new Promise(resolve => {
        const tide = 'yes'
        const includelocation = 'yes'
        const URL = `https://api.worldweatheronline.com/premium/v1/marine.ashx?key=${process.env.WWO_API_KEY}&q=${lat},${lng}&format=json&includelocation=${includelocation}&tide=${tide}`;
        superagent.get(URL).then(result => {
            const icon = result.body.data.weather;
            const html = `<img src="${icon}">`;
            resolve(icon);
        });
    });
}

function searchSolunar(lat, lng) {
    return new Promise(resolve => {
        const date = 20180207
        const URL = `https://api.solunar.org/solunar/${lat},${lng},${date},-4`
        superagent.get(URL).then(result => {
            console.log(result.body.moonPhase);
            resolve(result.body.moonPhase);
        });
    });
}

function searchSunriseSunset(lat, lng) {
    return new Promise(resolve => {
        const URL = `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}`
        superagent.get(URL).then(result => {
            console.log(result.body);
            resolve(result.body);
        });
    });
}