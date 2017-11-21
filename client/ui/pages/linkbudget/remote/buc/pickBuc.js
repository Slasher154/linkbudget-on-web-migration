/**
 * Created by Dome on 4/22/14 AD.
 */
import { Bucs } from '/imports/api/bucs';

Template.pickBuc.created = () => {
    Meteor.subscribe('bucs');
}

Template.pickBuc.onRendered(function(){
    this.autorun(() => {
        if (this.subscriptionsReady()) {
            let $bucPicker = $('#bucPicker');
            $bucPicker.find($('option')).remove();
            let bucs = _.sortBy(Bucs.find().fetch(), 'size');
            let options =  bucs.map((buc) => {
                return `<option value="${buc._id}">${buc.name}</option>`;
            });
            $bucPicker.append(options).selectpicker('refresh');
        }
    });

});

Template.pickBuc.helpers({
    bucs() {
        return Bucs.find();
    }
})

