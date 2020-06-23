/**
* Musterlösung zu Aufgabe 4, Geosoft 1, SoSe 2020
* @author {Name der studierenden Person}   matr.Nr.: {Matrikelnummer}
*/

//****various jshint configs****
// jshint esversion: 8
// jshint browser: true
// jshint node: true
// jshint -W117
// jshint -W083
"use strict";

//declaration of global variables
var pointcloud;
var point;
var departureList;


/**
* @function onLoad function that is executed when the page is loaded
*/
async function onLoad() {
  pointcloud = geoJSON.arrayToGeoJSON(pointcloud);
  calculateResults(point, pointcloud);
  busAPI.haltestellen();
}



//##############################################################################
//## FUNCTIONS
//##############################################################################

/**
* @function calculateResults the function that calculates all results
*/
function calculateResults(point, pointcloud) {
  let results = sortByDistance(point, pointcloud);

  //get the departures of the nearest stop for the next 30 minutes.
  busAPI.departures(
    results[0].id, 1800
  );
  DocumentInterface.updateDepartureHeader(results[0].name);

  for (let i = 0; i < results.length; i++) {
    let bearing = GeoCalculator.computeBearing(point, results[i].coordinates);
    let cardinalDirection = GeoCalculator.bearingToCardinalDirection(bearing);
    results[i].direction = cardinalDirection;
  }

  DocumentInterface.clearTable('resultTable');
  DocumentInterface.drawBusStopTable(results);
}

/**
* @function refresh
* @desc called when refresh button presssd are inserted. refreshes the page data.
*/
function refresh() {
  let positionGeoJSON = document.getElementById("userPosition").value;

  try {
    positionGeoJSON = JSON.parse(positionGeoJSON);
    //check validity of the geoJSON. it can only be a point
    if (geoJSON.isValidGeoJSONPoint(positionGeoJSON)) {
      //show the coordinates on the map
      mainMapInterface.updateUserLocation(positionGeoJSON);

      point = positionGeoJSON.features[0].geometry.coordinates;
      calculateResults(point, pointcloud);
    } else {
      alert("invalid input.please input a single valid point in a feature collection");
    }
  }
  catch (error) {
    console.log("invalid input. see console for more info.");
    console.log(error);
    alert("invalid input. see console for more info.");
  }
}

/**
* @function sortByDistance
* @desc takes a point and an array of points and sorts them by distance ascending
* @param point array of [lon, lat] coordinates
* @param pointArray array of points to compare to
* @returns Array with JSON Objects, which contain coordinate and distance
*/
function sortByDistance(point, pointArray) {
  let output = [];

  for (let i = 0; i < pointArray.features.length; i++) {
    let distance = GeoCalculator.twoPointDistance(point, pointArray.features[i].geometry.coordinates);
    let j = 0;
    //Searches for the Place
    while (j < output.length && distance > output[j].distance) {
      j++;
    }
    let newPoint = {
      index : i,
      coordinates: pointArray.features[i].geometry.coordinates,
      distance: Math.round(distance*100)/100,

      name : pointArray.features[i].properties.lbez,
      id: pointArray.features[i].properties.nr,

    };
    output.splice(j, 0, newPoint);
  }

  return output;
}

/**
* @desc is called when a the user presses the seach-address button.
* makes a call to the here-api using geocoder.geocode(), and inserts the first
* result into the user-position input field.
*/
function searchAddress(){
  let userInput = $("#addressSearch").val() + ", Münster";
  let position = geocoder.geocode(userInput);

  //insert the new value into the userPosition textarea, using jquery instead of
  // document.getElementById
  $("#userPosition").val(position);
}

/**
* The following class declarations exist so functions can be grouped into them;
* that way the code doesn't get too cluttered. The page may just as well be
* scripted purely functional with minimal changes.
*/

/** Class for communicating with the BusAPI
* for a more functional approach of xhr, see: https://github.com/streuselcake/jslab/blob/master/client/01-html-js-css/xhr/mensa/mensa.js
*/
class BusAPI{
  constructor(){
    this.x = new XMLHttpRequest();
    this.x.onerror = this.errorcallback;
    this.API_URL = "https://rest.busradar.conterra.de/prod";
  }

