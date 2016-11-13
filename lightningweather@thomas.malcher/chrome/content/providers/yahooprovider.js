
Components.utils.import("resource://Forecast.js");

const XMLHttpRequest  = Components.Constructor("@mozilla.org/xmlextras/xmlhttprequest;1", "nsIXMLHttpRequest");
Components.utils.import("resource://calendar/modules/calUtils.jsm");

var EXPORTED_SYMBOLS = ['YahooWeatherModule'];


YahooWeatherModule.class = "yahoo";
YahooWeatherModule.prototype = Object.create(BaseProvider.prototype);

YahooWeatherModule.prototype.parseForecast = function(http_response){
    let self = this;
    try{
        var response = JSON.parse(http_response.responseText);
        if(response.error != undefined){
            log(1,"ERROR: "+response.error);
            return new Forecast();
        }
        let results = response.query.results || [];
        log(0, JSON.stringify(results));
        let daily_forecasts_data = results.channel.map(function(elem){
            let forecast_elem = elem.item.forecast;
            let date = cal.jsDateToDateTime(new Date(forecast_elem.date), self.tz);
            date.isDate = true;
            return {date: date,
                timestamp: date.nativeTime/1000,
                period:24*60,
                weather:{text:forecast_elem.text, icon: "https://s.yimg.com/zz/combo?a/i/us/nws/weather/gr/"+forecast_elem.code+"d.png",
                            temp:(parseInt(forecast_elem.high)+parseInt(forecast_elem.low))/2 },
                published: Date.now()}
        });
        return new Forecast(daily_forecasts_data);
    }catch (e){
        log(1,e);
        return new Forecast();
    }
};

function YahooWeatherModule(location, callback) {
    BaseProvider.call(this, callback, location.tz);
    this.save_callback = callback;
    this.city_woeid = location.id;
    this.icon_baseurl = "https://query.yahooapis.com/v1/public/yql";
    this.storeageId = YahooWeatherModule.class+this.city_woeid;
    let q = "?q=select item.forecast from weather.forecast where woeid = \""+this.city_woeid+"\" and u = \"c\"&format=json";
    this.url = this.icon_baseurl+q;
    log(0, this.url)
}
