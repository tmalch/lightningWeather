
Components.utils.import("resource://Forecast.js");

const XMLHttpRequest  = Components.Constructor("@mozilla.org/xmlextras/xmlhttprequest;1", "nsIXMLHttpRequest");

var EXPORTED_SYMBOLS = ['OpenWeathermapModule'];


OpenWeathermapModule.class = "openweather";

OpenWeathermapModule.prototype = Object.create(BaseProvider.prototype);

OpenWeathermapModule.prototype.parseForecast = function(http_response) {
    let self = this;
    try{
        var response = JSON.parse(http_response.responseText);
        if(response.cod != 200 || !Array.isArray(response.list)){
            log(1,"ERROR: "+http_response.responseText);
            return new Forecast();
        }
    }catch (e) {
        log(1,"ERROR: "+e);
        return new Forecast();
    }

    let list = response.list.map(function(elem){
        let datetime = new Date(elem.dt*1000);
        return {
            timestamp: elem.dt*1000,
            period: 3*60,
            weather: {icon: self.icon_baseurl+elem.weather[0].icon+ ".png"},
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
    return new Forecast(daily_forecasts_data);
};

function OpenWeathermapModule(city, callback) {
//http://api.openweathermap.org/data/2.5/forecast?id=2778067&APPID=c43ae0077ff0a3d68343555c23b97f5f
//http://api.openweathermap.org/data/2.5/weather?id=2778067&APPID=c43ae0077ff0a3d68343555c23b97f5f
    BaseProvider.call(this, callback, city.tz);
    this.location = city.geo;
    this.icon_baseurl = "http://openweathermap.org/img/w/";
    this.storeageId = OpenWeathermapModule.class+this.location.latitude+this.location.longitude;
    this.url = "http://api.openweathermap.org/data/2.5/forecast?lat="+this.location.latitude+"&lon="+this.location.longitude+"&APPID=c43ae0077ff0a3d68343555c23b97f5f";
}


/*
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
            log(0,"city not found "+response);
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
*/