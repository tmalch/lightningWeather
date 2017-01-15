/*
 The MIT License (MIT)

 Copyright (c) 2017 Thomas Malcher

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.
 */


Components.utils.import("resource://calendar/modules/calUtils.jsm");

var EXPORTED_SYMBOLS = ['WeekViewWeatherModule', 'MonthViewWeatherModule', 'HourlyViewWeatherModule', "params"];

var params = {
    document_ref: this
};

Components.utils.import("resource://gre/modules/Log.jsm");
let logger = Log.repository.getLogger("lightningweather.view");

function ViewWeatherModule(view) {
    this.view = view;
    this.icon_baseurl = "chrome://lightningweather/skin/default/";
    var self = this;

    this.setIconBaseUrl = function (icon_baseurl) {
        self.icon_baseurl = icon_baseurl;
    };
    this.clear = function () {
        let date_list = this.view.getDateList({});
        date_list.forEach(function (dt) {
            self.clearWeather(dt);
        });
    };
    this.annotate = function (forecast, tz) {
        let local_startDate = self.view.mStartDate.clone();
        local_startDate.timezone = tz;
        logger.info("show " + forecast.length + " Forecasts from date: " + local_startDate);
        forecast.forEachFrom(local_startDate.nativeTime / 1000, function (elem) {
            let mozDate = cal.jsDateToDateTime(new Date(elem.timestamp)).getInTimezone(tz/*self.view.timezone*/);
            mozDate.isDate = true;
            if (mozDate.compare(self.view.endDate) <= 0) { // mozDate < endDate
                logger.debug("render forecast for " + mozDate);
                self.setWeather(mozDate, elem.weather);
            }
        });
    };
    this.clearWeather = function (mozdate) {
        throw "NOT IMPLEMENTED"
    };
    this.setWeather = function (mozdate, weather) {
        throw "NOT IMPLEMENTED"
    };
}

WeekViewWeatherModule.prototype = Object.create(ViewWeatherModule);
/*** can be used for Day and WeekView can only show one Icon for the whole day
 *
 * @param view
 * @constructor
 */
function WeekViewWeatherModule(view) {
    ViewWeatherModule.call(this, view);
    var self = this;
    this.setWeather = function (mozdate, weather) {
        try {
            let day_col = this.view.findColumnForDate(mozdate);
            let orient = day_col.column.getAttribute("orient");
            let box = day_col.column.topbox;
            box.setAttribute("orient", orient);
            box.setAttribute("style", 'opacity: 0.4; background-image: url("' + self.icon_baseurl + weather.icon + '") !important; background-size: contain !important;');
        } catch (ex) {
            logger.error("setWeather: " + ex);
        }
    };
    this.clearWeather = function (mozdate) {
        try {
            let day_col = this.view.findColumnForDate(mozdate);
            let box = day_col.column.topbox;
            box.setAttribute("style", "");
        } catch (ex) {
            logger.error("clearWeather: " + ex);
        }
    };
}

