/**
 * Created by thana on 9/13/2016.
 */


Meteor.users.helpers({
    fullName() {
        return this.firstName + ' ' + this.lastName;
    },
    isAdmin() {
        return Roles.userIsInRole(this, 'admin');
    }
});