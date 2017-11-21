/**
 * Created by Dome on 5/19/14 AD.
 */

// Main link calculation class

Meteor.methods({
    run_linkcalc: function(assumptions){
        
        return "Success";
    }
})

function Linkcalc(){

}

Linkcalc.prototype.channels = []; // satellite channels ex. "1H", "3V", "207" (represents both FWD & RTN)
Linkcalc.prototype.antennas = []; // antenna at remote sites
Linkcalc.prototype.bucs = []; // buc at remote sites
Linkcalc.prototype.locations = []; // remote locations
Linkcalc.prototype.platform = {}; // platform (only 1) and user input fix MCG, link margin and BT product (if any)
Linkcalc.prototype.bandwidth = {}; // bandwidth unit and values
Linkcalc.prototype.hub = {}; // hub object (size and location)
Linkcalc.prototype.findMaxContour = false; // find max contour option
Linkcalc.prototype.findBestChannel = false; // find best channel option
Linkcalc.prototype.recommendAntenna = false; // recommend remote antenna
Linkcalc.prototype.recommendBuc = false; // recommend buc

Linkcalc.prototype.hub_to_remote = function(){

}

Linkcalc.prototype.remote_to_hub = function(){

}