HourlyViewWeatherModule.prototype = Object.create(ViewWeatherModule.prototype);
HourlyViewWeatherModule.prototype.getOrCreateWeatherBox = function (mozdate, day_col) {
    try {
        let weatherbox = params.document_ref.getAnonymousElementByAttribute(day_col, "anonid", "weatherbox");
        if (weatherbox == undefined) {
            weatherbox = params.document_ref.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "xul:box");
            let orient = day_col.getAttribute("orient");
            weatherbox.setAttribute("orient", orient);
            weatherbox.setAttribute("flex", "1");
            weatherbox.setAttribute("anonid", "weatherbox");

            let stack = params.document_ref.getAnonymousElementByAttribute(day_col, "anonid", "boxstack");
            stack.insertBefore(weatherbox, day_col.topbox);
        }
        return weatherbox
    } catch (ex) {
        logger.error("getOrCreateWeatherBox " + ex)
    }
};
function HourlyViewWeatherModule(view) {
    ViewWeatherModule.call(this, view);
    var self = this;
    this.makeBox = function (startMin, endMin, pixelsPerMinute, parent_orientation) {
        if (endMin <= startMin) {
            return undefined;
        }
        let startPix = Math.round(startMin * pixelsPerMinute);
        let endPix = Math.round(endMin * pixelsPerMinute);
        let durPix = endPix - startPix;
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

    this.annotate = function (forecast, tz) {
        let local_startDate = self.view.mStartDate.clone();
        local_startDate.timezone = tz;
        logger.info("show " + forecast.length + " Forecasts from date: " + local_startDate);
        var base_style = "opacity: 0.4; background-size: contain; background-repeat: repeat-y; background-position: right center; ";
        forecast.forEachFrom(local_startDate.nativeTime / 1000, function (elem) {
            let mozdate = cal.jsDateToDateTime(new Date(elem.timestamp)).getInTimezone(tz);
            /*self.view.timezone*/
            mozdate.isDate = true;
            let day_entry = self.view.findColumnForDate(mozdate);
            if (!day_entry) {
                return;
            }
            let day_col = day_entry.column;
            let weatherbox = self.getOrCreateWeatherBox(mozdate, day_col);
            let orient = day_col.getAttribute("orient");
            logger.debug("render forecast for " + mozdate);
            let day_icon = self.icon_baseurl + elem.weather.icon;
            if (elem.nestedForecast && elem.nestedForecast.length > 0) {
                self.clearWeatherBox(weatherbox);
                let curStartMin = day_col.mStartMin;
                elem.nestedForecast.sort();
                elem.nestedForecast.forEach(function (elem2) {
                    let mozdatetime = cal.jsDateToDateTime(new Date(elem2.timestamp)).getInTimezone(tz);
                    /*self.view.timezone*/
                    logger.trace("render nested forecast for " + mozdatetime);
                    let startMin = mozdatetime.hour * 60 + mozdatetime.minute;
                    let endMin = startMin + elem2.period;

                    if (curStartMin < startMin) {
                        let b = self.makeBox(curStartMin, startMin, day_col.pixelsPerMinute, orient); // insert a filling box
                        b.setAttribute("style", base_style + "background-image: url(" + day_icon + ") !important;"); // with daily forecast icon
                        weatherbox.appendChild(b);
                        curStartMin = startMin;
                    }
                    if (endMin > day_col.mEndMin) {
                        endMin = day_col.mEndMin
                    }
                    if (endMin <= curStartMin) {
                        return;
                    }
                    let box = self.makeBox(curStartMin, endMin, day_col.pixelsPerMinute, orient);
                    if (box) {
                        let icon = self.icon_baseurl + elem2.weather.icon;
                        box.setAttribute("style", base_style + 'background-image: url("' + icon + '") !important; ');
                        //box.setAttribute("style", box.getAttribute("style")+"border: 2px solid red;");
                        let temp = parseFloat(elem2.weather.temp);
                        if (!isNaN(temp)) {
                            let l = params.document_ref.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "description");
                            l.setAttribute('value', Math.round(temp) + "C");
                            box.appendChild(l);
                        }
                        weatherbox.appendChild(box);
                        curStartMin = endMin;
                    }
                });
                // nested forecast doesn't fill the whole day
                if (curStartMin < day_col.mEndMin) {
                    let b = self.makeBox(curStartMin, day_col.mEndMin, day_col.pixelsPerMinute, orient); // make a box till end of the day
                    b.setAttribute("style", base_style + "background-image: url(" + day_icon + ") !important;"); // with daily forecast icon
                    weatherbox.appendChild(b);
                }
            } else {
                weatherbox.setAttribute("style", base_style + "background-image: url(" + day_icon + ") !important;");
                let temp = parseFloat(elem.weather.temp);
                if (!isNaN(temp)) {
                    let l = params.document_ref.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "description");
                    l.setAttribute('value', Math.round(temp) + "C");
                    weatherbox.appendChild(l);
                }
            }
        });
    };

    this.clearWeatherBox = function (box) {
        while (box.firstChild) {
            box.removeChild(box.firstChild);
        }
    };

    this.clearWeather = function (mozdate) {
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
        } catch (ex) {
            logger.error("clearWeather: " + ex)
        }
    };
}

MonthViewWeatherModule.prototype = Object.create(ViewWeatherModule.prototype);


function MonthViewWeatherModule(view) {
    ViewWeatherModule.call(this, view);
    var self = this;

    this.setWeather = function (mozdate, weather) {
        let base_style = "opacity: 0.4; background-size: contain !important; background-position: right bottom !important; background-repeat: no-repeat !important; ";
        try {
            let day_box = self.view.findDayBoxForDate(mozdate);

            day_box.setAttribute("style", base_style + "background-image: url(" + self.icon_baseurl + weather.icon + ") !important;");
            //let l = params.document_ref.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "description");
            //l.setAttribute('value',Math.round(weather.temp)+"C");
            //day_box.appendChild(l);
        } catch (ex) {
            logger.error(ex)
        }
    };
    this.clearWeather = function (mozdate) {
        try {
            let day_box = self.view.findDayBoxForDate(mozdate);
            day_box.setAttribute("style", "");
        } catch (ex) {
        }
    };
}
