/**
 * Created by Dome on 5/19/14 AD.
 */
import '/imports/lib/util';
import '/imports/api/users/users';
import { LinkRequests } from '/imports/api/link_requests';
import { Antennas } from '/imports/api/antennas';
import { Bucs } from '/imports/api/bucs';
import { Channels } from '/imports/api/channels';
import { Satellites } from '/imports/api/satellites';
import { Gateways } from '/imports/api/gateways';
import { Constants } from '/imports/api/constants';
import { Locations } from '/imports/api/locations';
import { GainImprovements } from '/imports/api/gain_improvements';
import { RainData } from '/imports/api/rain_data';

var warning_messages = [];

Meteor.methods({
    'link_calc': function (assumptions) {
        var lb = new LinkBudget();
        var current_timestamp = new Date();
        console.log('user = ' + Meteor.user());
        var link_req_obj = {
            assumptions: assumptions,
            results: lb.calc(assumptions),
            requestor_id: Meteor.user()._id,
            requestor_name: ToTitleCase(Meteor.user().fullName()),
            requested_date: Date.parse(current_timestamp.toString())
        }
        // extend the object with warning messages
        _.extend(link_req_obj,{warning_messages:warning_messages});
        // push the case number into the result
        for (var i = 0; i < link_req_obj.results.length; i++) {
            _.extend(link_req_obj.results[i], {"case_num": i + 1});
        }
        return LinkRequests.insert(link_req_obj);
    }
});


// Class that manages the link input and call the Link() for each input

