/**
 * Created by thanatv on 10/25/17.
 */

import { Modems } from '/imports/api/modems';

Template.modemView.created = () => {
    Meteor.subscribe('singleModem', FlowRouter.getParam('_id'))
}

Template.modemView.helpers({
    modem() {
        var modem = Modems.findOne({ _id: FlowRouter.getParam('_id')})
        _.each(modem.applications,function(item){
            _.extend(item,{view_mode:true});
        });
        return _.extend(modem,{view_mode:true});
    }
})