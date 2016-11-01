Components.utils.import("resource://Forecast.js");

const XMLHttpRequest  = Components.Constructor("@mozilla.org/xmlextras/xmlhttprequest;1", "nsIXMLHttpRequest");
Components.utils.import("resource://yahooprovider.js");

var EXPORTED_SYMBOLS = ['DarkSkyWeatherModule'];


DarkSkyWeatherModule.class = "darksky";
function DarkSkyWeatherModule(city, callback){
    this.save_callback = callback;
    this.city_geoloc = city;
    this.storeageId = DarkSkyWeatherModule.class+this.city_geoloc;
    var self = this;

    this.requestForecast = function(){
        let q = self.city_geoloc.latitude+","+self.city_geoloc.longitude;

        let oReq = new XMLHttpRequest();
        oReq.timeout = 2000;
        oReq.addEventListener("load", self.parseForecast.bind(self));
        oReq.addEventListener("error", event => self.save_callback(new Forecast()) );
        oReq.addEventListener("abort", event => self.save_callback(new Forecast()) );
        oReq.addEventListener("timeout", event => self.save_callback(new Forecast()));
        oReq.open("GET", "https://api.darksky.net/forecast/064d091f681950f7512a771c6a0697f4/"+q+"?exclude=[currently,minutely,alerts,flags]");
        oReq.send();
    };

    this.parseForecast = function(event){
        try{
            let response = JSON.parse(event.currentTarget.responseText);
            let tz = response.timezone;
            log(0, "gto timezone "+tz);
            let daily = response.daily.data || [];
            let daily_forecasts_data = daily.map(function(datapoint){
                log(0,"got forecast "+datapoint.icon+" for date "+new Date(datapoint.timestamp*1000));
                return {
                    timestamp: datapoint.timestamp*1000,
                    period: 24*60,
                    weather: {icon: datapoint.icon},
                    published: Date.now()
                }
            });
            let grouped_hourly_forecasts = new Map();
            // initialize grouped_hourly_forecasts Map with timestamps of each day
            daily_forecasts_data.forEach(function(e){
                grouped_hourly_forecasts.set(e.timestamp,[])
            });


            list.forEach(function(e){
                if(grouped_forecast.has(e.date.getTime())){
                    let elem_list = grouped_forecast.get(e.date.getTime());
                    elem_list.push(e);
                    grouped_forecast.set(e.date.getTime(), elem_list);
                }else {
                    grouped_forecast.set(e.date.getTime(), [e]);
                }
            });

            this.save_callback(new Forecast(daily_forecasts_data));
        }catch (e){
            log(1,e);
            self.save_callback(new Forecast());
        }
    }
}

// DarkSky can only be queried through lon/lat therefore
//  I use the Yahoo places service also used in the YahooWeatherModule to map from place query to lon/lat
DarkSkyWeatherModule.locations  = function(user_text, callback){
    let q = "?q=select name, country, admin1,admin2,admin3, centroid, timezone from geo.places where text = \""+user_text+"\" and placeTypeName = \"Town\"&format=json"
    let oReq = new XMLHttpRequest();
    oReq.timeout = 2000;
    oReq.addEventListener("load", YahooWeatherModule.parseLocation.bind(this, callback));
    oReq.addEventListener("error", event => callback() );
    oReq.addEventListener("abort", event => callback() );
    oReq.addEventListener("timeout", event => callback());
    oReq.open("GET", "https://query.yahooapis.com/v1/public/yql"+q);
    oReq.send();
};

DarkSkyWeatherModule.parseLocation = function(callback, event){
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

        return [name, place.centroid]
    });
    callback(hitting_locations);
};
