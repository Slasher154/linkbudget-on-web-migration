/**
 * Created by Dome on 6/26/14 AD.
 */
import { Locations } from '/imports/api/locations';

Template.locationViewAll.helpers({
    tableRows() {
        return ['Name','Country','City','Latitude','Longitude','Actions']
    },
    locations() {
        return Locations.find().fetch();

    }
})


Template.locationViewAll.events({
    'click a.remove': function(e){
        e.preventDefault();
        if(confirm("Delete this location?")){
            var _id = $(e.currentTarget).attr('value');
            var name = Locations.findOne({_id:_id}).name;
            Locations.remove({_id:_id}, function(error){
                if(error){
                    alert(error.reason);
                }
                else{
                    alert(name + ' is successfully removed.');
                    FlowRouter.go('locationViewAll');
                }
            });
        }
    }
})