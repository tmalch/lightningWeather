Components.utils.import("resource://Forecast.js");
var EXPORTED_SYMBOLS = ['DarkSkyWeatherModule'];

DarkSkyWeatherModule.class = "darksky";

DarkSkyWeatherModule.prototype = Object.create(BaseProvider.prototype);

DarkSkyWeatherModule.prototype.parseForecast = function(http_response){
    try{
        let response = JSON.parse(http_response.responseText);
        let daily = response.daily.data || [];
        let daily_forecasts_data = daily.map(function(datapoint){

            log(0,"got forecast "+datapoint.icon+" for date "+new Date(datapoint.time*1000));
            return {
                timestamp: datapoint.timestamp*1000,
                period: 24*60,
                weather: {icon: datapoint.icon},
                published: Date.now()
            }
        });

        return new Forecast(daily_forecasts_data);
    }catch (e){
        log(1,e);
        return new Forecast();
    }
};

function DarkSkyWeatherModule(location, callback){
    BaseProvider.call(this, callback, location.tz);
    this.save_callback = callback;
    this.geoloc = location.geo;
    this.storeageId = DarkSkyWeatherModule.class+this.geoloc;
    this.tz = location.tz;
    let q = this.geoloc.latitude+","+this.geoloc.longitude;
    this.url = "https://api.darksky.net/forecast/064d091f681950f7512a771c6a0697f4/"+q+"?exclude=[currently,minutely,alerts,flags]";
}
