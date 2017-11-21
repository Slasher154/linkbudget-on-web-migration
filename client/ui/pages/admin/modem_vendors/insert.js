/**
 * Created by Dome on 7/29/14 AD.
 */
import { ModemVendors } from '/imports/api/modem_vendors'

Template.modemVendorInsert.events({
    'click .submit': function(e){
        e.preventDefault();
        var name = $('#name').val();
        ModemVendors.insert({name:name}, function(error, data){
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