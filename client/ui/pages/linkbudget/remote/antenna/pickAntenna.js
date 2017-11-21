/**
 * Created by Dome on 4/22/14 AD.
 */
import { Antennas } from '/imports/api/antennas';

Template.pickAntenna.created = () => {
    Meteor.subscribe('antennas')
};

Template.pickAntenna.onRendered(function(){
    this.autorun(() => {
        if (this.subscriptionsReady()) {
            let $antennaPicker = $('#antennaPicker');
            $antennaPicker.find($('option')).remove();
            let antennas = _.sortBy(Antennas.find().fetch(), 'size');
            let options =  antennas.map((antenna) => {
                return `<option value="${antenna._id}">${antenna.name}</option>`;
            });
            $antennaPicker.append(options).selectpicker('refresh');
        }
    });
})


Template.pickAntenna.events({
    'change input#remote-size': function (e) {
        // Alert if user selects C-Band and input remote size less than 1.8m and clear the input
        var remote_size = $(e.currentTarget).val();
        if (Session.get('isCBand') && remote_size < 1.8) {
            alert('You cannot use antenna smaller than 1.8m with C-Band.');
            $(e.currentTarget).val('');

        }

    }
})

