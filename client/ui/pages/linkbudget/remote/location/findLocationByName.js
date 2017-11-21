/**
 * Created by Dome on 4/25/14 AD.
 */
Template.findLocationByName.events({
    'change input': function(e){
        var loc_value = $(e.currentTarget).val();
        if(loc_value!=='') {
            // Check if database contains the input location
            var loc = Locations.findOne({name: loc_value});
            // Input to selected location only if the input location exists in our database
            if (loc) {
                if (Session.get('selectedLocations')) {
                    var loc_arr = Session.get('selectedLocations');
                    loc_arr.push(loc_value);
                    Session.set('selectedLocations', loc_arr);
                }
                else {
                    var loc_arr = [];
                    loc_arr.push(loc_value);
                    Session.set('selectedLocations', loc_arr);
                }
            }
            $(e.currentTarget).val('');
        }

    }
})

Template.findLocationByName.rendered = function(){
    // render typeahead for hub locations from location database
    var locations = _.pluck(Locations.find().fetch(),'name');
    //$(this.find('#location-by-name')).typeahead({source: locations});
}