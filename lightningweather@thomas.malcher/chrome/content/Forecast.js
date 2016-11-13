
const XMLHttpRequest  = Components.Constructor("@mozilla.org/xmlextras/xmlhttprequest;1", "nsIXMLHttpRequest");

var EXPORTED_SYMBOLS = ['Forecast', 'log', 'BaseProvider', 'GeoLookup'];

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
 * merges two ForecastElement objects into one
 * This does not make a copy it manipulates one of the input parameters
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
}

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
    forEachFrom: function(start_timestamp, func){
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
            //other.updateGranularity();
            //this.updateGranularity();

            if (other.granularity != undefined && this.granularity != undefined && other.granularity != this.granularity) {
                log("cannot combine, granularity is different "+ other.granularity+" != "+this.granularity);
                return;
            }
            other.forEach(function(elem){
                this.add(elem);
            }.bind(this));

            //this.updateGranularity();
        },
    add: function(elem){
            let i = this._data.findIndex(function(e){ return (e.timestamp > elem.timestamp)});
            if (i === -1) { // no element in self._data is later than elem
                if (this._data.length > 0 && this._data[this._data.length-1].timestamp == elem.timestamp){  // last element of self._data can be equal
                    log(0,"merge last "+(new Date(this._data[this._data.length-1].timestamp)).toUTCString()+" with "+(new Date(elem.timestamp)).toUTCString());
                    elem = mergeForecastElements(this._data[this._data.length-1], elem);
                    this._data[this._data.length-1] = elem;
                }else{  // all elements are earlier
                    log(0,"append "+(new Date(elem.timestamp)).toUTCString());
                    this._data.push(elem);
                }
            }else if (i === 0){ // all elements in self._data are later than elem
                log(0,"prepend "+(new Date(elem.timestamp)).toUTCString()+" to "+(new Date(this._data[0].timestamp)).toUTCString());
                this._data.splice(0, 0, elem);
            }else if (i > 0){
                if (this._data[i-1].timestamp == elem.timestamp){
                    log(0,"merge "+(new Date(this._data[i-1].timestamp)).toUTCString()+" at "+(i-1)+" with "+(new Date(elem.timestamp)).toUTCString());
                    elem = mergeForecastElements(this._data[i-1], elem);
                    this._data[i-1] = elem;
                }else {
                    log(0,"insert "+(new Date(elem.timestamp)).toUTCString());
                    this._data.splice(i, 0, elem);
                }
            }
        },
    limitTo: function(start_datetime, end_datetime){
            let start_timestamp = start_datetime.getTime();
            let end_timestamp = end_datetime.getTime();
            this.sort();
            this._data = this._data.filter(function(elem){
                if(elem.timestamp < start_timestamp || elem.timestamp > end_timestamp){
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
                //this.updateGranularity();
            }else{
                log(1, "setData: not valid data "+data)
            }
        },

/*    updateGranularity: function(){
            if(this._data.length == 0) {
                this.granularity = undefined;
            } else if(this._data.length > 0 && this._data[0].period != undefined){
                this.granularity = this._data.every(e => (e.period == this._data[0].period)) ? this._data[0].period : -1;
            } else {
                this.granularity = -1;
            }
        },*/
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

Object.defineProperties(IForecast, {
    "length": {"get": function() { return this._data.length; } }
});
Object.defineProperties(IForecast, { "granularity":
    {"get": function(){
            if(this._data.length == 0) {
                return undefined;
            } else if(this._data.length > 0 && this._data[0].period != undefined){
                return this._data.every(e => (e.period == this._data[0].period)) ? this._data[0].period : -1;
            } else {
                return -1;
            }
        }
    }
});


/*** Forecast constructor
 *
 * A Forecast obj is the main data holder
 * It enhances a list of ForecastElements with functions for merging
 *
 * @param data: list of ForecastElements
 * @constructor
 */
Forecast.prototype = IForecast;
function Forecast(data){
    let self = this;
    this._data = [];

    this.setData(data);
    this.sort();
    //this.updateGranularity();
}

BaseProvider.prototype.error = function(){
    log(1, this.req.status+" -- "+this.req.statusText);
    this.save_callback(new Forecast())
};
BaseProvider.prototype.success = function(event){
    log(0,"got response");
    let forecast = this.parseForecast(event.currentTarget);
    this.save_callback(forecast);
};
BaseProvider.prototype.requestForecast = function(){
    if(this.url == null){
        log(2,"City not given");
        this.save_callback(new Forecast())
    }
    if(this.req.readyState != 0 && this.req.readyState != 4 ){
        log(0,"request already running - state: "+ this.req.readyState);
        return;  // already waiting for a response -> no need to request it again
    }
    log(0, "going to request: "+this.url);
    this.req.open("GET", this.url);
    this.req.send();
    log(1, "request sent");
};
BaseProvider.prototype.parseForecast = function(){
    throw "NOT IMPLEMENTED"
};

function BaseProvider(callback, tz){
    this.tz = tz;
    this.save_callback = callback;
    this.storeageId = Math.floor(Math.random()*1000).toString(36);
    this.req = new XMLHttpRequest();
    this.req.timeout = 2000;
    this.req.addEventListener("error", this.error.bind(this));
    this.req.addEventListener("abort", this.error.bind(this));
    this.req.addEventListener("timeout", this.error.bind(this));
    this.req.addEventListener("load", this.success.bind(this));
}

function GeoLookup(){
    this.req = new XMLHttpRequest();
    this.req.timeout = 2000;
}
GeoLookup.prototype.error = function(callback, event){
    log(1, this.req.status+" -- "+this.req.statusText);
    callback([]);
};
GeoLookup.prototype.success = function(callback, event){

    let locations = this.parseLocations(event.currentTarget);
    callback(locations);
};
GeoLookup.prototype.locations = function(query, callback){
    query = query+" "; // returns better results
    let q = "?q=select woeid, name, country, admin1,admin2,admin3, centroid, timezone from geo.places where text = \""+query+"\" and placeTypeName = \"Town\"&format=json";

    if(this.req.readyState != 0 && this.req.readyState != 4 ){
        log(0,"request already running - state: "+ this.req.readyState);
        this.req.abort();
    }
    this.req.addEventListener("error", this.error.bind(this, callback));
    this.req.addEventListener("abort", this.error.bind(this, callback));
    this.req.addEventListener("timeout", this.error.bind(this, callback));
    this.req.addEventListener("load", this.success.bind(this, callback));
    this.req.open("GET", "https://query.yahooapis.com/v1/public/yql"+q);
    this.req.send();
};
GeoLookup.prototype.parseLocations = function(http_response){
    try{
        var response = JSON.parse(http_response.responseText);
        if(response.error != undefined){
            log(1,"ERROR: "+http_response.responseText);
            return [];
        }
        if(response.query.results == null){
            return [];
        }
    }catch(e){
        log(1,e);
        return [];
    }

    let places = response.query.results.place;
    if(!Array.isArray(places)){
        places = [places];
    }
    let hitting_locations = places.map(function(place) {
        let name = place.name + "," + place.country.code;
        let desc = name;
        let hierarchy = [place.admin1, place.admin2, place.admin3].map(e => (e != null) ? e.content : "").join("|");
        if(hierarchy.length > 0)
            desc = desc +" ["+hierarchy+")";

        return [name, JSON.stringify({'geo':place.centroid ,'id': place.woeid, 'tz': place.timezone.content}), desc]
    });
    return hitting_locations;
};
