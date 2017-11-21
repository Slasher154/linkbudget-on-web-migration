/**
 * Created by Dome on 7/1/14 AD.
 */
import { Modems } from '/imports/api/modems';

Template.modemViewAll.helpers({
    tableRows() {
        return ['Name','Vendor','Action'];
    },
    modems() {
        return Modems.find({},{sort:{name:1}}).fetch();
    }
})

Template.modemViewAll.events({
    'click a.remove': function(e){
        e.preventDefault();
        if(confirm("Delete this modem?")){
            var _id = $(e.currentTarget).attr('value');
            var name = Modems.findOne({_id:_id}).name;
            Modems.remove({_id:_id}, function(error){
                if(error){
                    alert(error.reason);
                }
                else{
                    alert(name + ' is successfully removed.');
                    FlowRouter.go('modemViewAll');
                }
            });
        }
    }
})