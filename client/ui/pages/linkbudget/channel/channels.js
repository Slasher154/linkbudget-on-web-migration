/**
 * Created by Dome on 4/21/14 AD.
 */

Template.channels.created = () => {
    Meteor.subscribe('channels');
}