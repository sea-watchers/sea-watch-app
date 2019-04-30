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
  response.render('pages/searches/results.ejs')
}

function renderSavedSearches(request, response) {
  response.render('pages/searches/saved_searches.ejs')
}

function searchLocation(query, response) {
  // query google API for location
  const URL = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${process.env.GEOCODE_API_KEY}`
  superagent.get(URL).then(result => {
    const lat = result.body.results[0].geometry.location.lat;
    const lng = result.body.results[0].geometry.location.lng;
    console.log('location = ', lat, lng);

    searchAquaplot(lat, lng);
    searchStormGlass(lat, lng);
    searchWorldWeather(lat, lng);
    searchSolunar(lat, lng);
    searchSunriseSunset(lat, lng);
  }).catch(error => handleError(error, response));
}

function searchAquaplot(lat, lng) {
  const URL = `https://api.aquaplot.com/v1/validate/${lng}/${lat}`;
  superagent.get(URL).auth(process.env.AQUAPLOT_API_USERNAME, process.env.AQUAPLOT_API_KEY, { type: 'auto' }).then(result => {
    console.log('aquaplot');
    console.log(result.body);
  });
}

function searchStormGlass(lat, lng) {
  const URL = `https://api.stormglass.io/v1/weather/point?lat=${lat}&lng=${lng}`;
  superagent.get(URL).set('Authorization', process.env.STORMGLASS_API_KEY).then(result => {
    console.log('storm glass');
    console.log(result.body.meta.start, result.body.meta.end)
  })
}

function searchWorldWeather(lat, lng) {
  const tide = 'yes'
  const includelocation = 'yes'
  const URL = `https://api.worldweatheronline.com/premium/v1/marine.ashx?key=${process.env.WWO_API_KEY}&q=${lat},${lng}&format=json&includelocation=${includelocation}&tide=${tide}`;
  superagent.get(URL).then(result => {
    console.log('world weather');
    console.log(result.body.data.request);
  });
}

function searchSolunar(lat, lng) {
  const date = 20180207
  const URL = `https://api.solunar.org/solunar/${lat},${lng},${date},-4`
  superagent.get(URL).then(result => {
    console.log('solunar');
    console.log(result.body.moonPhase);
  })
}

function searchSunriseSunset(lat, lng) {
  const URL = `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}`
  superagent.get(URL).then(result => {
    console.log('sunrise sunset');
    console.log(result.body);
  })
}
