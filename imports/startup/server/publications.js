/**
 * Created by thana on 9/13/2016.
 */

// Gateway to initially import any publications required on server on startup

import '../../api/users/publications';
import { Satellites } from '/imports/api/satellites';
import { Channels } from '/imports/api/channels';
import { Modems } from '/imports/api/modems';
import { Contours } from '/imports/api/contours';
import { Locations } from '/imports/api/locations';
import { Constants } from '/imports/api/constants';
import { Antennas } from '/imports/api/antennas';
import { Bucs } from '/imports/api/bucs';
import { Intf } from '/imports/api/interferences';
import { LinkRequests } from '/imports/api/link_requests';
import { ModemVendors } from '/imports/api/modem_vendors';
import { AntennaVendors } from '/imports/api/antenna_vendors';
import { TestContourResults } from '/imports/api/test_contour_results';

Meteor.publish('satellites', function(){
    return Satellites.find();
});

Meteor.publish('channels',function(options){
    return Channels.find({}, options);
});

Meteor.publish('modems', function(options){
    return Modems.find({}, options);
})

Meteor.publish('singleModem', function (_id) {
    return Modems.find({_id: _id});
})

Meteor.publish('contours', function(){
    return Contours.find();
})

Meteor.publish('locations', function(){
    return Locations.find();
})

Meteor.publish('singleLocation', function(_id){
    return Locations.find({_id:_id});
})

Meteor.publish('constants', function(){
    return Constants.find();
})

Meteor.publish('singleAntenna', function (_id) {
    return Antennas.find({_id: _id});
})

Meteor.publish('antennas', function(){
    return Antennas.find();
})

Meteor.publish('bucs', function(){
    return Bucs.find();
})

Meteor.publish('intf', function(){
    return Intf.find();
})

// Meteor.publish('pdfs', function(){
//     return Pdfs.find();
// })

Meteor.publish('link_requests', function(){
    return LinkRequests.find();
})

Meteor.publish('singleRequest', function(id){
    return LinkRequests.find({_id:id});
})

Meteor.publish('channelFrequency', function(){
    return Channels.find({},{fields:{name:1,uplink_cf:1,downlink_cf:1,bandwidth:1,satellite:1}});
})

Meteor.publish('allUserRequests', function(){
    // return only requests of this user
    return LinkRequests.find({$query:{requestor_id: this.userId},$orderby:{requested_date:-1}},{fields:{results:false}});
})

Meteor.publish('modem_vendors', function(){
    return ModemVendors.find({$query:{},$orderby:{name:1}});
})

Meteor.publish('antenna_vendors', function(){
    return AntennaVendors.find({$query:{},$orderby:{name:1}});
})

Meteor.publish('test_results', function(){
    return TestContourResults.find();
})

// Meteor.publish('reportsByUser', function(){
//     // return only reports created by this user
//     return JobReports.find({$query:{creator_id: this.userId},$orderby:{year:-1, index: -1}});
// })

// Meteor.publish('jobReports', function(){
//     return JobReportsPdfs.find({});
// })


