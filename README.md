# lightningWeather
This is a Thunderbird Addon that shows the weather forecast in the background of the Calendar.

Install from [addons.mozilla.org](https://addons.mozilla.org/../lightningWeather)

<p align=center>
<img src="https://github.com/tmalch/lightningWeather/blob/master/screenshots/calendar.png" width="75%" alt="Screenshot"/>
</p>

lightningWeather can use the weather API of [openweathermap.org](http://openweathermap.org), [yahoo](https://www.yahoo.com/news/weather/) or [darksky.net](https://darksky.net/). 

## Configuration
In the preferences dialog you can seek the forecast location and choose the API provider.

<p align=center>
<img src="https://github.com/tmalch/lightningWeather/blob/master/screenshots/preferences.png" width="75%" alt="Screenshot"/>
</p>

**Note:** The forecast at eg 6 pm shows the weather at 6 pm for the selected forecast location, no matter in which timezone the location is.

Assume you are in Paris and your selected forecast location is NY then the forecast at 6 pm is the weather in NY at 6 pm and not at 12 am.
