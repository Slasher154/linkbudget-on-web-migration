/**
 * Created by Dome on 4/23/14 AD.
 */
Template.platformSelector.platformList = function(){
    return {
        value: ["BC","VSAT"]
    }
}

Template.platformSelector.events({
    'click label': function(e){
        var selectedPlatform = $(e.currentTarget).find('input').val();
        Session.set('selectedConventionalPlatform', selectedPlatform);
    }
})