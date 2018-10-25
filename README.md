# lightningWeather
This is a Thunderbird Addon that shows the weather forecast in the background of the Calendar.

Install from [addons.mozilla.org](https://addons.thunderbird.net/en-US/thunderbird/addon/lightningweather/)

<p align=center>
<img src="https://github.com/tmalch/lightningWeather/blob/master/screenshots/calendar.png" width="75%" alt="Screenshot"/>
</p>

lightningWeather supports the weather APIs of:
* [openweathermap.org](http://openweathermap.org) 
* [yahoo](https://www.yahoo.com/news/weather/)
* [darksky.net](https://darksky.net/). 

lightningWeather uses free developer accounts of these services. Therefore there are quite tight rate limits
for the number of requests. openweathermap.org allows 60 requests per minute and darksky.net 1000 requests per day. 
Only yahoo has no rate limit and should always work.

The forecast is updated every 5 hours.

## Configuration
In the preferences dialog you can seek the forecast location and choose the API provider.

<p align=center>
<img src="https://github.com/tmalch/lightningWeather/blob/master/screenshots/preferences.png" width="75%" alt="Screenshot"/>
</p>

**Note:** The forecast at eg 6 pm shows the weather at 6 pm for the selected forecast location, no matter in which timezone the location is.

Assume you are in Paris and your selected forecast location is NY then the forecast at 6 pm is the weather in NY at 6 pm and not at 12 am.

## Changelog
v0.4.0
- add support for Thunderbird 60.*

v0.3.2
- fix bug which led to infinite api requests

v0.3.1
- hide forecast if it is older than 24hr
- fix bug when setting unit in preferences on Windows
- workaround bug in Lightning 5.4 (Thunderbird 52)

v0.2.1
- fix bug in setting preference for unit C/F

v.2
- add preference for unit C/F

