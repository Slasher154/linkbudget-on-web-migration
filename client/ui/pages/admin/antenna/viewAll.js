/**
 * Created by Dome on 7/1/14 AD.
 */
import { Antennas } from '/imports/api/antennas';

Template.antennaViewAll.helpers({
    tableRows() {
        return ['Name','Vendor','Size (m)','Remarks','Action'];
    },
    antennas() {
        return _.sortBy(Antennas.find().fetch(), function(x) { return x.size } );
    }
})

Template.antennaViewAll.events({
    'click a.remove': function(e){
        e.preventDefault();
        if(confirm("Delete this antenna?")){
            var _id = $(e.currentTarget).attr('value');
            var name = Antennas.findOne({_id:_id}).name;
            Antennas.remove({_id:_id}, function(error){
                if(error){
                    alert(error.reason);
                }
                else{
                    alert(name + ' is successfully removed.');
                    FlowRouter.go('antennaViewAll');
                }
            });
        }
    }
})