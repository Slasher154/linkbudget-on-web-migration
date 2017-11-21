/**
 * Created by thanatv on 10/25/17.
 */

import { Antennas } from '/imports/api/antennas'

Template.antennaView.helpers({
    antenna() {
        var antenna = Antennas.findOne({ _id: FlowRouter.getParam('_id')})
        return _.extend(antenna,{view_mode:true});
    }
})