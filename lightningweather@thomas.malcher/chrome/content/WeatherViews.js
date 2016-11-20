
Components.utils.import("resource://calendar/modules/calUtils.jsm");

var EXPORTED_SYMBOLS = ['WeekViewWeatherModule', 'MonthViewWeatherModule', 'HourlyViewWeatherModule', "params"];

var params = {
    document_ref: this
};

function log(level, msg){
    if(arguments.length == 1)
        dump(arguments[0]+"\n");
    else if(level >= 1)
        dump(msg+"\n");
}



function ViewWeatherModule(view) {
    this.view = view;
    var self = this;

    this.clear = function(){
        let date_list = this.view.getDateList({});
        date_list.forEach(function (dt){
            self.clearWeather(dt);
        });
    };
    this.annotate = function(forecast, tz){
        let local_startDate = self.view.mStartDate.clone();
        local_startDate.timezone = tz;
        log(1, "show "+forecast.length+" Forecasts from date: "+local_startDate);
        forecast.forEachFrom(local_startDate.nativeTime/1000, function(elem){
            let mozDate = cal.jsDateToDateTime(new Date(elem.timestamp)).getInTimezone(tz/*self.view.timezone*/);
            mozDate.isDate = true;
            if(mozDate.compare(self.view.endDate) <= 0) { // mozDate < endDate
                log(0, "render forecast for "+mozDate);
                self.setWeather(mozDate, elem.weather);
            }
        });
    };
    this.clearWeather = function(mozdate){throw "NOT IMPLEMENTED"};
    this.setWeather = function(mozdate, weather){throw "NOT IMPLEMENTED"};
}

WeekViewWeatherModule.prototype = Object.create(ViewWeatherModule);
/*** can be used for Day and WeekView can only show one Icon for the whole day
 *
 * @param view
 * @constructor
 */
function WeekViewWeatherModule(view) {
    ViewWeatherModule.call(this, view);

    this.setWeather = function(mozdate, weather){
        try {
            let day_col = this.view.findColumnForDate(mozdate);
            let orient = day_col.column.getAttribute("orient");
            let box = day_col.column.topbox;
            box.setAttribute("orient", orient);
            box.setAttribute("style", "opacity: 0.4; background-image: url(" + weather.icon + ") !important; background-size: contain !important;");
        }catch (ex){
            log("setWeather: "+ex);
        }
    };
    this.clearWeather = function(mozdate){
        try {
            let day_col = this.view.findColumnForDate(mozdate);
            let box = day_col.column.topbox;
            box.setAttribute("style", "");
        }catch (ex){
            log("clearWeather: "+ex);
        }
    };
}

