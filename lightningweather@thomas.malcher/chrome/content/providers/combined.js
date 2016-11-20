
Components.utils.import("chrome://lightningweather/content/Forecast.js");

const XMLHttpRequest  = Components.Constructor("@mozilla.org/xmlextras/xmlhttprequest;1", "nsIXMLHttpRequest");

var EXPORTED_SYMBOLS = ['CombinedWeatherModule'];



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
        this.save_callback(combined_forecast)
    }
};

CombinedWeatherModule.class = "combined";
function CombinedWeatherModule(city, submodules, callback) {
    this.save_callback = callback;

    this.modules = submodules;
    this.city_id = city;
    this.storeageId = CombinedWeatherModule.class+this.city_id;
    this.forecast_cache = undefined;


    for(let module of this.modules){
        module.save_callback = this.dummycallback.bind(this, module);
    }
}


