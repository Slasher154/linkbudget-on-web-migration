/**
 * Created by Dome on 5/26/14 AD.
 */
import { RainData } from '/imports/api/rain_data';
import { Contours } from '/imports/api/contours';
import { TempContours } from '/imports/api/temp_contours';
import { Locations } from '/imports/api/locations';
import { Channels } from '/imports/api/channels';


Meteor.methods({
    // Return four co-ordinates surrounding the given lat/lon
    get_rain_points: function (lat, lon) {
        // check if lat,lon is valid
        if (lat > 90 || lat < -90 || lon > 180 || lon < -180) {
            throw new Meteor.Error(422, 'Lat/Lon is not valid.');
        }
        // the database grid contains lat/lon at 1.5 degree step, so find the 2 lat and 2 lons which are closest to the given point
        var x_lat = Math.floor(lat / 1.5);
        var x_lon = Math.floor(lon / 1.5);
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
        var fxy1 = linearInterpolation(lon, x1, x2, f11, f21);
        var fxy2 = linearInterpolation(lon, x1, x2, f12, f22);

        // Linear interpolation fxy1,fxy2 in the y-axis
        var rain = linearInterpolation(lat, y1, y2, fxy1, fxy2);

        console.log('topLeft = ' + f12 + ' topRight = ' + f22 + ' bottomLeft = ' + f11 + ' bottomRight = ' + f21);
        console.log('Rain 001 = ' + rain);
        return rain;
    },

    get_pdf_url: function(id){
        return Pdfs.findOne({_id:id}).url();
    },

    // Return the relative contour in number (-1,-2,-3) from the given lat/lon, beam and type (uplink or downlink)
    get_broadband_contour: function (latlon, satellite, beam, type) {
        var lat = latlon.lat;
        var lon = latlon.lon;
        console.log('Finding contour for satellite ' + satellite + ' , beam ' + beam + ' path ' + type);

        var contours = Contours.findOne({satellite: satellite, beam: beam, beam_type: type}).features;
        //var obj = db.contours.find({beam:"203"},{'features':{$eleMatch:{geometry:{$geoIntersects:{$geometry:{type:'Point',coordinates:[100.55,13.71]}}}}}});
        //console.log('Contours = ' + JSON.stringify(contours));
        // insert the temp contours array into database.
        // we do this because there is no way to return only polygons which the location is within right now
        var ids = [];
        _.each(contours,function(item){
            ids.push(TempContours.insert(item));
        })

        // use geointersects to query all the contour lines which contains this location
        var contour_lines = TempContours.find({
            geometry:{ $geoIntersects:{ $geometry:{type:'Point', coordinates:[lon,lat]}}}
        }).fetch();

        // remove the data after query
        _.each(ids, function(item){
            TempContours.remove({_id:item});
        });

        // throws error if it can't find the result
        if(contour_lines.length == 0){
            return false;
            //throw new Meteor.Error(403, "The lat/lon " + lat + "/" + lon + " is not within -10 dB contour of " + type + " beam " + beam);
        }

        // the line with lowest relative value is the relative contour of that location
        var min_contour = _.max(contour_lines, function(line){
            return line.properties.relative_value;
        });
        console.log('Contour is ' + min_contour.properties.relative_value + ' dB.');
        return min_contour.properties.relative_value;
    },

    // Return the saturated eirp or g/t value in number based on lat/lon, beam and type (uplink or downlink)
    get_conventional_contour: function(latlon, satellite, beam, type){
        var lat = latlon.lat, lon = latlon.lon;
        // get all locations
        var locs = Locations.find().fetch();
        // find the nearest point with simple distance between 2 points formula
        var nearest_point = _.min(locs, function(item){
            return Math.sqrt(Math.pow(item.lat - lat,2) + Math.pow(item.lon - lon,2));
        });
        console.log(nearest_point.name);
    },

    // Return best downlink beam name from the satellite and latlon
    get_best_beam: function(latlon, satellite, country){
        var lat = latlon.lat, lon = latlon.lon;
        var covered_beam_contours = [];
        // if user gives the country, we find only beams in that country
        if(typeof country === "undefined"){
           covered_beam_contours = Contours.find({satellite:satellite,beam_type:'downlink','features': { $elemMatch: { geometry:{ $geoIntersects:{ $geometry:{type:'Point', coordinates:[lon,lat]}}}}}},{beam:1,beam_type:1}).fetch(); // find best beam
        }
        else{
            // find the beam name for that country
            var beams = _.pluck(Channels.find({country:country, type:"forward"}).fetch(),'downlink_beam');
            console.log('Find best beam for only beams: ' + beams.join(','));
            covered_beam_contours = Contours.find({satellite:satellite,beam_type:'downlink',beam:{$in:beams},'features': { $elemMatch: { geometry:{ $geoIntersects:{ $geometry:{type:'Point', coordinates:[lon,lat]}}}}}},{beam:1,beam_type:1}).fetch(); // find best beam
        }
        var best_contour = -20;
        var best_beam = {};
        _.each(covered_beam_contours, function(item){
            var contour = Meteor.call('get_broadband_contour',latlon, satellite, item.beam, "downlink");
            if(contour > best_contour){
                best_contour = contour;
                best_beam = item;
            }
        });

        console.log("Best beam for lat/lon = " + lat + "," + lon + "  is beam" + best_beam.beam);

        // return the beam name
        return best_beam.beam;
    },

    // Return the array of requested relative contours object
    // Request object will come in the form:
    /*
    [
        {beam: "203", type:"downlink", satellite: "IPSTAR", interested_contours: [-1,-2,-3]},
        {beam: "204", type:"downlink", satellite: "IPSTAR", interested_contours: [-1,-2,-3]},
        {beam: "207", type:"downlink", satellite: "IPSTAR", interested_contours: [-1,-2,-3]},
        {beam: "209", type:"downlink", satellite: "IPSTAR", interested_contours: [-1,-2,-3]},
        {beam: "212", type:"downlink", satellite: "IPSTAR", interested_contours: [-1,-2,-3]},
    ]
    */
    get_contour_objects: function(contour_obj){
        var geoObjects = _.map(contour_obj, function(item){
            var filtered_beam = Contours.findOne({
                satellite: item.satellite,
                beam: item.beam,
                beam_type: item.type
            });
            console.log("Satllite = " + item.satellite + " beam = " + item.beam + " type = " + item.type);
            /*
            if(typeof geoObjects == "undefined"){
                throw new Meteor.Error('422', "Cannot find the " + item.type + " contour object of beam " + item.beam + " of satellite " + item.satellite);
            }
            */

            // remove the unwanted contours
            return {
                satellite: filtered_beam.satellite,
                beam: filtered_beam.beam,
                type: filtered_beam.beam_type,
                geoJsonObj: _.filter(filtered_beam.features, function(obj){
                    return _.contains(item.interested_contours, obj.properties.relative_value);
                })
            };
        });
        console.log(JSON.stringify(geoObjects));
        return geoObjects;
    },

    insert_eirp_den: function(){
        var fwd_eirp_den_data = [{"beam":"100","eirp_density_adjacent_satellite_downlink":-30.40,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"101","eirp_density_adjacent_satellite_downlink":-32.40,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"102","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"103","eirp_density_adjacent_satellite_downlink":-34.40,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"104","eirp_density_adjacent_satellite_downlink":-34.40,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"105","eirp_density_adjacent_satellite_downlink":-33.40,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"106","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"107","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"108","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"109","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"110","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"111","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"112","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"113","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"114","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"115","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"201","eirp_density_adjacent_satellite_downlink":-34.40,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"202","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"203","eirp_density_adjacent_satellite_downlink":-34.40,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"204","eirp_density_adjacent_satellite_downlink":-34.40,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"205","eirp_density_adjacent_satellite_downlink":-25.40,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"206","eirp_density_adjacent_satellite_downlink":-25.40,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"207","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"208","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"209","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"210","eirp_density_adjacent_satellite_downlink":-33.40,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"211","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"213","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"214","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"215","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"216","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"217","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"301","eirp_density_adjacent_satellite_downlink":-26.40,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"302","eirp_density_adjacent_satellite_downlink":-24.40,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"303","eirp_density_adjacent_satellite_downlink":-28.40,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"304","eirp_density_adjacent_satellite_downlink":-24.40,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"305","eirp_density_adjacent_satellite_downlink":-24.40,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"306","eirp_density_adjacent_satellite_downlink":-28.40,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"307","eirp_density_adjacent_satellite_downlink":-26.40,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"308","eirp_density_adjacent_satellite_downlink":-25.40,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"309","eirp_density_adjacent_satellite_downlink":-25.40,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"310","eirp_density_adjacent_satellite_downlink":-25.40,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"311","eirp_density_adjacent_satellite_downlink":-23.40,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"312","eirp_density_adjacent_satellite_downlink":-24.40,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"313","eirp_density_adjacent_satellite_downlink":-23.40,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"314","eirp_density_adjacent_satellite_downlink":-24.40,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"315","eirp_density_adjacent_satellite_downlink":-22.40,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"316","eirp_density_adjacent_satellite_downlink":-24.40,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"317","eirp_density_adjacent_satellite_downlink":-23.40,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"318","eirp_density_adjacent_satellite_downlink":-22.40,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"319","eirp_density_adjacent_satellite_downlink":-22.40,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"320","eirp_density_adjacent_satellite_downlink":-22.40,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"321","eirp_density_adjacent_satellite_downlink":-23.40,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"322","eirp_density_adjacent_satellite_downlink":-22.40,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"323","eirp_density_adjacent_satellite_downlink":-22.40,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"401","eirp_density_adjacent_satellite_downlink":-20.30,"adjacent_satellite_orbital_slot":124.00},
            {"beam":"402","eirp_density_adjacent_satellite_downlink":-20.30,"adjacent_satellite_orbital_slot":124.00},
            {"beam":"403","eirp_density_adjacent_satellite_downlink":-20.30,"adjacent_satellite_orbital_slot":124.00},
            {"beam":"404","eirp_density_adjacent_satellite_downlink":-20.30,"adjacent_satellite_orbital_slot":124.00},
            {"beam":"405","eirp_density_adjacent_satellite_downlink":-17.30,"adjacent_satellite_orbital_slot":116.50},
            {"beam":"406","eirp_density_adjacent_satellite_downlink":-22.30,"adjacent_satellite_orbital_slot":116.50},
            {"beam":"501","eirp_density_adjacent_satellite_downlink":-23.40,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"502","eirp_density_adjacent_satellite_downlink":-24.40,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"503","eirp_density_adjacent_satellite_downlink":-23.40,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"504","eirp_density_adjacent_satellite_downlink":-24.40,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"505","eirp_density_adjacent_satellite_downlink":-22.40,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"506","eirp_density_adjacent_satellite_downlink":-21.40,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"507","eirp_density_adjacent_satellite_downlink":-22.40,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"508","eirp_density_adjacent_satellite_downlink":-22.40,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"509","eirp_density_adjacent_satellite_downlink":-23.40,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"510","eirp_density_adjacent_satellite_downlink":-25.40,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"601","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"602","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"603","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"604","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"605","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"606","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"701","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"702","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"703","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"112-2","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"207-2","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"212","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"214-2","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"304-2","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"320-2","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"322-2","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"402-2","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"405-2","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"511","eirp_density_adjacent_satellite_downlink":-29.40,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"512","eirp_density_adjacent_satellite_downlink":-29.40,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"513","eirp_density_adjacent_satellite_downlink":-29.40,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"328","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"514","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"608","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00}];

        _.each(fwd_eirp_den_data, function(item){
            Channels.update({downlink_beam: item.beam, type:"forward"},{$set:{eirp_density_adjacent_satellite_downlink:item.eirp_density_adjacent_satellite_downlink,adjacent_satellite_orbital_slot:item.adjacent_satellite_orbital_slot }},{multi:true});
        });

        var bc_eirp_den_data = [{"beam":"BC-100 (102)","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"BC-100 (112)","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"BC-200 (205)","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"BC-200 (207)","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"BC-300 (304)","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"BC-300 (313)","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"BC-300 (320)","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"BC-300 (322)","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"BC-400 (402)","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"BC-500 (507)","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"BC-500 (NZ)","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"BC-600 (214)","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"BC-600 (604)","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"BC-700 (701)","eirp_density_adjacent_satellite_downlink":-100.00,"adjacent_satellite_orbital_slot":0.00}];

        _.each(bc_eirp_den_data, function(item){
            Channels.update({uplink_beam: item.beam, type:"broadcast"},{$set:{eirp_density_adjacent_satellite_downlink:item.eirp_density_adjacent_satellite_downlink,adjacent_satellite_orbital_slot:item.adjacent_satellite_orbital_slot }},{multi:true});
        });

        var rtn_eirp_den_data = [{"beam":"100","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"101","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"102","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"103","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"104","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"105","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"106","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"107","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"108","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"109","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"110","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"111","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"112","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"113","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"114","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"115","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"201","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"202","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"203","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"204","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"205","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"206","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"207","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"208","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"209","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"210","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"211","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"213","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"214","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"215","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"216","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"217","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"301","eirp_density_adjacent_satellite_uplink":-62.00,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"302","eirp_density_adjacent_satellite_uplink":-62.00,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"303","eirp_density_adjacent_satellite_uplink":-62.00,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"304","eirp_density_adjacent_satellite_uplink":-62.00,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"305","eirp_density_adjacent_satellite_uplink":-62.00,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"306","eirp_density_adjacent_satellite_uplink":-62.00,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"307","eirp_density_adjacent_satellite_uplink":-62.00,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"308","eirp_density_adjacent_satellite_uplink":-62.00,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"309","eirp_density_adjacent_satellite_uplink":-62.00,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"310","eirp_density_adjacent_satellite_uplink":-62.00,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"311","eirp_density_adjacent_satellite_uplink":-62.00,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"312","eirp_density_adjacent_satellite_uplink":-62.00,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"313","eirp_density_adjacent_satellite_uplink":-62.00,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"314","eirp_density_adjacent_satellite_uplink":-62.00,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"315","eirp_density_adjacent_satellite_uplink":-62.00,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"316","eirp_density_adjacent_satellite_uplink":-62.00,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"317","eirp_density_adjacent_satellite_uplink":-62.00,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"318","eirp_density_adjacent_satellite_uplink":-62.00,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"319","eirp_density_adjacent_satellite_uplink":-62.00,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"320","eirp_density_adjacent_satellite_uplink":-62.00,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"321","eirp_density_adjacent_satellite_uplink":-62.00,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"322","eirp_density_adjacent_satellite_uplink":-62.00,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"323","eirp_density_adjacent_satellite_uplink":-62.00,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"401","eirp_density_adjacent_satellite_uplink":-53.00,"adjacent_satellite_orbital_slot":124.00},
            {"beam":"402","eirp_density_adjacent_satellite_uplink":-53.00,"adjacent_satellite_orbital_slot":124.00},
            {"beam":"403","eirp_density_adjacent_satellite_uplink":-53.00,"adjacent_satellite_orbital_slot":124.00},
            {"beam":"404","eirp_density_adjacent_satellite_uplink":-53.00,"adjacent_satellite_orbital_slot":124.00},
            {"beam":"405","eirp_density_adjacent_satellite_uplink":-53.00,"adjacent_satellite_orbital_slot":116.00},
            {"beam":"406","eirp_density_adjacent_satellite_uplink":-53.00,"adjacent_satellite_orbital_slot":116.00},
            {"beam":"501","eirp_density_adjacent_satellite_uplink":-60.00,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"502","eirp_density_adjacent_satellite_uplink":-60.00,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"503","eirp_density_adjacent_satellite_uplink":-60.00,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"504","eirp_density_adjacent_satellite_uplink":-60.00,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"505","eirp_density_adjacent_satellite_uplink":-60.00,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"506","eirp_density_adjacent_satellite_uplink":-60.00,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"507","eirp_density_adjacent_satellite_uplink":-60.00,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"508","eirp_density_adjacent_satellite_uplink":-60.00,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"509","eirp_density_adjacent_satellite_uplink":-60.00,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"510","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"601","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"602","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"603","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"604","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"605","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"606","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"701","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"702","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"703","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"112-2","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"207-2","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"212","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"214-2","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":0.00},
            {"beam":"304-2","eirp_density_adjacent_satellite_uplink":-62.00,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"320-2","eirp_density_adjacent_satellite_uplink":-62.00,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"322-2","eirp_density_adjacent_satellite_uplink":-62.00,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"402-2","eirp_density_adjacent_satellite_uplink":-60.00,"adjacent_satellite_orbital_slot":124.00},
            {"beam":"405-2","eirp_density_adjacent_satellite_uplink":-56.00,"adjacent_satellite_orbital_slot":116.00},
            {"beam":"511","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"512","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"513","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"328","eirp_density_adjacent_satellite_uplink":-56.00,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"514","eirp_density_adjacent_satellite_uplink":-56.00,"adjacent_satellite_orbital_slot":122.20},
            {"beam":"608","eirp_density_adjacent_satellite_uplink":-100.00,"adjacent_satellite_orbital_slot":0.00}];

        _.each(rtn_eirp_den_data, function(item){
            Channels.update({uplink_beam: item.beam, type:"return"},{$set:{eirp_density_adjacent_satellite_uplink:item.eirp_density_adjacent_satellite_uplink,adjacent_satellite_orbital_slot:item.adjacent_satellite_orbital_slot }},{multi:true});
        });
    },

    clear_request_data: function(){
        LinkRequests.remove({});
        JobReportsPdfs.remove({});
        JobReports.remove({});
    },

    promote_to_admin: function(userId) {
        console.log('Promoting ' + userId + ' to admin.');
         Roles.addUsersToRoles(userId, ['admin']);
    },

    demote_from_admin: function(userId) {
        console.log('Demoting ' + userId + ' from admin.');
         Roles.removeUsersFromRoles(userId, 'admin');
    }






})

function linearInterpolation(x, x1, x2, fx1, fx2) {
    return ((fx2 - fx1) / (x2 - x1)) * (x - x1) + fx1;
}

function randomIntFromInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
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

function antenna_gain(diameter, freq) {
    var eff = 0.6 // Assume antenna efficiency to be 60%
    return 10 * log10(eff * Math.pow(Math.PI * diameter / lambda(freq), 2));
}

function log10(num) {
    return Math.log(num) / Math.LN10;
}

function lambda(freq) {
    return  3 * Math.pow(10,8) / (freq * Math.pow(10, 9));
}