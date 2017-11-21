/**
 * Created by Dome on 4/18/14 AD.
 */

import '/imports/api/users/users.js';

Template.mainLayout.helpers({
    currentYear() {
        return new Date().getFullYear();
    }
});