  /**
   * errorcallback
   * @desc load-callback method for this object's XHR-object
   */
  errorcallback(e){
    console.dir(e);
    alert("error. check web console.");
  }


  /**
   * haltestellen
   * @public
   * @desc method to retrieve bus-stop data from busAPI.
   * due to the nature of the class definition it will result in callback
   * functions being called as soon as a respnse from the resource server hits.
   * @see loadcallback
   * @see statechangecallback
   */
  haltestellen(callbackFunction){
    callbackFunction = callbackFunction || this.busStopListCallback;

    $.ajax({
      url: this.API_URL+`/haltestellen`,
      dataType: "json",

      success : callbackFunction,
      error: this.errorcallback
    });
  }

  /**
   * departures
   * @public
   * @desc method to retrieve upcoming departues from a given bus stop.
   * functions simlar to haltestellen. is called once nearest bus stop is known.
   * callback functions will do further work.
   * @param busStopNr the number of the bus stop as returned by the api.
   * @param time seconds from now during which departures are to be shown. defaults to 1800
   * @see haltestellen
   * @see statechangecallback
   */
  departures(busStopNr, time){
    this.x.onload = this.departureLoadcallback;
    this.x.onreadystatechange = this.departureStatechangecallback;

    let resource = this.API_URL+`/haltestellen/${busStopNr}/abfahrten?sekunden=`;
    resource += time || 1800;

    this.x.open("GET", resource, true);
    this.x.send();

    DocumentInterface.clearTable("nextDeparturesTable");

    return(true);
  }

  /**
   * routes
   * @public
   * @desc method to retrieve geometry of certain busses.
   * @param {String} fahrtNr id-number of the bus that is being fetched
   * @param {function} callbackFunction function that is to be called when loading is completed
   */
  routes(fahrtNr, callbackFunction){
    callbackFunction = callbackFunction || this.routesCallback;
    $.ajax({
      url: this.API_URL+`/fahrten/${fahrtNr}`,
      dataType: "json",

      success : callbackFunction,
      error: this.errorcallback
    });
  }

  /**
   * busStopListcallback
   * @desc is called when the stop list is successfully loaded from the bus api.
   * in this case it tells the page to re-calculate the distances with the new
   * bus stop data. The page then proceeds to update the table.
   * more info on https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequestEventTarget/onload
   * @see busStopListStatechangecallback
   */
  busStopListCallback(response){
    pointcloud = response;
    calculateResults(point, pointcloud);
    mainMapInterface.addBusStops(pointcloud);
  }

  /**
   * departureLoadcallback
   * @desc is called when the departure data is successfully loaded from the bus api.
   * @see departureStatechangecallback
   */
  departureLoadcallback(){
    console.log(this.status);
    if(this.status == "200" && this.readyState == 4){
      DocumentInterface.drawDepartureTable(departureList);
    }
  }

  /**
   * busStopListstatechangecallback
   * @desc method that is called when state of XHR-object changes.
   * This one saves the data of the bus departure list to a global variable.
   * @see departureLoadcallback
   */
  departureStatechangecallback(){
    if (this.status == "200" && this.readyState == 4){
      departureList = JSON.parse(this.responseText);
    }
  }

  routesCallback(response){
    mainMapInterface.addRoute(response);
  }

}

/** Class for communicating with the here-geocoding-API
* uses JQuery-ajax to better handle jsonp
*/
class HereAPI {
  constructor(){
    this.API_URL = "https://geocode.search.hereapi.com/v1/geocode";
    this.APP_ID = HERE_APP_ID;
    this.API_KEY = HERE_API_KEY;

  }

  /**
   * geocode
   * @public
   * @desc method to allow calls to the here-geocoding api.
   * This method uses JQuery ajax in order to make a jsonp request to circumvent
   * the lack of an "acces-control-allow-origin:*" header in the response of the
   * here-API.
   */
  geocode(query){
    $.ajax({
      url: this.API_URL,
      dataType: "jsonp",

      data :{
        q: query,
        apiKey: HERE_API_KEY
      },

      success : this.geocodeCallback
    });
  }

