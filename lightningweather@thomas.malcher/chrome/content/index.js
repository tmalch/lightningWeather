Cu.import("resource://SimpleStorage.js");
Cu.import("resource://WeatherViews.js");
var weatherProviders = {};
Components.utils.import("resource://WeatherProvider.js", weatherProviders);
var Forecast = weatherProviders.Forecast;

// reference to the document used by WeatherViews
params.document_ref = document;

function log(level, msg) {
    if (arguments.length == 1)
        dump(arguments[0] + "\n");
    else if (level >= 0)
        dump(msg + "\n");
}


var lightningweather = {
    views: null,
    storage: SimpleStorage.createCpsStyle("teste"),
    forecastModule: null,
    forecast: null,
    prefs: Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.lightningweather."),

    prefObserver: {
        observe: function (subject, topic, data) {
            log(0, "subject: " + subject + " topic: " + topic + " pref: " + data);
            if (topic != "nsPref:changed") return;
            if (data == "provider") { // if user selected a new Provider
                let provider_instance_description = JSON.parse(lightningweather.prefs.getCharPref("provider"));
                if (provider_instance_description) {
                    lightningweather.forecastModule = lightningweather.createForecastModule(provider_instance_description.provider_name, provider_instance_description.city_id);
                    lightningweather.forecast = null;
                    log(0, "Prefs Use WeatherModule: " + provider_instance_description.provider_name + " " + provider_instance_description.city_id);
                    //\\ get or load and request
                    lightningweather.updateCurrentView();
                }
            }
        }
    },
    createForecastModule: function (provider_name, city_id) {
        for (let provider in weatherProviders) {
            if (weatherProviders.hasOwnProperty(provider) && weatherProviders[provider].class == provider_name) {
                // use mergeForecast as save_callback for requestForecast
                return new weatherProviders[provider](city_id, lightningweather.mergeForecast);
            }
        }
        return undefined;
    },
    onLoad: function () {
        lightningweather.prefs.addObserver("", lightningweather.prefObserver, false);

        lightningweather.views = {
            "day": new HourlyViewWeatherModule(document.getElementById("day-view")),
            "week": new HourlyViewWeatherModule(document.getElementById("week-view")),
            "month": new MonthViewWeatherModule(document.getElementById("month-view")),
            "multiweek": new MonthViewWeatherModule(document.getElementById("multiweek-view"))
        };
        for (var key in lightningweather.views) {
            if (lightningweather.views.hasOwnProperty(key)) {
                let weather_mod = lightningweather.views[key];
                weather_mod.view.addEventListener("viewloaded", lightningweather.onViewLoaded);
                weather_mod.view.viewBroadcaster.addEventListener(key + "viewresized", lightningweather.onResize.bind(lightningweather, weather_mod));
            }
        }

        try {
            let provider_instance_description = JSON.parse(lightningweather.prefs.getCharPref("provider"));
            lightningweather.forecastModule = lightningweather.createForecastModule(provider_instance_description.provider_name, provider_instance_description.city_id);
            log(0, "Init Use ForecastModule: " + provider_instance_description.provider_name + " " + provider_instance_description.city_id);
        } catch (e) {
            log(0, "Error in reading Preferences: use default hardcoded ForecastModule: yahoo 548536");
            lightningweather.forecastModule = lightningweather.createForecastModule("yahoo", "548536");
        }

        //\\ get or load and request
        lightningweather.updateCurrentView();
    },

    onViewLoaded: function () {
        log(1, "loaded view " + currentView().type);
        lightningweather.updateCurrentView()
    },

    onResize: function (weather_mod) {
        log(1, "resize view " + weather_mod.view.type);
        weather_mod.clear();
        lightningweather.updateCurrentView();
    },

    updateCurrentView: function(){
        let weather_mod = lightningweather.views[currentView().type];
        weather_mod.clear();
        if (lightningweather.forecast instanceof Forecast) {
            weather_mod.annotate(lightningweather.forecast);
            lightningweather.tryUpdateForecast();
        } else {
            log(1, "updateCurrentView: no forecast available -> try to load");
            lightningweather.loadForecast();
        }
    },
    loadForecast: function(){
        lightningweather.storage.get(lightningweather.forecastModule.storeageId, function (forecast_data) {
            if (forecast_data) {
                log(0, "found forecast in Storage " + forecast_data.length);
                lightningweather.forecast = new Forecast(forecast_data);
            } else { // no forecast in object or storage -> request
                log(0, "No forecast in Storage!");
                lightningweather.forecast = new Forecast();
            }
            lightningweather.updateCurrentView();
        });
    },
    /***
     * merge given Forecast with possibly existing Forecast
     * @param forecast
     */
    mergeForecast: function (forecast) {
        if (!forecast) {
            return;  // failed
        }
        if (lightningweather.forecast instanceof Forecast) {
            forecast.combine(lightningweather.forecast);
            lightningweather.forecast = forecast;
            lightningweather.saveForecast();
        } else { // check storage
            lightningweather.storage.get(lightningweather.forecastModule.storeageId, function (forecast_data) {
                if (forecast_data) {
                    log(0, "found forecast in Storage " + forecast_data.length);
                    let existing_forecast = new Forecast(forecast_data);

                } else { // no forecast in object or storage -> request
                    log(0, "No forecast in Storage!");
                    let existing_forecast = new Forecast();
                }
                forecast.combine(lightningweather.forecast);
                lightningweather.forecast = forecast;
                lightningweather.saveForecast();
            });
        }
    },
    saveForecast: function(){
        lightningweather.storage.set(lightningweather.forecastModule.storeageId, lightningweather.forecast, function (k) {
            log(0, "saved forecast into DB")
        });
    },
    /**
     * request an update of the Forecast
     */
    tryUpdateForecast: function () {
        log(0,"try to Update Forecast");
        if (!lightningweather.forecastModule) {
            lightningweather.onLoad();
        }
        if (lightningweather.forecastModule) {
            if (!(lightningweather.forecast instanceof Forecast) || lightningweather.forecast.age() < Date.now()-15*1000){ // after 5 minutes the Forecast is too old
                lightningweather.forecastModule.requestForecast();
            }
        }
    }
};



