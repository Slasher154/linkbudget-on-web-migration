/**
 * Created by Dome on 6/26/14 AD.
 */
import { Satellites } from '/imports/api/satellites';

Template.satelliteEdit.events({
    'submit form': function(e, t){
        e.preventDefault();
        console.log("T data = " + JSON.stringify(t.data));
        // validate input
        var sat = $('#name').val();
        var slot = Number($('#orbitalSlot').val());
        var skb = Number($('#skb').val());
        if(sat === '' || slot === '' || skb === ''){
            alert('Please fill in all the fields.');
        }
        else if(slot < -180 || slot > 180){
            alert('Orbital slot must be between -180 to 180 degrees')
        }

        else{
            var _id = t.data.satellite._id;
            Satellites.update({_id: _id},{
                $set:{
                name: sat,
                orbital_slot: slot,
                skb: skb,
                type: $('#type').find('option:selected').val()
                }
            }, function(error){
                if(error){
                    alert(error.reason);
                }
                else{
                    FlowRouter.go('satelliteView',{_id: _id});
                }
            });
        }

    }
})