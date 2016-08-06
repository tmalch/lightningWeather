

Cu.import("resource://SimpleStorage.js");
Cu.import("resource://WeatherViews.js");
Cu.import("resource://WeatherProvider.js");

params.document_ref = document;

function log(level, msg){
    if(msg == undefined)
        dump(level+"\n");
    else if(level > 0)
        dump(msg+"\n");
}


var lightningweather = {
    views: null,
    storage: SimpleStorage.createCpsStyle("teste"),
    forecastModule: null,
    forecast: null,

    onLoad: function(){
        lightningweather.views = {  "day": new HourlyViewWeatherModule(document.getElementById("day-view")),
                                    "week": new HourlyViewWeatherModule(document.getElementById("week-view")),
                                    "month": new MonthViewWeatherModule(document.getElementById("month-view")),
                                    "multiweek": new MonthViewWeatherModule(document.getElementById("multiweek-view"))};
        for (var key in lightningweather.views) {
            if (lightningweather.views.hasOwnProperty(key)) {
                let weather_mod = lightningweather.views[key];
                weather_mod.view.addEventListener("viewloaded", lightningweather.viewloaded);
                weather_mod.view.viewBroadcaster.addEventListener(key + "viewresized", lightningweather.resizeHandler.bind(lightningweather, weather_mod));
            }
        }
        //lightningweather.forecastModule = new OpenWeathermapModule(2778067, lightningweather.updateForecast);
        let m = [new OpenWeathermapModule(2778067, lightningweather.updateForecast), new YahooWeatherModule("548536", lightningweather.updateForecast)];
        lightningweather.forecastModule = new CombinedWeatherModule("Graz", m,lightningweather.updateForecast);
        lightningweather.forecastModule.requestForecast();
    },

    resizeHandler: function(weather_mod){
        weather_mod.clear();
        if(lightningweather.forecast instanceof Forecast) {
            weather_mod.annotate(lightningweather.forecast);
        }else{
            log(1,"resizeHandler no forecast available");
        }
    },

    viewloaded: function(){
        dump("loaded view "+ currentView().type);
        let weather_mod = lightningweather.views[currentView().type];
        weather_mod.clear();

        if(lightningweather.forecast instanceof Forecast){
            weather_mod.annotate(lightningweather.forecast);
        }else{ // check storage
            lightningweather.storage.get(lightningweather.forecastModule.storeageId , function(forecast_data){
                if(forecast_data){
                    log(1,"found forecast in Storage "+forecast_data.length);
                    lightningweather.forecast = new Forecast(forecast_data);
                    weather_mod.annotate(lightningweather.forecast);
                }else{ // no forecast in object or storage -> request
                    log(1,"No forecast in Storage! request new one");
                    lightningweather.forecastModule.requestForecast();
                }
            });
        }
    },
    saveAndSet: function (forecast){
        lightningweather.forecast = forecast;
        lightningweather.storage.set(lightningweather.forecastModule.storeageId, forecast, function(k){ log(0,"saved forecast into DB")});
        let weather_mod = lightningweather.views[currentView().type];
        weather_mod.annotate(lightningweather.forecast);
    },
    updateForecast: function(forecast){

        if(!forecast){
            return;
        }
        if(lightningweather.forecast == null){
            lightningweather.storage.get(lightningweather.forecastModule.storeageId, function(existing_forecast_data) {
                if (existing_forecast_data) {
                    let existing_forecast = new Forecast(existing_forecast_data);

                    //log(0,"From storage "+existing_forecast.length+" daily with "+existing_forecast._data.reduce(function(s,e){ return s+new Date(e.timestamp)+" with "+e.nestedForecast.length+"\n "},"\n"))
                    //log(0,"From Request "+forecast.length+" daily with "+forecast._data.reduce(function(s,e){ return s+new Date(e.timestamp)+" with "+e.nestedForecast.length+"\n "},"\n"))

                    forecast.combine(existing_forecast );
                    //log(0,"combined forecasts "+forecast.length+" daily with "+forecast._data.reduce(function(s,e){ return s+new Date(e.timestamp)+" with "+e.nestedForecast.length+"\n "},"\n"))
                }
                lightningweather.saveAndSet(forecast);
            });
        }else{
            let existing_forecast = lightningweather.forecast;

            //log(0,"From storage "+existing_forecast.length+" daily with "+existing_forecast._data.reduce(function(s,e){ return s+new Date(e.timestamp)+" with "+e.nestedForecast.length+"\n "},"\n"))
            //log(0,"From Request "+forecast.length+" daily with "+forecast._data.reduce(function(s,e){ return s+new Date(e.timestamp)+" with "+e.nestedForecast.length+"\n "},"\n"))
            forecast.combine(existing_forecast );
            //log(0,"combined forecasts "+forecast.length+" daily with "+forecast._data.reduce(function(s,e){ return s+new Date(e.timestamp)+" with "+e.nestedForecast.length+"\n "},"\n"))

            lightningweather.saveAndSet(forecast);
        }
    },

    update: function(){
        if(!lightningweather.forecastModule){
            lightningweather.onLoad();
        }
        if(lightningweather.forecastModule){
            lightningweather.forecastModule.requestForecast();
        }
    }
};


