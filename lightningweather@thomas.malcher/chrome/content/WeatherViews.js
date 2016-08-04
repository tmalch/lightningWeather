
Components.utils.import("resource://calendar/modules/calUtils.jsm");

var EXPORTED_SYMBOLS = ['WeekViewWeatherModule', 'MonthViewWeatherModule', 'HourlyViewWeatherModule', "params"];

params = {
    document_ref: this
};

function log(msg){
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
    this.annotate = function(forecast){
        forecast.forEachFrom(cal.dateTimeToJsDate(self.view.startDate), function(elem){
            let mozDate = cal.jsDateToDateTime(new Date(elem.timestamp)).getInTimezone(self.view.timezone);
            mozDate.isDate = true;
            if(mozDate.compare(self.view.endDate) <= 0) { // mozDate < endDate
                self.setWeather(mozDate, elem.weather.icon);
            }
        });
    };
    this.clearWeather = function(mozdate){throw "NOT IMPLEMENTED"};
    this.setWeather = function(mozdate, icon){throw "NOT IMPLEMENTED"};
}


WeekViewWeatherModule.prototype = Object.create(ViewWeatherModule);
function WeekViewWeatherModule(view) {
    ViewWeatherModule.call(this, view);
    this.type = "week";


    this.setWeather = function(mozdate, icon){
        try {
            let day_col = this.view.findColumnForDate(mozdate);
            let orient = day_col.column.getAttribute("orient");
            let box = day_col.column.topbox;
            box.setAttribute("orient", orient);
            box.setAttribute("style", "background-image: url(\"" + icon + "\") !important; background-size: contain !important;");
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

HourlyViewWeatherModule.prototype = Object.create(ViewWeatherModule);
function HourlyViewWeatherModule(view) {
    ViewWeatherModule.call(this, view);
    this.type = "week";
    var self = this;

    this.getOrCreateWeatherBox = function(mozdate, day_col ){
        try{
            let weatherbox = params.document_ref.getAnonymousElementByAttribute(day_col,"anonid","weatherbox");
            if(weatherbox == undefined){
                weatherbox = params.document_ref.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "xul:box");
                let orient = day_col.getAttribute("orient");
                weatherbox.setAttribute("orient", orient);
                weatherbox.setAttribute("flex", "1");
                weatherbox.setAttribute("anonid", "weatherbox");
                //weatherbox.setAttribute("style", "background-color: rgba(255,0,0,0.3); background-image: url(\"http://openweathermap.org/img/w/02d.png\") !important; background-size: contain !important;");

                let stack = params.document_ref.getAnonymousElementByAttribute(day_col,"anonid","boxstack");
                stack.insertBefore(weatherbox, day_col.topbox);
            }
            return weatherbox
        }catch(ex){
            log("getOrCreateWeatherBox "+ex)
        }
    };

    this.makeBox = function(startMin, endMin, pixelsPerMinute, parent_orientation){
        if(endMin <= startMin) {
            return undefined;
        }
        let startPix = Math.round(startMin * pixelsPerMinute);
        let endPix   = Math.round(endMin * pixelsPerMinute);
        let durPix   = endPix - startPix;
        // calculate duration pixel as the difference between
        // start pixel and end pixel to avoid rounding errors.

        let box = params.document_ref.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "spacer");

        if (parent_orientation == "vertical") {
            box.setAttribute("orient", "vertical");
            box.setAttribute("height", durPix);
        } else {
            box.setAttribute("orient", "horizontal");
            box.setAttribute("width", durPix);
        }
        return box;
    };

    this.annotate = function(forecast){
        forecast.forEachFrom(cal.dateTimeToJsDate(self.view.mStartDate), function(elem){
            let mozdate = cal.jsDateToDateTime(new Date(elem.timestamp)).getInTimezone(self.view.timezone);
            mozdate.isDate = true;
            let day_entry = self.view.findColumnForDate(mozdate);
            if(!day_entry) {
                return;
            }
            let day_col = day_entry.column;
            let weatherbox = self.getOrCreateWeatherBox(mozdate, day_col);
            let orient = day_col.getAttribute("orient");
            if(elem.nestedForecast){
                self.clearWeatherBox(weatherbox);
                let curStartMin = day_col.mStartMin;
                elem.nestedForecast.sort();
                elem.nestedForecast.forEach(function (elem2){
                    let datetime = new Date(elem2.timestamp);
                    let mozdatetime = cal.jsDateToDateTime(datetime);
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

                    let box = self.makeBox(curStartMin, endMin, day_col.pixelsPerMinute, orient);
                    if(box){
                        let icon = elem2.weather.icon;
                        box.setAttribute("style", "background-image: url(\"" + icon + "\") !important; background-size: contain !important;");
                        //box.setAttribute("style", box.getAttribute("style")+"border: 2px solid red;");
                        weatherbox.appendChild(box);
                    }
                    curStartMin = endMin;
                });
            }else{
                let icon = elem.weather.icon;
                weatherbox.setAttribute("style", "background-image: url(\"" + icon + "\") !important; background-size: contain !important;");
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

MonthViewWeatherModule.prototype = Object.create(ViewWeatherModule);
function MonthViewWeatherModule(view) {
    ViewWeatherModule.call(this, view);
    this.type = "month";
    var self = this;

    this.setWeather = function(mozdate, icon){
        try {
            let day_box = self.view.findDayBoxForDate(mozdate);
            day_box.setAttribute("style", "background-image: url(\"" + icon  + "\") !important; background-size: contain !important;");
        }catch (ex){
            log(ex)
        };
    };
    this.clearWeather = function(mozdate){
        try {
            let day_box = self.view.findDayBoxForDate(mozdate);
            day_box.setAttribute("style", "");
        }catch (ex){};
    };
}