function LinkBudget() {

    // Manage the input parameters from the input page, loop them and run each link
    return {
        calc: function (data) {

            console.log("Input data is " + data);

            var channels = [], remote_antennas = [], remote_locations = [], bucs = [], downlink_adj_sat_interferences = [];
            // check if user selects to find best channel, loop each lat/lon and find best channel first
            // in the spot beams type, the best channel will be determined from the forward beam

            var remote_locs = data.remote_locations;
            if (data.findBestChannel) {
                console.log("Finding best channels");
                //channels = GetBestChannels(data.satellite, data.remote_locations);
                // this functions works only for IPSTAR satellite
                _.each(remote_locs, function (item) {
                    var best_beam = Meteor.call('get_best_beam', item, data.satellite, data.country);

                    // return the channel name of the best beam
                    // this code is to eliminate the case where best beam name and channel name is not same ex. 212 is beam name and 212-13H / 212-3V is channel name
                    var best_chan = Channels.findOne({"downlink_beam": best_beam, country: data.country}).name;
                    if (!_.contains(channels, best_chan)) {
                        channels.push(best_chan);
                    }
                    _.extend(item, { best_channel: best_chan});
                })
            }
            else {
                // data.channels is array of channels from user selection
                channels = data.channels;
                console.log('Set channels = ' + channels);

            }

            // check if user selects recommend antenna, if yes, calculates all standard antenna, from biggest to smallest
            if (_.has(data, 'recommendAntenna') && data.recommendAntenna) {
                console.log('User has selected recommend antenna.');
                remote_antennas = Antennas.find({$query: {vendor: 'standard'}, $orderby: { size: -1}});
            }
            else {
                remote_antennas = data.remote_antennas;

            }
            console.log('Set remote antennas = ' + _.pluck(remote_antennas, 'name'));

            // max contour...not implemented yet

            // lat/lon locations
            remote_locations = remote_locs;
            console.log('Set remote locations = ' + remote_locations.join(','));

            // check if user selects recommend buc, if yes, calculates all standard buc, from biggest to smallest
            if (_.has(data, 'recommendBuc') && data.recommendBuc) {
                bucs = Bucs.find({$query: {vendor: 'standard'}, $orderby: { size: -1}});
            }
            else if (_.has(data, 'bucs')) {
                bucs = data.bucs;
            }
            else {
                bucs = [
                    {}
                ];
            }
            console.log('Set bucs = ' + _.pluck(bucs, 'name'));

            // setup the input parameters
            var input = {
                satellite: data.satellite,
                platform: data.platform,
                unit: data.unit
            }

            // Add platform warning messages
            AddWarningMessages(data.platform.warning_messages);

            // check if user specifies to remove ACM function (select fix MCG at platform for IPSTAR satellite)
            if (_.has(data, 'no_acm')) {
                _.each(input.platform.applications, function (app) {
                    app.acm = !data.no_acm;
                });
                console.log('User has selected fixed mod and coding >> ' + data.no_acm);
            }


            // set bt product if user specifies it
            if (_.has(data, 'bt')) {
                input.bt = data.bt;
                console.log('User has selected BT product ' + input.bt);
            }

            // set link margin if user specifies it
            if (_.has(data, 'link_margin')) {
                input.link_margin = data.link_margin;
                console.log('User has input link margin of ' + input.link_margin + ' db')
            }

            // hub antenna and location is input only for conventional satellite
            input.hub_antenna = _.has(data, 'hub_antenna') ? data.hub_antenna : {};
            input.hub_location = _.has(data, 'hub_location') ? data.hub_location : {};

            console.log('Hub antenna = ' + input.hub_antenna);
            console.log('Hub location = ' + input.hub_location);


            var results = [];

            // start looping each parameters
            for (var i = 0; i < channels.length; i++) {
                console.log('Start loop channel ' + channels[i]);

                for (var i1 = 0; i1 < remote_locations.length; i1++) {
                    console.log('Start loop remote location ' + remote_locations[i1]);

                    // if user selects find best channel, the remote location object will have the attribute 'best_beam'
                    // as we extend this object via the find best channel options

                    // if the best beam of this location does not match the channel, we just skip this loop
                    console.log('Check best beam attribute of location ' + JSON.stringify(remote_locations[i]))
                    if (typeof remote_locations[i1] === 'object' && _.has(remote_locations[i1], 'best_channel')) {
                        if (remote_locations[i1].best_channel === channels[i]) {
                            console.log('The remote locations has best channel ' + remote_locations[i1].best_channel + ' which matches channel ' + channels[i]);
                        }
                        else {
                            console.log('The remote locations has best channel ' + remote_locations[i1].best_channel + ' which does not match channel ' + channels[i]);
                            console.log('We skip this loop');
                            continue;
                        }
                    }

                    for (var i2 = 0; i2 < remote_antennas.length; i2++) {
                        console.log('Start loop remote antenna ' + remote_antennas[i2].name);
                        for (var i3 = 0; i3 < data.bandwidths.length; i3++) {
                            console.log('Start loop bandwidth: fwd ' + data.bandwidths[i3].fwd + ' ' + data.unit + ' rtn ' + data.bandwidths[i3].rtn + ' ' + data.unit);


                            var fwd_result = {}, rtn_result = {};

                            // setup the input parameters for each case
                            input.remote_location = remote_locations[i1];
                            input.remote_antenna = remote_antennas[i2];
                            input.downlink_adj_sat_interferences = downlink_adj_sat_interferences[i4];

                            // Hub to remote

                            // The following query find the channel for the given satellite name, channel name and only channel which type is forward (IPSTAR) or broadcast (conventional)
                            var fwd_channel = Channels.findOne({satellite: data.satellite, type: {$in: ['forward', 'broadcast']}, name: channels[i]});
                            var fwd_downlink_adjacent_sat_channels = GetAdjacentSatelliteChannels(fwd_channel, "downlink");

                            // Set FWD MCGs to be fixed if user input (as of now, only conventional BC allows fix MCG)
                            var fwd_mcgs = [];
                            if (_.has(data, 'fwd_fix_mcgs') && data.fwd_fix_mcgs.length > 0) {
                                fwd_mcgs = data.fwd_fix_mcgs;
                            }
                            else {
                                fwd_mcgs.push({}); // put blank object to indicates no fix MCG
                            }

                            input.channel = fwd_channel;
                            input.bw = data.bandwidths[i3].fwd; // use the forward bandwidth

                            // loop through each condition of downlink adjacent satellite interferences

                            for (var i6 = 0; i6 < fwd_downlink_adjacent_sat_channels.length; i6++) {

                                console.log('Start loop forward downlink adj.sat : ' + (i6 + 1) + ' of ' + fwd_downlink_adjacent_sat_channels.length);

                                // check if user fixes MCG, if yes, loop them and record results
                                // the program allows users to select MCG for broadcast applications only
                                input.downlink_adj_sat_interferences = fwd_downlink_adjacent_sat_channels[i6];

                                for (var i4 = 0; i4 < fwd_mcgs.length; i4++) {

                                    var fwd_mcg = fwd_mcgs[i4];
                                    console.log('Start loop fix mcg ' + fwd_mcg.name);

                                    // Set the fix MCG to the input if it is not an empty object
                                    // This will be empty object for the case user doesn't select fix MCG
                                    if (!_.isEmpty(fwd_mcg)) {
                                        input.fix_mcg = fwd_mcg;
                                    }

                                    fwd_result = hub_to_remote(input);

                                    // check if link requires remote to hub by checking if the platform is not broadcast
                                    if (input.platform.applications[0].type !== 'Broadcast') {

                                        // The following query find the channel for the given satellite name, channel name and only channel which type is forward (IPSTAR) or broadcast (conventional)
                                        console.log('Finding channel for name = ' + channels[i] + ' satellite = ' + data.satellite);
                                        var rtn_channel = Channels.findOne({satellite: data.satellite, type: {$in: ['return', 'broadcast']}, name: channels[i]});
                                        var rtn_downlink_adjacent_sat_channels = GetAdjacentSatelliteChannels(rtn_channel, "downlink");
                                        // Set FWD MCGs to be fixed if user input (as of now, only conventional BC allows fix MCG)
                                        var rtn_mcgs = [];
                                        if (_.has(data, 'rtn_fix_mcgs') && data.rtn_fix_mcgs.length > 0) {
                                            rtn_mcgs = data.rtn_fix_mcgs;
                                        }
                                        else {
                                            rtn_mcgs.push({}); // put blank object to indicates no fix MCG
                                        }

                                        // loop through each condition of downlink adjacent satellite interferences
                                        for (var i9 = 0; i9 < rtn_downlink_adjacent_sat_channels.length; i9++) {

                                            input.downlink_adj_sat_interferences = rtn_downlink_adjacent_sat_channels[i9];
                                            console.log('Start loop return downlink adj.sat : ' + (i9 + 1) + ' of ' + rtn_downlink_adjacent_sat_channels.length);

                                            // loop through return fix mcg
                                            for (var i10 = 0; i10 < rtn_mcgs.length; i10++) {

                                                console.log('Start loop return mcg');
                                                var rtn_mcg = rtn_mcgs[i10];
                                                if (!_.isEmpty(rtn_mcg)) {
                                                    input.fix_mcg = rtn_mcg;
                                                }

                                                input.channel = rtn_channel;
                                                input.bw = data.bandwidths[i3].rtn; // use the return bandwidth

                                                // loop buc if any (IPSTAR satellite link budget will find calculate for each BUC, while conventional VSAT assume BUC power is enough)
                                                for (var i5 = 0; i5 < bucs.length; i5++) {

                                                    console.log('Start loop buc ' + (i5 + 1) + ' of ' + bucs.length);
                                                    input.buc = bucs[i5];
                                                    rtn_result = remote_to_hub(input);

                                                    // store the result to the array
                                                    results.push({fwd: fwd_result, rtn: rtn_result});
                                                }
                                            }
                                        }
                                    }

                                    // else, just store the forward result along with return as empty object
                                    else {
                                        results.push({fwd: fwd_result, rtn: rtn_result});
                                    }

                                }


                            }
                        }
                    }


                }
            }

            return results;
        }
    }


// Calculates the link from hub to remote
    function hub_to_remote(data) {

        LogTitle('Start hub to remote');
        console.log('input = ' + data);

        var uplink_ant = {}, uplink_hpa = {}, uplink_loc = {}, uplink_avail = 99.5, uplink_diversity = {};
        var downlink_ant = {}, downlink_loc = {}, downlink_avail = 99.5, downlink_diversity = {}

        // ------------------------- Channel -----------------------------------------------

        // Find associated channel for the link.
        // If the input is "1G", "C01" or other conventional transponders, grab that transponder
        // If the input is "207, "514" or other IPSTAR transponders, search the name for forward channel


        var channel = data.channel;
        console.log('Set forward channel = ' + channel.name);

        if (!channel) {
            console.log('Channel is not found.');
        }

        // ------------------------- Uplink Parameters -------------------------------------

        // Check if channel has default gateway, if yes, set the uplink parameters to that gateway

        if (_.has(channel, 'default_gateway')) {
            var gateway = Gateways.findOne({name: channel.default_gateway});
            uplink_ant.size = gateway.ant_size, uplink_ant.name = gateway.ant_size + " m", uplink_ant.type = "Standard";
            uplink_hpa = gateway.hpa;
            uplink_loc = {lat: gateway.lat, lon: gateway.lon, contour: -1, name: gateway.city + " Gateway"}; // Assume -1 dB relative contour at this stage
            uplink_avail = gateway.gateway_availability; // default availability from database
            downlink_avail = gateway.remote_availability; // default availability from database

            // check if gateway has site diversity
            if (_.has(gateway, 'site_diversity')) {
                uplink_diversity = gateway.site_diversity;
            }

        }
        // Else, the uplink parameters come from user input (such as for conventional)
        else {
            uplink_ant = data.hub_antenna;

            uplink_hpa.size = 2000, uplink_hpa.category = "hpa"; // assume there is enough HPA

            // for IFL and OBO, get them from constant database
            uplink_hpa.obo = Constants.findOne({name: "hpa_obo"}).value;
            uplink_hpa.ifl = Constants.findOne({name: "uplink_ifl"}).value;

            // Find the relative contour from satellite and given location
            uplink_loc = GetLocationObject(channel, data.hub_location, "uplink");

            // Set the default link availability based on C or Ku-Band
            if (IsCBand(channel.uplink_cf)) {
                uplink_avail = Constants.findOne({name: "c_band_uplink_availability"}).value;
                downlink_avail = Constants.findOne({name: "c_band_downlink_availability"}).value;
            }
            else if (IsKuBand(channel.uplink_cf)) {
                uplink_avail = Constants.findOne({name: "ku_band_uplink_availability"}).value;
                downlink_avail = Constants.findOne({name: "ku_band_downlink_availability"}).value;
            }
            else {
                console.log('No default link avail is found, set to 99.5');
            }
        }

        console.log('Set uplink parameters: ant = ' + uplink_ant.name + " , HPA = " + uplink_hpa.size + " W");
        console.log('Uplink location = ' + uplink_loc.name + ' lat = ' + uplink_loc.lat + ' lon = ' + uplink_loc.lon + " , up avail = " + uplink_avail + "% , down avail = " + downlink_avail + "%");


        // ------------------------- Downlink Parameters -------------------------------------

        downlink_ant = data.remote_antenna;
        downlink_loc = GetLocationObject(channel, data.remote_location, "downlink");

        console.log('Set downlink ant = ' + downlink_ant.name);
        console.log('Set downlink loc = ' + downlink_loc.name);

        // ------------------------- Modem Parameters ----------------------------------------

        // set the application of this link to the forward one (for outbound-inbound systems)
        // if it's SCPC or broadcast DVB-S2 app, just use that app right away
        var fwd_app = _.where(data.platform.applications, {type: 'forward'});
        // if forward app is found, use that app, otherwise use an only app in that platform
        var app = fwd_app.length != 0 ? fwd_app[0] : data.platform.applications[0];

        console.log('Set app = ' + app.name);

        // check if user fix mcg, if yes, calculate on this fix mcg. If not, try all MCGs available in that application
        var mcgs = [];
        if (_.has(data, 'fix_mcg')) {
            // find mcg object from the mcg name
            var mcg = _.where(app.mcgs, {name: data.fix_mcg})[0];
            mcgs.push(mcg); // push a fix mcg to an array
            console.log('Calculate on this fix MCG: ' + mcgs[0].name + ' only.');
        }
        else {
            // set mcg to all MCG in reverse order (try best mcg first, in order to break when find the first mcg which pass the margin)
            mcgs = _.sortBy(app.mcgs, function (num) {
                return -(num.spectral_efficiency);
            });
            console.log('No specified MCG, try all MCGs in this app from best to worst.')
        }

        // check if user specifies the required link margin at clear sky, if not, use the app default link margin
        var link_margin = _.has(data, 'link_margin') ? data.link_margin : app.link_margin;
        console.log('Set link margin to ' + link_margin + ' dB');

        // check if user specifies the required bt, if not, use the app default bt
        var bt = _.has(data, 'bt') ? data.bt : app.roll_off_factor;
        console.log('BT = ' + bt);

        // loop through all MCG
        for (var i = 0; i < mcgs.length; i++) {
            var mcg = mcgs[i];
            LogTitle('Start loop MCG ' + mcg.name);
            var bw = get_bandwidth(app, mcg, data.unit, data.bw, bt);
            console.log('Bandwidth for mcg ' + mcg.name + ' and ' + data.bw + ' ' + data.unit + ' = ' + bw + ' MHz');
            var link_data = {
                uplink_antenna: uplink_ant,
                uplink_hpa: uplink_hpa,
                uplink_location: uplink_loc,
                downlink_antenna: downlink_ant,
                downlink_location: downlink_loc,
                channel: channel,
                app: app,
                bandwidth: bw,
                mcg: mcg,
                bt: bt,
                link_margin: link_margin,
                overused_power: 0, // as of now, not consider overused power yet
                uplink_availability: uplink_avail,
                downlink_availability: downlink_avail,
                downlink_adj_sat_interferences: data.downlink_adj_sat_interferences,
                uplink_diversity: uplink_diversity,
                downlink_diversity: downlink_diversity,
                last_mcg: i == mcgs.length - 1, // indicates that this is the last MCG
                path: "forward" // indicates that the link is hub to remote link
            }
            var cases = run_link(link_data);
            // if run_link return false, we continue to the next mcg.
            // This is the case where we calculate ACM applications and looping all MCG from best to worst and this MCG does not pass at clear sky
            // So we just skip this result
            if (!cases) {
                continue;
            }
            else {
                return cases;
                /*
                 // if fix mcg (run 1 code) return the result right away
                 if (_.has(data, 'fix_mcg')) {
                 LogTitle('End hub to remote');
                 return cases;
                 }
                 _.each(cases, function (c) {
                 console.log('uplink = ' + c.uplink_condition + " , downlink = " + c.downlink_condition);
                 })
                 //console.log(JSON.stringify(cases));

                 // if not fix mcg (run all codes), check if the clear sky result and both fade pass condition
                 var clr_result = _.filter(cases, function (re) {
                 return re.uplink_condition === "clear" && re.downlink_condition === "clear";
                 })[0];
                 var rain_result = _.filter(cases, function (re) {
                 return re.uplink_condition === "rain" && re.downlink_condition === "rain";
                 })[0];

                 // if both clear and rain pass condition, return the result (not continue for remaining mcgs as we find the pass one)
                 if (clr_result.pass && rain_result.pass) {
                 console.log('Both clear sky and rain pass result.');
                 LogTitle('End hub to remote');
                 return cases;
                 }
                 else if (i == mcgs.length - 1) { // last MCG
                 LogTitle('This is the last MCG already');
                 return cases;
                 }
                 else {
                 }
                 */
            }
        }
    }

// Calculates the link from remote to hub
    function remote_to_hub(data) {

        LogTitle('Start remote to hub');

        var uplink_ant = {}, uplink_hpa = {}, uplink_loc = {}, uplink_avail = 99.5, uplink_diversity = {};
        var downlink_ant = {}, downlink_loc = {}, downlink_avail = 99.5, downlink_diversity = {};

        // ------------------------- Channel -----------------------------------------------

        // Find associated channel for the link.
        // If the input is "1G", "C01" or other conventional transponders, grab that transponder
        // If the input is "207, "514" or other IPSTAR transponders, search the name for return channel

        var channel = data.channel;


        if (!channel) {
            console.log('Channel is not found.');
        }

        // ------------------------- Uplink Parameters -------------------------------------

        uplink_ant = data.remote_antenna;

        // check if user specifies BUC size
        if (_.has(data, 'buc') && (!_.isEmpty(data.buc))) {
            uplink_hpa = data.buc;
            console.log('Set buc = ' + uplink_hpa);
        }

        else {
            // TODO: discuss value with CND
            uplink_hpa = {
                type: 'Standard',
                category: 'HPA',
                size: 1000,
                ifl: Constants.findOne({name: 'uplink_ifl'}).value,
                obo: Constants.findOne({name: 'hpa_obo'}).value
            }
        }

        uplink_loc = GetLocationObject(channel, data.remote_location, "uplink");
        console.log('Set uplink location = ' + uplink_loc);

        // ------------------------- Downlink Parameters -------------------------------------

        // Check if channel has default gateway, if yes, set the downlink parameters to that gateway

        if (_.has(channel, 'default_gateway')) {
            var gateway = Gateways.findOne({name: channel.default_gateway});
            downlink_ant.size = gateway.ant_size;
            downlink_loc = {lat: gateway.lat, lon: gateway.lon, contour: 0, name: gateway.city + " Gateway"}; // Assume 0 dB relative contour at this stage
            uplink_avail = gateway.remote_availability; // default availability from database
            downlink_avail = gateway.gateway_availability; // default availability from database

            if (_.has(gateway, 'site_diversity')) {
                downlink_diversity = gateway.site_diversity;
            }
        }
        // Else, the uplink parameters come from user input (such as for conventional)
        else {
            downlink_ant = data.hub_antenna;

            // Find the relative contour from satellite and given location
            downlink_loc = GetLocationObject(channel, data.hub_location, "downlink");
            // Set the default link availability based on C or Ku-Band
            if (IsCBand(channel.downlink_cf)) {
                uplink_avail = Constants.findOne({name: "c_band_uplink_availability"}).value;
                downlink_avail = Constants.findOne({name: "c_band_downlink_availability"}).value;
            }
            else if (IsKuBand(channel.downlink_cf)) {
                uplink_avail = Constants.findOne({name: "ku_band_uplink_availability"}).value;
                downlink_avail = Constants.findOne({name: "ku_band_downlink_availability"}).value;
            }
            else {
                console.log('No default link avail is found, set to 99.5');
            }
        }

        console.log('Set downlink parameters: ant = ' + downlink_ant);
        console.log('Downlink location = ' + downlink_loc + " , up avail = " + uplink_avail + "% , down avail = " + downlink_avail + "%");


        // set the application of this link to the return one (for outbound-inbound systems)
        // if it's SCPC or broadcast DVB-S2 app, just use that app right away
        var rtn_app = _.where(data.platform.applications, {type: 'return'});
        // if forward app is found, use that app, otherwise use an only app in that platform
        var app = rtn_app.length != 0 ? rtn_app[0] : data.platform.applications[0];
        console.log('Set app = ' + app);


        // check if user fix mcg, if yes, calculate on this fix mcg. If not, try all MCGs available in that application
        var mcgs = [];
        if (_.has(data, 'fix_mcg')) {
            var mcg = _.where(app.mcgs, {name: data.fix_mcg})[0];
            mcgs.push(mcg); // push a fix mcg to an array
            console.log('Calculate on this fix MCG ' + mcgs[0].name + ' only.');
        }
        else {
            // set mcg to all MCG in reverse order (try best mcg first, in order to break when find the first mcg which pass the margin)
            mcgs = _.sortBy(app.mcgs, function (num) {
                return -(num.spectral_efficiency);
            });
            console.log('No specified MCG, try all MCGs in this app from best to worst.')

        }

        // check if user specifies the required link margin at clear sky, if not, use the app default link margin
        var link_margin = _.has(data, 'link_margin') ? data.link_margin : app.link_margin;
        console.log('Link margin = ' + link_margin + ' dB');

        // check if user specifies the required bt, if not, use the app default bt
        var bt = _.has(data, 'bt') ? data.bt : app.roll_off_factor;
        console.log('BT = ' + bt);

        // loop through all adjacent satellite interferences
        // loop through all MCG
        for (var i = 0; i < mcgs.length; i++) {
            var mcg = mcgs[i];
            LogTitle('Start loop MCG ' + mcg.name);
            var bw = get_bandwidth(app, mcg, data.unit, data.bw, bt);
            console.log('Bandwidth for mcg ' + mcg + ' and ' + data.bw + ' ' + data.unit + ' = ' + bw + ' MHz');
            var link_data = {
                uplink_antenna: uplink_ant,
                uplink_hpa: uplink_hpa,
                uplink_location: uplink_loc,
                downlink_antenna: downlink_ant,
                downlink_location: downlink_loc,
                channel: channel,
                app: app,
                bandwidth: bw,
                mcg: mcg,
                bt: bt,
                link_margin: link_margin,
                overused_power: 0, // as of now, not consider overused power yet
                uplink_availability: uplink_avail,
                downlink_availability: downlink_avail,
                uplink_diversity: uplink_diversity,
                downlink_diversity: downlink_diversity,
                downlink_adj_sat_interferences: data.downlink_adj_sat_interferences,
                last_mcg: i == mcgs.length - 1, // indicates that this is the last MCG
                path: "return" // indicates that this is not hub to remote link
            }

            var cases = run_link(link_data);
            // if run_link return false, we continue to the next mcg.
            // This is the case where we calculate ACM applications and looping all MCG from best to worst and this MCG does not pass at clear sky
            // So we just skip this result
            if (!cases) {
                continue;
            }
            else {
                /*
                 // if fix mcg (run 1 code) return the result right away
                 if (_.has(data, 'fix_mcg')) {
                 LogTitle('End remote to Hub');
                 return cases;
                 }

                 // if not fix mcg (run all codes), check if the clear sky result and both fade pass condition
                 var clr_result = _.filter(cases, function (re) {
                 return re.uplink_condition === "clear" && re.downlink_condition === "clear";
                 })[0];
                 var rain_result = _.filter(cases, function (re) {
                 return re.uplink_condition === "rain" && re.downlink_condition === "rain";
                 })[0];

                 // if both clear and rain pass condition, return the result (not continue for remaining mcgs as we find the pass one)
                 if (clr_result.pass && rain_result.pass) {
                 LogTitle('End remote to hub');
                 return cases;
                 }
                 else if (i == mcgs.length - 1) {
                 LogTitle("This is the last MCG already");
                 return cases;
                 }
                 */
                return cases;
            }
        }
    }

// for one set of assumptions, run the link 4 times (clear sky, up fade, down fade, both fade)
    function run_link(data) {

        var clear_sky = {uplink: "clear", downlink: "clear"};
        var up_fade = {uplink: "rain", downlink: "clear"};
        var down_fade = {uplink: "clear", downlink: "rain"};
        var both_fade = {uplink: "rain", downlink: "rain"};

        var calculations = [];
        var mylink = new Link();
        // Set other assumptions except the condition to the link
        mylink.setUplinkAntenna(data.uplink_antenna);
        mylink.setUplinkHpa(data.uplink_hpa);
        mylink.setUplinkLocation(data.uplink_location);
        mylink.setDownlinkAntenna(data.downlink_antenna);
        mylink.setDownlinkLocation(data.downlink_location);
        mylink.setChannel(data.channel);
        mylink.setApplication(data.app);
        mylink.setBandwidth(data.bandwidth);
        mylink.setRollOff(data.bt);
        mylink.setMcg(data.mcg);
        mylink.setMcgClearSky(data.mcg);
        mylink.setRequiredMargin(data.link_margin);
        mylink.setOverusedPower(data.overused_power);
        mylink.setUplinkAvailability(data.uplink_availability);
        mylink.setDownlinkAvailability(data.downlink_availability);
        mylink.setDownlinkAdjSatInterferences(data.downlink_adj_sat_interferences);
        mylink.setPath(data.path);

        if (_.has(data, 'uplink_diversity')) mylink.setUplinkDiversity(data.uplink_diversity);
        if (_.has(data, 'downlink_diversity')) mylink.setDownlinkDiversity(data.downlink_diversity);

        // Set condition and run link 1 time for each condition
        mylink.setCondition(clear_sky);
        console.log('------------------------------------');
        console.log('Run link at clear sky.');
        console.log('------------------------------------');
        var clear_re = mylink.run();

        // continue to run the link for rain if clear sky is passed or this is last mcg
        if (!clear_re.pass && !data.last_mcg) {
            return false;
        }

        calculations.push(clear_re);
        console.log("Clear sky result = " + JSON.stringify(clear_re));

        mylink.setCondition(both_fade);
        mylink.setRequiredMargin(0); // Set link margin = 0 for both fade
        console.log("set required margin to 0 dB");
        console.log('------------------------------------');
        console.log('Run link at both fade');
        console.log('------------------------------------');
        var both_fade_re = mylink.run();

        // continue to run the link for up/down fade if both fade is passed or this is last mcg
        if (!both_fade_re.pass && !data.last_mcg) {
            return false;
        }

        var sla_limit = Constants.findOne({name: "lowest_total_link_availability"}).value;
        var decrease_step = 0.2;

        // if this is the last MCG (or fixed MCG) and the link at both fade does not pass,
        // reduce link availability until it passes to find max link avail
        // but not lower than sla_limit
        while (!both_fade_re.pass && data.last_mcg && both_fade_re.link_availability > sla_limit) {
            console.log("Link fail at both fade at last MCG >> find max link avail");
            // if forward link, reduce down avail to seek max link avail
            if (data.hub_to_remote) {
                mylink.setDownlinkAvailability(both_fade_re.downlink_availability - decrease_step);
                console.log("Finding max link avail by reducing downlink avail to " + (both_fade_re.downlink_availability - decrease_step));
            }
            // else (return link), reduce up avail to seek max linka vail
            else {
                mylink.setUplinkAvailability(both_fade_re.uplink_availability - decrease_step);
                console.log("Finding max link avail by reducing uplink avail to " + (both_fade_re.uplink_availability - decrease_step));
            }
            both_fade_re = mylink.run();
        }

        calculations.push(both_fade_re);
        console.log("Both fade result = " + JSON.stringify(both_fade_re));

        /*
        mylink.setCondition(up_fade);
        console.log('------------------------------------');
        console.log('Run link at up fade');
        console.log('------------------------------------');
        var up_fade_re = mylink.run();
        calculations.push(up_fade_re);
        console.log("Up fade result = " + JSON.stringify(up_fade_re));

        mylink.setCondition(down_fade);
        console.log('------------------------------------');
        console.log('Run link at down fade');
        console.log('------------------------------------');
        var down_fade_re = mylink.run();
        calculations.push(down_fade_re);
        console.log("Down fade result = " + JSON.stringify(down_fade_re));
        */

        return calculations;

    }

// return an occupied bandwidth for this link
    function get_bandwidth(app, mcg, unit, value, bt) {

        console.log('Calculate bandwidth from App ' + app.name + " mcg = " + mcg.name + " spec.eff = " + mcg.spectral_efficiency);
        console.log('Bandwidth input = ' + value + " " + unit + " | BT = " + bt);

        // if user input data rate, find the bandwidth from data rate / current mcg ebe
        var sr = 0;
        if (_.contains(["Mbps", "kbps"], unit)) {
            // if Mbps, convert to kbps
            var dr = unit === "Mbps" ? value * 1000 : value;
            sr = dr / mcg.spectral_efficiency; // calculate symbol rate in ksps
        }
        else if (_.contains(["MHz", "kHz"], unit)) {
            // convert to symbol rate in ksps
            var bw = unit === "MHz" ? value * 1000 : value;
            sr = bw / bt;
        }
        else if (_.contains(["Msps", "ksps"], unit)) {
            sr = unit === "Msps" ? value * 1000 : value;
        }
        else {
            console.log("Unit of bandwidth error.");
            return false;
        }
        console.log("Symbol rate = " + sr + " ksps");

        // check if symbol rate is higher than the max symbol rate
        var sr_2 = 0;
        if (_.has(app, 'maximum_symbol_rate') && sr > app.maximum_symbol_rate) {
            console.log('Symbol rate of ' + sr + ' ksps is higher than max symbol rate of this app (' + app.maximum_symbol_rate + ' ksps)');
            sr_2 = app.maximum_symbol_rate;
        }

        // check if symbol rate is lower than the min symbol rate
        else if (_.has(app, 'minimum_symbol_rate') && sr < app.minimum_symbol_rate) {
            console.log('Symbol rate of ' + sr + ' ksps is lower than minimum symbol rate of this app (' + app.minimum_symbol_rate + ' ksps)');
            sr_2 = app.minimum_symbol_rate;
        }

        // check if symbol rate is among the list of available symbol rates in the app
        else {
            // if the app does not contain the symbol rate property or symbol rate array has no elements, it means the symbol can be any value (between min and max)
            if (!(_.has(app, 'symbol_rates')) || app.symbol_rates.length == 0) {
                sr_2 = sr;
            }
            else if (_.contains(app.symbol_rates, sr)) {
                console.log('The app contains symbol rate of ' + sr + " ksps");
                sr_2 = sr;
            }
            else {
                // find the lowest symbol rate available in the app which is higher than that value
                sr_2 = _.min(_.filter(app.symbol_rates, function (num) {
                    return num > sr;
                }));
                console.log('Symbol rate of ' + sr + ' ksps is not in the symbol rate pools of this app, so we find the closest one.')
            }
        }
        console.log("Symbol rate after app limitation = " + sr_2 + " ksps");

        // return the occupied bandwidth in MHz

        // for TOLL, the noise bandwidth to occupied bandwidth will use different formula

        var occ_bw = (sr_2 / 1000) * bt;

        if(app.name == "TOLL"){ // add one channel to get occupied bandwidth
            occ_bw = (sr_2 / 1000) + 3.375;
            console.log('TOLL. Add 1 channel from SR = ' + sr_2 + ' ksps to get bw = ' + occ_bw + ' MHz');
        }

        return occ_bw;

    }

}

