/**
 * Created by Dome on 6/26/14 AD.
 */
import { Satellites } from '/imports/api/satellites';
import { Channels } from '/imports/api/channels';

Template.locationBaseForm.helpers({
    showType(type) {
        if(type == 'uplink'){
            return 'G/T';
        }
        else if (type == 'downlink'){
            return 'EIRP';
        }
        else {
            return '';
        }
    }
})

Template.locationBaseForm.events({
    'click .add-data': function(e){
        // add another row of Add MCG
        var loc_data = {
            satellite: "Thaicom 5",
            beam: "Standard C",
            type: "downlink",
            value: 0
        }
        e.preventDefault();
        // Get the closest .mcg-form to the button to insert the new MCG insert boxes to the correct application
        // (prevent click add button and insert the new MCG boxes into all applications
        var beforeNode = $(e.currentTarget).parents('.form-group').prevAll('.data-form:first').next().get(0);
        if(_.isUndefined(beforeNode)){
            beforeNode = $(e.currentTarget).parents('.form-group').get(0);
        }
        UI.insert(UI.renderWithData(Template.locationDataBaseForm,loc_data),$('form').get(0),beforeNode);
    }
})

// ---------- Location Data Base Form -------------

Template.locationDataBaseForm.helpers({
    satellites() {
        var sats = Satellites.find().fetch();
        return _.map(sats, function (item) {
            return {
                text: item.name,
                value: item.name
            }
        })
    },
    beams() {
        var channels = Channels.find({satellite:this.satellite}).fetch();
        var uplink_beams = _.pluck(channels,'uplink_beam');
        var downlink_beams = _.pluck(channels,'downlink_beam');
        var beams = uplink_beams.concat(downlink_beams);
        return _.map(_.uniq(beams), function(item){
            return {
                text: item,
                value: item
            };
        });
    },
    types() {
        return [
            {
                text: 'EIRP',
                value: 'downlink'
            },
            {
                text: 'G/T',
                value: 'uplink'
            }
        ]
    }
})

Template.locationDataBaseForm.events({
    'change .satellite': function(e){
        var sat = $(e.currentTarget).find('option:selected').val();
        var channels = Channels.find({satellite:sat}).fetch();
        var uplink_beams = _.pluck(channels,'uplink_beam');
        var downlink_beams = _.pluck(channels,'downlink_beam');
        var beams = uplink_beams.concat(downlink_beams);
        var choices = _.map(_.uniq(beams), function(item){
            return {
                text: item,
                value: item
            };
        });

        var beam_div_node = $(e.currentTarget).parent('div').siblings('.beam-div').empty().get(0);

        var beam_data = {
            'class': 'beam',
            choices: choices,
            selected: choices[0].value
        }
        UI.insert(UI.renderWithData(Template.dropdown,beam_data),beam_div_node);

    },
    'click .remove-data': function(e){
        // remove the row of MCG of the clicked button
        e.preventDefault();
        // Remove the row
        $(e.currentTarget).parents('.form-group').remove();
    }
})
