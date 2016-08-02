
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
        log(forecast.length+"annotate "+forecast);

        forecast.forEachFrom(cal.dateTimeToJsDate(self.view.startDate), function(elem){
            let mozDate = cal.jsDateToDateTime(new Date(elem.timestamp)).getInTimezone(self.view.timezone);
            mozDate.isDate = true;
            if(mozDate.compare(self.view.endDate) <= 0) { // mozDate < endDate
                log("set " + elem.weather.icon + " for " + mozDate);
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
            log("setWeather:"+ex);
        }
    };
    this.clearWeather = function(mozdate){
        try {
            let day_col = this.view.findColumnForDate(mozdate);
            let box = day_col.column.topbox;
            box.setAttribute("style", "");
        }catch (ex){
            log("clearWeather:"+ex);
        }
    };
}

HourlyViewWeatherModule.prototype = Object.create(ViewWeatherModule);
function HourlyViewWeatherModule(view) {
    ViewWeatherModule.call(this, view);
    this.type = "week";
    var self = this;

    this.createWeatherBox = function(col, startMin, dur){
        if (startMin < col.mStartMin) {
            dur = dur - (col.mStartMin - startMin);
            startMin = col.mStartMin;
        }
        if(startMin + dur > col.mEndMin){
            log("too late "+startMin+" "+ dur);
            if(startMin > col.mEndMin)
                return null;
            dur = col.mEndMin-startMin;
        }

        let weather_box = params.document_ref.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "spacer");

        // calculate duration pixel as the difference between
        // start pixel and end pixel to avoid rounding errors.
        let startPix = Math.round(startMin * col.pixelsPerMinute);
        let endPix   = Math.round((startMin + dur) * col.pixelsPerMinute);
        let durPix   = endPix - startPix;
        durPix = durPix - 10;
        let orient = col.topbox.getAttribute("orient");

        weather_box.setAttribute("class","calendar-event-column-linebox");
        if (orient == "vertical") {
            weather_box.setAttribute("orient", "vertical");
            weather_box.setAttribute("height", durPix);
        } else {
            weather_box.setAttribute("orient", "horizontal");
            weather_box.setAttribute("width", durPix);
        }
        return weather_box;
    };

    this.annotate = function(forecast){
        forecast.forEachFrom(cal.dateTimeToJsDate(this.view.mStartDate), function(elem){
            let mozdate = cal.jsDateToDateTime(new Date(elem.timestamp)).getInTimezone(self.view.timezone);
            mozdate.isDate = true;
            self.clearWeather(mozdate);
            let day_col = self.view.findColumnForDate(mozdate);
            let topbox = day_col.column.topbox;
            let orient = day_col.column.getAttribute("orient");
            day_col.column.topbox.setAttribute("orient", orient);
            if(elem.nestedForecast){
                elem.nestedForecast.forEach(function (elem2){
                    let datetime = new Date(elem2.timestamp);
                    let startMin = datetime.getHours()*60+datetime.getMinutes();
                    let wbox = self.createWeatherBox(day_col.column, startMin, elem2.period);
                    let icon = elem2.weather.icon;
                    wbox.setAttribute("style", "min-width: 1px; min-height: 1px; border: 5px solid red; background-image: url(\"" + icon + "\") !important; background-size: contain !important;");
                    day_col.column.topbox.appendChild(wbox);
                });
            }else{
                let icon = elem.weather.icon;
                topbox.setAttribute("style", "background-image: url(\"" + icon + "\") !important; background-size: contain !important;");
            }
        });
    };

    //this.createWeatherBoxes = function(col, dur){
    //    log("createWeatherBoxes ");
    //    let orient = col.getAttribute("orient");
    //    let res = [];
    //    let theMin = col.mStartMin;
    //    while (theMin < col.mEndMin) {
    //        if(theMin + dur > col.mEndMin){
    //            dur = col.mEndMin-theMin;
    //        }
    //        let weather_box = createXULElement("spacer");
    //
    //        // calculate duration pixel as the difference between
    //        // start pixel and end pixel to avoid rounding errors.
    //        let startPix = Math.round(theMin * col.pixelsPerMinute);
    //        let endPix   = Math.round((theMin + dur) * col.pixelsPerMinute);
    //        let durPix   = endPix - startPix;
    //        if (orient == "vertical")
    //            weather_box.setAttribute("height", durPix);
    //        else
    //            weather_box.setAttribute("width", durPix);
    //        weather_box.setAttribute("style", "min-width: 1px; min-height: 1px; background-color: #000f00 !important;");
    //        res.push(weather_box);
    //        theMin += dur;
    //    }
    //    log("createWeatherBoxes DONE");
    //    return res;
    //};

    this.clearWeather = function(date){
        try {
            let date_col = this.view.findColumnForDate(date);
            let box = date_col.column.topbox;
            while (date_col.column.topbox.firstChild) {
                date_col.column.topbox.removeChild(date_col.column.topbox.firstChild);
                log("REMOVED")
            }
            date_col.column.topbox.setAttribute("style", "");
        }catch (ex){
            log("clearWeather"+ex);
        };
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
