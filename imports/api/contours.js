/**
 * Created by thanatv on 14/03/14.
 */
export const Contours = new Mongo.Collection('contours');

Meteor.methods({
    add_from_gxt: function (gxt) {
        // ensure the input has channel
        if (!gxt.beam) {
            throw new Meteor.Error(422, 'Please select beam.');
        }

        // split the text into group of contours, this will split the data into array of contours
        var contour_groups = gxt.text.split(/\[C\d\]/g);

        // _.rest removes the first element of the array, which is info of the gxt file
        _.each(_.rest(contour_groups), function (c) {

            // create the contour object
            var contour = {
                satellite: gxt.satellite,
                beam: gxt.beam,
                type: gxt.type,
                polygon: {
                    type: "LineString",
                    coordinates: []
                }
            }

            // split each contours into lines of each point
            var lines = c.split(/[\r\n]+/g);
            // get the relative contour from the second line [ gain=x ]
            contour.relative_value = parseFloat(lines[1].substring(5));

            // _.rest removes the first 2 lines (blank, gain and number of points)
            // _.initial removes the last line (blank)
            // loop through each line to get the lat/lon
            _.each(_.initial(_.rest(lines, 3)), function (line, index) {
                var latlon = line.split(/[=;]/g);
                // store longitude from 2nd index and latitude from 3rd index of the array
                contour.polygon.coordinates.push([parseFloat(latlon[1]), parseFloat(latlon[2])]);
            })

            // Update the collection if the contour with this satellite,beam, type and relative value exists
            // Else, perform an insert as a new contour
            Contours.update({satellite: contour.satellite, beam: contour.beam, relative_value: contour.relative_value, type: contour.type},
                contour, {upsert: true});
        });


    },

    'find_best_beam': function(latlon){
        var lat = latlon.lat, lon = latlon.lon;

    }

})