/**
 * Created by Dome on 4/23/14 AD.
 */
Template.broadcastMcgSelector.mcgs = function(){
    var selectedApplication = Session.get('selectedBcPlatform');
    var platform = Modems.findOne({name:"Standard " + selectedApplication});
    if(platform){
        return _.pluck(platform.applications[0].mcgs,'name');
    }
    else{
        Errors.throw('No MCGs found for this platform.');
    }
    /*
    Meteor.call('get_dvb_mcg',selectedApplication, function(error, data){
        if(error){
            Errors.throw(error.reason);
        }
        else{
            console.log(data);
            return data;
        }
    })
    */

}
Template.broadcastMcgSelector.bt = function(){
    return [1.2,1.28,1.35];
}