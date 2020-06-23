// jshint esversion: 6


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

/**
 * @desc is called when a the user presses the seach-address button.
 * makes a call to the here-api using geocoder.geocode(), and inserts the first
 * result into the user-position input field.
 */
function searchAddress1(){
    var         a = document.getElementById("addressSearch").value;
    var     token = "mUl6LZ18uIkgsAxt-AVxzKbv_72KlcBbtdI0gOKklwE";//<-------------------!!!
    var    urltxt = "https://geocoder.ls.hereapi.com/6.2/geocode.json?apiKey="+token+"&searchtext="+a;
    
    
    $.ajax({
        url: urltxt,
        type: "GET",
        dataType: 'json',
        success: function(data){
            
            if(data.Response.View[0]==undefined){
                window.alert("Please insert a valid adress!")
            }
            else{
                document.getElementById("userPosition").value = JSON.stringify(data.Response);
                var lat = data.Response.View[0].Result[0].Location.NavigationPosition[0].Latitude;
                var long = data.Response.View[0].Result[0].Location.NavigationPosition[0].Longitude;
                map.setView([lat,long],16) 
                var location = L.marker([lat,long]).addTo(map);
            }
            
        },
        
    })
    
    }


    function searchAddress2(){
        var userInput = $("#addressSearch").val() + ", Münster";
        var position = geocoder.geocode(userInput);
        
        //insert the new value into the userPosition textarea, using jquery instead of
        $("#userPosition").val(position);
        
    }

 /**
 * clears the Text area
 */
function deleteText(){
    "use strict";
    document.getElementById("geojsontextarea").value = "";
}
class DocumentInterface {

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
        let outJSON = {"type": "FeatureCollection", "features": []};
        //skelly of a (point)feature
        let pointFeature = {"type": "Feature", "properties": {}, "geometry": {"type": "Point", "coordinates": []}};
        pointFeature.geometry.coordinates = [position.coords.longitude, position.coords.latitude];

        //add the coordinates to the geoJson
        outJSON.features.push(pointFeature);
        console.log (outJSON);
        x.value  = JSON.stringify(outJSON);

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
            x.value = "Geolocation is not supported by this browser.";
        }
    }
}
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
const geocoder = new HereAPI();

//##############################################################################
//## Mapstuff
//##############################################################################
const lat = 51.96;
const lon = 7.59;
const start_latlng = [lat, lon];

var map = L.map("map").setView(start_latlng, 13);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 14,
    attribution: "Map data &copy; <a href=\"https://www.openstreetmap.org/\">OpenStreetMap</a> contributors",
    id: "osm"
}).addTo(map);

var drawnItems = L.featureGroup().addTo(map);

//Only the marker drawer is allowed
map.addControl( new L.Control.Draw({
    edit: {
        featureGroup: drawnItems,
        poly: {
            allowIntersection: false
        }
    },
    draw: {
        circle: false,
        marker: true,
        polyline: false,
        rectangle:false,
        circlemarker: false,
        point: false,
         polygon: false,
    }
}));

//If the draw is deleted the textarea will also be cleared
map.on("draw:deleted", function (event) {
    "use strict";
    deleteText();
});

//if there will be a new Polygon drawn, the old one will be deleted and the text area updated
map.on("draw:created", function (event) {
    "use strict";
    var layer = event.layer;
    drawnItems.clearLayers();
    drawnItems.addLayer(layer);

    deleteText();
    updateText();
});

//if the draw will be edited the textarea changes
map.on("draw:edited", function (event) {
    "use strict";
    deleteText();
    updateText();
});

/**
 * clears the Text area
 */
function deleteText(){
    "use strict";
    document.getElementById("userPosition").value = "";
}
/**
 * creates a geojson text representation from the the drawnItems with a FeatureCollection as root element
 */
function updateText(){
    "use strict";
    document.getElementById("userPosition").value = JSON.stringify(drawnItems.toGeoJSON());
}


/**
 * 
 */
