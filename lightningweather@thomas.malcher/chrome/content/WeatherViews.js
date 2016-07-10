
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
        forecast.data.forEach(function(elem){
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
        }catch (ex){
            log("setWeather:"+ex);
        };
    };
    /*    this.setWeather = function(date, icon){
     try {
     let date_col = this.view.findColumnForDate(date);
     let box = date_col.column.topbox;
     box.setAttribute("style", "background-image: url(\"" + lightningweather.baseurl + icon + ".png" + "\") !important; background-size: contain !important;");
     let wboxes = this.createWeatherBoxes(date_col.column, 360);
     log("count WeatherBoxes: "+ wboxes.length);
     wboxes.forEach(function(wbox){
     wbox.setAttribute("style", "background-image: url(\"" + lightningweather.baseurl + icon + ".png" + "\") !important; background-size: cover !important;");
     box.appendChild(wbox);
     log("added WBox");
     });
     }catch (ex){
     log("setWeather:"+ex);
     };
     };
     this.RangesetWeather = function(range, icon){
     try {
     let start = new Date(range[0]);
     let end = new Date(range[1]);
     let date = lightningweather.getMozDate(start.getFullYear(), start.getMonth(), start.getDate());
     let date_col = this.view.findColumnForDate(date).column;

     log("col.mStartMin "+date_col.mStartMin);
     log("col.mEndMin "+date_coln.mEndMin);
     log("col.pixelsPerMinute "+date_col.pixelsPerMinute);
     let box = date_col.column.topbox;
     let wboxes = this.createWeatherBoxes(date_col, 180);
     log("count WeatherBoxes: "+ wboxes.length);
     wboxes.forEach(function(wbox){
     wbox.setAttribute("style", "background-image: url(\"" + lightningweather.baseurl + icon + ".png" + "\") !important; background-size: cover !important;");
     box.appendChild(wbox);
     });

     }catch (ex){
     log(ex);
     };
     };*/
    this.createWeatherBoxes = function(col, dur){
        log("createWeatherBoxes ");
        let orient = col.getAttribute("orient");
        let res = [];
        let theMin = col.mStartMin;  // inspired from calendar-multiday-view#event-column
        while (theMin < col.mEndMin) {
            if(theMin + dur > col.mEndMin){
                dur = col.mEndMin-theMin;
            }
            let weather_box = createXULElement("spacer");
            // calculate duration pixel as the difference between
            // start pixel and end pixel to avoid rounding errors.
            let startPix = Math.round(theMin * col.pixelsPerMinute);
            let endPix   = Math.round((theMin + dur) * col.pixelsPerMinute);
            let durPix   = endPix - startPix;
            if (orient == "vertical")
                weather_box.setAttribute("height", durPix);
            else
                weather_box.setAttribute("width", durPix);
            weather_box.setAttribute("style", "min-width: 1px; min-height: 1px; background-color: #000f00 !important;");
            res.push(weather_box);
            theMin += dur;
        }
        log("createWeatherBoxes DONE");
        return res;
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
