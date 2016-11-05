

var providers = {};
Components.utils.import("resource://openweatherprovider.js", providers);
Components.utils.import("resource://yahooprovider.js", providers);
Components.utils.import("resource://darkskyprovider.js", providers);
//Components.utils.import("resource://combinedprovider.js", providers);
Components.utils.import("resource://Forecast.js");

function log(level, msg){
    if(arguments.length == 1)
        dump(arguments[0]+"\n");
    else if(level >= 0)
        dump(msg+"\n");
}

var NO_RESULTS_VALUE = "_";

lightningweather_prefs = {

    prefs: Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.lightningweather."),

    provider_list: [],
    selected_provider: null,
    query: "Graz, AT",

    onLoad: function(){
        log(0,"PREFERENCE window loaded"+window.buttons+document.buttons);
        for(let provider in providers){
            if( providers.hasOwnProperty( provider ) && provider != "CombinedWeatherModule") {
                this.provider_list.push(providers[provider])
            }
        }

        // instantiate
        this.geolookup = new GeoLookup();
        this.location_list = document.getElementById("location_list");
        let provider_list_inp = document.getElementById('provider_list');
        for(let provider of this.provider_list){
            provider_list_inp.appendItem(provider.class, provider.class, provider.class+" Weather API");
        }

        // retrieve default values
        let default_provider_idx = 0;
        try{
            this.query = this.prefs.getCharPref("location_query");
            let provider_instance_description = JSON.parse(this.prefs.getCharPref("provider"));
            default_provider_idx = this.provider_list.findIndex(p => p.class == provider_instance_description.provider_name);
            if(default_provider_idx == -1) {
                default_provider_idx = 0;
            }
        }catch(e) {
            default_provider_idx = this.provider_list.findIndex(p => p.class == "yahoo");
            this.query = "Graz, AT";
        }

        // populate window based on default values
        this.location_list.inputField.placeholder = this.query;
        this.selected_provider = this.provider_list[default_provider_idx];
        provider_list_inp.selectedItem = provider_list_inp.getItemAtIndex(default_provider_idx);

        this.updateLocationList(this.query);
    },
    onclick: function(event){
        this.location_list.value = this.query;
        this.location_list.select();
    },
    providerSelected: function(event){
        this.selected_provider = this.provider_list[event.currentTarget.selectedIndex];
    },

    locationQueryChanged: function(event){
        let user_input = event.currentTarget.value;
        log(0, "location_query ch: "+ user_input);
        this.query = user_input;
        this.updateLocationList(user_input);
    },

    updateLocationList: function(user_input, callback){
        if(!user_input || user_input.length < 3){
            this.setLocationList([]);
            return;
        }
        this.geolookup.locations(user_input, function(locations){
            this.setLocationList(locations);
            callback && callback();
        }.bind(this));
    },
    setLocationList: function(locations){
        let count = this.location_list.itemCount;
        while(count-- > 0){
            this.location_list.removeItemAt(0);
        }
        if(locations == undefined){
            this.location_list.appendItem("error occured", NO_RESULTS_VALUE);
        }else if(locations.length == 0){
            this.location_list.appendItem("no results", NO_RESULTS_VALUE);
        }else{
            locations.forEach(e => this.location_list.appendItem(e[0], e[1], e[2]));
        }
        this.location_list.menupopup.openPopup(this.location_list, "after_start", 0,0,true);
    },

    locationSelected: function(event){
        let selected_item = event.target.selectedItem;
        if(!selected_item || selected_item.value == NO_RESULTS_VALUE){
            log(0, "No results Clear Selection");
        }else{
            log(0,"location selected "+selected_item.label+" - "+ selected_item.value);
        }
    },

    apply: function(){
        let selected_location = this.location_list.selectedItem;
        if(selected_location && selected_location.value != NO_RESULTS_VALUE){
            log(0,"save Prefs");
            this.prefs.setCharPref("provider", JSON.stringify({"provider_name":this.selected_provider.class,"location": JSON.parse(selected_location.value)}));
            this.prefs.setCharPref("location_query", this.query);
            log(0, "SAVE "+this.prefs.getCharPref("provider"));
            return true;
        }else{
            let error_msg_elem = document.getElementById("error_msg_container");
            if(this.location_list.itemCount == 0 || this.location_list.getItemAtIndex(0).value == NO_RESULTS_VALUE){
                error_msg_elem.innerHTML = "Please enter a query";
                error_msg_elem.openPopup(this.location_list);
            }else{
                error_msg_elem.innerHTML = "Please select a location";
                error_msg_elem.openPopup(this.location_list);
            }

            window.setTimeout(function(){error_msg_elem.hidePopup()}, 1000);
            return false;
        }
    }
};
