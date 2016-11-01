
Components.utils.import("resource://Forecast.js");

const XMLHttpRequest  = Components.Constructor("@mozilla.org/xmlextras/xmlhttprequest;1", "nsIXMLHttpRequest");

var EXPORTED_SYMBOLS = ['YahooWeatherModule'];



YahooWeatherModule.class = "yahoo";

YahooWeatherModule.prototype.onError = function(event){
    log(1, this.req.status+" -- "+this.req.statusText);
    this.save_callback(new Forecast())
};
YahooWeatherModule.prototype.onSuccess = function(event){
    log(0,"got response");
    let forecast = this.parseForecast(event.currentTarget);
    this.save_callback(forecast);
};
YahooWeatherModule.prototype.parseForecast = function(http_response){
    try{
        var response = JSON.parse(http_response.responseText);
        if(response.error != undefined){
            log(1,"ERROR: "+response.error);
            return new Forecast();
        }
        let results = response.query.results || [];

        let daily_forecasts_data = results.channel.map(function(elem){
            let forecast_elem = elem.item.forecast;
            let date = new Date(forecast_elem.date);
            return {date: date,
                timestamp: date.getTime(),
                period:24*60,
                weather:{text:forecast_elem.text, icon: "https://s.yimg.com/zz/combo?a/i/us/nws/weather/gr/"+forecast_elem.code+"d.png"},
                published: Date.now()}
        });
        return new Forecast(daily_forecasts_data);
    }catch (e){
        log(1,e);
        return new Forecast();
    }
};
YahooWeatherModule.prototype.requestForecast = function(){
    if(this.req.readyState != 0 && this.req.readyState != 4 ){
        log(0,"request already running - state: "+ this.req.readyState);
        return;  // already waiting for a response -> no need to request it again
    }
    let q = "?q=select item.forecast from weather.forecast where woeid = \""+this.city_woeid+"\" and u = \"c\"&format=json";
    this.req.open("GET", this.icon_baseurl+q);
    this.req.send();
};

function YahooWeatherModule(city, callback) {
    this.save_callback = callback;
    this.city_woeid = city;
    this.icon_baseurl = "https://query.yahooapis.com/v1/public/yql";
    this.storeageId = YahooWeatherModule.class+this.city_woeid;
    this.req = new XMLHttpRequest();
    this.req.addEventListener("error", this.onError.bind(this));
    this.req.addEventListener("abort", this.onError.bind(this));
    this.req.addEventListener("timeout", this.onError.bind(this));
    this.req.addEventListener("load", this.onSuccess.bind(this));
    this.req.timeout = 2000;
}

YahooWeatherModule.locations = function(user_text, callback){

    let q = "?q=select woeid, name, country, admin1,admin2,admin3, centroid, timezone from geo.places where text = \""+user_text+"\" and placeTypeName = \"Town\"&format=json"
    let oReq = new XMLHttpRequest();
    oReq.timeout = 2000;
    oReq.addEventListener("load", YahooWeatherModule.parseLocation.bind(this, callback));
    oReq.addEventListener("error", event => callback() );
    oReq.addEventListener("abort", event => callback() );
    oReq.addEventListener("timeout", event => callback());
    oReq.open("GET", "https://query.yahooapis.com/v1/public/yql"+q);
    oReq.send();
};
YahooWeatherModule.parseLocation = function(callback, event){
    try{
        var response = JSON.parse(event.currentTarget.responseText);
        if(response.error != undefined){
            log(1,"ERROR: "+event.currentTarget.responseText);
            return callback();
        }
        if(response.query.results == null){
            return callback([]);
        }
    }catch(e){
        log(1,e);
        return callback();
    }

    let places = response.query.results.place;
    if(!Array.isArray(places)){
        places = [places];
    }
    let hitting_locations = places.map(function(place) {
        let name = place.name + "," + place.country.code;

        let hierarchy = [place.admin1, place.admin2, place.admin3].map(e => (e != null) ? e.content : "").join("|");
        if(hierarchy.length > 0)
            name = name +" ["+hierarchy+")";

        return [name, place.woeid]
    });
    callback(hitting_locations);
};