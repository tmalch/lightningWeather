
var EXPORTED_SYMBOLS = ['OpenWeathermapModule', 'Forecast'];

const XMLHttpRequest  = Components.Constructor("@mozilla.org/xmlextras/xmlhttprequest;1", "nsIXMLHttpRequest");

function log(level, msg){
    if(msg == undefined)
        dump(level+"\n");
    else if(level > 0)
        dump(msg+"\n");
}

/*
function IForecast(data){
    function IForecastElement(){
        this.weather
        this.timestamp
        this.published
        this.period
        this.nestedForecast
    }

    this.forEach(func);
    this.forEachFrom(start, func);
    this.add(elem);  // add given ForecastElement to the Forecast overwrite an eventually existing Element for the same time period

    this.toJson();
    this.combine(other);
    this.limitTo(start,end);

    this.granularity;
    this.startDatetime;
    this.endDatetime
}
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
    // merge nested Forecast if exists
    let nestedForecast = null;
    if(e1.nestedForecast != null && e2.nestedForecast != null){
        if (e2.nestedForecast.published > e1.nestedForecast.published) {
            nestedForecast = e2.nestedForecast;
            nestedForecast.combine(e1.nestedForecast);
        }else {
            nestedForecast = e1.nestedForecast;
            nestedForecast.combine(e2.nestedForecast);
        }

    }else if(e1.nestedForecast != null){
        nestedForecast = e1.nestedForecast;
    } else { // if e1 has no nested Forecast use e2's
        nestedForecast = e2.nestedForecast;
    }

    let merged = null;
    if (e1.published > e2.published){
        merged = e1;
    }else{
        merged = e2;
    }
    merged.nestedForecast = nestedForecast;
    return merged
};

function IForecast(data){

    let self = this;
    this.granularity = undefined;
    this.storeageId = undefined;

    this.toJSON = function(){
        throw "Not implemented";
    };

    // loop over sorted list
    this.forEach = function(func){
        throw "forEach Not implemented";
    };

    this.add = function(elem){
        // if elem already exists in this merge both and add the merged
        // else just add it
        throw "add Not implemented";
    };
    this._getNumberOfForecasts = function(){
        throw "_getNumberOfForecasts Not implemented";
    };

    this.forEachFrom = function(start, func){
        let start_timestamp = start.getTime();
        self.forEach(function(elem){
            if(elem.timestamp >= start_timestamp){
                func(elem)
            }
        })
    };

    this.combine = function(other) {
        if(!(other instanceof Forecast)){
            other = new Forecast(other);
        }
        this.updateGranularity();
        other.updateGranularity();
        if (other.granularity != self.granularity) {
            return;
        }
        other.forEach(function(elem){
            self.add(elem);
        });
    };
}

function Forecast(data){
    IForecast.call(this);
    let self = this;

    Forecast.prototype.toString = function(){
        return "["+ self._data.reduce(function(s, e){ return s+e.timestamp+", "; },"")+"]";
    };

    this.toJSON = function(){
        return this._data;
    };
    this.forEach = function(func){
        self._data.forEach(func);
    };

    this.add = function(elem){
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
    };

    Object.defineProperties(this, {
        "length": {"get": function() { return self._data.length; } }
    });

    this.limitTo = function(start_datetime, end_datetime){
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
    };

    this.sort = function(){
        self._data.sort(function(a, b){
            if(a.timestamp < b.timestamp){
                return -1;
            }else if (a.timestamp > b.timestamp){
                return 1;
            }else {
                return 0;
            }
        });
    };

    if (data == null || !Array.isArray(data)){
        if( this._data == null)
            this._data = [];
    }else{
        this._data = data;
    }
    this.sort();
    this.updateGranularity = function(){
        if(this._data.length == 0)
            log(0,"HOWWWWWWWW length "+ this._data.length);
        if(this._data.length > 0 && this._data[0].period == undefined){
            log(0,"HOWWWWWWWW period"+ this._data[0].period);
        }
        if(this._data.length > 0 && this._data[0].period != undefined){
            this.granularity = this._data.every(e => (e.period == this._data[0].period)) ? this._data[0].period : -1;
        } else {
            this.granularity = -1;
        }
    };
    this.updateGranularity();

}
Forecast.prototype = new IForecast();

function OpenWeathermapModule(city, callback) {
//http://api.openweathermap.org/data/2.5/forecast?id=2778067&APPID=c43ae0077ff0a3d68343555c23b97f5f
//http://api.openweathermap.org/data/2.5/weather?id=2778067&APPID=c43ae0077ff0a3d68343555c23b97f5f

    this.callback = callback;
    this.city_id = city;
    this.baseurl = "http://openweathermap.org/img/w/";
    this.storeageId = "openweather"+this.city_id;
    var self = this;

    this.requestForecast = function(){
        if(this.city_id == null){
            this.city_id = 2778067;
        }
        let oReq = new XMLHttpRequest();
        oReq.addEventListener("load", this.parseForecast.bind(this));
        oReq.open("GET", "http://api.openweathermap.org/data/2.5/forecast?id="+this.city_id+"&APPID=c43ae0077ff0a3d68343555c23b97f5f");
        oReq.send();
    };
    this.parseForecast = function(event) {
        let response = JSON.parse(event.currentTarget.responseText);
        if(response.cod != 200){
            log(1,"ERROR: "+event.currentTarget.responseText);
            return;
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
                elem_list.push(e)
                grouped_forecast.set(e.date.getTime(), elem_list);
            }else {
                grouped_forecast.set(e.date.getTime(), [e]);
            }
        });

        let daily_forecasts = new Forecast();
        grouped_forecast.forEach(function(hourly_forecasts, date){
            log(0,new Date(date)+" has "+ hourly_forecasts.length+" forecasts");
            hourly_forecasts = hourly_forecasts.map(function(e){
                return {timestamp: e.timestamp,
                        period:e.period ,
                        weather:e.weather,
                        published:e.published }
                });
            hourly_forecasts.sort(function(a, b){ return (a.timestamp < b.timestamp)? -1:
                (a.timestamp > b.timestamp)? 1: 0;});


            let midday_timestamp = new Date(date).setHours(12);
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
            daily_forecasts.add({
                timestamp: date,
                period:24*60,
                weather: avg_day_weather,
                published: Date.now(),
                nestedForecast: nestedForecast
            });
        });

        dump("forecast_list len: "+daily_forecasts.length+"\n");
        this.callback(daily_forecasts)
    };
}
