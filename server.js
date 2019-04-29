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

app.put('/results', search)

app.get('/saved', renderSavedSearches)

app.listen(PORT, () => console.log(`app is running on port ${PORT}`));

//==================================
// SQL
//==================================

const SQL = {};


//==================================
// Functions
//==================================

function handleError(error, response){
  response.render('pages/error.ejs', {status: 500, message: `I'm sorry, something has gone wrong.`});
  console.log(error);
}

function renderLandingPage(request, response){
  response.render('pages/index.ejs').catch(error => handleError(error, response));
}

function renderAboutPage(request, response){
  response.render('pages/about.ejs').catch(error => handleError(error, response));
}

function renderResultsPage(request, response){
  response.render('pages/searches/results.ejs').catch(error => handleError(error, response));
}

function renderSavedSearches(request, response){
  response.render('pages/searches/saved_searches.ejs').catch(error => handleError(error, response));
}

function search(request, response){
  const query = request.body.search;
  const location = searchLocation(query)
}

function searchLocation(query){
  //query google API for location
  const URL = //google geocode goes here
  superagent.get(URL).then(result => {

  })
}
