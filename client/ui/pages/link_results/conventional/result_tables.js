/**
 * Created by Dome on 6/19/14 AD.
 */

Template.conventionalResults.helpers({
    isNotEmpty(value) {
        // check if the fwd or rtn link array does not contain all empty objects
        //console.log('Incoming array = ' + JSON.stringify(value));
        var count = 0;
        _.each(value, function(item){
            if(!_.isEmpty(item)){
                count++;
            }
        });
        return count > 0;
    }
})
