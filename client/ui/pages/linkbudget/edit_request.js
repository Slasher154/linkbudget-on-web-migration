/**
 * Created by Dome on 7/18/14 AD.
 */

Template.editRequest.rendered = function () {
    var assumption = LinkRequests.findOne({_id: this.data._id}).assumptions;

    console.log(assumption);

    // Clear all sessions to prevent undesired effects
    Session.keys = {};

    // We will trigger the DOM based on the assumption user want to edit

    // Request name
    $('#request-name').val(assumption.request_name);

    // Select satellite
    $('.sat-picker input[name="' + assumption.satellite + '"]').parent('label').trigger('click');

    // If it is conventional satellite, the assumption has 'beam' property, otherwise (IPSTAR), it has country property
    var beamOrCountry = _.has(assumption, 'beam') ? assumption.beam : assumption.country;

    // Delay the change in dropdown because the dropdown content needed to successfully loaded first from the select satellite
    setTimeout(function () {
        $('select.beam-country').val(beamOrCountry).change();
    }, 100)

    // Trigger click events for channels, need to delay more than dropdown change because we need to load that first
    setTimeout(function () {
        _.each(assumption.channels, function (item) {
            $('.channel-picker input[name="' + item + '"]').parent('label').trigger('click');
        });
        // Trigger find best channel if it is selected
        if (_.has(assumption, 'findBestChannel') && assumption.findBestChannel) {
            $('#findBestChannel').click();
        }
    }, 500);

    // Ground segments : Delay by 1 second to wait those on satellite segments to be completely loaded
    setTimeout(function () {

        // Conventional
        if (Satellites.findOne({name: assumption.satellite}).type == "Conventional") {


            // Set Hub Antenna by set the value from assumption into textbox
            $('#hub-size').val(assumption.hub_antenna.size);

            // Set Hub Location by set the value from assumption into textbox
            $('#hub-location').val(assumption.hub_location);

            // Set Remote Antenna by set the value from assumption into textbox
            $('#remote-size').val(assumption.remote_antennas[0].size);

            // Set Remote Location by set the value from assumption into Session 'SelectedLocs' parameters
            Session.set('selectedLocations', assumption.remote_locations);


            // if Modem name is "Standard DVB-S1" or "Standard DVB-S2: so it's BC
            if (assumption.platform.name == "Standard DVB-S1" || assumption.platform.name == "Standard DVB-S2") {
                setTimeout(function () {
                    // Trigger the BC button click
                    $('.conventional-platform-picker input[name="BC"]').parent('label').trigger('click');
                }, 100)
                setTimeout(function () {
                    // Trigger the DVB-S1 or DVB-S2 click
                    $('#bcPlatformSelector input[name="' + assumption.platform.applications[0].name + '"]').parent('label').trigger('click');
                }, 300);
                setTimeout(function () {

                    // We can trigger all other elements (MCG,BT,Unit,BW) here because after we click DVB-S1,DVB-S2 all other elements will got rendered

                    // Trigger the checkboxes of DVB-S1 or DVB-S2 modcodes to tick the value in assumptions
                    _.each(assumption.fwd_fix_mcgs, function (item) {
                        $('.bcMcg input[name="' + item + '"]').trigger('click');
                    });

                    // Trigger the BT Product selector to change to value in the assumptions
                    $('#bt-product').val(assumption.bt).change();

                    // Trigger the Unit selector to change to value in the assumptions
                    $('#bwUnitPicker').val(assumption.unit).change();

                    // Change the value in the bandwidth textbox
                    $('.oneWayBw').val(assumption.bandwidths[0].fwd);
                }, 500);

            }
            else {
                setTimeout(function () {
                    // Trigger VSAT Button click
                    $('.conventional-platform-picker input[name="VSAT"]').parent('label').trigger('click');
                }, 100)

                setTimeout(function () {
                    // Trigger Modem Selector
                    $('#modemPicker').val(assumption.platform._id).change();

                    // Change the value in the link margin textbox
                    $('#link-margin').val(assumption.link_margin);

                    // Trigger the fix mcg if any
                    TriggerFixMcg();




                }, 300)

                setTimeout(function () {

                    // Trigger the Unit selector to change to value in the assumptions
                    $('#bwUnitPicker').val(assumption.unit).change();

                    // Change the bandwidth value for forward and return link
                    for (var i = 0; i < assumption.bandwidths.length; i++) {
                        var bwObj = assumption.bandwidths[i];
                        // for first bandwidth object, we put in the box which is already rendered in the UI
                        if (i == 0) {
                            $('.fwd').val(bwObj.fwd);
                            $('.rtn').val(bwObj.rtn);
                        }
                        // clone the textbox and append under the current textbox
                        else {
                            //Add row
                            $('.rowBw:first').clone().appendTo('#bwRows');
                            // Change the value of the last row (which we just added)
                            $('.rowBw:last .fwd').val(bwObj.fwd);
                            $('.rowBw:last .rtn').val(bwObj.rtn);
                        }
                    }
                    // Set the session of bandwidth row count
                    Session.set('bwRowCount', assumption.bandwidths.length);
                }, 500)

            }

        }

        // Broadband
        if (Satellites.findOne({name: assumption.satellite}).type == "Broadband") {

            // Set the bootstrap-select antenna picker to the value from assumptions
            // reference http://silviomoreto.github.io/bootstrap-select/
            $('#antennaPicker').selectpicker('val', _.pluck(assumption.remote_antennas,'_id'));
            $('#antennaPicker').selectpicker('refresh');

            // Set the bootstrap-select buc picker to the value from assumptions
            $('#bucPicker').selectpicker('val', _.pluck(assumption.bucs,'_id'));
            $('#bucPicker').selectpicker('refresh');

            // Loop through remote locations
            _.each(assumption.remote_locations,function(item){
                var selectedLatLons = [];
                // check if it's string ("Peak","50%","EOC,"EOC-2")
                if(typeof item == "string"){
                    $('#definedContours input[name="' + item + '"]').parent('label').trigger('click');
                }
                // check if it's lat/lon object, we push into the array first
                else if(typeof item == "object"){
                    var loc = item.lat + "," + item.lon;
                    selectedLatLons.push(loc);
                }
                else{}

                // if there is any lat/lons, set it to session parameter so it appears as selected locations in the page
                Session.set('selectedLocations',selectedLatLons);

            });

            // Trigger Modem Selector
            $('#modemPicker').val(assumption.platform._id).change();

            // Trigger fix mcg if any
            TriggerFixMcg();

            // Delay for set unit and bandwidth because it appears after we select modem
            setTimeout(function(){

                // Trigger the Unit selector to change to value in the assumptions
                $('#bwUnitPicker').val(assumption.unit).change();

                // Change the bandwidth value for forward and return link
                for (var i = 0; i < assumption.bandwidths.length; i++) {
                    var bwObj = assumption.bandwidths[i];
                    // for first bandwidth object, we put in the box which is already rendered in the UI
                    if (i == 0) {
                        $('.fwd').val(bwObj.fwd);
                        $('.rtn').val(bwObj.rtn);
                    }
                    // clone the textbox and append under the current textbox
                    else {
                        //Add row
                        $('.rowBw:first').clone().appendTo('#bwRows');
                        // Change the value of the last row (which we just added)
                        $('.rowBw:last .fwd').val(bwObj.fwd);
                        $('.rowBw:last .rtn').val(bwObj.rtn);
                    }
                }
                // Set the session of bandwidth row count
                Session.set('bwRowCount', assumption.bandwidths.length);

            },500)

        }
    }, 1000)


    function TriggerFixMcg(){
        setTimeout(function(){
            if(assumption.fwd_fix_mcgs.length > 0){
                $('.fix-mcg[name=fwd-mcg-options]').trigger('click');
                // select the fixed modcods checkboxes
                setTimeout(function(){
                    _.each(assumption.fwd_fix_mcgs, function (item) {
                        $('.fwd-mcgs input[name="' + item + '"]').trigger('click');
                    });
                }, 300)
            }
            if(assumption.rtn_fix_mcgs.length > 0){
                $('.fix-mcg[name=rtn-mcg-options]').trigger('click');
                // select the fixed modcods checkboxes
                setTimeout(function(){
                    _.each(assumption.rtn_fix_mcgs, function (item) {
                        $('.rtn-mcgs input[name="' + item + '"]').trigger('click');
                    });
                }, 300)
            }
        }, 300)
    }


}

Template.editRequest.request_name = function(){
    return LinkRequests.findOne({_id: this._id}).assumptions.request_name;
}