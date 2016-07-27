
Components.utils.import("resource://calendar/modules/calUtils.jsm");

var EXPORTED_SYMBOLS = ['WeekViewWeatherModule', 'MonthViewWeatherModule'];

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
        forecast.forEachFrom(cal.dateTimeToJsDate(self.view.mStartDate), function(elem){
            let date = new Date(elem.timestamp);
            let mozDate = cal.jsDateToDateTime(date, self.view.timezone);
            //let mozDate = cal.jsDateToDateTime(new Date(date.getFullYear(),date.getMonth(),date.getDate())).getInTimezone(self.view.timezone);
            //mozDate.isDate = true;
            log("set "+elem.weather.icon+" for "+date);
            self.setWeather(mozDate, elem.weather.icon);
        });
    };
    this.clearWeather = function(mozdate){throw "NOT IMPLEMENTED"};
    this.setWeather = function(mozdate, icon){throw "NOT IMPLEMENTED"};
}

//WeekViewWeatherModule.prototype = Object.create(ViewWeatherModule);
function WeekViewWeatherModule(view) {
    ViewWeatherModule.call(this, view);
    this.type = "week";

    this.setWeather = function(mozdate, icon){
        try {
            let date_col = this.view.findColumnForDate(mozdate);
            let box = date_col.column.topbox;
            box.setAttribute("style", "background-image: url(\"" + icon + ".png" + "\") !important; background-size: contain !important;");
        }catch (ex){
            log("setWeather:"+ex);
        }
    };
    this.clearWeather = function(mozdate){
        try {
            let date_col = this.view.findColumnForDate(mozdate);
            let box = date_col.column.topbox;
            box.setAttribute("style", "");
        }catch (ex){
            log("clearWeather:"+ex);
        }
    };
}

//HourlyViewWeatherModule.prototype = Object.create(ViewWeatherModule);
function HourlyViewWeatherModule(view) {
    ViewWeatherModule.call(this, view);
    this.type = "week";
    var self = this;

    this.annotate = function(forecast){
        forecast.forEachDateFrom(this.view.mStartDate, function(elem){
            let date = elem.date;
            let mozdate = cal.jsDateToDateTime(date, self.view.timezone);
            let day_col = self.view.findColumnForDate(mozdate);
            let topbox = day_col.column.topbox;
            if(elem.nestedForecast){
                elem.nestedForecast.forEach(function (elem2){
                    let datetime = new Date(elem2.timestamp);
                    let startMin = datetime.getHours()*60+datetime.getMinutes();
                    let wbox = createWeatherBox(col, startMin, elem2.period);
                    //wbox.setAttribute("style", elem2.weather.getStyle());
                    let icon = elem2.weather.icon;
                    wbox.setAttribute("style", "background-image: url(\"" + icon + ".png" + "\") !important; background-size: contain !important;");
                    topbox.appendChild(wbox);
                });
            }else{
                let icon = elem.weather.icon;
                topbox.setAttribute("style", "background-image: url(\"" + icon + "\") !important; background-size: contain !important;");
            }
        });
    };

    this.createWeatherBox = function(col, startMin, dur){
        if (col.mStartMin < startMin) {
            dur = startMin - col.mStartMin;
        }
        if(startMin + dur > col.mEndMin){
            dur = col.mEndMin-startMin;
        }
        let weather_box = createXULElement("spacer");
        // calculate duration pixel as the difference between
        // start pixel and end pixel to avoid rounding errors.

        let startPix = Math.round(startMin * col.pixelsPerMinute);
        let endPix   = Math.round((startMin + dur) * col.pixelsPerMinute);
        let durPix   = endPix - startPix;
        let orient = col.getAttribute("orient");
        if (orient == "vertical")
            weather_box.setAttribute("height", durPix);
        else
            weather_box.setAttribute("width", durPix);
        return weather_box;
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
            box.setAttribute("style", "");
        }catch (ex){};
    };
}

//MonthViewWeatherModule.prototype = Object.create(ViewWeatherModule);
function MonthViewWeatherModule(view) {
    ViewWeatherModule.call(this, view);
    this.type = "month";
    var self = this;

    this.setWeather = function(mozdate, icon){
        try {
            let date_box = self.view.findDayBoxForDate(mozdate);
            date_box.setAttribute("style", "background-image: url(\"" + icon + ".png" + "\") !important; background-size: contain !important;");
        }catch (ex){
            log(ex)
        };
    };
    this.clearWeather = function(mozdate){
        try {
            let date_box = self.view.findDayBoxForDate(mozdate);
            date_box.setAttribute("style", "");
        }catch (ex){};
    };
}
