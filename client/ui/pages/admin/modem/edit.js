/**
 * Created by Dome on 7/2/14 AD.
 */
import { Modems } from '/imports/api/modems'

Template.modemEdit.helpers({
    modem() {
        return Modems.findOne({_id: FlowRouter.getParam('_id')})
    }
})

Template.modemEdit.events({
    'submit form': function(e, t){
        e.preventDefault();

        // validate and insert modem
        var name = $('#name').val();
        var vendor = $('#vendor').find('option:selected').val();

        // warning messages
        var warning_messages = [];
        var msg_count = $('.warning-message').length;
        for(var j = 0; j < msg_count; j++){
            var msg = $('.warning-message:eq(' + j + ')').val();
            if( msg != ""){
                warning_messages.push(msg);
            }
        }

        // find the number of application by count the app-name text box
        var app_count = $('.app-name').length;

        var apps = [];

        // loop through applications
        for(var i = 0; i < app_count; i++){
            console.log('Searching app ' + (i + 1) + ' of ' + app_count);
            var app_name = $('.app-name:eq(' + i + ')').val();
            console.log('App name = ' + app_name);
            var app_type = $('.app-type:eq(' + i + ')').find('option:selected').val();
            console.log('Type = ' + app_type);
            var acm = $('.app-acm:eq(' + i + ')').is(':checked');
            console.log('ACM = ' + acm);
            var link_margin = Number($('.app-link-margin:eq(' + i + ')').val());
            console.log('Link margin = ' + link_margin);
            var min_sym_rate = Number($('.app-min-symbol-rate:eq(' + i + ')').val());
            console.log('Min Sym Rate = ' + min_sym_rate);
            var max_sym_rate = Number($('.app-max-symbol-rate:eq(' + i + ')').val());
            console.log('Max Sym Rate = ' + max_sym_rate);
            if(min_sym_rate > max_sym_rate){
                alert('Minimum symbol rate cannot be greater than maximum symbol rate.');
                return false;
            }
            var sym_rates = $('.app-symbol-rates:eq(' + i + ')').val();
            // cut out spaces
            sym_rates = sym_rates.replace(" ","");
            var sym_rates_arr = [];
            if(sym_rates != ""){
                var temp = sym_rates.split(',');
                for(var j = 0; j < temp.length; j++){
                    console.log('Sym rate ' + (j+1) + ' = ' + parseInt(temp[j]));
                    sym_rates_arr.push(parseInt(temp[j]));
                }
            }
            console.log('Symbol rates = ' + sym_rates);
            var roll_off_factor = Number($('.app-roll-off-factor:eq(' + i + ')').val());
            console.log('Roll off factor = ' + roll_off_factor);
            // MCGs
            // Get the closest .mcg-form to the button to insert the new MCG insert boxes to the correct application
            // (prevent click add button and insert the new MCG boxes into all applications
            var mcg_title_form_group = $('.mcg-title:eq(' + i + ')');
            var add_mcg_button_form_group = $('.add-mcg:eq(' + i + ')').parents('.form-group');
            var mcg_form_groups = mcg_title_form_group.nextUntil(add_mcg_button_form_group, '.mcg-form');
            var mcgs = [];
            // loop each mcg
            _.each(mcg_form_groups, function(item){
                var mcg_name = $(item).find('.mcg-name').val();
                var mcg_mbe = Number($(item).find('.mcg-mbe').val());
                var mcg_es_no = Number($(item).find('.mcg-es-no').val());
                console.log('MCG: name = ' + mcg_name + ' MBE = ' + mcg_mbe + ' Es/No = ' + mcg_es_no);
                mcgs.push({
                    name: mcg_name,
                    spectral_efficiency: mcg_mbe,
                    es_no: mcg_es_no
                });
            });
            apps.push({
                name: app_name,
                type: app_type,
                acm: acm,
                link_margin: link_margin,
                minimum_symbol_rate: min_sym_rate,
                maximum_symbol_rate: max_sym_rate,
                symbol_rates: sym_rates_arr,
                roll_off_factor: roll_off_factor,
                mcgs: mcgs
            })
        }

        var _id = FlowRouter.getParam('_id')

        Modems.update({_id: _id},{
            $set: {
                name: name,
                vendor: vendor,
                warning_messages: warning_messages,
                applications: apps
            }
        }, function(error){
            if(error){
                alert(error.reason);
            }
            else{
                FlowRouter.go('modemView',{_id: _id});
            }
        });

    }


})