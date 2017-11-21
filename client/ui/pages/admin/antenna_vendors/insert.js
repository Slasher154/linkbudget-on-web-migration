/**
 * Created by Dome on 7/29/14 AD.
 */
import { AntennaVendors } from '/imports/api/antenna_vendors';

Template.antennaVendorInsert.events({
    'click .submit': function(e){
        e.preventDefault();
        var name = $('#name').val();
        AntennaVendors.insert({name:name}, function(error, data){
            if(error){
                alert(error.reason);
            }
            else{
                alert(name + ' is successfully inserted into database');
                $('#name').val(""); // clear the field
            }
        })
    }
})