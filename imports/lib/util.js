/**
 * Created by Dome on 4/22/14 AD.
 */

IsAdmin = function(userId){
    return Roles.userIsInRole(userId,['admin']);
}

ToTitleCase = function(str){
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}

// Return the array of results grouped by adjacent satellite interferences
// Also filter the case where forward and return adjacent satellite interference case is same.
GroupByAdjacentSatelliteInterferences = function(request){

    var result = request.results;
    var assumption = request.assumptions;

    var data = [];

    // We will loop all the adjacent interference cases and keep the overlap frequency in this array in order to find the frequency
    // of "no interference" cases at last (if any)
    var overlapped_channels = [];

    for (var i = 0; i < result.length; i++) {
        var re = result[i];

        // We will group the results by adjacent satellite interferences first.
        // For 2-ways communications, we will select the result with same adjacent satellite case for A to B and B to A only.

        // check if result has return link or adjacent satellite for both forward is not the same case
        var fwd_clear = _.where(re.fwd, {uplink_condition: "clear", downlink_condition: "clear"})[0];

        if (!_.isEmpty(re.rtn)) {
            var rtn_clear = _.where(re.rtn, {uplink_condition: "clear", downlink_condition: "clear"})[0];

            // check if result has return link or adjacent satellite for both forward is not the same case
            if (!_.isEqual(_.pluck(fwd_clear.ci_downlink_adj_sat_obj, 'name'), _.pluck(rtn_clear.ci_downlink_adj_sat_obj, 'name'))) {
                //console.log('Case no. ' + i + ' has different adj.intf case.');
                continue; // skip this case and continue to the next result
            }
        }

        // create result object for forward and return results
        var fwd_result_obj = CreateLinkObject(re.fwd);
        // add case number and request id to the object
        _.extend(fwd_result_obj,{ request_id: request._id, 'case_num': re.case_num});
        if (_.has(assumption, 'platform')) {
            _.extend(fwd_result_obj, {platform: assumption.platform.name});
        }
        var rtn_result_obj = {}
        if (!_.isEmpty(re.rtn)) {
            rtn_result_obj = CreateLinkObject(re.rtn);
            _.extend(rtn_result_obj,{ request_id: request._id, 'case_num': re.case_num});
            if (_.has(assumption, 'platform')) {
                _.extend(rtn_result_obj, {platform: assumption.platform.name});
            }
        }

        // check if our data array already contains the current result adj.sat downlink interference
        var intf_name = _.pluck(fwd_clear.ci_downlink_adj_sat_obj, 'name').join(',');
        var intf = _.find(data, function (item) {
            return item.intf == intf_name;
        });

        // if intf is undefined, it means there is no group for this yet
        // so we create new group
        if (_.isUndefined(intf)) {
            //console.log('Create new group for interferences ' + intf_name);

            var intf_obj = intf_name == "no interference" ? [] : _.map(fwd_clear.ci_downlink_adj_sat_obj, function(item){ return {channel:item.channel,satellite:item.satellite};});

            data.push({
                intf: intf_name,
                has_intf: intf_name != "no interference",
                fwd: [fwd_result_obj],
                rtn: [rtn_result_obj],
                intf_obj: intf_obj
            });

            // push the adjacent satellite channels if the array doesn't already contain it
            if(intf_name != "no interference"){
                _.each(fwd_clear.ci_downlink_adj_sat_obj, function(item){
                    if(!(_.where(overlapped_channels,{channel:item.channel,satellite:item.satellite}).length)){
                        overlapped_channels.push({channel:item.channel,satellite:item.satellite});
                    }
                });
            }

        }
        // push the result of fwd_result_obj and rtn_result_obj
        else {
            //console.log('Push this result into interference group ' + intf_name);
            intf.fwd.push(fwd_result_obj);
            intf.rtn.push(rtn_result_obj);
        }

    }

    // loop through each interference case to get its frequency range and bandwidth
    _.each(data, function(item){
        _.extend(item,{caption:OverlapFrequencyCaption(assumption.satellite,assumption.channels[0],item.intf_obj,overlapped_channels)});
    });

    console.log(JSON.stringify(data));

    return data;

    function WriteCaption(overlap_obj){
        var text = [];
        _.each(overlap_obj, function(item){
            text.push("Frequency: " + item.start_freq + "-" + item.stop_freq + " MHz (BW " + item.bandwidth + " MHz)");
        })
        return text.join(" | ");
    }

    function OverlapFrequencyCaption(satellite,channel, adj_channels, all_adj_channels){
        var interested_channel = Channels.findOne({satellite:satellite,name:channel});
        var interested_freq_range = MakeFrequencyRange(interested_channel);

        // if the adj_channels is blank (no interference case), we union all adj_channels and find difference from main channel
        if(adj_channels.length == 0){
            var interfered_freq = [];
            _.each(all_adj_channels, function(item){
                var adj_chan =  Channels.findOne({satellite:item.satellite,name:item.channel});
                if(interfered_freq.length == 0) { interfered_freq = MakeFrequencyRange(adj_chan); }
                else{ interfered_freq = _.union(interfered_freq,MakeFrequencyRange(adj_chan)); }
            })
            //console.log("No Interfered freq = " + _.difference(interested_freq_range, interfered_freq).join(','));
            return WriteCaption(ExtractFrequencyRanges(_.difference(interested_freq_range, interfered_freq)));
        }

        // find the intersection range of interest adjacent channels
        else {
            var intersected_freq = [];
            _.each(adj_channels, function (item) {
                var adj_chan = Channels.findOne({satellite: item.satellite, name: item.channel});
                if (intersected_freq.length == 0) {
                    intersected_freq = MakeFrequencyRange(adj_chan);
                }
                else {
                    intersected_freq = _.intersection(intersected_freq, MakeFrequencyRange(adj_chan));
                }
            });
            //console.log('Intersected freq = ' + intersected_freq.join(','));

            // find the difference of intersection freq range with other channels
            var other_chans = _.reject(all_adj_channels, function (item) {
                return _.where(adj_channels, item).length;
            });
            var reduced_freq = intersected_freq;

            _.each(other_chans, function (item) {
                var other_chan = Channels.findOne({satellite: item.satellite, name: item.channel});
                reduced_freq = _.difference(reduced_freq, MakeFrequencyRange(other_chan));

            });
            //console.log("Interested Freq " + interested_freq_range.join(','));
            //console.log("Reduced Freq = " + reduced_freq.join(','));
            return WriteCaption(ExtractFrequencyRanges(_.intersection(interested_freq_range,reduced_freq)));
        }
    }

    function MakeFrequencyRange(channel){
        var start_freq = channel.downlink_cf * 1000 - (channel.bandwidth / 2);
        var stop_freq = (channel.downlink_cf * 1000 + (channel.bandwidth / 2));
        return _.range(start_freq, stop_freq);
    }

    // Return arrays of continuous range from given array
    // Ex. if given array is [1,2,3,4,7,8,9] => [{ start_freq: 1, stop_freq: 4, bandwidth: 3 }, { start_freq: 7, stop_freq: 9, bandwidth: 3}]
    function ExtractFrequencyRanges(arr, step){
        var step = typeof step == "undefined" ? 1 : step;
        var ranges = [];
        var obj = {
            start_freq: 0,
            stop_freq: 0,
            bandwidth: 0
        }
        for(var i = 0; i < arr.length; i++){
            var freq = arr[i]
            if(obj.start_freq == 0){
                obj.start_freq = freq;
            }
            // if this is not last portion of freq and differences between this freq and next freq is more than 1 (not continuous) or this is last portion of bandwidth already
            // it's the end of range so we push it to array
            else if(i == arr.length -1 || arr[i+1] - freq != step){
                obj.stop_freq = freq + 1;
                obj.bandwidth = obj.stop_freq - obj.start_freq
                ranges.push({
                    start_freq: obj.start_freq,
                    stop_freq: obj.stop_freq,
                    bandwidth: obj.bandwidth
                });
                // reset the object
                obj = { start_freq:0, stop_freq:0, bandwidth: 0};
            }
            else{}
        }
        //console.log(JSON.stringify(ranges));
        return ranges;
    }

    function CreateLinkObject(result) {
        // return the necessary information to show in the table result
        var clear = _.where(result, {uplink_condition: "clear", downlink_condition: "clear"})[0];
        var rain = _.where(result, {uplink_condition: "rain", downlink_condition: "rain"})[0];

        //console.log("Clear result = " + JSON.stringify(clear));
        //console.log("Rain result = " + JSON.stringify(rain));


        var obj = {
            case_name: clear.channel + " : " + clear.downlink_location.name,
            uplink_location: clear.uplink_location.name,
            downlink_location: clear.downlink_location.name,
            uplink_antenna: clear.uplink_antenna.size,
            downlink_antenna: clear.downlink_antenna.size,
            data_rate: clear.data_rate,
            mcg: clear.mcg.name,
            eb_no_threshold: eb_no(clear.mcg.spectral_efficiency, clear.mcg.es_no).toFixed(2),
            bandwidth: clear.roundup_bandwidth,
            uplink_ifl: clear.uplink_hpa.ifl,
            operating_hpa_power: clear.operating_hpa_power,
            cn_total: clear.cn_total,
            eb_no: eb_no(clear.mcg.spectral_efficiency, clear.cn_total).toFixed(2),
            eb_no_margin: clear.link_margin,
            cn_uplink: clear.cn_uplink,
            cn_downlink: clear.cn_downlink,
            eb_no_rain: eb_no(rain.mcg.spectral_efficiency, rain.cn_total).toFixed(2),
            power_util_percent: clear.power_util_percent,
            guardband: clear.guardband,
            roll_off_factor: clear.roll_off_factor,
            pass: clear.pass
        };

        return obj;

    }

    function eb_no(spec_eff, es_no) {
        return es_no - 10 * log10(spec_eff);
    }

    function log10(num) {
        return Math.log(num) / Math.LN10;
    }

}

ElevationAngle = function(location, sat_lon){
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
}

AzimuthAngle = function(location, sat_lon){
    // Function to find parameters for satellite-earth geometry
    // Based on methods derived by GEOM Spreadsheet
    // Paiboon P. 30 November 1999

    // INPUT
    // es_lat = latitude of earth station in degree (positive in North)
    // es_lon = longitude of earth station in degree (positive in East)
    // sat_lon = longitude of satellite in degree (positive in East)

    // Constants
    var lat = location.lat, lon = location.lon;
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