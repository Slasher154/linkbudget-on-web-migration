/**
 * Created by Dome on 4/24/14 AD.
 */
Template.bandwidth.onRendered(function(){
    Session.set('bwRowCount',1);
})

Template.bandwidth.helpers({
    showRemove() {
        return Session.get('bwRowCount') > 1;
    }
})
Template.bandwidth.events({
    'click #addBw': function(e){
        e.preventDefault();
        Session.set('bwRowCount', Session.get('bwRowCount') + 1);
        //Add row
        $('.rowBw:first').clone().appendTo('#bwRows');

    },
    'click #removeBw': function(e){
        e.preventDefault();
        Session.set('bwRowCount', Session.get('bwRowCount') - 1)
        //Remove last row
        $('.rowBw:last').remove();
    }
})
