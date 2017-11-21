/**
 * Created by Dome on 6/26/14 AD.
 */
Template.satelliteBaseForm.helpers({
    types() {
        var types = ['Conventional','Broadband'];
        return _.map(types,function(item){
            return {
                text: item,
                value: item
            }
        })
    }
})
