/**
 * Created by Dome on 4/22/14 AD.
 */
Template.findBestChannel.events({
    'change input': function(e){
        // If find best channel is checked, set the session
        var checked = $(e.currentTarget).is(':checked');
        Session.set('findBestChannel',checked);
    }
})