/**
 *
 * Created by Dome on 4/22/14 AD.
 */

import { Channels } from '/imports/api/channels';

Template.broadbandChannels.helpers({
    channels() {
        var country = Session.get('country');
        if (!country) {
            return [];
        }
        // TODO: Enable BC-Beam
        var channels = Channels.find({country: country,type:{$not:{$in:["broadcast"]}}}, {fields: {name: 1}}).fetch();
        return {
            value: _.uniq(_.pluck(channels, 'name'))
        }
    }
});

Template.broadbandChannels.events({
    'click label': function (e) {
        // Spot and BC channels cannot be selected simultaneously

        // If the clicked label is already active (perform deselection, do nothing)

        if(!$(e.currentTarget).hasClass('active')) {
            // Get recently selected channel
            var selected_channel = $(e.currentTarget).find('input').val();
            var type = Channels.findOne({name: selected_channel}).type;
            // Loop through already selected channels
            $(e.currentTarget).siblings('.active').each(function () {
                var ch = $(this).find('input').val();
                console.log(ch);
                var t = Channels.findOne({name: ch}).type;
                // If there is more than 2 type of channels selected and one of them is broadcast, alert and break the loop.
                if (type !== t && (type === 'broadcast' || t === 'broadcast')) {
                    alert('You cannot select spot beam and broadcast beam simultaneously. Please select only 1 type.')
                    return false;
                }
            })
        }
    }


})
