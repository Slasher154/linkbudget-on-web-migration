/**
 * Created by Dome on 4/21/14 AD.
 */
import { Channels } from '/imports/api/channels';
import { Locations } from '/imports/api/locations';

Template.conventional.created = () => {
    Meteor.subscribe('channels');
    Meteor.subscribe('locations');
}

Template.conventional.helpers({
    beams() {
        var sat = Session.get('satellite')
        if (sat) {
            var beams = Channels.find({satellite: sat.name}, {fields: {uplink_beam: 1}}).fetch();
            return _.uniq(_.pluck(beams, 'uplink_beam'));
        }
    }
})

Template.conventional.events({
    'change select': function (e) {
        var selectedBeam = $(e.target).val();
        if (selectedBeam !== '') {
            Session.set('beam', selectedBeam);

            var beam = Channels.findOne({'uplink_beam': selectedBeam});
            // check if selected beam is C-Band
            Session.set('isCBand', beam.uplink_cf < 8);
            Session.set('isKuBand', beam.uplink_cf > 8 && beam.uplink_cf < 15);

            // Check if user selects C-Band and already input hub or remote antenna less than 1.8m
            var hub_size = $('#hub-size').val();
            var remote_size = $('#remote-size').val();
            if ((hub_size !== '' && hub_size < 1.8 && Session.get('isCBand')) || (remote_size !== '' && remote_size < 1.8 && Session.get('isCBand'))) {
                alert('You cannot use antenna smaller than 1.8m with C-Band.');
                $('#hub-size').val('');
                $('#remote-size').val('');
            }

            // Render location typeahead based on beam (available locations are based on selected beam)
            var sat_name = Session.get('satellite').name;
            // Filter locations by satellite name, beam name, and EIRP value not equal to 0
            var locations = _.pluck(Locations.find({data:{$elemMatch:{satellite:sat_name,beam:selectedBeam,type:'downlink',value:{$ne:0}}}}).fetch(),'name');

            // Destroy old sources and bind new location sources for hub locations
            $('#hub-location').typeahead('destroy');
            $('#hub-location').typeahead({source: locations});

            // Destroy old sources and bind new location sources for remote locations
            $('#location-by-name').typeahead('destroy');
            $('#location-by-name').typeahead({source: locations});
        }
    }
})