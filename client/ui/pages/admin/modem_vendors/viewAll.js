/**
 * Created by Dome on 7/29/14 AD.
 */
import { ModemVendors } from '/imports/api/modem_vendors';

Template.modemViewAll.created = () => {
    Meteor.subscribe('modem_vendors')
}

Template.modemViewAll.helpers({
    tableRows() {
        return ["Name","Actions"];
    },
    modem_vendors() {
        return ModemVendors.find().fetch();
    }
})

Template.modemVendorViewAll.events({
    'click a.remove': function(e){
        e.preventDefault();
        if(confirm("Delete this modem vendor?")){
            var _id = $(e.currentTarget).attr('value');
            var name = ModemVendors.findOne({_id:_id}).name;
            ModemVendors.remove({_id:_id}, function(error){
                if(error){
                    alert(error.reason);
                }
                else{
                    alert(name + ' is successfully removed.');
                    FlowRouter.go('modemVendorViewAll');
                }
            });
        }
    }
})