function onChange(){
    "use strict";
    let value= document.getElementById("userPosition").value;
    try{
        const json = JSON.parse(value);
        //regex of regular geojson
        const regex = /\s*{\s*"type"\s*:\s*"FeatureCollection"\s*,\s*"features"\s*:\s*\[\s*{\s*"type"\s*:\s*"Feature"\s*,\s*"properties"\s*:\s*{(\s*"[a-zA-z\d]"*\s*:\s*"[a-zA-z\d]"\s*,\s*)*(\s*"[a-zA-z\d]"*\s*:\s*"[a-zA-z\d]"\s*)?}\s*,\s*"geometry"\s*:\s*\{"type"\s*:\s*"Point"\s*,\s*"coordinates"\s*:\s*\[-?\d{1,2}(\.\d*)?\s*,\s*-?\d{1,3}(\.\d*)?\s*\]\s*\}\s*\}\s*\]\s*\}\s*/gi;
        if (regex.test(value)) {
            drawnItems.clearLayers();
           
            const marker= L.marker([json.features[0].geometry.coordinates[1],json.features[0].geometry.coordinates[0]]);
            marker.addTo(drawnItems)
           // marker.addTo(map)
            map.fitBounds(drawnItems.getBounds());
        } else {
            alert("No valid GeoJSON inserted");
        }
    }
    catch(e){
        console.log(e)
        alert("No valid GeoJSON inserted");
        }
}
function save(){
    var g = document.getElementById("userPosition").value;
}

/**
 * ´@desc Send Files in textarea to Server to store them
 */
function sendFile(){
    let input= document.getElementById("userPosition").value;
    //proof valid json
    try{
        input = JSON.parse(input);
        postRequest(input)
    }
    catch (e){
        console.log(e);
        alert("No valid JSON");
    }

}

/**
 * @desc Sends data to server to get stored in database
 * @param dat to store
 */
function postRequest(dat) {

    console.log(dat)
    return new Promise(function (res, rej) {
        $.ajax({
            url: "/item",
            data: dat,
            type: "post",
            
            success: function (result) { res(result) },
            error: function (err) { console.log(err) }
        });
    })
}

/**
 * @desc Updates data from server
 * @param dat to delete
 */
async function updateFile(){
    let input= document.getElementById("userPosition").value;
    try{
        input = JSON.parse(input);
        updateRequest(input);
    }
    catch(e){
        console.log(e);
        alert("Not Found");
    }
}
/**
 * @desc Sends data to server to get stored in database
 * @param dat to store
 */
function updateRequest(dat) {
    
    console.log(dat)
    return new Promise(function (res,rej){
        $.ajax({
            url: "/update",
            data: dat[0],
            type: "put",
            
            
            success: function (result) { res(result) },
            error: function (err) { console.log(err) }
        });
    })
}
/**
 * @desc Searches data from server
 * @param dat to search
 */
async function searchFile(){
    let input= document.getElementById("idfield").value;
    try{
        let result = await searchRequest(input);
        document.getElementById("userPosition").value = JSON.stringify(result);
    }
    catch(e){
        console.log(e);
        alert("Not Found");
    }
}
/**
 * @desc Searches data from server, needs id as input
 * @param dat to search
 */
function searchRequest(input){
    console.log(input)
    return new Promise(function (res,rej){
        $.ajax({
            url: "/search?id=" +input,
            success: function (result) { res(result) },
            error: function (err) { console.log(err) }
        });
    })
}
/**
 * @desc Deletes data from server
 * @param dat to delete
 */
async function deleteFile(){
    let input= document.getElementById("userPosition").value;
    try{
        input = JSON.parse(input);
        deleteRequest(input);
    }
    catch(e){
        console.log(e);
        alert("Not Found");
    }
}
function deleteRequest(input){
    console.log("delete" + input)
        return new Promise(function (res, rej) {
            $.ajax({
                url: "/delete",
                data: input[0],
                type: "delete",

                success: function (result) { res(result) },
                error: function (err) { console.log(err) }
            });
        })

}