  /**
   * geocodeCallback
   * @public
   * @desc this method is called when the geocoding request is done.
   * It determines what is to be done with the data.
   */
   geocodeCallback(response){
    let coords = [[response.items[0].position.lng, response.items[0].position.lat]];
    coords = geoJSON.arrayToGeoJSON(coords);
    coords = JSON.stringify(coords);
    $("#userPosition").val(coords);
  }
}

/** Class containing all methods for handling the map display on page */
class MapInterface{
  constructor(params){
    //initialise the map view from the given coordinates
    if( params.mapid === undefined ||
        params.baseMap === undefined ||
        params.baseMap.tileLayer === undefined
    ){
      console.log("couldn't initialise map-interface. invalid parameters");
      return false;
    }

    let mapid = params.mapid;
    let view = params.view || [0,0];
    let zoom = params.zoom || 6;
    let baseMap = params.baseMap;

    this.map = L.map(mapid).setView(view, zoom);

    this.baseMapLayer = L.tileLayer(
      baseMap.tileLayer, {
      maxZoom : baseMap.maxZoom || 15,
      attribution : baseMap.attribution || ""
    });
    this.baseMapLayer.addTo(this.map);



    //create arrays that contain easily accessible "pointers" to all features of
    //each dataset
    //create groups wherein all the features of diffrent datasets will be contained
    this.busStopIndex = [];
    this.busStopGroup = new L.LayerGroup().addTo(this.map);
    this.routesIndex = [];
    this.routesGroup = new L.LayerGroup().addTo(this.map);

    this.userPositionLayer = new L.LayerGroup().addTo(this.map);

    this.addIcons();

  }

  /**
   * @desc function that creates all different icons for different map elements
   */
  addIcons(){
    this.busStopIcon = L.icon({
      iconUrl: 'src/icons/BusStopIcon.png',
      iconSize: [10, 10],
      iconAnchor: [5,5]
    });
  }

  /**
   * @desc clear Bus stops
   * @desc removes all markers from the map when called
   */
  clearBusStops(){
    //empty the indices and featureGroups
    this.busStopIndex = [];
    this.busStopGroup.clearLayers();
  }

  /**
   * @desc adds bus stops to the map
   * @param {GeoJSON} featureCollection
   */
  addBusStops(featureCollection){
    const busStopOpacity = 0.4;

    for(let feature of featureCollection.features){
      let markerCoords = [feature.geometry.coordinates[1],
                          feature.geometry.coordinates[0]];
      let markerProperties = feature.properties;

      let marker = L.marker(markerCoords,
                  //marker options
                  {
                    opacity : busStopOpacity,
                    riseOnHover: true}
      );

      //set cosmetics of the bus stop markers
      marker.setIcon(this.busStopIcon);
      marker.on('mouseover', (e)=>{
        marker.setOpacity(1.0);
      });
      marker.on('mouseout', (e)=>{
        marker.setOpacity(busStopOpacity);
      });

      //bind popup
      marker.bindPopup(`
          <b>${markerProperties.lbez}</b><br>
          <ul>
            <li>richtung: ${markerProperties.richtung}</li>
            <li>nr: ${markerProperties.nr}</li>
            <button class="button" type="button"
            onclick="
            DocumentInterface.showDepartures(${markerProperties.nr}, '${markerProperties.lbez}');
            DocumentInterface.scrollToElement('mainMap')
            ">
            show departures</button>
          </ul>
        `);

      //add the marker to markergroup, so it shows up on the map
      this.busStopIndex.push(marker);
      this.busStopGroup.addLayer(marker);
    }
  }

  /**
   * @desc clear Bus stops
   * @desc removes all markers from the map when called
   */
  clearRoutes(){
    //empty the indices and featureGroups
    this.routesIndex = [];
    this.routesGroup.clearLayers();
  }

