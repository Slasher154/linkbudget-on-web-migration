/**
 * Created by thana on 9/9/2016.
 */
import { Bert } from 'meteor/themeteorchef:bert';
import { FlowRouter } from 'meteor/kadira:flow-router';

Template.login.helpers({

});

Template.login.events({
    'submit form'(event, instance){
        event.preventDefault();

        // Change the button to loading status
        instance.$('button').button('loading');

        // Retrieve username and password from the input textboxes
        const username = event.target.username.value;
        const password = event.target.password.value;

        Meteor.call('account.authenticate', username, password, (error, response) => {
            if (error) {
                Bert.alert(error.reason, 'danger', 'fixed-top');
            } else {
                Bert.alert(response, 'success', 'fixed-top');
                let dummyPassword = Meteor.settings.public.dummyPassword;
                Meteor.loginWithPassword(username, dummyPassword, function(error, response) {
                    if (error) {
                        Bert.alert(error.reason, 'danger', 'fixed-top');
                    } else {
                        const redirect = Session.get('redirectAfterLogin');
                        if(redirect){
                            FlowRouter.go(redirect);
                        } else {
                            FlowRouter.go('/');
                        }
                    }
                });
            }
        });
    },
})