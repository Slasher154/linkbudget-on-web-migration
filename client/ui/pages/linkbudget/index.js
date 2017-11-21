/**
 * Created by Dome on 4/24/14 AD.
 */
import { Antennas } from '/imports/api/antennas';
import { Bucs } from '/imports/api/bucs';
import { Modems } from '/imports/api/modems';
import { Channels } from '/imports/api/channels';

Template.index.created = () => {

}

Template.index.rendered = function(){

}

Template.index.events({
    'submit form': function (e) {
        e.preventDefault();

    },
    'click #submit': function (e) {
        e.preventDefault();

        // Validate the input
        var request_name = $('#request-name').val();
        if(request_name == ""){
            alert('Please input name for this request');
            return false;
        }

        // check if any satellite is selected
        var satellite = Session.get('satellite');
        if (!satellite) {
            alert('Please select satellite.');
            return false;
        }

        var assumptions = {
            request_name: request_name,
            satellite: satellite.name
        };

        // check if broadband or conventional

        if (Session.get('isConventional')) {
            // check if any beam is selected
            var beam = Session.get('beam');
            if (!beam) {
                alert('Please select beam.');
                return false;
            }

            var channels;
            var hub_antenna;
            var hub_location;
            var remote_antennas;
            var remote_locations;
            var platform;
            var selectedConventionalPlatform;
            var selectedBcPlatform;
            var fwdSelectedMcgs = [];
            var rtnSelectedMcgs = [];
            var selectedBt;
            var selectedVsatModem;
            var linkMargin;
            var fixMcg = false;
            

            // check if any channel is selected
            channels = $('.conventionalChannels').find('label.active').map(function () {
                return $(this).find('input').val();
            }).get();
            console.log('Selected channels: ' + channels.join(','));
            if (channels.length <= 0) {
                alert('Please select at least 1 satellite channel.');
                return false;
            }

            // check if hub size is valid
            var hub = $('#hub-size').val();
            console.log('Hub size: ' + hub + ' m.')
            if (hub === '' || hub < 0) {
                alert('Hub size is not valid.');
                return false;
            }
            else{
                // create antenna object
                hub_antenna = {
                    type: "Standard",
                    name: hub + " m",
                    size: hub
                }
            }

            // check if location is valid
            // TODO: Wait for the location database
            hub_location = $('#hub-location').val();
            console.log('Hub location: ' + hub_location);

            // check if remote antenna size is valid
            var ant = $('#remote-size').val();
            console.log('Remote size: ' + ant + ' m.');
            if (ant === '' || ant < 0) {
                alert('Remote size is not valid.');
                return false;
            }
            else{
                // convert select remote antennas to an array of antenna object
                remote_antennas = [{
                   type: 'Standard',
                   name: ant + " m",
                   size: ant
                }];
            }

            // check if remote location is valid
            remote_locations = $('#selected-locations').find('span').map(function () {
                return $(this).html();
            }).get();
            console.log('Selected locations: ' + remote_locations.join(','));
            if (remote_locations.length <= 0) {
                alert('Please select at least 1 remote location.');
                return false;
            }

            // check if any platform (BC/VSAT) is selected
            selectedConventionalPlatform = Session.get('selectedConventionalPlatform');
            console.log('Selected conventional platform: ' + selectedConventionalPlatform);
            if (!selectedConventionalPlatform) {
                alert('Please select platform.');
                return false;
            }

            // if BC is selected, check if any application is selected (DVB-S1/DVB-S2)
            // also check if any MCG and BT product is selected
            if (selectedConventionalPlatform === "BC") {
                selectedBcPlatform = Session.get('selectedBcPlatform');
                console.log('Selected BC Platform: ' + selectedBcPlatform);
                if (!selectedBcPlatform) {
                    alert('Please select broadcast application.');
                    return false;
                }
                else{
                    // set platform = DVB-S1 or DVB-S2
                    platform = Modems.findOne({name:"Standard " + selectedBcPlatform});
                }

                fwdSelectedMcgs = $('.bcMcg').find(':checked').map(function () {
                    return $(this).val();
                }).get();
                console.log('Select MCGs: ' + fwdSelectedMcgs.join(','));
                if (fwdSelectedMcgs.length <= 0) {
                    alert('Please select at least 1 MCG.');
                    return false;
                }

                selectedBt = $('#bt-product').find('option:selected').val();
                console.log('BT Product: ' + selectedBt);
                if (selectedBt === '') {
                    alert('Please select BT product.');
                    return false;
                }

                // set link margin 2 dB for C-Band and 5 dB for Ku-Band
                // check first selected channel if it's Ku or C Band (user cannot select both C and Ku-Band in 1 request so all channels would be either Ku or C)
                var cf = Channels.findOne({name:channels[0]}).uplink_cf;
                if(cf < 8 && cf > 2.8){ // C-Band
                    linkMargin = 2;
                }
                else if(cf < 16 && cf > 9){ // Ku-Band
                    linkMargin = 5;
                }

            }

            // if VSAT is selected, check modem and link margin
            if (selectedConventionalPlatform === "VSAT") {
                selectedVsatModem = Session.get('modemId');
                console.log('Select VSAT modem: ' + selectedVsatModem);
                if (!selectedVsatModem || selectedVsatModem === '') {
                    alert('Please select modem.');
                    return false;
                }
                else{
                    platform = Modems.findOne({_id:selectedVsatModem});

                    var fwd_mcg_choice = $('input[name=fwd-mcg-options]:checked').val();
                    var rtn_mcg_choice = $('input[name=rtn-mcg-options]:checked').val();
                    console.log('VSAT FWD MCG type: ' + fwd_mcg_choice);
                    console.log('VSAT RTN MCG type: ' + rtn_mcg_choice);

                    if(fwd_mcg_choice != rtn_mcg_choice){
                        alert('Both forward and return mcg options must be the same.');
                        return false;
                    }

                    if(fwd_mcg_choice == 'fix-mcg'){
                        fwdSelectedMcgs = $('.fwd-mcgs').find(':checked').map(function () {
                            return $(this).val();
                        }).get();

                        fixMcg = true;
                    }
                    console.log('Select FWD MCGs: ' + fwdSelectedMcgs.join(','));
                    if(rtn_mcg_choice == 'fix-mcg'){
                        rtnSelectedMcgs = $('.rtn-mcgs').find(':checked').map(function () {
                            return $(this).val();
                        }).get();
                    }
                    console.log('Select RTN MCGs: ' + rtnSelectedMcgs.join(','));

                }

                linkMargin = $('#link-margin').val();
                console.log('Link margin: ' + linkMargin + " dB");
                if (linkMargin < 0 || linkMargin === '') {
                    alert('Invalid link margin.');
                    return false;
                }
            }

            // add elements into assumption object
            _.extend(assumptions,{
                beam: beam,
                channels: channels,
                hub_antenna: hub_antenna,
                hub_location: hub_location,
                remote_antennas: remote_antennas,
                remote_locations: remote_locations,
                platform: platform,
                fwd_fix_mcgs: fwdSelectedMcgs,
                rtn_fix_mcgs: rtnSelectedMcgs,
                bt: selectedBt,
                modem: selectedVsatModem,
                link_margin: linkMargin
            })
        }

        if (Session.get('isBroadband')) {
            // check if any country is selected
            var country = Session.get('country');
            if (!country) {
                alert('Please select country.');
                return false;
            }

            var findBestChannel = Session.get('findBestChannel');
            var findMaxContour = Session.get('findMaxContour');
            var selectedChannels = [];
            var selectedDefinedContours = [];
            var selectedLatLon = [];
            var remote_locations = [];
            var recommendAntenna;
            var selectedAntennas = [];
            var recommendBuc;
            var selectedBucs = [];
            var modem;
            var fixMcg;

            console.log("Find best channel: " + findBestChannel);
            console.log("Find max contour: " + findMaxContour);

            // check if best beam option is selected
            if (!findBestChannel) {
                // check if any channel is selected
                selectedChannels = $('#broadbandChannels').find('label.active').map(function () {
                    return $(this).find('input').val();
                }).get();
                console.log("Selected Channels: " + selectedChannels);
                if (selectedChannels.length <= 0) {
                    alert('Please select at least 1 channel.');
                    return false;
                }

                // check if max contour is selected
                if (!findMaxContour) {
                    // check if any defined contours or lat/lon is selected
                    selectedDefinedContours = $('#definedContours').find('label.active').map(function () {
                        return $(this).find('input').val();
                    }).get();
                    //console.log('Selected Defined contours: ' + selectedDefinedContours);
                    selectedLatLon = $('#selected-locations').find('span').map(function () {
                        return $(this).html();
                    }).get();
                    //console.log('Selected lat/lon: ' + selectedLatLon.join(','));
                    var latlons = [];
                    if (selectedLatLon.length > 0) {
                        //check if each latlon is valid
                        latlons = _.map(selectedLatLon, function (item) {
                            if (!CheckLatLon(item)) {
                                alert('Lat/Lon is not valid.');
                                return false;
                            }
                            else{
                               var lat = Number(item.split(',')[0]);
                               var lon = Number(item.split(',')[1]);
                               console.log('Lat = ' + lat + ', Lon = ' + lon);
                               return {lat:lat,lon:lon};
                            }
                        })
                    }
                    // check if any location is selected
                    if (selectedDefinedContours.length <= 0 && selectedLatLon.length <= 0) {
                        alert('Please select at least 1 location.');
                        return false;
                    }

                    // merge lat/lon and defined contours to one array
                    remote_locations = selectedDefinedContours.concat(latlons);
                }
            }
            else {
                //check if any lat/lon is selected
                var latlons = [];
                selectedLatLon = $('#selected-locations').find('span').map(function () {
                    return $(this).html();
                }).get();
                if (selectedLatLon.length > 0) {
                    //check if each latlon is valid
                    latlons = _.map(selectedLatLon, function (item) {
                        if (!CheckLatLon(item)) {
                            alert('Lat/Lon is not valid.');
                            return false;
                        }
                        else{
                            var lat = Number(item.split(',')[0]);
                            var lon = Number(item.split(',')[1]);
                            console.log('Lat = ' + lat + ', Lon = ' + lon);
                            return {lat:lat,lon:lon};
                        }
                    })
                }
                if (selectedLatLon.length <= 0) {
                    alert('Please select at least 1 location.');
                    return false;
                }
                else{
                    remote_locations = latlons;
                }
            }

            console.log("Remote locations = " + remote_locations.join(","));

            // check if recommend antenna is selected
            recommendAntenna = Session.get('recommendAntenna');
            console.log("Recommend Antenna: " + recommendAntenna);

            // check if any antenna is selected
            if (!recommendAntenna) {
                var ants = $('#antennaPicker').find('option:selected').map(function () {
                    return $(this).val();
                }).get();
                if (ants.length <= 0) {
                    alert('Please select at least 1 antenna.');
                    return false;
                }
                else{
                    // set array of antenna objects to our select antenna ids
                    selectedAntennas = Antennas.find({_id:{$in:ants}}).fetch();
                }
            }
            console.log('Select antennas = ' + _.pluck(selectedAntennas,'name'));

            // check if any BUC is selected
            recommendBuc = Session.get('recommendBuc');
            console.log("Recommend BUC: " + recommendBuc)

            // check if any buc is selected
            if (!recommendBuc) {
                var bucs = $('#bucPicker').find('option:selected').map(function () {
                    return $(this).val();
                }).get();
                console.log('Selected bucs: ' + bucs.join(','));
                if (bucs.length <= 0) {
                    alert('Please select at least 1 buc size.');
                    return false;
                }
                else{
                    selectedBucs = Bucs.find({_id:{$in:bucs}}).fetch();
                }
            }
            console.log('Select bucs = ' + _.pluck(selectedBucs,'name'));

            // check if any platform is selected
            modem = Modems.findOne({_id:Session.get('modemId')});
            console.log('Selected modem: ' + modem.name);
            if (!modem || modem === '') {
                alert('Please select modem.');
                return false;
            }

            var fwd_mcg_choice = $('input[name=fwd-mcg-options]:checked').val();
            var rtn_mcg_choice = $('input[name=rtn-mcg-options]:checked').val();

            if(fwd_mcg_choice != rtn_mcg_choice){
                alert('Both forward and return mcg options must be the same.');
                return false;
            }

            if(fwd_mcg_choice == 'fix-mcg'){
                fwdSelectedMcgs = $('.fwd-mcgs').find(':checked').map(function () {
                    return $(this).val();
                }).get();

                fixMcg = true;
            }
            if(rtn_mcg_choice == 'fix-mcg'){
                rtnSelectedMcgs = $('.rtn-mcgs').find(':checked').map(function () {
                    return $(this).val();
                }).get();
            }
            /*
            // check if calculate at fixed MCG is selected
            fixMcg = false || $('#fixMcg').is(':checked');
            console.log('Fix MCG: ' + fixMcg)
            */
            // add elements into assumption object
            _.extend(assumptions,{
                country: country,
                findBestChannel: findBestChannel,
                findMaxContour: findMaxContour,
                channels: selectedChannels,
                remote_locations: remote_locations,
                recommendAntenna: recommendAntenna,
                remote_antennas: selectedAntennas,
                recommendBuc: recommendBuc,
                bucs: selectedBucs,
                platform: modem,
                fwd_fix_mcgs: fwdSelectedMcgs,
                rtn_fix_mcgs: rtnSelectedMcgs,
                no_acm: fixMcg
            })
        }

        // get the bandwidth
        var bwUnit;
        var bandwidth = [];

        // check if bandwidth unit is selected
        bwUnit = $('#bwUnitPicker').find('option:selected').val();
        if(bwUnit===''){
            alert('Please select bandwidth unit.');
            return false;
        }

        // check if at least 1 bandwidth is input for the case of FWD/RTN value
        // (broadband satellite or conventional VSAT platform)
        if(Session.get('isBroadband') || Session.get('selectedConventionalPlatform')==='VSAT') {
            var $bwRows = $('.rowBw');
            $bwRows.each(function () {
                var bwFwd = $(this).find('.fwd').val();
                var bwRtn = $(this).find('.rtn').val();
                if (!(bwFwd === '' || bwRtn === '')) {
                    bandwidth.push({'fwd': bwFwd, 'rtn': bwRtn});
                }
            })
            console.log("Bandwidth");
            _.each(bandwidth, function (item) {
                console.log(item.fwd + "/" + item.rtn + " " + bwUnit);
            })
            if (bandwidth.length <= 0) {
                alert('Please input at least 1 bandwidth.');
            }
        }
        // broadcast platform
        else{
            // this object will have forward bandwidth only
            bandwidth.push({fwd:$('.oneWayBw').val(),rtn:0});
            console.log("Bandwidth: " + bandwidth.join(',') + " " + bwUnit);
        }
        _.extend(assumptions,{
            unit: bwUnit,
            bandwidths: bandwidth
        })
        console.log(JSON.stringify(assumptions));

        NProgress.start();
        Meteor.call('link_calc', assumptions, function(error, message) {
            NProgress.done();
            if (error){
                alert(error.reason);
            } else {

                //Clear all sessions so when the user click the link to homepage from other page after they perform some link calc
                // The data from last request is cleared
                Session.keys = {};

                // the method returns id of the link requests we just inserted to the database
                // so we redirect to the result page of the link budget
                console.log(JSON.stringify(message));
                FlowRouter.go('results',{_id: message});
            }
        });

    }


})

// check if input lat-lon text is valid
// the valid lat-lon is in the form lat,lon => -89,-179
function CheckLatLon(text) {

    // test regular expression for number,number first
    if (!text.match(/[-.0-9]+[,][-.0-9]+/)) {
        console.log('Regex does not match')
        return false;
    }
    // get lat from the number before comma
    var lat = text.split(',')[0];
    var lon = text.split(',')[1];

    // return false if lat and lon is not a number (NaN = not a number)
    if (isNaN(lat) || isNaN(lon)) {
        console.log('lat,lon is not a number')
        return false;
    }
    // check if lat is between -90 and 90 , lon is between -180 to 180
    else if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        console.log('lat, lon is not within correct range.')
        return false;
    }
    return true;
}