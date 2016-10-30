
var EXPORTED_SYMBOLS = ['OpenWeathermapModule','YahooWeatherModule', 'CombinedWeatherModule', 'Forecast'];

const XMLHttpRequest  = Components.Constructor("@mozilla.org/xmlextras/xmlhttprequest;1", "nsIXMLHttpRequest");

function log(level, msg){
    if(arguments.length == 1)
        dump(arguments[0]+"\n");
    else if(level >= 0)
        dump(msg+"\n");
}

/* A ForecastElement is an obj with the following attributes
ForecastElement(){
 this.weather
 this.timestamp
 this.published
 this.period
 this.nestedForecast
 }
 */


/*** mergeForecastElements
 *
 * merges two ForecastElement objects does not make a copy
 * @param e1
 * @param e2
 * @returns {*}
 */
function mergeForecastElements(e1, e2){
    if (e1 == null){
        return e2;
    }else if(e2 == null) {
        return e1;
    }

    if (e1.timestamp != e2.timestamp || e1.period != e2.period){
        return;
    }

    let merged, other = null;
    if (e1.published > e2.published){
        merged = e1;
        other = e2;
    }else{
        merged = e2;
        other = e1;
    }

    // merge nested Forecast if exists
    let nestedForecast = null;
    if(merged.nestedForecast != null && other.nestedForecast != null){
        merged.nestedForecast.combine(other.nestedForecast);
    }else if(merged.nestedForecast == null){ // if newer has no nested Forecast use the one from older element
        merged.nestedForecast = other.nestedForecast;
    }
    return merged
};

var IForecast = {
    forEach: function(func){
        this._data.forEach(func);
    },
    forEachFlat: function(func){
        this._data.forEach(function(elem){
            func(elem);
            if(elem.nestedForecast){
                elem.nestedForecast.forEachFlat(func)
            }
        });
    },
    forEachFrom: function(start, func){
            let start_timestamp = start.getTime();
            this.forEach(function(elem){
                if(elem.timestamp >= start_timestamp){
                    func(elem)
                }
            })
        },

    combine: function(other) {
            if(!(other instanceof Forecast)){
                other = new Forecast(other);
            }
            other.updateGranularity();
            this.updateGranularity();

            if (other.granularity != undefined && this.granularity != undefined && other.granularity != this.granularity) {
                log("cannot combine, granularity is different "+ other.granularity+" != "+this.granularity);
                return;
            }
            other.forEach(function(elem){
                this.add(elem);
            }.bind(this));

            this.updateGranularity();
        },
    add: function(elem){
            let i = this._data.findIndex(function(e){ return (e.timestamp > elem.timestamp)});
            if (i === -1) { // no element in self._data is later than elem
                if (this._data.length > 0 && this._data[this._data.length-1].timestamp == elem.timestamp){  // last element of self._data can be equal
                    log(0,"merge last "+new Date(this._data[this._data.length-1].timestamp)+" with "+new Date(elem.timestamp));
                    elem = mergeForecastElements(this._data[this._data.length-1], elem);
                    this._data[this._data.length-1] = elem;
                }else{  // all elements are earlier
                    log(0,"append "+new Date(elem.timestamp));
                    this._data.push(elem);
                }
            }else if (i === 0){ // all elements in self._data are later than elem
                log(0,"prepend "+new Date(elem.timestamp)+" to "+new Date(this._data[0].timestamp));
                this._data.splice(0, 0, elem);
            }else if (i > 0){
                if (this._data[i-1].timestamp == elem.timestamp){
                    log(0,"merge "+new Date(this._data[i-1].timestamp)+" at "+(i-1)+" with "+new Date(elem.timestamp));
                    elem = mergeForecastElements(this._data[i-1], elem);
                    this._data[i-1] = elem;
                }else {
                    log(0,"insert "+new Date(elem.timestamp));
                    this._data.splice(i, 0, elem);
                }
            }
        },
    limitTo: function(start_datetime, end_datetime){
            let start_timestamp = start_datetime.getTime();
            let end_timestamp = end_datetime.getTime();
            this.sort();
            this._data = this._data.filter(function(elem){
                if(elem.timestamp < start_timestamp){
                    return false;
                }
                if(elem.timestamp > end_timestamp){
                    return false;
                }
                return true;
            })
        },

    sort: function(){
            this._data.sort(function(a, b){
                if(a.timestamp < b.timestamp){
                    return -1;
                }else if (a.timestamp > b.timestamp){
                    return 1;
                }else {
                    return 0;
                }
            });
        },


    setData: function (data) {
            if (data != null && Array.isArray(data)){
                this._data = data;
                this._data.forEach(function(elem){
                    if(elem.nestedForecast != null && !(elem.nestedForecast instanceof Forecast)) {
                        elem.nestedForecast = new Forecast(elem.nestedForecast);
                    }
                });
                this.sort();
                this.updateGranularity();
            }else{
                log(1, "setData: not valid data "+data)
            }
        },

    updateGranularity: function(){
            if(this._data.length == 0) {
                this.granularity = undefined;
            } else if(this._data.length > 0 && this._data[0].period != undefined){
                this.granularity = this._data.every(e => (e.period == this._data[0].period)) ? this._data[0].period : -1;
            } else {
                this.granularity = -1;
            }
        },
    toString: function(){
            return "["+ this._data.reduce(function(s, e){ return s+e.timestamp+", "; },"Forecast: ")+"]";
        },

    toJSON: function(){
            return this._data;
        },
    age: function(){
        let most_recent = (new Date(0)).getTime();
        this.forEachFlat(function(elem){
            if(elem.published >= most_recent){
                most_recent = elem.published
            }
        });
        return most_recent;
    }
};

