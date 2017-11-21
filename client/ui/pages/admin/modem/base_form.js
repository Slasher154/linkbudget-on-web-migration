/**
 * Created by Dome on 7/1/14 AD.
 */
import { ModemVendors } from '/imports/api/modem_vendors';


Template.modemBaseForm.helpers({
    vendors() {
        var vendors = ModemVendors.find().fetch();
        return _.map(vendors, function (item) {
            return {
                text: item.name,
                value: item.name
            }
        })
    }
})

Template.modemBaseForm.events({
    'click .add-app': function(e){
        e.preventDefault();
        // default app data
        var app = {
            name: "",
            acm: false,
            link_margin: 2,
            minimum_symbol_rate: 300,
            maximum_symbol_rate: 30000,
            symbol_rates: [],
            roll_off_factor: 1.2,
            mcgs: [{
                name: "QPSK 1/2",
                spectral_efficiency: 1,
                es_no: 1.9
            }]
        };
        UI.insert(UI.renderWithData(Template.applicationBaseForm,app),$('form').get(0),$('.add-app').parents('.form-group').get(0));
    }

})

Template.applicationBaseForm.helpers({
    app_types() {
        return [
            {
                text: "Forward (Use in hub to remote links only",
                value: 'forward'
            },
            {
                text: "Return (Use in remote to hub links only",
                value: 'return'
            },
            {
                text: "Broadcast (Use in the broadcast applications)",
                value: 'Broadcast'
            },
            {
                text: "SCPC (Use this application in both forward and return link)",
                value: 'SCPC'
            }
        ]
    }
})

Template.applicationBaseForm.events({
    'click .add-mcg': function(e){
        // add another row of Add MCG
        e.preventDefault();
        // Get the closest .mcg-form to the button to insert the new MCG insert boxes to the correct application
        // (prevent click add button and insert the new MCG boxes into all applications
        var top_border_hr = $(e.currentTarget).parents('.form-group').prevAll('hr:first');
        var beforeNode = $(e.currentTarget).parents('.form-group').prevUntil(top_border_hr,'.mcg-form:first').next().get(0);
        if(_.isUndefined(beforeNode)){
            beforeNode = $(e.currentTarget).parents('.form-group').get(0);
        }
        UI.insert(UI.render(Template.mcgBaseForm),$('form').get(0),beforeNode);
    },
    'click .remove-app': function(e){
        e.preventDefault();
        // remove all the form-group of this application
        // find <hr> which this application lies between
        var top_border_hr = $(e.currentTarget).parents('.form-group').prevAll('hr:first');
        var bottom_border_hr = $(e.currentTarget).parents('.form-group').nextAll('hr:first');
        top_border_hr.nextUntil(bottom_border_hr,'.form-group').remove();
        top_border_hr.remove();
        bottom_border_hr.remove();
    }
})

Template.mcgBaseForm.events({
    'click .remove-mcg': function(e){
        // remove the row of MCG of the clicked button
        e.preventDefault();
        // Remove the row
        $(e.currentTarget).parents('.form-group').remove();
    }
})

Template.modemBaseForm.events({
    'click .add-message': function(e){
        e.preventDefault();
        var beforeNode = $(e.currentTarget).parents('form').find('.warning-message-form:last').next().get(0);
        if(_.isUndefined(beforeNode)){
            beforeNode = $(e.currentTarget).parents('form').find('.form-group:eq(1)').next().get(0);
        }
        UI.insert(UI.render(Template.warningMessagesForm),$('form').get(0),beforeNode);
    }
})

Template.warningMessagesForm.events({
    'click .remove-message': function(e){
        e.preventDefault();
        // Remove the row
        $(e.currentTarget).parents('.form-group').remove();
    }
})