/**
 * Created by Dome on 4/25/14 AD.
 */
Template.findLocationByLatlon.events({
    'change input': function(e){
        var loc = $(e.currentTarget).val();
        if(loc!=='' && CheckLatLon(loc)){
            if(Session.get('selectedLocations')) {
                var loc_arr = Session.get('selectedLocations');
                loc_arr.push(loc);
                Session.set('selectedLocations', loc_arr);
            }
            else{
                var loc_arr = [];
                loc_arr.push(loc);
                Session.set('selectedLocations',loc_arr);
            }
            $(e.currentTarget).val('');
        }
        else{
            alert('Your lat,lon is invalid.')
        }
    }
})

// check if input lat-lon text is valid
// the valid lat-lon is in the form lat,lon => -89,-179
function CheckLatLon(text){

    // test regular expression for number,number first
    if(!text.match(/[-.0-9]+[,][-.0-9]+/)){
        console.log('Regex does not match')
        return false;
    }
    // get lat from the number before comma
    var lat = text.split(',')[0];
    var lon = text.split(',')[1];

    // return false if lat and lon is not a number (NaN = not a number)
    if(isNaN(lat) || isNaN(lon)){
        console.log('lat,lon is not a number')
        return false;
    }
    // check if lat is between -90 and 90 , lon is between -180 to 180
    else if(lat<-90|| lat>90 || lon < -180 || lon > 180){
        console.log('lat, lon is not within correct range.')
        return false;
    }
    return true;
}