// Class to calculate 1 link (clear sky and rain fade is considered 2 separate links)

function Link() {

    // --------------- Constants ----------------------
    var k = -228.6
    var c_light = 3 * Math.pow(10, 8);
    var ifl = Constants.findOne({name:"ifl"}).value;
    var lna_noise = Constants.findOne({name:"lna_noise"}).value;

    // --------------- Instantiations -----------------------
    var uplink_station = new UplinkStation();
    var downlink_station = new DownlinkStation();
    var channel = {};
    var application = {};
    var bandwidth = 0;
    var mcg = {};
    var mcg_clr = {};
    var roll_off_factor = 1.2;
    var condition = {uplink: "clear", downlink: "clear"}
    var required_margin = 2;
    var overused_power = 0;
    var uplink_availability = 99.5;
    var downlink_availability = 99.5;
    var downlink_adj_sat_interferences = {};
    var uplink_diversity = {};
    var downlink_diversity = {};
    var path = "";
    this.errorMessage = "";

    // ---------------- Run Program --------------------------

    this.run = function () {

        // check if this is rain fade case
        if (condition.uplink === "rain" || condition.downlink === "rain") {

            // if the application has ACM mode, the rain fade condition loops through MCG lower than MCG at clear sky
            // and calculates the link (same bandwidth, change mcg)
            LogTitle("This is rain fade case.");
            if (_.has(application, 'acm') && application.acm) {
                LogTitle("This application has ACM");
                // get sorted MCG array from best to worst
                var lowerMcgs = getLowerMcgThanClearSky(mcg_clr);

                // if there is no lower MCG than the one at clear sky, so it is the last MCG already
                // add this MCG so the program calculates on this

                if (lowerMcgs.length == 0) {
                    console.log('The clear sky code is last MCG already, add this code to calculate at rain fade');
                    lowerMcgs.push(mcg_clr);
                }

                // there is any MCG lower than clear sky
                if (lowerMcgs.length > 0) {

                    // Loop through MCG from best to worst, if the result pass, return it. Or if it is the last MCG, returns it.
                    // Since we sort from best to worst, the first MCG that makes the link pass is the best condition
                    for (var i = 0; i < lowerMcgs.length; i++) {
                        mcg = lowerMcgs[i];
                        LogTitle("Find the result for uplink = " + condition.uplink + " downlink = " + condition.downlink + " at MCG = " + lowerMcgs[i].name);
                        var re = calculate();
                        // if the link passes at rain fade, return the result
                        if (re.pass) {
                            return re;
                        }
                        // if this is last MCG already, find max link avail
                        else if (i == lowerMcgs.length - 1) {
                            var sla_limit = Constants.findOne({name: "lowest_total_link_availability"}).value;
                            var decrease_step = 0.2;
                            while (!re.pass && re.link_availability > sla_limit) {
                                console.log("Link fail at both fade at last MCG >> find max link avail");
                                // if forward link, reduce down avail to seek max link avail
                                if (path == "forward") {
                                    downlink_availability -= decrease_step;
                                    console.log("Finding max link avail by reducing downlink avail to " + (downlink_availability - decrease_step));
                                }
                                // else (return link), reduce up avail to seek max link avail
                                else {
                                    uplink_availability -= decrease_step;
                                    console.log("Finding max link avail by reducing uplink avail to " + (uplink_availability - decrease_step));
                                }
                                re = calculate();
                            }
                            return re;
                        }
                    }

                }

            }
            // if the application has dynamic channels (or adaptive-TDMA or whatever technology which allows the return
            // link to change both MCG and bandwidth, loop through MCG and symbol rates available to find the best
            else if (_.has(application, 'dynamic_channels') && application.dynamic_channels) {
                LogTitle('This application has dynamic channels');
                var lowerMcgs = getLowerMcgThanClearSky(mcg_clr);
                var lowerBw = getLowerBandwidth(bandwidth);
                var results = [];
                _.each(lowerMcgs, function (mcg) {
                    _.each(lowerBw, function (bw) {
                        mcg = mcg;
                        bandwidth = bw;
                        result.push(calculate());
                    })
                })
                // Filter result with 2 requirements, pass margin and max data rate
                return _.max(_.where(results, {pass: true}), function (item) {
                    return item.data_rate;
                });
            }
            else {
                var re = calculate();
                // check if the link pass or not, if not, find max link avail
                var sla_limit = Constants.findOne({name: "lowest_total_link_availability"}).value;
                var decrease_step = 0.2;
                while (!re.pass && re.link_availability > sla_limit) {
                    console.log("Link fail at both fade at last MCG >> find max link avail");
                    // if forward link, reduce down avail to seek max link avail
                    if (path == "forward") {
                        downlink_availability -= decrease_step;
                        console.log("Finding max link avail by reducing downlink avail to " + (downlink_availability - decrease_step));
                    }
                    // else (return link), reduce up avail to seek max link avail
                    else {
                        uplink_availability -= decrease_step;
                        console.log("Finding max link avail by reducing uplink avail to " + (uplink_availability - decrease_step));
                    }
                    re = calculate();
                }
                return re;
            }
        }

        else {
            LogTitle("This is clear sky case");
            return calculate();
        }

    }

    // ----------------- Function to calculate the link budget ------------

    var calculate = function () {

        var result = {};

        var satellite = Satellites.findOne({name: channel.satellite});
        var orbital_slot = satellite.orbital_slot;
        var skb = satellite.skb;
        var isFgm = channel.mode === "FGM";
        var isAlc = channel.mode === "ALC";
        var noiseBw = noiseBandwidth(bandwidth, application);
        var num_carriers_in_channel = 10 * log10(channel.bandwidth / bandwidth); // number of carriers in dB

        // ---------------------------------- Uplink ---------------------------------------------

        // Setup variables
        var uplink_freq = channel.uplink_cf;
        var uplink_slant_range = slantRange(uplink_station.location, orbital_slot);
        var uplink_elevation_angle = elevationAngle(uplink_station.location, orbital_slot);
        var uplink_xpolLoss = xpolLoss(), uplink_pointingLoss = pointingLoss(uplink_freq, uplink_station.antenna.size, skb);
        var uplink_atmLoss = atmosphericLoss({
            condition: condition.uplink,
            location: uplink_station.location,
            orbital_slot: orbital_slot,
            freq: uplink_freq,
            polarization: channel.uplink_pol,
            diameter: uplink_station.antenna.size,
            availability: uplink_availability
        });
        var uplink_otherLoss = uplink_xpolLoss + uplink_pointingLoss;
        var uplink_spreadingLoss = spreadingLoss(uplink_slant_range);
        var uplink_contour = uplink_station.location.contour;

        var gain_variation = 0;
        var gain_variation_diff = 0;

        // For IPSTAR satellite, applies gain variation
        if(satellite.name == "IPSTAR" && _.contains(["return"],channel.type)){
            if(_.contains(["328","514","608"],channel.uplink_beam)){ // shape beam
                gain_variation = -0.0015 * Math.pow(uplink_contour,3) - 0.0163 * Math.pow(uplink_contour,2) + 0.1827 * uplink_contour - 0.1737;
            }
            else{
                gain_variation = -0.0019 * Math.pow(uplink_contour,2) + 0.2085 * uplink_contour - 0.5026;
            }
            gain_variation_diff = gain_variation > -1.4 ? 0 : 1.4 + gain_variation;
        }

        var uplink_gt = channel.gt_peak + uplink_contour + gain_variation_diff;

        var operating_sfd = 0, operating_pfd_per_carrier = 0, eirp_up = 0, carrier_pfd = 0, carrier_output_backoff = 0;

        // If channel is FGM, find operating PFD at 100% utilization

        if (isFgm) {

            // Get the backoff settings (IBO, OBO, Intermod) from the database based on the default number of carriers ("One","Two","Multi") set in the database
            var num_carriers = channel.current_num_carriers;
            var backoff_settings = _.where(channel.backoff_settings, {"num_carriers": num_carriers})[0];

            // SFD in the database is the -X value of -X-G/T (derived from -(X+G/T)
            // Operating PFD = -(X + G/T) - (Atten.Range - defaultAtten) + TransponderIBO - Backoff from bandwidth
            operating_sfd = channel.sfd - uplink_gt - (channel.atten_range - channel.default_atten);
            operating_pfd_per_carrier = operating_sfd + backoff_settings.ibo - num_carriers_in_channel;

            // Derive EIRP up (at ground station) needed to compensate spreading loss, pointing, xpol and atmospheric loss
            eirp_up = operating_pfd_per_carrier + uplink_spreadingLoss + uplink_otherLoss + uplink_atmLoss

            // Apply overused power (for normal case, overused power = 0). It will be more than 0 when we're goal seeking
            // the amount of power-utilization to pass the margin
            eirp_up += overused_power;

            // check if it's rain fade case and uplink station hpa has UPC (such as gateways), increase EIRP up by that UPC
            if (condition.uplink === "rain" && _.has(uplink_station.hpa, 'upc')) {
                eirp_up += uplink_station.hpa.upc;

            }

            // Check if the uplink HPA is BUC type. If yes, use the uplink power of that BUC (use 100% of BUC power instead of show the result of desired EIRP level)
            if (_.has(uplink_station.hpa, 'category') && uplink_station.hpa.category.toLowerCase() == 'buc') {
                // check if eirp of this buc & antenna can reach the desired level
                var eirp_up_from_buc = eirp_uplink(uplink_station.hpa, uplink_station.antenna, uplink_freq);
                if (eirp_up > eirp_up_from_buc) {
                    eirp_up = eirp_up_from_buc;
                }
            }

            // Find carrier PFD. This may not equal to operating pfd in case of overused power
            carrier_pfd = eirp_up - uplink_spreadingLoss - uplink_otherLoss - uplink_atmLoss;

            // Find carrier output backoff = transponder obo + (carrier input backoff)
            //carrier_output_backoff = backoff_settings.obo + (carrier_pfd - operating_sfd);
            var op_pfd = operating_sfd + backoff_settings.ibo;

            // if PFD of carrier is higher than operating PFD per transponder (such as too much overused)
            // return transponder obo (maximum backoff)

            if (carrier_pfd > op_pfd) {
                carrier_output_backoff = backoff_settings.obo;
            }
            else {
                carrier_output_backoff = backoff_settings.obo + (carrier_pfd - op_pfd);
            }

            _.extend(result, {
                channel_input_backoff: backoff_settings.ibo,
                channel_output_backoff: backoff_settings.obo
            })

        }

        // If channel is ALC, find operating PFD at desired deep-in
        else if (isAlc) {

            // Operating SFD is equal to SFD at uplink location (max)
            operating_sfd = channel.sfd - uplink_gt;

            // For IPSTAR FWD Link, the data is stored in format fixed gateway EIRP Up
            if (_.has(channel, 'eirp_up_channel')) {
                eirp_up = channel.eirp_up_channel - num_carriers_in_channel;
                operating_pfd_per_carrier = eirp_up - uplink_spreadingLoss - uplink_otherLoss;
            }

            // For other ALC transponders, the data is stored in desired deep-in value
            // so, we find PFD at designed deepin first, then derive for EIRP up
            // the derived EIRP up will need to compensate spreading loss, pointing, xpol and atmoshperic loss
            else {
                operating_pfd_per_carrier = operating_sfd - channel.dynamic_range + channel.designed_deepin - num_carriers_in_channel;
                eirp_up = operating_pfd_per_carrier + uplink_spreadingLoss + uplink_otherLoss + uplink_atmLoss;
            }

            // check if it's rain fade case and uplink station hpa has UPC (such as gateways), increase EIRP up by that UPC
            if (condition.uplink === "rain" && _.has(uplink_station.hpa, 'upc')) {
                eirp_up += uplink_station.hpa.upc;

            }

            // Apply overused power (for normal case, overused power = 0). It will be more than 0 when we're goal seeking
            // the amount of power-utilization to pass the margin
            eirp_up += overused_power;

            // Check if the uplink HPA is BUC type. If yes, use the uplink power of that BUC (use 100% of BUC power instead of show the result of desired EIRP level)
            if (_.has(uplink_station.hpa, 'category') && uplink_station.hpa.category.toLowerCase() == 'buc') {
                console.log("This is BUC.")
                // check if eirp of this buc & antenna can reach the desired level
                var eirp_up_from_buc = eirp_uplink(uplink_station.hpa, uplink_station.antenna, uplink_freq);

                if (eirp_up > eirp_up_from_buc) {
                    console.log("EIRP Up of " + eirp_up + " dBW is more than EIRP up from BUC which is " + eirp_up_from_buc + " dBW");
                    eirp_up = eirp_up_from_buc;
                }
                else{
                    console.log("EIRP Up of " + eirp_up + " dBW is less than EIRP up from BUC which is " + eirp_up_from_buc + " dBW");
                }
            }
            else{
                console.log("This is not a BUC.")
            }

            // Find carrier PFD. This may not equal to operating pfd in case of overused power or the BUC power is not enough to get to designed point
            carrier_pfd = eirp_up - uplink_spreadingLoss - uplink_otherLoss - uplink_atmLoss;
            console.log('Uplink Spreading Loss = ' + uplink_spreadingLoss + ' dB');
            console.log('Uplink Other Loss = ' + uplink_otherLoss + ' dB');


            // For ALC transponders, assume the transponder is full-loaded (always reach deep-in)
            // Find deep-in per channel at full-load
            var channel_pfd = carrier_pfd + num_carriers_in_channel;
            var channel_deepin = channel_pfd - (operating_sfd - channel.dynamic_range);

            // set carrier output backoff to the OBO at backoff settings based on current load
            // normally for Conventional Ku-ALC is single carrier and IPSTAR is multi carrier
            carrier_output_backoff = _.where(channel.backoff_settings, {"num_carriers": channel.current_num_carriers})[0].obo;

            // If the pfd not reach deep-in, output backoff is increased to that amount out of deepin
            carrier_output_backoff += channel_deepin > 0 ? 0 : channel_deepin;
            carrier_output_backoff -= num_carriers_in_channel;

            _.extend(result, {
                channel_output_backoff: _.where(channel.backoff_settings, {"num_carriers": channel.current_num_carriers})[0].obo,
                channel_deepin: channel_deepin.toFixed(2)
            });

        }

        else {
            logError("Transponder mode is not FGM or ALC.");
            return false;
        }

        // Calculate required HPA power
        var op_power_at_hpa_output = eirp_up - antenna_gain(uplink_station.antenna.size, uplink_freq);
        LogTitle('HPA IFL = ' + uplink_station.hpa.ifl + ' HPA OBO = ' + uplink_station.hpa.obo + ' dB');
        LogTitle('OP Power = ' + op_power_at_hpa_output);
        var operating_hpa_power = Math.pow(10, (op_power_at_hpa_output + uplink_station.hpa.ifl) / 10);

        // Calculate C/N Uplink

        var eirp_up_at_satellite = eirp_up - uplink_otherLoss - uplink_atmLoss;
        var uplink_path_loss = pathLoss(uplink_slant_range, uplink_freq);
        var cn_uplink = carrierOverNoise(eirp_up_at_satellite, uplink_gt, uplink_path_loss, noiseBw);

        console.log('-------Power optimization---------');
        console.log('Operating SFD ' + operating_sfd + ' dBW/m^2');
        console.log('Operating PFD ' + operating_pfd_per_carrier + ' dBW/m^2');
        console.log('Channel PFD ' + channel_pfd + ' dBW/m^2');
        console.log('Carrier OBO ' + carrier_output_backoff + ' dB');
        console.log('Carrier PFD ' + carrier_pfd + ' dBW/m^2');
        console.log('Channel deepin ' + channel_deepin + ' dB');

        console.log('----Uplink-----');
        console.log('Condition: ' + condition.uplink);
        console.log('Atmoshperic Loss: ' + uplink_atmLoss + " dB");
        console.log('EIRP UP ' + eirp_up + ' dBW');
        console.log('G/T ' + uplink_gt + ' dB/K');
        console.log('Path Loss: ' + uplink_path_loss + ' dB');
        console.log('Noise BW: ' + noiseBw + ' dB');
        console.log('C/N uplink ' + cn_uplink + ' dB');

        // ---------------------------------- Downlink ---------------------------------------------

        // Setup variables
        var downlink_freq = channel.downlink_cf;
        var downlink_slant_range = slantRange(downlink_station.location, orbital_slot);
        var downlink_xpolLoss = xpolLoss(), downlink_pointingLoss = pointingLoss(downlink_freq, downlink_station.antenna.size, skb);
        var downlink_atmLoss = atmosphericLoss({
            condition: condition.downlink,
            location: downlink_station.location,
            orbital_slot: orbital_slot,
            freq: downlink_freq,
            diameter: downlink_station.antenna.size,
            polarization: channel.downlink_pol,
            availability: downlink_availability
        });
        var downlink_otherLoss = downlink_xpolLoss + downlink_pointingLoss;
        var downlink_contour = downlink_station.location.contour;

        // Find saturated EIRP at location for debug purpose (no backoff per carrier)
        var saturated_eirp_down_at_loc = channel.saturated_eirp_peak + downlink_contour;
        
        // For IPSTAR satellite, applies gain variation
        if(satellite.name == "IPSTAR" && _.contains(["forward","broadcast"],channel.type)){
            if(_.contains(["328","514","608"],channel.downlink_beam)){ // shape beam
                gain_variation = -0.0022 * Math.pow(downlink_contour,3) - 0.0383 * Math.pow(downlink_contour,2) - 0.0196 * downlink_contour - 0.2043;
            }
            else{
                gain_variation = -0.0006 * Math.pow(downlink_contour,2) + 0.1999 * downlink_contour - 0.4185;
            }
            gain_variation_diff = gain_variation > -1.1 ? 0 : 1.1 + gain_variation;
        }

        // Find driven EIRP at location = Saturated EIRP at peak + carrier OBO + Gain Variation + downlink relative contour
        var driven_eirp_down_at_loc = channel.saturated_eirp_peak + carrier_output_backoff + downlink_contour + gain_variation_diff;
        console.log('Driven EIRP at loc = ' + driven_eirp_down_at_loc);

        // Find EIRP Down at location = Saturated EIRP at peak + carrier OBO + downlink relative contour + other losses (pointing, xpol) + atm loss
        var carrier_eirp_down_at_loc = channel.saturated_eirp_peak + carrier_output_backoff + downlink_contour + gain_variation_diff - downlink_otherLoss - downlink_atmLoss;

        // Find G/T of receive antenna
        var ant_gt = 0;

        // If the antenna has gt property already (such as the phased-array antenna)
        var ant = downlink_station.antenna;
        if (_.has(ant, 'gt')) {
            ant_gt = ant.gt;
        }
        else {
            var ant_temp = antenna_temp(downlink_atmLoss, condition.downlink);
            var sys_temp = system_temp(ant_temp)

            // If the antenna has rx_gain property, use that value, otherwise, calculate from standard value
            var ant_gain = 0;
            if (_.has(ant, 'rx_gain')) {
                ant_gain = antenna_gain_at_frequency(ant.rx_gain.value, ant.rx_gain.freq, downlink_freq, ant.size);
            }
            else {
                ant_gain = antenna_gain(ant.size, downlink_freq);
            }
            ant_gt = ant_gain - 10 * log10(sys_temp)

            console.log("----------Antenna---------------");
            console.log("Antenna Temp: " + ant_temp + " K");
            console.log("System Temp: " + sys_temp + " K");
            console.log("Ant Gain: " + ant_gain + "dBi");

        }

        // Calculate C/N Downlink
        var downlink_path_loss = pathLoss(downlink_slant_range, downlink_freq);
        var cn_downlink = carrierOverNoise(carrier_eirp_down_at_loc, ant_gt, downlink_path_loss, noiseBw);

        console.log('------Downlink-----');
        console.log('Condition: ' + condition.downlink);
        console.log('Pointing loss = ' + downlink_pointingLoss + ' dB , Xpol loss = ' + downlink_xpolLoss + ' dB');
        console.log('Atmoshperic Loss: ' + downlink_atmLoss + " dB");
        console.log('EIRP Down: ' + carrier_eirp_down_at_loc + ' dBW');
        console.log('G/T ' + ant_gt + ' dB/K');
        console.log('Path Loss ' + downlink_path_loss + ' dB');
        console.log('Noise BW ' + noiseBw + ' dB');
        console.log('C/N Downlink ' + cn_downlink + ' dB');

        // ---------------------------------- Interferences ---------------------------------------------

        // -------------------------------Uplink Interferences ---------------------------------------------

        // C/I Intermod from HPA, C/I Adjacent satellite
        // If uplink HPA, do not have C/I intermod specified, assume it is 25
        var ci_uplink_intermod = _.has(uplink_station.hpa, 'intermod') ? uplink_station.hpa.intermod : 50;

        // If the HPA has data for rain_fade use that value. (for IPSTAR gateways, this value will become 19 dB at rain fade.
        if(condition.uplink == "rain" && _.has(uplink_station.hpa, 'intermod_rain')){
            ci_uplink_intermod = uplink_station.hpa.intermod_rain;
        }

        // Uplink adjacent satellite interferences
        // uplink adjacent satellite interferences
        var ci_uplink_adj_sat_obj = ci_adjacent_satellite({
            path: "uplink",
            channel: channel,
            interference_channels: [],
            eirp_density: eirp_up - 10 * log10(bandwidth * Math.pow(10, 6)),
            location: uplink_station.location,
            diameter: uplink_station.antenna.size,
            orbital_slot: orbital_slot
        });
        var ci_uplink_adj_sat = ci_uplink_adj_sat_obj.ci;

        // Uplink cross-polarization interferences
        var ci_uplink_xpol = 30; // default, assume the antenna points correctly

        // Uplink cross cells interferences
        var ci_uplink_xcells = ci_cross_cells(channel, "uplink", uplink_station.location);

        // -------------------------------Downlink Interferences ---------------------------------------------

        // Downlink adjacent satellite interferences
        var ci_downlink_adj_sat_obj = ci_adjacent_satellite({
            path: "downlink",
            channel: channel,
            interference_channels: downlink_adj_sat_interferences,
            eirp_density: driven_eirp_down_at_loc - 10 * log10(bandwidth * Math.pow(10, 6)), // use driven eirp to find C/I
            location: downlink_station.location,
            diameter: downlink_station.antenna.size,
            orbital_slot: orbital_slot
        });

        // Find the start frequency, stop frequency and bandwidth of this interference range and add it to the C/I downlink object

        var ci_downlink_adj_sat = ci_downlink_adj_sat_obj.ci;

        // C/I Intermod from satellite
        var ci_downlink_intermod = 20; // default

        // If the channel has the backoff settings property, use that value
        if (_.has(channel, 'backoff_settings')) {
            ci_downlink_intermod = _.where(channel.backoff_settings, {"num_carriers": channel.current_num_carriers})[0].intermod;
        }

        // Downlink cross-polarization interferences
        var ci_downlink_xpol = 30; // default, assume the antenna points correctly

        // Downlink cross cells interferences
        var ci_downlink_xcells = ci_cross_cells(channel, "downlink", downlink_station.location);

        // Total C/I uplink
        var ci_uplink = cnOperation(ci_uplink_intermod, ci_uplink_adj_sat, ci_uplink_xpol, ci_uplink_xcells);

        // Total C/I downlink
        var ci_downlink = cnOperation(ci_downlink_intermod, ci_downlink_adj_sat, ci_downlink_xpol, ci_downlink_xcells);

        console.log('------Interferences------');
        console.log('C/I Up X-pol = ' + ci_uplink_xpol);
        console.log('C/I Up Intermod = ' + ci_uplink_intermod);
        console.log('C/I Up Adj. Sat = ' + ci_uplink_adj_sat);
        console.log('C/I Up Adj. Cells = ' + ci_uplink_xcells);
        console.log('C/I Down X-pol = ' + ci_downlink_xpol);
        console.log('C/I Down Intermod = ' + ci_downlink_intermod);
        console.log('C/I Down Adj. Sat = ' + ci_downlink_adj_sat);
        console.log('C/I Down Cross Cells = ' + ci_downlink_xcells);

        // ---------------------------------- C/N Total ---------------------------------------------

        var cn_total = cnOperation(cn_uplink, cn_downlink, ci_uplink, ci_downlink);

        // If this is TOLL platform, include warble loss
        if(application.name == "TOLL"){
            var num_channels = symbolRate(bandwidth, application) / 3.375;
            var warble_loss = 10 * log10((Math.pow(10,2.2/10) + num_channels - 1) / num_channels);
            console.log('This is TOLL. Warble loss = ' + warble_loss + ' dB');
            console.log('C/N Total before warble loss = ' + cn_total + ' dB');
            cn_total -= warble_loss;
            _.extend(result, {warble_loss: warble_loss});
        }

        var link_availability = total_availability(uplink_availability, uplink_diversity, downlink_availability, downlink_diversity);
        var link_margin = cn_total - mcg.es_no;
        var pass = link_margin > required_margin;

        console.log('-------Total---------');
        console.log('C/N Total: ' + cn_total + ' dB');
        console.log('Link margin ' + link_margin + ' dB');
        console.log('Pass? ' + pass);
        console.log('Total link availability: ' + link_availability);

        // ---------------------------------- Data Rate ---------------------------------------------

        var data_rate = symbolRate(bandwidth, application) * mcg.spectral_efficiency;

        // For TOLL, data_rate is a little complicated....
        if(application.name == "TOLL"){
            console.log('Find data rate for TOLL...');
            var bit_rate_channel_0 = 0;
            // if use code higher than QPSK 835, the bit rate channel 0 will be at most QPSK 835
            if(mcg.spectral_efficiency > 1.67){
                bit_rate_channel_0 = _.where(application.mcgs,{name:"QPSK835"})[0].bit_rate_per_slot;
            }
            else{
                bit_rate_channel_0 = mcg.bit_rate_per_slot;
            }
            console.log("Bit rate channel 0 = " + bit_rate_channel_0);

            var num_channels = symbolRate(bandwidth, application) / 3.375;
            console.log('Num of channels = ' + num_channels);

            data_rate = ((num_channels - 1) * 252 * mcg.bit_rate_per_slot + 250 * bit_rate_channel_0) / 1000;

            var data_rate_ipstar_channel = data_rate / num_channels;
            _.extend(result,{data_rate_ipstar_channel: data_rate_ipstar_channel.toFixed(2)});
        }

        if(application.name == "STAR"){
            console.log('Find data rate for STAR....');
            // round down the normal data rate (from symbol rate x MBE) value to predefined values
            var bit_rates_without_header = [0,0.1168,0.1603,0.2513,0.3205,0.5026,0.6411,1.0052,1.2821,2.0105,2.5642,4.021];
            var temp = 0;
            _.each(bit_rates_without_header, function(item){
                if(item < data_rate && item > temp){
                    temp = item;
                }
            })
            data_rate = temp;
        }


        // ---------------------------------- Power utilization -------------------------------------

        // Calculate power utilization percentage by comparing real carrier PFD and operating PFD per carrier
        // PFD diff is positive if overused
        var pfd_diff = carrier_pfd - operating_pfd_per_carrier;
        var power_util_percent = 100 * Math.pow(10, pfd_diff / 10);

        // Calculate guard band in percent for this carrier
        // Conventional result needs this as Sales team do not accept the bandwidth in decimal
        var roundup_bandwidth = Math.ceil(bandwidth);
        var guardband = ((roundup_bandwidth - bandwidth) * 100 / bandwidth).toFixed(2);


        // Store the variables in the result object.
        // We will use this object to represent all parameters in the result.

        _.extend(result, {
            // satellite
            channel: channel.name,
            operating_mode: channel.mode,
            operating_sfd: operating_sfd.toFixed(2),
            operating_pfd_per_carrier: operating_pfd_per_carrier.toFixed(2),
            carrier_pfd: carrier_pfd.toFixed(2),
            carrier_obo: carrier_output_backoff.toFixed(2),
            gain_variation: gain_variation.toFixed(2),
            // uplink
            uplink_antenna: uplink_station.antenna,
            uplink_hpa: uplink_station.hpa,
            uplink_pointing_loss: uplink_pointingLoss.toFixed(2),
            uplink_xpol_loss: uplink_xpolLoss.toFixed(2),
            uplink_atmLoss: uplink_atmLoss.toFixed(2),
            uplink_eirp: eirp_up.toFixed(2),
            uplink_gt: uplink_gt.toFixed(2),
            uplink_path_loss: uplink_path_loss.toFixed(2),
            uplink_condition: condition.uplink,
            uplink_availability: uplink_availability.toFixed(2),
            uplink_location: uplink_station.location,
            operating_hpa_power: operating_hpa_power.toFixed(2),
            cn_uplink: cn_uplink.toFixed(2),
            // downlink
            downlink_antenna: downlink_station.antenna,
            // Following 3 parameters are aAvailable only if G/T is not specified in the antenna spec
            antenna_temp: _.has(downlink_station.antenna, 'gt') ? 'N/A' : ant_temp.toFixed(2),
            system_temp: _.has(downlink_station.antenna, 'gt') ? 'N/A' : sys_temp.toFixed(2),
            ant_gain: _.has(downlink_station.antenna, 'gt') ? 'N/A' : ant_gain.toFixed(2),
            downlink_pointing_loss: downlink_pointingLoss.toFixed(2),
            downlink_xpol_loss: downlink_xpolLoss.toFixed(2),
            downlink_atmLoss: downlink_atmLoss.toFixed(2),
            downlink_eirp: carrier_eirp_down_at_loc.toFixed(2),
            saturated_eirp_at_loc: saturated_eirp_down_at_loc.toFixed(2),
            downlink_gt: ant_gt.toFixed(2),
            downlink_path_loss: downlink_path_loss.toFixed(2),
            downlink_condition: condition.downlink,
            downlink_availability: downlink_availability.toFixed(2),
            downlink_location: downlink_station.location,
            cn_downlink: cn_downlink.toFixed(2),
            // interferences
            ci_uplink_intermod: ci_uplink_intermod.toFixed(2),
            ci_uplink_adj_sat: ci_uplink_adj_sat.toFixed(2),
            ci_uplink_xpol: ci_uplink_xpol.toFixed(2),
            ci_uplink_xcells: ci_uplink_xcells.toFixed(2),
            ci_downlink_adj_sat: ci_downlink_adj_sat.toFixed(2),
            ci_downlink_adj_sat_obj: ci_downlink_adj_sat_obj,
            ci_downlink_intermod: ci_downlink_intermod.toFixed(2),
            ci_downlink_xpol: ci_downlink_xpol.toFixed(2),
            ci_downlink_xcells: ci_downlink_xcells.toFixed(2),
            ci_uplink: ci_uplink.toFixed(2),
            ci_downlink: ci_downlink.toFixed(2),
            // total
            cn_total: cn_total.toFixed(2),
            link_margin: link_margin.toFixed(2),
            required_margin: required_margin,
            pass: pass,
            link_availability: link_availability.toFixed(2),
            mcg: mcg,
            occupied_bandwidth: bandwidth.toFixed(2),
            noise_bandwidth: noiseBw.toFixed(2),
            roundup_bandwidth: roundup_bandwidth.toFixed(2),
            guardband: guardband,
            data_rate: data_rate.toFixed(2),
            power_util_percent: power_util_percent.toFixed(2),
            roll_off_factor: roll_off_factor
        });


        return result;

        // Record the result into the result object
        function record(title, variable) {
            result[title] = variable;
        }

    }


    // -------------- Utility functions ---------------------

    // Return array of MCG which is lower than the MCG at clear sky
    function getLowerMcgThanClearSky(input_mcg) {
        // Assume the MCG in the application is sorted from lowest to highest efficiency
        var mcgs = _.filter(application.mcgs, function (mcg) {
            return mcg.spectral_efficiency <= input_mcg.spectral_efficiency;
        });
        // Return sorted mcg by spectral efficiency
        return _.sortBy(mcgs, function (num) {
            return -(num.spectral_efficiency);
        });
    }

    // Return array of Bandwidth which is lower than the current bandwidth
    function getLowerBandwidth(input_bandwidth) {
        // Check the the application has array of available symbol rates
        if (!_.has(application, 'symbol_rates') || application.symbol_rates.length == 0) {
            logError("Cannot find list of available symbol rates.")
            return false;
        }
        var sr = _.filter(application.symbol_rates, function (sr) {
            return sr < input_bandwidth / roll_off_factor;
        })
        // Return array of bandwidth from symbol rate
        return _.map(sr, function (item) {
            if(application.name == "TOLL"){
                return (item / 1000) + 3.375;
            }
            return (item / 1000) * roll_off_factor;
        })

    }

    // Return slant range from earth station to satellite from the input location in km
    function slantRange(location, sat_lon) {
        // Constants
        var degrees_to_radians = Math.PI / 180;
        var equatorial_earth_radius = 6378144;  // Equatorial Earth Radius in meters; changed from 6378159.9
        var geo_altitude_radius = 42164500;  // Radius at Geosynchronous Altitude; changed from 42166454
        var earth_oblateness = 1 / 298.257;  // Earth Oblateness

        // Calculates basic parameters
        var es_lat = location.lat;
        var es_lon = location.lon;
        var dif_lon = es_lon - sat_lon;
        var x_1 = equatorial_earth_radius * Math.cos(es_lat * degrees_to_radians) / Math.sqrt(1 - (2 - earth_oblateness) * earth_oblateness * Math.pow(Math.sin(es_lat * degrees_to_radians), 2));
        var x_2 = geo_altitude_radius * Math.cos(dif_lon * degrees_to_radians);
        var y_2 = geo_altitude_radius * Math.sin(dif_lon * degrees_to_radians);
        var z_1 = Math.pow((1 - earth_oblateness), 2) * equatorial_earth_radius * Math.sin(es_lat * degrees_to_radians) / Math.sqrt(1 - (2 - earth_oblateness) * earth_oblateness * Math.pow(Math.sin(es_lat * degrees_to_radians), 2));
        return Math.sqrt(Math.pow((x_2 - x_1), 2) + Math.pow(y_2, 2) + Math.pow(z_1, 2)) / 1000;
    }

    // Return spreading loss in dB
    function spreadingLoss(range) {
        return 10 * log10(4 * Math.PI * Math.pow(range * 1000, 2));
    }

    // Return pointing loss in dB
    function pointingLoss(freq, size, skw) {
        //TODO: Rewrite after discussion
        if (size === 8.1) {
            return 0.6;
        }
        else if (size <= 4.5) {
            //calculate pointing loss of an earth station with fixed pointing
            //Inputs
            //   freq = frequency of interest in GHz
            //   diam = antenna diameter in meter
            //   skw = half station keeping box of the satellite
            //Output
            //   pointing error in dB
            //Assumptions
            //   Fixed Antenna: Diam <= 4.5m
            //       0.15 of Half Power Beam Width as initial pointing error
            //       Affected by station keeping box
            //   Tracking Antenna: Diam > 4.5m
            //       Tracking capability is good within 0.035 degree of nominal boresight

            return 12 * Math.pow((0.15 + Math.sqrt(2) * skw * (freq * Math.pow(10, 9)) * size / (70 * c_light)), 2);

        }
        else {
            return 12 * Math.pow((0.035 * (freq * Math.pow(10, 9)) * size / (70 * c_light)), 2);
        }

    }

    // Return atmospheric loss in dB (both clear sky and rain condition will be calculated by this function only)
    function atmosphericLoss(data) {
        var ele_angle = elevationAngle(data.location, data.orbital_slot);
        var gas = gasAtten(data.freq, ele_angle);
        var cloud = cloudAtten(data.freq, ele_angle);
        var scin = scinAtten(data.freq, ele_angle, data.diameter, data.availability);
        console.log("-------------Attenuation-----------");
        console.log("Elevation angle: " + ele_angle + " deg");
        console.log("Gas Atten: " + gas + " dB");
        console.log("Cloud Atten: " + cloud + " dB");
        console.log("Scin Atten: " + scin + " dB");
        if (data.condition === "clear") {

            if (ele_angle > 10) {
                return gas + cloud;
            }
            else {
                return gas + Math.sqrt(Math.pow(cloud, 2) + Math.pow(scin, 2));
            }
        }
        else {
            var rain = rainAtten(data.location, data.freq, data.orbital_slot, data.polarization, data.availability);
            console.log("Rain Atten: " + rain + " dB");
            return gas + Math.sqrt(Math.pow((rain + cloud), 2) + Math.pow(scin, 2));
        }
    }

    // Return cross-pol loss in dB
    function xpolLoss() {
        return 0.1;
    }

    // Return path loss in dB
    function pathLoss(range, freq) {
        return spreadingLoss(range) + gain1m(freq);
    }

    // Return gain of 1 square.meter. antenna at the given frequency
    function gain1m(freq) {
        return 10 * log10(4 * Math.PI / Math.pow(lambda(freq), 2));
    }

    // Return C/N
    function carrierOverNoise(eirp, gt, pathLoss, noise_bandwidth) {
        // EIRP in dBW, G/T in dB/K, path loss in dB, bandwidth in MHz
        return eirp + gt - pathLoss - k - 10 * log10(noise_bandwidth * Math.pow(10, 6));
    }

    // Return the operation results of C/N
    function cnOperation() {
        // 10*LOG(1/(1/(10^(B30/10))+1/(10^(B31/10))+1/(10^(B32/10))+1/(10^(B33/10))+1/(10^(B34/10))+1/(10^(B35/10))))
        var cn = arguments[0];
        var result = 0;
        for (var i = 0; i < arguments.length; i++) {
            result += 1 / (Math.pow(10, arguments[i] / 10));
        }
        return 10 * log10(1 / result);
    }

    // Return lambda from give frequency in GHz
    function lambda(freq) {
        return  c_light / (freq * Math.pow(10, 9));
    }

    // Return noise bandwidth = occupied bandwidth / roll off
    function noiseBandwidth(occupied_bandwidth, app) {
        console.log('Calculate noise bandwidth from occ.bw = ' + occupied_bandwidth + ' MHz and BT = ' + roll_off_factor);
        if(app.name=="TOLL"){
            return occupied_bandwidth - 3.375;
        }
        return occupied_bandwidth / roll_off_factor;
    }

    // Return symbol rate = occupied bandwidth / roll off
    function symbolRate(occupied_bandwidth, app) {
        if(app.name=="TOLL"){
            return occupied_bandwidth - 3.375;
        }
        return occupied_bandwidth / roll_off_factor;
    }

    // Return antenna temperature from given attenuation (maybe clear sky or rain)
    function antenna_temp(attenuation, condition) {
        if(condition == "clear"){
            return 30;
        }
        else if(condition == "rain"){
            var tc = 2.7 // background sky noise due to cosmic radiation = 2.7K
            return 260 * (1 - Math.pow(10, -(attenuation / 10))) + tc * Math.pow(10, -(attenuation / 10));
        }
        return 30;
    }

    // Return system temperature = ((Tant + Tfeed) / IFL) + Tlna
    function system_temp(antenna_temp) {
        // temp at before feed
        var sigma_f = Math.pow(10, ifl / 10);
        var tf = 290; // Feed ambient temperature
        return antenna_temp + (sigma_f-1) * tf + sigma_f * lna_noise;

        // temp at after feed
        //var sigma_f = Math.pow(10, -ifl / 10);
        //var tf = 290; // Feed ambient temperature
        //return lna_noise + (1 - sigma_f) * tf + sigma_f * antenna_temp;
    }

    // Calculate antenna gain from normal formula from given diameter (m) and frequency (GHz)
    function antenna_gain(diameter, freq) {
        var eff = 0.6 // Assume antenna efficiency to be 60%
        return 10 * log10(eff * Math.pow(Math.PI * diameter / lambda(freq), 2));
    }

    // Calculate antenna gain at specific frequency from another gain at frequency (ex. gain at mid-band frequency)
    function antenna_gain_at_frequency(ref_gain, ref_freq, freq, diameter) {
        // derives the equation to get this antenna efficiency
        var eff = Math.pow(10, ref_gain / 10) / Math.pow((diameter / lambda(ref_freq) * Math.PI), 2);
        return 10 * log10(eff * Math.pow(Math.PI * diameter / lambda(freq), 2));
    }

    // Calculate eirp uplink from given antenna and hpa
    function eirp_uplink(hpa, antenna, freq) {
        var ifl = _.has(hpa, 'ifl') ? hpa.ifl : 0.3;
        var obo = _.has(hpa, 'obo') ? hpa.obo : 0.5;
        var ant_gain = 0;
        if (_.has(antenna, 'tx_gain')) {
            ant_gain = antenna_gain_at_frequency(antenna.tx_gain.value, antenna.tx_gain.freq, freq, antenna.size);
        }
        else {
            ant_gain = antenna_gain(antenna.size, freq);
        }
        console.log("HPA size = " + hpa.size + " IFL = " + ifl + " obo = " + obo + " ant_gain = " + ant_gain);
        return 10 * log10(hpa.size) - ifl - obo + ant_gain;
    }

    // Calculate elevation angle from lat/lon of remote site and satellite orbital slot
    function elevationAngle(location, sat_lon) {
        // Function to find parameters for satellite-earth geometry
        // Based on methods derived by GEOM Spreadsheet
        // Paiboon P. 30 November 1999

        // INPUT
        // es_lat = latitude of earth station in degree (positive in North)
        // es_lon = longitude of earth station in degree (positive in East)
        // sat_lon = longitude of satellite in degree (positive in East)

        // Constants
        var es_lat = location.lat;
        var degrees_to_radians = Math.PI / 180;
        var radians_to_degrees = 180 / Math.PI;
        var equatorial_earth_radius = 6378144;  // Equatorial Earth Radius in meters; changed from 6378159.9
        var geo_altitude_radius = 42164500;  // Radius at Geosynchronous Altitude; changed from 42166454
        var earth_oblateness = 1 / 298.257;  // Earth Oblateness

        // Calculates basic parameters
        var x_1 = equatorial_earth_radius * Math.cos(es_lat * degrees_to_radians) / Math.sqrt(1 - (2 - earth_oblateness) * earth_oblateness * Math.pow(Math.sin(es_lat * degrees_to_radians), 2));
        var z_1 = Math.pow((1 - earth_oblateness), 2) * equatorial_earth_radius * Math.sin(es_lat * degrees_to_radians) / Math.sqrt(1 - (2 - earth_oblateness) * earth_oblateness * Math.pow(Math.sin(es_lat * degrees_to_radians), 2));
        var slant_range = slantRange(location, sat_lon);

        // Calculates elevation angle
        var re_prime = Math.sqrt(Math.pow(x_1, 2) + Math.pow(z_1, 2))
        var cos_el = (Math.pow(re_prime, 2) + Math.pow((slant_range * 1000), 2) - Math.pow(geo_altitude_radius, 2)) / (2 * re_prime * slant_range * 1000);
        var elevation = (Math.atan(-cos_el / Math.sqrt(-cos_el * cos_el + 1)) + 2 * Math.atan(1)) * radians_to_degrees;
        if (elevation > 90) {
            return elevation - 90;
        }
        return elevation;
    }

    // Calculate azimuth angle from lat/lon of remote site and satellite orbital slot
    function azimuthAngle(sat_lon, lat, lon) {

        // Function to find parameters for satellite-earth geometry
        // Based on methods derived by GEOM Spreadsheet
        // Paiboon P. 30 November 1999

        // INPUT
        // es_lat = latitude of earth station in degree (positive in North)
        // es_lon = longitude of earth station in degree (positive in East)
        // sat_lon = longitude of satellite in degree (positive in East)

        // Constants
        var degrees_to_radians = Math.PI / 180;
        var radians_to_degrees = 180 / Math.PI;

        // Calculates longitude difference
        var dif_lon = lon - sat_lon;

        // Calculates azimuth angle
        if (dif_lon === 0) {
            if (lat <= 0) {
                return 0;
            }
            else
                return 180;
        }
        else if (lat === 0) {
            if (dif_lon < 0) {
                return 90;
            }
            else
                return 270;
        }
        else {
            var cosctr_ang = Math.cos(dif_lon * degrees_to_radians) * Math.cos(lat * degrees_to_radians);
            var acos_ctr = Math.atan(-cosctr_ang / Math.sqrt(-cosctr_ang * cosctr_ang + 1)) + 2 * Math.atan(1);
            var cos_ga = -Math.tan(lat * degrees_to_radians) / Math.tan(acos_ctr);
            var ga = (Math.atan(-cos_ga / Math.sqrt(-cos_ga * cos_ga + 1)) + 2 * Math.atan(1)) * radians_to_degrees;
            if (dif_lon < 0) {
                return ga;
            }
            else
                return 360 - ga;
        }
    }

    // return C/I Adjacent satellites from the given channel, path and location
    // our_eirp_den is EIRP density of our satellite corresponding to the given location
    function ci_adjacent_satellite(data) {

        var ci_objects = [];

        var path = data.path, channel = data.channel, interference_channels = data.interference_channels, location = data.location;
        var ci = 30; //default value

        //if the channel database specifies this value (IPSTAR Forward Ka uplink and IPSTAR Return Ka downlink)
        if(_.has(channel,'ci_' + path + '_adj_sat')){
            ci = channel['ci_' + path + '_adj_sat'];
            ci_objects.push({
                interference: false,
                name: "no interference",
                value: ci
            });
        }

        // ------------------------------ Separate by IPSTAR and Conventional --------------------------

        else if(Satellites.findOne({name:channel.satellite}).type == "Broadband"){
            if (_.has(channel,'eirp_density_adjacent_satellite_' + path)){

                if(channel['eirp_density_adjacent_satellite_' + path] == -100){
                    ci = 50;
                    ci_objects.push({
                        interference: false,
                        name: "no interference",
                        value: ci
                    });
                }
                else{
                    var deg_diff = Math.abs(data.orbital_slot - channel.adjacent_satellite_orbital_slot);
                    ci = data.eirp_density - channel['eirp_density_adjacent_satellite_' + path] + gain_rejection_ratio(channel[path + '_cf'],data.diameter,deg_diff) + gain_improvment(data.diameter, deg_diff);
                    console.log('eirp den = ' + data.eirp_density + ' eirp_den_sat = ' + channel['eirp_density_adjacent_satellite_'+ path] + ' grr = ' + gain_rejection_ratio(channel[path + '_cf'],data.diameter,deg_diff) + ' gain improve = ' + gain_improvment(data.diameter, deg_diff));

                    ci_objects.push({
                        interference: true,
                        name: "Interference from slot " + channel.adjacent_satellite_orbital_slot,
                        value: ci.toFixed(2)
                    });
                }


            }
        }

        else{
            // if the input interference channel is blank (no adj.sat intf), put the object to adj.
            if (interference_channels.length == 0) {
                ci_objects.push({
                    interference: false,
                    name: "no interference",
                    value: ci
                });
            }

            else {
                // loop through interfered channels
                // intf = interference in short
                for (var i = 0; i < interference_channels.length; i++) {
                    var intf = interference_channels[i];
                    if (_.isEmpty(intf)) {
                        ci_objects.push({
                            interference: false,
                            name: "no interference",
                            value: 50
                        });
                        continue;
                    }
                    else {
                        var eirp_density = data.eirp_density, diameter = data.diameter, orbital_slot = data.orbital_slot;

                        var intf_sat = Satellites.findOne({name: intf.satellite});
                        var deg_diff = (Math.abs((orbital_slot - intf_sat.orbital_slot)) - 0.15) * 1.1; // Topocentric Angle | from P'Oui, 8 July 2014

                        console.log('Finding interferences from satellite ' + intf.satellite + ' channel: ' + intf.name + ' at ' + intf_sat.orbital_slot + ' degrees');

                        // find the gain rejection ratio (relative gain)
                        var grr = gain_rejection_ratio(channel[path + '_cf'], diameter, deg_diff);
                        console.log('GRR of ' + diameter + ' m. antenna at ' + deg_diff + ' degrees = ' + grr + ' dB');

                        // find the EIRP of the location on that satellite from the database
                        var loc = Locations.findOne({name: location.name});

                        // location is not found
                        if (!location) continue;

                        var loc_data = _.where(loc.data, {beam: intf[path + '_beam'], satellite: intf.satellite, type: path})[0];

                        // location is found, but this location is not under this beam contour
                        if (!loc_data) continue;

                        // compare with EIRP down of adjacent satellite channels
                        if (path === "downlink") {

                            console.log('The location ' + loc.name + ' has value on beam ' + loc_data.beam + ' = ' + loc_data.value);

                            // find the output backoff of the interfered channels
                            var intf_obo = _.where(intf.backoff_settings, {num_carriers: intf.current_num_carriers})[0].obo;

                            // find EIRP density of interfered channels at that location
                            var intf_eirp_density = loc_data.value + intf_obo - 10 * log10(intf.bandwidth * Math.pow(10, 6));

                            console.log("EIRP density for " + intf.satellite + ' ' + intf.name + ' = ' + intf_eirp_density + ' dBW');

                            // return C/I = our eirp density - intf eirp density + GRR + polarization improvement
                            var c_intf = eirp_density - intf_eirp_density + grr + pol_improvement(channel[path + '_pol'], intf[path + '_pol']);

                            console.log("C/I for " + channel.satellite + ' ' + channel.name + ' = ' + c_intf + ' dB');

                            ci_objects.push({
                                interference: true,
                                name: intf.satellite + " " + intf.name,
                                value: c_intf.toFixed(2),
                                satellite: intf.satellite,
                                channel: intf.name
                            });

                            ci = cnOperation(ci, c_intf);

                        }


                    }
                }
            }
        }

        ci_objects.ci = ci;

        return ci_objects;

        function pol_improvement(our_pol, intf_pol) {
            var circular_pols = ["LHCP", "RHCP"];
            var linear_pols = ["H", "V"];

            // if our pol is linear and intf pol is circular, we gain +3
            if (_.contains(linear_pols, our_pol) && _.contains(circular_pols, intf_pol)) {
                return 3;
            }
            // and vice versa, we gain -3
            else if (_.contains(circular_pols, our_pol) && _.contains(linear_pols, intf_pol)) {
                return -3;
            }
            else return 0;
        }
    }


    // Return C/I cross cells from the given channel, path and location
    function ci_cross_cells(channel, path, location) {
        var ci = 50 // default value
        if (path == "uplink") {
            // For IPSTAR forward channels KA-uplink (or Ku for BC)
            if (_.has(channel, 'ci_uplink_adj_cell')) {
                ci = channel.ci_uplink_adj_cell;
            }
            // For IPSTAR return channels Ku-uplink
            else if (_.has(channel, 'ci_uplink_adj_cell_50') && _.has(channel, 'ci_uplink_adj_cell_eoc')) {
                // If location is between peak and 50%, C/I = C/I at 50% plus the distance between 50% and that location
                // (if closer to peak, C/I is better)
                if (location.contour >= channel.contour_50) {
                    ci = channel.ci_uplink_adj_cell_50 + (location.contour - channel.contour_50);
                }
                // If location is between 50% and EOC, C/I = linear interpolation of C/I at 50% and C/I at EOC
                else if (location.contour < channel.contour_50 && location.contour >= channel.contour_eoc) {
                    ci = linearInterpolation(location.contour, channel.contour_50, channel.contour_eoc, channel.ci_uplink_adj_cell_50, channel.ci_uplink_adj_cell_eoc);
                }
                // If location is beyond EOC, C/I = C/I at EOC minus the distance between EOC and that location
                // (if farther from EOC, C/I is worse)
                else {
                    ci = channel.ci_uplink_adj_cell_eoc + (location.contour - channel.contour_eoc);
                }
            }
            else {
            }
        }
        else { // downlink
            // For IPSTAR return channels KA-downlink
            if (_.has(channel, 'ci_downlink_adj_cell')) {
                ci = channel.ci_downlink_adj_cell;
            }
            // For IPSTAR forward channels Ku-downlink
            else if (_.has(channel, 'ci_downlink_adj_cell_50') && _.has(channel, 'ci_downlink_adj_cell_eoc')) {
                // If location is between peak and 50%, C/I = C/I at 50% plus the distance between 50% and that location
                // (if closer to peak, C/I is better)
                if (location.contour >= channel.contour_50) {
                    ci = channel.ci_downlink_adj_cell_50 + (location.contour - channel.contour_50);
                }
                // If location is between 50% and EOC, C/I = linear interpolation of C/I at 50% and C/I at EOC
                else if (location.contour < channel.contour_50 && location.contour >= channel.contour_eoc) {
                    ci = linearInterpolation(location.contour, channel.contour_50, channel.contour_eoc, channel.ci_downlink_adj_cell_50, channel.ci_downlink_adj_cell_eoc);
                }
                // If location is beyond EOC, C/I = C/I at EOC minus the distance between EOC and that location
                // (if farther from EOC, C/I is worse)
                else {
                    ci = channel.ci_downlink_adj_cell_eoc + (location.contour - channel.contour_eoc);
                }
            }
            else {
            }
        }

        return ci;
    }

    // Return Gain Improvement for standard antennas
    function gain_improvment(size, deg_diff){
        console.log('find gain improve of size = ' + size + ' diff = ' + deg_diff);
        var gain_improvement = 0;
        var gain_improvement_obj = GainImprovements.findOne({size:size});
        if(gain_improvement_obj){
            var gain_data = gain_improvement_obj.data;
            console.log('Gain data = ' + JSON.stringify(gain_data));
            // the object with minimum degrees which is more than our degree diff
            var min_data = _.min(_.filter(gain_data,function(item2){ return item2.degrees > deg_diff}), function(item){return item.degrees;});
            console.log('Min data = ' + JSON.stringify(min_data));
            // the object with maximum degrees which is less than our degree diff
            var max_data = _.max(_.filter(gain_data,function(item2){ return item2.degrees < deg_diff}), function(item){return item.degrees;});
            console.log('Max data = ' + JSON.stringify(max_data));
            if(deg_diff < max_data.degrees){
                // do nothing
            }
            else if(deg_diff > min_data.degrees){
                gain_improvement = min_data.value;
            }
            else{
                gain_improvement = linearInterpolation(deg_diff,min_data.degrees, max_data.degrees, min_data.value, max_data.value);
            }
        }

        return gain_improvement;
    }

    // Return Gain rejection ratio from given frequency, antenna size and degree difference
    // (Return Positive value)
    function gain_rejection_ratio(freq, diameter, degree_diff) {
        return antenna_gain(diameter, freq) - off_axis_gain(diameter, freq, degree_diff);
    }

    // Return off-axis gain
    function off_axis_gain(diameter, freq, offset) {
        var gain_max = antenna_gain(diameter, freq);

        var theta_r = 95 * lambda(freq) / diameter;
        var g1 = 29 - 25 * log10(theta_r);
        var theta_m = lambda(freq) / diameter * Math.sqrt((gain_max - g1) / 0.0025);
        var theta_b = Math.pow(10, 34.0 / 25);

        var result = 0;
        var abs_offset = Math.abs(offset);
        if (abs_offset < theta_m) {
            result = gain_max - 0.0025 * Math.pow((diameter / lambda(freq) * offset), 2);
        }
        else if (abs_offset < theta_r) {
            result = g1;
        }
        else if (abs_offset < theta_b) {
            result = 29 - 25 * log10(abs_offset);
        }
        else if (abs_offset < 70) {
            result = -5;
        }
        else {
            result = 0;
        }
        return result;
    }

    function total_availability(up_avail, up_diversity, down_avail, down_diversity) {

        // find total uplink availability
        var total_up_avail = up_avail;

        // if there is uplink diversity input
        if (!_.isEmpty(up_diversity)) {
            total_up_avail = two_sites_avail(up_avail, up_diversity);
        }

        // find total downlink availability
        var total_down_avail = down_avail;

        // if there is downlink diversity input
        if (!_.isEmpty(down_diversity)) {
            total_down_avail = two_sites_avail(down_avail, down_diversity);
        }

        // combine up and down together
        return (total_up_avail * total_down_avail) / 100;

        function two_sites_avail(one_site_avail, diversity) {
            var single_site_unavail = 100 - one_site_avail;
            var beta_factor_square = (0.0001) * Math.pow(diversity.distance_from_main, 1.33);
            var two_site_unavail = single_site_unavail / (1 + 100 * beta_factor_square / single_site_unavail);
            return 100 - two_site_unavail;
        }
    }


    // --------------------------- Atmospheric Attenuation functions -------------------

    // Return tau value
    function tau_value(polarization) {
        if (polarization === "H") {
            return 0;
        }
        else if (polarization === "V") {
            return Math.PI / 2;
        }
        else if (_.contains(["LHCP", "RHCP"], polarization)) {
            return Math.PI / 4;
        }
        logError("Polarization " + polarization + " is invalid.");
        return false;
    }

    // Return cloud attenuation
    function cloudAtten(freq, elevation) {
        // Calculate attenuation due to cloud for any frequency up to 1000GHz.
        // Assumption is used for temperature of 0 degree C (273K) as recommended in ITU-R P.840-3 (1999)
        // The calculation is based on the worst case normalized total columnar content of cloud liquid water exceeded
        // for 1% of the year which is estimated to 2Kg/m**2

        // TODO: Correct function for New Zealand

        var l1pct = 2;
        var theta = 300 / 273.0;
        var fp = 20.09 - 142 * (theta - 1) + 294 * Math.pow((theta - 1), 2);
        var fs = 590 - 1500 * (theta - 1);
        var ep0 = 77.6 + 103.3 * (theta - 1);
        var ep1 = 5.48;
        var ep2 = 3.51;
        var ep_p = ((ep0 - ep1) / (1 + Math.pow((freq / fp), 2))) + ((ep1 - ep2) / (1 + Math.pow((freq / fs), 2))) + ep2;
        var ep_pp = (freq * (ep0 - ep1) / (fp * (1 + Math.pow((freq / fp), 2)))) + (freq * (ep1 - ep2) / (fs * (1 + Math.pow((freq / fs), 2))));
        var nue = (2 + ep_p) / ep_pp;
        var kl = 0.819 * freq / (ep_pp * (1 + Math.pow(nue, 2)));

        //console.log('fp = ' + fp);
        //console.log('fs = ' + fs);
        //console.log('ep0 = ' + ep0);
        //console.log('ep2 = ' + ep2);
        //console.log('ep_p = ' + ep_p);
        //console.log('ep_pp = ' + ep_pp);
        //console.log('nue = ' + nue);
        //console.log('kl = ' + kl);
        var cloud = l1pct * kl / (Math.sin(elevation * Math.PI / 180));
        //console.log('cloud atten = ' + cloud);

        // This is valid for elevation angle from 5 degree to 90 degree
        return l1pct * kl / (Math.sin(elevation * Math.PI / 180));
    }

    // Return gas attenuation
    function gasAtten(freq, elevation) {
        // This function estimates the attenuation due to atmospheric gases per ITU rec. 676
        // Application is valid for frequency 54GHz and lower
        // Modified according to ITU-R P.676-3 , March 16, 1999
        //
        // Freq= Frequency in GHz
        // Temp_surf = surface temperature in degrees C
        // Relative Humidity at site (%)
        // Ele = Elevation angle in degrees
        // Station height, Hs of 0Km (sea level) is assumed for conservative estimate

        // TODO: Correct function for New Zealand

        // Saturated Partial pressure of water vapor
        var surface_temp = 27;
        var humidity = 99;
        var ps = 206.43 * Math.exp(0.0354 * ((9.0 * surface_temp / 5) + 32));
        var rho = (humidity / 100.0) * ps / (0.461 * (surface_temp + 273));

        //console.log('Surface temp: ' + surface_temp);
        //console.log('ps = ' + ps);
        //console.log('rho = ' + rho);

        // Specific attenuation for dry air for altitude up to 5Km
        var hpa = 1013.0;  // dry air pressure in hPa at sea level
        var r_t = 288 / (273.0 + surface_temp);
        var r_p = hpa / 1013;
        var nue_1 = 6.7665 * (Math.pow(r_p, -0.505)) * (Math.pow(r_t, 0.5106)) * Math.exp(1.5663 * (1 - r_t)) - 1;
        var nue_2 = 27.8843 * (Math.pow(r_p, -0.4908)) * (Math.pow(r_t, -0.8491)) * Math.exp(0.5496 * (1 - r_t)) - 1;
        var a_fact = Math.log(nue_2 / nue_1) / Math.log(3.5);
        var b_fact = Math.pow(4, a_fact) / nue_1;
        var gamma_op54 = 2.128 * Math.pow(r_p, 1.4954) * Math.pow(r_t, -1.6032) * Math.exp(-2.528 * (1 - r_t));
        var gamma_o = ((7.34 * Math.pow(r_p, 2) * Math.pow(r_t, 2) / (Math.pow(freq, 2) + 0.36 * Math.pow(r_p, 2) * Math.pow(r_t, 2))) + (0.3429 * b_fact * gamma_op54 / (Math.pow((54 - freq), a_fact) + b_fact))) * Math.pow(freq, 2) * Math.pow(10, -3);

        //console.log('r_t = ' + r_t);
        //console.log('r_p = ' + r_p);
        //console.log('nue_1 = ' + nue_1);
        //console.log('nue_2 = ' + nue_2);
        //console.log('a_fact = ' + a_fact);
        //console.log('b_fact = ' + b_fact);
        //console.log('gamma_op54 = ' + gamma_op54);
        //console.log('gamm_o = ' + gamma_o);

        // Specific attenuation for water vapour
        var sw1 = 0.9544 * r_p * Math.pow(r_t, 0.69) + 0.0061 * rho;
        var sw2 = 0.95 * r_p * Math.pow(r_t, 0.64) + 0.0067 * rho;
        var sw3 = 0.9561 * r_p * Math.pow(r_t, 0.67) + 0.0059 * rho;
        var sw4 = 0.9543 * r_p * Math.pow(r_t, 0.68) + 0.0061 * rho;
        var sw5 = 0.955 * r_p * Math.pow(r_t, 0.68) + 0.006 * rho;
        var g22 = 1 + Math.pow((freq - 22.235), 2) / Math.pow((freq + 22.235), 2);
        var g557 = 1 + Math.pow((freq - 557), 2) / Math.pow((freq + 557), 2);
        var g752 = 1 + Math.pow((freq - 752), 2) / Math.pow((freq + 752), 2);
        var tm1 = 3.84 * sw1 * g22 * Math.exp(2.23 * (1 - r_t)) / (Math.pow((freq - 22.235), 2) + 9.42 * Math.pow(sw1, 2));
        var tm2 = 10.48 * sw2 * Math.exp(0.7 * (1 - r_t)) / (Math.pow((freq - 183.31), 2) + 9.48 * Math.pow(sw2, 2));
        var tm3 = 0.78 * sw3 * Math.exp(6.4385 * (1 - r_t)) / (Math.pow((freq - 321.226), 2) + 6.29 * Math.pow(sw3, 2));
        var tm4 = 3.76 * sw4 * Math.exp(1.6 * (1 - r_t)) / (Math.pow((freq - 325.153), 2) + 9.22 * Math.pow(sw4, 2));
        var tm5 = 26.36 * sw5 * Math.exp(1.09 * (1 - r_t)) / Math.pow((freq - 380), 2);
        var tm6 = 17.87 * sw5 * Math.exp(1.46 * (1 - r_t)) / Math.pow((freq - 448), 2);
        var tm7 = 883.7 * sw5 * g557 * Math.exp(0.17 * (1 - r_t)) / Math.pow((freq - 557), 2);
        var tm8 = 302.6 * sw5 * g752 * Math.exp(0.41 * (1 - r_t)) / Math.pow((freq - 752), 2);
        var sum_tm = tm1 + tm2 + tm3 + tm4 + tm5 + tm6 + tm7 + tm8;

        //console.log('sw1 = ' + sw1 + ' sw2 = ' + sw2 + ' sw3 = ' + sw3);
        //console.log('sw4 = ' + sw4 + ' sw5 = ' + sw5);
        //console.log('g22 = ' + g22 + ' g557 = ' + g557 + ' g752 = ' + g752);
        //console.log('tm1 = ' + tm1 + ' tm2 = ' + tm2 + ' tm3 = ' + tm3);
        //console.log('tm4 = ' + tm4 + ' tm5 = ' + tm5 + ' tm6 = ' + tm6);
        //console.log('tm7 = ' + tm7 + ' tm8 = ' + tm8);
        //console.log('sum_tm = ' + sum_tm);


        var gamma_w = (0.0313 * r_p * Math.pow(r_t, 2) + 0.00176 * rho * Math.pow(r_t, 8.5) + Math.pow(r_t, 2.5) * sum_tm) * Math.pow(freq, 2) * rho * Math.pow(10, -4);

        // Station height = Sea level is assumed
        var hs = 0;

        // Dry air equivalent height for freq from 1GHz to 56.7GHz
        var ho = 5.386 - 0.0332734 * freq + 0.00187185 * Math.pow(freq, 2) - 3.52087 * Math.pow(10, -5) * Math.pow(freq, 3) + 83.26 / ((Math.pow((freq - 60), 2)) + 1.2);

        // Water vapor equivalent height
        var hw = 1.65 * (1 + (1.61 / ((Math.pow((freq - 22.23), 2)) + 2.91)) + (3.33 / (Math.pow((freq - 183.3), 2) + 4.58)) + (1.9 / (Math.pow((freq - 325.1), 2) + 3.34)));

        //console.log('gamma_w =' + gamma_w);
        //console.log('hw = ' + hw);

        if (elevation > 10) {
            return (gamma_o * ho + gamma_w * hw) / Math.sin(elevation * Math.PI / 180);
        }
        else {
            var sin_elevation = Math.sin(elevation * Math.PI / 180);
            var gho = 0.661 * sin_elevation + 0.339 * Math.sqrt(Math.pow(sin_elevation, 2) + 5.5 * (ho / 8500));
            var ghw = 0.661 * sin_elevation + 0.339 * Math.sqrt(Math.pow(sin_elevation, 2) + 5.5 * (hw / 8500));
            return (gamma_o * ho / gho) + (gamma_w * hw / ghw);
        }
    }

    // Return scin attenuation
    function scinAtten(freq, elevation, diameter, availability) {
        // Calculate attenuation due to scintillation effect based on ITU-R P.618-6 for elevation angle > 4deg
        // Input
        // temp=average surface ambient temperature in degree C
        // humidity=average surface relative humidity in %
        // freq=carrier frequency in GHz (>4GHz and <20GHz)
        // Ele=Elevation angle
        // diam=diameter of antenna in m
        // eff=antenna efficiency in fraction (typical =0.5 to be conservative)
        // press=atmospheric pressure at the site, 1atm = 1,013.25hPa
        // avail=availability in %

        var temp = 27; // surface temp
        var humidity = 99;
        var eff = 0.6;
        var press = 1; // atmospheric pressure

        // Step-1: Calculate saturation water vapour pressure (Es)
        var a = 6.1121;
        var b = 17.502;
        var c = 240.97;
        var es = a * Math.exp(b * temp / (temp + c));
        //console.log('es = ' + es);

        // Step-2: Calculates radio refractivity, Nwet
        var eh = humidity * es / 100.0;
        var nwet = 77.6 * ((press * 1013.25) + (4810.0 * eh / (273.0 + temp))) / (273 + temp);
        //console.log('eh = ' + eh + ' nwet = ' + nwet);

        // Step-3: Calculate standard deviation of signal amplitude, sigma_ref
        var sigma_ref = 3.6 * Math.pow(10, -3) + nwet * Math.pow(10, -4);
        //console.log('sigma_ref = ' + sigma_ref);

        // Step-4: Calculate effective path length
        // hL=height of turbulent layer = 1000m
        var hl = 1000;
        var sin_elevation = Math.sin(elevation * Math.PI / 180);
        var length = 2 * hl / (Math.sqrt(Math.pow(sin_elevation, 2) + (2.35 * Math.pow(10, -4))) + sin_elevation);
        //console.log('sin_elev = ' + sin_elevation + ' length = ' + length);

        // Step-5: estimate effective antenna diameter
        var deff = Math.sqrt(eff) * diameter;
        //console.log('deff = ' + deff);

        // Step-6: Calculate antenna averaging factor.
        var x_val = 1.22 * (freq / length) * Math.pow(deff, 2);
        var gx = Math.sqrt((3.86 * Math.pow((Math.pow(x_val, 2) + 1), (11.0 / 12))) * Math.sin((11.0 / 6) * Math.atan(1 / x_val)) - (7.08 * Math.pow(x_val, (5.0 / 6))));
        //console.log('x_val =' + x_val + ' gx = ' + gx);

        // Step-7: Calculate standard deviation
        var sigma = sigma_ref * Math.pow(freq, (7 / 12.0)) * gx / Math.pow(sin_elevation, 1.2);
        //console.log('sigma = ' + sigma);

        // Step-8: Calculate time percentage factor for the value of unavailability
        var unavailability = 100 - availability;
        var a_p = -0.061 * Math.pow(log10(unavailability), 3) + 0.072 * Math.pow(log10(unavailability), 2) - 1.71 * log10(unavailability) + 3;
        //console.log('unavailability = ' + unavailability);
        //console.log('a_p = ' + a_p);

        // Step-9: Calculation scintillation fade depth
        return a_p * sigma;
    }

    // Return the predicted attenuation exceeded 0.01% of an average year
    function rainAtten001(location, freq, orbital_slot, polarization, availability) {
        //  ITU rain attenuation model
        //  based on Rec. ITU-R 618-6, 1999
        //  Modification to allow for all elevation angles, frequencies between 1 and 55GHz,
        //  probabilities between 0.001% and 5% of an average year
        //
        // Inputs
        // variable:format:Infor: range
        // R_one_hundreth: Rainfall rate in mm/hr as obtain from digital map table in ITU-R P.837-2
        // polarization: String : wave:"V","H","C"
        // stat_height: Number  : Station  height above mean sea level in km: 0 to ~ N
        // stat_lat:Number: Math.absolute value of Latitude of earth station in deg: (0 - 81.3 degrees)
        // stat_lon: Longitude of earth station in East longtitude
        // freq : Number : Frequency in GHz: Range is 1 GHz to 55 GHz
        // el_angle: Number: Earth Station antenna elevation angle in deg.  (0 - 90)
        // availability: Number:Desired link availability: i.e., 99.5,  (min. value is 95., max 99.999)

        // Output/Return value is the attenuation in dB.

        // Inputs range check
        // Check availability (smallest allowed value will be 95., Max will be 99.999)

        // Set up format of basic parameters used several times
        //  equivalent elevation angle in radians - Excel functions operate in radians

        var stat_lat = location.lat;
        var stat_lon = location.lon;
        var ele_angle = elevationAngle(location, orbital_slot);
        var ele_rad = ele_angle * Math.PI / 180
        var stat_height = 0

        // Rainfall rate in mm/hr as obtain from digital map table in ITU-R P.837-2
        var r_100;

        // Meteor.apply('get_rain_points', [stat_lat, stat_lon], {wait: true}, function (error, value) {
        //     console.log('-------------------Get rain points is called -----------')
        //     if (error) {
        //         logError(error.reason);
        //         return false;
        //     }
        //     else {
        //         console.log('Rain rate = ' + value);
        //         r_100 = value;
        //     }
        // });
        // check if lat,lon is valid
        if (stat_lat > 90 || stat_lat < -90 || stat_lon > 180 || stat_lon < -180) {
            throw new Meteor.Error(422, 'Lat/Lon is not valid.');
        }
        // the database grid contains lat/lon at 1.5 degree step, so find the 2 lat and 2 lons which are closest to the given point
        var x_lat = Math.floor(stat_lat / 1.5);
        var x_lon = Math.floor(stat_lon / 1.5);
        var y1 = x_lat * 1.5;
        var y2 = (x_lat + 1) * 1.5;
        var x1 = x_lon * 1.5;
        var x2 = (x_lon + 1) * 1.5;
        console.log(y1 + " , " + y2 + " , " + x1 + " , " + x2);
        var f12 = RainData.findOne({lat: y2, lon: x1}).value;
        var f22 = RainData.findOne({lat: y2, lon: x2}).value;
        var f11 = RainData.findOne({lat: y1, lon: x1}).value;
        var f21 = RainData.findOne({lat: y1, lon: x2}).value;

        // Perform bi-linear interpolation
        // Source: http://en.wikipedia.org/wiki/Bilinear_interpolation

        // Linear interpolation in the x-axis for both y
        var fxy1 = linearInterpolation(stat_lon, x1, x2, f11, f21);
        var fxy2 = linearInterpolation(stat_lon, x1, x2, f12, f22);

        // Linear interpolation fxy1,fxy2 in the y-axis
        var rain = linearInterpolation(stat_lat, y1, y2, fxy1, fxy2);

        console.log('topLeft = ' + f12 + ' topRight = ' + f22 + ' bottomLeft = ' + f11 + ' bottomRight = ' + f21);
        console.log('Rain 001 inside rainAtten001 function = ' + rain);
        r_100 = rain;


        // unavailability, (100 percent - given availability)
        var unavailability = 100 - availability;

        // __________________________________________________________
        // First Step of algorithm is to calculate the Isotherm height for the rain : km
        // i.e., height at which rain is at 0 deg C
        //
        // Step-1:
        var rain_height = 0;
        if (stat_lat > 23) // Northern Hemisphere
        // if (stat_lon < 60) Or (stat_lon > 200) Then // for North America and Europe
        // if (stat_lat >= 35) And (stat_lat <= 70) Then // As modified by ITU-R P.839-2
        // rain_height = 3.2 - 0.075 * (stat_lat - 35)
            rain_height = 5 - 0.075 * (stat_lat - 23);
        else if (0 < stat_lat <= 23) {  // Northern Hemisphere
            rain_height = 5;
        }
        else if (-21 < stat_lat <= 0) {  // Southern Hemisphere
            rain_height = 5;
        }
        else if (-71 < stat_lat <= 21) {  // Southern Hemisphere
            rain_height = 5 + 0.1 * (stat_lat + 21);
        }
        else {
            rain_height = 0;
        }

        // Next determine the slant path length to isotherm, this is the Ls in the ITU Rec
        //  Note the value of 8500 is the earth radius in km
        // Step-2:
        var slant_path;
        if (ele_angle >= 5) {
            slant_path = (rain_height - stat_height) / Math.sin(ele_rad);
        }
        else {
            //  very low elevation angles
            slant_path = 2 * (rain_height - stat_height) / (Math.sqrt(Math.pow(Math.sin(ele_rad), 2) + 2 * (rain_height - stat_height) / 8500) + Math.sin(ele_rad));
        }
        // Determine horizontal projection to ground of slant path length.  (this is the LG in the ITU REC)
        // Step-3:
        var horizontal_slant_path = slant_path * Math.cos(ele_rad);

        //  Now determine the Rain Point intensity (mm/hr)for an exceed of 0.01: R_one_hundreth
        //  select value for selected rain region
        //  only one of the .01  rates are  used (based on the rain region)
        //  Values taken from ITU-R, Rec 837-1, 1994
        // Step-4:
        // R_one_hundreth is obtained from ITU-R P.837 as is passed to this function
        // Use routine RR_001 to get this value

        //  Now find the k and alpha factor per ITU-R  Rec.838
        // Step-5:  ITU-R P.838 dated 15 March 1999 stated that the matrix is good up to 55GHz
        // array of frequencies 1 to 400 GHz, used to specify an index value for k and alpha
        var freq_array = [1, 2, 4, 6, 7, 8, 10, 12, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 120, 150, 200,
            300, 400];

        // the following are arrays of specific values for kh, kv, alphah, and alphav.
        // they are used for interpolating when calculating actual values k_H, k_V,
        // alpha_H, and alpha_V.
        var kh = [0.0000387, 0.000154, 0.00065, 0.00175, 0.00301, 0.00454, 0.0101, 0.0188, 0.0367, 0.0751, 0.124, 0.187,
            0.263, 0.35, 0.442, 0.536, 0.707, 0.851, 0.975, 1.06, 1.12, 1.18, 1.31, 1.45, 1.36, 1.32];

        var kv = [0.0000352, 0.000138, 0.000591, 0.00155, 0.00265, 0.00395, 0.00887, 0.0168, 0.0335, 0.0691, 0.113, 0.167,
            0.233, 0.31, 0.393, 0.479, 0.642, 0.784, 0.906, 0.999, 1.06, 1.13, 1.27, 1.42, 1.35, 1.31];

        var alphah = [0.912, 0.963, 1.121, 1.308, 1.332, 1.327, 1.276, 1.217, 1.154, 1.099, 1.061, 1.021, 0.979, 0.939,
            0.903, 0.873, 0.826, 0.793, 0.769, 0.753, 0.743, 0.731, 0.71, 0.689, 0.688, 0.683];

        var alphav = [0.88, 0.923, 1.075, 1.265, 1.312, 1.31, 1.264, 1.2, 1.128, 1.065, 1.03, 1, 0.963, 0.929, 0.897, 0.868,
            0.824];

        //  find index for frequency within the frequency array
        var match = excelMatch(freq_array, freq);
        var freq1 = match.x1;
        var freq2 = match.x2;

        //  interpolate to find the values for k_H and K_V .: Log (K_x)vs LOG(freq)
        var x1 = log10(freq_array[freq1]);
        var x2 = log10(freq_array[freq2]);
        var x3 = log10(freq);
        var y1 = log10(kh[freq1]);
        var y2 = log10(kh[freq2]);

        var k_H = Math.pow(10, (y1 - (x3 - x1) * (y1 - y2) / (x2 - x1)));

        var y1 = log10(kv[freq1]);
        var y2 = log10(kv[freq2]);

        var k_v = Math.pow(10, (y1 - (x3 - x1) * (y1 - y2) / (x2 - x1)));

        // Interpolate to find the valued for alpha_H and alpha_V : Alpha_x vs log (freq)
        var y1 = alphah[freq1];
        var y2 = alphah[freq2];

        var alpha_H = y1 - (x3 - x1) * (y1 - y2) / (x2 - x1);

        var y1 = alphav[freq1];
        var y2 = alphav[freq2];

        var alpha_v = y1 - (x3 - x1) * (y1 - y2) / (x2 - x1);

        var tau = tau_value(polarization);

        // calculate the factor k
        var k = (k_H + k_v + (k_H - k_v) * Math.cos(2 * tau) * Math.pow(Math.cos(ele_rad), 2)) / 2;

        // calculate the factor alpha
        var alpha = (k_H * alpha_H + k_v * alpha_v + (k_H * alpha_H - k_v * alpha_v) * Math.cos(2 * tau) * Math.pow(Math.cos(ele_rad), 2)) / (2 * k);

        // specific attenuation from frequency-dependent coefficients (dB/km)
        var gamma_r = k * Math.pow(r_100, alpha);

        // Step-6:
        // Calculate the horizontal reduction factor,r0.01, for 0.01% of the time
        var red_factor = 1 / (1 + 0.78 * Math.sqrt(horizontal_slant_path * gamma_r / freq) - 0.38 * (1 - Math.exp(-2 * horizontal_slant_path)));

        // Step-7:
        // Calculate the vertical adjustment factor,V_001,fro 0.01% of the time
        var gamma_n = Math.atan((rain_height - stat_height) / (horizontal_slant_path * red_factor)) * (180 / Math.PI);
        var l_r;
        if (gamma_n > ele_angle) {
            l_r = horizontal_slant_path * red_factor / Math.cos(ele_rad);
        }
        else {
            l_r = (rain_height - stat_height) / Math.sin(ele_rad);
        }
        var Qhi;
        if (Math.abs(stat_lat) < 36) {
            Qhi = 36 - Math.abs(stat_lat);
        }
        else {
            Qhi = 0;
        }
        var v_001 = 1 / (1 + Math.sqrt(Math.sin(ele_rad)) * ((31 * (1 - Math.exp(-ele_angle / (1 + Qhi))) * Math.sqrt(l_r * gamma_r) / Math.pow(freq, 2)) - 0.45));
        //  V_001 = 1 / (1 + sqrt(Math.sin(ele_rad)) * ((31 * (1 - exp(-1 * (El_angle / (1 + Qhi)))) * sqrt(L_R * gamma_R) / (freq ** 2)) - 0.45))

        // Step-8:
        // Calculate the effective path length, L_E
        var eff_path_length = l_r * v_001;

        // Step-9:
        // Calculate the predicted attenuation exceeded for .01% of an average year
        return gamma_r * eff_path_length
    }

    // Calculates rain attenuation from predicted attenuation exceeded for 0.01% of an average year
    function rainAtten(location, freq, orbital_slot, polarization, availability) {
        // Calculate the estimated attenuation to be exceeded for other percentages of an average year
        // in the range of .001% to 5%  is approximated by
        var unavailability = 100 - availability;
        var stat_lat = location.lat;
        var ele_angle = elevationAngle(location, orbital_slot);
        var ele_rad = ele_angle * Math.PI / 180;
        var rain_001 = rainAtten001(location, freq, orbital_slot, polarization, availability);
        var beta;
        if (unavailability >= 1 || Math.abs(stat_lat) >= 36) {
            beta = 0;
        }
        else if (unavailability < 1 && Math.abs(stat_lat) < 36 && ele_angle >= 25) {
            beta = -0.005 * (Math.abs(stat_lat) - 36);
        }

        else {
            beta = -0.005 * (Math.abs(stat_lat) - 36) + 1.8 - 4.25 * Math.sin(ele_rad);
        }
        console.log('Beta = ' + beta);
        console.log('Rain 001 =' + rain_001);
        console.log('Unavailability = ' + unavailability);
        console.log('Ele_rad = ' + ele_rad);
        return rain_001 * Math.pow((unavailability / 0.01), -(0.655 + 0.033 * Math.log(unavailability) - 0.045 * Math.log(rain_001) - beta * (1 - unavailability) * Math.sin(ele_rad)));

    }

    // Return 2 indices of the given sorted list which have the number sandwiches the given value
    function excelMatch(arr, value) {
        var obj = {};
        for (var i = 0; i < arr.length; i++) {
            if (arr[i] > value) {
                obj.x1 = i - 1;
                obj.x2 = i;
                break;
            }
        }
        return obj;
    }

    function log10(num) {
        return Math.log(num) / Math.LN10;
    }

    // Record the error message
    function logError(message) {
        console.log(message);
        this.errorMessage = message;
    }


    // --------------- Setter functions ----------------------
    this.setUplinkAntenna = function (antenna) {
        uplink_station.antenna = antenna;
    }
    this.setUplinkHpa = function (hpa) {
        uplink_station.hpa = hpa;
    }
    this.setUplinkLocation = function (location) {
        uplink_station.location = location;
    }
    this.setDownlinkAntenna = function (antenna) {
        downlink_station.antenna = antenna;
    }
    this.setDownlinkLocation = function (location) {
        downlink_station.location = location;
    }
    this.setChannel = function (data) {
        channel = data;
    }
    this.setApplication = function (app) {
        application = app;
    }
    this.setBandwidth = function (bw) {
        bandwidth = bw;
    }
    this.setRollOff = function (bt) {
        roll_off_factor = bt;
    }
    this.setMcg = function (m) {
        mcg = m;
    }
    this.setMcgClearSky = function (m) {
        mcg_clr = m;
    }
    this.setCondition = function (cond) {
        condition = cond;
    }
    this.setRequiredMargin = function (margin) {
        required_margin = margin;
    }
    this.setOverusedPower = function (overused) {
        overused_power = overused;
    }
    this.setUplinkAvailability = function (value) {
        uplink_availability = value;
    }
    this.setDownlinkAvailability = function (value) {
        downlink_availability = value;
    }
    this.setDownlinkAdjSatInterferences = function (value) {
        downlink_adj_sat_interferences = value;
        ;
    }
    this.setUplinkDiversity = function (value) {
        uplink_diversity = value;
    }
    this.setDownlinkDiversity = function (value) {
        downlink_diversity = value;
    }
    this.setPath = function (value) {
        path = value;
    }
}