window.addEventListener("load", lightningweather.onLoad, false);

//window.addEventListener("load", teste , false);
//window.setInterval(teste, 6000);

Components.utils.import("resource://calendar/modules/calUtils.jsm");

function teste() {

    dump("teste\n");
    let c = currentView();

    let f = function ({a: a="Hallo", b: b="welt" } = {}, c){
        log(a+b+c);
    };
    f();
    f({}, "cc");
    f({a : "blub "}, 6);


    let mozDate = cal.jsDateToDateTime(new Date(1477399460*1000));
    log(mozDate);
    log(mozDate.hour);

    mozDate = cal.jsDateToDateTime(new Date(1477399460*1000)).getInTimezone(c.timezone);
    log(mozDate);
    log(mozDate.hour);

    let test_box = document.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "xul:box");
    test_box.setAttribute("style", "background-color: rgba(255,0,0,0.3); background-image: url(\"http://openweathermap.org/img/w/02d.png\") !important; background-size: contain !important;");
    test_box.setAttribute("anonid", "weatherbox");
    let day_col = c.findColumnForDate(c.today()).column;
    //day_col.column.appendChild(test_box);

    let w = document.getElementById("week-view");
    let stack = document.getAnonymousElementByAttribute(day_col, "anonid", "boxstack");
    stack.setAttribute("class", "supertollescss2");
    let weatherbox = document.getAnonymousElementByAttribute(day_col, "anonid", "weatherbox");
    log(weatherbox);
    if (weatherbox == undefined)
        stack.insertBefore(test_box, day_col.topbox);

    document.getElementById("week-view").viewBroadcaster.addEventListener("weekviewresized", function (e) {
        log("RESIZED2");
    }, true);
//    day_col.column.topbox.appendChild(test_box);

//    c.findColumnForDate(c.today()).column.relayout();
    //currentView().addEventListener("viewloaded", function(e){ dump("CURRENT\n"); dump(this)});
    //currentView().addEventListener("dayselect", function(e){ dump(e+"\n")});


    document.getElementById("day-view").addEventListener("viewloaded", function (e) {
        dump("DAYVIEW\n");
        dump(this)
    });
    document.getElementById("week-view").addEventListener("viewloaded", function (e) {
        dump("WEEKVIEW\n");
        dump(this)
    });
    document.getElementById("multiweek-view").addEventListener("viewloaded", function (e) {
        dump("MULTIWEEKVIEW\n");
        dump(this)
    });
    document.getElementById("month-view").addEventListener("viewloaded", function (e) {
        dump("MONTH\n");
        dump(this)
    });

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