  /**
   * @desc adds a route to the map
   * @param {GeoJSON} feature GeoJSON of type lineString
   */
  addRoute(feature){
    let route = L.geoJSON(feature);
    this.routesIndex.push(route);
    this.routesGroup.addLayer(route);

  }

  /**
   * @desc updates the user Location when called.
   * is called from reresh()
   * @param {GeoJSON} geoJSON describing the point where the user is.
   */
  updateUserLocation(geoJSON){
    this.userPositionLayer.clearLayers();
    let positionMarker = L.geoJSON(geoJSON);
    this.userPositionLayer.addLayer(positionMarker);
  }

}

/** Class containing all static methods for displaying data on page */
class DocumentInterface{

  /**
   * showPosition
   * @public
   * @desc Shows the position of the user in the textarea.
   * callback function that is passed by getLocation
   * @see getLocation
   * @param {*} position Json object of the user
   */
  static showPosition(position) {
    var x = document.getElementById("userPosition");
    //"Skeleton" of a valid geoJSON Feature collection
    let outJSON = { "type": "FeatureCollection", "features": [] };
    //skelly of a (point)feature
    let pointFeature = {"type": "Feature","properties": {},"geometry": {"type": "Point","coordinates": []}};
    pointFeature.geometry.coordinates = [position.coords.longitude, position.coords.latitude];

    //add the coordinates to the geoJson
    outJSON.features.push(pointFeature);
    x.innerHTML = JSON.stringify(outJSON);
  }

  /**
   * getLocation
   * @public
   * @desc function that requests the geographic position of the browser
   * @see getPosition
   */
  static getLocation() {
    var x = document.getElementById("userPosition");
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(this.showPosition);
    } else {
      x.innerHTML = "Geolocation is not supported by this browser.";
    }
  }

  /**
   * drawBusStopTable
   * @desc inserts the bus stop list into the Table on the web-page
   * @param {*} results array of JSON with contains
   */
  static drawBusStopTable(results) {
    var table = document.getElementById("resultTable");
    //creates the Table with the direction an distances
    for (var j = 0; j < results.length; j++) {
      var newRow = table.insertRow(j + 1);
      var cel1 = newRow.insertCell(0);
      var cel2 = newRow.insertCell(1);
      var cel3 = newRow.insertCell(2);
      var cel4 = newRow.insertCell(3);
      cel1.innerHTML = results[j].name;
      cel2.innerHTML = results[j].coordinates;
      cel3.innerHTML = results[j].distance;
      cel4.innerHTML = results[j].direction;
    }
  }

  /**
   * drawBusStopTable
   * @desc inserts the results into the Table on the web-page
   * @param {*} results array of JSON with contains
   */
  static drawDepartureTable(results){
    var table = document.getElementById("nextDeparturesTable");
    for (var j = 0; j < results.length; j++) {
      var newRow = table.insertRow(j + 1);
      var cel1 = newRow.insertCell(0);
      var cel2 = newRow.insertCell(1);
      var cel3 = newRow.insertCell(2);
      cel1.innerHTML = results[j].linienid;
      cel2.innerHTML = results[j].richtungstext;
      cel3.innerHTML = this.time(results[j].abfahrtszeit);
    }
  }

  /**
   * updateDepartureHeader
   * @desc updates the header above the departure table with the name of the stop.
   * @param {*} results array of JSON with contains
   */
  static updateDepartureHeader(busStopName){
    if(busStopName === undefined){
      document.getElementById("nextDeparturesHeader").innerHTML = "no upcoming departures";
    } else {
      let message = "upcoming departures from " + busStopName;
      document.getElementById("nextDeparturesHeader").innerHTML = message;
    }

  }

  /**
   * showDepartures
   * @desc shows the departure times of a bus stop of choice on the page
   */
  static showDepartures(busStopNr, busStopName){
      DocumentInterface.updateDepartureHeader(busStopName);
      busAPI.departures(busStopNr, 1800)
  }

  /**
   * clearTable
   * @desc removes all table entries and rows except for the header.
   * @param tableID the id of the table to clear
   */
  static clearTable(tableID){
    //remove all table rows
    var tableHeaderRowCount = 1;
    var table = document.getElementById(tableID);
    var rowCount = table.rows.length;
    for (var i = tableHeaderRowCount; i < rowCount; i++) {
      table.deleteRow(tableHeaderRowCount);
    }
  }

  /**
   * displayGeojsonOnPage
   * @desc psuhes a given string onto the geoJSON-id'd tag in the DOM.
   * @param geoJSONString string, expected to represent geojson but can be anything.
   */
  static displayGeojsonOnPage(geoJSONString){
    document.getElementById('geoJSON').innerHTML = geoJSONString;
  }

  /**
   * time
   * @desc takes a second-value (as in seconds elapsed from jan 01 1970) of the time and returns the corresponding time.
   * source: https://stackoverflow.com/a/35890816
   * @param seconds time in milliseconds
   */
  static time(seconds) {
    seconds = parseInt(seconds); //ensure the value is an integer
    var ms = seconds*1000;
    var time = new Date(ms).toISOString().slice(11, -5);
    return time + " GMT";
  }

  /**
   * scrollToElement
   * @desc makes the page scroll to a specified element
   * @param {string} elementID the element to scroll to
   */
  static scrollToElement(elementID){
    $('html, body').animate({scrollTop: $(`#${elementID}`).offset().top - 128});
    //window.location.href = `#${elementID}`;
  }

}

