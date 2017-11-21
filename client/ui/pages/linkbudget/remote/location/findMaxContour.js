/**
 * Created by Dome on 4/23/14 AD.
 */
Template.findMaxContour.events({
    'change input': function(e){
        var checked = $(e.currentTarget).is(':checked');
        Session.set('findMaxContour',checked);
    }
})