/*** Forecast constructor
 *
 * A Forecast obj is the main data holder
 * It enhances a list of ForecastElements with functions for merging
 *
 * @param data: list of ForecastElements
 * @constructor
 */
function Forecast(data){
    let self = this;
    this.granularity = undefined;
    this._data = [];

    Object.defineProperties(this, {
        "length": {"get": function() { return self._data.length; } }
    });

    this.setData(data);
    this.sort();
    this.updateGranularity();
}
Forecast.prototype = IForecast;



function OpenWeathermapModule(city, callback) {
//http://api.openweathermap.org/data/2.5/forecast?id=2778067&APPID=c43ae0077ff0a3d68343555c23b97f5f
//http://api.openweathermap.org/data/2.5/weather?id=2778067&APPID=c43ae0077ff0a3d68343555c23b97f5f

    this.callback = callback;
    this.city_id = city;
    this.baseurl = "http://openweathermap.org/img/w/";

    this.storeageId = OpenWeathermapModule.class+this.city_id;
    var self = this;

    this.requestForecast = function(){
        if(this.city_id == null){
            log(1,"City not given");
            this.callback(new Forecast())
        }
        let oReq = new XMLHttpRequest();
        oReq.timeout = 5000;
        oReq.addEventListener("load", this.parseForecast.bind(this));
        oReq.addEventListener("error", event => this.callback(new Forecast()) );
        oReq.addEventListener("abort", event => this.callback(new Forecast()) );
        oReq.addEventListener("timeout", event => this.callback(new Forecast()));
        oReq.open("GET", "http://api.openweathermap.org/data/2.5/forecast?id="+this.city_id+"&APPID=c43ae0077ff0a3d68343555c23b97f5f");
        oReq.send();
    };
    this.parseForecast = function(event) {
        try{
            var response = JSON.parse(event.currentTarget.responseText);
            if(response.cod != 200 || !Array.isArray(response.list)){
                log(1,"ERROR: "+event.currentTarget.responseText);
                return this.callback(new Forecast());
            }
        }catch (e) {
            log(1,"ERROR: "+e);
            return this.callback(new Forecast());
        }

        let list = response.list.map(function(elem){
            let datetime = new Date(elem.dt*1000);
            return {
                    timestamp: elem.dt*1000,
                    period: 3*60,
                    weather: {icon: self.baseurl+elem.weather[0].icon+ ".png"},
                    published: Date.now(),
                    datetime: datetime,
                    date: new Date(datetime.getFullYear(), datetime.getMonth(), datetime.getDate()),
                    debugdate: elem.dt_txt
            }
        });
        let grouped_forecast = new Map();
        list.forEach(function(e){
            if(grouped_forecast.has(e.date.getTime())){
                let elem_list = grouped_forecast.get(e.date.getTime());
                elem_list.push(e);
                grouped_forecast.set(e.date.getTime(), elem_list);
            }else {
                grouped_forecast.set(e.date.getTime(), [e]);
            }
        });

        let daily_forecasts_data = [];
        grouped_forecast.forEach(function(hourly_forecasts, date_timestamp){
            log(0,new Date(date_timestamp)+" has "+ hourly_forecasts.length+" forecasts");
            hourly_forecasts = hourly_forecasts.map(function(e){
                return {timestamp: e.timestamp,
                        period:e.period ,
                        weather:e.weather,
                        published:e.published }
                });
            hourly_forecasts.sort(function(a, b){ return (a.timestamp < b.timestamp)? -1:
                (a.timestamp > b.timestamp)? 1: 0;});


            let midday_timestamp = new Date(date_timestamp).setHours(12);
            let avg_day_weather = undefined;
            hourly_forecasts.reduce(function(best_delta, elem){
                    let delta = Math.abs(elem.timestamp - midday_timestamp);
                    if(delta < best_delta){
                        best_delta = delta;
                        avg_day_weather = elem.weather;
                    }
                    return best_delta;
                }, Infinity);

            let nestedForecast = new Forecast(hourly_forecasts);
            daily_forecasts_data.push({
                timestamp: date_timestamp,
                period:24*60,
                weather: avg_day_weather,
                published: Date.now(),
                nestedForecast: nestedForecast
            });
        });

        this.callback(new Forecast(daily_forecasts_data))
    };
}
OpenWeathermapModule.class = "openweather";
OpenWeathermapModule.locations = function(user_text, callback){
    let oReq = new XMLHttpRequest();
    oReq.timeout = 2000;
    oReq.addEventListener("load", OpenWeathermapModule.parseLocation.bind(this, callback));
    oReq.addEventListener("error", event => callback() );
    oReq.addEventListener("abort", event => callback() );
    oReq.addEventListener("timeout", event => callback() );
    oReq.open("GET", "http://api.openweathermap.org/data/2.5/weather?q="+user_text+"&APPID=c43ae0077ff0a3d68343555c23b97f5f");
    oReq.send();
};
OpenWeathermapModule.parseLocation = function(callback, event){
    try{
        var response = JSON.parse(event.currentTarget.responseText);
        if(response.cod == 404){
            log(0,"citiy not found "+response);
            return callback([]);
        }else if(response.cod != 200){
            return callback();
        }
        let name = response.name+", "+response.sys.country;
        callback([[name,response.id]]);
    }catch (e){
        log(1, e);
        return callback();
    }
};

