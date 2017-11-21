/**
 * Created by Dome on 6/26/14 AD.
 */
import { Satellites } from '/imports/api/satellites';

Template.satelliteViewAll.helpers({
    tableRows() {
        return ['Name','Orbital Slot','Half Station Keeping Box (degrees)', 'Type','Actions'];
    },
    satellites() {
        return Satellites.find().fetch();
    }
})

Template.satelliteViewAll.events({
    'click a.remove': function(e){
        e.preventDefault();
        if(confirm("Delete this satellite?")){
            var _id = $(e.currentTarget).attr('value');
            var name = Satellites.findOne({_id:_id}).name;
            Satellites.remove({_id:_id}, function(error){
                if(error){
                    alert(error.reason);
                }
                else{
                    alert(name + ' is successfully removed.');
                    FlowRouter.go('satelliteViewAll');
                }
            });
        }
    }
})