HourlyViewWeatherModule.prototype = Object.create(ViewWeatherModule.prototype);
HourlyViewWeatherModule.prototype.getOrCreateWeatherBox = function(mozdate, day_col ){
    try{
        let weatherbox = params.document_ref.getAnonymousElementByAttribute(day_col,"anonid","weatherbox");
        if(weatherbox == undefined){
            weatherbox = params.document_ref.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "xul:box");
            let orient = day_col.getAttribute("orient");
            weatherbox.setAttribute("orient", orient);
            weatherbox.setAttribute("flex", "1");
            weatherbox.setAttribute("anonid", "weatherbox");

            let stack = params.document_ref.getAnonymousElementByAttribute(day_col,"anonid","boxstack");
            stack.insertBefore(weatherbox, day_col.topbox);
        }
        return weatherbox
    }catch(ex){
        log("getOrCreateWeatherBox "+ex)
    }
};
function HourlyViewWeatherModule(view) {
    ViewWeatherModule.call(this, view);
    var self = this;
    this.makeBox = function(startMin, endMin, pixelsPerMinute, parent_orientation){
        if(endMin <= startMin) {
            return undefined;
        }
        let startPix = Math.round(startMin * pixelsPerMinute);
        let endPix   = Math.round(endMin * pixelsPerMinute);
        let durPix   = endPix - startPix;
        // calculate duration pixel as the difference between
        // start pixel and end pixel to avoid rounding errors.

        let box = params.document_ref.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "box");
        if (parent_orientation == "vertical") {
            box.setAttribute("orient", "vertical");
            box.setAttribute("height", durPix);
            box.setAttribute("width", "100%");
        } else {
            box.setAttribute("orient", "horizontal");
            box.setAttribute("width", durPix);
        }

        return box;
    };

    this.annotate = function(forecast, tz){
        let local_startDate = self.view.mStartDate.clone();
        local_startDate.timezone = tz;
        log(1, "show "+forecast.length+" Forecasts from date: "+local_startDate);
        var base_style = "opacity: 0.4; background-size: contain; background-repeat: repeat-y; background-position: right center; ";
        forecast.forEachFrom(local_startDate.nativeTime/1000, function(elem){
            let mozdate = cal.jsDateToDateTime(new Date(elem.timestamp)).getInTimezone(tz); /*self.view.timezone*/
            mozdate.isDate = true;
            let day_entry = self.view.findColumnForDate(mozdate);
            if(!day_entry) {
                return;
            }
            let day_col = day_entry.column;
            let weatherbox = self.getOrCreateWeatherBox(mozdate, day_col);
            let orient = day_col.getAttribute("orient");
            log(0, "render forecast for "+mozdate);
            if(elem.nestedForecast){
                self.clearWeatherBox(weatherbox);
                let curStartMin = day_col.mStartMin;
                elem.nestedForecast.sort();
                elem.nestedForecast.forEach(function (elem2){
                    let mozdatetime = cal.jsDateToDateTime(new Date(elem2.timestamp)).getInTimezone(tz);/*self.view.timezone*/
                    log(0, "render nested forecast for "+ mozdatetime);
                    let startMin = mozdatetime.hour*60+mozdatetime.minute;
                    let endMin = startMin+elem2.period;

                    if(curStartMin < startMin){
                        let b = self.makeBox(curStartMin, startMin, day_col.pixelsPerMinute, orient); // insert a filling box
                        weatherbox.appendChild(b);
                        curStartMin = startMin;
                    }
                    if(endMin > day_col.mEndMin){
                        endMin = day_col.mEndMin
                    }
                    if (endMin <= curStartMin){
                        return;
                    }
                    let box = self.makeBox(curStartMin, endMin, day_col.pixelsPerMinute, orient);
                    if(box){
                        let icon = elem2.weather.icon;
                        box.setAttribute("style", base_style+"background-image: url(" + icon + ") !important; ");
                        box.setAttribute("style", box.getAttribute("style")+"border: 2px solid red;");
                        let l = params.document_ref.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "description");
                        l.setAttribute('value',Math.round(elem2.weather.temp)+"C");
                        box.appendChild(l);
                        weatherbox.appendChild(box);
                        curStartMin = endMin;
                    }
                });
            }else{
                let icon = elem.weather.icon;
                weatherbox.setAttribute("style", base_style+"background-image: url(" + icon + ") !important;");
                let l = params.document_ref.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "description");
                l.setAttribute('value',Math.round(elem.weather.temp)+"C");
                weatherbox.appendChild(l);
            }
        });
    };

    this.clearWeatherBox = function(box){
        while (box.firstChild) {
            box.removeChild(box.firstChild);
        }
    };

    this.clearWeather = function(mozdate){
        try {
            let day_entry = self.view.findColumnForDate(mozdate);
            if (!day_entry) {
                return;
            }
            let day_col = day_entry.column;

            let wbox = this.getOrCreateWeatherBox(mozdate, day_col);
            if (wbox) {
                this.clearWeatherBox(wbox);
                wbox.setAttribute("style", "");
            }
        } catch(ex){
            log("clearWeather: "+ex)
        }
    };
}

MonthViewWeatherModule.prototype = Object.create(ViewWeatherModule.prototype);


function MonthViewWeatherModule(view) {
    ViewWeatherModule.call(this, view);
    var self = this;

    this.setWeather = function(mozdate, weather){
        try {
            let day_box = self.view.findDayBoxForDate(mozdate);

            day_box.setAttribute("style", "opacity: 0.4; background-image: url(" + weather.icon  + ") !important; background-size: contain !important;");
            //let l = params.document_ref.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "description");
            //l.setAttribute('value',Math.round(weather.temp)+"C");
            //day_box.appendChild(l);
        }catch (ex){
            log(ex)
        }
    };
    this.clearWeather = function(mozdate){
        try {
            let day_box = self.view.findDayBoxForDate(mozdate);
            day_box.setAttribute("style", "");
        }catch (ex){}
    };
}
