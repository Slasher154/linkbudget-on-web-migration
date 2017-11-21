/**
 * Created by thanatv on 5/03/14.
 */
import '/imports/api/users/users.js';

Template.header.helpers({
  fullName(){
      Meteor.subscribe('user.profile');
      const user = Meteor.user();
      if (user) {
          return user.fullName();
      }
      return '';
  },
  activeRouteClass: function(/* route names */) {
    var args = Array.prototype.slice.call(arguments, 0);
    args.pop();

    var active = _.any(args, function(name) {
      return Router.current().route.name === name
    });

    return active && 'active';
  }

});

Template.header.thaicom5id = function(){
    var sat = Satellites.findOne({name:"Thaicom 5"});
    console.log(JSON.stringify(sat));
    return sat._id;
}

Template.header.events({
  'click #logout': function(event, template) {
    console.log('Logout clicked');
    Meteor.logout(function() {
      Router.go('index');
    });
  }
});