window.addEventListener("load", lightningweather.onLoad , false);
window.setInterval(lightningweather.update, 10000);

//window.addEventListener("load", teste , false);
//window.setInterval(teste, 6000);


function teste() {

    dump("teste\n");
    let c = currentView();

    let test_box = document.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "xul:box");
    test_box.setAttribute("style", "background-color: rgba(255,0,0,0.3); background-image: url(\"http://openweathermap.org/img/w/02d.png\") !important; background-size: contain !important;");
    test_box.setAttribute("anonid", "weatherbox");
    let day_col = c.findColumnForDate(c.today()).column;
    //day_col.column.appendChild(test_box);

    let w = document.getElementById("week-view");
    let stack = document.getAnonymousElementByAttribute(day_col,"anonid","boxstack");
    stack.setAttribute("class", "supertollescss2");
    let weatherbox = document.getAnonymousElementByAttribute(day_col,"anonid","weatherbox");
    log(weatherbox);
    if(weatherbox == undefined)
        stack.insertBefore(test_box, day_col.topbox);

    document.getElementById("week-view").viewBroadcaster.addEventListener("weekviewresized", function(e){ log("RESIZED2");}, true);
//    day_col.column.topbox.appendChild(test_box);

//    c.findColumnForDate(c.today()).column.relayout();
    //currentView().addEventListener("viewloaded", function(e){ dump("CURRENT\n"); dump(this)});
    //currentView().addEventListener("dayselect", function(e){ dump(e+"\n")});


    document.getElementById("day-view").addEventListener("viewloaded", function(e){ dump("DAYVIEW\n"); dump(this)});
    document.getElementById("week-view").addEventListener("viewloaded", function(e){ dump("WEEKVIEW\n"); dump(this)});
    document.getElementById("multiweek-view").addEventListener("viewloaded", function(e){ dump("MULTIWEEKVIEW\n"); dump(this)});
    document.getElementById("month-view").addEventListener("viewloaded", function(e){ dump("MONTH\n"); dump(this)});

	//var daybox = document.getElementById("week-view");
	//var today_col = daybox.findColumnForDate(daybox.today());
	//today_col.header.setAttribute("class", "supertollescss2");
    ////ss.set("testkey","teste", function (val) {});
    //
    //let cols = document.getElementById("week-view").mDateColumns;
	//for(var i=0;i<cols.length;i++){
	//	if(cols[i].date != daybox.today()){
	//		var box = document.getAnonymousElementByAttribute(cols[i].column,"anonid","topbox");
	//		//box.setAttribute("class", "supertollescss");
	//  }
	//}
}
