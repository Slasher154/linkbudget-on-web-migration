/**
 * Created by Dome on 7/29/14 AD.
 */

import { AntennaVendors } from '/imports/api/antenna_vendors';

Template.antennaBaseForm.helpers({
    vendors() {
        var vendors = AntennaVendors.find().fetch();
        return _.map(vendors, function (item) {
            return {
                text: item.name,
                value: item.name
            }
        })
    }
})
