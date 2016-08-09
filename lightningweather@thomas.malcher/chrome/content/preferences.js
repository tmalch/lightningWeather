

var providers = {};
Components.utils.import("resource://WeatherProvider.js", providers);

function log(level, msg){
    if(msg == undefined)
        dump(level+"\n");
    else if(level >= 0)
        dump(msg+"\n");
}

delete providers['Forecast'];

var NO_RESULTS_VALUE = "_";

lightningweather_prefs = {

    sourceTree: {
        row_data: null,
        data: [[ "yahoo",["Paris, US", "Paris, FR", "Paris, RU"] ]],

        get rowCount() { return this.row_data.length; },
        selection: null,

        getCellText: function( row , column ){
            return this.row_data[row].text
        },
        setTree: function(treebox){ this.treebox = treebox; },


        getLevel: function(row){
            if(this.row_data[row].isprovider){
                return 0;
            }
            return 1;
        },
        hasNextSibling: function(row, afterIndex){ return false;},
        getParentIndex: function(row){ return row-1;},


        getImageSrc: function(row,col){ return null; },
        getRowProperties: function(row,props){},
        isSeparator: function(row){ return false; },
        isSorted: function(){ return false; },
        isContainer: function(row){ return false; },

        getSelectedIdx: function(){
            var start = {}, end = {}, numRanges = this.selection.getRangeCount(), selectedIndices = [];

            for (var t = 0; t < numRanges; t++){
                this.selection.getRangeAt(t, start, end);
                for (var v = start.value; v <= end.value; v++)
                    selectedIndices.push(v);
            }
            return selectedIndices;
        },
        onClick: function(event){
            log(0, "clicked")
            var tbo = lightningweather_prefs.sourceTree.treebox;
            let row_idx = tbo.getRowAt(event.clientX, event.clientY);


            if(this.row_data[row_idx].isprovider){
                this.selection.clearRange(row_idx, row_idx);
                let first_location_idx = row_idx+1;
                if(this.row_data.length > first_location_idx && !this.row_data[first_location_idx].isprovider){
                    this.selectedIndices.push(first_location_idx);
                    this.selectedIndices.forEach(i => this.selection.rangedSelect(i, i, true))
                }
            }else{
                this.selectedIndices.push(row_idx);
                this.selectedIndices.forEach(i => this.selection.rangedSelect(i, i, true))
            }
        },
        selectedIndices: [],
        onSelect: function(){
            log("selection changed "+this.selection.count);

            return;
            let selectedIndices = this.getSelectedIdx();
            // clear selections that are not allowed
            selectedIndices.forEach(function(i){
                if(this.row_data[i].isprovider) {
                    this.selection.clearRange(i, i);
                    if(this.row_data.length > i+1 && !this.row_data[i+1].isprovider){
                        this.selection.select(i+1)
                    }
                }
            }.bind(this));

            log(selectedIndices.filter(i => !this.row_data[i].isprovider).length+": "+selectedIndices.filter(i => !this.row_data[i].isprovider));
        },
},

    prefs: Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.lightningweather."),

    provider_list: [],
    selected_provider: null,

    onLoad: function(){
        log(0,"PREFERENCE window loaded"+window.buttons+document.buttons);
        for(let provider in providers){
            if( providers.hasOwnProperty( provider ) && provider != "CombinedWeatherModule") {
                this.provider_list.push(providers[provider])
            }
        }
        // instantiate
        let location_inp = document.getElementById("location_query");

        let provider_list_inp = document.getElementById('provider_list');
        for(let provider of this.provider_list){
            provider_list_inp.appendItem(provider.class, provider.class, provider.class+" Weather API");
        }
        this.location_list = document.getElementById('location_list');

        // retrieve default values
        let default_location_query, default_location_value = "";
        let default_provider_idx = 0;
        try{
            default_location_query = this.prefs.getCharPref("location_query");
            let provider_instance_description = JSON.parse(this.prefs.getCharPref("provider"));
            default_provider_idx = this.provider_list.findIndex(p => p.class == provider_instance_description.provider_name);
            if(default_provider_idx == -1) {
                default_provider_idx = 0;
            }
            default_location_value = provider_instance_description.city_id;
        }catch(e) {
            default_location_query = "Graz, AT";
            default_location_value = "548536";
            default_provider_idx = this.provider_list.findIndex(p => p.class == "yahoo");
        }

        // populate window based on default values
        location_inp.placeholder = default_location_query;
        this.selected_provider = this.provider_list[default_provider_idx];
        provider_list_inp.selectedItem = provider_list_inp.getItemAtIndex(default_provider_idx);

        this.updateLocationList(default_location_query, function(){
            for(let i=0;i < this.location_list.itemCount;i++) {
                let item = this.location_list.getItemAtIndex(i);
                if (item.value == default_location_value) {
                    this.location_list.selectedIndex = i;
                    break;
                }
            }
        }.bind(this));

        //this.sourceTree.row_data = this.provider_list.filter(p => p != this.provider_list.CombinedWeatherModule).map(function(e){return {text:e.class, isprovider:true};});
        //this.sourceTree.row_data.splice(1,0,{text:"Paris, US Florida", isprovider:false}, {text:"Paris, US Missouri", isprovider:false}, {text:"Paris, FR", isprovider:false});
        //this.sourceTree.row_data.splice(5,0,{text:"Paris, FR", isprovider:false});
        //
        //document.getElementById('elementList').view = this.sourceTree;
    },

    providerSelected: function(event){
        this.selected_provider = this.provider_list[event.currentTarget.selectedIndex];

        let user_input = document.getElementById("location_query").value || this.prefs.getCharPref("location_query");
        this.updateLocationList(user_input);
    },

    locationQueryChanged: function(event){
        let user_input = event.currentTarget.value;
        this.updateLocationList(user_input);
    },

    updateLocationList: function(user_input, callback){
        if(!user_input || user_input.length < 3){
            this.setLocationList(this.selected_provider.class,[]);
            return;
        }
        if(this.selected_provider != null){
            this.selected_provider.locations(user_input, function(locations){
                this.setLocationList(this.selected_provider.class, locations);
                callback && callback();
            }.bind(this));
        }else {
            log(0, "No Provider Selected")
        }
    },
    setLocationList: function(provider_name, locations){
        let count = this.location_list.itemCount;
        while(count-- > 0){
            this.location_list.removeItemAt(0);
        }
        if(locations.length == 0){
            this.location_list.appendItem("no results", NO_RESULTS_VALUE);
        }else{
            locations.forEach(e => this.location_list.appendItem(e[0], e[1]));
            this.location_list.selectedIndex = 0;
        }
    },

    locationSelected: function(event){
        if(event.target.selectedItems.length == 0){
            return; //nothing selected -> nothin to do
        }
        let selected_item = event.target.selectedItems[0];
        if(!selected_item || selected_item.value == NO_RESULTS_VALUE){
            log(0, "No results Clear Selection");
            this.location_list.suppressOnSelect = true;
            this.location_list.clearSelection();
            this.location_list.suppressOnSelect = false;
        }
    },

    apply: function(){
        let selected_location = this.location_list.selectedItem;
        if(selected_location && selected_location.value != NO_RESULTS_VALUE){
            log(0,"save Prefs");
            this.prefs.setCharPref("provider", JSON.stringify({"provider_name":this.selected_provider.class,"city_id":selected_location.value}));
            return true;
        }else{
            let error_msg_elem = document.getElementById("error_msg_container");
            if(this.location_list.itemCount == 0 || this.location_list.getItemAtIndex(0).value == NO_RESULTS_VALUE){
                error_msg_elem.innerHTML = "Please enter a query";
                error_msg_elem.openPopup(document.getElementById("location_query"));
            }else{
                error_msg_elem.innerHTML = "Please select a location";
                error_msg_elem.openPopup(this.location_list);
            }

            document.setTimeout(function(){error_msg_elem.hidePopup()}, 1000);
            return false;
        }
    }
};