/** Class containing all static methods for geographic distance and bearing
    this could just as well work as an object containing functions, since it's
    an abstract class
*/
class GeoCalculator{

  /**
  * computeBearing
  * @public
  * @desc takes two coordinates and calculates the bearing the first coordinate to the second.
  * uses the Haversine formula, based on https://www.igismap.com/formula-to-find-bearing-or-heading-angle-between-two-points-latitude-longitude/
  * @param start, array of [lon,lat] coordinates
  * @param end, array of [lon,lat] coordinates
  * @returns number, representing the bearing in degrees from start to end
  */
  static computeBearing(start, end) {
    const earthRadius = 6371e3; //Radius
    let deltaLat = this.toRadians(end[1] - start[1]); //difference in latitude at start- and end-point. in radians.
    let deltaLon = this.toRadians(end[0] - start[0]); //difference in longitude at start- and end-point. in radians.

    let x = Math.cos(this.toRadians(end[1])) * Math.sin(deltaLon);
    let y = Math.cos(this.toRadians(start[1])) * Math.sin(this.toRadians(end[1])) -
      Math.sin(this.toRadians(start[1])) * Math.cos(this.toRadians(end[1])) *
      Math.cos(deltaLon);

    let bearing = Math.atan2(x, y);
    //convert bearing to degrees
    bearing = this.toDegrees(bearing);

    // (degrees + 360)%360 to map -180->180 to 0->360
    bearing = (bearing + 360) % 360;

    return bearing;
  }

  /**
  * twoPointDistance
  * @public
  * @desc takes two geographic points and returns the distance between them. Uses the Haversine formula (http://www.movable-type.co.uk/scripts/latlong.html, https://stackoverflow.com/questions/27928/calculate-distance-between-two-latitude-longitude-points-haversine-formula)
  * @param start array of [lon, lat] coordinates
  * @param end array of [lon, lat] coordinates
  * @returns the distance between 2 points on the surface of a sphere with earth's radius
  */
  static twoPointDistance(start, end) {
    //variable declarations
    var earthRadius; //the earth radius in meters
    var phi1;
    var phi2;
    var deltaLat;
    var deltaLong;

    var a;
    var c;
    var distance; //the distance in meters

    //function body
    earthRadius = 6371e3; //Radius
    phi1 = this.toRadians(start[1]); //latitude at starting point. in radians.
    phi2 = this.toRadians(end[1]); //latitude at end-point. in radians.
    deltaLat = this.toRadians(end[1] - start[1]); //difference in latitude at start- and end-point. in radians.
    deltaLong = this.toRadians(end[0] - start[0]); //difference in longitude at start- and end-point. in radians.

    a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLong / 2) * Math.sin(deltaLong / 2);
    c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    distance = earthRadius * c;

