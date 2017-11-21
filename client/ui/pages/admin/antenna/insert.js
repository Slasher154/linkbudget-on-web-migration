/**
 * Created by Dome on 7/1/14 AD.
 */
import { Antennas } from '/imports/api/antennas';

Template.antennaInsert.helpers({
    antenna() {
        return {
            // insert 1 blank antenna
            name: "",
            vendor: "Standard",
            size: 1.2
        }
    }
})

Template.antennaInsert.events({
    'submit form': function(e){
        e.preventDefault();

        // validate and insert antenna
        var name = $('#name').val();
        var vendor = $('#vendor').find('option:selected').val();
        var size = Number($('#size').val());
        
        if(name==''){
            alert('Please fill in the name.');
        }
        if(size==''){
            alert('Please fill in the size.');
        }
        
        var antenna = {
            name: name,
            vendor: vendor,
            size: size
        }
        
        // check if Rx gain and Rx mid-band frequency is given
        var rx_gain_value = Number($('#rx_gain_value').val());
        var rx_gain_freq = Number($('#rx_gain_freq').val());
        
        if(rx_gain_value != '' && rx_gain_freq != ''){
            _.extend(antenna,{
                rx_gain: {
                    value: rx_gain_value,
                    freq: rx_gain_freq
                }
            })
        }

        // check if Tx gain and Tx mid-band frequency is given
        var tx_gain_value = Number($('#tx_gain_value').val());
        var tx_gain_freq = Number($('#tx_gain_freq').val());

        if(tx_gain_value != '' && tx_gain_freq != ''){
            _.extend(antenna,{
                tx_gain: {
                    value: tx_gain_value,
                    freq: tx_gain_freq
                }
            });
        }

        // check if G/T is given
        var gt = Number($('#gt').val());

        if(gt != '') {
            _.extend(antenna, { gt: gt});
        }

        Antennas.insert(antenna, function(error, _id){
            if(error){
                alert(error.reason);
            }
            else{
                FlowRouter.go('antennaView',{_id: _id});
            }
        });
     }
})