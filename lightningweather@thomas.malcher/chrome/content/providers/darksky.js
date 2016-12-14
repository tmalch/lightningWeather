Components.utils.import("chrome://lightningweather/content/Forecast.js");

var EXPORTED_SYMBOLS = ['DarkSkyWeatherModule'];

DarkSkyWeatherModule.class = "darksky";
DarkSkyWeatherModule.copyright_info = "DarkSky provided by <label href='http://forecast.io' class='text-link' value='Forecast.io'/> <html:br/>" +
                                        "Icons by <label href='https://www.amcharts.com' class='text-link' value='amCharts'/>";

DarkSkyWeatherModule.prototype = Object.create(BaseProvider.prototype);

DarkSkyWeatherModule.prototype.parseForecast = function(http_response){
    try{
        let response = JSON.parse(http_response.responseText);
        let daily = response.daily.data || [];
        let hourly = response.hourly.data || [];
        log(0,"num hourly forecasts "+hourly.length);
        let hourly_forecasts_data = hourly.map(function(datapoint){
            log(0, "Iconname: "+ datapoint.icon);
            return {
                timestamp: datapoint.time*1000,
                period: 1*60,
                weather: {icon: "chrome://lightningweather/skin/darksky/"+datapoint.icon, temp: datapoint.temperature },
                published: Date.now()
            }
        });
        let daily_forecasts_data = daily.map(function(datapoint){
            let day_start_time = datapoint.time*1000;
            let day_end_time = (datapoint.time+24*60*60)*1000;
            let nestedForecast = new Forecast(hourly_forecasts_data.filter(p => (day_start_time <= p.timestamp && p.timestamp <= day_end_time)));
            log(0,"got forecast "+datapoint.icon+" for date "+new Date(datapoint.time*1000)+" with "+nestedForecast.length+" nested");
            return {
                timestamp: datapoint.time*1000,
                period: 24*60,
                weather: {icon: datapoint.icon, temp: (parseFloat(datapoint.temperatureMin)+parseFloat(datapoint.temperatureMax))/2 },
                published: Date.now(),
                nestedForecast: nestedForecast
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
    this.storeageId = DarkSkyWeatherModule.class+this.geoloc.latitude+this.geoloc.longitude;
    this.tz = location.tz;
    let q = this.geoloc.latitude+","+this.geoloc.longitude;
    this.url = "https://api.darksky.net/forecast/064d091f681950f7512a771c6a0697f4/"+q+"?exclude=[currently,minutely,alerts,flags]&units=ca";
}
