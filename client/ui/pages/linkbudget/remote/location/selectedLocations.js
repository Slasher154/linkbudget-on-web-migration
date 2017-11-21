/**
 * Created by Dome on 4/25/14 AD.
 */
Template.selectedLocations.events({
    'click .removeLocation': function(e){
        e.preventDefault();

        // get the selected locations
        var loc = $(e.currentTarget).siblings('span').text().trim();

        // filter out the selected location from the current array and set the new array back to the session
        var new_loc_arr = _.filter(Session.get('selectedLocations'), function(item){
            return item !== loc;
        });
        Session.set('selectedLocations', new_loc_arr);

    }
})