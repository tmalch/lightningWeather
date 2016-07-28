

Cu.import("resource://SimpleStorage.js");
Cu.import("resource://WeatherViews.js");
Cu.import("resource://WeatherProvider.js");

params.document_ref = document;

function log(msg){
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
                lightningweather.views[key].view.addEventListener("viewloaded", lightningweather.viewloaded );
            }
        }

        lightningweather.forecastModule = new OpenWeathermapModule(2778067, lightningweather.updateForecast);
        lightningweather.forecastModule.requestForecast();
    },

    viewloaded: function(){
        dump("loaded view "+ currentView().type);
        let weather_mod = lightningweather.views[currentView().type];
        weather_mod.clear();

        if(lightningweather.forecast){
            weather_mod.annotate(lightningweather.forecast);
        }else{ // check storage
            lightningweather.storage.get(lightningweather.forecastModule.storeageId , function(forecast_data){
                if(forecast_data){
                    log("found forecast in Storage: ");
                    lightningweather.forecast = new Forecast(forecast_data);
                    weather_mod.annotate(lightningweather.forecast);
                }else{ // no forecast in object or storage -> request
                    log("No forecast in Storage! request new one");
                    lightningweather.forecastModule.requestForecast();
                }
            });
        }
    },

    updateForecast: function(forecast){
        if(!forecast){
            return;
        }
        lightningweather.storage.get(lightningweather.forecastModule.storeageId, function(existing_forecast_data) {
            if (existing_forecast_data) {
                forecast.combine(new Forecast(existing_forecast_data));
            }
            lightningweather.forecast = forecast;
            lightningweather.storage.set(lightningweather.forecastModule.storeageId, forecast, function(k){ log("saved forecast into DB")});
            let weather_mod = lightningweather.views[currentView().type];
            weather_mod.annotate(lightningweather.forecast);
        });
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





// returns if given view is currently visible in the gui
// viewname: "day-view" | "week-view" | "month-view"
function isViewVisible(viewname){
    document.getElementById(viewname).isVisible()
}


window.addEventListener("load", lightningweather.onLoad , false);
//window.setInterval(lightningweather.update, 10000);
//window.setInterval(teste, 6000);


function teste() {

    dump("teste\n");
    let c = currentView();

    let weather_box = document.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "spacer");
    weather_box.setAttribute("style", "background-color: #ffccff;");
    let tmp = c.endDate;
    let day_col = c.findColumnForDate(tmp);

    day_col.column.topbox.appendChild(weather_box);
    try {
        c.findColumnForDate(c.today()).column.topbox.setAttribute("style", "");
    } catch (ex) {
        // This dies if no view has even been chosen this session, but that's
        // ok because we'll just use now() below.
    }
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
