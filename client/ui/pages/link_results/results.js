/**
 * Created by Dome on 6/18/14 AD.
 */
import { LinkRequests } from '/imports/api/link_requests';
import { Satellites } from '/imports/api/satellites';
import '/imports/lib/util';

Template.results.created = () => {
    // Meteor.subscribe('singleRequest',FlowRouter.getParam('_id'));
    Meteor.subscribe('channelFrequency');
}

Template.results.helpers({
    request_name() {
        return LinkRequests.findOne({_id: FlowRouter.getParam('_id')}).assumptions.request_name
    },
    requestor_name() {
        return LinkRequests.findOne({_id: FlowRouter.getParam('_id')}).requestor_name
    },
    warning_messages() {
        return LinkRequests.findOne({_id: FlowRouter.getParam('_id')}).warning_messages
    },
    assumptions() {
        var assumption = LinkRequests.findOne({_id: FlowRouter.getParam('_id')}).assumptions;

        // Set the display text for assumption in title, detail pair
        var data = [];

        // Satellite
        push("Satellite", assumption.satellite);

        // Beam / Country
        if (_.has(assumption, 'country')) {
            push("Country", assumption.country);
        }
        if (_.has(assumption, 'beam')) {
            push("Beam", assumption.beam);
        }

        // Channels
        if (_.has(assumption, 'channels')) {
            // If user selects find best channel, show the phrase "Find best channel"
            var chans;
            if(assumption.findBestChannel){
                chans = "Find best channel";
            }
            else{
                chans = assumption.channels.join(',');
            }
            push("Channels", chans);
        }

        // Hub antenna
        if (_.has(assumption, 'hub_antenna')) {
            push("Hub antenna", assumption.hub_antenna.name);
        }

        // Hub location
        if (_.has(assumption, 'hub_location')) {
            push("Hub location", assumption.hub_location);
        }

        // Remote antennas
        if (_.has(assumption, 'remote_antennas')) {
            push("Remote antennas", _.pluck(assumption.remote_antennas, 'name'));
        }

        // Remote locations
        if (_.has(assumption, 'remote_locations')) {
            var locs = _.map(assumption.remote_locations, function(loc){
                if (typeof loc === "string") return loc; // if location is string (such as city name or peak, 50%, EOC), return itself
                else if(typeof loc === "object"){ // if location is lat/lon object, return its string representation
                    return loc.lat + "," + loc.lon;
                }
                else{}
            });
            push("Remote locations", locs.join(','))
        }

        // BUCs
        if (_.has(assumption, 'bucs')) {
            push("BUCs", _.pluck(assumption.bucs, 'name'));
        }

        // Platform
        if (_.has(assumption, 'platform')) {
            Session.set('result_platform', assumption.platform.name);
            push("Platform", assumption.platform.name);
        }

        // Forward Fix MCGs
        if (_.has(assumption, 'fwd_fix_mcgs')) {
            push("Forward MCGs", assumption.fwd_fix_mcgs.join(','));
        }

        // Return Fix MCGs
        if (_.has(assumption, 'rtn_fix_mcgs')) {
            push("Return MCGs", assumption.rtn_fix_mcgs.join(','));
        }

        // Link Margin
        if (_.has(assumption, 'link_margin')){
            push("Link margin (dB)", assumption.link_margin);
        }


        // Bandwidth
        if (_.has(assumption, 'bandwidths')) {
            var text = "";
            for (var i = 0; i < assumption.bandwidths.length; i++) {
                var bw = assumption.bandwidths[i];
                if (bw.fwd != 0) {
                    text += bw.fwd + "";
                }
                if (bw.rtn != 0) {
                    text += " / " + bw.rtn;
                }
                text += " " + assumption.unit;
                if (i != assumption.bandwidths.length - 1) {
                    text += " ,";
                }
            }
            ;
            push("Bandwidth", text);
        }

        return {
            assumptions_keys_value: data,
            satellite: assumption.satellite,
            link_margin: assumption.link_margin
        };

        function push(title, detail) {
            data.push({title: title, detail: detail});
        }
    },
    isConventionalResult() {
        var sat = LinkRequests.findOne({_id: FlowRouter.getParam('_id')}).assumptions.satellite;
        return Satellites.findOne({name:sat}).type === "Conventional";
    },
    broadbandResult() {
        //split into array of forward links and array of return links (same as in the JRf)
        //since the program calculate in pair of fwd/rtn links, some forward link in the array
        //might be replicated (ex. 2 links with same antenna but 2 BUCs, forward link of 2 cases would be the same)
        var fwd = [];
        var rtn = [];
        var request = LinkRequests.findOne({_id: FlowRouter.getParam('_id')})
        var results = request.results;
        for(var i = 0; i < results.length; i++){
            var re = results[i];
            if(!_.isEmpty(re.fwd)){
                var fwd_obj = CreateResultObject(re.fwd,"forward");
                fwd.push(_.extend(fwd_obj,{case_num: re.case_num, request_id: FlowRouter.getParam('_id')}));

            }
            if(!_.isEmpty(re.rtn)){
                var rtn_obj = CreateResultObject(re.rtn,"return");
                rtn.push(_.extend(rtn_obj,{case_num: re.case_num, request_id: FlowRouter.getParam('_id')}));
            }
        }
        return {
            fwd: fwd,
            rtn: rtn
        }

        function CreateResultObject(result, path) {
            // return the necessary information to show in the table result
            var clear = _.where(result, {uplink_condition: "clear", downlink_condition: "clear"})[0];
            var rain = _.where(result, {uplink_condition: "rain", downlink_condition: "rain"})[0];

            //console.log("Clear result = " + JSON.stringify(clear));
            //console.log("Rain result = " + JSON.stringify(rain));

            var obj = {
                channel: clear.channel,
                uplink_location: clear.uplink_location.name,
                downlink_location: clear.downlink_location.name,
                uplink_antenna: clear.uplink_antenna.size,
                downlink_antenna: clear.downlink_antenna.size,
                clear_data_rate: clear.data_rate,
                clear_ebe: (clear.mcg.spectral_efficiency / clear.roll_off_factor).toFixed(2),
                clear_mcg: clear.mcg.name,
                clear_bandwidth: clear.occupied_bandwidth,
                rain_data_rate: rain.data_rate,
                rain_ebe: (rain.mcg.spectral_efficiency / rain.roll_off_factor).toFixed(2),
                rain_mcg: rain.mcg.name,
                rain_bandwidth: rain.occupied_bandwidth,
                hpa_power: clear.hpa_power,
                cn_total: clear.cn_total,
                link_margin: clear.link_margin,
                link_availability: rain.link_availability,
                roll_off_factor: clear.roll_off_factor,
                pass: clear.pass
            };

            if (path == "return") {
                _.extend(obj, {
                    buc: clear.uplink_hpa.size
                })
            }

            if (_.has(clear, 'data_rate_ipstar_channel')) {
                _.extend(obj, {clear_data_rate_ipstar_channel: clear.data_rate_ipstar_channel});
                _.extend(obj, {rain_data_rate_ipstar_channel: rain.data_rate_ipstar_channel});
            }


            return obj;
        }
    },
    conventionalResult() {
        var request = LinkRequests.findOne({_id: FlowRouter.getParam('_id')})

        return GroupByAdjacentSatelliteInterferences(request);
    }
})