// -------------------------- Uplink Station --------------------------

function UplinkStation() {
}

UplinkStation.prototype = {
    antenna: {},
    hpa: {},
    location: {}
}

// -------------------------- Downlink Station --------------------------

function DownlinkStation() {
}

DownlinkStation.prototype = {
    antenna: {},
    location: {}
}

// -------------------------- Other functions ---------------------------

function IsCBand(freq) {
    if (freq < 8 && freq > 3) {
        return true;
    }
    return false;
}

function IsKuBand(freq) {
    if (freq < 15 && freq > 9) {
        return true;
    }
    return false;
}

// Return an location object in the form of {name:"Bangkok", lat:5, lon: 100, contour:-1}
function GetLocationObject(channel, location, path) {
    console.log('Finding location for channel = ' + channel.name + ' loc = ' + location + ' path = ' + path);
    var sat = Satellites.findOne({name: channel.satellite});
    if (sat.type === 'Broadband') {
        if (typeof location === 'string') {
            // check if the given location is a defined contour
            if (_.contains(['Peak', '50%', 'EOC', 'EOC-2'], location)) {
                var contour = 0;
                if (location === 'Peak') {
                    contour = 0;
                }
                else if (location === '50%') {
                    contour = channel.contour_50;
                }
                else if (location === 'EOC') {
                    contour = channel.contour_eoc;
                }
                else if (location === 'EOC-2') {
                    contour = channel.contour_eoc - 2;
                }
                else {
                    console.log('Cannot find ' + location + ' contour of channel ' + channel.name);
                }

                // Make up lat/lon point for this defined contour (use the lat/lon of the channel in the database
                console.log('Find location result returns lat = ' + channel.lat + ' lon = ' + channel.lon + ' name = ' + location + ' contour = ' + contour);
                return {lat: channel.lat, lon: channel.lon, name: location, contour: contour};
            }
            else {
                console.log("Location string is not valid.")
                return false;
            }
        }

        // check if it's lat/lon type
        else if (_.has(location, 'lat') && _.has(location, 'lon')) {
            // find the contour from the exported gxt file
            // TODO: Write this function when Meteor support mongodb 2.6 (2.4 has bugs with Polygon objects not valid)
            var contour = Meteor.call('get_broadband_contour', {lat: location.lat, lon: location.lon}, channel.satellite, channel[path + '_beam'], path);
            if (!contour) {
                console.log('The given location of lat:' + location.lat + ',lon:' + location.lon + ' is beyond -10 dB contour of beam ' + channel[path + '_beam']);
                return false;
            }
            else {
                return {lat: location.lat, lon: location.lon, name: location.lat + "," + location.lon, contour: contour};
            }
        }
        else {
            console.log('Location type is not valid.');
            return false;
        }
    }

    if (sat.type === 'Conventional') {
        // find the contour from location database
        // given location is the string of location name
        if (typeof location === 'string') {
            var loc = Locations.findOne({name: location});
            // If loc is found, find the contour from the value in the database
            // The value in locations database is stored in EIRP and G/T value
            if (loc) {
                // Retrieve the data object for our desired beam
                console.log("The given location is " + loc.name + " lat/lon = " + loc.lat + "/" + loc.lon);
                var data = _.where(loc.data, {beam: channel[path + '_beam'], type: path})[0];
                if (data) {
                    console.log("Data for this loc for beam " + channel[path + '_beam'] + " = " + data.value);
                }
                var contour = 0;
                if (path === "uplink") { // G/T
                    contour = -(channel.gt_peak - data.value);
                }
                else { // EIRP
                    contour = -(channel.saturated_eirp_peak - data.value);
                }
                console.log('Find location returns lat = ' + loc.lat + ' lon = ' + loc.lon + ' name = ' + loc.name + ' contour = ' + contour);
                return {lat: loc.lat, lon: loc.lon, name: loc.name, contour: contour};
            }
            else {
                console.log('Location not found.')
                return {};
            }
        }
        // given location is lat/lon object
        if (_.has(location, 'lat') && _.has(location, 'lon')) {
            // no algorithm for this yet
            console.log('Cannot find contour from given lat/lon for conventional satellite.');
            return {};
        }
    }

}