    return distance;
  }

  /**
  * toRadians
  * @public
  * @desc helping function, takes degrees and converts them to radians
  * @returns a radian value
  */
  static toRadians(degrees) {
    var pi = Math.PI;
    return degrees * (pi / 180);
  }

  /**
  * toDegrees
  * @public
  * @desc helping function, takes radians and converts them to degrees
  * @returns a degree value
  */
  static toDegrees(radians) {
    var pi = Math.PI;
    return radians * (180 / pi);
  }

  /**
  * bearingToCardinalDirection
  * @public
  * @desc takes a bearing in degrees and returns a cardinal direction. e.g. "NE"
  * @param bearing degree value of direction
  * @returns string that describes cardinal direction
  */
  static bearingToCardinalDirection(bearing) {
    if ((bearing >= 0 && bearing < 22.5) || (bearing >= 337.5 && bearing <= 360)) {
      return "N";
    }
    else if (bearing >= 22.5 && bearing < 67.5) {
      return "NE";
    }
    else if (bearing >= 67.5 && bearing < 112.5) {
      return "E";
    }
    else if (bearing >= 112.5 && bearing < 157.5) {
      return "SE";
    }
    else if (bearing >= 157.5 && bearing < 202.5) {
      return "S";
    }
    else if (bearing >= 202.5 && bearing < 247.5) {
      return "SW";
    }
    else if (bearing >= 247.5 && bearing < 292.5) {
      return "W";
    }
    else if (bearing >= 292.5 && bearing < 337.5) {
      return "NW";
    }
    else {
      return undefined;
    }
  }

  /**
  * @function formatStringifiedGeoJSON
  * @desc formats String of geojson so it has whitespace and line breaks
  * @param text String of the text that is to be displayed
  * @returns String, html formatted geoJSON
  */
  static formatStringifiedGeoJSON(text){
    //replace line-breaks with according html
    text = text.replace(/(?:\r\n|\r|\n)/g, '<br>');
    //replace white space with according html
    text = text.replace(/\s/g, '&nbsp');
    return text;
  }
}

/** Class containing methods for geoJSON processing*/
class GeoJSON{
  constructor(){
    this.featureCollection = { "type": "FeatureCollection", "features": [] };
    this.pointFeature = { "type": "Feature", "properties": {}, "geometry": { "type": "Point", "coordinates": [] } };
  }

  /**
  * arrayToGeoJSON
  * @public
  * @desc method that converts a given array of points into a geoJSON feature collection.
  * @param inputArray Array that is to be converted
  * @returns JSON of a geoJSON feature collectio
  */
  arrayToGeoJSON(inputArray) {
    //reset the skeleton, because it's an object reference
    this.featureCollection = { "type": "FeatureCollection", "features": [] };
    //"Skeleton" of a valid geoJSON Feature collection
    let outJSON = this.featureCollection;

    //turn all the points in the array into proper features and append
    for (const element of inputArray) {
      let newFeature = this.pointFeature;
      newFeature.geometry.coordinates = element;
      outJSON.features.push(JSON.parse(JSON.stringify(newFeature)));
    }

    return outJSON;
  }

  /**
  * isValidGeoJSONPoint
  * @public
  * @desc method that validates the input GeoJSON so it'S only a point
  * @param geoJSON the input JSON that is to be validated
  * @returns boolean true if okay, false if not
  */
  isValidGeoJSONPoint(geoJSON) {
    if (geoJSON.features.length == 1 &&
      geoJSON.features[0].geometry.type.toUpperCase() == "POINT"
    ) {
      return true;
    } else {
      return false;
    }
  }

}

//##############################################################################
//## OBJECTS
//##############################################################################
const geoJSON = new GeoJSON();
const busAPI = new BusAPI();
const mainMapInterface = new MapInterface(
  {
    mapid: "mainMap",
    view: [51.96034, 7.62245],
    zoom: 12,
    baseMap: {
      tileLayer: 'https://{s}.tile.openstreetmap.de/tiles/osmde/{z}/{x}/{y}.png',
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }
  }
);
const geocoder = new HereAPI();
