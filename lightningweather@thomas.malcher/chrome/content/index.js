

Cu.import("resource://SimpleStorage.js");

function log(msg){
    dump(msg+"\n");
}

var lightningweather = {
    timezone: null,
    baseurl: "http://openweathermap.org/img/w/",
    views: null,
    storage: SimpleStorage.createCpsStyle("teste"),
    forecastModule: null,

    onLoad: function(){
        lightningweather.view = document.getElementById("week-view");
        lightningweather.timezone = lightningweather.view.timezone;
        lightningweather.views = {  "day": new WeekViewWeatherModule(document.getElementById("day-view")),
                                    "week": new WeekViewWeatherModule(document.getElementById("week-view")),
                                    "month": new MonthViewWeatherModule(document.getElementById("month-view")),
                                    "multiweek": new MonthViewWeatherModule(document.getElementById("multiweek-view"))};
        log("going to register event handler");
        for (var key in lightningweather.views) {
            if (lightningweather.views.hasOwnProperty(key)) {
                lightningweather.views[key].view.addEventListener("viewloaded", lightningweather.viewloaded );
            }
        }
        log("registered event handler");
        lightningweather.forecastModule = new OpenWeathermapModule(2778067, lightningweather.updateWeather);
        lightningweather.forecastModule.requestForecast();
    },

    viewloaded: function(){
        dump("loaded view "+ currentView().type);
        let weather_mod = lightningweather.views[currentView().type];
        log(weather_mod.constructor.name);
        log(weather_mod.prototype.constructor.name);
        weather_mod.clear();

        lightningweather.storage.get("forecast" , function(forecast){
            if(forecast){
                forecast.forEach(function(e){dump(e.debugdate+" "+e.icon+", ")});
                log("found forecast in Storage:");
                weather_mod.annotate(forecast);
            }else{
                log("No forecast in Storage! request new one");
                lightningweather.forecastModule.requestForecast();
            }
        });
    },
    getMozDate: function (year, month, day){
        let d = cal.jsDateToDateTime(new Date(year,month,day)).getInTimezone(lightningweather.timezone);
        d.isDate = true;
        return d;
    },

    updateWeather: function(forecast){
        if(!forecast){
            return;
        }
        lightningweather.storage.set("forecast", forecast, function(k){ log("saved forecast into DB")});
        let weather_mod = lightningweather.views[currentView().type];
        weather_mod.annotate(forecast);
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
function ViewWeatherModule(view) {
    this.view = view;
    var self = this;
    this.clear = function(){
        let date_list = this.view.getDateList({});

        date_list.forEach(function (dt){
            self.clearWeather(dt);
        });
    };
    this.annotate = function(forecast){
        log("annotate "+forecast);
        forecast.forEach(function(elem){
            let date = new Date(elem.timestamp);
            let mozDate = lightningweather.getMozDate(date.getFullYear(), date.getMonth(), date.getDate());
            log("set "+elem.icon+" for "+date);
            self.setWeather(mozDate, elem.icon);
        });
    };
    this.clearWeather = function(date){throw "NOT IMPLEMENTED"};
    this.setWeather = function(date, icon){throw "NOT IMPLEMENTED"};
}

WeekViewWeatherModule.prototype = Object.create(ViewWeatherModule);
function WeekViewWeatherModule(view) {
    this.type = "week";
    ViewWeatherModule.bind(this)(view);

    this.setWeather = function(date, icon){
        try {
            let date_col = this.view.findColumnForDate(date);
            let box = date_col.column.topbox;
            box.setAttribute("style", "background-image: url(\"" + lightningweather.baseurl + icon + ".png" + "\") !important; background-size: contain !important;");
        }catch (ex){};
    };
    this.clearWeather = function(date){
        try {
            let date_col = this.view.findColumnForDate(date);
            let box = date_col.column.topbox;
            box.setAttribute("style", "");
        }catch (ex){};
    };

}

MonthViewWeatherModule.prototype = Object.create(ViewWeatherModule);
function MonthViewWeatherModule(view) {
    this.type = "month";
    ViewWeatherModule.bind(this)(view);

    this.setWeather = function(date, icon){
        try {
            let date_box = this.view.findDayBoxForDate(date);
            date_box.setAttribute("style", "background-image: url(\"" + lightningweather.baseurl + icon + ".png" + "\") !important; background-size: contain !important;");
        }catch (ex){
            log(ex)
        };
    };
    this.clearWeather = function(date){
        try {
            let date_box = this.view.findDayBoxForDate(date);
            date_box.setAttribute("style", "");
        }catch (ex){};
    };
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
                    icon: elem.weather[0].icon,
                    debugdate: elem.dt_txt
                    }
        });
        let last_date = null;
        let forecat_list = [];
        for(var i=0;i<list.length;i++){
            let d = new Date(list[i].timestamp);
            let date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
            if(date > last_date && d.getHours() >= 12){
                forecat_list.push(list[i]);
                last_date = date;
            }
        }
        dump("forecat_list len: "+forecat_list.length+"\n");
        forecat_list.forEach(function(e){dump(e.debugdate+" "+e.icon+", ")});
        this.callback(forecat_list)
    };
}


// returns if given view is currently visible in the gui
// viewname: "day-view" | "week-view" | "month-view"
function isViewVisible(viewname){
    document.getElementById(viewname).isVisible()
}


window.addEventListener("load", lightningweather.onLoad , false);

window.setTimeout(lightningweather.update, 3000);



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
