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
    response.render('pages/error.ejs', { status: 500, message: `I'm sorry, something has gone wrong.` });
    console.log(error);
}

function renderLandingPage(request, response) {
    response.render('pages/index.ejs')
}

function renderAboutPage(request, response) {
    response.render('pages/about.ejs')
}

function renderResultsPage(request, response) {
    const query = request.query.search;
    searchLocation(query, response)
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
    console.log('location = ', lat, lng);

    const aqua = await searchAquaplot(lat, lng);
    const wwo = await searchWorldWeather(lat, lng);
    const solunar = await searchSolunar(lat, lng);
    const sunset = await searchSunriseSunset(lat, lng);
    // const storm = await searchStormGlass(lat, lng); //limit 50 requests per day. Comment out unless specifially testing.
    //console.log(storm) //comment out unless specifically testing storm glass
    let data = {
        address: address,
        aqua: aqua,
        wwo: wwo,
        solunar: solunar,
        sunset: sunset
    }
    console.log(aqua, wwo, solunar, sunset);
    response.render('pages/searches/results.ejs', { data });
}

function searchAquaplot(lat, lng) {
    return new Promise(resolve => {
        const URL = `https://api.aquaplot.com/v1/validate/${lng}/${lat}`;
        superagent.get(URL).auth(process.env.AQUAPLOT_API_USERNAME, process.env.AQUAPLOT_API_KEY, { type: 'auto' }).then(result => {
            resolve(result.body.is_valid);
        });
    });
}

function searchStormGlass(lat, lng) {
    return new Promise(resolve => {
        const URL = `https://api.stormglass.io/v1/weather/point?lat=${lat}&lng=${lng}`;
        superagent.get(URL).set('Authorization', process.env.STORMGLASS_API_KEY).then(result => {
            resolve('storm glass');
            // console.log(result.body.meta.start, result.body.meta.end)
        });
    });
}

function searchWorldWeather(lat, lng) {
    return new Promise(resolve => {
        const tide = 'yes'
        const includelocation = 'yes'
        const URL = `https://api.worldweatheronline.com/premium/v1/marine.ashx?key=${process.env.WWO_API_KEY}&q=${lat},${lng}&format=json&includelocation=${includelocation}&tide=${tide}`;
        superagent.get(URL).then(result => {
            resolve('world weather');
            // console.log(result.body.data.request);
        });
    });
}

function searchSolunar(lat, lng) {
    return new Promise(resolve => {
        const date = 20180207
        const URL = `https://api.solunar.org/solunar/${lat},${lng},${date},-4`
        superagent.get(URL).then(result => {
            resolve('solunar');
            // console.log(result.body.moonPhase);
        });
    });
}

function searchSunriseSunset(lat, lng) {
    return new Promise(resolve => {
        const URL = `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}`
        superagent.get(URL).then(result => {
            resolve('sunrise sunset');
            // console.log(result.body);
        });
    });
}