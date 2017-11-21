/**
 * Created by Dome on 4/23/14 AD.
 */
Template.conventionalPlatform.applicationSelector = function(){
    var selectedPlatform = Session.get('selectedConventionalPlatform');
    console.log(selectedPlatform);
    if(selectedPlatform==='BC'){
        return Template['broadcastPlatform'];
    }
//    if(selectedPlatform==='VSAT'){
//        return Template['vsatPlatform'];
//    }
    return Template['vsatPlatform'];

}