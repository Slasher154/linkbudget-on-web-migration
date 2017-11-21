/**
 * Created by thana on 9/6/2016.
 */

import { FlowRouter } from 'meteor/kadira:flow-router';
import { BlazeLayout } from 'meteor/kadira:blaze-layout';
import { Roles } from 'meteor/alanning:roles';

// Public Routes

let exposed = FlowRouter.group({});

// Configure route for login page
exposed.route('/login', {
    name: 'login',
    action() {
        BlazeLayout.render('login');
    },
});

// Logged in Routes

let loggedIn = FlowRouter.group({
    triggersEnter: [function () {
        if (!Meteor.loggingIn() && !Meteor.userId()) {
            //console.log('User is not logged in');
            let route = FlowRouter.current();
            if (route.route.name !== 'login') {
                Session.set('redirectAfterLogin', route.path);
            }
            return FlowRouter.go('login');
        }
    }]
});

loggedIn.route('/', {
    name: 'index',
    action() {
        BlazeLayout.render('mainLayout', { content: 'index' });
        //BlazeLayout.render('mainLayout');
    },
});

// Logout Route => '/logout'
loggedIn.route('/logout', {
    name: 'logout',
    action(){
        Meteor.logout(function(){
            FlowRouter.go('login');
            Bert.alert('Successfully Logout', 'success', 'fixed-top');
        })
    }
});

// Result route /results/:_id
loggedIn.route('/results/:_id', {
    name: 'results',
    action(){
        BlazeLayout.render('mainLayout', { content: 'results' });
    },
    subscriptions(params) {
        this.register('myRequest', Meteor.subscribe('singleRequest', params._id))
        this.register('satellites', Meteor.subscribe('satellites'))
    }
})

loggedIn.route('/results/:_id/:case_num', {
    name: 'linkDetail',
    action(){
        BlazeLayout.render('mainLayout', { content: 'linkDetail' });
    },
    subscriptions(params) {
        this.register('myRequest', Meteor.subscribe('singleRequest', params._id))
    }
})

loggedIn.route('/requests', {
    name: 'allRequests',
    action(){
        BlazeLayout.render('mainLayout', { content: 'allRequests' });
    },
    subscriptions() {
        this.register('allUserRequests', Meteor.subscribe('allUserRequests'))
    }
})

loggedIn.route('/manual', {
    name: 'manual',
    action() {
        BlazeLayout.render('mainLayout', { content: 'manual' });
    }
})

loggedIn.route('/manual/conventional/input_guide', {
    name: 'conventionalInputParameterGuide',
    action() {
        BlazeLayout.render('mainLayout', { content: 'conventionalInputParameterGuide' });
    }
})

loggedIn.route('/manual/broadband/input_guide', {
    name: 'broadbandInputParameterGuide',
    action() {
        BlazeLayout.render('mainLayout', { content: 'broadbandInputParameterGuide' });
    }
})

loggedIn.route('/manual/ctp_web/faqs', {
    name: 'ctpWebsiteFaqs',
    action() {
        BlazeLayout.render('mainLayout', { content: 'ctpWebsiteFaqs' });
    }
})

loggedIn.route('/manual/ctp_web/ctu_guide', {
    name: 'ctuGuide',
    action() {
        BlazeLayout.render('mainLayout', { content: 'ctuGuide' });
    }
})


// ----------------- Admin routes ------------------

let admin = loggedIn.group({
    prefix: '/admin',
    triggersEnter: [function() {
        /*
         if(!Roles.userIsInRole(Meteor.user(), ['admin'])) {
         console.log('Not admin!!');
         return FlowRouter.go('index');
         }
         */
    }]
})

admin.route('/', {
    name: 'adminIndex',
    action() {
        BlazeLayout.render('mainLayout', { content: 'adminIndex' });
    },
})

// ----------------- Modem CRUD routes ------------------


admin.route('/modems/insert', {
    name: 'modemInsert',
    action() {
        BlazeLayout.render('mainLayout', { content: 'modemInsert' });
    },
    subscriptions() {
        this.register('modemVendors', Meteor.subscribe('modem_vendors'))
    }
})

admin.route('/modems/edit/:_id', {
    name: 'modemEdit',
    action() {
        BlazeLayout.render('mainLayout', { content: 'modemEdit' });
    },
    subscriptions(params) {
        this.register('modemVendors', Meteor.subscribe('modem_vendors'))
        this.register('modem', Meteor.subscribe('singleModem', params._id))
    }
})

admin.route('/modems/duplicate/:_id', {
    name: 'modemDuplicate',
    action() {
        BlazeLayout.render('mainLayout', { content: 'modemDuplicate' });
    },
    subscriptions(params) {
        this.register('modemVendors', Meteor.subscribe('modem_vendors'))
        this.register('modem', Meteor.subscribe('singleModem', params._id))
    }
})

admin.route('/modems/:_id', {
    name: 'modemView',
    action() {
        BlazeLayout.render('mainLayout', { content: 'modemView' });
    },
    subscriptions(params) {
        this.register('modem', Meteor.subscribe('singleModem', params._id))
    }
})

admin.route('/modems', {
    name: 'modemViewAll',
    action() {
        BlazeLayout.render('mainLayout', { content: 'modemViewAll' });
    },
    subscriptions() {
        this.register('modems', Meteor.subscribe('modems'));
    }
})

// ----------------- Modem Vendor CRUD routes ------------------

admin.route('/modem_vendors/insert', {
    name: 'modemVendorInsert',
    action() {
        BlazeLayout.render('mainLayout', { content: 'modemVendorInsert' });
    }
})

admin.route('/modem_vendors', {
    name: 'modemVendorViewAll',
    action() {
        BlazeLayout.render('mainLayout', { content: 'modemVendorViewAll' });
    },
    subscription() {
        this.register('modemVendors', Meteor.subscribe('modem_vendors'))
    }
})

// ----------------- Antenna CRUD routes ------------------

admin.route('/antennas/insert', {
    name: 'antennaInsert',
    action() {
        BlazeLayout.render('mainLayout', { content: 'antennaInsert' });
    },
    subscriptions() {
        this.register('antennaVendors', Meteor.subscribe('antenna_vendors'))
    }
})

admin.route('/antennas/edit/:_id', {
    name: 'antennaEdit',
    action() {
        BlazeLayout.render('mainLayout', { content: 'antennaEdit' });
    },
    subscriptions(params) {
        this.register('antennaVendors', Meteor.subscribe('antenna_vendors'))
        this.register('antenna', Meteor.subscribe('singleAntenna', params._id))
    }
})

admin.route('/antennas/:_id', {
    name: 'antennaView',
    action() {
        BlazeLayout.render('mainLayout', { content: 'antennaView' });
    },
    subscriptions(params) {
        this.register('antenna', Meteor.subscribe('singleAntenna', params._id))
    }
})

admin.route('/antennas', {
    name: 'antennaViewAll',
    action() {
        BlazeLayout.render('mainLayout', { content: 'antennaViewAll' });
    },
    subscriptions() {
        this.register('antennas', Meteor.subscribe('antennas'));
    }
})

