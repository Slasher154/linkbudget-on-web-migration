/**
 * Created by Dome on 4/23/14 AD.
 */

import { Modems } from '/imports/api/modems';

Template.modemSelector.created = () => {
    Meteor.subscribe('modems');
}

Template.modemSelector.onRendered(function(){
    this.autorun(() => {
        if (this.subscriptionsReady()) {
            let $modemPicker = $('#modemPicker');
            var modems = _.groupBy(Modems.find({"applications.0.type":{$not: "Broadcast"}}).fetch(),function(item){ return item.vendor; });
            var grouped_modems = [];
            for(var prop in modems){
                grouped_modems.push({
                    vendor: prop,
                    modem: modems[prop]
                })
            }
            let sortedGroupedModems = _.sortBy(grouped_modems, 'vendor');
            let firstOption = `<option value="">Select Modem</option>`;
            let options =  sortedGroupedModems.map((modemVendor) => {
                let optionGroupOpenTag = `<optgroup label="${modemVendor.vendor}">`;
                let modemOptions = modemVendor.modem.map((modem) => {
                    return `<option value="${modem._id}">${modem.name}</option>`
                })
                return `${optionGroupOpenTag}${modemOptions.join('')}</optgroup>`
            });
            $modemPicker.append(`${firstOption}${options.join('')}`).selectpicker('refresh');
        }
    });
});

Template.modemSelector.events({
    'change #modemPicker': function(e){
        var modem_id = $(e.currentTarget).find('option:selected').val();
        if(modem_id!==''){
            Session.set('modemId',modem_id);
        }
        console.log(Session.get('modemId'));
    }
})

