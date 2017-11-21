/**
 * Created by thana on 1/18/2017.
 */

Meteor.methods({
    authorizeUser(employeeId){
        check(employeeId, String);
        let user = Meteor.users.findOne({ username: employeeId });
        Roles.addUsersToRoles(user, 'authorized');
    },
    makeAdmin(employeeId){
        check(employeeId, String);
        let user = Meteor.users.findOne({ username: employeeId });
        Roles.addUsersToRoles(user, 'admin');
    },
})