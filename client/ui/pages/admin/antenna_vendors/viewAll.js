/**
 * Created by Dome on 7/29/14 AD.
 */
import { AntennaVendors } from '/imports/api/antenna_vendors';

Template.antennaVendorViewAll.helpers({
    tableRows() {
        return ["Name","Actions"];
    },
    antenna_vendors() {
        return AntennaVendors.find().fetch();
    }
})

Template.antennaVendorViewAll.events({
    'click a.remove': function(e){
        e.preventDefault();
        if(confirm("Delete this antenna vendor?")){
            var _id = $(e.currentTarget).attr('value');
            var name = AntennaVendors.findOne({_id:_id}).name;
            AntennaVendors.remove({_id:_id}, function(error){
                if(error){
                    alert(error.reason);
                }
                else{
                    alert(name + ' is successfully removed.');
                    FlowRouter.go('antennaVendorViewAll');
                }
            });
        }
    }
})