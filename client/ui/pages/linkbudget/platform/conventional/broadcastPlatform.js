/**
 * Created by Dome on 4/23/14 AD.
 */
Template.broadcastPlatform.bcPlatformList = function(){
    return {
        value: ["DVB-S1","DVB-S2"]
    };
}

Template.broadcastPlatform.events({
    'click #bcPlatformSelector label': function(e){
        var selectedBcPlatform = $(e.currentTarget).find('input').val();
        Session.set('selectedBcPlatform', selectedBcPlatform);
    }
})