YahooWeatherModule.class = "yahoo";
function YahooWeatherModule(city, callback) {
    this.callback = callback;
    this.city_woeid = city;
    this.baseurl = "https://query.yahooapis.com/v1/public/yql";
    this.storeageId = YahooWeatherModule.class+this.city_woeid;

    this.requestForecast = function(){
        let q = "?q=select item.forecast from weather.forecast where woeid = \""+this.city_woeid+"\" and u = \"c\"&format=json"
        let oReq = new XMLHttpRequest();
        oReq.timeout = 5000;
        oReq.addEventListener("load", this.parseForecast.bind(this));
        oReq.addEventListener("error", event => this.callback(new Forecast()) );
        oReq.addEventListener("abort", event => this.callback(new Forecast()) );
        oReq.addEventListener("timeout", event => this.callback(new Forecast()));
        oReq.open("GET", this.baseurl+q);
        oReq.send();
    };

    this.parseForecast = function(event){
        try{
            var response = JSON.parse(event.currentTarget.responseText);
            if(response.error != undefined){
                log(1,"ERROR: "+response.error);
                return this.callback(new Forecast());
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
            this.callback(new Forecast(daily_forecasts_data))
        }catch (e){
            log(1,e);
            this.callback(new Forecast());
        }
    }
}

YahooWeatherModule.locations = function(user_text, callback){

    let q = "?q=select woeid, name, country, admin1,admin2,admin3, centroid from geo.places where text = \""+user_text+"\" and placeTypeName = \"Town\"&format=json"
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






CombinedWeatherModule.prototype.requestForecast = function(){
    //reset forecast_cache
    this.forecast_cache  = new Map(this.modules.map(m => [m.storeageId, null]));
    for(let module of this.modules){
        module.requestForecast();
    }
};

CombinedWeatherModule.prototype.dummycallback = function(module, forecast){
    this.forecast_cache.set(module.storeageId, forecast);

    let all_modules_done = true;
    for(let f of this.forecast_cache.values()){
        if(f == null){
            all_modules_done = false;
        }
    }
    if(all_modules_done){
        let combined_forecast = new Forecast([]);
        for(let forecast of this.forecast_cache.values()){
            combined_forecast.combine(forecast);
        }
        this.callback(combined_forecast)
    }
};

CombinedWeatherModule.class = "combined";
function CombinedWeatherModule(city, submodules, callback) {
    this.callback = callback;

    this.modules = submodules;
    this.city_id = city;
    this.storeageId = CombinedWeatherModule.class+this.city_id;
    this.forecast_cache = undefined;


    for(let module of this.modules){
        module.callback = this.dummycallback.bind(this, module);
    }
}

