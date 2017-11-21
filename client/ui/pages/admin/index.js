/**
 * Created by thana on 1/18/2017.
 */

Template.adminIndex.viewmodel({
    onCreated(){
        Meteor.subscribe('allUsers');
    },
    admins(){
        return Roles.getUsersInRole('admin').fetch();
    },
    authorizedUsers(){
        return Roles.getUsersInRole('authorized').fetch();
    },
    unauthorizedUsers(){
       // return users without any role
        return Meteor.users.find({ roles: { $exists: false }});
    },
    authorize(event) {
        event.preventDefault();
        let employeeId = event.target.value;
        let user = Meteor.users.findOne({ username: employeeId });
        let confirmed = confirm("Do you want to allow " + user.fullName() + " to access all Thaicom satellite contours?");
        if (confirmed) {
            Meteor.call('authorizeUser', employeeId, (error, result) => {
                if (error) {
                    Bert.alert(error.reason, 'danger', 'fixed-top');
                }
            })
        }
    },
    makeAdmin(event) {
        event.preventDefault();
        let employeeId = event.target.value;
        let user = Meteor.users.findOne({ username: employeeId });
        let confirmed = confirm("Do you want to promote " + user.fullName() + " to admin?");
        if (confirmed) {
            Meteor.call('makeAdmin', employeeId, (error, result) => {
                if (error) {
                    Bert.alert(error.reason, 'danger', 'fixed-top');
                }
            })
        }
    }
});