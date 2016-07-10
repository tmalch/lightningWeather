

Cu.import("resource://SimpleStorage.js");
Cu.import("resource://WeatherViews.js");

function log(msg){
    dump(msg+"\n");
}


var lightningweather = {
    timezone: null,
    baseurl: "http://openweathermap.org/img/w/",
    views: null,
    storage: SimpleStorage.createCpsStyle("teste"),
    forecastModule: null,
    forecast: null,

    onLoad: function(){
        lightningweather.timezone = currentView().timezone;
        lightningweather.views = {  "day": new WeekViewWeatherModule(document.getElementById("day-view")),
                                    "week": new WeekViewWeatherModule(document.getElementById("week-view")),
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
            lightningweather.storage.get("forecast" , function(forecast_list){
                if(forecast_list){
                    log("found forecast in Storage: ");
                    lightningweather.forecast = new Forecast(forecast_list);
                    weather_mod.annotate(lightningweather.forecast);
                }else{ // no forecast in object or storage -> request
                    log("No forecast in Storage! request new one");
                    lightningweather.forecastModule.requestForecast();
                }
            });
        }

    },
    getMozDate: function (year, month, day){
        let d = cal.jsDateToDateTime(new Date(year,month,day)).getInTimezone(lightningweather.timezone);
        d.isDate = true;
        return d;
    },

    updateForecast: function(forecast_list){
        if(!forecast_list){
            return;
        }
        let forecast = new Forecast(forecast_list);
        lightningweather.storage.get("forecast" , function(existing_forecast) {
            if (existing_forecast) {
                forecast.combine(existing_forecast);
            }
            lightningweather.forecast = forecast;
            lightningweather.storage.set("forecast", forecast.data, function(k){ log("saved forecast into DB")});
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


function Forecast(data){

    this.data = data;

    Forecast.prototype.toString = function(){
        return "["+ this.data.reduce(function(s,e){ return s+e.timestamp+" "+e.icon+", "; },"")+"]";
    };

    Object.defineProperties(this, {
        "length": {"get": function() { return this.data.length; } }
    });

    this.combine = function(other){
        if(other instanceof Forecast){
            this.data = this.data.concat(other.data);
        }else{
            this.data = this.data.concat(other);
        }
        this.clean();
    };
    this.clean = function(){
        this.sort();
        this.data = this.data.filter(function (elem, i, array){
            if(i == 0)
                return true;
            let prev_elem = array[i-1];
            if(elem.range[1] <= prev_elem.range[1]){ // if elem is inside prev_elem discard
                return false
            }
        });
    };
    this.limitTo = function(start_timestamp,end_timestamp){
        this.sort();
        this.data = this.data.filter(function(elem){
            if(elem.range[0] < start_timestamp){
                return false;
            }
            if(elem.range[1] > end_timestamp){
                return false;
            }
            return true;
        })
    };
    // sort first by start timestamp, then reverse by end timestamp
    this.sort = function(){
        this.data.sort(function(a, b){
            if(a.range[0] < b.range[0]){
                return -1;
            }else if (a.range[0] > b.range[0]){
                return 1;
            }else {
                if(a.range[1] > b.range[1]){
                    return -1;
                }else if (a.range[1] < b.range[1]){
                    return 1;
                }else {
                    return 0;
                }
            }
        });
    }
}
function OpenWeathermapModule(city, callback) {
//http://api.openweathermap.org/data/2.5/forecast?id=2778067&APPID=c43ae0077ff0a3d68343555c23b97f5f
//http://api.openweathermap.org/data/2.5/weather?id=2778067&APPID=c43ae0077ff0a3d68343555c23b97f5f

    this.callback = callback;
    this.city_id = city;

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
            log("ERROR: "+event.currentTarget.responseText);
            return;
        }
        let list = response.list.map(function(elem){
            return {timestamp: elem.dt*1000,
                range: [elem.dt*1000, null],
                icon: elem.weather[0].icon,
                debugdate: elem.dt_txt
            }
        });
        let last_date = null;
        let forecast_list = [list[0]];
        for(var i=1;i<list.length;i++){
            let d = new Date(list[i].timestamp);
            let date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
            if(date > last_date && d.getHours() >= 12){
                forecast_list[forecast_list.length-1].range[1] = list[i].range[0];
                forecast_list.push(list[i]);
                last_date = date;
            }
        }
        forecast_list[forecast_list.length-1].range[1] = forecast_list[forecast_list.length-1].range[0];

        dump("forecast_list len: "+forecast_list.length+"\n");
        forecast_list.forEach(function(e){dump(e.debugdate+" "+e.icon+", ")});
        this.callback(forecast_list)
    };
}



// returns if given view is currently visible in the gui
// viewname: "day-view" | "week-view" | "month-view"
function isViewVisible(viewname){
    document.getElementById(viewname).isVisible()
}


window.addEventListener("load", lightningweather.onLoad , false);

window.setInterval(lightningweather.update, 60000);


function teste() {

    dump("teste\n")
    var c = currentView();
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

    document.getElementById("month-view").findDayBoxForDate(c.today()).setAttribute("style", "background-image: url(\""+lightningweather.baseurl+"01d.png"+"\") !important; background-size: contain !important;");
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
