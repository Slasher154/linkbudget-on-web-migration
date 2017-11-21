/**
 * Created by Dome on 6/20/14 AD.
 */

import { LinkRequests } from '/imports/api/link_requests';

Template.allRequests.helpers({
    requests() {
        return _.sortBy(LinkRequests.find().fetch(), function(x) { return -x.requested_date });
    }
})

