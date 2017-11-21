/**
 * Created by Dome on 7/25/14 AD.
 */
import { Modems } from '/imports/api/modems';

Template.modemSelectMcg.helpers({
    fwd() {
        var modem = Modems.findOne({_id:Session.get('modemId')});
        var fwd_app = _.where(modem.applications, {type: 'forward'});
        // if forward app is found, use that app, otherwise use an only app in that platform
        var app = fwd_app.length != 0 ? fwd_app[0] : modem.applications[0];
        return {
            label: "Forward",
            name: "fwd",
            app: app
        };
    },
    rtn() {
        var modem = Modems.findOne({_id:Session.get('modemId')});
        var rtn_app = _.where(modem.applications, {type: 'return'});
        // if return app is found, use that app, otherwise use an only app in that platform
        var app = rtn_app.length != 0 ? rtn_app[0] : modem.applications[0];
        return {
            label: "Return",
            name: "rtn",
            app: app
        };
    }
})

Template.modemSelectMcg.rendered = function(){
    $('.mcg-checkboxes').hide();
}

Template.modemSelectMcg.events({
    // Trigger show/hide the selected MCG based on choice

    'change input:radio': function(e){
        var choice = $(e.currentTarget).val();
        // if user selects to manually select MCG, show the MCG choice
        if(choice=="fix-mcg"){
            $(e.currentTarget).parents('.form-group').next('.mcg-checkboxes').show();
        }
        else{
            $(e.currentTarget).parents('.form-group').next('.mcg-checkboxes').hide();
        }
    }

})