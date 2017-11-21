/**
 * Created by Dome on 4/23/14 AD.
 */
Template.linkMargin.defaultValue = function(){
    if(Session.get('isCBand')){
        return 2;
    }
    return 5;
}

Template.linkMargin.events({
    'change input': function(e){
        var link_margin = $(e.currentTarget).val();
        if(!isNaN(link_margin)){
            // alert if link margin less than 2 for C-Band
            if(Session.get('isCBand') && link_margin < 2){
                alert('We do not recommend link margin < 2dB for C-Band')
            }
            else if(Session.get('isKuBand') && link_margin < 5){
                alert('We do not recommend link margin < 5 dB for Ku-Band');
            }
        }

    }
})