function GetBestChannels(satellite, locations) {
    // TODO: Write this function when mongodb 2.6 comes with meteor
    _.each(locations, function (loc) {
        console.log("Find best channel at " + loc + " on " + satellite + " satellite.");

        // find all the channels which location is in


    });
    return [];
}

// Return adjacent satellite channels of the given channels within 2 degrees difference
function GetAdjacentSatelliteChannels(channel, path) {

    var sat = Satellites.findOne({name: channel.satellite});
    var slot = sat.orbital_slot;

    // Find satellite within 2 degrees but not itself
    var adj_sats = Satellites.find({
        orbital_slot: {$gte: slot - 2.1, $lte: slot + 2.1},
        name: { $not: {$in: [sat.name]} }
    }).fetch();


    var query = {};
    var pol = channel[path + "_pol"];
    var start_freq = channel[path + "_cf"] - (channel.bandwidth / 2000);
    var stop_freq = channel[path + "_cf"] + (channel.bandwidth / 2000);

    query.satellite = {$in: _.pluck(adj_sats, 'name')};
    query[path + "_pol"] = {$in: getpols(pol)};
    query['$where'] = "function () { return " + start_freq + " < (obj." + path + "_cf + obj.bandwidth / 2000) && " + stop_freq + " > (obj." + path + "_cf - obj.bandwidth / 2000) }";

    var adj_channels = Channels.find(query).fetch();

    if (adj_channels.length == 0) {
        return [
            []
        ];
    }

    // Find the possible combinations of adjacent satellite
    var bandwidth_slices = [];
    for (var i = 1; i <= channel.bandwidth; i++) {
        // For each MHz of bandwidth, find the channel with interferes at this MHz
        var freq = start_freq + i / 1000;
        var interfered_channels = _.filter(adj_channels, function (item) {
            var left_freq = item[path + "_cf"] - (item.bandwidth / 2000);
            var right_freq = item[path + "_cf"] + (item.bandwidth / 2000);
            return left_freq < freq && freq < right_freq;
        });
        // if no interfered channels is found on this particular freq, the function returns empty array
        var id_arr = _.pluck(interfered_channels, '_id');
        var count = 0;
        for (var j = 0; j < bandwidth_slices.length; j++) {
            if (_.isEqual(id_arr, bandwidth_slices[j])) {
                count++;
            }
        }
        //if the combinations is not already in the array, push it
        if (count == 0) {
            bandwidth_slices.push(id_arr);
        }

    }
    var bw_obj = [];
    _.each(bandwidth_slices, function (item2) {
        var intf_obj = [];

        _.each(item2, function (item3) {
            intf_obj.push(Channels.findOne({_id: item3}));
        });
        bw_obj.push(intf_obj);
    });
    return bw_obj;


    // Get the polarizations to search
    // If our channel is linear, the interfered pol would be other 2 circular pols and itself (H or V)
    // If our pol is circular, the interfered pol would be other 2 linear pols and itself (RHCP or LHCP)
    function getpols(pol) {
        if (_.contains(["H", "V"], pol)) {
            return [pol, "RHCP", "LHCP"];
        }
        else {
            return [pol, "H", "V"];
        }

    }

}

function linearInterpolation(x, x1, x2, fx1, fx2) {
    return ((fx2 - fx1) / (x2 - x1)) * (x - x1) + fx1;
}

function LogTitle(string) {
    console.log('---------------------- ' + string + ' ----------------------');
}

function AddWarningMessages(messages){
    if(_.isArray(messages)){
        _.each(messages,function(item){
            AddMessage(item);
        })
    }

    else{
        AddMessage(messages);
    }


    function AddMessage(message){
        if(!_.contains(warning_messages,message)){
            warning_messages.push(message);
        }
    }
}

Meteor.methods({
    'get_adj_sat': function (ch_id, path) {
        var channel = Channels.findOne({_id: ch_id});
        return GetAdjacentSatelliteChannels(channel, path);
    }
})



